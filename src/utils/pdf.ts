import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Order, OrderItem } from '../types';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
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
  const num = Number(value || 0);
  if (isNaN(num)) return '₹0.00';
  return `₹${num.toFixed(2)}`; // No locale formatting, just two decimals
};


const toDataUrlFromBase64 = (dataUrlOrBase64?: string): string | null => {
  if (!dataUrlOrBase64) return null;
  if (dataUrlOrBase64.startsWith('data:image/')) return dataUrlOrBase64;
  // Assume raw base64 PNG
  return `data:image/png;base64,${dataUrlOrBase64}`;
};

const buildItemsRows = (items: OrderItem[]): Array<Array<string>> => {
  return (items || []).map((it, idx) => {
    const qty = `${Number(it.quantity || 0).toLocaleString('en-IN')} ${it.unit || 'KG'}`;
    const rate = formatIndianCurrency(Number(it.ratePerUnit || 0));
    const total = formatIndianCurrency(Number(it.totalAmount || 0));
    const name = it.grade ? `${it.productName || ''} (${it.grade})` : (it.productName || '');
    const pack = it.packaging || 'Loose';
    return [String(idx + 1), name, pack, qty, rate, total];
  });
};

export const generateDeliverySummaryPdf = async (
  order: Order,
  opts: DeliverySummaryOptions = {}
): Promise<jsPDF> => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  const marginX = 40;
  const pageWidth = 595.28; // A4 width in points
  const pageHeight = 841.89; // A4 height in points
  const contentWidth = pageWidth - (marginX * 2);
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
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
  cursorY += 20;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Delivery Summary', marginX, cursorY);
  cursorY += 22;

  // Order + Customer
  const leftX = marginX;
  const rightX = marginX + (contentWidth / 2) + 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Order Details', leftX, cursorY);
  doc.text('Customer Details', rightX, cursorY);
  cursorY += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  const orderDate = order.orderDate ? new Date(order.orderDate) : new Date();
  const deliveryAt = order.driverAssignment?.deliveryAt ? new Date(order.driverAssignment.deliveryAt) : undefined;
  const deliveryLocation = order.driverAssignment?.deliveryLocation?.address || '';

  const leftLines = [
    `Order No: ${order.orderNumber || 'N/A'}`,
    `Order Date: ${orderDate.toLocaleDateString('en-IN')} ${orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
    `Status: ${order.status || 'N/A'}`,
    `Payment Terms: ${order.paymentTerms || 'N/A'}`,
  ];
  
  const customerAddress = [
    order.customer?.address?.street || '',
    order.customer?.address?.city || ''
  ].filter(Boolean).join(', ');
  
  const rightLines = [
    `Business: ${order.customer?.businessName || 'N/A'}`,
    `Contact: ${order.customer?.contactPersonName || 'N/A'}`,
    `Phone: ${order.customer?.phone || 'N/A'}`,
    `Address: ${customerAddress || 'N/A'}`,
  ];

  leftLines.forEach((t, i) => doc.text(t, leftX, cursorY + i * 14));
  rightLines.forEach((t, i) => doc.text(t, rightX, cursorY + i * 14));
  cursorY += Math.max(leftLines.length, rightLines.length) * 14 + 10;

  if (deliveryAt || deliveryLocation) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Delivery Info', leftX, cursorY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    cursorY += 12;
    if (deliveryAt) {
      doc.text(`Delivered At: ${deliveryAt.toLocaleDateString('en-IN')} ${deliveryAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`, leftX, cursorY);
      cursorY += 14;
    }
    if (deliveryLocation) {
      const locationText = doc.splitTextToSize(`Location: ${deliveryLocation}`, contentWidth);
      doc.text(locationText, leftX, cursorY);
      cursorY += locationText.length * 12;
    }
  }

  cursorY += 6;
  // Items table
  const tableBody = buildItemsRows(order.items || []);
  const tableResult = autoTable(doc, {
    head: [["#", "Item", "Packaging", "Qty", "Rate", "Amount"]],
    body: tableBody,
    startY: cursorY,
     styles: { 
    font: 'helvetica', 
    fontSize: 9,
    cellPadding: 4,
    halign: 'left'
  },
    headStyles: { 
      fillColor: [37, 99, 235], 
      textColor: 255, 
      halign: 'center',
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 30, halign: 'center' },  // # column
      1: { cellWidth: 180, halign: 'left' },   // Item column
      2: { cellWidth: 80, halign: 'center' },  // Packaging column
      3: { cellWidth: 80, halign: 'right' },   // Qty column
      4: { cellWidth: 80, halign: 'right' },   // Rate column
      5: { cellWidth: 95, halign: 'right' },   // Amount column
    },
    margin: { left: marginX, right: marginX },
    tableWidth: 'wrap',
    theme: 'grid'
  });

  const afterTableY = (doc as any).lastAutoTable?.finalY || cursorY + 20;
  cursorY = afterTableY + 16;

  // Totals
  const totalsX = 350;
  const totalsValueX = 520;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Totals', totalsX, cursorY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  cursorY += 16;
  
  const subtotal = Number(order.subtotal || 0);
  const discount = Number(order.discount || 0);
  const discountPercentage = Number(order.discountPercentage || 0);
  const taxAmount = Number(order.taxAmount || 0);
  const totalAmount = Number(order.totalAmount || 0);
  
  const totals = [
    ['Subtotal', formatIndianCurrency(subtotal)],
    ['Discount', discountPercentage > 0 ? `${discountPercentage}% - ${formatIndianCurrency(discount)}` : formatIndianCurrency(discount)],
    ['Tax', formatIndianCurrency(taxAmount)],
  ];
  
  totals.forEach(([label, value]) => {
    doc.text(label, totalsX, cursorY);
    doc.text(value, totalsValueX, cursorY, { align: 'right' as any });
    cursorY += 14;
  });
  
  // Grand Total with emphasis
  doc.setFont('helvetica', 'bold');
  doc.text('Grand Total', totalsX, cursorY);
  doc.text(formatIndianCurrency(totalAmount), totalsValueX, cursorY, { align: 'right' as any });
  doc.setFont('helvetica', 'normal');
  cursorY += 14;

  cursorY += 10;
  // Notes
  if (order.notes && order.notes.trim()) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Order Notes', marginX, cursorY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    cursorY += 12;
    const split = doc.splitTextToSize(order.notes.trim(), contentWidth);
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


