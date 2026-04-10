# Kimaki Security Brief 🚨

## 核心判斷
Kimaki **未見惡意邏輯**，但存在多個 **高權限功能帶來嘅安全風險**。  
重點唔係 malware，而係：

> **好多合法但危險嘅能力，而安全邊界未完全收緊。**

## High Risk

### 1. URL query secret
- `clientSecret` 等資料出現在 onboarding URL
- 可經 browser history / referer / logs 外洩

### 2. Shell execution
- bot 可執行 shell command
- 一旦權限控制失守，即變遠端 RCE

### 3. AI runtime 權限過大
- 可 `bash`
- 可 `edit`
- 可 `webfetch`
- 可 `websearch`

### 4. Screenshare
- VNC + tunnel
- URL 洩漏即高風險
- Linux path 使用 `x11vnc -nopw`

## Medium Risk

### 5. Secrets 明文保存
- bot token
- gateway secret
- API key
- Slack bot token

### 6. Hrana DB server exposure
- 有 auth，但 token 洩漏或 bind 公網會有風險

### 7. Error monitoring 幾乎停用
- 安全事故難追

### 8. Logging hygiene 一般
- production logs 有機會記錄太多 context

## 未見惡意項目
- 未見陌生可疑外傳網域
- 未見後門
- 未見隱藏 persistence
- 未見挖礦 / 混淆 payload

## 最優先修復
1. 移除 URL 傳 secret
2. 鎖緊 shell command
3. 收緊 OpenCode tool permissions
4. 加固 screenshare auth
5. 改善 secrets storage
6. 補回 audit / monitoring
