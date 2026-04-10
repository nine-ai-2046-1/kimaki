---
title: Backend Execution Abstraction
description: >-
  Defines how kimaki should decouple Discord session runtime from OpenCode-
  specific execution so new backends like Gemini CLI can be added cleanly.
prompt: |
  Based on the current kimaki self-host work, write a practical architecture doc
  for backend execution abstraction. Explain the current OpenCode coupling,
  why the existing backend registry is not enough, what abstractions should be
  added next, and how Gemini CLI can fit into the new model. Write in
  Cantonese, GitHub-flavored Markdown, practical and implementation-focused.
references:
  - @/cli/src/backends/backend-runner.ts
  - @/cli/src/backends/backend-registry.ts
  - @/cli/src/backends/open-code-runner.ts
  - @/cli/src/commands/backend.ts
  - @/cli/src/commands/session.ts
  - @/cli/src/session-handler/thread-session-runtime.ts
  - @/docs/architecture/self-host-target-architecture.md
  - @/docs/roadmaps/self-host-discord-telegram-multicli-roadmap.md
---

# Backend Execution Abstraction

## 目的
而家 `kimaki` 已經有 backend label 同 persistence 概念，但仲未有真正 backend execution abstraction。

即係話：

- 可以記住當前 backend 係 `opencode` / `gemini_cli` / `codex`
- 可以喺 `/backend` command 入面顯示 available / unavailable
- 但真正 session 執行層仍然係 **直接寫死 OpenCode**

如果唔先補呢層抽象，之後加 Gemini CLI 會變成喺 `ThreadSessionRuntime` 四圍插 `if backend === 'gemini_cli'`，最終變成難維護嘅分支森林。

## 現況問題

## 1. backend registry 目前只係 availability registry
`cli/src/backends/backend-runner.ts` 目前只有：

- `id`
- `label`
- `isAvailable()`

呢個唔足夠支援真正 backend execution，因為冇定義：

- 點樣建立 session
- 點樣送 prompt
- 點樣 abort / resume
- 點樣將 backend output 轉成 kimaki 可用事件

## 2. `ThreadSessionRuntime` 直接依賴 OpenCode SDK
現時最重耦合位喺：

- `initializeOpencodeForDirectory(...)`
- `getOpencodeClient(...)`
- `session.create(...)`
- `session.get(...)`
- `session.promptAsync(...)`
- `provider.list(...)`
- event subscription / hydration / footer 資訊來源

即係目前 runtime 並唔係 backend-neutral。

## 3. backend persistence 先於 backend execution 落地
呢個次序本身冇問題，因為 Phase 1 目標係先定 backend mental model。

但去到 Phase 2，如果想真加 Gemini CLI，就需要由：

- backend concept

升級到：

- backend execution contract

## 抽象目標

backend execution abstraction 嘅目標唔係完全抹平所有 backend 差異，而係定義：

> Discord runtime 最少需要 backend 提供邊啲能力，先可以支撐統一 session workflow。

## 最低要支援嘅能力

### 1. availability
- backend 喺本機有冇安裝
- 有冇登入 / credentials
- 有冇缺必要 binary / env

### 2. session lifecycle
- create session
- get existing session handle
- continue session
- abort session

### 3. prompt dispatch
- 將 user prompt 送入 backend
- 支援 project directory / working directory
- 支援 agent/model/variant（如可支援）

### 4. output events
- text output
- progress / state changes
- question / permission requests（可選能力）
- completion
- error

### 5. persistence identity
- backend session id 點樣對應到 kimaki session row
- 如果 backend 冇原生 session id，kimaki 自己點包裝

## 建議抽象層

## A. BackendExecutor
新增真正 execution interface，例如概念上包含：

- `isAvailable()`
- `createSession()`
- `sendPrompt()`
- `abortSession()`
- `resumeSession()`
- `subscribe()` 或 event adapter

唔一定要一開始就完全定死所有 method，但至少要夠 OpenCode 同 Gemini CLI 第一版共用。

## B. BackendSessionHandle
每個 backend 建 session 後，應回傳一個統一 session handle，包含：

- kimaki backend id
- backend-native session id（如果有）
- project directory
- capability flags

例如：

- OpenCode 有原生 `session.id`
- Gemini CLI command-wrapper mode 可能冇原生 session id，咁就由 kimaki 生成 conversation id

## C. Backend Event Model
要定義 backend-neutral event model，令 Discord transport 唔需要直接理解 OpenCode stream shape。

建議最低事件種類：

- `text-delta`
- `text-complete`
- `status`
- `error`
- `question`
- `completed`

OpenCode runner 要做一層 adapter，將目前 stream event 轉做呢個統一模型。

Gemini CLI runner 亦要將 stdout / line stream / final result 轉做同一模型。

## D. Capability Flags
唔同 backend 能力唔一樣，所以 abstraction 應接受能力差異，而唔係假裝全部一樣。

例如：

- `supportsStreaming`
- `supportsAbort`
- `supportsPermissionRequests`
- `supportsModelSelection`
- `supportsSessionResume`

Discord UX 可以根據 capability 做降級。

## OpenCode 應點遷入新抽象

第一步唔應重寫 OpenCode 行為，而係包一層 adapter。

即：

- 保留現有 OpenCode runtime 行為
- 將 OpenCode SDK 調用集中入 `OpenCodeExecutor`
- 將 event subscription 轉成 backend-neutral event stream

咁做有兩個好處：

1. 風險較低
2. 可以用 OpenCode 做 reference implementation

## Gemini CLI 應點接入

## Phase 2 建議模式：command-wrapper mode
Gemini CLI 第一版建議唔追求 long-lived native session，而係：

- 每次 prompt 用 CLI command call 一次 `gemini`
- stdout/stderr 轉成 backend events
- session continuity 先由 kimaki 自己管理 conversation transcript / context

原因：

- 實作簡單
- 可較快驗證 abstraction 正唔正
- 唔使一開始假設 Gemini CLI 有同 OpenCode 一樣嘅 event stream / server mode

## Gemini CLI 第一版 capability 建議

- `supportsStreaming`: 視 CLI 能否逐步輸出，否則可先 false
- `supportsAbort`: 可選，先唔做都得
- `supportsPermissionRequests`: false
- `supportsSessionResume`: 由 kimaki 自己做簡單 transcript continuation

## 對 Discord runtime 代表咩

抽象後，Discord runtime 應由「直接叫 OpenCode SDK」改成：

- resolve selected backend
- 從 registry 取得 executor
- 將 Discord message 轉成 backend input
- 收 backend-neutral events
- render 去 Discord thread

即 Discord 要變返 transport / renderer，而唔係 OpenCode client coordinator。

## 不應一次做晒的事

以下唔建議一次過做：

- 一口氣將所有 backend 全部接入
- 一開始就追 OpenCode/Gemini/Codex full parity
- 一開始就抽 Telegram transport 同 backend abstraction 一齊做

正確次序係：

1. 抽 execution contract
2. OpenCode 遷入 contract
3. 接 Gemini CLI POC
4. 驗證 Discord-first 多 backend workflow
5. 之後先補 Telegram

## 最小實作邊界

第一階段抽象，只要做到以下已經足夠：

1. `/new-session` 可以根據 backend 揀 executor
2. thread follow-up 可以根據 backend dispatch
3. Discord 可以 render backend output
4. OpenCode 照常工作
5. Gemini CLI 可做最基本 prompt/reply

## 結論
backend execution abstraction 係而家最應該做嘅 Phase 2 前置工作。

因為目前已有 backend persistence，但冇 backend execution；如果跳過呢步直接接 Gemini CLI，只會將 OpenCode 專用邏輯擴散去更多檔案。

最合理做法係：

> 先將 OpenCode 變成第一個真正 executor，再用同一個 contract 接 Gemini CLI。
