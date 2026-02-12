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
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../core/services/product.service';
import { Product } from '../../core/models/pos.model';

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
  total: number;
  payment: number;
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
      ::-webkit-scrollbar { width: 8px; }
      ::-webkit-scrollbar-track { background: #0f172a; }
      ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: #475569; }

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
        @page { margin: 0; size: 58mm auto; }
        body * { visibility: hidden; height: 0; overflow: hidden; }
        #printableArea, #printableArea * { visibility: visible; height: auto; }
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
        .no-print { display: none !important; }
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
  currentWeight = signal<number | null>(null);
  foundProduct = signal<Product | null>(null);

  // Estados de Modales
  itemIndexToDelete = signal<number | null>(null);
  showCheckout = signal(false);
  
  // Estado del Checkout
  paymentAmount = signal<number | null>(null);
  lastVoucher = signal<VoucherData | null>(null);

  // Computado: Vuelto (Cambio)
  roundedTotal = computed(() => {    
    const rawTotal = this.sales()[this.activeSaleIndex()].total;    
    return Math.round(rawTotal / 10) * 10;  });

  changeAmount = computed(() => {
    const pay = this.paymentAmount() || 0;
    const totalToPay = this.roundedTotal(); // Usamos el redondeado
    return pay - totalToPay;
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
    this.paymentAmount.set(null);
    this.showCheckout.set(true);
  }

  closeCheckout() {
    this.showCheckout.set(false);
    this.focusCodeInput();
  }

  updatePayment(value: string) {
    const clean = value.replace(/[^0-9]/g, '');
    this.paymentAmount.set(clean ? parseInt(clean, 10) : null);
  }

  activateSaleIndex(i: number) {
    if ([0,1].includes(i) ) this.activeSaleIndex.set(i);
  }

  finalizeSale() {
    const rawTotal = this.sales()[this.activeSaleIndex()].total;
    const finalTotal = this.roundedTotal();
    const payment = this.paymentAmount() || 0;

    // Validación simple
    if (payment < finalTotal) return; 

    // 1. Preparar datos para el ticket
    const currentItems = [...this.sales()[this.activeSaleIndex()].items];
    const voucher: VoucherData = {
      items: currentItems,
      subtotal: rawTotal,      
      roundingDiff: finalTotal - rawTotal,
      total: finalTotal,
      payment: payment,
      change: payment - finalTotal,
      date: new Date(),
      id: Date.now() // ID simple basado en tiempo
    };
    this.lastVoucher.set(voucher);

    // 2. Limpiar la venta actual
    this.sales.update(curr => {
      const newSales = [...curr] as [SaleSession, SaleSession];
      newSales[this.activeSaleIndex()] = { 
        id: newSales[this.activeSaleIndex()].id, 
        items: [], 
        total: 0 
      };
      return newSales;
    });

    // 3. Cerrar modal y enfocar input principal
    this.showCheckout.set(false);
    this.focusCodeInput();

    // 4. Imprimir (Pequeño delay para que Angular renderice el ticket oculto)
    setTimeout(() => {
      window.print();
    }, 100);
  }

  // ... (El resto de funciones: sanitizeInput, onCodeEnter, onWeightEnter, switchSaleTab, cycleFocusUp, confirmDelete... se mantienen IGUAL que tu versión anterior) ...
  
  // Re-incluyo las esenciales por si acaso:
  sanitizeInput(field: 'code' | 'weight', value: any) {
    if (!value) return;
    const cleanValue = value.toString().replace(/[^0-9]/g, '');
    if (field === 'code') this.currentCode.set(cleanValue);
    else this.currentWeight.set(cleanValue ? parseInt(cleanValue, 10) : null);
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
    this.currentWeight.set(null);
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
