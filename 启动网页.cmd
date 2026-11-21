@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title 回忆成调 - 使用时请保留此窗口
if not exist "runtime\node.exe" (
  echo 缺少运行环境。请先完整解压 Windows 版压缩包，不要只复制本文件。
  pause
  exit /b 1
)
"runtime\node.exe" "scripts\launch-windows.cjs"
if errorlevel 1 pause
endlocal
