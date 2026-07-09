import { getPayments, createNotification } from '../firebase/db';
import { Payment } from '../types';

export const runRentReminderEngine = async (userId: string, displayName: string) => {
  try {
    const allPayments = await getPayments();
    // Filter rent payments belonging to this user that are pending
    const pendingRent = allPayments.filter(
      (p) => p.customerId === userId && p.type === 'rent' && p.status === 'pending'
    );

    if (pendingRent.length === 0) {
      return; // No pending rent, stop reminding
    }

    const now = new Date();
    const day = now.getDate();
    const hour = now.getHours();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const todayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Determine current slot
    let slot = '';
    if (day === 5) {
      if (hour >= 22) {
        slot = '10PM';
      } else if (hour >= 18) {
        slot = '6PM';
      } else if (hour >= 9) {
        slot = '9AM';
      }
    } else {
      // For any other day, trigger daily check after 9 AM
      if (hour >= 9) {
        slot = '9AM';
      }
    }

    if (!slot) return; // Not in a reminder window yet today

    for (const payment of pendingRent) {
      const billingMonth = payment.billingMonth;
      const reminderKey = `sams_reminder_sent_${userId}_${billingMonth}_${todayStr}_${slot}`;
      
      // Check if already reminded for this slot today
      if (localStorage.getItem(reminderKey)) {
        continue;
      }

      // Calculate parameters
      const dLeft = Math.ceil((new Date(payment.dueDate).getTime() - Date.now()) / 86400000);
      const isOverdue = dLeft < 0;
      const daysOverdue = isOverdue ? Math.abs(dLeft) : 0;
      const lateFee = payment.lateFeeApplied || 500;
      const totalDue = payment.amount + (isOverdue ? lateFee : 0);

      let title = '';
      let message = '';

      if (day === 1) {
        title = '🧾 Rent Invoice Generated';
        message = `Your monthly rent invoice of ₹${payment.amount.toLocaleString('en-IN')} has been generated. Please complete payment before the due date (5th).`;
      } else if (day >= 2 && day <= 4) {
        title = '🔔 Friendly Rent Reminder';
        message = `Friendly reminder that your rent of ₹${payment.amount.toLocaleString('en-IN')} is due on the 5th.`;
      } else if (day === 5) {
        if (slot === '9AM') {
          title = '⏰ Last Day to Pay Rent';
          message = `Today is the last day to pay your rent. Please settle invoice of ₹${payment.amount.toLocaleString('en-IN')} to avoid late fees.`;
        } else if (slot === '6PM') {
          title = '⚠️ Rent Payment Pending';
          message = `Your rent is still pending. Please pay before midnight to avoid late fees.`;
        } else if (slot === '10PM') {
          title = '🔴 Final Rent Reminder';
          message = `Final reminder. Late fees of ₹${lateFee} will be applied after midnight.`;
        }
      } else if (day >= 6 && isOverdue) {
        title = '🔴 Rent Payment Overdue';
        message = `Outstanding: ₹${payment.amount.toLocaleString('en-IN')} | Late Fee: ₹${lateFee} | Total Due: ₹${totalDue.toLocaleString('en-IN')} | Days Overdue: ${daysOverdue}. Please pay immediately.`;
      }

      if (title && message) {
        // Send In-App Notification
        await createNotification({
          recipientId: userId,
          title,
          message,
          type: 'bill'
        });

        // Mark as sent in localStorage
        localStorage.setItem(reminderKey, 'true');
        console.log(`[SAMS Reminder Engine] Triggered: "${title}"`);
      }
    }
  } catch (error) {
    console.error('Error running rent reminder engine:', error);
  }
};
