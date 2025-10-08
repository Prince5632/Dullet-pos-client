import type { DeliveryInvoiceData } from '../types/deliveryInvoice';

export const sampleDeliveryData: DeliveryInvoiceData = {
  invoiceNumber: "BLK-INV-2024-001234",
  invoiceDate: "15-Jan-2024",
  orderId: "ORD-2024-567890",
  placeOfSupply: "Delhi",
  
  company: {
    name: "Blinkit (Formerly Grofers India Pvt. Ltd.)",
    address: "Building No. 616, Udyog Vihar Phase - V, Sector 19",
    city: "Gurugram",
    state: "Haryana",
    pincode: "122016",
    gstin: "06AADCG0039B1ZN",
    fssaiLicense: "10019022000694",
    cin: "U74999HR2013PTC050771",
    pan: "AADCG0039B"
  },
  
  customer: {
    name: "John Doe",
    address: "Flat 123, ABC Apartments, Sector 15",
    city: "Noida",
    state: "Uttar Pradesh",
    pincode: "201301"
  },
  
  items: [
    {
      srNo: 1,
      hsnCode: "10063020",
      upc: "8901030895467",
      description: "Tata Salt - Iodised Salt, 1 kg",
      rate: 25.00,
      discount: 2.00,
      quantity: 2,
      unit: "kg",
      taxableValue: 46.00,
      cgstPercent: 2.5,
      cgstAmount: 1.15,
      sgstPercent: 2.5,
      sgstAmount: 1.15,
      total: 48.30
    },
    {
      srNo: 2,
      hsnCode: "04021000",
      upc: "8901030896174",
      description: "Amul Taaza Toned Milk, 1 L",
      rate: 56.00,
      discount: 4.00,
      quantity: 1,
      unit: "L",
      taxableValue: 52.00,
      cgstPercent: 2.5,
      cgstAmount: 1.30,
      sgstPercent: 2.5,
      sgstAmount: 1.30,
      total: 54.60
    },
    {
      srNo: 3,
      hsnCode: "19059020",
      upc: "8901030897881",
      description: "Britannia Good Day Butter Cookies, 200g",
      rate: 45.00,
      discount: 5.00,
      quantity: 1,
      unit: "pack",
      taxableValue: 40.00,
      cgstPercent: 9.0,
      cgstAmount: 3.60,
      sgstPercent: 9.0,
      sgstAmount: 3.60,
      total: 47.20
    },
    {
      srNo: 4,
      hsnCode: "20071000",
      upc: "8901030898598",
      description: "Kissan Mixed Fruit Jam, 500g",
      rate: 125.00,
      discount: 15.00,
      quantity: 1,
      unit: "jar",
      taxableValue: 110.00,
      cgstPercent: 9.0,
      cgstAmount: 9.90,
      sgstPercent: 9.0,
      sgstAmount: 9.90,
      total: 129.80
    }
  ],
  
  totals: {
    subtotal: 252.00,
    totalCgst: 16.05,
    totalSgst: 16.05,
    grandTotal: 284.10,
    amountInWords: "Two Hundred Eighty Four Rupees and Ten Paise Only"
  },
  
  isReverseCharge: false,
  deliveryOtp: "1234",
  
  termsAndConditions: [
    "If you have any issues or queries in respect of your order, please contact customer chat support through Blinkit platform or drop in email at info@blinkit.com",
    "In case you need to get more information about seller's or Blinkit's FSSAI status, please visit https://foscos.fssai.gov.in/ and use the FBO search option with FSSAI License / Registration number.",
    "Please note that we never ask for bank account details such as CVV, account number, UPI Pin, etc. across our support channels. For your safety please do not share these details with anyone over any medium.",
    "MRP displayed on the platform is as printed on the product package. Actual MRP and amount payable may be a function of offers/ discounts and/ or the revised GST rates made effective by Govt.",
    "This invoice is computer generated and does not require physical signature."
  ]
};