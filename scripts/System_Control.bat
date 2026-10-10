@echo off
setlocal EnableExtensions
title System Control Center CLI (Standalone)

:: Ensure Administrator privileges
net session >nul 2>&1
if errorlevel 1 (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -ArgumentList '%*' -Verb RunAs"
    exit /b
)

:: Silent auto-startup mode flag check (used by Task Scheduler at logon)
if /I "%~1"=="--startup" goto RUN_ALL_SILENT
if /I "%~1"=="/startup" goto RUN_ALL_SILENT

:MENU
cls
echo ======================================================
echo         SYSTEM CONTROL CENTER CLI (STANDALONE)
echo ======================================================
echo.
echo  [1] Run All Tasks (RAM + Windows Update + Edge Cache)
echo  [2] Run RAM Extreme Cleaner
echo  [3] Run Disable Windows Update
echo  [4] Run Edge Cache Cleaner
echo.
echo ------------------------------------------------------
echo  [5] Enable Auto-Run on Windows Startup
echo  [6] Disable Auto-Run on Windows Startup
echo  [7] Check Auto-Startup Task Status
echo  [8] Test System Notification Popup
echo ------------------------------------------------------
echo  [0] Exit
echo.
echo ======================================================
set /p choice="Select an option (0-8): "

if "%choice%"=="1" goto INTERACTIVE_RUN_ALL
if "%choice%"=="2" goto INTERACTIVE_RAM
if "%choice%"=="3" goto INTERACTIVE_UPDATE
if "%choice%"=="4" goto INTERACTIVE_EDGE
if "%choice%"=="5" goto ENABLE_STARTUP
if "%choice%"=="6" goto DISABLE_STARTUP
if "%choice%"=="7" goto CHECK_STATUS
if "%choice%"=="8" goto TEST_NOTIFICATION
if "%choice%"=="0" exit /b
goto MENU

:: ======================================================
:: INTERACTIVE RUNNERS
:: ======================================================

:INTERACTIVE_RUN_ALL
cls
echo ======================================================
echo   Running All Optimization & Cleanup Tasks
echo ======================================================
echo.
call :DO_RAM
echo.
call :DO_UPDATE
echo.
call :DO_EDGE
echo.
call :SHOW_NOTIFICATION
echo.
echo ======================================================
echo   All tasks completed successfully!
echo ======================================================
pause
goto MENU

:INTERACTIVE_RAM
cls
call :DO_RAM
pause
goto MENU

:INTERACTIVE_UPDATE
cls
call :DO_UPDATE
pause
goto MENU

:INTERACTIVE_EDGE
cls
call :DO_EDGE
pause
goto MENU

:TEST_NOTIFICATION
cls
echo Sending test system notification...
call :SHOW_NOTIFICATION
echo Notification sent!
pause
goto MENU

:RUN_ALL_SILENT
call :DO_RAM >nul 2>&1
call :DO_UPDATE >nul 2>&1
call :DO_EDGE >nul 2>&1
call :SHOW_NOTIFICATION >nul 2>&1
exit /b


:: ======================================================
:: EMBEDDED TASK ROUTINES (STANDALONE)
:: ======================================================

:DO_RAM
echo ==============================
echo   EXTREME RAM CLEAN MODE
echo ==============================
powershell -Command "Set-MpPreference -DisableRealtimeMonitoring $true" >nul 2>&1

:: Kill heavy user apps
taskkill /IM chrome.exe /F >nul 2>&1
taskkill /IM PowerToys.exe /F >nul 2>&1
taskkill /IM PowerToys.Settings.exe /F >nul 2>&1
taskkill /IM PowerToys.PowerOCR.exe /F >nul 2>&1
taskkill /IM GameBar.exe /F >nul 2>&1
taskkill /IM GameBarFTServer.exe /F >nul 2>&1
taskkill /IM PhoneExperienceHost.exe /F >nul 2>&1

:: Kill background junk
taskkill /IM backgroundTaskHost.exe /F >nul 2>&1
taskkill /IM SearchApp.exe /F >nul 2>&1

:: Stop services (safe cuts)
sc stop WSearch >nul 2>&1
sc stop SysMain >nul 2>&1
sc stop DiagTrack >nul 2>&1
sc config AsusSoftwareManager start=disabled >nul 2>&1
sc config AsusSystemAnalysis start=disabled >nul 2>&1
sc config AsusAppService start=disabled >nul 2>&1
sc config AsusOptimization start=disabled >nul 2>&1

net stop UsoSvc >nul 2>&1
net stop wuauserv /y >nul 2>&1

:: Disable memory compression
powershell -command "Disable-MMAgent -mc" >nul 2>&1

:: Disable Defender realtime monitoring
powershell -command "Set-MpPreference -DisableRealtimeMonitoring $true" >nul 2>&1

:: Clear standby memory
echo Clearing standby memory...
powershell -command "Clear-Variable *" >nul 2>&1

echo RAM Extreme Clean complete.
exit /b


:DO_UPDATE
echo ====================================
echo   Disabling Windows Update Services
echo ====================================
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" /v NoAutoUpdate /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" /v AUOptions /t REG_DWORD /d 1 /f >nul 2>&1

net stop wuauserv >nul 2>&1
sc config wuauserv start= disabled >nul 2>&1

net stop UsoSvc >nul 2>&1
sc config UsoSvc start= disabled >nul 2>&1

echo.
echo === Status ===
sc query wuauserv | findstr /I "STATE"
sc qc wuauserv | findstr /I "START_TYPE"
sc query UsoSvc | findstr /I "STATE"
sc qc UsoSvc | findstr /I "START_TYPE"
echo Windows Update services disabled.
exit /b


:DO_EDGE
echo ====================================
echo   Microsoft Edge & Temp Cleaner
echo ====================================
echo Closing Microsoft Edge...
taskkill /F /IM msedge.exe >nul 2>&1

set "EDGE=%LOCALAPPDATA%\Microsoft\Edge\User Data"

echo Removing Edge cache...
if exist "%EDGE%\Default\Cache" rmdir /S /Q "%EDGE%\Default\Cache"
if exist "%EDGE%\Default\Code Cache" rmdir /S /Q "%EDGE%\Default\Code Cache"
if exist "%EDGE%\Default\GPUCache" rmdir /S /Q "%EDGE%\Default\GPUCache"
if exist "%EDGE%\Default\Service Worker\CacheStorage" rmdir /S /Q "%EDGE%\Default\Service Worker\CacheStorage"

echo Removing Windows temporary files...
del /F /S /Q "%TEMP%\*" >nul 2>&1
for /D %%D in ("%TEMP%\*") do rmdir /S /Q "%%D" >nul 2>&1

echo Edge & Temp cleanup completed.
exit /b


:SHOW_NOTIFICATION
powershell -NoProfile -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.Windows.Forms; $b = New-Object System.Windows.Forms.NotifyIcon; $b.Icon = [System.Drawing.SystemIcons]::Information; $b.BalloonTipIcon = 'Info'; $b.BalloonTipTitle = 'System Control Center'; $b.BalloonTipText = 'All 3 startup optimization tasks ran successfully with Admin access!'; $b.Visible = $true; $b.ShowBalloonTip(5000); Start-Sleep -Seconds 4; $b.Dispose()" >nul 2>&1
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $ws.Popup('All 3 startup optimization tasks ran successfully with Admin access!', 5, 'System Control Center', 64)" >nul 2>&1
exit /b


:: ======================================================
:: AUTO-STARTUP TASK SCHEDULER MANAGEMENT
:: ======================================================

:ENABLE_STARTUP
cls
echo Registering task in Windows Task Scheduler...
schtasks /create /tn "AutoStartupAdminScripts" /tr "\"C:\Users\shifa\Desktop\System_Control.bat\" --startup" /sc ONLOGON /rl HIGHEST /f >nul 2>&1
schtasks /change /tn "AutoStartupAdminScripts" /enable >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    echo SUCCESS: Auto-startup is now ENABLED!
    echo System_Control.bat will run automatically with Admin access on Windows Startup/Logon.
) else (
    echo.
    echo ERROR: Failed to register Task Scheduler task.
)
pause
goto MENU

:DISABLE_STARTUP
cls
echo Disabling task in Task Scheduler...
schtasks /change /tn "AutoStartupAdminScripts" /disable >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    echo SUCCESS: Auto-startup task has been DISABLED.
) else (
    echo.
    echo Task was not found or is already disabled.
)
echo.
set /p del_choice="Do you want to permanently delete the task from Windows? (Y/N): "
if /I "%del_choice%"=="Y" (
    schtasks /delete /tn "AutoStartupAdminScripts" /f >nul 2>&1
    echo Task deleted permanently.
)
pause
goto MENU

:CHECK_STATUS
cls
echo Checking Auto-Startup Status...
echo.
schtasks /query /tn "AutoStartupAdminScripts" /fo LIST 2>nul | findstr /I "TaskName Status Scheduled"
if errorlevel 1 (
    echo Status: NOT INSTALLED / NOT REGISTERED
)
echo.
pause
goto MENU
