---
title: Phase 2 Discord Gemini CLI Implementation Status
description: >-
  Records the current implemented scope, tested paths, configuration flow, and
  known limitations for Gemini CLI support in Discord-first self-host kimaki.
prompt: |
  Write an implementation status document for Phase 2 Gemini CLI support in
  kimaki. Explain what is implemented, how users configure it, how backend
  switching works, what was tested, and what capability boundaries remain.
  Write in Cantonese, GitHub-flavored Markdown, practical and review-friendly.
references:
  - @/docs/roadmaps/phase-2-discord-gemini-cli-scope.md
  - @/cli/src/backends/gemini-cli-runner.ts
  - @/cli/src/backends/backend-registry.ts
  - @/cli/src/commands/backend.ts
  - @/cli/src/commands/gemini-apikey.ts
  - @/cli/src/session-handler/thread-session-runtime.ts
---

# Phase 2 Discord Gemini CLI Implementation Status

## 已實作範圍

### 1. Gemini CLI backend availability
而家 `/backend list` 已經會對 `Gemini CLI` 做真正 availability check，而唔再只係 placeholder。

檢查項包括：

- `gemini` binary 是否存在
- app-specific Gemini API key 是否存在
- 或 process env `GEMINI_API_KEY` 是否存在

### 2. backend switching UX
而家 `/backend set gemini-cli` 已可用。

回覆文案會清楚講明：

- Gemini CLI 係 **text-mode backend**
- 暫時唔提供 full OpenCode tool/runtime parity

### 3. Gemini executor
Gemini CLI 已接入 backend execution abstraction。

目前支援：

- availability
- session handle creation
- ensure session
- send prompt

### 4. Discord runtime routing
當前 thread backend 係 `gemini-cli` 時：

- 普通訊息會改走 kimaki local queue
- 唔再走 OpenCode internal queue
- dispatch 時會調用 Gemini executor
- 最終以 plain text reply 回 Discord

### 5. follow-up continuity
Gemini Phase 2 雖然冇 native session parity，但已做咗基本 thread continuity：

- dispatch 前會讀 thread recent messages
- 組成簡單 transcript
- 將 transcript + latest user message 一齊送入 Gemini CLI

## 用戶如何設定

## 方案 A: app-specific key
最推薦。

用 Discord command：

- `/transcription-key`

輸入 Gemini API key 後，會存入 bot-local SQLite。

目前呢條 key 除咗 voice transcription 之外，亦會作為 Gemini CLI backend key source。

## 方案 B: process env
如果你偏向 machine-wide config，可以設：

```env
GEMINI_API_KEY=...
```

## 用戶如何使用

1. 設好 Gemini key
2. `/backend list`
3. 確認 `Gemini CLI: available`
4. `/backend set gemini-cli`
5. `/new-session <prompt>`
6. 喺 thread 內 follow-up

## 已測試內容

### 自動化測試
已跑 targeted tests：

- `src/backends/backend-registry.test.ts`
- `src/backends/gemini-cli-runner.test.ts`
- `src/discord-utils.test.ts`
- `src/cli-parsing.test.ts`

結果：

- 全部通過

### TypeScript 驗證
已跑：

- `pnpm tsc`

結果：

- 今次新增改動無新 type error
- 仍只剩 repo 既有 `discord-digital-twin` 噪音

## 目前刻意未做

### 1. full streaming parity
Gemini Phase 2 目前唔做 OpenCode 式 event stream rendering。

### 2. full tool parity
Gemini Phase 2 唔做 OpenCode 式 tool event / permission button UX。

### 3. backend-native resume parity
而家係 thread transcript continuation，唔係 Gemini native session resume。

### 4. manual smoke test
喺目前工作環境中，尚未能做真正 headless Gemini end-to-end smoke test，因為當前 runtime env 未提供可直接使用嘅 `GEMINI_API_KEY`。

即：

- code path 已落地
- automated tests 已過
- 真機 backend invocation 仍需喺有可用 Gemini API key 嘅 bot env 下完成最終驗證

## 為什麼這樣算合理 Phase 2
因為今階段目標係：

- 令 user 真能切去 Gemini
- 令 Discord thread 真能收到 Gemini reply
- 但同時保持 capability honesty

所以而家係：

- 可用 backend
- 清楚邊界
- 適合繼續做下一輪實機驗證與 polish

## 建議 review 重點
你返嚟 review Phase 2 時，建議特別睇：

1. `/backend list` 同 `/backend set` 文案係咪夠清楚
2. app-specific Gemini key reuse `/transcription-key` 呢個 UX 你認唔認同
3. thread transcript continuation 呢個 compromise 你可唔可以接受
4. Phase 2 是否應維持 text-mode boundary，定進一步追 richer parity
