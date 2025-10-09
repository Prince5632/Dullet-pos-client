import React from "react";
import { useNavigate } from "react-router-dom";
import DeliveryInvoiceTemplate from "../../components/delivery/DeliveryInvoiceTemplate";
import { sampleDeliveryData2 } from "../../data/sampleDeliveryData";

const DeliveryInvoicePreview: React.FC = () => {
  const navigate = useNavigate();

  const handlePrint = () => {
    window.print();
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="delivery-invoice-preview">
      {/* Header Controls */}
      <div className="preview-header no-print bg-white shadow-sm border-b p-4 mb-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Delivery Invoice Preview
            </h1>
            <p className="text-gray-600 mt-1">
              Preview and print delivery invoice template
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleGoBack}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200 flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Go Back
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors duration-200 flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              Print Invoice
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Preview */}
      <div className="preview-content">
        <div className="max-w-4xl mx-auto">
          <DeliveryInvoiceTemplate data={sampleDeliveryData2} />
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          .preview-content {
            margin: 0;
            padding: 0;
          }
          
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          
          .delivery-invoice-preview {
            background: white;
          }
        }
        
        .delivery-invoice-preview {
          min-height: 100vh;
          background: #f8fafc;
        }
        
        .preview-content {
          padding: 0 1rem 2rem;
        }
        
        @media (max-width: 768px) {
          .preview-header .flex {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }
          
          .preview-header .flex > div:last-child {
            display: flex;
            gap: 0.75rem;
          }
          
          .preview-content {
            padding: 0 0.5rem 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default DeliveryInvoicePreview;