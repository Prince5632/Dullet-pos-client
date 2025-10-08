import React from "react";

interface DeliveryInvoiceProps {
  data: any;
  onPrint?: () => void;
}

const DeliveryInvoiceTemplate: React.FC<DeliveryInvoiceProps> = ({
  data,
  onPrint,
}) => {
  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  // Helper function to safely access nested properties
  const getOrderData = () => {
    // Support both direct data and nested order structure
    return data.order || data;
  };

  const orderData = getOrderData();
  const company = data.company || {};
  const customer = orderData.customer || {};
  const items = orderData.items || [];

  // Format date helper
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Calculate total amount
  const calculateTotal = () => {
    return items.reduce((total: number, item: any) => {
      return total + (item.totalAmount || item.taxableValue || 0);
    }, 0);
  };

  // Simple number to words conversion (basic implementation)
  const numberToWords = (num: number): string => {
    if (num === 0) return 'Zero';
    
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const convertHundreds = (n: number): string => {
      let result = '';
      if (n >= 100) {
        result += ones[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
      }
      if (n >= 20) {
        result += tens[Math.floor(n / 10)] + ' ';
        n %= 10;
      } else if (n >= 10) {
        result += teens[n - 10] + ' ';
        return result;
      }
      if (n > 0) {
        result += ones[n] + ' ';
      }
      return result;
    };
    
    let result = '';
    const crores = Math.floor(num / 10000000);
    const lakhs = Math.floor((num % 10000000) / 100000);
    const thousands = Math.floor((num % 100000) / 1000);
    const hundreds = num % 1000;
    
    if (crores > 0) result += convertHundreds(crores) + 'Crore ';
    if (lakhs > 0) result += convertHundreds(lakhs) + 'Lakh ';
    if (thousands > 0) result += convertHundreds(thousands) + 'Thousand ';
    if (hundreds > 0) result += convertHundreds(hundreds);
    
    return result.trim();
  };

  return (
    <div className="delivery-invoice">
      {/* Print Button - Hidden during print */}
      <div className="print-controls no-print">
        <button onClick={handlePrint} className="print-btn">
          Print Invoice
        </button>
      </div>

      {/* Invoice Content - Mimicking the exact SVG layout */}
      <div className="invoice-page">
        {/* Main Border Container */}
        <div className="invoice-container">
          {/* Header Section with Logo and Tax Invoice */}
          <div className=" flex flex-col justify-center ">
            <div className="logo-section text-center">
              <div className="blinkit-logo">{company.name || 'Dullet Industries'}</div>
            </div>
            <div className=" border text-[20px] border-l-0 border-r-0 py-3 flex justify-center items-center font-bold">
              Delivery Chalan
            </div>
          </div>

          {/* Company and Customer Info Section */}
          <div className="info-section">
            <div className="sold-by-section">
              <div className="section-title">Sold By / Seller</div>
              <div className="company-name">{company.name || 'Dullet Industries'}</div>
              <div className="company-address">{company.address}</div>
              <div className="company-address">
                {company.city}{company.state ? `, ${company.state}` : ''} {company.pincode}
              </div>

              <div className="company-details">
                <div className="detail-row">
                  <span className="detail-label">GSTIN</span>
                  <span className="detail-colon">:</span>
                  <span className="detail-value">{company.gstin || 'N/A'}</span>
                </div>
                {company.pan && (
                  <div className="detail-row">
                    <span className="detail-label">PAN</span>
                    <span className="detail-colon">:</span>
                    <span className="detail-value">{company.pan}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="invoice-to-section">
              <div className="invoice-meta">
                <div className="meta-row">
                  <span className="meta-label">Order Id</span>
                  <span className="meta-value">{orderData.orderNumber || orderData._id || data.orderId || 'N/A'}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">Invoice Date</span>
                  <span className="meta-value">{formatDate(orderData.orderDate || orderData.createdAt || data.invoiceDate)}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">Place of Supply</span>
                  <span className="meta-value">{data.placeOfSupply || customer.address?.state || customer.state || 'N/A'}</span>
                </div>
              </div>

              <div className="invoice-to">
                <div className="section-title">Invoice To</div>
                <div className="customer-name">{customer.businessName || customer.name || 'N/A'}</div>
                <div className="customer-address">
                  {customer.address?.street || customer.address || 'N/A'}
                </div>
                <div className="customer-city">
                  {customer.address?.city || customer.city || 'N/A'}
                </div>
                <div className="customer-state">
                  {customer.address?.state || customer.state || 'N/A'} {customer.address?.pincode || customer.pincode || ''}
                </div>
                {customer.phone && (
                  <div className="customer-phone">Phone: {customer.phone}</div>
                )}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="items-table-container p-4">
            <table className="items-table">
              <thead>
                <tr>
                  <th>Sr No</th>
                  <th>Item Name</th>
                  <th>HSN Code</th>
                  <th>Quantity</th>
                  <th>Rate</th>
                  <th>Taxable Value</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, index: number) => (
                  <tr key={item._id || index}>
                    <td>{index + 1}</td>
                    <td>{item.productName || item.description || 'N/A'}</td>
                    <td>{item.hsnCode || 'N/A'}</td>
                    <td>{item.quantity} {item.unit || ''}</td>
                    <td>₹{(item.ratePerUnit || item.rate || 0).toFixed(2)}</td>
                    <td>₹{(item.totalAmount || item.taxableValue || 0).toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td colSpan={5} className="total-label">Total</td>
                  <td className="total-value border text-center">
                    ₹{(orderData.totalAmount || orderData.subtotal || data?.totals?.grandTotal || calculateTotal()).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
  {/* Delivery Partner and Customer Signatures */}
           <div className="signatures-section">
             <div className="delivery-signature">
               <div className="signature-title">Delivery Partner Signature</div>
               <div className="signature-box">
                 {orderData.signatures?.driver && (
                   <img 
                     src={orderData.signatures.driver} 
                     alt="Driver Signature" 
                     style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                   />
                 )}
               </div>
               <div className="signature-label">
                 {orderData.driverAssignment?.driver ? 
                   `${orderData.driverAssignment.driver.firstName} ${orderData.driverAssignment.driver.lastName}` : 
                   'Signature'
                 }
               </div>
             </div>
             <div className="customer-signature">
               <div className="signature-title">Customer Signature</div>
               <div className="signature-box">
                 {orderData.signatures?.receiver && (
                   <img 
                     src={orderData.signatures.receiver} 
                     alt="Customer Signature" 
                     style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                   />
                 )}
               </div>
               <div className="signature-label">Signature</div>
             </div>
           </div>
          {/* Amount in Words and Company Signature */}
           <div className="bottom-section">
             <div className="amount-words">
               <span className="words-label">Amount in Words:</span>
               <span className="words-value">
                 {data.totals?.amountInWords || 
                  `${numberToWords(orderData.totalAmount || orderData.subtotal || calculateTotal())} Rupees Only`}
               </span>
             </div>
             {orderData.driverAssignment?.vehicleNumber && (
               <div className="vehicle-info">
                 <span className="vehicle-label">Vehicle Number:</span>
                 <span className="vehicle-value">{orderData.driverAssignment.vehicleNumber}</span>
               </div>
             )}
           </div>

         

        
        </div>
      </div>

      {/* Exact CSS to match the original template */}
      <style jsx>{`
        .delivery-invoice {
          width: 100%;
          max-width: 793px;
          margin: 0 auto;
          background: #777;
          padding: 5px 0;
          font-family: "DejaVu Sans", Arial, sans-serif;
        }

        .print-controls {
          margin-bottom: 20px;
          text-align: center;
          background: white;
          padding: 10px;
        }

        .print-btn {
          background: #007bff;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
        }

        .print-btn:hover {
          background: #0056b3;
        }

        .invoice-page {
          background: white;
          margin: 5px 0;
        }

        .invoice-container {
          width: 100%;
          position: relative;
          background: white;
          border: 1px solid #000;
        }

        /* Header Section */
        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 20px;
          border-bottom: 1px solid #000;
          height: 120px;
        }

        .logo-section {
          flex: 1;
        }

        .blinkit-logo {
          font-size: 36px;
          font-weight: bold;
          color: #000;
          font-family: Arial, sans-serif;
        }

        .tax-invoice-section {
          flex: 1;
          text-align: right;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .tax-invoice-title {
          font-size: 30px;
          font-weight: bold;
          margin: 0 0 20px 0;
          color: #000;
        }

        .qr-code {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .qr-placeholder {
          width: 96px;
          height: 96px;
          border: 1px solid #000;
          background: #f0f0f0;
          margin-bottom: 5px;
        }

        .invoice-number-qr {
          font-size: 10px;
          text-align: center;
        }

        /* Info Section */
        .info-section {
          display: flex;
          border-bottom: 1px solid #000;
          min-height: 200px;
        }

        .sold-by-section {
          flex: 1;
          padding: 15px;
          border-right: 1px solid #000;
        }

        .invoice-to-section {
          flex: 1;
          padding: 15px;
          display: flex;
          flex-direction: column;
        }

        .section-title {
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 8px;
          color: #000;
        }

        .company-name {
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 5px;
          color: #000;
        }

        .company-address {
          font-size: 12px;
          margin-bottom: 3px;
          color: #000;
        }

        .company-details {
          margin-top: 15px;
        }

        .detail-row {
          display: flex;
          margin-bottom: 5px;
          font-size: 12px;
        }

        .detail-label {
          font-weight: bold;
          color: #000;
        }

        .detail-colon {
          width: 10px;
          color: #000;
        }

        .detail-value {
          color: #000;
        }

        .invoice-meta {
          margin-bottom: 20px;
        }

        .meta-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
          font-size: 12px;
        }

        .meta-label {
          font-weight: bold;
          color: #000;
        }

        .meta-value {
          color: #000;
        }

        .invoice-to {
          flex: 1;
        }

        .customer-name {
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 5px;
          color: #000;
        }

        .customer-address,
        .customer-city,
        .customer-state {
          font-size: 12px;
          margin-bottom: 3px;
          color: #000;
        }

        /* Items Table */
        .items-table-container {
          border-bottom: 1px solid #000;
        }

        .items-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
        }

        .items-table th,
        .items-table td {
          border: 1px solid #000;
          padding: 4px 2px;
          text-align: center;
          vertical-align: middle;
        }

        .items-table th {
          background: #f5f5f5;
          font-weight: bold;
          font-size: 9px;
        }

        .text-left {
          text-align: left !important;
        }

        .total-row {
          font-weight: bold;
        }

        .total-label {
          text-align: right !important;
          font-weight: bold;
        }

        .total-value {
          font-weight: bold;
        }

        /* Column widths for 6-column layout */
        .items-table th:nth-child(1),
        .items-table td:nth-child(1) { width: 8%; } /* Sr No */
        .items-table th:nth-child(2),
        .items-table td:nth-child(2) { width: 35%; text-align: left; } /* Item Name */
        .items-table th:nth-child(3),
        .items-table td:nth-child(3) { width: 15%; } /* HSN Code */
        .items-table th:nth-child(4),
        .items-table td:nth-child(4) { width: 12%; } /* Quantity */
        .items-table th:nth-child(5),
        .items-table td:nth-child(5) { width: 15%; } /* Rate */
        .items-table th:nth-child(6),
        .items-table td:nth-child(6) { width: 15%; } /* Taxable Value */

        /* Bottom Section */
        .bottom-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding: 15px;
          border-bottom: 1px solid #000;
        }

        .amount-words {
          font-size: 12px;
          color: #000;
        }

        .words-label {
          font-weight: bold;
        }

        .vehicle-info {
          margin-bottom: 10px;
          font-size: 12px;
          color: #000;
        }
        
        .vehicle-label {
          font-weight: bold;
        }
        
        .vehicle-value {
          font-weight: normal;
        }

        .signature-section {
          text-align: right;
          font-size: 12px;
        }

        .company-signature {
          margin-bottom: 40px;
          color: #000;
        }

        .signature-space {
          height: 40px;
          border-bottom: 1px solid #000;
          width: 150px;
          margin-left: auto;
        }

        .authorized-signature {
          margin-top: 5px;
          color: #000;
        }

        /* Signatures Section */
        .signatures-section {
          display: flex;
          justify-content: space-between;
          padding: 20px;
          border-bottom: 1px solid #000;
        }

        .delivery-signature,
        .customer-signature {
          flex: 1;
          text-align: center;
          margin: 0 20px;
        }

        .signature-title {
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 10px;
          color: #000;
        }

        .signature-box {
          height: 60px;
          border: 1px solid #000;
          margin-bottom: 10px;
          background: white;
        }

        .signature-label {
           font-size: 10px;
           color: #000;
         }

         /* Terms Section */
         .terms-section {
           padding: 15px;
           font-size: 10px;
         }

         .terms-title {
           font-weight: bold;
           margin-bottom: 10px;
           color: #000;
         }

         .terms-list {
           margin: 0;
           padding-left: 15px;
           color: #000;
         }

         .terms-list li {
           margin-bottom: 5px;
           line-height: 1.3;
         }

         /* Print Styles */
        @media print {
          .no-print {
            display: none !important;
          }

          .delivery-invoice {
            background: white;
            padding: 0;
            margin: 0;
            max-width: none;
          }

          .invoice-page {
            margin: 0;
          }

          body {
            margin: 0;
            padding: 0;
            background: white;
          }
        }
      `}</style>
    </div>
  );
};

export default DeliveryInvoiceTemplate;
