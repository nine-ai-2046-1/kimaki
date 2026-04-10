---
title: Kimaki Self-Host Component Matrix
description: >-
  Keep/remove/rework matrix for converting the original kimaki repo into a
  self-hosted per-machine edition.
prompt: |
  Build a component matrix showing what parts of the original kimaki repo
  should be kept, removed, de-scoped, or reworked for the self-host target:
  Discord + Telegram bots, local machine backends (OpenCode, Codex, Gemini
  CLI, Kiro CLI), no shared gateway, no multi-tenant control plane. Write in
  Cantonese, GitHub-flavored Markdown, easy to read.
references:
  - @/cli/package.json
  - @/cli/src/discord-bot.ts
  - @/cli/src/opencode.ts
  - @/cli/src/database.ts
  - @/website/package.json
  - @/website/src/index.tsx
  - @/website/src/auth.ts
  - @/discord-slack-bridge/package.json
  - @/traforo/package.json
  - @/docs/architecture/self-host-target-architecture.md
---

# Kimaki Self-Host Component Matrix 🧩

## 目的
呢份 matrix 用嚟回答一個最實際問題：

> 原 repo 入面邊啲要保留、邊啲要砍、邊啲要重構，先最適合做你要嘅 self-host 版本？

---

## 總表

| 組件 | 現有角色 | Self-host 版本決策 | 原因 |
|---|---|---|---|
| `cli/` | Discord bot + session runtime 核心 | **保留並重構** | 呢個係最有價值主體 |
| `cli` Discord flow | 原 repo UX 核心 | **保留** | 你要沿用原 repo 體驗 |
| `opencode` integration | 現有唯一主要 backend | **保留** | 係第一個可用 backend |
| local DB/state | session/project 狀態 | **保留並收窄** | 仍然需要本地 state |
| `website/` | shared onboarding/control plane | **移出主線** | 你唔要 shared gateway / shared onboarding |
| `gateway-proxy/` | shared Discord gateway infra | **移出主線** | 你唔要 shared gateway |
| `discord-slack-bridge/` | Slack support | **暫不保留主線** | 你要 Telegram 唔係 Slack |
| `traforo/` | tunnel / screenshare | **可選保留** | 只係某些功能先需要 |
| `errore/` | error handling foundation | **保留** | 工程基礎件 |
| `opencode-injection-guard/` | OpenCode security plugin | **可保留** | 如果保留 OpenCode workflow 就有價值 |

---

## 詳細決策

## 1. `cli/`
### 決策
**保留並重構**

### 原因
- 真正核心業務邏輯喺度
- Discord bot 行為喺度
- session runtime 喺度
- project mapping、queue、worktree、commands 喺度

### 需要點改
- 將 OpenCode-only 改成 backend pluggable
- 抽出 transport layer
- 加 Telegram 支援
- 移除 / 繞過 shared gateway 路徑

---

## 2. Discord flow / UX
### 決策
**保留**

### 原因
- 你明確想以原 repo UX / flow / feature 為基礎
- 呢部分已經最成熟

### 備註
- Discord 係 self-host 版本第一公民
- Telegram 應該係跟住 Discord workflow 做 parity

---

## 3. OpenCode integration
### 決策
**保留**

### 原因
- 已經可用
- 現有 session/event pipeline 最完整
- 係新架構第一個 backend adapter 參考實作

### 之後角色
- `OpenCodeRunner`

---

## 4. Local DB / state
### 決策
**保留並收窄**

### 保留用途
- session mapping
- project mapping
- backend selection
- worktree / queue metadata
- transport state

### 應移除用途
- shared client onboarding records
- gateway client secret 流程
- multi-tenant control plane data

---

## 5. `website/`
### 決策
**移出主線**

### 原因
- 主要服務 shared onboarding / OAuth / Cloudflare control plane
- 唔符合你「每部機自己 bot token、自托管、自用」模式

### 可保留情況
- 日後如果你想做 web admin panel，先考慮重用部分 code

### 目前建議
- 不納入 MVP

---

## 6. `gateway-proxy/`
### 決策
**移出主線**

### 原因
- 佢係 shared gateway infra
- 你明確講咗唔要 shared gateway

### 重要補充
- 唔代表呢個 code 無價值
- 但對你當前 self-host 目標唔係必需 runtime

### 建議
- 暫時唔納入 self-host 第一階段

---

## 7. `discord-slack-bridge/`
### 決策
**暫不保留主線**

### 原因
- 你要 Telegram，唔係 Slack
- 呢個 bridge 模式可以參考，但唔需要直接帶入 MVP

### 可借鏡價值
- 點樣將非 Discord 平台抽象成 Discord-like behavior

---

## 8. `traforo/`
### 決策
**可選保留**

### 原因
- screenshare / tunnel 係可選功能
- 唔係你最核心 use case

### 建議
- 先唔放入 MVP 核心要求
- 等 Discord + Telegram + 多 backend 穩定之後再加

---

## 9. `errore/`
### 決策
**保留**

### 原因
- 係 repo 工程基礎件
- 已經深度滲透入 CLI code style

### 建議
- 直接沿用

---

## 10. `opencode-injection-guard/`
### 決策
**可保留**

### 原因
- 如果保留 OpenCode backend，佢對 security posture 有幫助

### 但要注意
- judge model 會再讀工具輸出
- 要評估你自己可唔可以接受 private code / output 再送去 judge model

---

## 對 MVP 最重要的組件

MVP 建議只保留 / 建：

1. `cli` 核心
2. Discord transport
3. Telegram transport
4. local DB/state
5. `OpenCodeRunner`
6. `CodexRunner`
7. `GeminiCliRunner`
8. `KiroCliRunner`

---

## 對 MVP 不建議先做的組件

1. `gateway-proxy`
2. `website`
3. shared onboarding
4. Slack bridge
5. screenshare/tunnel 進階功能

---

## 最終結論 ✅

你要嘅 self-host 版本，核心思路應該係：

- **保留 `cli` 同 Discord UX**
- **移除 shared gateway / website / multi-tenant 主線**
- **新增 Telegram**
- **新增多 backend adapter**
- **每部機獨立配置 bot token + local CLI login**

用一句話總結：

> 唔係重建原 repo 全部功能，而係抽出最有價值嘅 bot runtime，砍掉 shared infra，做成一個可複製部署到多部 Ubuntu/mac 嘅 self-host edition。 
