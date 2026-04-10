---
title: Kimaki Submodule Relationship Map
description: >-
  Documents how kimaki main packages depend on and interact with the
  initialized git submodules.
prompt: |
  Organize the relationship between the main kimaki repo and all initialized
  submodules. Explain which packages depend on which submodules, what each
  submodule is responsible for, and how data/control flows across them.
  Write in Cantonese, GitHub-flavored Markdown, easy to read, and based on
  code references.
references:
  - @/.gitmodules
  - @/package.json
  - @/cli/package.json
  - @/discord-slack-bridge/package.json
  - @/cli/src/cli.ts
  - @/cli/src/utils.ts
  - @/cli/src/commands/screenshare.ts
  - @/cli/src/kimaki-opencode-plugin.ts
  - @/website/src/auth.ts
  - @/website/src/gateway-client-kv.ts
  - @/gateway-proxy/src/main.rs
  - @/traforo/src/client.ts
  - @/opencode-injection-guard/src/index.ts
  - @/errore/src/index.ts
---

# Kimaki Submodule Relationship Map 🧭

## 概覽
Kimaki 呢個 monorepo 雖然主體係：

- `cli`
- `website`
- `discord-slack-bridge`
- `db`

但實際上仲依賴 4 個 submodule 做核心能力：

- `gateway-proxy`
- `traforo`
- `errore`
- `opencode-injection-guard`

佢哋唔係單純 external example repo，而係實際參與：

- runtime
- security model
- onboarding flow
- tunnel / remote access
- coding conventions

---

## 總關係圖

```text
kimaki main repo
├─ cli/
│  ├─ depends on errore
│  ├─ depends on traforo
│  ├─ depends on opencode-injection-guard
│  └─ connects to gateway-proxy in gateway mode
├─ website/
│  └─ writes gateway client records consumed by gateway-proxy
├─ discord-slack-bridge/
│  └─ uses traforo for exposed testing / webhook workflows
└─ root prepare/build
   ├─ builds errore
   ├─ builds traforo
   └─ builds opencode-injection-guard
```

---

## 1. `gateway-proxy` 與主 repo 關係 🌐

### 角色
`gateway-proxy` 提供 shared Discord bot gateway / REST proxy，支援 Kimaki `gateway mode`。

### 邊個 package 用佢
#### `cli`
- `cli/src/cli.ts` 內 hardcode gateway proxy URL
- `cli` 會喺 gateway onboarding 完成後，用 `client_id:secret` 當 Discord token 經 proxy 連線

#### `website`
- `website/src/auth.ts` callback 完成後，會將 `clientId`、`secret`、`guildId` 等寫入 `gateway_clients`
- `website/src/gateway-client-kv.ts` 將資料同步去 KV / DB

### 關係性質
`gateway-proxy` 同 `website` + `cli` 一齊構成完整 gateway onboarding 鏈：

1. `cli` 生成 client credential
2. `website` 完成 OAuth callback 並存 credential
3. `gateway-proxy` 由 DB/KV 拿 client mapping
4. `cli` 再以 `client_id:secret` 經 proxy 連 Discord

### 結論
`gateway-proxy` 係 **Kimaki gateway mode 核心基建**。

---

## 2. `traforo` 與主 repo 關係 🚇

### 角色
`traforo` 提供 local-to-public tunnel。

### 邊個 package 用佢
#### `cli`
- `cli/package.json` 直接依賴 `traforo`
- `cli/src/commands/screenshare.ts` 用 `TunnelClient`
- `cli/src/cli.ts` 有 tunnel command / flow

#### `discord-slack-bridge`
- `discord-slack-bridge/package.json` devDependency 包含 `traforo`
- `discord-slack-bridge/scripts/echo-bot.ts` 會 import `TunnelClient`

### 關係性質
`traforo` 提供 Kimaki 兩類重要能力：

1. **screenshare / noVNC tunnel**
2. **bridge / webhook / local testing 暴露**

### 結論
`traforo` 係 **Kimaki remote access / external exposure 能力核心件**。

---

## 3. `errore` 與主 repo 關係 🧰

### 角色
`errore` 係 TypeScript errors-as-values library。

### 邊個 package 用佢
#### `cli`
- `cli/package.json` 直接依賴 `errore`
- 多個 `cli/src/*.ts` 檔直接 import `errore`

#### 其他 workspace package
- `fly-admin` 等 package 亦有 import `errore`

### 關係性質
呢個唔止係 runtime dependency，更係 coding style / error handling foundation。

主 repo `AGENTS.md` 亦直接要求按 `errore` 慣例工作。

### 結論
`errore` 係 **Kimaki engineering convention 基礎件**。

---

## 4. `opencode-injection-guard` 與主 repo 關係 🛡️

### 角色
`opencode-injection-guard` 係 OpenCode plugin，喺工具輸出之後做 prompt injection 檢測。

### 邊個 package 用佢
#### `cli`
- `cli/package.json` 直接依賴 `opencode-injection-guard`
- `cli/src/kimaki-opencode-plugin.ts` 會 re-export 佢做 plugin
- `cli/src/opencode.ts` 同 session runtime 會餵 scan patterns

### 關係性質
佢係 Kimaki OpenCode security pipeline 入面嘅 guard layer。

唔係 standalone optional demo，而係實際整合進 plugin runtime。

### 結論
`opencode-injection-guard` 係 **Kimaki OpenCode 安全策略組件之一**。

---

## 5. Root repo 對 submodule 嘅 build 關係 🏗️

root `package.json`：

- `prepare` 會 build `errore`
- `prepare` 會 build `traforo`
- `prepare` 會 build `opencode-injection-guard`

`gateway-proxy` 因為係 Rust service，唔喺 root prepare 自動 build，但係 Kimaki gateway 模式實際 runtime 依賴佢。

即係話：

- `errore` / `traforo` / `opencode-injection-guard` 偏 workspace-integrated
- `gateway-proxy` 偏 infrastructure-integrated

---

## 6. 維護時應點理解呢啲關係

### 如果改 onboarding / gateway
要一齊睇：

- `cli`
- `website`
- `gateway-proxy`

### 如果改 screenshare / tunnel / external exposure
要一齊睇：

- `cli`
- `traforo`

### 如果改 OpenCode plugin security
要一齊睇：

- `cli`
- `opencode-injection-guard`

### 如果改 error handling / error pattern
要一齊睇：

- `cli`
- `errore`

---

## 最終結論 ✅

Kimaki 同 submodule 嘅關係可以總結成：

- `gateway-proxy`：**shared Discord infrastructure**
- `traforo`：**remote exposure / tunnel infrastructure**
- `errore`：**error handling foundation**
- `opencode-injection-guard`：**OpenCode security guard layer**

所以之後做：

- review
- build
- debug
- code changes
- security assessment

都應該將相關 submodule 視為 **主 project 實際範圍內**，唔可以只睇 main repo 表層 package。 
