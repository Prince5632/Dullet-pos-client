import React from 'react';
import DeliveryInvoiceTemplate from '../../components/delivery/DeliveryInvoiceTemplate';
import { sampleDeliveryData2 } from '../../data/sampleDeliveryData';

const DeliveryInvoiceTest: React.FC = () => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Delivery Invoice Template Test
          </h1>
          <p className="text-gray-600">
            This is a test page demonstrating the dynamic delivery invoice component
          </p>
        </div>

        <DeliveryInvoiceTemplate 
          data={sampleDeliveryData2}
          onPrint={handlePrint}
        />

      </div>
    </div>
  );
};

export default DeliveryInvoiceTest;