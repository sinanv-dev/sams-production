@echo off
echo ===================================================
echo SAMS Git Initialization and GitHub Uploader
echo ===================================================
echo.

:: Check if git is available
where git >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Git command was not found on your system.
    echo Please install Git from https://git-scm.com/ and try again.
    echo.
    pause
    exit /b 1
)

echo [1/4] Initializing Git repository...
git init
if %ERRORLEVEL% neq 0 (
    echo Error: Git initialization failed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/4] Staging files for commit...
git add .
if %ERRORLEVEL% neq 0 (
    echo Error: Git add failed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/4] Creating initial production ready commit...
git commit -m "chore: prepare SAMS for production deployment"
if %ERRORLEVEL% neq 0 (
    echo Error: Git commit failed.
    pause
    exit /b %ERRORLEVEL%
)

git branch -M main

echo.
echo [4/4] Remote configuration
echo.
echo Please create a new repository on your GitHub account: https://github.com/new
echo Once created, copy the repository HTTPS or SSH URL (e.g., https://github.com/username/sams.git)
echo.
set /p REPO_URL="Paste your GitHub repository URL here: "

if "%REPO_URL%"=="" (
    echo Error: No repository URL provided.
    echo Git repository is initialized locally, but not pushed to GitHub.
    pause
    exit /b 1
)

echo Adding remote origin: %REPO_URL%
git remote remove origin >nul 2>nul
git remote add origin %REPO_URL%

echo.
echo Pushing codebase to GitHub...
git push -u origin main
if %ERRORLEVEL% neq 0 (
    echo Error: Push failed. Make sure you are authenticated with GitHub.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ===================================================
echo Codebase successfully committed and uploaded to GitHub!
echo ===================================================
pause
