# dsh-aliyun-coupon

在 DeepSeek Harness 左侧边栏加一个「阿里云代金券」页面，显示账号里代金券/抵用券的
剩余余额、面额、已抵扣金额和到期时间。

数据来自阿里云官方 **BSS OpenAPI**（费用中心）的只读接口：

1. `DescribeCoupon`（2023-09-30，新费用中心「卡券」页同源数据）——首选，带 `RemainAmount`；
2. `QueryCashCoupons`（2017-12-14）——上月接口为空或被拒时自动回退。

## 界面

- 左侧边栏入口「阿里云代金券」，点开进入页面；
- 顶部三张卡片：剩余可用、券面合计（含已抵扣）、最近到期；
- 每张券一行：剩余/面额、进度条、状态（可用 / 已过期 / 已用完）、券号（脱敏）、有效期、适用产品；
- 「刷新」强制重查，宿主对结果做 60 秒缓存，避免触发接口频控。

## 配置只读 AccessKey

插件需要一对**只读** RAM AccessKey（`LTAI…`，不是百炼的 `sk-` Key）。第一次打开页面
会显示配置表单，也可以点右上角「更换凭证」。

1. 打开 [RAM 控制台 → 用户](https://ram.console.aliyun.com/users)，创建一个子用户，访问方式只勾选
   「OpenAPI 调用访问」，创建后保存 AccessKey ID / Secret；
2. 给这个子用户授权系统策略 `AliyunBSSReadOnlyAccess`（只读，够用且不碰订单/支付）；
3. 把 ID / Secret 填进页面「保存并查询」。

密钥通过宿主进程的 `ctx.credentials` 写入本机凭据存储（`$DSH_HOME` 下），
浏览器只能拿到掩码后的 AccessKeyId；插件只把签名请求发给 `business.aliyuncs.com`。

也可以不用界面，直接给 DSH 进程设置环境变量 `ALIYUN_ACCESS_KEY_ID` /
`ALIYUN_ACCESS_KEY_SECRET`（凭据存储里的值优先）。

## 接口

宿主端注册两个只读本机路由（仅回环地址，带 `X-Forwarded-For` 等代理头的请求一律拒绝）：

- `GET /api/dsh-aliyun-coupon/overview[?refresh=1]` — 余额汇总与券列表；
- `POST /api/dsh-aliyun-coupon/credentials` — 保存 AccessKey；
- `DELETE /api/dsh-aliyun-coupon/credentials` — 删除本机凭证。

## 已知限制

- 只读查询，不能领取、核销或修改任何卡券；
- 只显示费用中心「卡券」页可见的代金券/满减券，不包含储值卡、资源包；
- 子账号没有 `bss:DescribeCoupon` / `bss:DescribeCoupons` 权限时会显示阿里云返回的错误码；
- 结果缓存 60 秒，刚领的券可能需要点一次「刷新」才出现。