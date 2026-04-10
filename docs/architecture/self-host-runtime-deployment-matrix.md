---
title: Kimaki Self-Host Runtime Deployment Matrix
description: >-
  Runtime matrix for the intended self-host use case: per-machine Discord and
  Telegram bots with local coding backends and no shared gateway.
prompt: |
  Based on the reviewed kimaki repo and the clarified target use case, write a
  runtime deployment matrix that explains what must run, what is optional, and
  what can be removed for a self-host setup. The target setup is: each machine
  has its own Discord and Telegram bot tokens, local project path, and locally
  installed coding CLIs (OpenCode, Codex, Gemini CLI, Kiro CLI). No shared
  gateway, no multi-tenant serving. Write in Cantonese, GitHub-flavored
  Markdown, easy to read and practical.
references:
  - @/docs/architecture/self-host-target-architecture.md
  - @/docs/architecture/self-host-component-matrix.md
  - @/docs/roadmaps/self-host-discord-telegram-multicli-roadmap.md
  - @/cli/src/cli.ts
  - @/cli/src/discord-bot.ts
  - @/cli/src/database.ts
  - @/website/src/index.tsx
  - @/gateway-proxy/src/main.rs
  - @/traforo/src/client.ts
---

# Kimaki Self-Host Runtime Deployment Matrix 🧭

## 目的
呢份文件唔係講開發，而係講：

> 為咗達成你想要嘅 self-host use case，實際上邊啲程式一定要跑，邊啲唔使跑，邊啲只係可選功能？

你嘅目標 use case 係：

- 每部機各自有 Discord bot
- 每部機各自有 Telegram bot
- 每部機本地安裝並登入 coding CLI
- 每部機對住自己 project 做 coding
- 唔用 shared gateway
- 唔服務其他用戶
- 只求自建、自托管、可複製部署

---

## 一句話答案

對你嚟講，**真正 production 必需**嘅 runtime 其實應該只係：

1. 一個 self-host bot app
2. 一個 local state DB
3. 本機已安裝並登入嘅 backend CLI

其餘：

- `gateway-proxy`：唔使
- `website`：唔使
- shared onboarding：唔使
- Slack bridge：唔使

---

## Runtime Matrix

| 組件 | 係咪要跑 | 角色 | mac | Ubuntu | 備註 |
|---|---|---|---|---|---|
| Self-host bot core | **必需** | 主 bot app，處理 Discord/Telegram、session、backend routing | 要 | 要 | 由現有 `cli` 改造而來 |
| Local DB / state | **必需** | 保存 session/project/backend mapping | 要 | 要 | 本地 SQLite 最合適 |
| Discord bot token | **必需** | Discord transport 身份 | 要 | 要 | 每部機一個 bot |
| Telegram bot token | **必需** | Telegram transport 身份 | 要 | 要 | 每部機一個 bot |
| OpenCode CLI | **必需或可選** | backend 之一 | 視 backend 選擇 | 視 backend 選擇 | 如果該機要用 OpenCode 就要 |
| Codex CLI | **必需或可選** | backend 之一 | 視 backend 選擇 | 視 backend 選擇 | 同上 |
| Gemini CLI | **必需或可選** | backend 之一 | 視 backend 選擇 | 視 backend 選擇 | 同上 |
| Kiro CLI | **必需或可選** | backend 之一 | 視 backend 選擇 | 視 backend 選擇 | 同上 |
| `gateway-proxy` | **唔需要** | shared gateway infra | 唔使 | 唔使 | 你已明確唔用 shared gateway |
| `website` | **唔需要** | onboarding/control plane | 唔使 | 唔使 | 你唔要 shared onboarding |
| `discord-slack-bridge` | **唔需要** | Slack 支援 | 唔使 | 唔使 | 你要 Telegram 唔係 Slack |
| `traforo` | 可選 | tunnel/screenshare | 可選 | 可選 | 非核心 use case |
| Cloudflare Worker / DO | 唔需要作為核心 | website/traforo backend infra | 可選 | 可選 | 只係可選進階功能先要 |

---

## 你最少要跑咩先 work

## 最小可用版本
如果你只係要：

- 同 Discord / Telegram bot 傾 project
- bot 用 backend CLI 幫你 code

最少需要：

1. `kimaki-selfhost` bot app
2. local SQLite
3. Discord bot token
4. Telegram bot token
5. 至少一個 backend CLI
6. project path config

### 例子
一部機可以只裝：

- self-host bot app
- `opencode`
- `codex`

另一部機可以裝：

- self-host bot app
- `gemini-cli`
- `kiro-cli`

每部機 backend 可以唔完全相同，只要 bot app 知道本機有咩 backend 可用。

---

## 實際上每部機要有咩

## 必需本機資源

### 1. bot app
即係你最終 build 出嚟嘅 self-host 主程式。

### 2. local config
建議每部機有一份 config，例如：

- `DISCORD_BOT_TOKEN`
- `TELEGRAM_BOT_TOKEN`
- `PROJECT_ROOTS`
- `DEFAULT_BACKEND`
- `ENABLED_BACKENDS`

### 3. local DB
建議：

- SQLite

保存：

- project mapping
- chat/session mapping
- selected backend
- runtime state

### 4. coding CLI login state
例如：

- `opencode login`
- `codex` Azure/OpenAI config
- `gemini-cli` auth
- `kiro-cli` auth

### 5. project checkout
每部機有自己 local repo / project path。

---

## 邊啲唔應該再係必需 runtime

## 1. `gateway-proxy`
點解唔使：

- 你唔做 shared bot infra
- 每部機自己 bot token
- 直接連 Discord API 就夠

## 2. `website`
點解唔使：

- 你唔要 shared onboarding
- 唔需要 browser callback flow 去 provision 其他 client

## 3. shared DB / KV / control plane
點解唔使：

- 你係單租戶 per-machine
- local state 已足夠

---

## mac 與 Ubuntu 上要達成嘅實際效果

## mac
應支援：

- 啟動 self-host bot app
- 連 Discord bot
- 連 Telegram bot
- 使用本機 backend CLI
- 對本機 project 做 coding

## Ubuntu
應支援：

- 啟動 self-host bot app
- 連 Discord bot
- 連 Telegram bot
- 使用本機 backend CLI
- 對本機 project 做 coding

### 重點
你要嘅係：

> **同一套 self-host app 可以喺 mac 同 Ubuntu 跑，本機 bot token 同 backend login 各自獨立。**

呢個目標完全合理。

---

## 你應該避免嘅誤區

### 誤區 1
以為要成個原 repo 所有服務都跑先做到效果。

其實唔係。

對你而家個 use case，原 repo 最複雜嗰幾塊：

- shared gateway
- website onboarding
- shared control plane

都可以唔要。

### 誤區 2
以為每部機都要跑所有 backend。

其實都唔一定。

可以每部機只裝：

- 你想用嘅 backend
- bot app 只 expose 本機 available backend

### 誤區 3
以為 Telegram 要 1:1 複製 Discord UI。

其實你應該追求：

- 同一 workflow
- 類似功能
- 類似操作習慣

唔係逐個 UI 細節一樣。

---

## 建議部署模式

### 每部機一份獨立部署
每部 Ubuntu/mac：

1. 安裝 bot app
2. 配 Discord/Telegram token
3. 安裝並登入可用 backend CLI
4. 指向本機 project path
5. 啟動 app

### 你獲得嘅效果
- 每部機都係獨立 coding node
- 你可以對應唔同 project / 唔同工作環境
- 唔需要 shared infra
- 容易複製部署

---

## MVP Runtime 定義

如果要先做最小可用版本，建議 runtime 僅包括：

1. self-host bot core
2. Discord transport
3. local DB
4. OpenCode backend

### 第二步再加
1. Codex backend
2. Gemini CLI backend
3. Kiro CLI backend

### 第三步再加
1. Telegram transport

如果你要快啲落地，其實仲可以：

- 先 Discord + OpenCode
- 再逐步加其他 backend 同 Telegram

---

## 最終結論 ✅

對你嘅 use case，production runtime 應該大幅收窄成：

- **一個 self-host bot app**
- **一個 local DB**
- **每部機自己嘅 Discord/Telegram token**
- **每部機自己已登入嘅 coding CLI backend**

唔需要再將：

- `gateway-proxy`
- `website`
- shared onboarding/control plane

當成必需 runtime。

用一句話總結：

> 你要嘅唔係重建成個原 repo 部署，而係抽出佢最值錢嘅 bot runtime，做成一個可喺每部 Ubuntu/mac 獨立運行嘅 self-host coding bot。 
