# 🧘 久坐提醒 · Stand Up Reminder

> 一款驻留在 macOS 菜单栏的轻量久坐提醒工具。坐得太久，它会温柔地喊你站起来活动一下。

`appId: com.standup.reminder` · `version: 1.0.0` · 平台：macOS（Apple Silicon）

---

## 简介

长时间久坐是现代办公族的隐形健康杀手。**久坐提醒**会在你连续静坐达到设定时长后，从菜单栏图标下方弹出一个小卡片，提示你起身活动；随后进入站立 / 休息倒计时，帮助你养成规律起身的习惯。

- 纯原生实现：主进程 `main.js` + 两个 HTML 页面，无任何前端框架
- 体积小、启动快、零外部依赖（打包后仅含 3 个源文件）
- 菜单栏常驻，关闭窗口即最小化到托盘，不打扰你的工作流

---

## ✨ 功能特性

| 功能 | 说明 |
| --- | --- |
| ⏰ **久坐提醒间隔** | 可设置 1–180 分钟（默认 30 分钟），到点自动弹出提醒 |
| 🤸 **休息倒计时** | 可设置 1–30 分钟（默认 5 分钟）的站立 / 活动时间 |
| 🔔 **声音提醒** | 使用 Web Audio 合成提示音（久坐为三声短鸣，休息结束为上行和弦），可开关 |
| 🔄 **自动循环** | 休息结束后自动开始下一轮监控，无需手动重启 |
| 📊 **今日统计** | 实时显示今日站立次数、今日久坐时长（`HH:MM:SS`）、下次提醒时刻，跨天自动清零 |
| 🍣 **菜单栏托盘** | 模板图标自适应深浅色模式，点击切换主窗口显隐 |
| 💾 **设置持久化** | 通过 `localStorage` 保存所有设置与当日统计数据 |
| 🔒 **单实例运行** | 重复打开会聚焦到已运行窗口，不会启动多个实例 |

---

## 🖥️ 界面一览

主窗口采用深色毛玻璃风格（`backdrop-filter` 模糊），中央是一个 SVG 进度环，直观展示距离下次提醒的剩余时间。提醒发生时，会在菜单栏图标的正下方弹出一张紧贴状态栏的小卡片：

- **久坐提醒卡片**：`🪑 该站起来活动了！` —— 提供「稍后」与「休息」两个操作
- **休息倒计时卡片**：`🤸 休息中...` —— 显示剩余时间进度环，可「跳过」

> 📷 截图可放置于 `assets/` 目录后在此补充（当前仓库仅含 `assets/trayIcon.png`）。

---

## 🛠️ 技术栈

- **[Electron](https://www.electronjs.org/)** `^31.7.7` —— 跨平台桌面应用框架
- **[electron-builder](https://www.electronjs.org/docs/latest/tutorial/electron-builder)** `^24.13.3` —— 打包与分发
- 原生 HTML / CSS / JavaScript —— 渲染层与页面逻辑，无构建步骤

---

## 📦 项目结构

```
jiuzuotixing/
├── main.js                 # 主进程：窗口、托盘、计时器、IPC 通信
├── index.html              # 主窗口 UI（设置 / 进度环 / 统计 / 逻辑）
├── tray-modal.html         # 托盘弹窗 UI（久坐提醒 / 休息倒计时）
├── assets/
│   └── trayIcon.png        # 托盘图标（16×16 模板图）
├── scripts/
│   └── remove-quarantine.js# afterPack 钩子：Ad-hoc 签名 + 移除隔离属性
├── gen_icon.js             # 托盘图标生成脚本（一次性工具）
├── package.json            # 依赖与 electron-builder 配置
└── README.md
```

---

## 📋 环境要求

- **操作系统**：macOS（当前打包目标仅 `arm64` / Apple Silicon）
- **Node.js**：建议 18 LTS 或更高版本
- **npm**：随 Node 一并安装

---

## 🚀 快速开始（开发）

```bash
# 1. 安装依赖
npm install

# 2. 以开发模式启动应用
npm start
```

启动后会打开主窗口，并在菜单栏出现「久坐」字样的托盘图标。

---

## 📦 打包构建

支持在 macOS 上同时打包 **macOS** 与 **Windows** 两个平台：

```bash
# 一键打包 macOS + Windows（推荐）
npm run build

# 或使用打包脚本（带依赖检查、清理旧产物、汇总输出）
bash scripts/build.sh            # 默认：双平台
bash scripts/build.sh mac        # 仅 macOS
bash scripts/build.sh win        # 仅 Windows

# 仅打 macOS .app 目录（不制作 dmg，便于本地测试）
npm run build:dir
```

产物位于 `dist/` 目录：

| 平台 | 产物 |
| --- | --- |
| macOS（arm64） | `久坐提醒-1.0.0-arm64.dmg` |
| Windows（x64） | `久坐提醒-Setup-1.0.0.exe`（NSIS 安装包） |

> 💡 Windows 使用 NSIS 安装器，可在 macOS 上直接交叉打包，无需 Wine。

---

## 📖 使用说明

1. **启动监控**：打开主窗口，点击「开始监控」按钮，进度环开始倒数
2. **调整参数**：通过 `− / +` 步进器修改久坐间隔与休息时长（监控过程中也可随时调整）
3. **收到提醒**：到点后菜单栏图标下方弹出提醒卡片
   - 点击 **稍后**：延后一个间隔后再次提醒
   - 点击 **休息**：进入休息倒计时
4. **休息结束**：自动播放结束提示音；若开启了「自动循环」，会自动进入下一轮
5. **隐藏窗口**：关闭主窗口只会最小化到托盘；如需彻底退出，请在托盘右键菜单选择「退出」（或 `⌘Q`）

---

## 🏗️ 架构说明

### 计时器为何放在主进程？

这是本项目最关键的设计点。Chromium 会对**隐藏 / 后台窗口**中的定时器做节流（最严时每分钟才触发一次）。由于本应用常常在窗口隐藏状态下计时，如果把 `setInterval` 写在渲染进程里，到点提醒会严重不准。

因此 `main.js` 把久坐计时与休息倒计时都接管到主进程中（Node.js 的 `setInterval` 不受渲染层节流影响），再通过 IPC 把剩余秒数同步回渲染层更新界面：

```
渲染进程 (index.html)                主进程 (main.js)
   │  start-sit-timer ────────────▶   sitTimer = setInterval(...)
   │  ◀──────── update-sit-sync ───   每秒回传剩余秒数
   │  ◀──────── tray-action ───────   到点 / 按钮事件
   │  show-rest-reminder ─────────▶   restTimer = setInterval(...)
   │  ◀──────── update-rest-sync ──   每秒回传休息剩余秒数
```

### 提醒状态机

应用在工作时围绕以下几个阶段流转：

```
idle(未开始) ──开始监控──▶ sitting(久坐倒数) ──到点──▶ reminding(提醒中)
                                 ▲                          │ 稍后 / 休息
                                 │                          ▼
                           (自动循环)                   resting(休息倒数) ──结束──▶ idle/循环
```

---

## 🔒 关于签名与分发

为方便在没有 Apple 开发者账号的情况下本地分发，`scripts/remove-quarantine.js` 作为 `afterPack` 钩子做了两件事：

1. **Ad-hoc 签名**：`codesign --deep --force --sign -` 本地签名，无需证书
2. **移除隔离属性**：`xattr -cr` 清除 `com.apple.quarantine`，避免 Gatekeeper 拦截

> ⚠️ 注意：Ad-hoc 签名**不能通过公证（Notarization）**，仅适合个人 / 内部使用。若需公开发布，请配置正式的开发者证书并开启 `electron-builder` 的公证流程。

---

## 📄 许可证

本项目仅供个人学习与使用。如需二次分发或商用，请自行评估相关责任。
