---
title: Git Submodule Handling Policy
description: >-
  Standard operating policy for initializing, reviewing, building, and
  modifying git submodules in the kimaki repository.
prompt: |
  Write a practical submodule handling policy for kimaki. The policy should
  state that submodules are part of the project scope and must be initialized
  before review, build, debug, or code changes when relevant. Explain the
  standard commands, when to init one submodule vs all, and how to handle
  changes safely.
references:
  - @/.gitmodules
  - @/package.json
  - @/docs/architecture/submodule-relationship-map.md
  - @/docs/reports/2026-04-10-submodule-review.md
---

# Git Submodule Handling Policy 📋

## 目的
Kimaki repo 內嘅 git submodule：

- `gateway-proxy`
- `traforo`
- `errore`
- `opencode-injection-guard`

都屬於 **project 正式範圍**，唔係可忽略附件。

呢份 policy 用嚟統一之後做：

- code review
- security review
- build
- debug
- feature update
- integration analysis

時點樣處理 submodule。

---

## 核心原則

### 1. Submodule 視為 project scope 一部分
只要任務可能影響：

- runtime 行為
- onboarding / gateway flow
- tunnel / screenshare
- error handling foundation
- OpenCode security plugin

就要將相關 submodule 納入分析範圍。

### 2. 未初始化前，不做正式 review / build / 修改
如果相關 submodule 未 init：

- 唔應該做完整 review
- 唔應該做正式 build 判斷
- 唔應該改 code

最多只可以做「有限初步分析」。

### 3. 預設拉 parent repo 鎖定版本
標準操作應該跟 parent repo pin 住嘅 commit，而唔係追 submodule remote 最新版。

目的：

- 可重現
- 與主 repo 對齊
- 避免 review 漂移

---

## 標準操作命令

### 全量初始化
適用於：

- 全 repo review
- build / integration analysis
- 不確定會影響邊個 submodule

```bash
git submodule sync --recursive
git submodule update --init --recursive
```

### 初始化單一 submodule
適用於：

- 明確只涉及一個 submodule

例如只處理 `gateway-proxy`：

```bash
git submodule update --init gateway-proxy
```

### 不建議預設使用
```bash
git submodule update --init --recursive --remote
```

原因：

- 會追 upstream 最新
- 可能偏離 parent repo 鎖定版本
- review / build 結果唔再可重現

只喺「明確要升級 submodule」時先用。

---

## 操作規則

### 規則 A：Review 前
如果任務涉及任何 submodule 相關功能，先檢查：

```bash
git submodule status --recursive
```

如果見到前面有 `-`，代表未 init，要先初始化。

### 規則 B：Build 前
如果 build path 依賴 submodule：

- 先 init 該 submodule
- 再做 build / typecheck / test

### 規則 C：改 code 前
如果要改 submodule 代碼：

1. 先 init submodule
2. 當佢係獨立 repo 處理
3. 先喺 submodule 內 commit
4. 再喺 parent repo 更新 submodule pointer

### 規則 D：Security review 前
完整 security review 一律預設：

- 先 init 全部 submodule

因為 security boundary 可能跨：

- `cli`
- `website`
- `gateway-proxy`
- `traforo`
- `opencode-injection-guard`

---

## 何時 init 一個，何時 init 全部

### 只 init 一個
當你已明確知道任務只影響：

- `gateway-proxy` 單獨 bug
- `traforo` tunnel 問題
- `errore` library 問題
- `opencode-injection-guard` plugin 問題

### init 全部
當任務係：

- 全 repo review
- security audit
- integration bug
- build / release validation
- 架構調整
- 不確定哪個 submodule 會受影響

---

## 變更管理規則

### 改 submodule 時要記住
submodule 改動其實有兩層：

1. submodule 自己 repo 內容改動
2. parent repo 指向新 submodule commit 嘅 pointer 改動

所以要清楚區分：

- 改咗 submodule code 未？
- parent repo 有冇更新 pointer？

### 不要做嘅事
- 唔好未確認版本就直接追 remote 最新
- 唔好當 submodule 係普通目錄亂改而唔記得 pointer
- 唔好喺未 init 狀態下做完整判斷

---

## Kimaki 專用實務規則

### 任務如果涉及以下範圍，必須考慮 submodule

#### Gateway / onboarding / shared Discord bot
要睇：

- `gateway-proxy`
- `cli`
- `website`

#### Screenshare / tunnel / remote exposure
要睇：

- `traforo`
- `cli`

#### OpenCode injection / plugin guard
要睇：

- `opencode-injection-guard`
- `cli`

#### Error handling / engineering conventions
要睇：

- `errore`
- 相關 workspace package

---

## 標準結論句
之後處理 Kimaki 任務時，可直接採用以下規則：

> 如果任務有機會涉及 submodule 的 review、build、debug、security assessment 或 code change，先檢查並初始化相關 submodule；如果範圍不明或屬完整審核，直接初始化全部 submodule，並以 parent repo 鎖定版本為準。

---

## 最終結論 ✅

Kimaki submodule handling 標準應該係：

- **relevant submodule must be initialized first**
- **full review defaults to all submodules initialized**
- **follow parent repo pinned commits by default**
- **treat submodules as first-class project scope**

呢個 policy 之後應該作為：

- review 準則
- build 準則
- security audit 準則
- code change 準則

一律遵守。 
