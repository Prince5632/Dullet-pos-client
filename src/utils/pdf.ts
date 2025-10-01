import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { Order, OrderItem } from '../types';

type AutoTable = (doc: jsPDF, data: any) => void;

declare module 'jspdf' {
  interface jsPDF {
    autoTable: AutoTable;
  }
}

export interface DeliverySummaryOptions {
  companyName?: string;
  companyAddressLines?: string[];
  companyPhone?: string;
  watermarkText?: string;
  locale?: string;
}

const formatIndianCurrency = (value: number): string => {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
  } catch {
    return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }
};

const toDataUrlFromBase64 = (dataUrlOrBase64?: string): string | null => {
  if (!dataUrlOrBase64) return null;
  if (dataUrlOrBase64.startsWith('data:image/')) return dataUrlOrBase64;
  // Assume raw base64 PNG
  return `data:image/png;base64,${dataUrlOrBase64}`;
};

const buildItemsRows = (items: OrderItem[]): Array<Array<string>> => {
  return (items || []).map((it, idx) => {
    const qty = `${it.quantity} ${it.unit}`;
    const rate = formatIndianCurrency(it.ratePerUnit);
    const total = formatIndianCurrency(it.totalAmount);
    const name = it.grade ? `${it.productName} (${it.grade})` : it.productName;
    const pack = it.packaging || '';
    return [String(idx + 1), name, pack, qty, rate, total];
  });
};

export const generateDeliverySummaryPdf = async (
  order: Order,
  opts: DeliverySummaryOptions = {}
): Promise<jsPDF> => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  const marginX = 40;
  let cursorY = 50;

  const companyName = opts.companyName || 'Dullet Industries';
  const addressLines = opts.companyAddressLines || ['Punjab, India'];
  const companyPhone = opts.companyPhone || '';

  if (opts.watermarkText) {
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.05 }));
    doc.setFontSize(90);
    doc.setTextColor(150);
    doc.text(opts.watermarkText, 120, 350, { angle: 30 });
    doc.restoreGraphicsState();
  }

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(companyName, marginX, cursorY);
  cursorY += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  addressLines.forEach((line) => {
    doc.text(line, marginX, cursorY);
    cursorY += 14;
  });
  if (companyPhone) {
    doc.text(`Phone: ${companyPhone}`, marginX, cursorY);
    cursorY += 14;
  }

  cursorY += 8;
  doc.setDrawColor(220);
  doc.line(marginX, cursorY, 555, cursorY);
  cursorY += 20;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Delivery Summary', marginX, cursorY);
  cursorY += 22;

  // Order + Customer
  const leftX = marginX;
  const rightX = 320;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Order Details', leftX, cursorY);
  doc.text('Customer Details', rightX, cursorY);
  cursorY += 12;
  doc.setFont('helvetica', 'normal');

  const orderDate = order.orderDate ? new Date(order.orderDate) : new Date();
  const deliveryAt = order.driverAssignment?.deliveryAt ? new Date(order.driverAssignment.deliveryAt) : undefined;
  const deliveryLocation = order.driverAssignment?.deliveryLocation?.address || '';

  const leftLines = [
    `Order No: ${order.orderNumber}`,
    `Order Date: ${orderDate.toLocaleString()}`,
    `Status: ${order.status}`,
    `Payment Terms: ${order.paymentTerms}`,
  ];
  const rightLines = [
    `Business: ${order.customer?.businessName || ''}`,
    `Contact: ${order.customer?.contactPersonName || ''}`,
    `Phone: ${order.customer?.phone || ''}`,
    `Address: ${order.customer?.address?.street || ''}, ${order.customer?.address?.city || ''}`,
  ];

  leftLines.forEach((t, i) => doc.text(t, leftX, cursorY + i * 14));
  rightLines.forEach((t, i) => doc.text(t, rightX, cursorY + i * 14));
  cursorY += Math.max(leftLines.length, rightLines.length) * 14 + 10;

  if (deliveryAt || deliveryLocation) {
    doc.setFont('helvetica', 'bold');
    doc.text('Delivery Info', leftX, cursorY);
    doc.setFont('helvetica', 'normal');
    cursorY += 12;
    if (deliveryAt) doc.text(`Delivered At: ${deliveryAt.toLocaleString()}`, leftX, cursorY), cursorY += 14;
    if (deliveryLocation) doc.text(`Location: ${deliveryLocation}`, leftX, cursorY), cursorY += 14;
  }

  cursorY += 6;
  // Items table
  const tableBody = buildItemsRows(order.items || []);
  (doc as any).autoTable({
    head: [["#", "Item", "Packaging", "Qty", "Rate", "Amount"]],
    body: tableBody,
    startY: cursorY,
    styles: { font: 'helvetica', fontSize: 9 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, halign: 'left' },
    columnStyles: {
      0: { cellWidth: 24, halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
    },
    margin: { left: marginX, right: marginX },
  });

  const afterTableY = (doc as any).lastAutoTable.finalY || cursorY + 20;
  cursorY = afterTableY + 16;

  // Totals
  const totalsX = 360;
  doc.setFont('helvetica', 'bold');
  doc.text('Totals', totalsX, cursorY);
  doc.setFont('helvetica', 'normal');
  cursorY += 12;
  const totals = [
    ['Subtotal', formatIndianCurrency(order.subtotal || 0)],
    ['Discount', `${order.discountPercentage ? `${order.discountPercentage}%` : ''} ${formatIndianCurrency(order.discount || 0)}`.trim()],
    ['Tax', formatIndianCurrency(order.taxAmount || 0)],
    ['Grand Total', formatIndianCurrency(order.totalAmount || 0)],
  ];
  totals.forEach(([label, value]) => {
    doc.text(label, totalsX, cursorY);
    doc.text(value, 555, cursorY, { align: 'right' as any });
    cursorY += 14;
  });

  cursorY += 10;
  // Notes
  if (order.notes) {
    doc.setFont('helvetica', 'bold');
    doc.text('Order Notes', marginX, cursorY);
    doc.setFont('helvetica', 'normal');
    cursorY += 12;
    const split = doc.splitTextToSize(order.notes, 515 - marginX);
    doc.text(split, marginX, cursorY);
    cursorY += split.length * 12 + 6;
  }

  // Signatures
  const driverSig = toDataUrlFromBase64(order.signatures?.driver);
  const receiverSig = toDataUrlFromBase64(order.signatures?.receiver);
  const sigBoxY = Math.max(cursorY + 10, 680);
  const sigBoxHeight = 80;

  doc.setDrawColor(200);
  doc.roundedRect(marginX, sigBoxY, 230, sigBoxHeight, 6, 6);
  doc.roundedRect(325, sigBoxY, 230, sigBoxHeight, 6, 6);
  doc.setFont('helvetica', 'bold');
  doc.text('Driver Signature', marginX + 10, sigBoxY + 16);
  doc.text('Receiver Signature', 325 + 10, sigBoxY + 16);

  if (driverSig) {
    doc.addImage(driverSig, 'PNG', marginX + 10, sigBoxY + 22, 210, 50, undefined, 'FAST');
  }
  if (receiverSig) {
    doc.addImage(receiverSig, 'PNG', 325 + 10, sigBoxY + 22, 210, 50, undefined, 'FAST');
  }

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text('Generated by Dullet POS', marginX, 810);

  return doc;
};

export const getDeliverySummaryPdfBlob = async (
  order: Order,
  opts?: DeliverySummaryOptions
): Promise<Blob> => {
  const doc = await generateDeliverySummaryPdf(order, opts);
  const blob = doc.output('blob');
  return blob;
};

export const downloadDeliverySummaryPdf = async (
  order: Order,
  opts?: DeliverySummaryOptions
): Promise<string> => {
  const doc = await generateDeliverySummaryPdf(order, opts);
  const fileName = `delivery_${order.orderNumber || order._id}.pdf`;
  doc.save(fileName);
  return fileName;
};


