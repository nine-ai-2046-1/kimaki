---
title: Phase 4 Codex and Kiro Backend Expansion Plan
description: >-
  Planning document for expanding kimaki beyond OpenCode and Gemini CLI into
  additional self-host backends like Codex and Kiro, after Discord-first
  multi-backend foundations are stable.
prompt: |
  Write a Phase 4 planning doc for kimaki that follows after Gemini Phase 2 and
  Discord multibackend polish. Focus on adding more backends such as Codex and
  Kiro in a way that reuses the backend execution abstraction and keeps Discord
  as the main transport. Write in Cantonese, GitHub-flavored Markdown,
  practical and review-friendly.
references:
  - @/docs/architecture/backend-execution-abstraction.md
  - @/docs/roadmaps/phase-2-discord-gemini-cli-plan.md
  - @/docs/roadmaps/phase-3-discord-multibackend-polish-plan.md
  - @/cli/src/backends/backend-runner.ts
  - @/cli/src/backends/backend-registry.ts
---

# Phase 4 Codex and Kiro Backend Expansion Plan

## 目標
Phase 4 目標係：

- 喺已穩定嘅 Discord-first multi-backend 基礎上
- 引入更多 practical backend
- 優先考慮 Codex 同 Kiro CLI

## 前置條件
Phase 4 應建立喺以下已完成之上：

1. OpenCode executor 穩定
2. Gemini CLI text-mode backend 已可用
3. backend capability UX 已清楚
4. Discord runtime 對多 backend 已無明顯行為混亂

## 重點範圍

### 1. Codex executor POC
- availability check
- command-wrapper or native mode research
- Discord thread basic reply

### 2. Kiro executor POC
- availability check
- lifecycle model research
- basic prompt/reply path

### 3. backend capability matrix
- 各 backend 邊啲支援 streaming
- 邊啲支援 native session resume
- 邊啲支援 tools/permissions

### 4. user-facing backend policy
- 邊個 backend 適合 coding-heavy workflow
- 邊個 backend 適合 quick ideation
- 乜情況建議切返 OpenCode

## 成功定義
1. `/backend list` 變成真正有選擇價值
2. 至少新增 1 個可用 backend beyond Gemini
3. backend capability 差異對 user 清楚可見
4. Discord remains main stable transport

## 不做範圍
- Telegram as main focus
- full parity across all backends
- shared gateway revival

## 建議實作順序
1. Codex research + POC
2. Kiro research + POC
3. capability matrix + UX docs
4. backend recommendation UX
