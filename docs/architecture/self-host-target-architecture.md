---
title: Kimaki Self-Host Target Architecture
description: >-
  Target architecture for a self-hosted, per-machine edition of kimaki with
  Discord and Telegram bots and pluggable coding backends.
prompt: |
  Based on the reviewed kimaki codebase and the user's clarified goal, define a
  self-host target architecture. The new target should remove shared gateway
  and multi-tenant infrastructure, keep the original repo's Discord UX spirit,
  add Telegram support, and support OpenCode, Codex, Gemini CLI, and Kiro CLI
  as local backends. The deployment model is one machine = one independent bot
  node. Write in Cantonese, GitHub-flavored Markdown, easy to read.
references:
  - @/cli/src/bin.ts
  - @/cli/src/cli.ts
  - @/cli/src/discord-bot.ts
  - @/cli/src/opencode.ts
  - @/cli/src/database.ts
  - @/cli/src/interaction-handler.ts
  - @/cli/src/session-handler/thread-session-runtime.ts
  - @/website/src/index.tsx
  - @/website/src/auth.ts
  - @/discord-slack-bridge/src/server.ts
  - @/docs/architecture/submodule-relationship-map.md
  - @/docs/reports/2026-04-10-kimaki-code-review-full.md
  - @/docs/reports/2026-04-10-submodule-review.md
---

# Kimaki Self-Host Target Architecture 🧱

## 目標
將現有 Kimaki 改造成一個 **self-host、per-machine、單租戶** 版本。

每部機都係一個獨立 agent node：

- 有自己嘅 Discord bot
- 有自己嘅 Telegram bot
- 有自己本地 project path
- 有自己本地 state / DB
- 有自己本機已安裝並登入嘅 coding CLI backend

目標唔係服務其他用戶，而係：

> 你可以喺 Discord / Telegram 同 bot 傾 project，然後 bot 喺本機用 OpenCode、Codex、Gemini CLI、Kiro CLI 幫你 code。

---

## 核心設計原則

### 1. 一部機 = 一個獨立 bot node
每部 Ubuntu/mac 都獨立部署同運行：

- 唔共享 gateway
- 唔共享 onboarding control plane
- 唔共享 client secrets
- 唔共享 multi-tenant state

每部機只靠：

- `DISCORD_BOT_TOKEN`
- `TELEGRAM_BOT_TOKEN`
- 本機 project config
- 本機 backend CLI login/session

### 2. self-host first
新版本應以 **direct bot token mode** 做主線，而唔係 gateway mode。

### 3. UX 以原 repo Discord flow 為基礎
保留原 repo 最有價值嘅體驗：

- thread/session 概念
- project mapping
- commands / session lifecycle
- queue / worktree / stateful coding flow

Telegram 版本盡量對齊呢套 flow，但接受平台差異。

### 4. backend pluggable
由原本 OpenCode-first，改成多 backend adapter：

- OpenCode
- Codex
- Gemini CLI
- Kiro CLI

---

## 目標系統組件

## A. Self-Host Bot Core
呢個會係主程式，建議由現有 `cli/` 演化出嚟。

負責：

- 啟動 Discord bot
- 啟動 Telegram bot
- 接收訊息
- 管理 session / project / thread mapping
- 路由去 backend runner
- 回傳結果到對應平台

建議命名可以係：

- `kimaki-selfhost`
- 或者沿用 `cli`，但加入 `self-host` mode

## B. Transport Layer
平台通訊層應拆成兩個 transport：

- `DiscordTransport`
- `TelegramTransport`

責任：

- 接收平台訊息
- 將平台事件轉成統一內部事件
- 將 session output render 返平台訊息

## C. Session Runtime
由現有 thread/session runtime 演化。

責任：

- 建立 session
- 記錄上下文
- 控制 queue / cancel / retry
- 管理本地 project 對應
- 對接 backend runner

## D. Backend Runner Layer
新增統一 backend adapter 抽象。

建議接口：

- `OpenCodeRunner`
- `CodexRunner`
- `GeminiCliRunner`
- `KiroCliRunner`

每個 runner 應負責：

- 啟動 CLI / session
- 傳 prompt
- 收 output / event
- timeout / cancel / exit handling
- stdout/stderr parsing

## E. Local State Store
保留本地 DB 模型，但收窄用途。

應保存：

- project path mapping
- platform chat/thread/session mapping
- selected backend
- session metadata
- queue/worktree state
- message rendering state

不應再保存：

- shared gateway client mappings
- multi-tenant client secret onboarding state

---

## 明確不需要的原架構

以下唔應該再做 self-host 主線：

- `gateway-proxy`
- `website` onboarding / callback flow
- shared gateway mode
- `gateway_clients` client-secret model
- multi-tenant client provisioning
- shared control plane

呢啲可以：

- 完全移除
- 或保留喺 repo 但唔納入 self-host edition 主路徑

---

## 每部機嘅實際部署模型

每部機應該有：

1. bot app build output
2. `DISCORD_BOT_TOKEN`
3. `TELEGRAM_BOT_TOKEN`
4. local config file
5. local DB
6. project workspace path
7. 已安裝並登入嘅 backend CLI

例如：

- `opencode`
- `codex`
- `gemini-cli`
- `kiro-cli`

### 核心特性
- 每部機獨立
- 可直接複製部署
- 只需改 bot token / config / project path
- 唔依賴 shared server state

---

## 建議內部抽象

## 1. Platform-neutral message model
建立統一內部模型，例如：

- conversation
- message
- reply target
- command invocation
- session key

避免業務邏輯直接綁死 Discord API shape。

## 2. Platform-neutral action model
例如：

- send typing
- send text chunk
- update message
- send file
- start session
- cancel session

咁 Discord 同 Telegram 只係 renderer / adapter。

## 3. Backend-neutral runner model
統一輸出：

- text chunk
- tool event
- state event
- error
- completion

令 UI/UX 可以盡量共用。

---

## Discord 與 Telegram 的關係

## Discord
作為第一公民，因為原 repo 本身已成熟。

可最大程度沿用：

- thread/session 概念
- command 風格
- message rendering 方式

## Telegram
作為第二 transport。

目標係：

- 複用相同 backend/session 邏輯
- 用 Telegram 可行方式模擬原本 Discord workflow

### 要接受嘅差異
- 冇 Discord thread 一對一對應
- command / button / interaction model 唔同
- message update / grouping 行為唔同

所以 Telegram 要做到嘅係：

> 保持工作流一致，而唔係逐像素複製 Discord UX。

---

## Backend 支援策略

## OpenCode
最先支援，因為原 repo 已有完整基礎。

## Codex
透過 CLI runner integration 加入。

## Gemini CLI
透過 CLI runner integration 加入。

## Kiro CLI
透過 CLI runner integration 加入。

### 共同原則
- backend 只做 coding execution
- bot core 唔直接綁定單一 provider
- backend selection 可 per project / per session 設定

---

## 最終部署形態

每部 Ubuntu/mac 都可以：

1. 安裝 bot app
2. 設定 Discord/Telegram bot token
3. 安裝並登入所需 coding CLI
4. 指向本地 project
5. 啟動 bot app
6. 透過 Discord / Telegram 同 bot 傾 project

呢個就係你要嘅：

> copy app 去另一部機，換 bot token，同本機 CLI/login/config 對齊，就可以跑。

---

## 最終結論 ✅

對你嘅 use case，最啱嘅 target architecture 係：

- **保留 `cli` 核心與 Discord UX**
- **移除 shared gateway / onboarding / control plane 主依賴**
- **新增 Telegram transport**
- **新增 OpenCode / Codex / Gemini CLI / Kiro CLI backend adapter**
- **每部機獨立部署與獨立 bot token**

呢條路線比重建原 repo 全部 infra 更簡潔、更適合自用、亦更容易喺 Ubuntu 同 mac 上複製部署。 
