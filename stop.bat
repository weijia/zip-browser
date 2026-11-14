@echo off
setlocal
title Local ZIP Browser - Stop

rem ===== Keep this in sync with PORT in start.bat =====
set "PORT=4173"

echo.
echo  Stopping Local ZIP Browser ...
taskkill /FI "WINDOWTITLE eq ZipBrowserServer*" /T /F >nul 2>nul
if errorlevel 1 (
  echo  [i] No launcher window found. The server may have been started with "npm start".
  netstat -ano | findstr /r /c:"127.0.0.1:%PORT% .*LISTENING" /c:"0.0.0.0:%PORT% .*LISTENING" >nul 2>nul
  if not errorlevel 1 (
    echo  [i] Port %PORT% is still listening. Close that console window manually.
  ) else (
    echo  [i] Nothing is listening on port %PORT%.
  )
) else (
  echo  [OK] Server stopped.
)
echo.
timeout /t 4 /nobreak >nul 2>nul
exit /b 0
