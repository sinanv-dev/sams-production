# SAMS Cloud Functions & Razorpay Backend Integration

This directory contains the Firebase Cloud Functions backend implementation for the Smart Rent Reminder system and secure Razorpay payment integrations.

## Features Included

1. **Daily Scheduled Reminder (`dailyRentReminder`)**
   - Automatically runs every day at **9:00 AM IST** (3:30 AM UTC).
   - Evaluates pending rent invoices and triggers In-App Notifications and Emails for unpaid invoices.
   
2. **5th of Month Reminders**
   - `eveningRentReminder5th`: Runs at **6:00 PM IST** on the 5th (Due Day).
   - `finalRentReminder5th`: Runs at **10:00 PM IST** on the 5th (Final warnings before late fee).

3. **Secure Order Creation (`createRazorpayOrder`)**
   - Callable HTTPS Function called securely by the React client.
   - Generates the official Razorpay Order ID and returns it for the checkout widget.

4. **Razorpay Webhook Verification (`verifyRazorpayWebhook`)**
   - HTTP Endpoint that receives callbacks directly from Razorpay.
   - Cryptographically verifies the signature (`x-razorpay-signature`) using the Webhook Secret key.
   - Transitions Firestore document states only after server-side validation completes.

---

## Deployment Steps

### 1. Upgrade Firebase Project to Blaze Plan
Firebase requires you to upgrade to the **Pay-as-you-go (Blaze) plan** to deploy Cloud Functions, use Cloud Scheduler, or make outbound requests to external APIs (like Razorpay and SMTP servers).

### 2. Enable Phone Authentication
In the [Firebase Console](https://console.firebase.google.com/):
1. Navigate to **Authentication** > **Sign-in method**.
2. Select **Phone** and enable it.
3. Add your web app domain (e.g. `localhost` or custom domain) to the **Authorized Domains** list.

### 3. Initialize/Deploy Functions
From the project root:
```bash
# Install Firebase CLI if you haven't already
npm install -g firebase-tools

# Log in to your Firebase account
firebase login

# Set active project
firebase use --add

# Deploy the functions
firebase deploy --only functions
```

### 4. Configure Environment Variables
You can set your keys via the Firebase CLI:
```bash
firebase functions:config:set razorpay.key_id="YOUR_RAZORPAY_KEY_ID" \
                              razorpay.key_secret="YOUR_RAZORPAY_KEY_SECRET" \
                              razorpay.webhook_secret="YOUR_WEBHOOK_SECRET" \
                              smtp.user="notifications@sams.com" \
                              smtp.pass="SMTP_PASSWORD"
```

### 5. Setup Razorpay Webhook
In your Razorpay Dashboard:
1. Navigate to **Settings** > **Webhooks**.
2. Add a new Webhook and enter your Cloud Function endpoint URL (generated after deployment).
3. Set the Secret key to match `razorpay.webhook_secret` configured above.
4. Select the event `payment.captured`.
