---
title: Telegram Self-Host Target Architecture
description: >-
  Defines the target architecture for adding a Telegram transport to the
  self-host kimaki edition while reusing the existing local session and backend
  runtime.
prompt: |
  Based on the current self-host kimaki direction, write a Telegram target
  architecture for the next phase. The design should assume Discord self-host
  Phase 1 is working, reuse the local session/runtime/backend model, and define
  a practical Telegram MVP that is private-chat-first and OpenCode-first. Write
  in Cantonese, GitHub-flavored Markdown, practical and implementation-focused.
references:
  - @/docs/architecture/self-host-target-architecture.md
  - @/docs/roadmaps/self-host-discord-telegram-multicli-roadmap.md
  - @/docs/roadmaps/phase-1-discord-selfhost-mvp-plan.md
  - @/docs/roadmaps/self-host-binary-runbook-and-env-spec.md
  - @/cli/src/cli.ts
  - @/cli/src/discord-bot.ts
  - @/cli/src/interaction-handler.ts
  - @/cli/src/database.ts
  - @/cli/src/session-handler/thread-session-runtime.ts
---

# Telegram Self-Host Target Architecture

## 目標
喺現有 Discord self-host Phase 1 已跑通嘅基礎上，加一條 **Telegram self-host transport**。

目標唔係重寫第二套 bot core，而係：

- 每部機用自己 `TELEGRAM_BOT_TOKEN`
- Telegram 同 Discord 共用本機 DB / project / backend state
- Telegram 只做 transport 與 platform-specific UX
- session runtime、backend registry、local persistence 盡量共用現有底座

Telegram Phase 2 應定位為：

> 同一部 self-host machine，除咗 Discord 之外，再加一個 Telegram 入口去操作本機 coding workflow。

## 設計原則

### 1. private chat first
Telegram MVP 先支援 private chat，唔急住做 group / topic / forum parity。

原因：

- 最貼近 self-host 自用場景
- permission model 最簡單
- 唔需要一開始處理 group admin、bot privacy mode、topic mapping
- 可以最快驗證 transport 抽象係咪足夠

### 2. runtime 共用，不複製 business logic
Telegram 唔應自己實作第二套 session orchestration。

應重用現有：

- backend cascade
- session persistence
- project mapping
- worktree/session runtime
- backend availability 檢查

Telegram transport 主要負責：

- 收 message / command
- 將 Telegram 事件轉成內部 ingress
- 將 runtime output render 返 Telegram message

### 3. command-first UX
Telegram MVP 先用 command + 簡單 reply keyboard / inline button。

唔一開始追求：

- 太多 wizard
- 複雜多層選單
- 同 Discord 完全一樣嘅 thread 視覺結構

### 4. OpenCode first，backend-ready
Telegram MVP 應先以 OpenCode 跑通，但 command surface 同狀態模型要預留 backend selection。

## 目標系統形態

## A. TelegramTransport
新增 `TelegramTransport`，責任包括：

- 啟動 Telegram bot polling 或 webhook mode
- 收 command / text message
- 做 chat identity normalization
- 建立 Telegram conversation key
- 將使用者輸入轉成 session ingress
- 將 runtime output chunk / edit / send 返 Telegram

第一版建議用 **polling mode**，因為最貼近 self-host per-machine 部署。

## B. TelegramConversation Mapping
Telegram 冇 Discord thread 呢種原生 UX，所以要定一個內部 mapping。

MVP 建議：

- `telegram private chat id` = conversation root
- 每個 private chat 只綁一個 active project context
- 每個 private chat 可以有一個 active session
- 新 session 可以由 command 明確建立

即係 Phase 2 MVP 先用：

- chat-level project context
- chat-level active session

而唔係一開始就做多 session 並行 UI。

## C. Shared Session Runtime Core
現有 `ThreadSessionRuntime` 背後其實已經承擔咗大量非 Discord 專屬工作。

Telegram Phase 2 最重要 architectural work 係：

- 抽離 Discord-specific send/update 邏輯
- 定義 platform-neutral output sink
- 令 runtime 可以向 Discord 或 Telegram emit 統一事件

如果唔做呢步，Telegram code 會被迫複製大量 runtime 行為，長遠會變雙份維護。

## D. Telegram Renderer / Output Sink
需要一層 Telegram renderer，負責將 runtime output 映射成 Telegram message 行為。

最少要支援：

- send typing
- send text chunk
- send follow-up chunk
- send error
- send completion footer
- send simple question / options

第一版唔一定要支援：

- 複雜 rich table rendering
- 同 Discord 一樣嘅 component actions
- 完整 message update parity

## E. Shared Local State
本地 DB 應新增 Telegram transport 所需 mapping，但唔應打散原本 Discord state。

MVP 建議新增：

- Telegram chat -> project directory mapping
- Telegram chat -> active session mapping
- Telegram chat -> selected backend override
- Telegram user/chat metadata cache（可選）

## Telegram MVP UX 建議

## 1. `/start`
用途：

- 顯示 bot 已就緒
- 顯示當前 machine default backend
- 引導用 `/projects`、`/use-project`、`/new-session`

## 2. `/projects`
列出目前可用 project：

- 先列 local known projects
- 顯示當前 chat 用緊邊個 project

## 3. `/use_project`
用途：

- 將 Telegram private chat 綁去某個 project
- 之後普通文字訊息就會落入呢個 project context

第一版可以用 command argument 或 inline button list。

## 4. `/new_session`
用途：

- 喺當前 chat + current project context 建立新 session
- 清楚回覆當前 session backend 同 project

## 5. 普通文字訊息
當前 chat 已有 active project / active session 時：

- 普通文字訊息直接送入 active session

如果未有 project：

- 提示先 `/projects` 或 `/use_project`

## 6. `/backend_current`
顯示：

- machine default backend
- current chat override
- active session backend

## 7. `/backend_set`
第一版建議只做：

- machine scope
- current chat scope

唔需要一開始就做到最複雜 session-only UI。

## MVP 不做範圍

Telegram Phase 2 MVP 唔做：

- group chat first-class support
- Telegram topic / forum mapping
- voice message transcription parity
- screenshare
- 複雜 inline workflow builder
- 完整 Discord slash command parity
- 多 active session 並行切換 UI

## 技術抽象建議

## 1. platform conversation key
建議建立一個統一 key 概念，例如：

- `discord:channel:<id>:thread:<id>`
- `telegram:chat:<id>`

方便之後：

- project binding
- active session binding
- backend override

## 2. output sink interface
建議將平台輸出抽象成類似：

- `sendTyping()`
- `sendText()`
- `sendProgress()`
- `sendQuestion()`
- `sendError()`
- `sendCompletion()`

咁 runtime 唔需要知道 Discord message components 定 Telegram message id。

## 3. transport ingress model
輸入層應抽象成統一 event：

- platform
- conversation key
- user id
- message text
- attachments
- command invocation

Telegram 同 Discord 都只係將自己平台 payload 轉做呢個 shape。

## 風險與注意點

## 1. Telegram 無 thread 原生模型
即係 UX 無法 1:1 對齊 Discord thread。

解法：

- MVP 接受 chat-level session
- 用明確 command 顯示 current project / current session

## 2. message editing / chunking policy 需另定
Telegram 同 Discord 喺：

- rate limit
- message edit 策略
- markdown 格式

都唔同。

所以 renderer 要獨立，不應重用 Discord formatting 邏輯到盡。

## 3. long-running output 要控制訊息密度
如果將 Discord 每個 part 都原樣映射去 Telegram，chat 可能過度洗版。

建議 Telegram MVP：

- text parts 做較粗粒度 flush
- typing 保持輕量
- footer 保留

## 4. Telegram bot security boundary 仍然係本機
就算加 Telegram，self-host 邊界都唔變：

- bot token 係本機自有
- backend CLI 係本機登入
- project path 係本機控制

所以真正優先 hardening 仍然係：

- project root allowlist
- local command execution boundary
- credential storage

唔係 shared gateway 問題。

## 成功定義
如果以下做到，就代表 Telegram target architecture 方向正確：

1. 可以用 `TELEGRAM_BOT_TOKEN` 起 bot
2. private chat 可綁 project
3. private chat 可建立 session
4. 普通訊息可送入現有 backend/runtime
5. backend 狀態可查可改
6. Discord 同 Telegram 共用同一套 local state 核心

## 結論
Telegram Phase 2 唔應理解為「再做一個 bot」，而應理解為：

> 喺現有 self-host bot core 上，加第二個 transport。

最合理落地次序係：

1. private chat first
2. command-first UX
3. 抽 output sink / conversation key
4. 重用 session runtime / backend persistence
5. 最後先補 richer Telegram UI 與 group support
