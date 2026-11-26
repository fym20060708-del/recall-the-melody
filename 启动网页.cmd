@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title 回忆成调 - 使用时请保留此窗口
if exist "runtime\node.exe" (
  "runtime\node.exe" "scripts\launch-windows.cjs"
) else (
  where node >nul 2>nul
  if errorlevel 1 (
    echo 未找到 Node.js。请安装 Node.js 24.14 或更高版本，或完整解压 Windows 版安装包。
    pause
    exit /b 1
  )
  node "scripts\launch-windows.cjs"
)
if errorlevel 1 pause
endlocal
