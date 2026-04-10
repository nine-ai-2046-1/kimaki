---
title: Kimaki Submodule Review
description: >-
  Deep review of gateway-proxy, traforo, errore, and
  opencode-injection-guard based on source code, with security,
  external-service, and integration findings.
prompt: |
  Review all initialized submodules inside the kimaki repo as part of the
  project. Analyze purpose, build/runtime entry points, external
  network/service usage, security-sensitive areas, suspicious logic,
  relationship with the main repo, and improvement opportunities. Write the
  report in Cantonese, GitHub-flavored Markdown, easy to read, and based on
  code instead of README claims.
references:
  - @/.gitmodules
  - @/gateway-proxy/Cargo.toml
  - @/gateway-proxy/package.json
  - @/gateway-proxy/src/main.rs
  - @/gateway-proxy/src/auth.rs
  - @/gateway-proxy/src/rest_proxy.rs
  - @/gateway-proxy/src/wake.rs
  - @/traforo/package.json
  - @/traforo/src/client.ts
  - @/traforo/src/run-tunnel.ts
  - @/traforo/src/tunnel.ts
  - @/errore/package.json
  - @/errore/src/index.ts
  - @/opencode-injection-guard/package.json
  - @/opencode-injection-guard/src/index.ts
  - @/opencode-injection-guard/src/judge.ts
  - @/cli/package.json
  - @/cli/src/cli.ts
  - @/cli/src/utils.ts
  - @/cli/src/commands/screenshare.ts
  - @/cli/src/kimaki-opencode-plugin.ts
  - @/website/src/auth.ts
  - @/website/src/gateway-client-kv.ts
  - @/discord-slack-bridge/package.json
  - @/discord-slack-bridge/scripts/echo-bot.ts
---

# Kimaki Submodule Review 🔍

## 概覽
今次我將 4 個 submodule 當成主 project 一部分做審核：

- `gateway-proxy`
- `traforo`
- `errore`
- `opencode-injection-guard`

總結先講：

- **未見明顯惡意邏輯 / 後門 / 隱藏外傳**
- 但其中 3 個都屬於 **高權限或安全敏感組件**
- 風險主要唔係惡意，而係：
- **功能本身就危險，需要嚴格邊界同操作規範**

風險排序大致上：

1. `gateway-proxy`
2. `traforo`
3. `opencode-injection-guard`
4. `errore`

---

## 1. `gateway-proxy` 🌐

### 作用
`gateway-proxy` 係一個 Rust service，代理：

- Discord Gateway WebSocket
- Discord REST `/api/v10/*`

目的係令多個 Kimaki 使用者共用同一個 Discord bot，而唔需要每個人自己開 bot。

### Build / runtime 入口
- Rust binary manifest：`gateway-proxy/Cargo.toml`
- JS deployment wrapper：`gateway-proxy/package.json`
- 主入口：`gateway-proxy/src/main.rs`
- auth：`gateway-proxy/src/auth.rs`
- REST proxy：`gateway-proxy/src/rest_proxy.rs`
- wake flow：`gateway-proxy/src/wake.rs`

### 會對外連咩
- Discord Gateway
- Discord REST API
- Postgres / PlanetScale
- Prometheus metrics
- optional `reachable_url` 客戶端 wake endpoint

### 安全敏感位
#### `client_id:secret` 認證模型
`gateway-proxy` 接受 `client_id:secret` 作為 client credential，並以此決定：

- client 身份
- 可見 guild 範圍
- REST route 是否有權

核心檔案：`gateway-proxy/src/auth.rs`

#### REST scope authorization
`rest_proxy.rs` 會解析 path，推斷係：

- guild-scoped
- channel-scoped
- allowed without guild
- allowed without auth
- denied

呢個設計方向係正確，因為佢偏向 fail-closed，但同時有維護風險：

- Discord API route 一變
- parser 冇更新
- 就可能 accidentally deny 或 accidentally allow

#### `validate_token=false` 係高危開關
`auth.rs` 見到，如果：

- token 不是 client token
- token 又不是 bot token
- 但 `CONFIG.validate_token` 係 `false`

就會當成 `Unvalidated(token.to_string())`

呢個模式喺 production 極危險，除非你非常確定使用場景係完全受控。

#### Wake flow 會帶 credential 去 `reachable_url`
`wake.rs` 會：

- `POST {reachable_url}/kimaki/wake`
- 帶 `Authorization: Bearer {token}`

如果：

- `reachable_url` 被設錯
- endpoint 被攔截
- TLS / domain boundary 控制不足

就有 credential 洩漏風險。

### 有冇惡意邏輯
**未見。**

所有外部網路行為都同其職責一致：

- proxy Discord
- 同步 DB
- expose metrics
- wake 客戶端

冇見到隱藏 exfiltration、奇怪第三方 domain、或後門入口。

### 與主 repo 關係
Kimaki `gateway mode` 係直接依賴佢：

- `cli/src/cli.ts` 內 hardcode proxy URL
- `cli/src/utils.ts` 生成 onboarding install URL
- `website/src/auth.ts`、`website/src/gateway-client-kv.ts` 會寫入 `gateway_clients`
- client 最後用 `client_id:secret` 經 proxy 連 Discord

即係：

> `gateway-proxy` 唔係旁枝功能，而係 Kimaki gateway onboarding 模式嘅核心基建。

### 改善建議
1. production 禁止 `validate_token=false`
2. 為 route scope parser 建立更完整 regression tests
3. 對 `reachable_url` 做更嚴格 validation / allowlist
4. 考慮減少 credential 經 onboarding URL 或回調流轉
5. WebSocket 限制唔好用完全 unlimited

---

## 2. `traforo` 🚇

### 作用
`traforo` 係一個 Cloudflare Worker + Durable Object tunnel system，將本地服務經互聯網暴露出去。

可代理：

- HTTP
- WebSocket
- optional edge cache
- optional password protection

### Build / runtime 入口
- manifest：`traforo/package.json`
- CLI：`traforo/src/cli.ts`
- tunnel client：`traforo/src/client.ts`
- local runner：`traforo/src/run-tunnel.ts`
- Worker / DO：`traforo/src/tunnel.ts`
- deploy config：`traforo/wrangler.json`

### 會對外連咩
- Cloudflare Workers / Durable Objects / Cache / RateLimit
- public tunnel domain：`traforo.dev`
- local machine `localhost:<port>`
- local WebSocket upstream

### 安全敏感位
#### 呢個工具本質上就係危險
`traforo` 唔係「可能有風險」，而係**本質上就係將本地服務公開**。

如果使用者：

- tunnel 咗唔應公開嘅 admin panel
- tunnel 咗無 auth 嘅本地 API
- tunnel 咗 debug 服務

就會直接暴露出去。

#### password protection 係 optional
如果唔設 password，預設就係公開 tunnel。

即使有 password：

- 都係 cookie-based
- 唔係更高等級 authn/authz

#### `_password` / `_cacheKey` 經 WebSocket query string 傳
`client.ts` 會喺 upstream websocket URL 帶：

- `_password`
- `_cacheKey`

雖然係方便，但 query string 本身就比 header / out-of-band secret 更敏感。

#### `--kill` 會 kill 佔用 port 嘅 process
`run-tunnel.ts` 提供 `--kill`，可以殺掉當前 port 上嘅 process。

呢個係功能上合理，但喺自動化流程入面屬 sharp edge：

- 用錯 port
- 會殺錯 process

### 有冇惡意邏輯
**未見。**

佢做嘅事非常敏感，但全部都係明示功能：

- tunnel
- cache
- password gate
- reconnect

冇發現隱藏埋伏。

### 與主 repo 關係
主 repo 幾個地方用咗 `traforo`：

- `cli` 直接依賴 `traforo` workspace package
- `cli/src/commands/screenshare.ts` 用 `TunnelClient`
- `cli/src/cli.ts` 有 tunnel 相關 command
- `discord-slack-bridge/scripts/echo-bot.ts` 用佢做 webhook / bridge testing
- root `prepare` 會 build 佢

即係佢唔止係 standalone project，亦係 Kimaki 一部分重要基建能力。

### 改善建議
1. 高風險場景預設要求 password
2. 減少 query-string secret 傳遞
3. 減少 production 詳細 request logs
4. 增加更強嘅臨時 access control，例如 one-time token
5. 針對常見高風險本地端口加警告

---

## 3. `errore` 🧰

### 作用
`errore` 係 TypeScript library，用 errors-as-values 方式處理錯誤，係 Kimaki coding style 嘅基礎之一。

### Build / runtime 入口
- manifest：`errore/package.json`
- library exports：`errore/src/index.ts`
- CLI：`errore/src/cli.ts`
- docs worker：`errore/worker/worker.tsx`

### 外部連線
作為 library runtime 幾乎冇外部連線。

只有：

- docs worker 提供 HTTP site
- CLI 讀本地 skill 檔

### 安全敏感位
相對低風險。

留意點：

- `unwrap()` 會重新 throw
- `toJSON()` 會 serialize error/cause/stack
- 如果上層 app 無 redaction 就直接 log，可能將敏感資訊帶出

### 有冇惡意邏輯
**未見。**

呢個基本上係 utility library，行為同 package 描述一致。

### 與主 repo 關係
呢個唔係 incidental dependency，而係 **核心 coding convention dependency**。

- `cli/package.json` 直接依賴 `errore`
- `AGENTS.md` 明講成個 codebase 跟 `errore` 慣例
- `cli` 多個檔大量 import `errore`

即係：

> 如果要長期維護 Kimaki，`errore` 唔可以當普通第三方套件睇，而係工程風格基礎件。

### 改善建議
1. 補多啲關於敏感 error serialization 嘅指引
2. 更清晰界定 library core 同 docs worker 嘅邊界
3. 鼓勵喺敏感 app 內避免濫用 `unwrap()`

---

## 4. `opencode-injection-guard` 🛡️

### 作用
呢個係 OpenCode plugin，喺 `tool.execute.after` 時攔截工具輸出，再用另一個 judge model 判斷有冇 prompt injection。

如果 judge 覺得可疑，會：

- block 原始 tool output
- 用 guard message 取代

### Build / runtime 入口
- manifest：`opencode-injection-guard/package.json`
- plugin entry：`opencode-injection-guard/src/index.ts`
- config：`opencode-injection-guard/src/config.ts`
- judge logic：`opencode-injection-guard/src/judge.ts`

### 會對外連咩
佢自己唔係直接 call OpenAI API，而係：

- 用 OpenCode SDK
- 建 judge session
- `provider.list`
- `session.create`
- `session.prompt`
- `session.delete`

實際 judge model 會經 OpenCode 連去已配置 provider。

### 安全敏感位
#### 本質係「用外部 LLM 掃描工具輸出」
即係話，如果 scan patterns 包括：

- `read:*`
- `bash:*`
- `webfetch:*`

咁工具輸出入面可能有：

- source code
- secrets
- private docs
- internal paths

而呢啲內容會再送去 judge model。

呢個係非常典型嘅 security vs privacy tradeoff。

#### judge session 係 deny-all，方向正確
`judge.ts` 會建一個 deny-all permission session，避免 judge model 再執行工具。呢點係好設計。

#### plugin runtime 用 `console.error`
`index.ts` 同 `judge.ts` 用咗 `console.error` 打 log。對 standalone package 未必大問題，但喺 Kimaki repo 內部指引其實係不建議 plugin 咁做，因為會污染 opencode plugin output。

#### 自訂 model resolution 有 override 風險
從 code 結構睇，custom model resolution 有機會被 auto-selection 覆蓋，對預期行為有風險。

### 有冇惡意邏輯
**未見。**

佢主要會將工具輸出送去 judge model，但呢個係 package 明文設計目標，唔係 hidden exfiltration。

### 與主 repo 關係
Kimaki 直接將佢 re-export 成 plugin：

- `cli/src/kimaki-opencode-plugin.ts`

另外 `opencode.ts`、session runtime 都會配合注入 scan patterns。

即係：

> 呢個 plugin 已經唔係外掛式 optional concept，而係 Kimaki OpenCode security story 嘅一部分。

### 改善建議
1. 增加 redact / truncate sensitive outputs 再送 judge
2. 避免 plugin runtime `console.error`
3. 改善 malformed judge response parser
4. 清晰定義 custom model vs auto model precedence
5. 補更多 false-positive / false-negative regression tests

---

## 橫向比較 📊

| Submodule | 主要角色 | 主要風險 | 惡意跡象 |
|---|---|---|---|
| `gateway-proxy` | Discord shared bot gateway / REST proxy | auth scope bug、credential exposure、wake flow | 未見 |
| `traforo` | public tunnel | local service exposure、optional auth、query-string secret | 未見 |
| `opencode-injection-guard` | tool output prompt injection guard | sensitive output 送 judge model、heuristic misclassification | 未見 |
| `errore` | TS errors-as-values library | error serialization / misuse only | 未見 |

---

## 最終結論 ✅

- 4 個 submodule **都應該視為主 project 實際一部分**
- 其中 `gateway-proxy` 同 `traforo` 屬於 **基建級高風險組件**
- `opencode-injection-guard` 係 **安全導向但有私隱 tradeoff** 嘅組件
- `errore` 主要係 engineering foundation，安全風險最低

最重要一句：

> 呢啲 submodule 唔係可忽略外掛，而係 Kimaki 功能、安全邊界、運行方式嘅核心部分；之後所有完整 review、build、debug、修改，都應該將 submodule 納入正式審核範圍。 🚨
