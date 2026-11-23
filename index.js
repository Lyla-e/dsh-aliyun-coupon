/**
 * dsh-aliyun-coupon — 宿主端。
 *
 * 用只读 RAM AccessKey 调阿里云 BSS OpenAPI（费用中心），把代金券/抵用券的
 * 剩余余额提供给本机 Web 页面。AccessKey 只保存在宿主进程的凭据存储里，
 * 浏览器只能拿到掩码后的 AccessKeyId 和余额数字。
 */
import crypto from 'node:crypto'

const API_HOST = 'business.aliyuncs.com'
const CREDENTIAL_ID = 'ALIYUN_ACCESS_KEY_ID'
const CREDENTIAL_SECRET = 'ALIYUN_ACCESS_KEY_SECRET'
const ROUTE_PREFIX = '/api/dsh-aliyun-coupon'
const CACHE_TTL_MS = 60_000

export const inject = ['webServer', 'credentials']

class ApiError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

function fail(code, message) {
  return new ApiError(code, message)
}

/** RFC 3986 编码，阿里云 RPC 签名要求。 */
function percentEncode(value) {
  return encodeURIComponent(String(value)).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
}

/** 阿里云 RPC 签名 Version 1.0（HMAC-SHA1）。 */
function signQuery(params, accessKeySecret) {
  const canonical = Object.keys(params)
    .sort()
    .map(key => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join('&')
  const stringToSign = `GET&${percentEncode('/')}&${percentEncode(canonical)}`
  const signature = crypto.createHmac('sha1', `${accessKeySecret}&`).update(stringToSign).digest('base64')
  return `${canonical}&Signature=${percentEncode(signature)}`
}

async function callApi(action, version, params, accessKeyId, accessKeySecret) {
  const all = {
    ...params,
    AccessKeyId: accessKeyId,
    Action: action,
    Format: 'JSON',
    SignatureMethod: 'HMAC-SHA1',
    SignatureNonce: crypto.randomUUID(),
    SignatureVersion: '1.0',
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    Version: version,
  }
  const url = `https://${API_HOST}/?${signQuery(all, accessKeySecret)}`
  let response
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  } catch (error) {
    throw fail('NetworkError', `无法连接阿里云 ${API_HOST}：${error?.message || error}`)
  }
  const text = await response.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    throw fail('BadResponse', `阿里云返回了非 JSON 响应（HTTP ${response.status}）`)
  }
  if (body && typeof body.Code === 'string' && body.Code !== 'Success') {
    throw fail(body.Code, body.Message || body.Code)
  }
  if (!response.ok) throw fail('HttpError', `阿里云返回 HTTP ${response.status}`)
  return body
}

function toNumber(value) {
  const number = Number.parseFloat(String(value ?? '').replace(/,/g, ''))
  return Number.isFinite(number) ? number : 0
}

function normalizeStatus(raw) {
  const text = String(raw ?? '').toLowerCase()
  if (text.includes('avail')) return 'available'
  if (text.includes('expire')) return 'expired'
  if (text.includes('used') || text.includes('cancel') || text.includes('deduct')) return 'used'
  return 'other'
}

function maskCouponNo(raw) {
  const text = String(raw ?? '')
  if (text.length <= 6) return text
  return `${text.slice(0, 4)}****${text.slice(-4)}`
}

function fromDescribeCoupon(item) {
  return {
    no: maskCouponNo(item.CouponNo),
    type: item.CouponTypeName || item.CouponType || '代金券',
    amount: toNumber(item.Amount),
    remaining: toNumber(item.RemainAmount),
    status: normalizeStatus(item.Status),
    start: item.StartTime || null,
    end: item.EndTime || null,
    currency: item.Currency || 'CNY',
    scope: Array.isArray(item.ItemNames) && item.ItemNames.length ? item.ItemNames.join('、') : '',
    note: item.Remark || '',
    limit: item.MoneyLimit || '',
  }
}

function fromCashCoupon(item) {
  return {
    no: maskCouponNo(item.CashCouponNo),
    type: '代金券',
    amount: toNumber(item.NominalValue),
    remaining: toNumber(item.Balance),
    status: normalizeStatus(item.Status),
    start: item.EffectiveTime || null,
    end: item.ExpiryTime || null,
    currency: 'CNY',
    scope: [item.ApplicableProducts, item.ApplicableScenarios].filter(Boolean).join(' · '),
    note: item.Description || '',
    limit: '',
  }
}

/**
 * 优先用新费用中心的 DescribeCoupon（带剩余金额），为空或被拒时退回
 * QueryCashCoupons（旧代金券接口）。
 */
async function queryCoupons(accessKeyId, accessKeySecret) {
  const problems = []
  try {
    const body = await callApi('DescribeCoupon', '2023-09-30', { CurrentPage: 1, PageSize: 50 }, accessKeyId, accessKeySecret)
    const coupons = (Array.isArray(body?.Data) ? body.Data : []).map(fromDescribeCoupon)
    if (coupons.length > 0) return { source: 'DescribeCoupon', coupons }
  } catch (error) {
    problems.push(error)
  }
  try {
    const body = await callApi('QueryCashCoupons', '2017-12-14', {}, accessKeyId, accessKeySecret)
    const list = body?.Data?.CashCoupon
    const coupons = (Array.isArray(list) ? list : []).map(fromCashCoupon)
    if (coupons.length > 0) return { source: 'QueryCashCoupons', coupons }
  } catch (error) {
    problems.push(error)
  }
  if (problems.length >= 2) throw problems[0]
  return { source: 'DescribeCoupon', coupons: [] }
}

function summarize(coupons) {
  const available = coupons.filter(coupon => coupon.status === 'available')
  const remaining = available.reduce((sum, coupon) => sum + coupon.remaining, 0)
  const faceValue = available.reduce((sum, coupon) => sum + coupon.amount, 0)
  const expiring = available
    .filter(coupon => coupon.end)
    .map(coupon => ({ coupon, time: Date.parse(coupon.end) }))
    .filter(entry => Number.isFinite(entry.time))
    .sort((a, b) => a.time - b.time)[0]
  return {
    remaining: Number(remaining.toFixed(2)),
    faceValue: Number(faceValue.toFixed(2)),
    used: Number(Math.max(faceValue - remaining, 0).toFixed(2)),
    availableCount: available.length,
    totalCount: coupons.length,
    currency: coupons.find(coupon => coupon.currency)?.currency || 'CNY',
    nextExpiry: expiring ? { at: expiring.coupon.end, no: expiring.coupon.no } : null,
  }
}

async function readCredential(ctx, ref) {
  try {
    const hit = await ctx.credentials.resolve(ref)
    if (hit && typeof hit.value === 'string' && hit.value.trim()) return hit.value.trim()
  } catch {
    // 凭据服务不可用时退回进程环境变量。
  }
  const fromEnv = process.env[ref]
  return typeof fromEnv === 'string' ? fromEnv.trim() : ''
}

function maskAccessKeyId(accessKeyId) {
  if (!accessKeyId) return null
  if (accessKeyId.length <= 8) return `${accessKeyId.slice(0, 2)}…`
  return `${accessKeyId.slice(0, 6)}…${accessKeyId.slice(-4)}`
}

async function buildOverview(ctx, state, force) {
  const accessKeyId = await readCredential(ctx, CREDENTIAL_ID)
  const accessKeySecret = await readCredential(ctx, CREDENTIAL_SECRET)
  const maskedAccessKeyId = maskAccessKeyId(accessKeyId)
  if (!accessKeyId || !accessKeySecret) {
    return { ok: true, configured: false, maskedAccessKeyId: null, fetchedAt: new Date().toISOString() }
  }
  const now = Date.now()
  if (!force && state.cache && now - state.cacheAt < CACHE_TTL_MS) {
    return { ...state.cache, cached: true }
  }
  try {
    const { source, coupons } = await queryCoupons(accessKeyId, accessKeySecret)
    coupons.sort((a, b) => {
      const rank = item => (item.status === 'available' ? 0 : item.status === 'expired' ? 1 : 2)
      return rank(a) - rank(b) || toNumber(b.remaining) - toNumber(a.remaining)
    })
    const payload = {
      ok: true,
      configured: true,
      maskedAccessKeyId,
      source,
      fetchedAt: new Date().toISOString(),
      cached: false,
      summary: summarize(coupons),
      coupons,
    }
    state.cache = payload
    state.cacheAt = now
    return payload
  } catch (error) {
    return {
      ok: false,
      configured: true,
      maskedAccessKeyId,
      fetchedAt: new Date().toISOString(),
      error: { code: error?.code || 'Unknown', message: String(error?.message || error).slice(0, 300) },
    }
  }
}

function json(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
  })
  res.end(payload)
}

function hostnameOf(hostHeader) {
  const text = String(hostHeader || '').trim()
  if (!text) return ''
  if (text.startsWith('[')) return text.slice(1, text.indexOf(']'))
  return text.split(':')[0]
}

function isLoopbackName(name) {
  return name === '127.0.0.1' || name === 'localhost' || name === '::1' || name === '[::1]' || name.startsWith('127.')
}

/** 只接受本机来源：拒绝任何经代理转发或跨站发起的请求。 */
function trustedRequest(req) {
  const remote = String(req.socket?.remoteAddress || '').replace(/^::ffff:/, '')
  if (remote && !(remote === '::1' || remote.startsWith('127.'))) return false
  if (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.headers.forwarded) return false
  if (!isLoopbackName(hostnameOf(req.headers.host))) return false
  const origin = req.headers.origin
  if (origin) {
    try {
      if (!isLoopbackName(new URL(origin).hostname)) return false
    } catch {
      return false
    }
  }
  return true
}

function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', chunk => {
      size += chunk.length
      if (size > limit) {
        reject(fail('BodyTooLarge', '请求体过大'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

export function apply(ctx) {
  const state = { cache: null, cacheAt: 0 }

  ctx.effect(() => {
    const disposers = []
    disposers.push(ctx.webServer.register({
      kind: 'exact',
      path: `${ROUTE_PREFIX}/overview`,
      handler: async (req, res) => {
        if (req.method !== 'GET') return json(res, 405, { ok: false, error: { code: 'MethodNotAllowed', message: '只支持 GET' } })
        if (!trustedRequest(req)) return json(res, 403, { ok: false, error: { code: 'NotTrusted', message: '只接受本机请求' } })
        const url = new URL(req.url || '/', 'http://127.0.0.1')
        const force = url.searchParams.get('refresh') === '1'
        try {
          json(res, 200, await buildOverview(ctx, state, force))
        } catch (error) {
          json(res, 500, { ok: false, error: { code: 'InternalError', message: String(error?.message || error).slice(0, 300) } })
        }
      },
    }))
    disposers.push(ctx.webServer.register({
      kind: 'exact',
      path: `${ROUTE_PREFIX}/credentials`,
      handler: async (req, res) => {
        if (!trustedRequest(req)) return json(res, 403, { ok: false, error: { code: 'NotTrusted', message: '只接受本机请求' } })
        if (req.method === 'DELETE') {
          await ctx.credentials.unset(CREDENTIAL_ID)
          await ctx.credentials.unset(CREDENTIAL_SECRET)
          state.cache = null
          return json(res, 200, { ok: true, configured: false, maskedAccessKeyId: null })
        }
        if (req.method !== 'POST') return json(res, 405, { ok: false, error: { code: 'MethodNotAllowed', message: '只支持 POST / DELETE' } })
        let body
        try {
          body = JSON.parse(await readBody(req))
        } catch {
          return json(res, 400, { ok: false, error: { code: 'BadRequest', message: '请求体必须是 JSON' } })
        }
        const accessKeyId = typeof body?.accessKeyId === 'string' ? body.accessKeyId.trim() : ''
        const accessKeySecret = typeof body?.accessKeySecret === 'string' ? body.accessKeySecret.trim() : ''
        if (!accessKeyId || !accessKeySecret) {
          return json(res, 400, { ok: false, error: { code: 'MissingCredential', message: 'AccessKey ID 和 AccessKey Secret 都需要填写' } })
        }
        if (!/^LTAI[\w-]+$/.test(accessKeyId)) {
          return json(res, 400, { ok: false, error: { code: 'BadAccessKeyId', message: 'AccessKey ID 应以 LTAI 开头（不是百炼的 sk- Key）' } })
        }
        try {
          await ctx.credentials.set(CREDENTIAL_ID, accessKeyId)
          await ctx.credentials.set(CREDENTIAL_SECRET, accessKeySecret)
        } catch (error) {
          return json(res, 500, { ok: false, error: { code: 'CredentialWriteFailed', message: `凭据保存失败：${String(error?.message || error).slice(0, 200)}` } })
        }
        state.cache = null
        json(res, 200, { ok: true, configured: true, maskedAccessKeyId: maskAccessKeyId(accessKeyId) })
      },
    }))
    return () => { for (const dispose of disposers) dispose() }
  }, 'dsh-aliyun-coupon: routes')
}