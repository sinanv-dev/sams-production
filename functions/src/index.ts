import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';

admin.initializeApp();
const db = admin.firestore();

// Nodemailer setup (transports via custom SMTP, e.g. SendGrid or Gmail)
const mailTransport = nodemailer.createTransport({
  service: 'gmail', // Swap with SendGrid or custom SMTP configuration
  auth: {
    user: process.env.SMTP_USER || 'notifications@sams.com',
    pass: process.env.SMTP_PASS || 'mock-password',
  },
});

// Initialize Razorpay client with secure keys
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'mock_key_id',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'mock_key_secret',
});


// Helper: Send email template
const sendNotificationEmail = async (email: string, subject: string, htmlContent: string) => {
  try {
    await mailTransport.sendMail({
      from: '"SAMS Notifications" <no-reply@sams.com>',
      to: email,
      subject: subject,
      html: htmlContent,
    });
    console.log(`Email notification successfully sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, error);
  }
};

// ── 1. DAILY SCHEDULED REMINDER (9:00 AM IST) ──────────────────────────────────
// Note: Indian Standard Time (IST) is UTC+5:30. 9:00 AM IST is 3:30 AM UTC.
export const dailyRentReminder = functions.pubsub
  .schedule('30 3 * * *') // Run daily at 3:30 AM UTC (9:00 AM IST)
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    console.log('Running SAMS daily rent reminder job...');
    const now = new Date();
    const dayOfMonth = now.getDate();

    // Query pending payments (rent)
    const paymentsSnapshot = await db
      .collection('payments')
      .where('type', '==', 'rent')
      .where('status', '==', 'pending')
      .get();

    for (const doc of paymentsSnapshot.docs) {
      const payment = doc.data();
      const userId = payment.customerId;

      // Fetch user profile to retrieve email and phone details
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) continue;
      const user = userDoc.data()!;

      const email = user.email;

      const dLeft = Math.ceil((new Date(payment.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const isOverdue = dLeft < 0;
      const daysOverdue = isOverdue ? Math.abs(dLeft) : 0;
      const lateFee = payment.lateFeeApplied || 500;
      const totalDue = payment.amount + (isOverdue ? lateFee : 0);

      let title = '';
      let msg = '';

      if (dayOfMonth === 1) {
        title = '🧾 Rent Invoice Generated';
        msg = `Your monthly rent invoice of ₹${payment.amount.toLocaleString('en-IN')} has been generated. Please complete payment before the due date (5th).`;
      } else if (dayOfMonth >= 2 && dayOfMonth <= 4) {
        title = 'Friendly Rent Reminder';
        msg = `Friendly reminder that your rent of ₹${payment.amount.toLocaleString('en-IN')} is due on the 5th.`;
      } else if (dayOfMonth === 5) {
        title = '⏰ Last Day to Pay Rent';
        msg = `Today is the last day to pay your rent. Please settle invoice of ₹${payment.amount.toLocaleString('en-IN')} to avoid late fees.`;
      } else if (dayOfMonth >= 6 && isOverdue) {
        title = '🔴 Rent Payment Overdue';
        msg = `Outstanding Rent: ₹${payment.amount.toLocaleString('en-IN')} | Late Fee: ₹${lateFee} | Total Due: ₹${totalDue.toLocaleString('en-IN')} | Days Overdue: ${daysOverdue}. Please settle immediately.`;
      }

      if (title && msg) {
        // A. Trigger in-app notification
        await db.collection('notifications').add({
          recipientId: userId,
          title,
          message: msg,
          read: false,
          createdAt: Date.now(),
          type: 'bill',
        });

        // B. Send Email Notification
        await sendNotificationEmail(
          email,
          title,
          `<div style="font-family: sans-serif; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <h2 style="color: #4f46e5;">${title}</h2>
            <p>${msg}</p>
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
            <a href="https://sams-portal.web.app/customer/rent" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Pay Rent Now</a>
          </div>`
        );
      }
    }
  });

// ── 2. 5th OF THE MONTH REMINDER (6:00 PM IST) ─────────────────────────────────
export const eveningRentReminder5th = functions.pubsub
  .schedule('0 12 5 * *') // Run on 5th of every month at 12:00 PM UTC (6:00 PM IST)
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    const paymentsSnapshot = await db
      .collection('payments')
      .where('type', '==', 'rent')
      .where('status', '==', 'pending')
      .get();

    for (const doc of paymentsSnapshot.docs) {
      const payment = doc.data();
      const userId = payment.customerId;
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) continue;
      const user = userDoc.data()!;

      const title = '⚠️ Rent Payment Pending';
      const msg = `Your rent of ₹${payment.amount.toLocaleString('en-IN')} is still pending. Please pay before midnight to avoid late fees.`;

      // In-app
      await db.collection('notifications').add({
        recipientId: userId,
        title,
        message: msg,
        read: false,
        createdAt: Date.now(),
        type: 'bill',
      });

      // Email
      await sendNotificationEmail(user.email, title, `<p>${msg}</p>`);
    }
  });

// ── 3. 5th OF THE MONTH REMINDER (10:00 PM IST) ────────────────────────────────
export const finalRentReminder5th = functions.pubsub
  .schedule('0 16 5 * *') // Run on 5th of every month at 4:00 PM UTC (10:00 PM IST)
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    const paymentsSnapshot = await db
      .collection('payments')
      .where('type', '==', 'rent')
      .where('status', '==', 'pending')
      .get();

    for (const doc of paymentsSnapshot.docs) {
      const payment = doc.data();
      const userId = payment.customerId;
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) continue;
      const user = userDoc.data()!;

      const lateFee = payment.lateFeeApplied || 500;
      const title = '🔴 Final Rent Reminder';
      const msg = `Final warning. Late fees of ₹${lateFee} will be applied after midnight. Please make payment immediately.`;

      // In-app
      await db.collection('notifications').add({
        recipientId: userId,
        title,
        message: msg,
        read: false,
        createdAt: Date.now(),
        type: 'bill',
      });

      // Email
      await sendNotificationEmail(user.email, title, `<p>${msg}</p>`);
    }
  });

// ── 4. SECURE RAZORPAY ORDER CREATION ENDPOINT ─────────────────────────────────
export const createRazorpayOrder = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated in production
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const { amount, paymentId, type } = data;
  if (!amount || !paymentId || !type) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing parameters.');
  }

  try {
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Razorpay accepts in paise
      currency: 'INR',
      receipt: `rec_${paymentId.slice(-8)}`,
      notes: {
        paymentId,
        type,
        userId: context.auth.uid,
      },
    });

    // Log the created order
    await db.collection('payment_logs').add({
      orderId: order.id,
      paymentId,
      amount,
      status: 'order_created',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { orderId: order.id };
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Razorpay order creation failed.');
  }
});

// ── 5. SECURE RAZORPAY WEBHOOK VERIFICATION ────────────────────────────────────
export const verifyRazorpayWebhook = functions.https.onRequest(async (req: any, res: any) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'your_webhook_secret';
  const signature = req.headers['x-razorpay-signature'] as string;

  const shasum = crypto.createHmac('sha256', secret);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest('hex');

  // Verify signature
  if (signature !== digest) {
    console.error('Razorpay signature mismatch.');
    res.status(400).send('Invalid signature');
    return;
  }

  console.log('Razorpay webhook verified successfully.');
  const event = req.body.event;

  if (event === 'payment.captured') {
    const payload = req.body.payload.payment.entity;
    const orderId = payload.order_id;
    const amount = payload.amount / 100; // back to Rupees
    const method = payload.method;
    const paymentId = payload.id;
    
    // Read notes written during order creation
    const orderEntity = req.body.payload.order?.entity;
    const notes = orderEntity?.notes || {};
    const refPaymentId = notes.paymentId;
    const paymentType = notes.type;
    const userId = notes.userId;

    if (refPaymentId && userId) {
      const paymentRef = db.collection('payments').doc(refPaymentId);

      // Update status to paid and log transactional details
      await db.runTransaction(async (transaction) => {
        transaction.update(paymentRef, {
          status: 'paid',
          paidAt: Date.now(),
          razorpayPaymentId: paymentId,
          razorpayOrderId: orderId,
          paymentMethod: method,
          signature: signature,
        });
      });

      // Update utility bill if matching
      if (paymentType === 'electricity') {
        const eBillsSnapshot = await db
          .collection('electricity_bills')
          .where('customerId', '==', userId)
          .get();
        // Match bill based on billing month
        const paymentDoc = await paymentRef.get();
        const paymentData = paymentDoc.data();
        if (paymentData) {
          const match = eBillsSnapshot.docs.find(doc => doc.data().billingMonth === paymentData.billingMonth);
          if (match) {
            await match.ref.update({
              status: 'paid',
              paidAt: Date.now(),
            });
          }
        }
      }

      // Notify the owner of the receipt
      const userDoc = await db.collection('users').doc(userId).get();
      const userName = userDoc.exists ? userDoc.data()?.displayName : 'Resident';
      
      await db.collection('notifications').add({
        recipientId: 'admin-id',
        title: 'Rent Collected (Razorpay)',
        message: `${userName} completed rent payment of ₹${amount} via ${method}.`,
        createdAt: Date.now(),
        type: 'bill',
      });

      // Log successful verification
      await db.collection('payment_logs').add({
        orderId,
        paymentId,
        amount,
        status: 'payment_verified',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  res.json({ status: 'ok' });
});
