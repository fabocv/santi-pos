export type PaymentMethod = 'EFECTIVO' | 'TARJETA' | 'MIXTO';

export interface Product {
  code: string; // 1xx, 2xx, etc.
  name: string;
  pricePerKg: number;
  category: 'POLLO' | 'VACUNO' | 'CERDO' | 'EMBUTIDOS';
}

export interface CartItem {
  product: Product;
  grams: number;
  subtotal: number; // Calculado: round((grams / 1000) * price)
}

export interface Sale {
  id: string;
  timestamp: Date;
  operatorId: string;
  items: CartItem[];
  total: number;
  cashReceived: number;
  paymentMethod: PaymentMethod;
  synced: boolean; // Para lógica Offline
}

export interface Shift {
  id: string;
  startTime: Date;
  endTime?: Date;
  startAmount: number; // Caja inicial
  totalSales: number;
  totalCash: number;
  totalCard: number;
}
