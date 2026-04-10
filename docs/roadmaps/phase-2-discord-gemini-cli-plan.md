---
title: Phase 2 Discord Gemini CLI Plan
description: >-
  Discord-first Phase 2 plan for adding Gemini CLI as the first non-OpenCode
  backend in self-host kimaki.
prompt: |
  Write a practical Discord-first Phase 2 plan for Gemini CLI integration in
  kimaki. Assume Telegram is deferred, Discord remains the main transport, and
  backend execution abstraction must be introduced before Gemini CLI can be
  wired in cleanly. Write in Cantonese, GitHub-flavored Markdown, practical and
  implementation-focused.
references:
  - @/docs/architecture/backend-execution-abstraction.md
  - @/docs/architecture/self-host-target-architecture.md
  - @/docs/roadmaps/self-host-discord-telegram-multicli-roadmap.md
  - @/docs/roadmaps/phase-1-discord-selfhost-mvp-plan.md
  - @/cli/src/backends/backend-registry.ts
  - @/cli/src/commands/backend.ts
  - @/cli/src/commands/session.ts
  - @/cli/src/session-handler/thread-session-runtime.ts
---

# Phase 2 Discord Gemini CLI Plan

## 目標
Phase 2 目標係：

- 保持 Discord 作為主 transport
- 引入第一個真正非-OpenCode backend：`Gemini CLI`
- 但唔用 hacky `if backend === 'gemini_cli'` 方式硬插入
- 先建立 backend execution abstraction，再用呢個抽象接 Gemini CLI

## 成功定義
如果以下做到，就代表 Phase 2 成功：

1. Discord bot 仍然係主入口
2. OpenCode flow 繼續正常
3. `/backend set gemini-cli` 後可以真開 session
4. thread follow-up 可以送去 Gemini CLI
5. Discord 可以收到 Gemini CLI 回覆
6. project/session isolation 保持正常

## 唔做範圍

今階段先唔做：

- Telegram integration
- Gemini CLI full feature parity with OpenCode
- voice/screenshare parity
- advanced permission UI parity
- 多 backend 同步 streaming parity

## 建議 user flow

### Flow 1: 列 backend
用戶喺 Discord 打：

- `/backend list`

bot 顯示：

- OpenCode: available
- Gemini CLI: available / unavailable

### Flow 2: 切去 Gemini CLI
用戶喺 Discord 打：

- `/backend set gemini-cli`

scope 先維持 machine 或 session 即可。

### Flow 3: 開 session
用戶打：

- `/new-session build a small todo app`

bot 開 thread，並清楚顯示：

- backend: Gemini CLI
- project: current project

### Flow 4: follow-up
thread 內用戶再講：

- `add dark mode`

bot 會繼續用 Gemini CLI follow-up。

## 實作策略

## Step 1: 抽 backend execution contract

### 目標
令 `ThreadSessionRuntime` 唔再直接 assume OpenCode SDK。

### 要做
- 定義 executor interface
- 定義 backend event model
- 定義 capability flags

### 成功條件
OpenCode 可經新 contract 照舊工作。

## Step 2: 將 OpenCode 遷入 executor

### 目標
將現有最核心 OpenCode 耦合收口。

### 重點
- session ensure
- prompt dispatch
- abort/resume
- output event adapter

### 成功條件
Discord 現有 OpenCode user flow 無行為回歸。

## Step 3: 建 Gemini CLI availability 檢查

### 目標
將目前 placeholder `Gemini CLI` availability 變成真檢查。

### 建議檢查項
- binary 是否存在
- 是否可執行
- 必要 env / login state 是否存在

### 輸出
`/backend list` 可清楚顯示 unavailable 原因。

## Step 4: 建 Gemini CLI executor（command-wrapper mode）

### 目標
用最小實作方式令 Gemini CLI 可真正回覆 Discord thread。

### 建議模式
- 每次 prompt 用一次 CLI process
- stdout 轉 text event
- stderr 轉 error event
- final exit code 決定 completed / failed

### 原因
- 比 long-lived mode 簡單
- 容易 debug
- 可以先驗證 abstraction

## Step 5: session continuity 策略

### 現實限制
Gemini CLI 未必提供 OpenCode 式原生 session API。

### MVP 建議
由 kimaki 自己維持簡單 conversation context：

- 將 thread recent user/assistant turns 轉成 prompt preamble
- follow-up prompt 時一齊送入 Gemini CLI

### 之後再考慮
- backend-native resume model
- 更精細 context compaction

## Step 6: Discord output policy

### 目標
令 Gemini CLI output 喺 Discord thread 內表現合理。

### 第一版建議
- 先支援純文字主輸出
- typing indicator 保留
- final footer 可先簡化
- 唔追 tool event parity

## Step 7: 手動驗證

### 必測場景
1. `/backend list`
2. `/backend set gemini-cli`
3. `/new-session`
4. thread follow-up
5. bot restart 後 backend/session 狀態
6. 切返 `/backend set opencode` 後 OpenCode 仍正常

## 風險排序

### 高優先
1. 抽象唔乾淨，導致 `ThreadSessionRuntime` 同時夾雜 OpenCode + Gemini 分支
2. Gemini CLI 冇穩定 session model，令 follow-up quality 差
3. output formatting 太粗糙，Discord UX 明顯退步

### 中優先
1. availability check 判斷唔清，令 `/backend list` 誤導
2. machine/session backend scope 文案唔夠清楚

### 低優先
1. 無 rich streaming
2. 無 permission prompt parity

## 建議實作順序

1. backend execution abstraction
2. OpenCode executor adapter
3. Gemini availability check
4. Gemini executor POC
5. Discord rendering polish

## 最終結論
Discord-first Gemini CLI Phase 2 最重要唔係「快啲接到 gemini」，而係：

> 先令 backend 真正可以被替換，再用 Gemini CLI 去驗證呢個抽象係正確。

如果呢步做得好，之後加 Codex 同 Kiro CLI 都會自然得多。 
