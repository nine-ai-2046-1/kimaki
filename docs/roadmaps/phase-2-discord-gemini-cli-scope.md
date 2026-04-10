---
title: Phase 2 Discord Gemini CLI Scope
description: >-
  Defines the approved product scope for Gemini CLI support in Discord-first
  self-host kimaki, including what should be supported, what should be deferred,
  and why capability boundaries must stay explicit.
prompt: |
  Write a scope document for Phase 2 Gemini CLI support in kimaki. The document
  should assume Discord remains the main transport, Telegram is deferred, and
  Gemini CLI will be added as a practical backend without pretending it has full
  OpenCode parity. Explain what should be supported, what should not be
  supported yet, why those boundaries matter, and how the user should select and
  switch backends. Write in Cantonese, GitHub-flavored Markdown, practical and
  product-focused.
references:
  - @/docs/architecture/backend-execution-abstraction.md
  - @/docs/roadmaps/phase-2-discord-gemini-cli-plan.md
  - @/cli/src/backends/backend-runner.ts
  - @/cli/src/backends/backend-registry.ts
  - @/cli/src/commands/backend.ts
  - @/cli/src/commands/gemini-apikey.ts
  - @/cli/src/session-handler/thread-session-runtime.ts
---

# Phase 2 Discord Gemini CLI Scope

## 目標
Phase 2 唔係要將 Gemini CLI 偽裝成第二個 OpenCode。

真正目標係：

- Discord 仍然係主入口
- 用戶可以明確切換去 Gemini CLI
- Gemini CLI 真係可用於 project thread 文字 workflow
- backend capability boundary 清楚
- 唔好因為技術上勉強做到，就畀 user 一個誤導性 UX

## 產品原則

### 1. 可用比假 parity 重要
如果 Gemini CLI 暫時只適合做文字 prompt/reply backend，就應該清楚表達係 text-mode backend。

唔應該：

- 假裝支援 OpenCode 式工具事件流
- 假裝支援完整 permission UI parity
- 假裝支援完全相同 session model

### 2. backend switching 要易明唔易誤解
用戶切 backend 時，應該知道自己切緊去乜模式。

即：

- `OpenCode` = full coding runtime
- `Gemini CLI` = Discord text-mode backend（Phase 2）

### 3. user mental model 要穩定
backend command 介面可以共用，但 output expectations 要清楚：

- `OpenCode` 有 richer runtime integration
- `Gemini CLI` Phase 2 先做 practical text backend

## Phase 2 應支援的範圍

## A. backend availability check
`/backend list` 應清楚顯示：

- binary 有冇
- config/key 是否齊
- unavailable 原因

Gemini CLI Phase 2 最低可用條件應包括：

- `gemini` binary 可執行
- 存在 `GEMINI_API_KEY` 或 app-specific Gemini API key

## B. backend switching
用戶應可用：

- `/backend current`
- `/backend list`
- `/backend set gemini-cli`
- `/backend set opencode`

Phase 2 建議保留而家 scope：

- machine default
- session override

但回覆文案應加能力提示。

## C. Gemini CLI text-mode session flow
用戶切咗去 Gemini CLI 之後，應可：

1. `/new-session <prompt>`
2. thread follow-up 普通訊息
3. 收到 Gemini CLI 文字回覆

## D. project isolation
即使用 Gemini CLI，仍要保住：

- project directory 隔離
- thread/session 綁定
- backend selection persistence

## E. restart safety
bot restart 後應保住：

- backend selection
- project binding
- thread/session identity

但唔應承諾 Gemini backend 有 OpenCode 同級 native resume。

## Phase 2 不應支援的範圍

## A. 假 streaming parity
如果 Gemini CLI 實際只係 command-wrapper mode，就唔應該偽裝成真正 event stream backend。

可接受：

- typing indicator
- 最終文字結果

唔應一開始承諾：

- incremental tool part rendering
- full run lifecycle parity

## B. 假 tool parity
如果 Gemini CLI 冇穩定 tool invocation / permission request integration，就唔應該沿用 OpenCode 那套 permission button UX。

## C. 假 session resume parity
Gemini CLI 如果冇 native session API，Phase 2 應該明講：

- 係 Discord thread context continuation
- 唔係 backend-native persistent session parity

## D. overly broad fallback behavior
唔應該因為 Gemini unavailable 就 silently fallback 去 OpenCode。

原因：

- 用戶會以為自己喺測 Gemini
- 實際卻跑咗 OpenCode

應 fail loudly，清楚話原因。

## 建議 user flow

## Flow 1: 查 backend
用戶打：

- `/backend list`

bot 顯示：

- OpenCode: available
- Gemini CLI: available / unavailable
- 若 unavailable，附原因

## Flow 2: 切到 Gemini CLI
用戶打：

- `/backend set gemini-cli`

bot 應回：

- backend 已切去 Gemini CLI
- 這是 text-mode backend
- 目前不提供 OpenCode 式 tool/runtime parity

## Flow 3: 新 session
用戶打：

- `/new-session build a todo app`

bot 應回：

- thread 已開
- backend: Gemini CLI
- project: xxx

## Flow 4: follow-up
用戶喺 thread 再講：

- `add dark mode`

bot 應繼續用 Gemini CLI reply。

## 配置策略

## 1. 首選 app-specific Gemini API key
Phase 2 建議支援以下優先順序：

1. app-specific Gemini API key（存在本地 DB）
2. process env `GEMINI_API_KEY`

原因：

- 符合 self-host per-bot mental model
- 多 bot / 多 identity 容易分隔

## 2. 不依賴互動式 Gemini login state 作為唯一條件
因為 headless `gemini -p` 目前實際需要 API key。

所以 Phase 2 不應將「本機曾登入 Gemini CLI」當作可用保證。

## 為什麼這樣設計較合理

## 1. 減少誤導
如果用戶見到 `/backend set gemini-cli`，直覺會以為可以直接做同 OpenCode 一樣嘅事。

Phase 2 必須明確講：

- 可以用
- 但係 text-mode practical backend

## 2. 保持 architecture 誠實
backend abstraction 係真實向前一步，而唔係 fake polymorphism。

## 3. 保持未來可擴展
之後如果 Gemini CLI 真有更穩定 session/tool model，再升級 capability 就得。

## 成功定義
以下條件達成即算 Phase 2 成功：

1. `/backend list` 對 Gemini 判斷準確
2. `/backend set gemini-cli` UX 清楚
3. `/new-session` 真能用 Gemini reply
4. follow-up 可持續
5. 用戶唔會誤以為 Gemini 已達 OpenCode parity

## 結論
Phase 2 最重要唔係「加咗 Gemini 個名」，而係：

> 令 Gemini CLI 成為一個真能用、易理解、邊界清晰嘅 Discord backend。

只要保持 capability honesty，同時做到真正可切換、可回覆、可 follow-up，就係合理而可交付嘅第二階段。 
