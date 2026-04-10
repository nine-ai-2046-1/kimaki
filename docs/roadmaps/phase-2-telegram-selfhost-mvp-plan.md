---
title: Phase 2 Telegram Self-Host MVP Plan
description: >-
  Implementation plan for adding a Telegram self-host transport to kimaki after
  Discord self-host Phase 1.
prompt: |
  Write a practical Phase 2 plan for Telegram self-host support in kimaki. The
  plan should assume Discord self-host Phase 1 already works, keep OpenCode as
  the first working backend, and define a private-chat-first Telegram MVP that
  reuses the local runtime, backend selection, and state persistence model.
  Write in Cantonese, GitHub-flavored Markdown, practical and implementation-
  focused.
references:
  - @/docs/architecture/self-host-target-architecture.md
  - @/docs/architecture/telegram-self-host-target-architecture.md
  - @/docs/roadmaps/self-host-discord-telegram-multicli-roadmap.md
  - @/docs/roadmaps/phase-1-discord-selfhost-mvp-plan.md
  - @/docs/roadmaps/self-host-binary-runbook-and-env-spec.md
  - @/cli/src/cli.ts
  - @/cli/src/discord-bot.ts
  - @/cli/src/database.ts
  - @/cli/src/session-handler/thread-session-runtime.ts
---

# Phase 2 Telegram Self-Host MVP Plan

## 目標
第二階段目標唔係追 Telegram feature parity，而係加一條 **可用、可自用、可複製部署** 嘅 Telegram 入口。

呢個階段完成後，應做到：

- 同一部機可同時跑 Discord bot 同 Telegram bot
- Telegram private chat 可操作本機 project
- Telegram 可建立 session 並送 prompt 去 OpenCode
- Telegram 可查 backend / 切 backend
- 核心 runtime、backend persistence、project state 盡量共用

## 成功定義
如果以下全部做到，就算 Phase 2 成功：

1. 可以用 `TELEGRAM_BOT_TOKEN` 起 bot
2. Telegram private chat 可以選 project
3. Telegram private chat 可以建立 session
4. 普通文字訊息可以送入 active session
5. session output 可以回傳到 Telegram
6. `/backend current` 類能力有 Telegram 對應版本
7. Discord 同 Telegram 可以共用本地 backend / project 狀態模型

## Phase 2 不做範圍

今階段先唔做：

- Telegram group first-class support
- Telegram topics / forum parity
- voice parity
- screenshare
- 完整 interactive component parity
- 多 active session 管理 UI
- 所有 Discord command 逐個搬去 Telegram

## 核心策略

## 1. 先抽 transport 共用界線
Telegram 唔應該直接複製 Discord event handler。

應先整理清楚邊啲係：

- platform-specific logic
- runtime / backend shared logic

### 最優先抽象
- conversation key
- output sink
- ingress event model
- platform command dispatch adapter

## 2. private chat first
Telegram MVP 以 private chat 為主。

### 理由
- 更簡單
- 更貼近 self-host 自用場景
- 較少權限與群組管理複雜度
- 方便先驗證 transport reuse

## 3. OpenCode first
Telegram MVP 第一版先只要求 OpenCode 可用。

backend command surface 仍然保留可切換設計，但實際 runner 可沿用目前 Phase 1 狀態：

- OpenCode available
- 其他 backend 可先顯示 unavailable / planned

## 具體實作分段

## Step 1: 定義 Telegram conversation model

### 目標
定義 Telegram private chat 點樣映射到現有 session / project 模型。

### 建議做法
- 一個 private chat = 一個 conversation root
- 一個 private chat 有一個 current project binding
- 一個 private chat 有一個 active session binding

### 需要新增 / 調整的 state
- chat to project mapping
- chat to active session mapping
- chat to backend override

## Step 2: 抽 output sink

### 目標
將 `ThreadSessionRuntime` 入面最 platform-specific 嘅 send/update/typing 行為抽出。

### 最低要求接口
- `sendTyping`
- `sendUserVisibleText`
- `sendAssistantPart`
- `sendQuestion`
- `sendError`
- `sendCompletionFooter`

### 成功條件
Discord transport 可照舊工作，而 Telegram transport 可接同一 runtime output。

## Step 3: 建 Telegram bot adapter

### 目標
建立 Telegram polling bot 入口。

### 建議能力
- 讀 `TELEGRAM_BOT_TOKEN`
- 啟動 polling
- 註冊 command handlers
- 收普通 text message
- 做 chat metadata normalization

### 命令建議
- `/start`
- `/projects`
- `/use_project`
- `/new_session`
- `/backend_current`
- `/backend_set`

## Step 4: 接 project selection flow

### 目標
令 Telegram private chat 可以綁定 project。

### UX 建議
先做 command-based flow：

- `/projects` 列可用 project
- `/use_project <name>` 綁 project

如果 command argument 體驗唔夠好，再補 inline button list。

## Step 5: 接 session flow

### 目標
令 Telegram 可以建立 session 並持續 follow-up。

### 行為建議
- `/new_session <prompt>` 建新 session
- 已有 active session 時，普通 text 直接 follow-up
- 若未揀 project，回覆引導訊息

## Step 6: backend visibility 與 switching

### 目標
保持同 Discord 一致嘅 backend mental model。

### 最低要求
- 查當前 backend
- 設 machine default backend
- 設 current chat backend override

### 暫時可唔做
- 超細粒度 session override UI

## Step 7: message formatting policy

### 目標
定一套 Telegram-friendly output 策略，唔直接照搬 Discord message 粒度。

### 建議
- typing indicator 保留
- text parts 做較粗粒度 flush
- 工具輸出只保留重要摘要
- completion footer 保留
- 問題型互動先用簡單 button

## Step 8: 驗證與測試

### 最少手動驗證場景
1. bot 可啟動
2. `/start` 正常
3. `/projects` 正常
4. `/use_project` 正常
5. `/new_session` 正常
6. 普通 follow-up message 正常
7. restart 後 project/session mapping 是否保留

### 測試策略
- 優先加 pure function / mapping tests
- transport integration 可以先用手動 smoke test
- 等 Telegram flow 穩定後，再考慮補更完整自動化

## 風險排序

### 高優先
1. runtime 同平台 send logic 耦合太深，令 Telegram integration 變成大量複製
2. Telegram chat model 太薄，之後無法擴展 group/topic
3. 輸出太碎，Telegram UX 變差

### 中優先
1. command naming 與 Discord 不一致，令 mental model 混亂
2. backend override scope 定義唔清

### 低優先
1. rich buttons / menus 不夠靚
2. group support 延後

## 實作順序建議

1. 先抽 output sink / conversation key
2. 再加 Telegram bot adapter
3. 再接 project binding
4. 再接 session ingress/output
5. 再補 backend commands
6. 最後先做 UX polish

## 最終結論
Phase 2 Telegram MVP 最重要唔係「做多一個 bot」，而係：

> 令 Telegram 成為同 Discord 並列、但共用同一套本機 coding runtime 嘅第二入口。

只要保持 private-chat-first、OpenCode-first、runtime reuse 呢三條原則，呢一步會係可控而且實用嘅擴展。 
