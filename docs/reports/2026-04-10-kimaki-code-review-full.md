# Kimaki Code Review Report 🔍
> 以 **code review** 為基礎，**唔依賴 README**  
> 語言：廣東話  
> 格式：GitHub-flavored Markdown  
> 審核 repo：`https://github.com/nine-ai-2046-1/kimaki`

## 0. Executive Summary 🧭
我審核完呢個 repo 之後，結論係：

- **冇明顯惡意程式碼 / 後門 / 偷偷外傳資料邏輯**
- 但佢本身係一個 **高權限 AI bot / agent orchestration system**
- 主要風險唔係「惡意」，而係「**好多合法但危險嘅能力，而安全邊界未完全收緊**」
- 最大風險位主要有：
- onboarding secret 經 URL query string 傳遞
- Discord 內可直接執行 shell command
- AI runtime 預設可 `bash` / `edit` / `webfetch`
- screenshare tunnel 提供遠端操控能力
- 多種 token / key 明文持久化
- error monitoring 幾乎係空殼

一句講晒：

> 呢個 project **唔似 malware**，但係一個 **有能力讀寫檔案、執行命令、連外網、做 screenshare、同步 Slack/Discord、保存 tokens** 嘅強權限系統，如果部署或權限配置唔好，風險會幾高。 ⚠️

## 1. 審核範圍與限制 📌

### 已審核範圍
我主要睇咗呢幾部分：

- `cli/`
- `website/`
- `discord-slack-bridge/`
- `db/`
- `slack-digital-twin/`
- `opencode-*`
- `fly-admin/`
- `libsqlproxy/`

### 重要限制
有一個重要盲點：

- repo 提到有 `gateway-proxy` Rust service
- 但今次 clone 入面 **submodule source 未完整 checkout**
- 所以 **Discord gateway proxy 最核心 auth / forwarding / filtering 實作未能完整驗證**

即係話：

- 我而家對 gateway-proxy 嘅判斷，係基於 monorepo 其他 package 對佢嘅描述、調用方式、schema 同註解
- **唔可以當成對整體系統 100% 完整審核**

## 2. 呢個 project 其實係做乜？ 🧠

根據 code，本 project 唔係單純一個 bot，而係一套 **多組件 AI agent platform**。

### 核心用途
- 將 **Discord** 變成 AI coding assistant 嘅主要操作介面
- 經由 **OpenCode** 做 session / agent runtime
- 將 output、tool call、狀態回推返去 Discord thread
- 提供 onboarding website 做 Discord / Slack 授權
- 提供 Slack bridge，令原本 Discord-first 嘅 bot 可以接近無痛跑去 Slack

### 主要組件
| 組件 | 作用 |
|---|---|
| `cli/` | 主程式，Discord bot、OpenCode integration、命令執行、session orchestration |
| `website/` | onboarding、OAuth callback、Slack/Discord install flow、Cloudflare Worker control plane |
| `discord-slack-bridge/` | 將 Slack 包裝成近似 Discord API / Gateway |
| `db/` | shared Postgres schema，主要存 gateway client mappings、auth data |
| `slack-digital-twin/` | Slack 測試模擬器 / twin |
| `opencode-cached-provider` / `opencode-deterministic-provider` | OpenCode provider layer / test support |
| `libsqlproxy` | Hrana / libsql HTTP proxy |
| `fly-admin/` | Fly.io admin API client library |

### 主要 entry points
- `cli/src/bin.ts`
- `cli/src/cli.ts`
- `cli/src/discord-bot.ts`
- `website/src/index.tsx`
- `website/src/auth.ts`
- `discord-slack-bridge/src/server.ts`

## 3. 系統點運作？ 🔄

### A. Discord 主流程
1. 用戶喺 Discord channel / thread 發訊息
2. `cli/src/discord-bot.ts` 收到 event
3. Bot 會查本地 SQLite：
- project directory
- thread-session mapping
- model / agent / verbosity / queue / worktree 狀態
4. 之後將訊息送去 OpenCode session
5. OpenCode event stream 經 `thread-session-runtime` 轉成 Discord 可見內容
6. bot 將結果、tool output、typing、footer 等發返去 Discord

### B. Onboarding 流程
1. CLI 生成 install URL
2. browser 開 website onboarding route
3. website 做 OAuth / callback
4. 寫入 shared Postgres `gateway_clients`
5. CLI 輪詢 `/api/onboarding/status`
6. 成功後將 gateway credential 保存到本地 SQLite
7. bot 之後用 shared gateway mode 或 self-hosted mode 運作

### C. Slack 流程
1. Slack webhook / events 打入 `website`
2. website 將請求 fanout 到 Durable Object
3. DO 跑 `discord-slack-bridge`
4. bridge 將 Slack event 翻譯成 Discord-like event
5. 現有 bot runtime 可以盡量唔改就重用

### D. Voice / Audio 流程
1. Discord 收到 voice attachment
2. `voice-handler.ts` / `voice.ts` 處理音訊
3. 用 OpenAI 或 Gemini 轉錄
4. 再將轉錄結果當成 coding prompt 使用

## 4. 外部服務 / API / 網路流量去向 🌐

### Discord
- OAuth / install
- user info
- REST API
- gateway traffic

主要檔案：
- `cli/src/utils.ts`
- `cli/src/cli.ts`
- `cli/src/discord-bot.ts`
- `website/src/auth.ts`

### Slack
- `auth.findTeam`
- `oauth.v2.access`
- Slack Web API
- webhook / interactivity / event subscriptions

主要檔案：
- `website/src/index.tsx`
- `website/src/slack-install-form.tsx`
- `discord-slack-bridge/src/server.ts`
- `discord-slack-bridge/src/rest-translator.ts`

### OpenCode
- AI session runtime
- event subscribe
- prompt / tools / plugins

主要檔案：
- `cli/src/opencode.ts`
- `cli/src/session-handler/thread-session-runtime.ts`

### Anthropic
- OAuth
- token refresh
- profile lookup
- create API key

主要檔案：
- `cli/src/anthropic-auth-plugin.ts`
- `cli/src/anthropic-auth-state.ts`

### OpenAI / Gemini
- transcription
- audio / live model interaction

主要檔案：
- `cli/src/voice.ts`
- `cli/src/voice-handler.ts`
- `cli/src/genai.ts`
- `cli/src/openai-realtime.ts`

### Cloudflare
- Worker
- Durable Object
- KV
- Hyperdrive

主要檔案：
- `website/src/index.tsx`
- `website/src/gateway-client-kv.ts`
- `website/src/slack-bridge-do.ts`

### Database
- shared Postgres for onboarding / gateway mappings
- local SQLite / libsql for persistent local bot state

主要檔案：
- `db/schema.prisma`
- `cli/src/database.ts`
- `cli/src/db.ts`
- `cli/src/hrana-server.ts`

### Tunnel / Screenshare
- 開放 noVNC / VNC tunnel
- 遠端 screen access

主要檔案：
- `cli/src/commands/screenshare.ts`

## 5. 安全風險總覽 🛡️

### 5.1 Highest Risk Findings 🔥

#### 1. Onboarding secret 經 URL 傳遞
**風險級別：High**

問題：
- `clientId`
- `clientSecret`
- `kimakiCallbackUrl`
- `reachableUrl`
會經 query string 流轉。

風險：
- browser history
- reverse proxy logs
- referer
- 截圖 / copy-paste 外洩

建議：
- 改用一次性 server-side state handle
- secret 只存 server-side temporary store

#### 2. Discord 內建 shell command execution
**風險級別：High**

問題：
- `cli/src/commands/run-command.ts`
- bot 可直接執行 shell command

風險：
- 遠端 RCE
- 讀 secret
- 改 repo
- 開新 process
- 對外傳資料

建議：
- role allowlist
- owner-only mode
- structured audit log
- production default disable

#### 3. OpenCode tools 權限過大
**風險級別：High**

問題：
`cli/src/opencode.ts` 容許：
- `bash`
- `edit`
- `read`
- `webfetch`
- `websearch`
- `codesearch`

風險：
- prompt injection
- agent 被引導外傳
- 讀 sensitive file 再 send 出去
- 遠端命令 + 外網能力組合

建議：
- default 最小權限
- network tool default off
- per-thread opt-in
- 全部 tool usage 要 audit

#### 4. Screenshare tunnel 提供遠端控制能力
**風險級別：High**

問題：
- macOS 用 Remote Management / VNC
- Linux 起 `x11vnc`
- 用 `traforo` tunnel 開 noVNC

風險：
- URL 外洩即可能被利用
- Linux `x11vnc -nopw`
- 依賴 tunnel secrecy 多過明確 auth

建議：
- 二次驗證
- short-lived signed access
- view-only / control mode 分離
- admin only

### 5.2 Medium Risk Findings ⚠️

#### 5. 本地與雲端 secrets 明文持久化
**風險級別：Medium**

包括：
- bot token
- gateway credential
- OpenAI / Gemini key
- Slack bot token
- gateway client secret

建議：
- local 改用 Keychain
- 敏感欄位加密
- 支援 rotation / revoke

#### 6. Hrana local DB server 可變成 remote attack surface
**風險級別：Medium**

問題：
- 有 bearer auth
- 但若 token 洩漏或 bind 公網，可能遠端讀寫 DB

建議：
- default localhost only
- short-lived token
- remote access logging

#### 7. Error monitoring 幾乎停用
**風險級別：Medium**

問題：
- `cli/src/sentry.ts` 幾乎 no-op

建議：
- 恢復真實 error reporting
- crash / auth failure / shell / screenshare 都要告警

#### 8. Logging hygiene 一般
**風險級別：Medium**

問題：
- 多處 `console.log/warn/error`
- 容易亂、難 redact

建議：
- 統一 logger
- redaction
- request / session correlation

## 6. 有冇惡意邏輯？ 👀

### 結論
**目前未見明顯惡意邏輯。**

但要強調：

> 呢個 repo 最大問題唔係「有冇惡意」，而係「**好多合法但危險嘅能力，而安全邊界未完全收緊**」。

即係：
- 佢唔似 malware
- 但功能能力一旦被濫用，破壞力可以好高

## 7. 項目用途與功能說明（根據 code） 🧩

### 主要功能
- Discord 作為 AI coding workspace
- thread/session management
- OpenCode runtime integration
- tool output 回傳 Discord
- queue message
- model / agent switch
- voice transcription
- worktree workflow
- scheduling
- screenshare
- Slack bridge

## 8. Build / Update / Run / Use 流程 🏗️

### 安裝依賴
```bash
pnpm install
```

### Build `cli`
```bash
cd cli
pnpm build
```

### Run `cli`
```bash
cd cli
pnpm dev
```

### Build / run `website`
```bash
cd website
pnpm build
pnpm dev
```

### Build / test Slack bridge
```bash
cd discord-slack-bridge
pnpm build
pnpm typecheck
pnpm test --run
```

### 改 feature 應改位置
- Discord bot：`cli/src/discord-bot.ts`, `cli/src/commands/*`
- OpenCode runtime：`cli/src/opencode.ts`, `cli/src/session-handler/*`
- Voice：`cli/src/voice.ts`, `cli/src/voice-handler.ts`
- Website onboarding：`website/src/index.tsx`, `website/src/auth.ts`
- Slack bridge：`discord-slack-bridge/src/*`

## 9. Telegram 可唔可以支援？ 📱

### 結論
- 基本 support：**可行**
- 同 Discord 同級 UX：**高成本**
- 完整 parity：**唔現實**

原因：
- 呢個架構極度 Discord-first
- Slack 都係靠 bridge 才做到近似兼容
- Telegram model 差異大

## 10. Gemini CLI、Kiro CLI、Codex、Claude Code 可唔可以支援？ 🤖

### 可行性排序
1. Claude Code
2. Gemini CLI
3. Codex
4. Kiro CLI

### 原因
- Claude 最接近現有 Anthropic groundwork
- Gemini 已有 API 基礎
- Codex 未見 runtime adapter
- Kiro 基本未見 groundwork

## 11. 可改善項目 ✨

### Security
- 移除 URL query secrets
- shell command 嚴格授權
- OpenCode 最小權限
- screenshare 加 auth
- secrets secure storage
- token rotation
- audit logging

### Performance
- 量化 startup latency
- cache 命中率監測
- 長跑 memory state 優化

### Observability
- restore Sentry
- 統一 logger
- request/session/thread correlation

### Structure
- 抽離 platform-neutral runtime
- security policy 集中化
- 移除 Discord-first 假設

## 12. 修復優先級 🚨

### P0
- URL query secrets
- shell execution access control
- OpenCode permissions 收緊
- screenshare hardening

### P1
- secrets at-rest
- error monitoring
- audit logging
- DB exposure tightening

### P2
- 平台抽象
- metrics
- 長跑穩定性
- 安全測試覆蓋

## 13. 最終結論 ✅

- **冇睇到惡意 code**
- **有睇到多個高風險設計點**
- **呢個 project 係 powerful agent platform，不係普通 bot**
- **好多合法但危險嘅能力，而安全邊界未完全收緊**

## 14. 重要檔案參考 📚
- `cli/src/bin.ts`
- `cli/src/cli.ts`
- `cli/src/discord-bot.ts`
- `cli/src/opencode.ts`
- `cli/src/commands/run-command.ts`
- `cli/src/commands/screenshare.ts`
- `cli/src/database.ts`
- `cli/src/hrana-server.ts`
- `cli/src/voice.ts`
- `cli/src/anthropic-auth-plugin.ts`
- `website/src/index.tsx`
- `website/src/auth.ts`
- `website/src/slack-install-form.tsx`
- `website/src/gateway-client-kv.ts`
- `discord-slack-bridge/src/server.ts`
- `discord-slack-bridge/src/rest-translator.ts`
- `db/schema.prisma`
