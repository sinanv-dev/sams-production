#!/bin/bash
set -e

echo "==================================================="
echo "SAMS Git Initialization and GitHub Uploader"
echo "==================================================="
echo

# Check if git is available
if ! command -v git &> /dev/null
then
    echo "[ERROR] Git command was not found on your system."
    echo "Please install Git and try again."
    exit 1
fi

echo "[1/4] Initializing Git repository..."
git init

echo
echo "[2/4] Staging files for commit..."
git add .

echo
echo "[3/4] Creating initial production ready commit..."
git commit -m "chore: prepare SAMS for production deployment"

git branch -M main

echo
echo "[4/4] Remote configuration"
echo
echo "Please create a new repository on your GitHub account: https://github.com/new"
echo "Once created, copy the repository HTTPS or SSH URL (e.g., https://github.com/username/sams.git)"
echo
read -p "Paste your GitHub repository URL here: " REPO_URL

if [ -z "$REPO_URL" ]
then
    echo "Error: No repository URL provided."
    echo "Git repository is initialized locally, but not pushed to GitHub."
    exit 1
fi

echo "Adding remote origin: $REPO_URL"
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"

echo
echo "Pushing codebase to GitHub..."
git push -u origin main

echo
echo "==================================================="
echo "Codebase successfully committed and uploaded to GitHub!"
echo "==================================================="
