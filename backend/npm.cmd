@echo off
set "PATH=C:\Users\GEORGE\Downloads\node_temp\node-v20.12.2-win-x64;%PATH%"

:: Ensure the Linux database is running so we don't get ECONNREFUSED
wsl -u root service postgresql start >nul 2>&1

:: Execute the real npm command
"C:\Users\GEORGE\Downloads\node_temp\node-v20.12.2-win-x64\npm.cmd" %*
