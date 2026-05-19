$nodePath = "C:\Users\GEORGE\Downloads\node_temp\node-v20.12.2-win-x64"

Write-Host "🚀 Starting AbiliFit Backend & Frontend..." -ForegroundColor Cyan

Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PATH='$nodePath;' + `$env:PATH; cd backend; Write-Host 'Starting Backend...'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PATH='$nodePath;' + `$env:PATH; cd frontend; Write-Host 'Starting Frontend...'; npm run dev"
