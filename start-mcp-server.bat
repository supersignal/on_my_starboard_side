@echo off
chcp 949 > nul

REM NicePay MCP server startup script
echo.
echo Starting NicePay developers MCP server...
echo Working directory: %cd%
echo.

REM Check if build exists
if not exist "dist\server.js" (
    echo Building the server...
    npm run build
    echo.
)

REM Run the server
echo MCP server is running...
echo Waiting for connection from Cursor...
echo.
node dist\server.js