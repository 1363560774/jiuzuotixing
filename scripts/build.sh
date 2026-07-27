#!/usr/bin/env bash
# 久坐提醒 —— 跨平台打包脚本（macOS + Windows）
#
# 用法:
#   bash scripts/build.sh            # 默认：同时打包 macOS 与 Windows
#   bash scripts/build.sh mac        # 仅 macOS (dmg, arm64)
#   bash scripts/build.sh win        # 仅 Windows (nsis, x64)
#
# 说明: Windows 使用 NSIS 目标，可在 macOS 上交叉打包，无需 Wine。

set -euo pipefail

# 切换到项目根目录（脚本位于 scripts/ 下）
cd "$(dirname "$0")/.."

TARGET="${1:-all}"
EB="node_modules/.bin/electron-builder"

# 彩色输出
info() { printf "\033[1;34m[INFO]\033[0m %s\n" "$1"; }
ok()   { printf "\033[1;32m[ OK ]\033[0m %s\n" "$1"; }
err()  { printf "\033[1;31m[ERR ]\033[0m %s\n" "$1"; }

# 1. 依赖检查
if [ ! -d "node_modules" ]; then
  info "未检测到 node_modules，正在执行 npm install ..."
  npm install
fi

if [ ! -x "$EB" ]; then
  err "未找到 electron-builder，请先运行 npm install"
  exit 1
fi

# 2. 清理旧产物
info "清理 dist/ ..."
rm -rf dist

# 3. 按目标打包
case "$TARGET" in
  mac)
    info "开始打包 macOS (dmg, arm64) ..."
    "$EB" --mac
    ;;
  win)
    info "开始打包 Windows (nsis, x64) ..."
    "$EB" --win
    ;;
  all)
    info "开始打包 macOS + Windows ..."
    "$EB" --mac --win
    ;;
  *)
    err "未知目标: $TARGET （可选: mac | win | all）"
    exit 1
    ;;
esac

# 4. 汇报产物
ok "打包完成！dist/ 目录内容："
if compgen -G "dist/*" >/dev/null 2>&1; then
  ls -1 dist | sed 's/^/    /'
else
  info "（dist/ 为空，请检查上方构建日志）"
fi
