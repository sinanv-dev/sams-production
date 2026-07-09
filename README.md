# SAMS (Student & Apartment Management System) - Production Deployment Guide

Welcome to the production deployment guide for the SAMS platform. This document will walk you through setting up, configuring, and deploying SAMS to production with zero coding required.

---

## Prerequisites

Before deploying the platform, ensure you have set up the following accounts:
1. **Firebase Account** (Google Cloud Platform Console)
2. **Razorpay Dashboard Account** (For secure rent & electricity bill collections)
3. **Gmail or SendGrid Account** (For automated notification emails)

Make sure you have installed:
- **Node.js** (v18 or newer recommended)
- **Firebase CLI** (Install globally using `npm install -g firebase-tools`)

---

## Step 1: Firebase Project Setup

1. Go to the [Firebase Console](https://console.firebase.google.com/) and click **Add project**.
2. Give your project a name (e.g. `sams-portal`).
3. Enable **Google Analytics** (optional, recommended for tracking page performance).
4. Inside your Firebase project dashboard, set up the following services:
   - **Authentication**: Enable **Email/Password** provider and **Phone** provider (for secure OTP logins).
   - **Firestore Database**: Create a database in **Production Mode** and select your preferred hosting region.
   - **Cloud Storage**: Set up a storage bucket for uploading room photos and resident documents.
   - **Hosting**: Initialize hosting settings.
5. In the project settings (gear icon), add a **Web App** to your project. Copy the provided configuration credentials.

---

## Step 2: Configure Environment Variables

### 1. Frontend Web App Config
In the root directory of your project, rename `.env.example` to `.env` and fill in the Firebase keys you copied in Step 1:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

### 2. Backend Cloud Functions Config
Open `.firebaserc` in the root folder and replace `your-firebase-project-id` with your actual Firebase Project ID:

```json
{
  "projects": {
    "default": "your-firebase-project-id"
  }
}
```

Next, configure your SMTP email and Razorpay credentials for the backend Cloud Functions. Open the terminal and run these commands to set the environment secrets for Firebase:

```bash
# 1. SMTP Email Server Config (for rent notifications)
firebase functions:secrets:set SMTP_USER="your-email@gmail.com"
firebase functions:secrets:set SMTP_PASS="your-email-app-password"

# 2. Razorpay Payment Keys
firebase functions:secrets:set RAZORPAY_KEY_ID="rzp_live_xxxxxxxxxxxx"
firebase functions:secrets:set RAZORPAY_KEY_SECRET="your_razorpay_secret_key"

# 3. Razorpay Webhook Secret (Matches the secret you input in Razorpay dashboard)
firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET="your_webhook_secret_signature"
```

---

## Step 3: Configure Razorpay Dashboard

1. Log into your **Razorpay Dashboard** (Live or Test mode).
2. Go to **Settings** -> **API Keys** -> Generate your Keys. Copy these to the secrets in Step 2.
3. Go to **Settings** -> **Webhooks** -> click **Add New Webhook**.
4. Set the **Webhook URL** to your Firebase trigger endpoint:
   `https://<your-region>-<your-project-id>.cloudfunctions.net/verifyRazorpayWebhook`
   *(Replace `<your-region>` with the function deployment region, e.g., `us-central1` and `<your-project-id>` with your Firebase project ID).*
5. Set the **Secret** (e.g. `sams_webhook_secret_2026`) and copy this to `RAZORPAY_WEBHOOK_SECRET` secret in Step 2.
6. Under **Active Events**, check the following checkbox:
   - `payment.captured`
7. Save the Webhook.

---

## Step 4: Deploy the Platform

Choose the automated script based on your operating system:

### On Windows
Double-click `deploy.bat` or run:
```cmd
deploy.bat
```

### On macOS / Linux
Run:
```bash
chmod +x deploy.sh
./deploy.sh
```

These scripts will:
1. Install all front-end and back-end dependencies.
2. Build the production React frontend bundle.
3. Deploy Firestore security rules, Cloud Storage rules, Cloud Functions, and the built website to Firebase Hosting.

---

## Step 5: CI/CD Deployment via GitHub Actions (Optional)

We have configured a GitHub Actions pipeline in `.github/workflows/deploy.yml`. To enable automated deployments on code pushes:

1. Create a GitHub repository and push your project.
2. Go to repository **Settings** -> **Secrets and variables** -> **Actions** -> Click **New repository secret**.
3. Add the following secrets matching your values:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `FIREBASE_TOKEN` *(Generate this locally by running `firebase login:ci` in your terminal)*
4. Once configured, pushing commits to the `main` or `master` branch will trigger an automated production build and deploy.

---

## Project Structure & Architecture

- `/src` - Frontend codebase (React + Vite + TailwindCSS + Lucide Icons)
  - `/src/firebase/db.ts` - Local Storage sandbox & Firebase queries handler
  - `/src/firebase/auth.ts` - Authentication logic (Password/Phone OTP login)
- `/functions` - Backend codebase (Firebase Cloud Functions Node.js runtime)
  - `functions/src/index.ts` - Scheduled rent billing CRON tasks, Razorpay Order creation, and webhook captures.
- `firestore.rules` - Firestore database access restrictions
- `storage.rules` - Storage upload/download folder authorization controls
