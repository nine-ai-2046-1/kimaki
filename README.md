<div align='center'>
    <br/>
    <br/>
    <h3>kimaki 🤖</h3>
    <p>Iron Man 嘅 Jarvis，專為 coding agent 設計，住喺 Discord 入面</p>
    <br/>
    <br/>
</div>

Kimaki 係一個 Discord bot，讓你直接用 Discord 控制 coding 任務。📨 喺 Discord 頻道發一條訊息，AI agent 就幫你喺本機改 code。

> **⚠️ Fork 版本提示**：呢個係 Kimaki 嘅 self-host fork，支援多個 coding backend（OpenCode、Gemini CLI、Kiro CLI）同埋無需 shared gateway 嘅自托管模式。Fork repo：[nine-ai-2046-1/kimaki](https://github.com/nine-ai-2046-1/kimaki)。原版請見 [上游 repo](https://github.com/OpenAgentPlatform/kimaki)。

---

## 🚀 快速開始

```bash
# 1️⃣ Clone 呢個 repo（連同 submodules）
git clone --recurse-submodules https://github.com/nine-ai-2046-1/kimaki.git
cd kimaki

# 如果已 clone 但未 init submodules，補跑呢條：
# git submodule update --init errore traforo opencode-injection-guard

# 2️⃣ 安裝依賴（從 repo 根目錄）
pnpm install

# 3️⃣ Build workspace packages（包括 discord-digital-twin 依賴）
pnpm prepare

# 4️⃣ Build CLI
cd cli && pnpm build && cd ..

# 如果 pnpm prepare 出現 sqlite3 錯誤，可以分步跑：
# pnpm --filter discord-digital-twin exec prisma generate
# pnpm --filter discord-digital-twin run build
# cd cli && pnpm build && cd ..

# 5️⃣ 啟動 bot
node cli/bin.js
```

首次啟動時，CLI 會引導你完成互動式設定。你只需安裝 bot 入你嘅 Discord server，揀定 project，就搞掂。

---

## 🤔 Kimaki 係咩？

Kimaki 將 Discord 接駁到 [OpenCode](https://opencode.ai)，一個類似 Claude Code 嘅 coding agent。每個 Discord 頻道對應你本機上一個 project 目錄。你喺頻道發訊息，Kimaki 就開一條 thread，並啟動 coding session，可以：

- 📖 讀寫檔案
- 💻 執行 terminal 指令
- 🔍 搜索你嘅 codebase
- 🔧 使用任何你已配置嘅工具

想像你係在「發短訊畀自己個 codebase」。你說你想點，AI 就去做。

```
┌─────────────┐         ┌─────────────────────────────────────────┐
│   Discord   │         │  你嘅機器                               │
│             │         │                                         │
│  你喺頻道   │─────────▶  Kimaki CLI ──▶ Backend Runner ──▶ AI   │
│  發訊息     │         │                    │                    │
│             │◀────────│     回覆訊息        ▼                    │
│             │         │              讀、改、執行指令             │
└─────────────┘         │              喺你嘅 project 目錄        │
                        └─────────────────────────────────────────┘
```

---

## ⚙️ 設定

執行 CLI 並跟隨互動提示：

```bash
npx -y kimaki@latest
```

設定精靈提供兩個選項：

- **Gateway 模式（預設）** — 使用 Kimaki 預建嘅 Discord bot。唔需要去 Discord Developer Portal 設定。你點一個安裝連結，授權 bot 入你嘅 server，就可以運作。係推薦路線。
- **自托管模式（Self-Host）** ✨ — 你自己喺 [discord.com/developers](https://discord.com/developers/applications) 建立 Discord bot。需時 5-10 分鐘。如果你想完全控制 bot 身份，或者唔依賴 shared gateway，用呢個模式。

兩種模式設定完後行為完全一樣。保持 CLI 運行 — 佢係 Discord 同你機器之間嘅橋樑。

### 🏠 Self-Host 模式設定

如果你想完全自托管（唔依賴 Kimaki gateway），可以直接用 `.env` 設定：

```bash
DISCORD_BOT_TOKEN=你嘅bot_token
DEFAULT_BACKEND=opencode
ENABLED_BACKENDS=opencode,gemini-cli,kiro-cli
PROJECT_ROOTS=/Users/you/projects
DATA_DIR=
```

然後直接跑：

```bash
kimaki-selfhost
```

> 詳情見 [self-host binary runbook](docs/roadmaps/self-host-binary-runbook-and-env-spec.md)

---

## ✨ 功能

**💬 文字訊息** — 喺任何連結了 project 嘅頻道發訊息。Kimaki 建立 thread 並啟動 coding session。

**📎 檔案附件** — 附上圖片、code 檔案或任何其他檔案。Kimaki 會將它們加入 session context 一齊處理。

**🎤 語音訊息** — 喺 Discord 錄音。Kimaki 用 Google Gemini API 轉錄，並以文字方式處理。轉錄時會利用你 project 的檔案結構提升準確度，識別函數名同檔案路徑。需要 Gemini API key（設定時會提示）。

**📋 Session 管理** — 繼續未完成嘅 session、從任何訊息 fork，或生成公開 URL 分享你嘅 session。

**⏳ 訊息佇列** — 用 `/queue <message>` 在 AI 回覆時預先排隊下一條訊息。當前回覆完成後自動發送。你亦可以在訊息末尾加 `. queue` 達到同樣效果。

**🧠 記憶** — Kimaki 在 session 開始時讀取 project 根目錄的 `MEMORY.md`。AI 可以更新呢個檔案，保存跨 session 嘅學習、決定同上下文。

**🛡️ 工具權限** — 當 AI 嘗試執行需要審批的操作（例如 shell 指令或存取 project 外部的檔案），Kimaki 喺 thread 顯示接受 / 永遠接受 / 拒絕按鈕。可在 `opencode.json` 中自訂預設值。參見 [OpenCode 權限文件](https://opencode.ai/docs/permissions/)。

**🔌 多 Backend 支援** ✨ — 唔只係 OpenCode！你可以切換去 Gemini CLI 或 Kiro CLI 作為 coding backend。詳見下方「Backend 選擇」章節。

---

## 🔌 Backend 選擇

呢個 fork 支援多個 coding backend。你可以用 `/backend` 指令查看、切換：

### 支援的 Backend

| Backend | 狀態 | 描述 |
|---|---|---|
| `opencode` | ✅ 完整支援 | 主 backend，完整 coding runtime |
| `gemini-cli` | ✅ Text-mode | Gemini CLI，文字模式 backend（Phase 2 已實作） |
| `kiro-cli` | ✅ Phase 1 | Kiro CLI，rich backend（Phase 1 Discord routing 已接入） |
| `codex` | 🚧 計劃中 | Codex backend（架構已預留） |

### 使用方法

```
/backend list          # 列出本機所有 backend 及可用狀態
/backend current       # 查看當前 session 用緊邊個 backend
/backend set opencode  # 切換去 OpenCode
/backend set gemini-cli  # 切換去 Gemini CLI（text-mode）
/backend set kiro-cli  # 切換去 Kiro CLI
```

> **注意**：Gemini CLI 係 text-mode backend，唔提供 OpenCode 嘅完整 tool/runtime parity。Kiro CLI 目前係 Phase 1 Discord routing，更豐富嘅 session/model/agent 整合仍在開發中。

### Gemini CLI 設定

設置 Gemini API key（二選一）：

**方案 A（推薦）**：用 Discord 指令儲存：
```
/transcription-key
```
輸入 key 後儲存喺本機 SQLite，作為 Gemini CLI backend 同語音轉錄嘅 key source。

**方案 B**：設環境變數：
```bash
GEMINI_API_KEY=你的key
```

---

## 📋 指令

### Slash 指令

| 指令 | 說明 |
|---|---|
| `/session <prompt>` | 用初始提示開一個新 session |
| `/resume <session>` | 繼續之前的 session（支援自動完成） |
| `/abort` | 停止當前運行中的 session |
| `/add-project <project>` | 為現有 OpenCode project 建立頻道 |
| `/create-new-project <name>` | 建立新 project 資料夾並開始 session |
| `/new-worktree <name>` | 建立 git worktree 並開始 session |
| `/merge-worktree` | 將 worktree branch merge 入預設 branch |
| `/model` | 更改此頻道或 session 的 AI 模型 |
| `/agent` | 更改此頻道或 session 的 agent |
| `/share` | 生成公開 URL 分享當前 session |
| `/fork` | 從某條訊息 fork session |
| `/queue <message>` | 排隊一條訊息，等當前回覆完成後自動發送 |
| `/clear-queue` | 清除此 thread 所有排隊訊息 |
| `/undo` | 撤銷上一條 assistant 訊息（還原檔案改動） |
| `/redo` | 重做上次撤銷的訊息 |
| `/screenshare` | 透過 VNC tunnel 分享螢幕（1小時後自動停止） |
| `/screenshare-stop` | 停止螢幕分享 |
| `/upgrade-and-restart` | 升級 kimaki 至最新版本並重啟 bot |
| `/backend list` | 列出本機所有 backend 及可用狀態 ✨ |
| `/backend current` | 查看當前使用中的 backend ✨ |
| `/backend set <backend>` | 切換 backend ✨ |

Kimaki 亦會從 OpenCode 註冊 project 專屬的 slash 指令：指令變成 `/name-cmd`，skill 變成 `/name-skill`，MCP prompt 變成 `/name-cmd`。

### CLI

```bash
# 啟動 bot（首次運行時有互動式設定）
npx -y kimaki@latest

# 將 project 目錄加為 Discord 頻道
npx -y kimaki project add [directory]

# 程式化啟動 session
npx -y kimaki send --channel <channel-id> --prompt "你的提示"

# 升級 kimaki 並重啟
npx -y kimaki upgrade
```

詳見 [CI & 自動化文件](docs/ci-automation.md)，包括完整 `send` 指令參考、GitHub Actions 示例及排程任務。

---

## 🔐 存取控制

Kimaki 在處理任何訊息前都會檢查 Discord 權限。用戶需要以下**其中一項**：

- **Server Owner（伺服器擁有者）**
- **Manage Server 權限**
- **Administrator 權限**
- **「Kimaki」角色** — 建立一個叫呢個名的角色（大小寫不敏感），並分配給受信任用戶

「Kimaki」角色係推薦的團隊存取方式。沒有上述任何權限的用戶訊息會被忽略。

**封鎖存取** — 建立名為 **「no-kimaki」**（大小寫不敏感）的角色，可封鎖特定用戶，即使係 server owner 都有效。適合用於防止在共享伺服器中意外觸發 bot。

**多 agent 協作** — 其他 Discord bot 預設會被忽略。將「Kimaki」角色分配給另一個 bot，就可以讓佢觸發 Kimaki session。

---

## 🤖 模型 & Agent 配置

在你 project 的 `opencode.json` 中設定 AI 模型：

```json
{
  "model": "anthropic/claude-sonnet-4-20250514"
}
```

格式：`provider/model-name`。示例：`anthropic/claude-opus-4-20250514`、`openai/gpt-4o`、`google/gemini-2.5-pro`。

或者用 `/model` 和 `/agent` slash 指令按頻道或 session 更改設定。

---

## 💡 最佳實踐

**🏠 為你的 agent 建立專用 Discord 伺服器。** 呢樣可以將 coding session 與其他伺服器分開，讓你完全控制權限。

**👥 用「Kimaki」角色管理團隊存取。** 將角色分配給應能觸發 session 的用戶。

**📄 用檔案附件發送長提示。** Discord 有字數限制。點擊加號圖示，使用「Send message as file」發送較長提示。Kimaki 會讀取檔案附件作為你的訊息內容。

---

## 🗺️ 開發路線圖

呢個 fork 按以下階段演進：

| 階段 | 內容 | 狀態 |
|---|---|---|
| **Phase 1** 🧩 | Discord Self-Host MVP，backend 抽象框架，OpenCode runner | ✅ 完成 |
| **Phase 2a** 🔌 | Gemini CLI backend，text-mode Discord routing | ✅ 完成 |
| **Phase 5** ⚡ | Kiro CLI rich backend Phase 1 Discord routing | ✅ 完成 |
| **Phase 2b** 📱 | Telegram Self-Host MVP | 🚧 計劃中 |
| **Phase 3** 📦 | Self-Host Packaging & Deployment | 🚧 計劃中 |
| **Phase 4** ✨ | Feature Parity & 進階功能 | 🚧 計劃中 |

詳見 [docs/roadmaps/](docs/roadmaps/) 目錄。

---

## 📚 進階主題

- [**進階設定**](docs/advanced-setup.md) — 多實例、多 Discord 伺服器、架構詳情
- [**CI & 自動化**](docs/ci-automation.md) — 程式化 session、GitHub Actions、排程任務、per-session 權限
- [**螢幕分享**](docs/screen-sharing.md) — 透過瀏覽器連結分享螢幕（macOS 及 Linux 設定）
- [**內部原理**](docs/internals.md) — Kimaki 運作原理（SQLite、lock port、頻道 metadata、語音處理）
- [**開發路線圖**](docs/roadmaps/) — 各階段計劃與實作狀態
