import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Order } from '../types';

export const generateDeliveryNotePDF = (order: Order): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;

  // Header - Company Name
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('DULLET INDUSTRIES', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Punjab, India', pageWidth / 2, yPos, { align: 'center' });

  // Title
  yPos += 15;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('DELIVERY NOTE', pageWidth / 2, yPos, { align: 'center' });

  // Order Details Section
  yPos += 12;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('ORDER DETAILS', 14, yPos);
  
  yPos += 2;
  doc.setLineWidth(0.5);
  doc.line(14, yPos, pageWidth - 14, yPos);

  yPos += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  const orderDetails = [
    ['Order Number:', order.orderNumber || 'N/A'],
    ['Order Date:', new Date(order.orderDate).toLocaleDateString('en-IN')],
    ['Status:', (order.status || 'N/A').toUpperCase()],
    ['Payment Terms:', order.paymentTerms || 'Cash'],
    ['Priority:', (order.priority || 'Normal').toUpperCase()],
  ];

  orderDetails.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 60, yPos);
    yPos += 5;
  });

  // Customer Details Section
  yPos += 5;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CUSTOMER DETAILS', 14, yPos);
  
  yPos += 2;
  doc.line(14, yPos, pageWidth - 14, yPos);

  yPos += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const customerDetails = [
    ['Business Name:', order.customer?.businessName || 'N/A'],
    ['Phone:', order.customer?.phone || 'N/A'],
    ...(order.customer?.email ? [['Email:', order.customer.email]] : []),
    ['Address:', order.customer?.address 
      ? `${order.customer.address.street || ''}, ${order.customer.address.city || ''}, ${order.customer.address.state || ''} ${order.customer.address.pincode || ''}`.trim()
      : 'N/A'],
  ];

  customerDetails.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 14, yPos);
    doc.setFont('helvetica', 'normal');
    const splitText = doc.splitTextToSize(value, pageWidth - 74);
    doc.text(splitText, 60, yPos);
    yPos += splitText.length * 5;
  });

  // Delivery Information
  if (order.driverAssignment?.driver) {
    yPos += 5;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DELIVERY INFORMATION', 14, yPos);
    
    yPos += 2;
    doc.line(14, yPos, pageWidth - 14, yPos);

    yPos += 7;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    const deliveryDetails = [
      ['Driver:', `${order.driverAssignment.driver.firstName || ''} ${order.driverAssignment.driver.lastName || ''}`.trim()],
      ['Driver Phone:', order.driverAssignment.driver.phone || 'N/A'],
      ...(order.driverAssignment.vehicleNumber ? [['Vehicle Number:', order.driverAssignment.vehicleNumber]] : []),
      ...(order.driverAssignment.assignedAt ? [['Assigned At:', new Date(order.driverAssignment.assignedAt).toLocaleString('en-IN')]] : []),
      ...(order.driverAssignment.deliveryAt ? [['Delivered At:', new Date(order.driverAssignment.deliveryAt).toLocaleString('en-IN')]] : []),
      ...(order.driverAssignment.deliveryLocation?.address ? [['Delivery Location:', order.driverAssignment.deliveryLocation.address]] : []),
    ];

    deliveryDetails.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 14, yPos);
      doc.setFont('helvetica', 'normal');
      const splitText = doc.splitTextToSize(value, pageWidth - 74);
      doc.text(splitText, 60, yPos);
      yPos += splitText.length * 5;
    });
  }

  // Items Table
  yPos += 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('ITEMS DELIVERED', 14, yPos);
  
  yPos += 2;
  doc.line(14, yPos, pageWidth - 14, yPos);

  yPos += 5;

  // Prepare table data
  const tableData = (order.items || []).map((item, index) => [
    (index + 1).toString(),
    item.productName || 'N/A',
    item.packaging || 'N/A',
    `${Number(item.quantity || 0).toFixed(2)} ${item.unit || 'KG'}`,
    `Rs ${Number(item.ratePerUnit || 0).toFixed(2)}`,
    `Rs ${Number(item.totalAmount || 0).toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Product', 'Packaging', 'Quantity', 'Rate', 'Amount']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 50 },
      2: { cellWidth: 30 },
      3: { cellWidth: 30 },
      4: { cellWidth: 25 },
      5: { cellWidth: 25 },
    },
    margin: { left: 14, right: 14 },
  });

  // Get Y position after table
  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Payment Summary
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT SUMMARY', 14, yPos);
  
  yPos += 2;
  doc.line(14, yPos, pageWidth - 14, yPos);

  yPos += 7;
  doc.setFontSize(9);

  const subtotal = Number(order.subtotal || 0);
  const discount = Number(order.discount || 0);
  const tax = Number(order.taxAmount || 0);
  const totalAmount = Number(order.totalAmount || 0);
  const paidAmount = Number(order.paidAmount || 0);
  const remainingAmount = totalAmount - paidAmount;

  const paymentSummary = [
    ['Subtotal:', `Rs ${subtotal.toFixed(2)}`],
    ['Discount:', `Rs ${discount.toFixed(2)}`],
    ['Tax:', `Rs ${tax.toFixed(2)}`],
    ['Grand Total:', `Rs ${totalAmount.toFixed(2)}`],
    ['Paid Amount:', `Rs ${paidAmount.toFixed(2)}`],
    ['Payment Status:', order.paymentStatus || 'Pending'],
    ...(remainingAmount > 0 ? [['Remaining Amount:', `Rs ${remainingAmount.toFixed(2)}`]] : []),
  ];

  const summaryStartX = pageWidth - 80;
  paymentSummary.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal');
    doc.text(label, summaryStartX, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(value, pageWidth - 14, yPos, { align: 'right' });
    yPos += 5;
  });

  // Notes Section
  if (order.notes || order.deliveryInstructions || order.driverAssignment?.driverNotes) {
    yPos += 10;
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('NOTES', 14, yPos);
    
    yPos += 2;
    doc.line(14, yPos, pageWidth - 14, yPos);

    yPos += 7;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    if (order.notes) {
      const notesText = doc.splitTextToSize(`Order Notes: ${order.notes}`, pageWidth - 28);
      doc.text(notesText, 14, yPos);
      yPos += notesText.length * 5 + 3;
    }

    if (order.deliveryInstructions) {
      const deliveryText = doc.splitTextToSize(`Delivery Instructions: ${order.deliveryInstructions}`, pageWidth - 28);
      doc.text(deliveryText, 14, yPos);
      yPos += deliveryText.length * 5 + 3;
    }

    if (order.driverAssignment?.driverNotes) {
      const driverText = doc.splitTextToSize(`Driver Notes: ${order.driverAssignment.driverNotes}`, pageWidth - 28);
      doc.text(driverText, 14, yPos);
      yPos += driverText.length * 5;
    }
  }

  // Signature Section
  yPos += 15;
  if (yPos > pageHeight - 50) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('SIGNATURES', 14, yPos);
  
  yPos += 2;
  doc.line(14, yPos, pageWidth - 14, yPos);

  yPos += 10;

  // Receiver Signature
  if (order.signatures?.receiver) {
    try {
      doc.addImage(order.signatures.receiver, 'PNG', 14, yPos, 50, 20);
    } catch (error) {
      console.error('Error adding receiver signature:', error);
    }
  }
  yPos += 22;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.line(14, yPos, 64, yPos);
  yPos += 4;
  doc.text('Receiver Signature', 14, yPos);

  // Driver Signature
  yPos -= 26;
  const driverSigX = pageWidth - 64;
  if (order.signatures?.driver) {
    try {
      doc.addImage(order.signatures.driver, 'PNG', driverSigX, yPos, 50, 20);
    } catch (error) {
      console.error('Error adding driver signature:', error);
    }
  }
  yPos += 22;
  doc.line(driverSigX, yPos, pageWidth - 14, yPos);
  yPos += 4;
  doc.text('Driver Signature', driverSigX, yPos);

  // Footer
  const footerY = pageHeight - 20;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(128, 128, 128);
  doc.text('Thank you for your business!', pageWidth / 2, footerY, { align: 'center' });
  doc.text(
    `Generated on: ${new Date().toLocaleString('en-IN')}`,
    pageWidth / 2,
    footerY + 5,
    { align: 'center' }
  );
  doc.text('Dullet POS - Delivery Management System', pageWidth / 2, footerY + 10, { align: 'center' });

  // Save the PDF
  const fileName = `Delivery_Note_${order.orderNumber}_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
};

