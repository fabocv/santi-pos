import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  ViewChildren,
  QueryList,
  inject,
  signal,
  effect,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../core/services/product.service';
import { Product } from '../../core/models/pos.model';
import JsBarcode from 'jsbarcode';

interface CartItem {
  product: Product;
  weight: number;
  total: number;
}

interface SaleSession {
  id: number;
  items: CartItem[];
  total: number;
}

// Estructura para el ticket impreso
interface VoucherData {
  items: CartItem[];
  subtotal: number;
  roundingDiff: number;
  totalToPay: number;
  paymentCash: number;
  paymentCard: number;
  change: number;
  date: Date;
  id: number;
}

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pos.html',
  styles: [
    `
      /* Scrollbar oscuro personalizado */
      ::-webkit-scrollbar {
        width: 8px;
      }
      ::-webkit-scrollbar-track {
        background: #0f172a;
      }
      ::-webkit-scrollbar-thumb {
        background: #334155;
        border-radius: 4px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: #475569;
      }

      /* EFECTO DE FOCO EN LA LISTA */
      tr:focus {
        outline: 2px solid #ef4444;
        background-color: rgba(239, 68, 68, 0.15);
        position: relative;
        z-index: 10;
        color: #fff;
      }

      /* ESTILOS DE IMPRESIÓN (58mm) */
      @media print {
        @page {
          margin: 0;
          size: 58mm auto;
        }
        body * {
          visibility: hidden;
          height: 0;
          overflow: hidden;
        }
        #printableArea,
        #printableArea * {
          visibility: visible;
          height: auto;
        }
        #printableArea {
          position: absolute;
          left: 0;
          top: 0;
          width: 58mm;
          padding: 2mm;
          font-family: 'Courier New', Courier, monospace;
          font-size: 12px;
          color: black;
          background: white;
        }
        .no-print {
          display: none !important;
        }
      }
    `,
  ],
})
export class PosComponent {
  private productService = inject(ProductService);

  // Referencias DOM
  @ViewChild('confirmBtn') confirmBtn!: ElementRef;
  @ViewChild('paymentInput') paymentInput!: ElementRef;
  @ViewChild('codeInput') codeInput!: ElementRef;
  @ViewChild('weightInput') weightInput!: ElementRef;
  @ViewChildren('saleRow') saleRows!: QueryList<ElementRef>;

  constructor() {
    // Efecto para enfocar botón borrar
    effect(() => {
      if (this.itemIndexToDelete() !== null) {
        setTimeout(() => this.confirmBtn?.nativeElement?.focus(), 50);
      }
    });

    // Efecto para enfocar input de pago al abrir checkout
    effect(() => {
      if (this.showCheckout()) {
        setTimeout(() => this.paymentInput?.nativeElement?.focus(), 50);
      }
    });
  }

  // --- ESTADO ---
  activeSaleIndex = signal<number>(0);
  sales = signal<[SaleSession, SaleSession]>([
    { id: 1, items: [], total: 0 },
    { id: 2, items: [], total: 0 },
  ]);

  currentCode = signal('');
  currentWeight = signal<number>(0);
  foundProduct = signal<Product | null>(null);

  // Estados de Modales
  itemIndexToDelete = signal<number | null>(null);
  showCheckout = signal(false);

  // Estado del Checkout
  paymentCashInput = signal<number>(0);
  lastVoucher = signal<VoucherData | null>(null);

  // Computado: Vuelto (Cambio)
  roundedTotal = computed(() => {
    const rawTotal = this.sales()[this.activeSaleIndex()].total;
    return Math.round(rawTotal / 10) * 10;
  });

  // 3. ¿Cubre el efectivo todo el monto?
  isFullCashPayment = computed(() => {
    return this.paymentCashInput() >= this.roundedTotal();
  });

  changeAmount = computed(() => {
    const rawTotal = this.sales()[this.activeSaleIndex()].total;
    const prePay = this.paymentCashInput() - this.roundedTotal();
    return this.paymentCashInput() > 0 ? 
      prePay >= 0?
        prePay:
        this.paymentCashInput() - rawTotal
      : rawTotal;
  });

  private lastKey: string = '';
  private lastKeyTime: number = 0;

  // --- 1. GESTOR GLOBAL DE TECLAS ---
  @HostListener('window:keydown', ['$event'])
  handleGlobalKeys(event: KeyboardEvent) {
    const key = event.key;

    // --- TECLA (+): ESCAPE GLOBAL ---
    if (key === '+') {
      event.preventDefault();

      // 1. Cerrar modal borrar
      if (this.itemIndexToDelete() !== null) {
        this.cancelDelete();
        return;
      }

      // 2. Cerrar modal checkout
      if (this.showCheckout()) {
        this.closeCheckout();
        return;
      }

      // 3. Reset foco
      this.focusCodeInput();
      return;
    }

    // --- TECLA (/): COBRAR (Numpad Divide) ---
    if (key === '/' || key === 'Divide') {
      const currentSale = this.sales()[this.activeSaleIndex()];
      if (currentSale.items.length > 0 && !this.showCheckout()) {
        event.preventDefault();
        this.openCheckout();
      }
      return;
    }

    // --- TECLA (-): NAVEGACIÓN ---
    if (key === '-') {
      if (this.itemIndexToDelete() !== null || this.showCheckout()) return;
      event.preventDefault();
      this.cycleFocusUp();
      return;
    }

    // --- TECLA (*): CAMBIAR PESTAÑA ---
    if (key === '*') {
      event.preventDefault();
      this.switchSaleTab();
      return;
    }
  }

  // --- LOGICA CHECKOUT & IMPRESION ---
  openCheckout() {
    this.paymentCashInput.set(0);
    this.showCheckout.set(true);
  }

  rawTotal = computed(() => this.sales()[this.activeSaleIndex()].total);

  cardAmountToPay = computed(() => {
    const cash = this.paymentCashInput();
    const total = this.rawTotal();
    if (cash >= this.roundedTotal()) return 0;
    return Math.max(0, total - cash);
  });

  closeCheckout() {
    this.showCheckout.set(false);
    this.focusCodeInput();
  }

  updatePayment(value: string) {
    let clean = value.replace(/[^0-9]/g, '');
    if (clean.length > 5) {
      clean = clean.slice(0, 5);
    }
    const num = clean ? parseInt(clean, 10) : 0;
    this.paymentCashInput.set(num);
    if (this.paymentInput && this.paymentInput.nativeElement.value !== clean) {
      this.paymentInput.nativeElement.value = clean;
    }
  }

  activateSaleIndex(i: number) {
    if ([0, 1].includes(i)) this.activeSaleIndex.set(i);
  }

  finalizeSale() {
    const rawTotal = this.rawTotal();
    const cash = this.paymentCashInput();

    let finalTotalToPay = 0;
    let roundingDiff = 0;
    let payCard = 0;
    let change = 0;

    if (this.isFullCashPayment()) {
      // CASO: PAGO TOTAL EFECTIVO (Con Redondeo)
      finalTotalToPay = this.roundedTotal();
      roundingDiff = finalTotalToPay - rawTotal;
      payCard = 0;
      change = cash - finalTotalToPay;
    } else {
      // CASO: MIXTO O TARJETA (Sin Redondeo en el total, Tarjeta cubre diferencia)
      finalTotalToPay = rawTotal; // El total legal es el exacto
      roundingDiff = 0; // No hay redondeo
      payCard = rawTotal - cash;
      change = 0;
    }

    // 1. Preparar datos para el ticket
    const currentItems = [...this.sales()[this.activeSaleIndex()].items];
    const voucherId = Date.now();
    const voucher: VoucherData = {
      items: currentItems,
      subtotal: rawTotal,
      roundingDiff: roundingDiff,
      totalToPay: finalTotalToPay,
      paymentCash: cash,
      paymentCard: payCard,
      change: change,
      date: new Date(),
      id: voucherId,
    };
    this.lastVoucher.set(voucher);

    // 2. Limpiar la venta actual
    this.sales.update((curr) => {
      const newSales = [...curr] as [SaleSession, SaleSession];
      newSales[this.activeSaleIndex()] = {
        id: newSales[this.activeSaleIndex()].id,
        items: [],
        total: 0,
      };
      return newSales;
    });

    // 3. Cerrar modal y enfocar input principal
    this.showCheckout.set(false);
    this.focusCodeInput();

    setTimeout(() => {
      try {
        JsBarcode('#barcode', voucher.id.toString(), {
          format: 'CODE128',
          lineColor: '#000000',
          width: 2,
          height: 40,
          displayValue: true, // Muestra el número abajo
          fontSize: 10,
          margin: 0,
        });
      } catch (err) {
        console.error('Error generando código de barras', err);
      }
      window.print();
    }, 100);

    // 4. Imprimir (Pequeño delay para que Angular renderice el ticket oculto)
    setTimeout(() => {
      window.print();
    }, 100);
  }

  sanitizeInput(field: 'code' | 'weight', value: any, digits: number) {
    if (!value) {
      if (field === 'code') this.currentCode.set('');
      else this.currentWeight.set(0);
      return;
    }
    let cleanValue = value.toString().replace(/[^0-9]/g, '0');
    if (cleanValue.length > digits) {
      cleanValue = cleanValue.slice(0, digits);
    }
    if (field === 'code') {
      this.currentCode.set(cleanValue);
    } else {
      this.currentWeight.set(cleanValue ? parseInt(cleanValue, 10) : 0);
    }
  }

  onCodeEnter() {
    const code = this.currentCode();
    if (!code) return;
    const product = this.productService.getProductByCode(code);
    if (product) {
      this.foundProduct.set(product);
      setTimeout(() => this.weightInput.nativeElement.focus(), 0);
    } else {
      this.currentCode.set('');
    }
  }

  onWeightEnter() {
    const product = this.foundProduct();
    const weight = this.currentWeight();
    if (product && weight && weight > 0) {
      this.addItemToCurrentSale(product, weight);
      this.resetForm();
      this.focusCodeInput();
    }
  }

  tarjetaVuelto(value: number) {
    return Math.abs(value);
  }

  addItemToCurrentSale(product: Product, weight: number) {
    const total = Math.round((weight / 1000) * product.pricePerKg);
    const newItem: CartItem = { product, weight, total };
    this.sales.update((curr) => {
      const active = { ...curr[this.activeSaleIndex()] };
      active.items = [...active.items, newItem];
      active.total += total;
      const newSales = [...curr] as [SaleSession, SaleSession];
      newSales[this.activeSaleIndex()] = active;
      return newSales;
    });
  }

  onRowKeydown(event: KeyboardEvent, index: number) {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (this.itemIndexToDelete() != null) return this.confirmDelete();
      this.itemIndexToDelete.set(index);
    }
  }

  confirmDelete() {
    const index = this.itemIndexToDelete();
    if (index === null) return;
    this.sales.update((curr) => {
      const active = { ...curr[this.activeSaleIndex()] };
      active.items.splice(index, 1);
      active.total = active.items.reduce((acc, item) => acc + item.total, 0);
      const newSales = [...curr] as [SaleSession, SaleSession];
      newSales[this.activeSaleIndex()] = active;
      return newSales;
    });
    this.cancelDelete();
  }

  cancelDelete() {
    this.itemIndexToDelete.set(null);
    this.focusCodeInput();
  }

  switchSaleTab() {
    const newIndex = this.activeSaleIndex() === 0 ? 1 : 0;
    this.activeSaleIndex.set(newIndex);
    this.resetForm();
    this.focusCodeInput();
  }

  resetForm() {
    this.currentCode.set('');
    this.currentWeight.set(0);
    this.foundProduct.set(null);
  }

  focusCodeInput() {
    setTimeout(() => {
      if (this.codeInput) this.codeInput.nativeElement.focus();
    }, 50);
  }

  cycleFocusUp() {
    const rows = this.saleRows.toArray();
    const count = rows.length;
    if (count === 0) return;
    const activeElement = document.activeElement;
    const activeIndex = rows.findIndex((r) => r.nativeElement === activeElement);
    let nextIndex;
    if (activeIndex === -1) {
      nextIndex = count - 1;
    } else {
      nextIndex = activeIndex - 1;
      if (nextIndex < 0) nextIndex = count - 1;
    }
    rows[nextIndex].nativeElement.focus();
  }
}
