#!/bin/bash
set -e

echo "==================================================="
echo "SAMS Production Deployment Automated Script"
echo "==================================================="
echo

echo "[1/4] Installing root frontend dependencies..."
npm install

echo
echo "[2/4] Installing backend cloud functions dependencies..."
cd functions
npm install
cd ..

echo
echo "[3/4] Compiling frontend production build..."
npm run build

echo
echo "[4/4] Deploying to Firebase..."
echo "Protip: Make sure you have authenticated using 'firebase login' and mapped the correct project ID in '.firebaserc'."
firebase deploy

echo
echo "==================================================="
echo "SAMS platform successfully built and deployed!"
echo "==================================================="
