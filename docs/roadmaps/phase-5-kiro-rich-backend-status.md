---
title: Phase 5 Kiro Rich Backend Status
description: >-
  Records the current implementation status for Kiro CLI as a rich backend in
  self-host kimaki, including what is already integrated, what remains phase 1,
  and what still needs richer follow-up work.
prompt: |
  Write a status document for the current Kiro CLI backend work in kimaki. The
  document should explain that Kiro is being treated as a rich backend alongside
  OpenCode, but the current implementation is still in phase 1 Discord routing.
  Explain what is implemented, what is intentionally not done yet, and what the
  next implementation steps are. Write in Cantonese, GitHub-flavored Markdown,
  practical and review-friendly.
references:
  - @/docs/architecture/kiro-rich-backend-architecture.md
  - @/cli/src/backends/kiro-cli-runner.ts
  - @/cli/src/backends/backend-runner.ts
  - @/cli/src/backends/backend-registry.ts
  - @/cli/src/session-handler/thread-session-runtime.ts
  - @/cli/src/commands/backend.ts
---

# Phase 5 Kiro Rich Backend Status

## 定位
Kiro 並唔係以 Gemini 式 text fallback backend 定位。

而家定位係：

- 與 OpenCode 並列的 rich backend
- 但目前實作只去到 Discord phase 1 routing

即係：

- backend contract 已預留 richer capability
- Kiro executor skeleton 已存在
- Discord thread 已可走 Kiro phase 1 text reply path
- richer resume / model / agent / trust integration 尚未完成

## 已實作

### 1. Kiro executor skeleton
已新增 `kiro-cli-runner.ts`，包括：

- binary check
- auth check (`kiro-cli whoami`)
- `ensureSession()`
- `sendPrompt()`
- `listModels()`
- `listAgents()`

### 2. backend capability model 擴充
backend contract 已新增 richer capability support：

- `supportsAgentSelection`
- `supportsToolTrustPolicy`
- `backendSessionId`
- optional `listModels()` / `listAgents()` hooks

### 3. registry integration
Kiro 已不再係 placeholder。

`/backend list` 會對 Kiro 做真正 availability / auth check。

### 4. Discord phase 1 routing
Kiro 已接入目前 text-mode local queue path：

- `/backend set kiro-cli`
- `/new-session`
- thread follow-up

目前會透過 non-interactive Kiro CLI execution 回覆 Discord。

### 5. UX 文案
backend command 已清楚標示：

- `Kiro CLI: available (rich CLI backend)`
- 當前仍屬 phase 1 Discord text reply path

## 已測試

已跑 targeted tests：

- `src/backends/kiro-cli-runner.test.ts`
- `src/backends/gemini-cli-runner.test.ts`
- `src/backends/backend-registry.test.ts`
- `src/commands/backend.test.ts`
- `src/discord-utils.test.ts`
- `src/cli-parsing.test.ts`

結果：

- 全部通過

## 目前刻意未做

### 1. Kiro native session resume integration
雖然 Kiro CLI 支援 resume/list sessions，但而家未將 backend-native session id 真正接入 Discord runtime restore flow。

### 2. Kiro model/agent UI integration
雖然 executor 已可 list models / agents，但 Discord `/model` / `/agent` 尚未對接 Kiro backend。

### 3. trust policy mapping
Kiro CLI 已有 `--trust-all-tools` / `--trust-tools`，但目前未與 kimaki permission model 映射。

### 4. richer output lifecycle
現時仍然走 phase 1 text reply path，未做 richer lifecycle rendering。

## 為什麼這樣安排合理
原因係要先保住：

- OpenCode 主線唔被打壞
- Kiro 真能在 Discord 被切換與使用
- backend contract 逐步擴充，而唔係一口氣重寫 runtime

## 下一步建議

1. persist backend-native Kiro session id
2. 對接 Kiro resume/list sessions
3. 對接 Kiro model/agent selection
4. 設計 trust policy mapping
5. 視 Kiro CLI 實際行為，再決定 richer Discord lifecycle rendering
