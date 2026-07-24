// 生成 16x16 模板图标 PNG（椅子简化图形）
const fs = require('fs');
const path = require('path');

// 最小化的 16x16 黑色实心圆点 PNG（template image）
// macOS 会自动适配深色/浅色模式
const PNG_BASE64 =
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAA' +
    'JUlEQVR4nO3OQQ0AIBADwYJ9R5kCJE3TzEwA/r9wT5oBAAAAAAAAAAAAAAAAAAAAAAAAAAB4LqAB' +
    'd8EFWmk5M0IAAAAASUVORK5CYII=';

const outDir = path.join(__dirname, 'assets');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

fs.writeFileSync(path.join(outDir, 'trayIcon.png'), Buffer.from(PNG_BASE64, 'base64'));
console.log('图标已生成: assets/trayIcon.png');
