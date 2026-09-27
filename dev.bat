@echo off
cd /d "%~dp0"
echo Starting TableTapp Next.js Dev Server...
node.cmd .\node_modules\next\dist\bin\next dev --webpack
