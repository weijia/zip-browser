@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
title Local ZIP Browser Launcher

rem ===== Settings: change PORT here if 4173 is already used =====
set "PORT=4173"
set "URL=http://127.0.0.1:%PORT%/"
set "NPM_REGISTRY=https://registry.npmmirror.com"
set "NO_BROWSER="
if /i "%~1"=="--no-browser" set "NO_BROWSER=1"

echo.
echo  ==========================================================
echo   Local ZIP Browser - disks and encrypted ZIP explorer
echo  ==========================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo  [ERROR] Node.js was not found in PATH.
  echo          Please install Node.js 18+ from https://nodejs.org/
  echo.
  if not defined NO_BROWSER pause
  exit /b 1
)
for /f "delims=" %%v in ('node -v') do set "NODEVER=%%v"
echo  [1/3] Runtime      : !NODEVER!

if exist "node_modules\@zip.js\zip.js\package.json" (
  echo  [2/3] Dependencies : OK
) else (
  echo  [2/3] Installing dependencies, please wait ...
  call npm install --registry=%NPM_REGISTRY% --no-audit --no-fund
  if errorlevel 1 (
    echo  [ERROR] npm install failed. Run "npm install" manually in this folder.
    echo.
    if not defined NO_BROWSER pause
    exit /b 1
  )
  echo  [2/3] Dependencies : installed
)

rem ===== Probe: is OUR server already listening on this port? =====
set "READY=0"
node -e "require('http').get('%URL%',r=>{let s='';r.on('data',d=>s+=d);r.on('end',()=>process.exit(r.statusCode===200?(s.includes('__LOCAL_TOKEN__')?0:1):1))}).on('error',()=>process.exit(1))" >nul 2>nul
if not errorlevel 1 set "READY=1"

if "!READY!"=="1" (
  echo  [3/3] Server       : already running on port %PORT%
) else (
  echo  [3/3] Server       : starting in a minimized window ...
  start "ZipBrowserServer" /min cmd /k node server\index.js
  for /L %%i in (1,1,25) do (
    if "!READY!"=="0" (
      ping -n 2 127.0.0.1 >nul
      node -e "require('http').get('%URL%',r=>{let s='';r.on('data',d=>s+=d);r.on('end',()=>process.exit(r.statusCode===200?(s.includes('__LOCAL_TOKEN__')?0:1):1))}).on('error',()=>process.exit(1))" >nul 2>nul
      if not errorlevel 1 set "READY=1"
    )
  )
)

echo.
if "!READY!"=="0" (
  echo  [WARN] Server did not respond within 25 seconds.
  echo         Check the minimized "ZipBrowserServer" window for errors.
) else (
  echo  [OK]   !URL!
  echo.
  echo  To stop: close the "ZipBrowserServer" window, or run stop.bat
  if not defined NO_BROWSER start "" "!URL!"
)
echo.
if not defined NO_BROWSER timeout /t 5 /nobreak >nul 2>nul
exit /b 0
