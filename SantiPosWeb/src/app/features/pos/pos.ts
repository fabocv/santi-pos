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

      /* EFECTO DE FOCO EN LA LISTA (Modo Dark) */
      tr:focus {
        outline: 2px solid #ef4444; /* Borde rojo neón */
        background-color: rgba(239, 68, 68, 0.15); /* Fondo rojo muy suave */
        box-shadow: 0 0 15px rgba(239, 68, 68, 0.2); /* Resplandor */
        position: relative;
        z-index: 10;
        color: #fff;
      }
    `,
  ],
})
export class PosComponent {
  private productService = inject(ProductService);
  @ViewChild('confirmBtn') confirmBtn!: ElementRef;

  constructor() {
    effect(() => {
      const index = this.itemIndexToDelete();
      if (index !== null) {
        // Esperamos un milisegundo a que el HTML se dibuje
        setTimeout(() => {
          if (this.confirmBtn) this.confirmBtn.nativeElement.focus();
        }, 50);
      }
    });
  }

  // --- ESTADO ---
  activeSaleIndex = signal<0 | 1>(0);
  sales = signal<[SaleSession, SaleSession]>([
    { id: 1, items: [], total: 0 },
    { id: 2, items: [], total: 0 },
  ]);

  currentCode = signal('');
  currentWeight = signal<number | null>(null);
  foundProduct = signal<Product | null>(null);

  // Modal de eliminación
  itemIndexToDelete = signal<number | null>(null);

  // --- DOM REFERENCES ---
  @ViewChild('codeInput') codeInput!: ElementRef;
  @ViewChild('weightInput') weightInput!: ElementRef;
  @ViewChildren('saleRow') saleRows!: QueryList<ElementRef>;

  private lastKey: string = '';
  private lastKeyTime: number = 0;
  // --- 1. GESTOR GLOBAL DE TECLAS (+ y -) ---
  @HostListener('window:keydown', ['$event'])
  handleGlobalKeys(event: KeyboardEvent) {
    const key = event.key;
    const now = Date.now();
    const isDoublePress = key === this.lastKey && now - this.lastKeyTime < 300;

    // --- LOGICA DE SUMA (+) ---
    // Regla: Cierra cualquier popup o devuelve el foco al inicio
    if (key === '+') {
      event.preventDefault(); // Evita escribir "+"

      // Caso 1: Hay un modal abierto -> Cerrarlo
      if (this.itemIndexToDelete() !== null) {
        this.cancelDelete();
        return;
      }

      // Caso 2: Estamos navegando en la lista -> Volver al input
      // O simplemente resetea el foco al input principal siempre
      this.focusCodeInput();

      // (Opcional: Si quisieras mantener el doble click para cambiar pestaña, iría aquí)
      return;
    }

    // --- LOGICA DE RESTA (-) ---
    // Regla: Navegación cíclica global hacia arriba
    if (key === '-') {
      // Si el modal está abierto, no hacemos navegación, dejamos que el usuario decida (o usa + para salir)
      if (this.itemIndexToDelete() !== null) return;

      event.preventDefault(); // Evita escribir "-"
      this.cycleFocusUp();
      return;
    }

    // Cambiar de tabla con '*'
    if (key === '*') {
      event.preventDefault(); // Evita escribir "-"
      this.switchSaleTab();
      this.lastKey = ''; // Reset
      return;
    }
  }

  switchSaleTab() {
    // Si estoy en 0, voy a 1. Si estoy en 1, voy a 0.
    const newIndex = this.activeSaleIndex() === 0 ? 1 : 0;
    this.activeSaleIndex.set(newIndex); // Resetear formulario parcial si lo hubiera
    this.resetForm(); // ENFOCAR CÓDIGO
    setTimeout(() => {
      if (this.codeInput) this.codeInput.nativeElement.focus();
    }, 50);
  }

  // --- 2. NAVEGACIÓN CÍCLICA ---
  cycleFocusUp() {
    const rows = this.saleRows.toArray();
    const count = rows.length;

    // Si no hay items, no hacemos nada
    if (count === 0) return;

    // Averiguar dónde está el foco actualmente
    const activeElement = document.activeElement;
    const activeIndex = rows.findIndex((r) => r.nativeElement === activeElement);

    let nextIndex;

    if (activeIndex === -1) {
      // Si el foco NO está en la lista (está en inputs), ir al ÚLTIMO (Abajo)
      nextIndex = count - 1;
    } else {
      // Si el foco ESTÁ en la lista, subir uno
      nextIndex = activeIndex - 1;

      // SI llega arriba del todo (índice -1), LOOP al último (Abajo)
      if (nextIndex < 0) {
        nextIndex = count - 1;
      }
    }

    // Aplicar foco
    rows[nextIndex].nativeElement.focus();
  }

  // --- 3. INPUTS SANITIZADOS ---
  sanitizeInput(field: 'code' | 'weight', value: any) {
    if (!value) return;
    const cleanValue = value.toString().replace(/[^0-9]/g, '');
    if (field === 'code') this.currentCode.set(cleanValue);
    else this.currentWeight.set(cleanValue ? parseInt(cleanValue, 10) : null);
  }

  // --- 4. ACCIONES DE LA LISTA ---
  onRowKeydown(event: KeyboardEvent, index: number) {
    if (event.key === 'Enter') {
      event.preventDefault();
      // Abrir modal de confirmación
      if (this.itemIndexToDelete() != null) return this.confirmDelete();
      this.itemIndexToDelete.set(index);
    }
  }

  // --- 5. LOGICA DE VENTA ---
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

  // --- 6. ELIMINACIÓN ---
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

  // --- UTILS ---
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
}
