---
title: Self-Host Binary Runbook And Env Spec
description: >-
  Defines the expected self-host binary experience, .env contract, and runtime
  usage flow for the self-host kimaki edition.
prompt: |
  Based on the clarified self-host target, write a practical runbook that
  defines what the final deliverable should feel like to the user. The goal is
  a runnable self-host bot app that reads .env, uses per-machine Discord and
  Telegram bot tokens, and invokes locally installed coding CLIs such as
  OpenCode, Codex, Gemini CLI, and Kiro CLI. Include Phase 1 MVP expectations,
  target end-state, and a concrete .env spec. Write in Cantonese, GitHub-
  flavored Markdown, practical and easy to read.
references:
  - @/docs/architecture/self-host-target-architecture.md
  - @/docs/architecture/self-host-component-matrix.md
  - @/docs/architecture/self-host-runtime-deployment-matrix.md
  - @/docs/roadmaps/self-host-discord-telegram-multicli-roadmap.md
  - @/docs/roadmaps/phase-1-discord-selfhost-mvp-plan.md
---

# Self-Host Binary Runbook And Env Spec 📦

## 目的
呢份文件唔係講 code 架構，而係講你最關心嘅交付形式：

> 最終我可唔可以拎到一個 bot app / bin app，放去另一部 Ubuntu 或 mac，填 `.env`，準備好本機 coding CLI，就可以跑？

答案係：

**可以，呢個應該就係目標交付形式。**

---

## 最終交付物應該係乜

## 目標交付物
應該係一個可執行嘅 self-host bot app，例如：

```bash
kimaki-selfhost
```

或者：

```bash
kimaki-selfhost start
```

佢啟動時會：

1. 讀 `.env`
2. 讀本機 config
3. 讀 Discord / Telegram bot token
4. 檢查本機可用 backend
5. 啟動 bot
6. 對接本機 project path
7. 喺 Discord / Telegram 為你執行 coding workflow

---

## 你作為使用者，應該點用

## 你預期嘅操作流程

### Step 1
喺本機安裝 self-host bot app

### Step 2
準備 `.env`

### Step 3
安裝並登入你要用嘅 backend CLI

例如：

- `opencode`
- `codex`
- `gemini-cli`
- `kiro-cli`

### Step 4
配置 project path

### Step 5
啟動：

```bash
kimaki-selfhost
```

### Step 6
去 Discord / Telegram 同 bot 傾 project

### Step 7
如果要轉 backend，可以用 command 改

---

## 你部機要預先有咩

## 必需

### 1. bot token
- Discord bot token
- Telegram bot token

### 2. backend CLI
本機已安裝並登入你要用嘅 backend。

### 3. project checkout
本機有你要做嘢嘅 repo / project。

### 4. self-host app
build 完或者發行出嚟嘅 bot app。

---

## `.env` 建議規格

以下係建議基本規格，之後可以再收窄或補充。

## 必要欄位

```bash
DISCORD_BOT_TOKEN=
DEFAULT_BACKEND=opencode
ENABLED_BACKENDS=opencode,codex,gemini-cli,kiro-cli
PROJECT_ROOTS=/Users/you/projects
DATA_DIR=
```

### 說明
- `DISCORD_BOT_TOKEN`
  - 你自己建立嘅 Discord bot token
- `DEFAULT_BACKEND`
  - 本機預設 backend
- `ENABLED_BACKENDS`
  - 本機允許使用邊啲 backend
- `PROJECT_ROOTS`
  - bot 可操作嘅 project 根目錄
- `DATA_DIR`
  - local state / DB 存放位置

## Telegram 相關

```bash
TELEGRAM_BOT_TOKEN=
```

### 說明
- Phase 1 MVP 可以暫時唔填
- Telegram transport 完成後就變成可用

## Backend binary 設定

```bash
OPENCODE_BIN=opencode
CODEX_BIN=codex
GEMINI_CLI_BIN=gemini
KIRO_CLI_BIN=kiro
```

### 說明
- 如果 binary 喺 PATH，通常唔需要改
- 如果有自訂路徑，可以填絕對路徑

## Backend 可用性相關

```bash
OPENCODE_ENABLED=1
CODEX_ENABLED=1
GEMINI_CLI_ENABLED=1
KIRO_CLI_ENABLED=1
```

### 說明
- 可選
- 如果你唔想 expose 某些 backend 畀 bot，就可以關掉

## 建議延伸欄位

```bash
LOG_LEVEL=info
DEFAULT_PROJECT=
```

---

## Phase 1 MVP 你應該 expect 咩

Phase 1 唔係最終完整版，所以要有合理預期。

## Phase 1 應該做到

1. 有一個可執行 bot app
2. 讀 `.env`
3. 用 `DISCORD_BOT_TOKEN` 啟動 bot
4. 對接本機 project
5. 用 OpenCode 跑通主要 workflow
6. backend 可以配置 / 切換
7. backend 狀態可查

## Phase 1 未必即刻有

1. Telegram
2. 4 個 backend 全部完整可用
3. screenshare parity
4. voice parity
5. 所有原 repo 命令完全對齊

### 即係你喺 Phase 1 應該 expect：

> 先有一個 Discord self-host bot，可讀 `.env`、可對 project 做 coding、可切 backend、可複製到第二部機。

---

## 最終版本你應該 expect 咩

最終版本應該做到：

1. `kimaki-selfhost` 可直接啟動
2. 讀 `.env`
3. 用本機 Discord bot token
4. 用本機 Telegram bot token
5. 根據本機已安裝 backend 自動列出可用 backend
6. 喺 Discord / Telegram 同 bot 傾 project
7. bot 喺本機 repo 執行 coding 任務
8. backend 可 project-level / session-level 切換

---

## 你啱啱講嘅「然後 xxxxx」其實會係咩

如果用戶視角去講，完整流程應該會係：

1. run `kimaki-selfhost`
2. bot 啟動
3. 你去 Discord 同 bot 傾
4. bot 知道本機 project path
5. bot 根據設定用 backend 去做 coding
6. 如果想轉 backend：
- `/backend list`
- `/backend current`
- `/backend set codex`
7. 再繼續叫佢改 code / 睇 code / 跑工作流

即係你嗰個 `xxxxx`，本質上就係：

> bot 根據本機 project 同本機已登入 CLI，開始幫你做 coding workflow。

---

## 每部機應該點複製部署

## 目標方式
理想情況下，每部機只要：

1. 複製 app
2. 複製或重建 `.env`
3. 安裝 backend CLI
4. 登入 backend CLI
5. 指向本機 project
6. run app

就可以開始用。

### 即係你要嘅體驗
- 唔靠 shared gateway
- 唔靠 shared onboarding
- 唔靠 central control plane
- 每部機完全自主

---

## Backend 切換應該點俾用戶感知

bot 應該清晰話畀你知：

- 當前 backend 係邊個
- 本機 available backends 有邊啲
- 點切換
- 邊個 backend 不可用同原因

例如：

```text
Available backends:
- opencode (available)
- codex (available)
- gemini-cli (missing login)
- kiro-cli (binary not found)
```

---

## 最終結論 ✅

你可以合理 expect 嘅最終交付物係：

- **一個可執行嘅 self-host bot app / bin app**
- **啟動時會讀 `.env`**
- **使用你每部機自己嘅 Discord / Telegram bot token**
- **使用你本機已安裝並登入嘅 coding CLI backend**
- **可以喺 Discord / Telegram 直接幫你對 project 做 coding workflow**

如果用一句最貼地嘅話總結：

> 你將 app 複製去另一部 Ubuntu 或 mac，改 `.env`、裝好 backend CLI、登入好，就應該可以直接 run。 
