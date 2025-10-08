export interface CompanyInfo {
  name: string;
  address: string;
  city: string;
  pincode: string;
  gstin: string;
  fssaiLicense: string;
  cin: string;
  pan: string;
}

export interface CustomerInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

export interface InvoiceItem {
  srNo: number;
  upc?: string;
  hsnCode?: string;
  description: string;
  mrp: number;
  discount: number;
  quantity: number;
  unit?: string;
  taxableValue: number;
  cgstPercent: number;
  cgstAmount: number;
  sgstPercent: number;
  sgstAmount: number;
  cessPercent?: number;
  cessAmount?: number;
  total: number;
}

export interface InvoiceTotals {
  subtotal: number;
  totalDiscount: number;
  totalCgst: number;
  totalSgst: number;
  totalCess?: number;
  grandTotal: number;
  amountInWords: string;
}

export interface DeliveryInvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  orderId: string;
  placeOfSupply: string;
  company: CompanyInfo;
  customer: CustomerInfo;
  items: InvoiceItem[];
  totals: InvoiceTotals;
  isReverseCharge?: boolean;
  deliveryOtp?: string;
  termsAndConditions?: string[];
}

export interface DeliveryInvoiceProps {
  data: DeliveryInvoiceData;
  className?: string;
  onPrint?: () => void;
}