@echo off
REM ============================================================
REM Mi Dia - End-of-day project update (runs the skill headless)
REM Launched daily at 21:00 by Windows Task Scheduler.
REM < NUL  -> gives empty stdin so claude does not wait for input
REM ============================================================
setlocal
set "PROJ=C:\Users\Ines\Desktop\Mi-Dia-App"
set "CLAUDE=C:\Users\Ines\AppData\Roaming\npm\claude.cmd"
set "LOGDIR=%PROJ%\.claude\logs"

cd /d "%PROJ%"
if not exist "%LOGDIR%" mkdir "%LOGDIR%"

for /f "tokens=1-3 delims=/-. " %%a in ("%date%") do set "STAMP=%%c-%%b-%%a"
set "LOG=%LOGDIR%\actualizare-%STAMP%.log"

echo ================ RUN %date% %time% ================ >> "%LOG%"
call "%CLAUDE%" -p "/actualizare-zilnica" --dangerously-skip-permissions < NUL >> "%LOG%" 2>&1
echo ================ END  %date% %time% ================ >> "%LOG%"
endlocal
