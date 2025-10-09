import React from "react";

interface DeliveryInvoiceProps {
  data: any;
}

const DeliveryInvoiceTemplate: React.FC<DeliveryInvoiceProps> = ({
  data,
}) => {
  

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
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Calculate total amount
  const calculateTotal = () => {
    return items.reduce((total: number, item: any) => {
      return total + (item.totalAmount || item.taxableValue || 0);
    }, 0);
  };

  // Simple number to words conversion (basic implementation)


  return (
    <div className="delivery-invoice">
     
      {/* Invoice Content - Mimicking the exact SVG layout */}
      <div className="invoice-page p-6">
        {/* Main Border Container */}
        <div className="invoice-container">
          {/* Header Section with Logo and Tax Invoice */}
          <div className=" flex flex-col justify-center ">
            <div className="logo-section text-center">
              <div className="blinkit-logo py-2">
                Delivery Challan
              </div>
            </div>
            <div className=" border text-[20px] border-l-0 border-r-0 py-3 flex justify-center items-center font-bold">
                {company.name || "Dullet Industries"}
              
            </div>
          </div>
          <div className="border border-l-0 p-1 border-t-0 border-r-0">
            <strong>Challan Number:</strong>{" "}
            {orderData.orderNumber?.replace("ORD","CHL")}
          </div>
          <div className="border border-l-0 p-1 border-t-0 border-r-0">
            <strong>Date:</strong>{" "}
            {formatDate(
              orderData.orderDate || orderData.createdAt || data.invoiceDate
            )}
          </div>
          <div className="border border-l-0 p-1 border-t-0 border-r-0">
            <strong>GSTIN:</strong>{" "}
            {company.gstin || "N/A"}
          </div>

          {/* Company and Customer Info Section */}
          <div className="info-section">
            <div className="sold-by-section">
              <div className="section-title">Sold By / Seller</div>
              <div className="company-name">
                {company.name || "Dullet Industries"}
              </div>
              <div
                className="section-title"
                style={{
                  fontSize: "12px",
                  marginTop: "10px",
                  marginBottom: "5px",
                }}
              >
                Address:
              </div>
              <div className="company-address">{company.address}</div>
              <div className="company-address">
                {company.city}
                {company.state ? `, ${company.state}` : ""} {company.pincode}
              </div>

              <div className="company-details">
                {orderData.godown?.contact?.phone && (
                  <div className="detail-row">
                    <span className="detail-label">Phone</span>
                    <span className="detail-colon">:</span>
                    <span className="detail-value">{orderData.godown.contact.phone}</span>
                  </div>
                )}
                {orderData.godown?.contact?.email && (
                  <div className="detail-row">
                    <span className="detail-label">Email</span>
                    <span className="detail-colon">:</span>
                    <span className="detail-value">{orderData.godown.contact.email}</span>
                  </div>
                )}
                
              </div>
            </div>

            <div className="invoice-to-section">
              <div className="invoice-meta">
                <div className="invoice-to">
                  <div className="section-title">Challan To</div>
                  <div className="customer-name capitalize">
                    {customer.businessName || customer.name || "N/A"}
                  </div>

                  <div
                    className="section-title"
                    style={{
                      fontSize: "12px",
                      marginTop: "10px",
                      marginBottom: "5px",
                    }}
                  >
                    Address:
                  </div>
                  <div className="customer-address">
                    {[
                      customer.address?.street || customer.address,
                      customer.address?.city || customer.city,
                      customer.address?.state || customer.state,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                    {(customer.address?.pincode || customer.pincode) &&
                      ` - ${customer.address?.pincode || customer.pincode}`}
                  </div>
                  {customer.phone && (
                    <div className="">Phone: {customer.phone}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
         { orderData.driverAssignment?.driver?.firstName ?<div className="border border-l-0 p-1 border-t-0 border-r-0">
            <strong>Delivery Partner Name:</strong>{" "}
            {orderData.driverAssignment?.driver?.firstName +
              " " +
              orderData.driverAssignment?.driver?.lastName || "N/A"}
          </div>:null}
          {orderData.driverAssignment?.vehicleNumber ?<div className="border border-l-0 p-1 border-t-0 border-r-0">
            <strong>Vehicle Number:</strong>{" "}
            {orderData.driverAssignment?.vehicleNumber || "N/A"}
          </div>:null}
          

          {/* Items Table */}
          <div className="items-table-container">
            <table className="items-table">
              <thead>
                <tr>
                  <th>SR NO</th>
                  <th>ITEM NAME</th>
                  <th>HSN CODE</th>
                  <th>QUANTITY</th>
                  <th>PACKAGING</th>
                  <th>RATE</th>
                  <th>ITEM PRICE</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, index: number) => (
                  <tr key={item._id || index}>
                    <td>{index + 1}</td>
                    <td>{item.productName || item.description || "N/A"}</td>
                    <td>{company?.hsnCode || "N/A"}</td>
                    <td>
                      {item.quantity} {item.unit || ""}
                    </td>
                    <td>
                      {item.isBagSelection ? 
                        (item.packaging === "5kg Bags" ? "40kg Bags" : (item.packaging || "N/A")) 
                        : "Loose"}
                    </td>
                    <td>₹{(item.ratePerUnit || item.rate || 0).toFixed(2)}</td>
                    <td>
                      ₹{(item.totalAmount || item.taxableValue || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

<div className="flex justify-end">
            {/* Order Summary - Simple Design Below Table */}
            <div className="table-summary">
              <div className="summary-row-simple">
                <span>Sub Total:</span>
                <span>
                  ₹{(orderData.subtotal || calculateTotal()).toFixed(2)}
                </span>
              </div>
              {orderData.taxAmount && orderData.taxAmount > 0 ? (
                <div className="summary-row-simple">
                  <span>Tax Amount ({orderData?.taxPercentage}%):</span>
                  <span>₹{orderData.taxAmount.toFixed(2)}</span>
                </div>
              ) : null}
              <div className="summary-row-simple total-row-simple">
                <span>Total Amount:</span>
                <span>
                  ₹
                  {(
                    orderData.finalAmount ||
                    orderData.totalAmount ||
                    calculateTotal()
                  ).toFixed(2)}
                </span>
              </div>
              {orderData.paidAmount !== undefined && (
                <div className="summary-row-simple">
                  <span>Paid Amount:</span>
                  <span>₹{orderData.paidAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="summary-row-simple">
                <span>Remaining Payment:</span>
                <span>
                  ₹{(
                    (orderData.totalAmount ||
                      orderData.subtotal ||
                      calculateTotal()) -
                    (orderData.paidAmount || 0)
                  ).toFixed(2)}
                </span>
              </div>
            </div></div>
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
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                )}
              </div>
             
            </div>
            <div className="customer-signature">
              <div className="signature-title">Customer Signature</div>
              <div className="signature-box">
                {orderData.signatures?.receiver && (
                  <img
                    src={orderData.signatures.receiver}
                    alt="Customer Signature"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                )}
              </div>
            </div>
          </div>


          {/* Footer Section */}
          <div className="invoice-footer">
            <div className="footer-content">
              <p>Thank you for your business!</p>
              <p>Generated on: {new Date().toLocaleString('en-IN', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit',
                hour12: true 
              })}</p>
              <p>Dullet POS - Delivery Management System</p>
            </div>
          </div>
        </div>
      </div>

      {/* Consistent and responsive CSS styles */}
      <style>{`
        .delivery-invoice {
          width: 100%;
          max-width: 793px;
          margin: 0 auto;
          font-family: "DejaVu Sans", Arial, sans-serif;
          font-size: 12px;
          line-height: 1.4;
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
          font-size: 14px;
          font-weight: 600;
        }

        .print-btn:hover {
          background: #0056b3;
        }

        .invoice-page {
          background: white;
          margin: 5px 0;
          padding: 10px;
        }

        .invoice-container {
          width: 100%;
          position: relative;
          background: white;
          border: 2px solid #000;
        }

        /* Header Section */
        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 15px;
          border-bottom: 2px solid #000;
          min-height: 120px;
        }

        .logo-section {
          flex: 1;
        }

        .blinkit-logo {
          font-size: 28px;
          font-weight: bold;
          color: #000;
          font-family: Arial, sans-serif;
          word-wrap: break-word;
        }

        /* Info Section */
        .info-section {
          display: flex;
          border-bottom: 2px solid #000;
          min-height: 200px;
        }

        .sold-by-section {
          flex: 1;
          padding: 10px;
          border-right: 2px solid #000;
        }

        .invoice-to-section {
          flex: 1;
          padding: 10px;
          display: flex;
          flex-direction: column;
        }

        .section-title {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 8px;
          color: #000;
          word-wrap: break-word;
        }

        .company-name {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 5px;
          color: #000;
          word-wrap: break-word;
        }

        .company-address {
          font-size: 12px;
          margin-bottom: 3px;
          color: #000;
          word-wrap: break-word;
        }

        .company-details {
          margin-top: 15px;
        }

        .detail-row {
          display: flex;
          margin-bottom: 5px;
          font-size: 12px;
          word-wrap: break-word;
        }

        .detail-label {
          font-weight: bold;
          color: #000;
          min-width: 60px;
        }

        .detail-colon {
          width: 10px;
          color: #000;
        }

        .detail-value {
          color: #000;
          word-wrap: break-word;
        }

        .invoice-meta {
          margin-bottom: 20px;
        }

        .meta-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
          font-size: 12px;
          word-wrap: break-word;
        }

        .meta-label {
          font-weight: bold;
          color: #000;
        }

        .meta-value {
          color: #000;
          word-wrap: break-word;
        }

        .invoice-to {
          flex: 1;
        }

        .customer-name {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 5px;
          color: #000;
          word-wrap: break-word;
        }

        .customer-address,
        .customer-city,
        .customer-state {
          font-size: 12px;
          margin-bottom: 3px;
          color: #000;
          word-wrap: break-word;
        }

        /* Items Table */
        .items-table-container {
          border-bottom: 2px solid #000;
          padding: 10px;
        }

        .items-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }

        .items-table th,
        .items-table td {
          border: 1px solid #000;
          padding: 8px 4px;
          text-align: center;
          vertical-align: middle;
          word-wrap: break-word;
        }

        .items-table th {
          background: #f5f5f5;
          font-weight: bold;
          font-size: 12px;
        }

        .items-table th:nth-child(1),
        .items-table td:nth-child(1) {
          width: 6%;
        }

        .items-table th:nth-child(2),
        .items-table td:nth-child(2) {
          width: 28%;
          text-align: left;
        }

        .items-table th:nth-child(3),
        .items-table td:nth-child(3) {
          width: 12%;
        }

        .items-table th:nth-child(4),
        .items-table td:nth-child(4) {
          width: 12%;
        }

        .items-table th:nth-child(5),
        .items-table td:nth-child(5) {
          width: 14%;
        }

        .items-table th:nth-child(6),
        .items-table td:nth-child(6) {
          width: 14%;
        }

        .items-table th:nth-child(7),
        .items-table td:nth-child(7) {
          width: 14%;
        }

        /* Table Summary Section - Simple Design */
        .table-summary {
          margin-top: 10px;
          padding: 10px 0;
          max-width: 220px;
        }

        .summary-row-simple {
          display: flex;
          justify-content: space-between;
          padding: 3px 0;
          font-size: 12px;
          min-height: 18px;
          align-items: center;
        }

        .summary-row-simple span:first-child {
          font-weight: bold;
          min-width: 120px;
          text-align: left;
        }

        .summary-row-simple span:last-child {
          text-align: right;
          min-width: 100px;
          flex-shrink: 0;
        }

        .total-row-simple {
          font-size: 12px;
          font-weight: bold;
        }



        /* Signatures Section */
        .signatures-section {
          display: flex;
          justify-content: space-between;
          padding: 15px;
          border-bottom: 2px solid #000;
        }

        .delivery-signature,
        .customer-signature {
          flex: 1;
          text-align: center;
          margin: 0 10px;
        }

        .signature-title {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 10px;
          color: #000;
        }

        .signature-box {
          height: 60px;
          border: 2px solid #000;
          margin-bottom: 10px;
          background: white;
        }

        .signature-label {
           font-size: 12px;
           color: #000;
           font-weight: normal;
         }



        /* Responsive Design */
        @media (max-width: 768px) {
          .delivery-invoice {
            font-size: 10px;
          }
          
          .blinkit-logo {
            font-size: 24px;
          }
          
          .section-title,
          .company-name,
          .customer-name {
            font-size: 12px;
          }
          
          .items-table {
            font-size: 9px;
          }
          
          .items-table th {
            font-size: 10px;
          }
          
          .summary-row {
            font-size: 10px;
          }
          
          .total-row-summary {
            font-size: 12px;
          }
        }

        /* Footer Section */
        .invoice-footer {
          margin-top: 15px;
          padding: 10px 0;
          border-top: 1px solid #ddd;
        }

        .footer-content {
          text-align: center;
        }

        .footer-content p {
          margin: 3px 0;
          font-style: italic;
          color: #666;
          font-size: 11px;
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
            font-size: 11px;
          }

          .invoice-page {
            margin: 0;
            padding: 10px;
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
