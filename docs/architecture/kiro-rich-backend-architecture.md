---
title: Kiro Rich Backend Architecture
description: >-
  Defines how Kiro CLI should be integrated as a first-class rich backend in
  self-host kimaki, alongside OpenCode, instead of being treated as a simple
  text-only fallback backend.
prompt: |
  Write a practical architecture document for integrating Kiro CLI as a rich
  backend in kimaki. The document should assume OpenCode is already the main
  rich backend, Gemini CLI exists as a lighter text-mode backend, and Kiro CLI
  should be treated as another first-class backend with richer capabilities.
  Explain why Kiro should not be reduced to a simple text wrapper, what parts of
  the executor contract need to expand, and how Discord-first session identity,
  history, resume, model, agent, and tool trust should be handled. Write in
  Cantonese, GitHub-flavored Markdown, practical and implementation-focused.
references:
  - @/docs/architecture/backend-execution-abstraction.md
  - @/docs/roadmaps/phase-2-discord-gemini-cli-plan.md
  - @/cli/src/backends/backend-runner.ts
  - @/cli/src/backends/open-code-runner.ts
  - @/cli/src/backends/gemini-cli-runner.ts
  - @/cli/src/session-handler/thread-session-runtime.ts
---

# Kiro Rich Backend Architecture

## 目標
Kiro CLI 唔應被視為第二個 Gemini text wrapper。

而家已知 Kiro CLI 具備：

- non-interactive chat
- session resume
- session listing
- agent selection
- model selection
- tool trust policy

所以對 kimaki 而言，Kiro 應定位為：

> 與 OpenCode 並列的 first-class rich backend。

## 為什麼 Kiro 不應只做 text wrapper

如果將 Kiro 簡化為「每次 prompt call 一次 CLI，回一段 text」：

- 會浪費它已經有的 session 能力
- 會浪費 agent/model/trust policy 控制面
- 會令用戶誤以為 Kiro 只有 Gemini 級別能力

而現有 Kiro CLI 已經足夠支持更豐富的 integration：

- `chat --resume`
- `chat --resume-id`
- `chat --list-sessions`
- `chat --agent`
- `chat --model`
- `chat --trust-all-tools`
- `chat --trust-tools`

## 產品定位

### OpenCode
- rich backend
- event-stream native path
- current primary backend

### Gemini CLI
- text-mode backend
- lighter / cheaper / simpler

### Kiro CLI
- rich backend
- session-aware CLI backend
- agent/model/trust aware backend

## 架構目標
backend abstraction 之後應分出兩類 rich backend：

1. **native rich backend**
   例如 OpenCode，有 event stream / session API / richer runtime hooks

2. **CLI rich backend**
   例如 Kiro，有 session-aware CLI、model/agent/trust controls，但唔一定有 OpenCode 式 event stream

Kiro 屬於第二類。

## Executor Contract 需要擴充的地方

## 1. session identity
目前 executor contract 已有 `ensureSession()`，但對 Kiro 仍未夠。

Kiro 需要：

- create session handle
- restore session handle from persisted backend-native id
- list sessions for directory
- resume by backend-native session id

## 2. backend-native session metadata
Kiro 可能有自己的 session id。kimaki 應保留：

- kimaki session id
- backend-native session id

呢樣對 restart/resume 非常重要。

## 3. model and agent control
Kiro rich backend 應支援：

- list available models
- set model for session prompt
- list available agents
- set agent for session / prompt

Phase 1 skeleton 可以先唔接 full UI，但 contract 需要預留。

## 4. tool trust policy
Kiro 已有：

- `--trust-all-tools`
- `--trust-tools`

kimaki 之後可以將 Discord permission model 與 backend trust policy 做合理映射。

即使第一刀未 fully expose，contract 都應預留 capability。

## 5. output model
Kiro 可能未有 OpenCode 式細粒度 event stream。

所以 rich backend 唔等於一定要 event stream parity。

Kiro rich backend 可接受：

- session-aware CLI execution
- richer resume/model/agent/trust controls
- output 暫時仍以 text chunks 或 final text 為主

## Discord-first Session Model

## 1. thread identity remains kimaki-owned
Discord thread 仍然係 kimaki 的主 identity root。

即：

- thread id -> kimaki session id
- kimaki session id -> backend id + backend-native session id

## 2. history and continuity
對 Kiro，continuity 應優先嘗試 backend-native resume，而唔係只靠 transcript replay。

fallback 才用 transcript reconstruction。

## 3. restart behavior
bot restart 後，若 thread 對應 session backend 係 Kiro：

- 先嘗試讀 persisted backend-native session id
- 若存在則 resume
- 若失敗再 fallback transcript continuation

## 建議 Capability Model

Kiro 建議 capabilities：

- `supportsStreaming`: false or partial
- `supportsAbort`: maybe false initially
- `supportsSessionResume`: true
- `supportsModelSelection`: true
- `supportsPermissionRequests`: false initially

之後如果確認 CLI 行為更豐富，再升級。

## 建議實作階段

## Step 1: Kiro availability and auth checks
- binary exists
- login state valid (`whoami`)
- optional model list health check

## Step 2: Kiro rich session handle
- create handle
- persist backend-native session id
- support resume/list sessions

## Step 3: Kiro prompt execution
- non-interactive chat invocation
- resume with session id when possible
- support agent/model/trust flags

## Step 4: Discord integration
- `/backend list`
- `/backend set kiro-cli`
- `/new-session`
- follow-up in thread
- current backend reporting

## Step 5: richer user controls
- agent exposure
- model exposure
- trust policy mapping

## 不應一開始做的事
- pretend full OpenCode event parity
- force tool permission parity before understanding Kiro runtime semantics
- tie Kiro too tightly to OpenCode-specific runtime assumptions

## 結論
Kiro CLI 已具備成為 rich backend 的足夠條件。

所以正確方向唔係將佢做成 Gemini 式 text fallback，而係：

> 讓 Kiro 成為第二個 first-class backend，與 OpenCode 並列，但保留其 CLI-native 特性與限制。
