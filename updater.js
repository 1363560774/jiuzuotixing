// updater.js — 应用内检查更新（封装 electron-updater）
const { app, Notification, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const path = require('path');

const RELEASE_URL = 'https://github.com/1363560774/jiuzuotixing/releases/latest';
const isMac = process.platform === 'darwin';
// 日志写到桌面，方便查找
const LOG_PATH = path.join(app.getPath('userData'), 'log', 'jiuzuotixing-updater.log');
const LOG_HINT = '（详情见 updater 日志，路径见日志首行）';

let manualCheck = false;
let initialized = false;
let getMainWindow = null;
let logStream = null;

function log(msg) {
    const line = '[' + new Date().toISOString() + '] ' + msg + '\n';
    try {
        if (!logStream) { fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true }); logStream = fs.createWriteStream(LOG_PATH, { flags: 'a' }); }
        logStream.write(line);
    } catch (e) { /* ignore */ }
    console.log('[updater]', msg);
}

function toastToWindow(msg, showWindow) {
    const win = getMainWindow ? getMainWindow() : null;
    if (win && !win.isDestroyed()) {
        try {
            if (showWindow && !win.isVisible()) win.show();
            win.webContents.send('update-toast', msg);
        } catch (e) {
            log('toast send failed: ' + (e && e.message));
        }
    } else {
        log('toast: no main window — ' + msg);
    }
}

function failToast(err) {
    log('FAIL: ' + (err && err.stack ? err.stack : (err && err.message ? err.message : err)));
    toastToWindow('检查更新失败' + LOG_HINT, true);
}

function notify(title, body, onClick) {
    if (!Notification.isSupported()) return;
    const n = new Notification({ title, body: body || '' });
    if (onClick) n.on('click', onClick);
    n.show();
}

function initUpdater(mainWindowGetter) {
    if (initialized) return;
    initialized = true;
    getMainWindow = typeof mainWindowGetter === 'function' ? mainWindowGetter : null;

    autoUpdater.logger = {
        debug: (m) => log('[debug] ' + m),
        info: (m) => log('[info] ' + m),
        warn: (m) => log('[warn] ' + m),
        error: (m) => log('[error] ' + m),
    };
    autoUpdater.autoDownload = !isMac;
    autoUpdater.autoInstallOnAppQuit = !isMac;
    log('==================================================');
    log('init: platform=' + process.platform + ' version=' + app.getVersion() + ' packaged=' + app.isPackaged);
    log('log file: ' + LOG_PATH);
    log('release url: ' + RELEASE_URL);

    autoUpdater.on('error', (err) => {
        log('event error: ' + (err && err.stack ? err.stack : (err && err.message)));
        if (manualCheck) { failToast(err); manualCheck = false; }
    });

    autoUpdater.on('update-available', (info) => {
        const ver = (info && info.version) ? info.version : '新版本';
        log('update-available: ' + ver);
        if (isMac) {
            toastToWindow('发现新版本 ' + ver + '，正在打开下载页…', manualCheck);
            notify('发现新版本 ' + ver, '点击前往下载', () => shell.openExternal(RELEASE_URL));
            if (manualCheck) shell.openExternal(RELEASE_URL);
        } else {
            toastToWindow('发现新版本 ' + ver + '，正在后台下载，完成后提醒安装', manualCheck);
            notify('发现新版本 ' + ver, '正在后台下载');
        }
        manualCheck = false;
    });

    autoUpdater.on('update-not-available', (info) => {
        log('update-not-available: feedVersion=' + (info && info.version));
        if (manualCheck) {
            toastToWindow('已是最新版本（v' + app.getVersion() + '）', true);
            manualCheck = false;
        }
    });

    autoUpdater.on('update-downloaded', (info) => {
        const ver = (info && info.version) ? (' v' + info.version) : '';
        log('update-downloaded: ' + ver);
        toastToWindow('新版本已下载' + ver + '，退出应用时将自动安装', false);
        notify('新版本已下载' + ver, '点击立即退出并安装', () => setImmediate(() => autoUpdater.quitAndInstall()));
    });

    setTimeout(() => runCheck(false), 3000);
}

function runCheck(manual) {
    if (manual) {
        manualCheck = true;
        toastToWindow('正在检查更新…', true);
    }
    if (!app.isPackaged) {
        log('skip: dev mode (未打包，跳过)');
        if (manual) { toastToWindow('开发模式：更新检查仅在打包后的应用中生效', true); manualCheck = false; }
        return;
    }
    log('checkForUpdates start (manual=' + !!manual + ')');
    try {
        const p = autoUpdater.checkForUpdates();
        if (p && typeof p.then === 'function') {
            p.then((r) => log('checkForUpdates resolved: ' + (r && r.updateInfo ? r.updateInfo.version : 'no update info')))
             .catch((e) => { if (manualCheck) { failToast(e); manualCheck = false; } });
        }
    } catch (e) {
        if (manualCheck) { failToast(e); manualCheck = false; }
    }
}

module.exports = { initUpdater, checkUpdates: runCheck };
