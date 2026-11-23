/**
 * dsh-aliyun-coupon — 浏览器端：左侧边栏入口 + 代金券余额页面。
 */
window.__ModuleLoader__.load({
  id: 'dsh-aliyun-coupon',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useMemo, useState } = React

    const NS = 'aliyunCoupon'
    const PANEL_ID = 'aliyun-coupon'
    const API = '/api/dsh-aliyun-coupon'

    const zh = {
      panel: '阿里云代金券',
      title: '阿里云代金券',
      subtitle: '只读查询阿里云费用中心的代金券与抵用券余额。',
      refresh: '刷新',
      refreshing: '刷新中…',
      updatedAt: '更新于',
      source: '数据源',
      cached: '（缓存）',
      credential: 'AccessKey',
      settings: '更换凭证',
      hideSettings: '收起',
      akId: 'AccessKey ID',
      akSecret: 'AccessKey Secret',
      akPlaceholderId: 'LTAI…',
      akPlaceholderSecret: '只保存在本机，不会回传到浏览器',
      save: '保存并查询',
      saving: '保存中…',
      cancel: '取消',
      remove: '删除本机凭证',
      setupTitle: '先配置只读 AccessKey',
      setupIntro: '插件用阿里云 BSS OpenAPI 查询代金券，需要一对只读 RAM AccessKey。密钥只写入本机 DSH 凭据存储，浏览器只会拿到掩码。',
      step1: '打开阿里云 RAM 控制台 → 用户 → 创建用户，勾选「使用永久 AccessKey 访问」，只勾选 OpenAPI 调用访问。',
      step2: '给该用户授权只读策略 AliyunBSSReadOnlyAccess（不要给主账号 AK）。',
      step3: '把生成的 AccessKey ID 和 Secret 填到下面，保存后点刷新。',
      openConsole: '打开 RAM 控制台',
      summaryRemaining: '剩余可用',
      summaryFace: '券面合计',
      summaryUsed: '已抵扣',
      summaryAvailable: '可用券',
      nextExpiry: '最近到期',
      noExpiry: '无到期时间',
      couponsTitle: '券明细',
      empty: '没有查询到代金券。',
      emptyHint: '如果刚领取过，稍等几分钟再刷新；也可能是券已过期或已用完。',
      statusAvailable: '可用',
      statusExpired: '已过期',
      statusUsed: '已用完',
      statusOther: '其他',
      remains: '剩余',
      face: '面额',
      expires: '有效期至',
      permanent: '长期有效',
      errorTitle: '查询失败',
      retry: '重试',
      notConfigured: '尚未配置凭证',
      footnote: '数据来自阿里云 BSS OpenAPI，只读；凭证保存在本机，不会发送到除阿里云以外的任何地方。',
      consoleLink: '在阿里云控制台查看卡券',
      loadFailed: '无法连接本机插件服务',
    }

    const en = {
      panel: 'Alibaba Cloud coupons',
      title: 'Alibaba Cloud coupons',
      subtitle: 'Read-only balance of Alibaba Cloud vouchers and coupons.',
      refresh: 'Refresh',
      refreshing: 'Refreshing…',
      updatedAt: 'Updated',
      source: 'Source',
      cached: '(cached)',
      credential: 'AccessKey',
      settings: 'Change credentials',
      hideSettings: 'Hide',
      akId: 'AccessKey ID',
      akSecret: 'AccessKey Secret',
      akPlaceholderId: 'LTAI…',
      akPlaceholderSecret: 'Stored locally, never sent back to the browser',
      save: 'Save and query',
      saving: 'Saving…',
      cancel: 'Cancel',
      remove: 'Remove local credentials',
      setupTitle: 'Configure a read-only AccessKey first',
      setupIntro: 'The plugin queries vouchers through the Alibaba Cloud BSS OpenAPI, which needs a read-only RAM AccessKey pair. The secret is written to the local DSH credential store; the browser only sees a masked id.',
      step1: 'Open the Alibaba Cloud RAM console, create a RAM user with programmatic access.',
      step2: 'Grant that user the read-only policy AliyunBSSReadOnlyAccess (do not use the root account key).',
      step3: 'Paste the generated AccessKey ID and Secret below, save, then refresh.',
      openConsole: 'Open the RAM console',
      summaryRemaining: 'Remaining',
      summaryFace: 'Face value',
      summaryUsed: 'Used',
      summaryAvailable: 'Usable coupons',
      nextExpiry: 'Next expiry',
      noExpiry: 'No expiry',
      couponsTitle: 'Coupons',
      empty: 'No coupons were returned.',
      emptyHint: 'A newly granted coupon can take a few minutes; it may also be expired or used up.',
      statusAvailable: 'Usable',
      statusExpired: 'Expired',
      statusUsed: 'Used up',
      statusOther: 'Other',
      remains: 'remains',
      face: 'face',
      expires: 'Valid until',
      permanent: 'No expiry',
      errorTitle: 'Query failed',
      retry: 'Retry',
      notConfigured: 'No credentials yet',
      footnote: 'Data comes from the read-only Alibaba Cloud BSS OpenAPI. Credentials stay on this machine and are never sent anywhere except Alibaba Cloud.',
      consoleLink: 'Open the coupon page in the Alibaba Cloud console',
      loadFailed: 'Cannot reach the local plugin service',
    }

    const CSS = `
.alyc-page{box-sizing:border-box;height:100%;min-height:0;overflow:auto;display:flex;flex-direction:column;
  padding:calc(28px + var(--dsh-frame-top-clearance,0px)) clamp(16px,2vw,24px) 48px;
  color:var(--dsw-alias-label-primary);font-size:14px;line-height:1.5}
.alyc-head{display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap}
.alyc-headText{display:flex;flex-direction:column;gap:6px;flex:1;min-width:220px}
.alyc-title{margin:0;font-size:20px;font-weight:600;line-height:1.4}
.alyc-desc{margin:0;font-size:13px;color:var(--dsw-alias-label-tertiary)}
.alyc-actions{display:flex;align-items:center;gap:8px}
.alyc-btn{appearance:none;font:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:6px;
  padding:5px 12px;font-size:13px;line-height:20px;border-radius:var(--dsw-radius-md,8px);
  border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary)}
.alyc-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.alyc-btn:disabled{opacity:.55;cursor:default}
.alyc-btn--primary{border-color:transparent;background:var(--dsw-alias-bg-brand,var(--dsw-alias-bg-layer-3));color:var(--dsw-alias-label-on-brand,#fff)}
.alyc-btn--primary:hover:not(:disabled){background:var(--dsw-alias-bg-brand,var(--dsw-alias-bg-layer-3));color:var(--dsw-alias-label-on-brand,#fff);opacity:.9}
.alyc-meta{margin-top:10px;display:flex;flex-wrap:wrap;gap:4px 14px;font-size:12px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
.alyc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(168px,1fr));gap:12px;margin-top:18px}
.alyc-card{border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg,12px);
  background:var(--dsw-alias-bg-layer-1);padding:14px 16px;display:flex;flex-direction:column;gap:4px;min-width:0}
.alyc-cardLabel{font-size:12px;color:var(--dsw-alias-label-tertiary)}
.alyc-cardValue{font-size:22px;font-weight:600;line-height:1.3;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.alyc-cardNote{font-size:12px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
.alyc-sectionTitle{margin:26px 0 10px;font-size:15px;font-weight:600}
.alyc-list{display:flex;flex-direction:column;gap:10px}
.alyc-row{border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md,8px);
  background:var(--dsw-alias-bg-layer-2);padding:12px 14px;display:flex;flex-direction:column;gap:8px}
.alyc-rowTop{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.alyc-rowName{font-weight:600;min-width:0;overflow-wrap:anywhere}
.alyc-chip{font-size:11px;line-height:18px;padding:0 8px;border-radius:999px;border:.5px solid transparent;white-space:nowrap}
.alyc-chip--available{color:var(--dsw-alias-state-success-label,#1a7f4b);background:rgba(34,160,90,.14);border-color:rgba(34,160,90,.35)}
.alyc-chip--expired{color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-bg-layer-3);border-color:var(--dsw-alias-border-l2)}
.alyc-chip--used{color:var(--dsw-alias-state-warn-label,#a5651b);background:rgba(200,140,40,.14);border-color:rgba(200,140,40,.35)}
.alyc-amount{margin-left:auto;font-variant-numeric:tabular-nums;font-weight:600;white-space:nowrap}
.alyc-amount small{font-weight:400;color:var(--dsw-alias-label-tertiary)}
.alyc-bar{height:5px;border-radius:999px;background:var(--dsw-alias-bg-layer-3);overflow:hidden}
.alyc-barFill{height:100%;border-radius:999px;background:var(--dsw-alias-state-success-label,#1a7f4b)}
.alyc-rowMeta{display:flex;flex-wrap:wrap;gap:2px 14px;font-size:12px;color:var(--dsw-alias-label-tertiary)}
.alyc-notice{border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg,12px);
  background:var(--dsw-alias-bg-layer-1);padding:18px 20px;margin-top:18px;display:flex;flex-direction:column;gap:10px}
.alyc-notice--error{border-color:rgba(200,60,60,.45)}
.alyc-noticeTitle{margin:0;font-size:15px;font-weight:600}
.alyc-notice p{margin:0;font-size:13px;color:var(--dsw-alias-label-secondary)}
.alyc-steps{margin:0;padding-left:18px;font-size:13px;color:var(--dsw-alias-label-secondary);display:flex;flex-direction:column;gap:6px}
.alyc-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;margin-top:4px}
.alyc-field{display:flex;flex-direction:column;gap:5px;min-width:0}
.alyc-field label{font-size:12px;color:var(--dsw-alias-label-tertiary)}
.alyc-input{font:inherit;font-size:13px;line-height:20px;padding:6px 10px;border-radius:var(--dsw-radius-md,8px);
  border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);min-width:0}
.alyc-input:focus{outline:none;border-color:var(--dsw-alias-border-l3)}
.alyc-formFoot{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:2px}
.alyc-hint{font-size:12px;color:var(--dsw-alias-label-tertiary)}
.alyc-error{color:var(--dsw-alias-state-error-label,#c33);font-size:13px;overflow-wrap:anywhere}
.alyc-link{color:var(--dsw-alias-label-secondary);font-size:12px;text-decoration:none;border-bottom:1px dashed var(--dsw-alias-border-l3)}
.alyc-link:hover{color:var(--dsw-alias-label-primary)}
.alyc-foot{margin-top:26px;font-size:12px;color:var(--dsw-alias-label-tertiary)}
.alyc-empty{font-size:13px;color:var(--dsw-alias-label-secondary);border:.5px dashed var(--dsw-alias-border-l2);
  border-radius:var(--dsw-radius-md,8px);padding:16px;text-align:center}
@media (prefers-reduced-motion: no-preference) { .alyc-barFill{transition:width .25s ease} }
`

    function formatMoney(value, currency) {
      const number = Number(value) || 0
      const text = new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(number)
      return (currency === 'CNY' || !currency ? '¥' : `${currency} `) + text
    }

    function formatDay(value) {
      if (!value) return ''
      const time = Date.parse(value)
      if (!Number.isFinite(time)) return String(value)
      const date = new Date(time)
      const pad = number => String(number).padStart(2, '0')
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    }

    function formatTime(value) {
      if (!value) return ''
      const time = Date.parse(value)
      if (!Number.isFinite(time)) return ''
      const date = new Date(time)
      const pad = number => String(number).padStart(2, '0')
      return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
    }

    function statusText(status, t) {
      if (status === 'available') return t('statusAvailable')
      if (status === 'expired') return t('statusExpired')
      if (status === 'used') return t('statusUsed')
      return t('statusOther')
    }

    function CouponIcon() {
      return h('svg', {
        viewBox: '0 0 16 16', width: 16, height: 16, 'aria-hidden': true,
        style: { display: 'block', flex: 'none' },
      },
      h('path', {
        d: 'M1.75 5.25A1.5 1.5 0 0 1 3.25 3.75h9.5a1.5 1.5 0 0 1 1.5 1.5v1a1.25 1.25 0 0 0 0 2.5v1.5a1.5 1.5 0 0 1-1.5 1.5h-9.5a1.5 1.5 0 0 1-1.5-1.5v-1.5a1.25 1.25 0 0 0 0-2.5v-1Z',
        fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinejoin: 'round',
      }),
      h('path', {
        d: 'M8 5.6v4.8M9.3 7H7.4a.85.85 0 0 0 0 1.7h1.2a.85.85 0 0 1 0 1.7H6.7',
        fill: 'none', stroke: 'currentColor', strokeWidth: 1.1, strokeLinecap: 'round',
      }))
    }

    function CouponPage(props) {
      const t = props.t
      const [data, setData] = useState(null)
      const [loading, setLoading] = useState(true)
      const [loadError, setLoadError] = useState('')
      const [form, setForm] = useState({ accessKeyId: '', accessKeySecret: '' })
      const [saving, setSaving] = useState(false)
      const [formError, setFormError] = useState('')
      const [showSettings, setShowSettings] = useState(false)

      const load = useCallback(async force => {
        setLoading(true)
        setLoadError('')
        try {
          const response = await fetch(`${API}/overview${force ? '?refresh=1' : ''}`, {
            headers: { Accept: 'application/json' },
            cache: 'no-store',
          })
          const body = await response.json()
          setData(body)
        } catch (error) {
          setLoadError(`${t('loadFailed')}：${error && error.message ? error.message : error}`)
        } finally {
          setLoading(false)
        }
      }, [t])

      useEffect(() => { void load(false) }, [load])

      const onRefresh = useCallback(() => { void load(true) }, [load])

      const onSubmit = useCallback(async event => {
        if (event && event.preventDefault) event.preventDefault()
        setSaving(true)
        setFormError('')
        try {
          const response = await fetch(`${API}/credentials`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ accessKeyId: form.accessKeyId.trim(), accessKeySecret: form.accessKeySecret.trim() }),
          })
          const body = await response.json().catch(() => ({}))
          if (!response.ok || body.ok === false) {
            const message = body && body.error && body.error.message ? body.error.message : `HTTP ${response.status}`
            setFormError(message)
            return
          }
          setForm({ accessKeyId: '', accessKeySecret: '' })
          setShowSettings(false)
          await load(true)
        } catch (error) {
          setFormError(String(error && error.message ? error.message : error))
        } finally {
          setSaving(false)
        }
      }, [form, load])

      const onRemove = useCallback(async () => {
        setSaving(true)
        setFormError('')
        try {
          await fetch(`${API}/credentials`, { method: 'DELETE', headers: { Accept: 'application/json' } })
          setShowSettings(false)
          await load(true)
        } finally {
          setSaving(false)
        }
      }, [load])

      const summary = data && data.summary ? data.summary : null
      const coupons = data && Array.isArray(data.coupons) ? data.coupons : []
      const configured = Boolean(data && data.configured)
      const failed = Boolean(data && data.ok === false)
      const needSetup = !loading && data && !configured

      const fields = useMemo(() => h('div', { className: 'alyc-form' },
        h('div', { className: 'alyc-field' },
          h('label', { htmlFor: 'alyc-ak-id' }, t('akId')),
          h('input', {
            id: 'alyc-ak-id', className: 'alyc-input', type: 'text', autoComplete: 'off', spellCheck: false,
            placeholder: t('akPlaceholderId'), value: form.accessKeyId,
            onChange: event => setForm(current => ({ ...current, accessKeyId: event.target.value })),
          })),
        h('div', { className: 'alyc-field' },
          h('label', { htmlFor: 'alyc-ak-secret' }, t('akSecret')),
          h('input', {
            id: 'alyc-ak-secret', className: 'alyc-input', type: 'password', autoComplete: 'off', spellCheck: false,
            placeholder: t('akPlaceholderSecret'), value: form.accessKeySecret,
            onChange: event => setForm(current => ({ ...current, accessKeySecret: event.target.value })),
          })),
      ), [form, t])

      const formBody = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
        fields,
        h('div', { className: 'alyc-formFoot' },
          h('button', {
            type: 'button', className: 'alyc-btn alyc-btn--primary',
            disabled: saving || !form.accessKeyId.trim() || !form.accessKeySecret.trim(),
            onClick: onSubmit,
          }, saving ? t('saving') : t('save')),
          configured ? h('button', {
            type: 'button', className: 'alyc-btn', disabled: saving, onClick: onRemove,
          }, t('remove')) : null,
          configured ? h('button', {
            type: 'button', className: 'alyc-btn', disabled: saving,
            onClick: () => setShowSettings(false),
          }, t('cancel')) : null,
        ),
        formError ? h('div', { className: 'alyc-error' }, formError) : null,
        h('div', { className: 'alyc-hint' }, t('footnote')),
      )

      const setupNotice = h('div', { className: 'alyc-notice' },
        h('h2', { className: 'alyc-noticeTitle' }, t('setupTitle')),
        h('p', {}, t('setupIntro')),
        h('ol', { className: 'alyc-steps' },
          h('li', {}, t('step1')),
          h('li', {}, t('step2')),
          h('li', {}, t('step3')),
        ),
        h('div', {}, h('a', {
          className: 'alyc-link', href: 'https://ram.console.aliyun.com/users', target: '_blank', rel: 'noreferrer',
        }, t('openConsole'))),
        h('div', { style: { height: '4px' } }),
        formBody,
      )

      const errorNotice = failed ? h('div', { className: 'alyc-notice alyc-notice--error' },
        h('h2', { className: 'alyc-noticeTitle' }, t('errorTitle')),
        h('div', { className: 'alyc-error' }, `${data.error && data.error.code ? data.error.code : 'Error'}`),
        h('p', {}, data.error && data.error.message ? data.error.message : ''),
        h('div', { className: 'alyc-formFoot' },
          h('button', { type: 'button', className: 'alyc-btn', disabled: loading, onClick: onRefresh }, t('retry')),
          h('button', { type: 'button', className: 'alyc-btn', onClick: () => setShowSettings(true) }, t('settings')),
        ),
      ) : null

      const settingsNotice = configured && showSettings ? h('div', { className: 'alyc-notice' },
        h('h2', { className: 'alyc-noticeTitle' }, t('settings')),
        formBody,
      ) : null

      const summaryCards = summary && !failed ? h('div', { className: 'alyc-grid' },
        h('div', { className: 'alyc-card' },
          h('div', { className: 'alyc-cardLabel' }, t('summaryRemaining')),
          h('div', { className: 'alyc-cardValue' }, formatMoney(summary.remaining, summary.currency)),
          h('div', { className: 'alyc-cardNote' }, `${t('summaryAvailable')} ${summary.availableCount} / ${summary.totalCount}`),
        ),
        h('div', { className: 'alyc-card' },
          h('div', { className: 'alyc-cardLabel' }, t('summaryFace')),
          h('div', { className: 'alyc-cardValue' }, formatMoney(summary.faceValue, summary.currency)),
          h('div', { className: 'alyc-cardNote' }, `${t('summaryUsed')} ${formatMoney(summary.used, summary.currency)}`),
        ),
        h('div', { className: 'alyc-card' },
          h('div', { className: 'alyc-cardLabel' }, t('nextExpiry')),
          h('div', { className: 'alyc-cardValue', style: { fontSize: '18px' } }, summary.nextExpiry ? formatDay(summary.nextExpiry.at) : t('noExpiry')),
          h('div', { className: 'alyc-cardNote' }, summary.nextExpiry ? summary.nextExpiry.no : ''),
        ),
      ) : null

      const couponRows = coupons.map((coupon, index) => {
        const ratio = coupon.amount > 0 ? Math.max(0, Math.min(1, coupon.remaining / coupon.amount)) : 0
        const meta = []
        if (coupon.no) meta.push(`No. ${coupon.no}`)
        if (coupon.end) meta.push(`${t('expires')} ${formatDay(coupon.end)}`)
        else meta.push(t('permanent'))
        if (coupon.start) meta.push(`${formatDay(coupon.start)} 起`)
        if (coupon.scope) meta.push(coupon.scope)
        if (coupon.limit) meta.push(coupon.limit)
        return h('div', { className: 'alyc-row', key: `${coupon.no || 'coupon'}-${index}` },
          h('div', { className: 'alyc-rowTop' },
            h('span', { className: 'alyc-rowName' }, coupon.type || '代金券'),
            h('span', { className: `alyc-chip alyc-chip--${coupon.status || 'other'}` }, statusText(coupon.status, t)),
            h('span', { className: 'alyc-amount' },
              formatMoney(coupon.remaining, coupon.currency),
              coupon.amount !== coupon.remaining ? h('small', {}, ` / ${formatMoney(coupon.amount, coupon.currency)}`) : null),
          ),
          h('div', { className: 'alyc-bar' }, h('div', { className: 'alyc-barFill', style: { width: `${Math.round(ratio * 100)}%` } })),
          h('div', { className: 'alyc-rowMeta' }, meta.filter(Boolean).map((text, metaIndex) => h('span', { key: metaIndex }, text))),
        )
      })

      const list = coupons.length > 0
        ? h('div', { className: 'alyc-list' }, couponRows)
        : h('div', { className: 'alyc-empty' }, t('empty'), h('div', { className: 'alyc-hint', style: { marginTop: '6px' } }, t('emptyHint')))

      const metaLine = data && configured && !needSetup ? h('div', { className: 'alyc-meta' },
        data.maskedAccessKeyId ? h('span', {}, `${t('credential')} ${data.maskedAccessKeyId}`) : null,
        data.fetchedAt ? h('span', {}, `${t('updatedAt')} ${formatTime(data.fetchedAt)}`) : null,
        data.source ? h('span', {}, `${t('source')} ${data.source}${data.cached ? t('cached') : ''}`) : null,
        h('a', { className: 'alyc-link', href: 'https://usercenter2.aliyun.com/coupons', target: '_blank', rel: 'noreferrer' }, t('consoleLink')),
      ) : null

      return h(React.Fragment, null,
        h('style', { dangerouslySetInnerHTML: { __html: CSS } }),
        h('div', { className: 'alyc-page' },
          h('div', { className: 'alyc-head' },
            h('div', { className: 'alyc-headText' },
              h('h1', { className: 'alyc-title' }, t('title')),
              h('div', { className: 'alyc-desc' }, t('subtitle')),
            ),
            h('div', { className: 'alyc-actions' },
              configured && !needSetup ? h('button', {
                type: 'button', className: 'alyc-btn', disabled: loading, onClick: onRefresh,
              }, loading ? t('refreshing') : t('refresh')) : null,
              configured && !needSetup && !showSettings ? h('button', {
                type: 'button', className: 'alyc-btn', onClick: () => setShowSettings(true),
              }, t('settings')) : null,
            ),
          ),
          metaLine,
          loading && !data ? h('div', { className: 'alyc-notice' }, h('p', {}, `${t('refreshing')}`)) : null,
          loadError ? h('div', { className: 'alyc-notice alyc-notice--error' }, h('div', { className: 'alyc-error' }, loadError)) : null,
          needSetup ? setupNotice : null,
          errorNotice,
          settingsNotice,
          summaryCards,
          !failed && configured ? h('h2', { className: 'alyc-sectionTitle' }, t('couponsTitle')) : null,
          !failed && configured ? list : null,
          h('div', { className: 'alyc-foot' }, t('footnote')),
        ),
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-aliyun-coupon: dictionaries')
        const t = ctx.locale.bind(NS)

        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: PANEL_ID,
          order: 40,
          label: () => t('panel'),
          locale: NS,
        }, CouponIcon))

        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: PANEL_ID,
          locale: NS,
        }, function AliyunCouponPanel() {
          return h(CouponPage, { t })
        }))
      },
    }
  },
})