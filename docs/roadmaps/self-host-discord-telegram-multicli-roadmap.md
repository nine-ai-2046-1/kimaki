---
title: Self-Host Discord Telegram Multi-CLI Roadmap
description: >-
  Implementation roadmap for a self-hosted kimaki edition with Discord,
  Telegram, and multiple coding backends.
prompt: |
  Create a practical implementation roadmap to evolve the original kimaki repo
  into a self-hosted, per-machine edition with Discord and Telegram bots and
  support for OpenCode, Codex, Gemini CLI, and Kiro CLI. The roadmap should be
  realistic, staged, and aligned with keeping the original repo's UX spirit
  while removing shared gateway infrastructure.
references:
  - @/docs/architecture/self-host-target-architecture.md
  - @/docs/architecture/self-host-component-matrix.md
  - @/cli/src/discord-bot.ts
  - @/cli/src/opencode.ts
  - @/cli/src/session-handler/thread-session-runtime.ts
  - @/cli/src/database.ts
---

# Self-Host Discord + Telegram + Multi-CLI Roadmap 🚀

## 目標
將現有 Kimaki 演化成：

- self-host
- per-machine deployment
- Discord + Telegram
- OpenCode + Codex + Gemini CLI + Kiro CLI
- 保留原 repo 工作流與 UX 精神
- 不依賴 shared gateway / website onboarding

---

## 建議總體策略

唔好一次過大爆改。最穩陣係分階段：

1. 先做 **Discord self-host MVP**
2. 再做 **multi-backend abstraction**
3. 再加 **Telegram transport**
4. 最後先補進階功能 parity

---

## Phase 1: Discord Self-Host MVP 🧩

### 目標
喺唔要 shared gateway 嘅前提下，保留原 repo 主要 Discord coding 體驗。

### 要做
1. 定義 `self-host mode`
2. 直接用 `DISCORD_BOT_TOKEN` 啟動 bot
3. 移除 / bypass `gateway-proxy` 相關啟動路徑
4. 保留 project mapping、session runtime、message flow
5. 保留 OpenCode backend 先跑通

### 成功條件
- 一部機可直接用 bot token 跑 Discord bot
- 可以喺 Discord 同 bot 傾 project
- bot 可以喺本機 project 執行 OpenCode coding flow

---

## Phase 2: Backend Abstraction Layer 🔌

### 目標
將現有 OpenCode-first runtime 變成 backend-pluggable。

### 要做
1. 定義統一 runner interface
2. 抽出 `OpenCodeRunner`
3. 補 `CodexRunner`
4. 補 `GeminiCliRunner`
5. 補 `KiroCliRunner`
6. 將 session runtime 改成依賴 runner interface，而唔係直接依賴 OpenCode

### 建議 runner 統一能力
- `startSession()`
- `sendPrompt()`
- `cancel()`
- `streamEvents()`
- `shutdown()`

### 成功條件
- 同一個 Discord flow 可以切換 backend
- per project / per session 可選 backend

---

## Phase 3: Telegram Transport 📱

### 目標
喺唔破壞核心 session runtime 嘅前提下，加 Telegram bot。

### 要做
1. 抽出 platform-neutral event model
2. 抽出 platform-neutral render/action model
3. 建 `TelegramTransport`
4. 建 Telegram chat/session mapping
5. 對齊 Discord 主要 flow：
- 開始 session
- project selection
- backend selection
- stream output
- cancel/retry

### 成功條件
- Telegram 可以完成同 Discord 類似嘅 coding workflow
- 核心 backend/session 邏輯共用

---

## Phase 4: Self-Host Packaging And Deployment 📦

### 目標
做到每部 Ubuntu/mac 都可以複製部署。

### 要做
1. 定義單機部署 config
2. 定義 env vars
3. 定義 local DB/init flow
4. 定義 per-machine project path config
5. 提供 build artifacts / startup script

### 目標體驗
每部機只需要：

1. 安裝 app
2. 設定 bot token
3. 安裝並登入 backend CLI
4. 指向 project path
5. 啟動服務

---

## Phase 5: Feature Parity And Enhancements ✨

### 可後補功能
- worktree polish
- queue polish
- advanced message rendering
- screenshare
- voice
- richer Telegram buttons / menus

### 原則
- 核心 coding workflow 先穩
- 進階功能後補

---

## 技術拆解順序（實作先後）

## Step 1
整理 `cli` 入面：

- shared gateway 相關 code path
- direct Discord bot path
- session runtime 與 OpenCode 強耦合位

## Step 2
建立新抽象：

- `Transport`
- `Runner`
- `SessionRuntime`

## Step 3
將現有 OpenCode implementation 遷入 `OpenCodeRunner`

## Step 4
保留 Discord transport，令 MVP 跑通

## Step 5
補 `CodexRunner` / `GeminiCliRunner` / `KiroCliRunner`

## Step 6
補 Telegram transport

## Step 7
整理 packaging / deployment / config

---

## 不建議做法

### 1. 唔好先做 Telegram 再抽象
因為會令平台耦合更深。

### 2. 唔好先重建 website / gateway
因為你個 use case 唔需要。

### 3. 唔好一開始追求全部 feature parity
先完成最核心 coding workflow 更重要。

---

## MVP 定義

MVP 應包括：

1. Discord direct bot token mode
2. local DB / project mapping
3. OpenCode backend
4. backend selector framework
5. 至少 1 個新增 backend proof-of-concept

### 建議第一個新增 backend
**Codex** 或 **Gemini CLI**

原因：
- 通常整合路徑比 Kiro 清晰
- 可以較快驗證 adapter 模型正唔正確

---

## 第二個里程碑

第二個里程碑應包括：

1. Discord + Telegram 雙 transport
2. 4 個 backend runner
3. per-machine config model
4. basic packaging

---

## 最終里程碑

最終你應該有一個版本可以做到：

- Ubuntu / mac 都能跑
- 每部機各自 bot token
- 每部機各自 project path
- Discord / Telegram 都可操作
- backend 可選 OpenCode / Codex / Gemini CLI / Kiro CLI
- UX/flow 基於原 repo

---

## 最終結論 ✅

最合理路線唔係重建原 repo 全部 infra，而係：

- **先保住 Discord 自托管主線**
- **再抽象 backend**
- **再補 Telegram**
- **最後做可複製部署 packaging**

咁先最貼近你想要嘅結果：

> 一個自用、自托管、可複製到多部 Ubuntu/mac 嘅 coding bot 系統。 
