@echo off
setlocal
set "DR_PROJECT=%~dp0"
if exist "%DR_PROJECT%scripts\start-lan.mjs" goto found
set "DR_PROJECT=%~dp0COdex\dr-strategy-tracker-ai-research\"
if exist "%DR_PROJECT%scripts\start-lan.mjs" goto found
echo [DR] Cannot find the DR project. Keep this launcher in the project folder or on this Desktop.
pause
exit /b 1

:found
pushd "%DR_PROJECT%"
if errorlevel 1 exit /b 1
if /I "%~1"=="--check" goto check
node scripts/start-lan.mjs %*
set "DR_EXIT=%ERRORLEVEL%"
popd
pause
exit /b %DR_EXIT%

:check
node -e "const fs=require('fs');const p=require('./package.json');if(p.name!=='dr-strategy-tracker'||!fs.existsSync('scripts/start-lan.mjs'))process.exit(1);console.log('[DR] Launcher OK: '+process.cwd());"
set "DR_EXIT=%ERRORLEVEL%"
popd
exit /b %DR_EXIT%
