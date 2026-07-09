@echo off
echo ===================================================
echo SAMS Production Deployment Automated Script
echo ===================================================
echo.

echo [1/4] Installing root frontend dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo Error: Frontend npm install failed.
    exit /b %ERRORLEVEL%
)

echo.
echo [2/4] Installing backend cloud functions dependencies...
cd functions
call npm install
if %ERRORLEVEL% neq 0 (
    echo Error: Functions npm install failed.
    cd ..
    exit /b %ERRORLEVEL%
)
cd ..

echo.
echo [3/4] Compiling frontend production build...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo Error: Frontend production build failed.
    exit /b %ERRORLEVEL%
)

echo.
echo [4/4] Deploying to Firebase...
echo Protip: Make sure you have authenticated using "firebase login" and mapped the correct project ID in ".firebaserc".
call firebase deploy
if %ERRORLEVEL% neq 0 (
    echo Error: Firebase deployment failed.
    exit /b %ERRORLEVEL%
)

echo.
echo ===================================================
echo SAMS platform successfully built and deployed!
echo ===================================================
pause
