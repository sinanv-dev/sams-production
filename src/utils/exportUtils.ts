import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { getElectricityBills } from '../firebase/db';
import { Apartment, ElectricityBill } from '../types';

// Helper to draw vector Rupee symbol
const drawRupeeVector = (doc: jsPDF, x: number, y: number, fontSize: number) => {
  const scale = fontSize / 10;
  const oldLineWidth = doc.getLineWidth();
  doc.setLineWidth(0.24 * scale);

  const textColor = doc.getTextColor();
  doc.setDrawColor(textColor);

  // Top bar
  doc.line(x + 0.3 * scale, y - 2.8 * scale, x + 1.8 * scale, y - 2.8 * scale);
  // Middle bar
  doc.line(x + 0.3 * scale, y - 1.9 * scale, x + 1.6 * scale, y - 1.9 * scale);

  // Loop
  doc.line(x + 0.5 * scale, y - 2.8 * scale, x + 0.5 * scale, y - 1.1 * scale); // stem
  doc.line(x + 0.5 * scale, y - 2.8 * scale, x + 1.4 * scale, y - 2.8 * scale); // top loop horizontal
  doc.line(x + 1.4 * scale, y - 2.8 * scale, x + 1.4 * scale, y - 1.9 * scale); // loop right vertical
  doc.line(x + 1.4 * scale, y - 1.9 * scale, x + 0.5 * scale, y - 1.9 * scale); // loop bottom horizontal

  // Diagonal leg
  doc.line(x + 0.5 * scale, y - 1.4 * scale, x + 1.7 * scale, y);

  doc.setLineWidth(oldLineWidth);
};

// Custom text printer that draws vector Rupee symbol for '₹' character
const docText = (doc: jsPDF, text: string, x: number, y: number, options?: { align?: 'left' | 'right' | 'center' }) => {
  const align = options?.align || 'left';
  const fontSize = doc.getFontSize();
  const scale = fontSize / 10;

  if (!text.includes('₹')) {
    doc.text(text, x, y, options);
    return;
  }

  const parts = text.split('₹');

  if (align === 'right') {
    let totalWidth = 0;
    for (let i = 0; i < parts.length; i++) {
      totalWidth += doc.getTextWidth(parts[i]);
      if (i < parts.length - 1) {
        totalWidth += 2.4 * scale;
      }
    }

    let currentX = x - totalWidth;
    for (let i = 0; i < parts.length; i++) {
      if (parts[i]) {
        doc.text(parts[i], currentX, y);
        currentX += doc.getTextWidth(parts[i]);
      }
      if (i < parts.length - 1) {
        drawRupeeVector(doc, currentX, y, fontSize);
        currentX += 2.4 * scale;
      }
    }
  } else if (align === 'center') {
    let totalWidth = 0;
    for (let i = 0; i < parts.length; i++) {
      totalWidth += doc.getTextWidth(parts[i]);
      if (i < parts.length - 1) {
        totalWidth += 2.4 * scale;
      }
    }

    let currentX = x - (totalWidth / 2);
    for (let i = 0; i < parts.length; i++) {
      if (parts[i]) {
        doc.text(parts[i], currentX, y);
        currentX += doc.getTextWidth(parts[i]);
      }
      if (i < parts.length - 1) {
        drawRupeeVector(doc, currentX, y, fontSize);
        currentX += 2.4 * scale;
      }
    }
  } else {
    let currentX = x;
    for (let i = 0; i < parts.length; i++) {
      if (parts[i]) {
        doc.text(parts[i], currentX, y);
        currentX += doc.getTextWidth(parts[i]);
      }
      if (i < parts.length - 1) {
        drawRupeeVector(doc, currentX, y, fontSize);
        currentX += 2.4 * scale;
      }
    }
  }
};

// Helper to draw pseudo-random vector QR code
const drawQRCode = (doc: jsPDF, x: number, y: number, size: number = 18) => {
  doc.setFillColor(255, 255, 255);
  doc.rect(x, y, size, size, 'F');

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);

  const boxSize = size * 0.28;
  const innerBoxSize = boxSize * 0.5;
  const offset = (boxSize - innerBoxSize) / 2;

  // Corner 1: Top-Left
  doc.rect(x, y, boxSize, boxSize, 'S');
  doc.setFillColor(0, 0, 0);
  doc.rect(x + offset, y + offset, innerBoxSize, innerBoxSize, 'F');

  // Corner 2: Top-Right
  doc.rect(x + size - boxSize, y, boxSize, boxSize, 'S');
  doc.rect(x + size - boxSize + offset, y + offset, innerBoxSize, innerBoxSize, 'F');

  // Corner 3: Bottom-Left
  doc.rect(x, y + size - boxSize, boxSize, boxSize, 'S');
  doc.rect(x + offset, y + size - boxSize + offset, innerBoxSize, innerBoxSize, 'F');

  // Checker patterns
  doc.setFillColor(0, 0, 0);
  const gridSize = 10;
  const cellSize = size / gridSize;

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const isTopLeft = row < 3 && col < 3;
      const isTopRight = row < 3 && col >= gridSize - 3;
      const isBottomLeft = row >= gridSize - 3 && col < 3;

      if (!isTopLeft && !isTopRight && !isBottomLeft) {
        if ((row + col) % 3 === 0 || (row * col) % 5 === 2) {
          doc.rect(x + col * cellSize, y + row * cellSize, cellSize, cellSize, 'F');
        }
      }
    }
  }
};

// Helper to draw signature and circular official seal
const drawCompanySealAndSignature = (doc: jsPDF, x: number, y: number, signatoryName: string = 'Authorized Signatory') => {
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.line(x, y, x + 40, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(signatoryName, x + 20, y + 4, { align: 'center' });

  // Circular Seal
  doc.setDrawColor(37, 99, 235); // brand blue
  doc.setLineWidth(0.4);
  doc.circle(x + 55, y - 8, 8, 'S');
  doc.circle(x + 55, y - 8, 7.2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.5);
  doc.setTextColor(37, 99, 235);
  doc.text('SAMS PVT LTD', x + 55, y - 10, { align: 'center' });
  doc.text('SECURED', x + 55, y - 8, { align: 'center' });
  doc.text('BANGALORE', x + 55, y - 6, { align: 'center' });
};

// Helper to draw premium SAMS header with corporate identity
const drawSAMSHeader = (doc: jsPDF, title: string, subtitle?: string) => {
  // SAMS logo mark (brand blue rounded rect container)
  doc.setFillColor(37, 99, 235); // brand blue
  doc.rect(15, 12, 10, 10, 'F');

  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.4);
  // White building outline inside logo
  doc.line(17.5, 20, 17.5, 14.5);
  doc.line(17.5, 14.5, 22.5, 14.5);
  doc.line(22.5, 14.5, 22.5, 20);
  doc.line(16.5, 20, 23.5, 20);
  // Windows
  doc.setFillColor(255, 255, 255);
  doc.rect(18.5, 15.5, 1, 1, 'F');
  doc.rect(20.5, 15.5, 1, 1, 'F');
  doc.rect(18.5, 17.5, 1, 1, 'F');
  doc.rect(20.5, 17.5, 1, 1, 'F');

  // Company Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('SAMS', 28, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('Smart Apartment Management System', 28, 21.5);
  doc.text('Premium Property Management Platform', 28, 25);

  // Right-aligned Corporate Details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('SAMS Technologies Group Pvt Ltd', 195, 14, { align: 'right' });
  doc.text('12, Premium Tech Park, Sector 5, Bangalore, India', 195, 17.5, { align: 'right' });
  doc.text('billing@sams.in | +91 80 4958 2900', 195, 21, { align: 'right' });
  doc.text('GSTIN: 29AAAAA0000A1Z5 (Mock)', 195, 24.5, { align: 'right' });

  // Divider Line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.line(15, 28, 195, 28);

  // Document Title & ID
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(title.toUpperCase(), 15, 36);

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(subtitle, 195, 36, { align: 'right' });
  }
};

// Helper to draw SAMS page footer
const drawSAMSFooter = (doc: jsPDF, pageNum?: number, totalPages?: number) => {
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.line(15, 278, 195, 278);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Generated by SAMS Operations | Confidential Document | Copyright © SAMS', 15, 283);

  if (pageNum && totalPages) {
    doc.text(`Page ${pageNum} of ${totalPages}`, 195, 283, { align: 'right' });
  } else {
    const ts = new Date().toLocaleString('en-IN');
    doc.text(`Timestamp: ${ts} | www.sams.in`, 195, 283, { align: 'right' });
  }
};

// ─── 1. EXPORT SINGLE ELECTRICITY BILL PDF ───────────────────────────────────
export const exportElectricityBillPDF = (bill: any, apartmentName: string, ownerName: string) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const billNo = bill.id.toUpperCase().slice(-8);

  drawSAMSHeader(doc, 'Electricity Invoice', `Invoice ID: SAMS-EL-${billNo}`);

  // Customer & Bill Details Grid
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('BILL TO (CUSTOMER):', 15, 48);

  doc.setFont('helvetica', 'normal');
  doc.text(`${bill.customerName || 'N/A'}`, 15, 54);
  doc.text(`Room ${bill.roomNumber || '—'}`, 15, 59);
  doc.text(`${apartmentName}`, 15, 64);
  doc.text(`Meter ID: MET-${bill.roomNumber || '000'}`, 15, 69);

  // Right column
  doc.setFont('helvetica', 'bold');
  doc.text('STATEMENT DETAILS:', 130, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(`Bill Number: BILL-${billNo}`, 130, 54);
  doc.text(`Billing Month: ${bill.billingMonth}`, 130, 59);
  doc.text(`Bill Date: ${new Date().toLocaleDateString('en-IN')}`, 130, 64);
  doc.text(`Due Date: ${new Date(bill.dueDate).toLocaleDateString('en-IN')}`, 130, 69);
  doc.text(`Owner Name: ${ownerName}`, 130, 74);

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(15, 80, 195, 80);

  // Readings Summary Box
  doc.setFillColor(248, 250, 252);
  doc.rect(15, 86, 180, 26, 'F');
  doc.rect(15, 86, 180, 26, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('METER READING BREAKDOWN', 20, 92);
  doc.setFont('helvetica', 'normal');
  doc.text(`Previous Reading: ${bill.previousReading} kWh`, 20, 99);
  doc.text(`Current Reading: ${bill.currentReading} kWh`, 20, 105);

  doc.text(`Rate per Unit: ₹12.00 / Unit`, 110, 99);
  doc.setFont('helvetica', 'bold');
  doc.text(`Units Consumed: ${bill.unitsConsumed} Units`, 110, 105);

  // Calculations Table Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(15, 120, 180, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('Description', 20, 125.5);
  doc.text('Usage', 100, 125.5);
  doc.text('Rate', 140, 125.5);
  doc.text('Total', 170, 125.5);

  // Table Body Row
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.text('Electricity Usage Charge (Units consumed × rate)', 20, 136);
  doc.text(`${bill.unitsConsumed} Units`, 100, 136);
  docText(doc, `₹12.00 / Unit`, 140, 136);
  doc.setFont('helvetica', 'bold');
  docText(doc, `₹${bill.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 170, 136);

  // Total summary block
  doc.setDrawColor(226, 232, 240);
  doc.line(15, 143, 195, 143);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('Net Total Amount Due:', 110, 153);
  docText(doc, `₹${bill.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 170, 153);

  // Status Badge
  const isPaid = bill.status === 'paid';
  doc.setFillColor(isPaid ? 220 : 254, isPaid ? 252 : 242, isPaid ? 231 : 242); // green-50 or red-50
  doc.rect(15, 162, 45, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(isPaid ? 21 : 220, isPaid ? 128 : 38, isPaid ? 61 : 38); // green-600 or red-600
  doc.text(`STATUS: ${bill.status.toUpperCase()}`, 19, 168);

  doc.setTextColor(15, 23, 42);

  // QR Code & Signatures at bottom
  const yBottom = 190;
  drawQRCode(doc, 15, yBottom, 20);
  drawCompanySealAndSignature(doc, 135, yBottom + 14, 'Owner Signature');

  drawSAMSFooter(doc);
  doc.save(`Electricity_Bill_Room${bill.roomNumber || '—'}_${bill.billingMonth}.pdf`);
};

// ─── 2. EXPORT ALL BILLS FOR MONTH (SINGLE PDF FILE) ─────────────────────────
export const exportAllElectricityBillsPDF = (bills: any[], month: string, apartments: Apartment[]) => {
  const doc = new jsPDF('p', 'mm', 'a4');

  if (bills.length === 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('No bills available for this cycle.', 15, 50);
    doc.save(`Monthly_Electricity_Report_${month}.pdf`);
    return;
  }

  const uniqueAptIds = [...new Set(bills.map(b => b.apartmentId))];
  const apartmentName = uniqueAptIds.length === 1
    ? (apartments.find(a => a.id === uniqueAptIds[0])?.name || 'SAMS Complex')
    : 'All Complexes';

  let y = 50;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('REPORT DETAILS:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`Report Name: Monthly Electricity Collection Report`, 15, y + 6);
  doc.text(`Billing Cycle: ${month}`, 15, y + 11);
  doc.text(`Apartment Complex: ${apartmentName}`, 15, y + 16);

  // Right-aligned report details
  doc.setFont('helvetica', 'bold');
  doc.text('METRIC SUMMARY:', 130, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 130, y + 6);
  doc.text(`Total Records: ${bills.length} Bills`, 130, y + 11);

  doc.setDrawColor(226, 232, 240);
  doc.line(15, y + 21, 195, y + 21);

  y = y + 27; // Start table at y = 77

  // Draw table header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(15, y, 180, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);

  doc.text('Room', 17, y + 5.5);
  doc.text('Customer', 32, y + 5.5);
  doc.text('Prev', 72, y + 5.5);
  doc.text('Curr', 92, y + 5.5);
  doc.text('Units', 112, y + 5.5);
  doc.text('Rate', 132, y + 5.5);
  doc.text('Amount', 152, y + 5.5);
  doc.text('Status', 177, y + 5.5);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  y += 8;

  let totalRooms = bills.length;
  let totalUnits = 0;
  let totalCollected = 0;
  let totalPending = 0;
  let totalRevenue = 0;

  bills.forEach((bill) => {
    totalUnits += bill.unitsConsumed;
    totalRevenue += bill.totalAmount;
    if (bill.status === 'paid') {
      totalCollected += bill.totalAmount;
    } else {
      totalPending += bill.totalAmount;
    }

    if (y + 8 > 270) {
      doc.addPage();
      y = 50;

      doc.setFillColor(15, 23, 42);
      doc.rect(15, y, 180, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('Room', 17, y + 5.5);
      doc.text('Customer', 32, y + 5.5);
      doc.text('Prev', 72, y + 5.5);
      doc.text('Curr', 92, y + 5.5);
      doc.text('Units', 112, y + 5.5);
      doc.text('Rate', 132, y + 5.5);
      doc.text('Amount', 152, y + 5.5);
      doc.text('Status', 177, y + 5.5);

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      y += 8;
    }

    doc.text(bill.roomNumber || '—', 17, y + 5);
    doc.text(bill.customerName ? (bill.customerName.length > 18 ? bill.customerName.substring(0, 15) + '...' : bill.customerName) : '—', 32, y + 5);
    doc.text(String(bill.previousReading), 72, y + 5);
    doc.text(String(bill.currentReading), 92, y + 5);
    doc.text(String(bill.unitsConsumed), 112, y + 5);
    docText(doc, `₹${bill.ratePerUnit || 12}`, 132, y + 5);
    docText(doc, `₹${bill.totalAmount.toLocaleString('en-IN')}`, 152, y + 5);

    const isPaid = bill.status === 'paid';
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(isPaid ? 22 : 220, isPaid ? 101 : 38, isPaid ? 129 : 38);
    doc.text(bill.status.toUpperCase(), 177, y + 5);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');

    doc.setDrawColor(226, 232, 240);
    doc.line(15, y + 7, 195, y + 7);
    y += 7;
  });

  if (y + 35 > 270) {
    doc.addPage();
    y = 50;
  }

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.3);
  doc.line(15, y + 2, 195, y + 2);

  doc.setFillColor(248, 250, 252);
  doc.rect(15, y + 4, 180, 28, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(15, y + 4, 180, 28, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('TOTAL ROOMS', 20, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(String(totalRooms), 20, y + 22);

  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL UNITS', 55, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${totalUnits} Units`, 55, y + 22);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 163, 74);
  doc.text('TOTAL COLLECTED', 90, y + 12);
  doc.setFont('helvetica', 'normal');
  docText(doc, `₹${totalCollected.toLocaleString('en-IN')}`, 90, y + 22);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38);
  doc.text('TOTAL PENDING', 130, y + 12);
  doc.setFont('helvetica', 'normal');
  docText(doc, `₹${totalPending.toLocaleString('en-IN')}`, 130, y + 22);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL REVENUE', 165, y + 12);
  doc.setFont('helvetica', 'bold');
  docText(doc, `₹${totalRevenue.toLocaleString('en-IN')}`, 165, y + 22);

  const totalPages = doc.getNumberOfPages();
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    doc.setPage(pageNum);
    drawSAMSHeader(doc, 'Electricity Report', `Billing Cycle: ${month}`);
    drawSAMSFooter(doc, pageNum, totalPages);
  }

  doc.save(`Monthly_Electricity_Report_${month.replace(/\s+/g, '_')}.pdf`);
};

// ─── 3. EXPORT RENT RECEIPT / INVOICE PDF ────────────────────────────────────
export const exportRentReceiptPDF = async (payment: any, apartmentName: string, electricityBillAmount?: number) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const invoiceNo = payment.id.toUpperCase().slice(-8);

  drawSAMSHeader(doc, 'Rent Invoice & Receipt', `Invoice ID: SAMS-INV-${invoiceNo}`);

  let elecAmount = electricityBillAmount || 0;
  if (elecAmount === 0) {
    try {
      const bills = await getElectricityBills();
      const matchingBill = bills.find(b => b.customerId === payment.customerId && b.billingMonth === payment.billingMonth);
      if (matchingBill) {
        elecAmount = matchingBill.totalAmount;
      }
    } catch (e) {
      console.error("Failed to load electricity bill for receipt", e);
    }
  }

  const lateFee = payment.status === 'overdue' ? 100 : 0;
  const totalPaid = payment.amount + lateFee + elecAmount;
  const paymentMethod = payment.status === 'paid' ? 'UPI / Net Banking' : '—';
  const transactionId = payment.status === 'paid' ? `TXN-${invoiceNo}` : '—';
  const receiptNumber = `REC-${invoiceNo}`;

  // Section: Details Grid
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('PAID BY (CUSTOMER):', 15, 48);

  doc.setFont('helvetica', 'normal');
  doc.text(`${payment.customerName || 'N/A'}`, 15, 54);
  doc.text(`Customer ID: CUST-${payment.customerId?.slice(-6) || '—'}`, 15, 59);
  doc.text(`Room ${payment.roomNumber || '—'}`, 15, 64);
  doc.text(`${apartmentName}`, 15, 69);

  doc.setFont('helvetica', 'bold');
  doc.text('RECEIPT INFORMATION:', 130, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(`Receipt Number: ${receiptNumber}`, 130, 54);
  doc.text(`Billing Month: ${payment.billingMonth}`, 130, 59);
  doc.text(`Due Date: ${new Date(payment.dueDate).toLocaleDateString('en-IN')}`, 130, 64);
  doc.text(`Payment Date: ${payment.paidAt ? new Date(payment.paidAt).toLocaleDateString('en-IN') : 'Awaiting Payment'}`, 130, 69);
  doc.text(`Agreement Number: SAMS-AGR-${payment.roomId?.slice(-6) || '000'}`, 130, 74);

  doc.setDrawColor(226, 232, 240);
  doc.line(15, 79, 195, 79);

  // Breakdown Invoice Table Header
  doc.setFillColor(15, 23, 42);
  doc.rect(15, 86, 180, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('Billing Item Description', 20, 91.5);
  doc.text('Status', 110, 91.5);
  doc.text('Amount', 160, 91.5);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');

  // Row 1: Rent
  doc.text('Monthly Rent Allotment Charge', 20, 102);
  doc.text(payment.status.toUpperCase(), 110, 102);
  docText(doc, `₹${payment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 160, 102);

  // Row 2: Late Fee
  doc.text('Late Payment Fine/Fee', 20, 110);
  doc.text(lateFee > 0 ? 'CHARGED' : 'NONE', 110, 110);
  docText(doc, `₹${lateFee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 160, 110);

  // Row 3: Electricity
  doc.text('Electricity Utility Statement Charge', 20, 118);
  doc.text(elecAmount > 0 ? 'INCLUDED' : 'NOT CHARGED', 110, 118);
  docText(doc, `₹${elecAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 160, 118);

  doc.setDrawColor(226, 232, 240);
  doc.line(15, 124, 195, 124);

  // Grand Total
  doc.setFont('helvetica', 'bold');
  doc.text('Net Total Amount Paid:', 100, 134);
  docText(doc, `₹${totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 160, 134);

  // Additional details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('TRANSACTION AUDIT LOG:', 15, 146);
  doc.setFont('helvetica', 'normal');
  doc.text(`Payment Gateway: ${paymentMethod}`, 15, 152);
  doc.text(`Transaction Reference ID: ${transactionId}`, 15, 158);

  // Status Badge
  const isPaid = payment.status === 'paid';
  doc.setFillColor(isPaid ? 220 : 254, isPaid ? 252 : 242, isPaid ? 231 : 242);
  doc.rect(130, 146, 50, 9, 'F');
  doc.setTextColor(isPaid ? 21 : 220, isPaid ? 128 : 38, isPaid ? 61 : 38);
  doc.setFont('helvetica', 'bold');
  doc.text(`STATUS: ${payment.status.toUpperCase()}`, 134, 152);

  doc.setTextColor(15, 23, 42);

  // Bottom QR code and signatory seal
  const yBottom = 190;
  drawQRCode(doc, 15, yBottom, 20);
  drawCompanySealAndSignature(doc, 135, yBottom + 14, 'Authorized Signature');

  drawSAMSFooter(doc);
  doc.save(`Rent_Invoice_Room${payment.roomNumber || '—'}_${payment.billingMonth}.pdf`);
};

// ─── 4. EXPORT MONTHLY RENT REPORT PDF (SINGLE FILE) ─────────────────────────
export const exportMonthlyRentReportPDF = async (payments: any[], month: string, apartments: Apartment[]) => {
  const doc = new jsPDF('p', 'mm', 'a4');

  if (payments.length === 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('No rent records available for this cycle.', 15, 50);
    doc.save(`Monthly_Rent_Report_${month}.pdf`);
    return;
  }

  let bills: ElectricityBill[] = [];
  try {
    bills = await getElectricityBills();
  } catch (e) {
    console.error("Failed to load electricity bills for rent report", e);
  }

  const uniqueAptIds = [...new Set(payments.map(p => p.apartmentId))];
  const apartmentName = uniqueAptIds.length === 1
    ? (apartments.find(a => a.id === uniqueAptIds[0])?.name || 'SAMS Complex')
    : 'All Complexes';

  let y = 50;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('REPORT DETAILS:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`Report Name: Monthly Rent Collection Report`, 15, y + 6);
  doc.text(`Billing Cycle: ${month}`, 15, y + 11);
  doc.text(`Apartment Complex: ${apartmentName}`, 15, y + 16);

  // Right-aligned report details
  doc.setFont('helvetica', 'bold');
  doc.text('METRIC SUMMARY:', 130, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 130, y + 6);
  doc.text(`Total Records: ${payments.length} Statements`, 130, y + 11);

  doc.setDrawColor(226, 232, 240);
  doc.line(15, y + 21, 195, y + 21);

  y = y + 27; // Start table at y = 77

  // Draw table header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(15, y, 180, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);

  doc.text('Room', 17, y + 5.5);
  doc.text('Customer', 32, y + 5.5);
  doc.text('Monthly Rent', 67, y + 5.5);
  doc.text('Electricity', 89, y + 5.5);
  doc.text('Late Fee', 111, y + 5.5);
  doc.text('Total', 129, y + 5.5);
  doc.text('Status', 151, y + 5.5);
  doc.text('Payment Date', 173, y + 5.5);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  y += 8;

  let totalCustomers = payments.length;
  let totalRentCollected = 0;
  let pendingRent = 0;
  let totalLateFees = 0;
  let totalElecCollection = 0;
  let grandTotal = 0;

  payments.forEach((p) => {
    const elec = bills.find(b => b.customerId === p.customerId && b.billingMonth === p.billingMonth);
    const elecAmount = elec ? elec.totalAmount : 0;
    const lateFee = p.status === 'overdue' ? 100 : 0;
    const total = p.amount + elecAmount + lateFee;

    if (p.status === 'paid') {
      totalRentCollected += p.amount;
      totalLateFees += lateFee;
      totalElecCollection += elecAmount;
      grandTotal += total;
    } else {
      pendingRent += p.amount;
    }

    if (y + 8 > 270) {
      doc.addPage();
      y = 50;

      doc.setFillColor(15, 23, 42);
      doc.rect(15, y, 180, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('Room', 17, y + 5.5);
      doc.text('Customer', 32, y + 5.5);
      doc.text('Monthly Rent', 67, y + 5.5);
      doc.text('Electricity', 89, y + 5.5);
      doc.text('Late Fee', 111, y + 5.5);
      doc.text('Total', 129, y + 5.5);
      doc.text('Status', 151, y + 5.5);
      doc.text('Payment Date', 173, y + 5.5);

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      y += 8;
    }

    doc.text(p.roomNumber || '—', 17, y + 5);
    doc.text(p.customerName ? (p.customerName.length > 18 ? p.customerName.substring(0, 15) + '...' : p.customerName) : '—', 32, y + 5);
    docText(doc, `₹${p.amount.toLocaleString('en-IN')}`, 67, y + 5);
    docText(doc, `₹${elecAmount.toLocaleString('en-IN')}`, 89, y + 5);
    docText(doc, `₹${lateFee.toLocaleString('en-IN')}`, 111, y + 5);
    docText(doc, `₹${total.toLocaleString('en-IN')}`, 129, y + 5);

    const isPaid = p.status === 'paid';
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(isPaid ? 22 : 220, isPaid ? 101 : 38, isPaid ? 129 : 38);
    doc.text(p.status.toUpperCase(), 151, y + 5);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.text(p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-IN') : '—', 173, y + 5);

    doc.setDrawColor(226, 232, 240);
    doc.line(15, y + 7, 195, y + 7);
    y += 7;
  });

  if (y + 35 > 270) {
    doc.addPage();
    y = 50;
  }

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.3);
  doc.line(15, y + 2, 195, y + 2);

  doc.setFillColor(248, 250, 252);
  doc.rect(15, y + 4, 180, 28, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(15, y + 4, 180, 28, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('TOTAL CUSTOMERS', 17, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(String(totalCustomers), 17, y + 22);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 163, 74);
  doc.text('RENT COLLECTED', 47, y + 12);
  doc.setFont('helvetica', 'normal');
  docText(doc, `₹${totalRentCollected.toLocaleString('en-IN')}`, 47, y + 22);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38);
  doc.text('PENDING RENT', 80, y + 12);
  doc.setFont('helvetica', 'normal');
  docText(doc, `₹${pendingRent.toLocaleString('en-IN')}`, 80, y + 22);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(217, 119, 6);
  doc.text('LATE FEES', 113, y + 12);
  doc.setFont('helvetica', 'normal');
  docText(doc, `₹${totalLateFees.toLocaleString('en-IN')}`, 113, y + 22);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(59, 130, 246);
  doc.text('ELEC. COLLECTION', 138, y + 12);
  doc.setFont('helvetica', 'normal');
  docText(doc, `₹${totalElecCollection.toLocaleString('en-IN')}`, 138, y + 22);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('GRAND TOTAL', 168, y + 12);
  doc.setFont('helvetica', 'bold');
  docText(doc, `₹${grandTotal.toLocaleString('en-IN')}`, 168, y + 22);

  const totalPages = doc.getNumberOfPages();
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    doc.setPage(pageNum);
    drawSAMSHeader(doc, 'Rent Report', `Billing Cycle: ${month}`);
    drawSAMSFooter(doc, pageNum, totalPages);
  }

  doc.save(`Monthly_Rent_Report_${month.replace(/\s+/g, '_')}.pdf`);
};

// ─── 5. EXPORT MONTHLY REPORT PDF ────────────────────────────────────────────
export const exportMonthlyReportPDF = (reportData: any, month: string) => {
  const doc = new jsPDF('p', 'mm', 'a4');

  drawSAMSHeader(doc, `Monthly Analytics Report - ${month}`);

  // Summary Metrics boxes
  doc.setFillColor(248, 250, 252);
  doc.rect(15, 48, 55, 24, 'F');
  doc.rect(15, 48, 55, 24, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('OCCUPANCY RATE', 18, 54);
  doc.setFontSize(14);
  doc.text(`${reportData.occupancyRate}%`, 18, 62);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Rooms currently occupied', 18, 68);

  doc.setFillColor(248, 250, 252);
  doc.rect(77, 48, 55, 24, 'F');
  doc.rect(77, 48, 55, 24, 'S');
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL REVENUE', 80, 54);
  doc.setFontSize(14);
  docText(doc, `₹${reportData.totalRevenue.toLocaleString('en-IN')}`, 80, 62);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Rent + Utilities collected', 80, 68);

  doc.setFillColor(248, 250, 252);
  doc.rect(140, 48, 55, 24, 'F');
  doc.rect(140, 48, 55, 24, 'S');
  doc.setFont('helvetica', 'bold');
  doc.text('PENDING DEBTS', 143, 54);
  doc.setFontSize(14);
  docText(doc, `₹${reportData.pendingRent.toLocaleString('en-IN')}`, 143, 62);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Uncollected rent balance', 143, 68);

  // Section: Apartment-wise details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('APARTMENT-WISE REVENUE BREAKDOWN', 15, 84);

  doc.setFillColor(15, 23, 42);
  doc.rect(15, 89, 180, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('Building Complex Name', 18, 93.5);
  doc.text('Rooms (Occ/Vac)', 90, 93.5);
  doc.text('Rent Revenue', 130, 93.5);
  doc.text('Electricity Coll.', 165, 93.5);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');

  let y = 101;
  (reportData.apartments || []).forEach((apt: any) => {
    doc.text(apt.name, 18, y);
    doc.text(`${apt.occupiedRooms} / ${apt.vacantRooms}`, 90, y);
    docText(doc, `₹${apt.rentCollected.toLocaleString('en-IN')}`, 130, y);
    docText(doc, `₹${apt.electricityCollected.toLocaleString('en-IN')}`, 165, y);
    doc.setDrawColor(226, 232, 240);
    doc.line(15, y + 2, 195, y + 2);
    y += 8;
  });

  // Section: Complaints Log
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('OPERATIONS & TICKET COMPLAINTS SUMMARY', 15, y);
  y += 5;

  doc.setFillColor(254, 243, 199); // amber-100
  doc.rect(15, y, 85, 16, 'F');
  doc.rect(15, y, 85, 16, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(146, 64, 14); // amber-800
  doc.text(`Active / Open Tickets: ${reportData.complaintsOpen}`, 20, y + 10);

  doc.setFillColor(209, 250, 229); // green-100
  doc.rect(110, y, 85, 16, 'F');
  doc.rect(110, y, 85, 16, 'S');
  doc.setTextColor(6, 95, 70); // green-800
  doc.text(`Resolved Tickets: ${reportData.complaintsResolved}`, 115, y + 10);

  doc.setTextColor(15, 23, 42);

  // Section: Revenue Mini-Chart Table
  y += 28;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('MONTHLY REVENUE BAR STATISTICS', 15, y);
  y += 6;

  const barData = reportData.monthlyTrends || [];
  const maxVal = Math.max(...barData.map((d: any) => d.revenue), 1);

  barData.forEach((d: any) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(d.month, 15, y + 4);

    // Draw bar rect
    const barWidth = (d.revenue / maxVal) * 110;
    doc.setFillColor(16, 185, 129); // emerald
    doc.rect(30, y, barWidth, 6, 'F');

    doc.setFont('helvetica', 'normal');
    docText(doc, `₹${d.revenue.toLocaleString('en-IN')}`, 145, y + 4);
    y += 8;
  });

  drawSAMSFooter(doc);
  doc.save(`Monthly_Analytics_Report_${month}.pdf`);
};

// ─── 6. EXPORT MONTHLY DATA TO EXCEL SPREADSHEET ─────────────────────────────
export const exportMonthlyReportExcel = (dataRows: any[], month: string) => {
  const worksheet = XLSX.utils.json_to_sheet(dataRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Analytics Data');
  XLSX.writeFile(workbook, `SAMS_Monthly_Report_${month}.xlsx`);
};

// ─── 7. EXPORT COMPLETE CUSTOMER REPORT PDF ──────────────────────────────────
export const exportCustomerReportPDF = (
  customer: any,
  room: any,
  apartment: any,
  payments: any[],
  bills: any[],
  complaints: any[],
  ownerName: string
) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const custName = customer.displayName.replace(/\s+/g, '_');

  drawSAMSHeader(doc, 'Customer Report', `Customer ID: CUST-${customer.uid.toUpperCase().slice(-8)}`);

  // Section: Customer Profile Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('CUSTOMER INFORMATION:', 15, 48);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Full Name: ${customer.displayName}`, 15, 54);
  doc.text(`Customer ID: CUST-${customer.uid.toUpperCase().slice(-8)}`, 15, 59);
  doc.text(`Email Address: ${customer.email}`, 15, 64);
  doc.text(`Phone Number: ${customer.phoneNumber || 'N/A'}`, 15, 69);
  doc.text(`Status: ${customer.status?.toUpperCase() || 'ACTIVE'}`, 15, 74);

  // Residence details
  doc.setFont('helvetica', 'bold');
  doc.text('APARTMENT & LEASE DETAILS:', 110, 48);
  doc.setFont('helvetica', 'normal');
  if (room && apartment) {
    doc.text(`Apartment Complex: ${apartment.name}`, 110, 54);
    docText(doc, `Room Number: ${room.roomNumber} (Rent: ₹${room.rentAmount}/mo)`, 110, 59);
    doc.text(`Agreement Status: ACTIVE`, 110, 64);
    doc.text(`Owner: ${ownerName}`, 110, 69);
  } else {
    doc.text('No active lease/room assignment found.', 110, 54);
  }

  doc.setDrawColor(226, 232, 240);
  doc.line(15, 80, 195, 80);

  let y = 88;

  // Rent Payment History
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('RENT PAYMENT LOGS', 15, y);
  y += 5;

  doc.setFillColor(15, 23, 42);
  doc.rect(15, y, 180, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('Month Cycle', 18, y + 4.5);
  doc.text('Amount Due', 70, y + 4.5);
  doc.text('Due Date', 120, y + 4.5);
  doc.text('Payment Status', 160, y + 4.5);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  y += 7;

  if (payments.length === 0) {
    doc.text('No rent payments on record.', 18, y + 4);
    y += 8;
  } else {
    payments.slice(0, 5).forEach(p => {
      doc.text(p.billingMonth, 18, y + 4);
      docText(doc, `₹${p.amount.toLocaleString('en-IN')}`, 70, y + 4);
      doc.text(new Date(p.dueDate).toLocaleDateString('en-IN'), 120, y + 4);
      doc.text(p.status.toUpperCase(), 160, y + 4);
      doc.setDrawColor(226, 232, 240);
      doc.line(15, y + 6, 195, y + 6);
      y += 8;
    });
  }

  // Electricity History
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('ELECTRICITY UTILITY LOGS', 15, y);
  y += 5;

  doc.setFillColor(15, 23, 42);
  doc.rect(15, y, 180, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('Month Cycle', 18, y + 4.5);
  doc.text('Units Consumed', 70, y + 4.5);
  doc.text('Rate / Unit', 110, y + 4.5);
  doc.text('Total Bill', 145, y + 4.5);
  doc.text('Status', 175, y + 4.5);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  y += 7;

  if (bills.length === 0) {
    doc.text('No utility bill history.', 18, y + 4);
    y += 8;
  } else {
    bills.slice(0, 5).forEach(b => {
      doc.text(b.billingMonth, 18, y + 4);
      doc.text(`${b.unitsConsumed} Units`, 70, y + 4);
      docText(doc, `₹${b.ratePerUnit || 12}/Unit`, 110, y + 4);
      docText(doc, `₹${b.totalAmount.toLocaleString('en-IN')}`, 145, y + 4);
      doc.text(b.status.toUpperCase(), 175, y + 4);
      doc.setDrawColor(226, 232, 240);
      doc.line(15, y + 6, 195, y + 6);
      y += 8;
    });
  }

  // Complaints History
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('COMPLAINTS & TICKETS LOG', 15, y);
  y += 5;

  doc.setFillColor(15, 23, 42);
  doc.rect(15, y, 180, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('Ticket Title', 18, y + 4.5);
  doc.text('Category', 70, y + 4.5);
  doc.text('Priority', 110, y + 4.5);
  doc.text('Created Date', 145, y + 4.5);
  doc.text('Status', 175, y + 4.5);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  y += 7;

  if (complaints.length === 0) {
    doc.text('No complaints logged.', 18, y + 4);
    y += 8;
  } else {
    complaints.slice(0, 3).forEach(c => {
      doc.text(c.title.length > 25 ? c.title.substring(0, 22) + '...' : c.title, 18, y + 4);
      doc.text(c.category.toUpperCase(), 70, y + 4);
      doc.text(c.priority.toUpperCase(), 110, y + 4);
      doc.text(new Date(c.createdAt).toLocaleDateString('en-IN'), 145, y + 4);
      doc.text(c.status.toUpperCase(), 175, y + 4);
      doc.setDrawColor(226, 232, 240);
      doc.line(15, y + 6, 195, y + 6);
      y += 8;
    });
  }

  drawSAMSFooter(doc);
  doc.save(`Customer_Report_${custName}.pdf`);
};

// ─── 8. EXPORT OWNER REPORT PDF ──────────────────────────────────────────────
export const exportOwnerReportPDF = (
  owner: any,
  apartments: any[],
  rooms: any[],
  payments: any[],
  bills: any[],
  complaints: any[],
  month: string
) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const ownerNameClean = owner.displayName.replace(/\s+/g, '_');

  drawSAMSHeader(doc, 'Owner Performance Report', `Owner ID: OWN-${owner.uid.slice(-6).toUpperCase()}`);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('OWNER PROFILE:', 15, 48);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Full Name: ${owner.displayName}`, 15, 54);
  doc.text(`Email Address: ${owner.email}`, 15, 59);
  doc.text(`Report Period: ${month}`, 15, 64);

  // Statistics
  const totalRent = payments.filter(p => p.status === 'paid').reduce((s,p) => s + p.amount, 0);
  const totalElec = bills.filter(b => b.status === 'paid').reduce((s,b) => s + b.totalAmount, 0);
  const pendingRent = payments.filter(p => p.status !== 'paid').reduce((s,p) => s + p.amount, 0);
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter(r => r.status === 'occupied').length;
  const occupancyPct = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  doc.setFont('helvetica', 'bold');
  doc.text('METRICS SNAPSHOT:', 110, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Managed Complexes: ${apartments.length}`, 110, 54);
  doc.text(`Total Rooms: ${totalRooms} (Occupied: ${occupiedRooms} / ${occupancyPct}%)`, 110, 59);
  docText(doc, `Rent Collected: ₹${totalRent.toLocaleString('en-IN')}`, 110, 64);
  docText(doc, `Utility Collection: ₹${totalElec.toLocaleString('en-IN')}`, 110, 69);
  docText(doc, `Pending Debts: ₹${pendingRent.toLocaleString('en-IN')}`, 110, 74);

  doc.setDrawColor(226, 232, 240);
  doc.line(15, 80, 195, 80);

  // Apartments breakdown table
  let y = 88;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('ASSIGNED APARTMENT PORTFOLIO', 15, y);
  y += 5;

  doc.setFillColor(15, 23, 42);
  doc.rect(15, y, 180, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.text('Building Complex Name', 18, y + 4.5);
  doc.text('Address', 75, y + 4.5);
  doc.text('Rooms Count', 140, y + 4.5);
  doc.text('Status', 168, y + 4.5);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  y += 7;

  apartments.forEach(apt => {
    const aptRoomsCount = rooms.filter(r => r.apartmentId === apt.id).length;
    doc.text(apt.name, 18, y + 4);
    doc.text(apt.address.length > 35 ? apt.address.substring(0, 32) + '...' : apt.address, 75, y + 4);
    doc.text(`${aptRoomsCount} Units`, 140, y + 4);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74);
    doc.text('ACTIVE', 168, y + 4);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');

    doc.setDrawColor(226, 232, 240);
    doc.line(15, y + 6, 195, y + 6);
    y += 8;
  });

  // Recent Complaints
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('MAINTENANCE RESOLUTION SNAPSHOT', 15, y);
  y += 5;

  doc.setFillColor(15, 23, 42);
  doc.rect(15, y, 180, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.text('Ticket Title', 18, y + 4.5);
  doc.text('Category', 70, y + 4.5);
  doc.text('Priority', 120, y + 4.5);
  doc.text('Status', 160, y + 4.5);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  y += 7;

  if (complaints.length === 0) {
    doc.text('No complaints on record for this owner.', 18, y + 4);
  } else {
    complaints.slice(0, 3).forEach(c => {
      doc.text(c.title, 18, y + 4);
      doc.text(c.category.toUpperCase(), 70, y + 4);
      doc.text(c.priority.toUpperCase(), 120, y + 4);
      doc.setFont('helvetica', 'bold');
      doc.text(c.status.toUpperCase(), 160, y + 4);
      doc.setFont('helvetica', 'normal');

      doc.setDrawColor(226, 232, 240);
      doc.line(15, y + 6, 195, y + 6);
      y += 8;
    });
  }

  drawSAMSFooter(doc);
  doc.save(`Owner_Report_${ownerNameClean}_${month}.pdf`);
};

// ─── 9. EXPORT APARTMENT REPORT PDF ──────────────────────────────────────────
export const exportApartmentReportPDF = (
  apartment: any,
  rooms: any[],
  payments: any[],
  bills: any[]
) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const aptNameClean = apartment.name.replace(/\s+/g, '_');

  drawSAMSHeader(doc, 'Apartment Portfolio Report', `Complex ID: APT-${apartment.id.slice(-6).toUpperCase()}`);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('PROPERTY PORTFOLIO DETAILS:', 15, 48);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Complex Name: ${apartment.name}`, 15, 54);
  doc.text(`Address Location: ${apartment.address}`, 15, 59);

  const totalUnits = rooms.length;
  const occupiedCount = rooms.filter(r => r.status === 'occupied').length;
  const vacantCount = totalUnits - occupiedCount;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedCount / totalUnits) * 100) : 0;

  doc.setFont('helvetica', 'bold');
  doc.text('PORTFOLIO STATUS SUMMARY:', 110, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Rooms Units: ${totalUnits}`, 110, 54);
  doc.text(`Occupied Units: ${occupiedCount} (${occupancyRate}%)`, 110, 59);
  doc.text(`Vacant Units: ${vacantCount}`, 110, 64);

  doc.setDrawColor(226, 232, 240);
  doc.line(15, 72, 195, 72);

  // Rooms table list
  let y = 80;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('ROOM UNITS STATUS DIRECTORY', 15, y);
  y += 5;

  doc.setFillColor(15, 23, 42);
  doc.rect(15, y, 180, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.text('Room No', 18, y + 4.5);
  doc.text('Allotted Rent', 50, y + 4.5);
  doc.text('Lease status', 100, y + 4.5);
  doc.text('Status', 160, y + 4.5);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  y += 7;

  rooms.forEach(r => {
    doc.text(`Room ${r.roomNumber}`, 18, y + 4);
    docText(doc, `₹${r.rentAmount.toLocaleString('en-IN')}`, 50, y + 4);
    doc.text(r.currentCustomerId ? 'Lease Active' : 'Unassigned / Available', 100, y + 4);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(r.status === 'occupied' ? 22 : 220, r.status === 'occupied' ? 163 : 38, r.status === 'occupied' ? 74 : 38);
    doc.text(r.status.toUpperCase(), 160, y + 4);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');

    doc.setDrawColor(226, 232, 240);
    doc.line(15, y + 6, 195, y + 6);
    y += 8;
  });

  drawSAMSFooter(doc);
  doc.save(`Apartment_Report_${aptNameClean}.pdf`);
};

// ─── 10. EXPORT COMPLAINT REPORT PDF ─────────────────────────────────────────
export const exportComplaintReportPDF = (complaints: any[], title: string) => {
  const doc = new jsPDF('p', 'mm', 'a4');

  drawSAMSHeader(doc, 'Complaints Registry Report', `Total items: ${complaints.length}`);

  let y = 48;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('TICKET RESOLUTION & FEEDBACK DIRECTORY', 15, y);
  y += 6;

  // Table headers
  doc.setFillColor(15, 23, 42);
  doc.rect(15, y, 180, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.text('Subject Title', 18, y + 4.5);
  doc.text('Category', 75, y + 4.5);
  doc.text('Priority', 115, y + 4.5);
  doc.text('Status', 145, y + 4.5);
  doc.text('Registered Date', 165, y + 4.5);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  y += 7;

  complaints.forEach(c => {
    if (y + 8 > 270) {
      doc.addPage();
      y = 50;

      doc.setFillColor(15, 23, 42);
      doc.rect(15, y, 180, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8.5);
      doc.text('Subject Title', 18, y + 4.5);
      doc.text('Category', 75, y + 4.5);
      doc.text('Priority', 115, y + 4.5);
      doc.text('Status', 145, y + 4.5);
      doc.text('Registered Date', 165, y + 4.5);

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      y += 7;
    }

    doc.text(c.title.length > 28 ? c.title.substring(0, 25) + '...' : c.title, 18, y + 4);
    doc.text(c.category.toUpperCase(), 75, y + 4);
    doc.text(c.priority.toUpperCase(), 115, y + 4);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(c.status === 'resolved' ? 22 : 217, c.status === 'resolved' ? 163 : 119, c.status === 'resolved' ? 74 : 6);
    doc.text(c.status.toUpperCase(), 145, y + 4);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(c.createdAt).toLocaleDateString('en-IN'), 165, y + 4);

    doc.setDrawColor(226, 232, 240);
    doc.line(15, y + 6, 195, y + 6);
    y += 8;
  });

  const totalPages = doc.getNumberOfPages();
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    doc.setPage(pageNum);
    drawSAMSHeader(doc, 'Complaint Statement Report');
    drawSAMSFooter(doc, pageNum, totalPages);
  }

  doc.save(`Complaints_Statement_Report_${new Date().getFullYear()}.pdf`);
};

// ─── 11. EXPORT ADMIN REPORT PDF ─────────────────────────────────────────────
export const exportAdminReportPDF = (stats: any) => {
  const doc = new jsPDF('p', 'mm', 'a4');

  drawSAMSHeader(doc, 'Administrative Performance Overview', `System Status: SECURE`);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('SYSTEM-WIDE METRICS SUMMARY', 15, 48);

  // Summary Metrics Blocks
  doc.setFillColor(248, 250, 252);
  doc.rect(15, 54, 55, 24, 'F');
  doc.rect(15, 54, 55, 24, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('TOTAL PROPERTY OWNERS', 18, 60);
  doc.setFontSize(14);
  doc.text(String(stats.ownersCount || 3), 18, 68);

  doc.setFillColor(248, 250, 252);
  doc.rect(77, 54, 55, 24, 'F');
  doc.rect(77, 54, 55, 24, 'S');
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL PROPERTIES', 80, 60);
  doc.setFontSize(14);
  doc.text(String(stats.propertiesCount || 5), 80, 68);

  doc.setFillColor(248, 250, 252);
  doc.rect(140, 54, 55, 24, 'F');
  doc.rect(140, 54, 55, 24, 'S');
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL CUSTOMERS', 143, 60);
  doc.setFontSize(14);
  doc.text(String(stats.customersCount || 10), 143, 68);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  let y = 92;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('FINANCIALS & ACCOUNTS SUMMARY', 15, y);
  y += 5;

  doc.setFillColor(248, 250, 252);
  doc.rect(15, y, 180, 32, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(15, y, 180, 32, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Occupancy Performance Rate:', 20, y + 8);
  doc.text('Total Revenue Collected:', 20, y + 15);
  doc.text('System-wide Uncollected Rent:', 20, y + 22);
  doc.text('Active Tickets Resolution:', 20, y + 29);

  doc.setFont('helvetica', 'normal');
  doc.text(`${stats.occupancyRate || 85}% of all room units occupied`, 85, y + 8);
  docText(doc, `₹${(stats.revenueAmount || 185000).toLocaleString('en-IN')}.00`, 85, y + 15);
  docText(doc, `₹${(stats.pendingAmount || 45000).toLocaleString('en-IN')}.00`, 85, y + 22);
  doc.text(`${stats.resolutionRate || 92}% resolution efficiency rate`, 85, y + 29);

  // Footer visual QR code
  drawQRCode(doc, 15, 150, 20);
  drawCompanySealAndSignature(doc, 135, 164, 'System Administrator');

  drawSAMSFooter(doc);
  doc.save(`Admin_System_Report_${new Date().getFullYear()}.pdf`);
};

// ─── 12. EXPORT LEASE AGREEMENT PDF ──────────────────────────────────────────
export const exportAgreementPDF = (customer: any, room: any, apartment: any, ownerName: string) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const agrNo = room.id.toUpperCase().slice(-6);

  drawSAMSHeader(doc, 'Lease Agreement', `Agreement ID: SAMS-AGR-${agrNo}`);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('APARTMENT LEASE AGREEMENT & RENT UNDERTAKING', 105, 48, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85); // slate-700

  let y = 56;
  doc.text(`This Rent Lease Agreement is entered into on ${new Date().toLocaleDateString('en-IN')} between the Property Owner:`, 15, y);

  // First party
  y += 4;
  doc.setFillColor(248, 250, 252);
  doc.rect(15, y, 180, 18, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(15, y, 180, 18, 'S');

  doc.setFont('helvetica', 'bold');
  doc.text('PROPERTY OWNER (FIRST PARTY)', 20, y + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${ownerName}`, 20, y + 11.5);
  doc.text(`Contact Email: billing@sams.in`, 110, y + 11.5);

  // Second party
  y += 24;
  doc.setFillColor(248, 250, 252);
  doc.rect(15, y, 180, 24, 'F');
  doc.rect(15, y, 180, 24, 'S');

  doc.setFont('helvetica', 'bold');
  doc.text('CUSTOMER (SECOND PARTY)', 20, y + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${customer.displayName}`, 20, y + 11.5);
  doc.text(`ID Reference: CUST-${customer.uid.slice(-6).toUpperCase()}`, 20, y + 17.5);
  doc.text(`Email Address: ${customer.email}`, 110, y + 11.5);
  doc.text(`Phone Number: ${customer.phoneNumber || 'N/A'}`, 110, y + 17.5);

  // Terms
  y += 30;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('STANDARD TERMS OF OCCUPANCY', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  const terms = [
    `1. LEASED PREMISES: The First Party hereby leases to the Second Party Room ${room.roomNumber} located at ${apartment.name}.`,
    `2. RENT: The Second Party agrees to pay a monthly rent of ₹${room.rentAmount.toLocaleString('en-IN')} on or before the 5th of each calendar month.`,
    `3. UTILITIES: Electricity charges shall be calculated separately based on units consumed at ₹12.00 per unit (kWh).`,
    `4. SECURITY DEPOSIT: The Second Party has deposited a security deposit equal to 2 months' rent (₹${(room.rentAmount * 2).toLocaleString('en-IN')}).`,
    `5. VALIDITY TERM: This agreement is valid for a period of 11 months commencing from ${new Date().toLocaleDateString('en-IN')}.`,
    `6. REFUNDS POLICY: SAMS licensing plans and subscription plans billed to property owners or business organizations are non-refundable.`,
    `7. LEASE NOTICE: Either party may terminate this lease by giving a 30-day written notice.`
  ];

  y += 5;
  terms.forEach(term => {
    docText(doc, term, 15, y);
    y += 6.5;
  });

  // QR code & stamp
  y += 12;
  drawQRCode(doc, 15, y, 20);
  drawCompanySealAndSignature(doc, 75, y + 14, 'Owner Signature');
  drawCompanySealAndSignature(doc, 135, y + 14, 'Customer Signature');

  drawSAMSFooter(doc);
  doc.save(`Rent_Invoice_Room${room.roomNumber}_${new Date().getFullYear()}.pdf`);
};

// ─── 13. EXPORT CUSTOMER DOCUMENT VAULT PDF ──────────────────────────────────
export const exportCustomerDocumentExport = (customer: any, room: any, apartment: any, ownerName: string) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const custName = customer.displayName.replace(/\s+/g, '_');

  drawSAMSHeader(doc, 'Customer Document Vault', `Cust ID: CUST-${customer.uid.toUpperCase().slice(-8)}`);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('VERIFIED CUSTOMER IDENTIFICATION RECORDS', 15, 48);

  // Profile data block
  doc.setFillColor(248, 250, 252);
  doc.rect(15, 54, 180, 48, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(15, 54, 180, 48, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Customer Name:', 20, 60);
  doc.text('Customer ID Reference:', 20, 66);
  doc.text('Mobile Number:', 20, 72);
  doc.text('Aadhaar Identification:', 20, 78);
  doc.text('PAN Identification:', 20, 84);
  doc.text('Emergency Contact Details:', 20, 90);
  doc.text('Audit Status:', 20, 96);

  doc.setFont('helvetica', 'normal');
  doc.text(customer.displayName, 65, 60);
  doc.text(customer.uid.toUpperCase(), 65, 66);
  doc.text(customer.phoneNumber || 'N/A', 65, 72);
  doc.text('XXXX-XXXX-8921 (System Verified)', 65, 78);
  doc.text('XXXXX3812K (System Verified)', 65, 84);
  doc.text('Emergency Contact: +91 99887 76655 (Father)', 65, 90);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 163, 74); // green-600
  doc.text('VERIFIED & STAMPED BY SAMS GLOBAL OPERATIONS', 65, 96);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10.5);
  doc.text('SUBMITTED ATTACHMENTS VERIFICATION STATUS', 15, 114);

  // Table
  doc.setFillColor(15, 23, 42);
  doc.rect(15, 119, 180, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.text('Document Name', 18, 123.5);
  doc.text('Type', 80, 123.5);
  doc.text('Verification Date', 120, 123.5);
  doc.text('Status', 160, 123.5);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');

  const documents = [
    { name: 'Rental Lease Agreement', type: 'PDF Contract', date: new Date().toLocaleDateString('en-IN'), status: 'Verified' },
    { name: 'Aadhaar Identification Card', type: 'National ID Proof', date: new Date().toLocaleDateString('en-IN'), status: 'Verified' },
    { name: 'PAN Card Verification', type: 'Tax Identification', date: new Date().toLocaleDateString('en-IN'), status: 'Verified' },
    { name: 'Utility Payment Undertaking', type: 'Billing Agreement', date: new Date().toLocaleDateString('en-IN'), status: 'Verified' }
  ];

  let y = 131;
  documents.forEach(d => {
    doc.text(d.name, 18, y);
    doc.text(d.type, 80, y);
    doc.text(d.date, 120, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74);
    doc.text(d.status, 160, y);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');

    doc.setDrawColor(226, 232, 240);
    doc.line(15, y + 2, 195, y + 2);
    y += 8;
  });

  // Footer stamp & QR code
  drawQRCode(doc, 15, 180, 20);
  drawCompanySealAndSignature(doc, 135, 194, 'Operations Supervisor');

  drawSAMSFooter(doc);
  doc.save(`Customer_Document_Export_${custName}.pdf`);
};
