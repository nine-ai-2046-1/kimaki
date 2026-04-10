---
title: Phase 3 Discord Multibackend Polish Plan
description: >-
  Planning document for the next stage after Gemini Phase 2, focused on making
  Discord-first multi-backend usage clearer, safer, and more operationally
  reliable.
prompt: |
  Write a Phase 3 planning doc for kimaki after Gemini CLI Phase 2. Focus on
  Discord-first multi-backend polish: clearer backend UX, better continuity,
  safer command boundaries, and operational reliability. Write in Cantonese,
  GitHub-flavored Markdown, practical and review-friendly.
references:
  - @/docs/roadmaps/phase-2-discord-gemini-cli-scope.md
  - @/docs/roadmaps/phase-2-discord-gemini-cli-implementation-status.md
  - @/cli/src/commands/backend.ts
  - @/cli/src/session-handler/thread-session-runtime.ts
  - @/cli/src/backends/gemini-cli-runner.ts
---

# Phase 3 Discord Multibackend Polish Plan

## 目標
Phase 3 唔再係「有冇 Gemini」，而係：

- multi-backend UX 更清楚
- Gemini continuity 更合理
- backend switching 更少踩坑
- Discord self-host 更穩定同更安全

## 重點範圍

### 1. backend UX polish
- `/backend current` 顯示 capability summary
- thread header / first reply 明確標示 backend mode
- backend unavailable 文案更精準

### 2. Gemini continuity improvement
- 更好 transcript compaction
- 減少 thread transcript 污染 prompt
- 明確處理 restart 後 follow-up continuity

### 3. safer command boundaries
- `/run-shell-command` 可以加 stricter self-host policy
- backend-specific command restrictions 更清楚

### 4. Discord delivery robustness
- retry/backoff for message send timeout
- better error fallback when Discord REST timeout

## 成功定義
1. backend switching 心智模型清楚
2. Gemini follow-up 比 Phase 2 穩定
3. Discord timeout 類問題更少打斷 user flow
4. self-host 權限邊界更穩

## 不做範圍
- Telegram
- Codex/Kiro full implementation
- deep UI redesign

## 建議實作順序
1. backend capability UX
2. Gemini transcript/continuity polish
3. Discord delivery hardening
4. command boundary hardening
