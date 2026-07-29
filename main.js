const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen } = require('electron');
const path = require('path');
const updater = require('./updater');

// Windows：设置 AppUserModelId，使任务栏正确关联本应用并显示自定义图标（避免默认/空白图标）
if (process.platform === 'win32') {
    app.setAppUserModelId('com.standup.reminder');
}

let mainWindow = null;
let tray = null;
let trayWindow = null;
let isQuiting = false;

// 主进程管理的倒计时（不受窗口隐藏节流影响）
let restTimer = null;
let restRemain = 0;
let restTotal = 0;
let sitTimer = null;
let sitRemain = 0;
let sitInterval = 30;

function createWindow() {
    const isMac = process.platform === 'darwin';
    // Windows 标题栏会占用约 30px 高度，适当加高；同时不超过可用工作区，
    // 避免在高 DPI 缩放 / 小屏 Windows 上窗口高出屏幕、底部被裁切。
    const workArea = screen.getPrimaryDisplay().workArea;
    const baseHeight = isMac ? 730 : 770;
    const winHeight = Math.min(baseHeight, workArea.height - 16);

    mainWindow = new BrowserWindow({
        width: 420,
        height: winHeight,
        show: true,
        frame: true,
        title: '久坐提醒',
        // 运行时窗口图标（macOS 由 .icns 提供；Windows/Linux 显示在任务栏/标题栏）
        icon: path.join(__dirname, 'assets', 'jiuzuotixing.png'),
        // hiddenInset 仅 macOS 生效；Windows/Linux 使用标准标题栏
        titleBarStyle: isMac ? 'hiddenInset' : 'default',
        resizable: false,
        maximizable: false,
        fullscreenable: false,
        backgroundColor: '#1a1a2e',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    });

    mainWindow.loadFile('index.html');

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('页面加载失败:', errorCode, errorDescription);
    });

    // 关闭窗口时隐藏到托盘而不是退出
    mainWindow.on('close', (event) => {
        if (!isQuiting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// 创建托盘弹出窗口（紧贴状态栏图标下方）
function createTrayWindow() {
    trayWindow = new BrowserWindow({
        width: 180,
        height: 220,
        show: false,
        frame: false,
        resizable: false,
        movable: false,
        fullscreenable: false,
        minimizable: false,
        maximizable: false,
        skipTaskbar: true,
        transparent: true,
        alwaysOnTop: true,
        hasShadow: false,
        backgroundColor: '#00000000',
        visibleOnAllWorkspaces: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    });

    trayWindow.loadFile('tray-modal.html');

    // 点击窗口外部时关闭
    trayWindow.on('blur', () => {
        // 不自动关闭，由渲染进程控制
    });
}

function positionTrayWindow() {
    if (!trayWindow || !tray) return;
    const trayBounds = tray.getBounds();
    const winSize = trayWindow.getSize();
    const display = screen.getDisplayNearestPoint({ x: trayBounds.x, y: trayBounds.y });
    const workArea = display.workArea;

    // 水平：居中于托盘图标，并限制在工作区内
    let x = Math.round(trayBounds.x + trayBounds.width / 2 - winSize[0] / 2);
    x = Math.max(workArea.x, Math.min(x, workArea.x + workArea.width - winSize[0]));

    // 垂直：托盘在屏幕上半部（macOS 菜单栏）→ 弹窗显示在图标下方；
    //       托盘在屏幕下半部（Windows / Linux 任务栏）→ 弹窗显示在图标上方。
    //       原实现固定“显示在下方”，在 Windows 上会把弹窗推到任务栏之下而不可见。
    const trayMidY = trayBounds.y + trayBounds.height / 2;
    let y;
    if (trayMidY < workArea.y + workArea.height / 2) {
        y = Math.round(trayBounds.y + trayBounds.height + 4); // 图标下方
    } else {
        y = Math.round(trayBounds.y - winSize[1] - 4);        // 图标上方
    }
    // 兜底：始终限制在工作区内，保证弹窗完全可见
    y = Math.max(workArea.y, Math.min(y, workArea.y + workArea.height - winSize[1]));

    trayWindow.setPosition(x, y, false);
}

function showTrayWindow(view) {
    if (!trayWindow || !tray) return;
    positionTrayWindow();
    trayWindow.webContents.send('show-' + view);
    trayWindow.show();
    trayWindow.focus();
}

function hideTrayWindow() {
    if (trayWindow && trayWindow.isVisible()) {
        trayWindow.hide();
    }
}

function createTray() {
    // 使用应用图标作为托盘图标（macOS 菜单栏不再显示“久坐”文字）
    const iconPath = path.join(__dirname, 'assets', 'jiuzuotixing.png');
    let icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
        // 兜底：16x16 深色实心圆模板图标
        icon = nativeImage.createFromBuffer(Buffer.from(
            '89504e470d0a1a0a0000000d49484452000000100000001008060000001ff3ff610000001a49444154789c636001000000050001a5f645400000000049454e44ae426082',
            'hex'
        ));
        icon.setTemplateImage(true);
    }

    // macOS 菜单栏：图标过大，缩小到菜单栏常规尺寸（数值可按需调整）
    if (process.platform === 'darwin') {
        icon = icon.resize({ width: 18, height: 18 });
    }

    tray = new Tray(icon);
    tray.setToolTip('久坐提醒');

    updateTrayMenu();

    // 点击托盘图标：显示并聚焦主窗口（不再隐藏；隐藏请用窗口关闭按钮或托盘菜单）
    tray.on('click', () => {
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

function updateTrayMenu() {
    const contextMenu = Menu.buildFromTemplate([
        {
            label: '显示主窗口',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                }
            }
        },
        {
            label: '隐藏主窗口',
            click: () => {
                if (mainWindow) {
                    mainWindow.hide();
                }
            }
        },
        {
            label: '检查更新',
            click: () => updater.checkUpdates(true)
        },
        { type: 'separator' },
        {
            label: '退出',
            accelerator: 'Cmd+Q',
            click: () => {
                isQuiting = true;
                app.quit();
            }
        }
    ]);

    if (tray) {
        tray.setContextMenu(contextMenu);
    }
}

// IPC：渲染进程通知弹出久坐提醒
ipcMain.on('show-sit-reminder', () => {
    showTrayWindow('sit');
});

// IPC：渲染进程启动/停止久坐计时（主进程接管，不受窗口隐藏节流影响）
// 监控时段配置（主进程据此决定是否计时）
let sitWindow = { enabled: true, start: '09:00', end: '18:00' };

function inWindow() {
    if (!sitWindow.enabled) return true;
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = sitWindow.start.split(':').map(Number);
    const [eh, em] = sitWindow.end.split(':').map(Number);
    const st = sh * 60 + sm, en = eh * 60 + em;
    return st <= en ? (cur >= st && cur < en) : (cur >= st || cur < en); // 支持跨夜时段
}

function tickSit() {
    if (!inWindow()) {
        // 时段外：倒计时重置为满，不累计久坐时长、不提醒
        const full = sitInterval * 60;
        if (sitRemain !== full) sitRemain = full;
        if (mainWindow) mainWindow.webContents.send('sit-window-paused', sitRemain);
        return;
    }
    sitRemain--;
    if (mainWindow) mainWindow.webContents.send('update-sit-sync', sitRemain);
    if (sitRemain <= 0) {
        clearInterval(sitTimer);
        sitTimer = null;
        mainWindow.webContents.send('tray-action', 'sit-time-up');
    }
}

function startSitTimer(interval) {
    sitInterval = interval;
    sitRemain = interval * 60;
    if (sitTimer) clearInterval(sitTimer);
    sitTimer = setInterval(tickSit, 1000);
}

ipcMain.on('set-sit-window', (event, cfg) => {
    if (cfg && typeof cfg === 'object') {
        sitWindow.enabled = !!cfg.enabled;
        if (cfg.start) sitWindow.start = String(cfg.start);
        if (cfg.end) sitWindow.end = String(cfg.end);
    }
});

ipcMain.on('start-sit-timer', (event, interval) => {
    startSitTimer(interval);
});

ipcMain.on('stop-sit-timer', () => {
    if (sitTimer) { clearInterval(sitTimer); sitTimer = null; }
});

ipcMain.on('restart-sit-timer', (event, interval) => {
    startSitTimer(interval);
});

// IPC：渲染进程通知弹出休息倒计时，主进程接管倒计时
ipcMain.on('show-rest-reminder', (event, restRem, restDuration) => {
    if (trayWindow && tray) {
        positionTrayWindow();
        trayWindow.webContents.send('show-rest', restRem, restDuration);
        trayWindow.show();
        trayWindow.focus();

        // 主进程接管倒计时
        restRemain = restRem;
        restTotal = restDuration * 60;
        if (restTimer) clearInterval(restTimer);
        restTimer = setInterval(() => {
            restRemain--;
            if (trayWindow && trayWindow.isVisible()) {
                trayWindow.webContents.send('update-rest', restRemain, restDuration);
            }
            // 同步给主窗口更新状态
            if (mainWindow) {
                mainWindow.webContents.send('update-rest-sync', restRemain);
            }
            if (restRemain <= 0) {
                clearInterval(restTimer);
                restTimer = null;
                hideTrayWindow();
                if (mainWindow) {
                    mainWindow.webContents.send('tray-action', 'rest-done');
                }
            }
        }, 1000);
    }
});

// IPC：关闭托盘弹窗
ipcMain.on('hide-tray-window', () => {
    hideTrayWindow();
});

// IPC：处理弹窗按钮操作
ipcMain.on('tray-action', (event, type) => {
    // 跳过休息或稍后提醒时，清除主进程倒计时
    if (type === 'skip' || type === 'dismiss') {
        if (restTimer) { clearInterval(restTimer); restTimer = null; }
    }
    hideTrayWindow();
    if (mainWindow) {
        mainWindow.webContents.send('tray-action', type);
    }
});

// 单实例锁
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (!mainWindow.isVisible()) {
                mainWindow.show();
            }
            mainWindow.focus();
        }
    });

    app.whenReady().then(() => {
        // Windows/Linux：移除默认应用菜单栏（File/Edit/View/Window/Help 等对本应用无效的项）
        if (process.platform !== 'darwin') {
            Menu.setApplicationMenu(null);
        }

        createWindow();
        createTrayWindow();
        createTray();

        // 初始化检查更新（启动后自动检查一次）
        updater.initUpdater(() => mainWindow);

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            } else {
                mainWindow.show();
                mainWindow.focus();
            }
        });

        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });
    });
}

app.on('before-quit', () => {
    isQuiting = true;
});
