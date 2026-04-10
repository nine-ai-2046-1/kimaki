---
title: Phase 1 Discord Self-Host MVP Plan
description: >-
  Implementation plan for the first phase of the self-host kimaki edition:
  Discord self-host MVP with configurable backend selection.
prompt: |
  Write a Phase 1 implementation plan for turning kimaki into a Discord-based
  self-host MVP. The plan should explicitly remove shared gateway dependency,
  preserve the original Discord UX spirit, and include a configurable backend
  model so the bot can use OpenCode, Codex, Gemini CLI, or Kiro CLI. The
  backend choice must be configurable and switchable by the user. Write in
  Cantonese, GitHub-flavored Markdown, practical and implementation-focused.
references:
  - @/docs/architecture/self-host-target-architecture.md
  - @/docs/architecture/self-host-component-matrix.md
  - @/docs/architecture/self-host-runtime-deployment-matrix.md
  - @/docs/roadmaps/self-host-discord-telegram-multicli-roadmap.md
  - @/cli/src/cli.ts
  - @/cli/src/discord-bot.ts
  - @/cli/src/opencode.ts
  - @/cli/src/database.ts
  - @/cli/src/interaction-handler.ts
  - @/cli/src/session-handler/thread-session-runtime.ts
---

# Phase 1: Discord Self-Host MVP Plan 🛠️

## 目標
第一階段唔追求完成成個最終願景，而係要先落地一個 **可自用、可自托管、可複製部署** 嘅 Discord 版本 MVP。

呢個 MVP 要做到：

- 每部機自己 Discord bot token
- 唔再依賴 shared gateway
- 保留原 repo 嘅主要 Discord coding workflow
- backend 可以配置同切換
- 至少先以 OpenCode 跑通，再為 Codex / Gemini CLI / Kiro CLI 鋪好接口

---

## Phase 1 成功定義

如果以下全部做到，就算 Phase 1 成功：

1. 可以直接用 `DISCORD_BOT_TOKEN` 啟動 bot
2. 唔需要 `gateway-proxy`
3. 唔需要 `website` onboarding
4. 可以喺 Discord 同 bot 對住 project 傾計
5. bot 可以喺本機 project 用 backend 執行 coding 任務
6. 用戶可以知道當前用緊邊個 backend
7. 用戶可以切換 backend
8. backend 選擇會保存到本地 state

---

## Phase 1 不做範圍

第一階段 **唔做**：

- Telegram transport
- Slack support
- shared gateway / shared onboarding
- Cloudflare control plane
- screenshare parity
- voice parity
- 所有 backend 完整 feature parity

第一階段重點係：

> **先保住 Discord 自托管主線，同埋 backend abstraction 基礎。**

---

## 核心改動方向

## 1. 建立 Self-Host 啟動模式

### 目標
將現有啟動路徑分成：

- shared/gateway-related legacy path
- self-host direct bot token path

### 實作方向
- 增加 `self-host` mode 或直接將 direct token mode 變成主路徑
- 啟動時讀：
- `DISCORD_BOT_TOKEN`
- local config
- project roots
- backend defaults

### 結果
bot 可以完全唔經 `gateway-proxy` 啟動。

---

## 2. 收窄 shared gateway 相關依賴

### 目標
將以下路徑移出 Phase 1 主線：

- onboarding URL generation
- gateway client provisioning
- shared gateway token flow
- website callback assumptions

### 原則
- 唔一定即刻刪 code
- 但 MVP 主流程唔應再依賴呢啲功能

---

## 3. 保留 Discord UX 主體

### 目標
盡量保留原 repo 已成熟體驗：

- thread/session 概念
- project mapping
- agent reply 流程
- queue / cancel / retry
- message rendering 基本模式

### 原則
- 盡量少改成熟 UX
- 優先改底層依賴與架構抽象

---

## 4. 建立 Backend Runner 抽象

### 目標
由 OpenCode-first 改成 runner-based。

### 建議 interface
每個 runner 至少提供：

- `id`
- `label`
- `isAvailable()`
- `startSession()`
- `sendPrompt()`
- `cancel()`
- `dispose()`
- `streamEvents()`

### 第一階段最低要求
- 將現有 OpenCode 路徑包成 `OpenCodeRunner`
- 先做 `CodexRunner` / `GeminiCliRunner` / `KiroCliRunner` interface skeleton

### 建議策略
第一階段最少應：

- `OpenCodeRunner` 完整可用
- 另外至少一個新增 backend 做 proof-of-concept

我建議第一個新增 backend 用：

- `CodexRunner`

原因：
- CLI workflow 一般比較清楚
- 容易驗證 runner 抽象係咪設計得正確

---

## 5. Backend Configurable / Switchable 設計

呢個係你明確要求，必須納入 Phase 1。

## 設計目標
用戶可以：

- 查看本機 available backends
- 睇到當前 session/backend
- 設定 project 預設 backend
- 切換當前 session backend

## 優先順序
backend 最終選擇建議按：

1. session 指定 backend
2. project 預設 backend
3. machine 全域預設 backend

## 建議資料模型

### Machine config
- `defaultBackend`
- `enabledBackends`

### Project config
- `defaultBackend`

### Session state
- `activeBackend`

## Discord UX 建議
建議至少提供：

- `/backend current`
- `/backend list`
- `/backend set <backend>`
- `/project backend set <backend>`

### 行為要求
- 如果 backend 未安裝 / 不可用，要即時報錯
- 切換成功後，要明確回覆當前 backend 已變更

---

## 6. 本地 DB 變更

### 目標
令本地 state 足夠支撐 backend selection。

### 建議新增保存資料
- machine default backend
- project default backend
- session active backend
- backend availability cache（可選）

### 應避免
- 將 backend 寫死喺 environment variables 而無法動態切換

---

## 7. Backend Availability 檢查

### 目標
bot 要知道某個 backend 喺本機能唔能用。

### 建議檢查內容
- CLI binary 存在
- 需要嘅 config/env 存在
- 可做簡單 health check

### 結果呈現
`/backend list` 時應顯示：

- available
- unavailable
- reason

例如：

- `opencode`: available
- `codex`: unavailable, missing config
- `gemini-cli`: available
- `kiro-cli`: unavailable, binary not found

---

## 8. Config 模型

### 每部機 config 應包括
- `DISCORD_BOT_TOKEN`
- `DEFAULT_BACKEND`
- `ENABLED_BACKENDS`
- `PROJECT_ROOTS`
- backend-specific executable / env config

### 原則
- backend config 應可 per machine 定義
- backend selection 應可 per project / per session 覆蓋

---

## 9. 建議實作順序

## Step 1
抽出 / 確認 direct Discord bot 啟動主線。

## Step 2
將 shared gateway / onboarding 路徑隔離出 MVP 主線。

## Step 3
定義 `BackendRunner` interface。

## Step 4
將現有 OpenCode implementation 包成 `OpenCodeRunner`。

## Step 5
加入 backend selection model：

- machine default
- project default
- session override

## Step 6
在 Discord 加 backend commands。

## Step 7
補至少一個非 OpenCode backend proof-of-concept。

## Step 8
整理 per-machine config 與 deployment instructions。

---

## 驗證清單

Phase 1 完成後，至少要驗證：

1. bot 可直接用 Discord token 啟動
2. project mapping 正常
3. OpenCode 任務正常跑
4. `/backend list` 正常
5. `/backend current` 正常
6. `/backend set codex` 可切換成功或清楚報錯
7. project default backend 會影響新 session
8. 重啟後 state 保留正確

---

## 風險與注意事項

### 1. OpenCode 耦合比表面深
可能有部份 session runtime 直接假設 OpenCode event shape，抽象時要小心。

### 2. Discord UX 可能同 backend event shape 綁死
所以第一個非 OpenCode backend POC 好重要。

### 3. 避免一次過將所有 backend 做實
應先驗證抽象正確，再擴展。

---

## Phase 1 最終產物

第一階段完成後，你應該得到：

1. 一個可 self-host 嘅 Discord bot 版本
2. 唔依賴 shared gateway
3. 支援 configurable backend selection
4. 以 OpenCode 為主，並至少有一個新增 backend POC
5. 可複製到另一部機，只要換 bot token 同本機 config 即可用

---

## 最終結論 ✅

Phase 1 唔係做晒全部，而係先建立一個穩固底座：

- **Discord self-host 可用**
- **shared gateway 被移出主線**
- **backend 可配置、可切換、可持久化**

只要呢個底座做好，之後加 Telegram 同更多 backend 就會容易好多。 
