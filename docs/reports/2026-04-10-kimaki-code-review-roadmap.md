# Kimaki Security And Engineering Roadmap 🛠️

## 目標
將 Kimaki 由「功能強但邊界未收緊」提升到「可控、可追蹤、可安全運作」。

## Phase 0: 即時風險止血 🚑

### 1. 移除 URL query secrets
- 將 `clientSecret`、`reachableUrl` 等由 query 改成 server-side temporary state
- CLI 只傳 state token
- callback 再 server-side 解析

### 2. 鎖緊 shell execution
- `/run-shell-command` owner-only / admin-only
- 建 audit log：
- user id
- guild/channel/thread
- command
- exit code
- timestamp
- 增加 command allow policy

### 3. OpenCode 權限分級
建立 3 種模式：

- `read-only`
- `read-write`
- `network-enabled`

預設：
- 禁 `webfetch`
- 禁 `websearch`
- 禁 `bash`
- 需要明確 opt-in

### 4. screenshare 加固
- 加 signed access token
- access 過期時間縮短
- 支援 view-only
- 嚴格 admin only

## Phase 1: Secrets / Access Hardening 🔐

### 1. Secrets storage
- local 改用 macOS Keychain / OS secure storage
- DB 內敏感欄位加密
- 支援 revoke / rotation

### 2. Gateway / DB tokens
- 縮短有效期
- capability-scoped token
- 分離讀寫權限

### 3. Slack / Discord onboarding
- 加 TTL
- 一次性 state
- callback 完成後主動 invalidation

## Phase 2: Observability / Audit 👣

### 1. Restore Sentry
- `notifyError()` 唔可以再係 no-op
- capture：
- auth failure
- webhook anomaly
- shell execution failure
- screenshare lifecycle failure
- DB auth failure

### 2. 統一 logging
- 用 structured logger
- 所有 log 自動 redaction
- 加 correlation id：
- request id
- thread id
- session id
- guild/team id

### 3. Security audit events
- shell command executed
- OpenCode external fetch
- secret rotation
- screenshare started/stopped
- admin action

## Phase 3: 架構優化 🧱

### 1. 平台抽象
抽離：
- platform-neutral message model
- action model
- permission model
- session model

目標：
- 減少 Discord-first 綁死
- 方便 Telegram / 其他 CLI adapter

### 2. 將 security policy 集中化
建立：
- auth policy module
- secret handling module
- agent capability policy

### 3. Provider adapter architecture
為以下預留標準介面：
- OpenCode
- Claude Code
- Gemini CLI
- Codex
- Kiro CLI

## Phase 4: Test Hardening 🧪

### 加嘅 test 類型
- onboarding secret leakage test
- unauthorized shell command test
- prompt injection boundary test
- tool capability restriction test
- screenshare unauthorized access test
- webhook replay / tampering test

## 優先級表
| 優先級 | 項目 |
|---|---|
| P0 | URL secrets、shell control、OpenCode permissions、screenshare hardening |
| P1 | secrets storage、Sentry、audit logs、DB/token tightening |
| P2 | platform abstraction、provider adapters、security regression tests |

## 預期成果
完成後應做到：

- secret 不再經 URL 外洩
- 危險功能有清晰 access control
- agent 權限最小化
- 所有高風險操作可追蹤
- 更容易擴充 Telegram / 其他 CLI agent
