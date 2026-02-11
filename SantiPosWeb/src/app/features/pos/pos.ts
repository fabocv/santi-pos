// src/app/features/pos/pos.component.ts
import {
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../../core/services/cart.service';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../core/services/product.service';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-screen flex flex-col bg-gray-100">
      <!-- Header / Info -->
      <header class="bg-slate-800 text-white p-4 flex justify-between">
        <h1 class="text-xl font-bold">
          Santi-Pos <span class="text-xs font-normal opacity-70">MVP v1.0</span>
        </h1>
        <div class="text-2xl font-mono text-green-400">
          TOTAL: {{ cartService.total() | currency }}
        </div>
      </header>

      <div class="flex flex-1 overflow-hidden">
        <!-- COLUMNA IZQUIERDA: CARRITO -->
        <div class="w-2/3 bg-white border-r border-gray-300 flex flex-col">
          <div class="flex-1 overflow-y-auto p-4">
            <table class="w-full text-left">
              <thead>
                <tr class="text-gray-500 border-b">
                  <th class="p-2">Producto</th>
                  <th class="p-2 text-right">Peso (g)</th>
                  <th class="p-2 text-right">$/kg</th>
                  <th class="p-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                @for (item of cartService.cartItems(); track $index) {
                  <tr
                    [class.bg-blue-100]="selectedIndex() === $index"
                    class="border-b hover:bg-gray-50"
                  >
                    <td class="p-3 font-medium">{{ item.product.name }}</td>
                    <td class="p-3 text-right">{{ item.grams }}g</td>
                    <td class="p-3 text-right">{{ item.product.pricePerKg | currency }}</td>
                    <td class="p-3 text-right font-bold">{{ item.subtotal | currency }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="4" class="text-center p-10 text-gray-400">Carrito vacío</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <!-- Instrucciones Footer -->
          <div class="bg-gray-50 p-2 text-xs text-gray-500 flex justify-around border-t">
            <span>[↑/↓] Navegar</span>
            <span>[-] Eliminar Item</span>
            <span>[ESPACIO] Pagar</span>
          </div>
        </div>

        <!-- COLUMNA DERECHA: ENTRADA DE DATOS -->
        <div class="w-1/3 bg-gray-200 p-6 flex flex-col gap-4">
          <!-- Input Código -->
          <div class="bg-white p-4 rounded shadow">
            <label class="block text-sm font-bold text-gray-700">CÓDIGO PRODUCTO</label>
            <input
              #codeInput
              [(ngModel)]="currentCode"
              (keyup.enter)="focusWeight()"
              class="w-full text-3xl p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="1xx..."
              autofocus
            />
          </div>

          <!-- Input Peso -->
          <div class="bg-white p-4 rounded shadow">
            <label class="block text-sm font-bold text-gray-700">PESO (Gramos)</label>
            <input
              #weightInput
              type="number"
              [(ngModel)]="currentWeight"
              (keyup.enter)="addToCart()"
              class="w-full text-3xl p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="0"
            />
          </div>

          <!-- Visor Producto Encontrado (Preview) -->
          @if (foundProduct()) {
            <div class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded text-center">
              <div class="text-lg font-bold text-blue-800">{{ foundProduct()?.name }}</div>
              <div class="text-gray-600">{{ foundProduct()?.pricePerKg | currency }}/kg</div>
            </div>
          }
        </div>
      </div>

      <!-- Modal de Pago (Componente separado en la realidad) -->
      @if (showPaymentModal) {
        <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <!-- ... Lógica de pago aquí ... -->
        </div>
      }
    </div>
  `,
})
export class PosComponent {
  cartService = inject(CartService);
  productService = inject(ProductService);

  @ViewChild('codeInput') codeInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('weightInput') weightInputRef!: ElementRef<HTMLInputElement>;

  currentCode = '';
  currentWeight: number | null = null;
  selectedIndex = signal(0);
  showPaymentModal = false;

  // Computed para buscar producto mientras escriben
  foundProduct = computed(() => this.productService.getProductByCode(this.currentCode));

  // Manejo de teclado (Navegación Carrito)
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.showPaymentModal) return; // Si estamos pagando, el teclado lo maneja el modal

    switch (event.key) {
      case 'ArrowUp':
        this.selectedIndex.update((i) => Math.max(0, i - 1));
        break;
      case 'ArrowDown':
        this.selectedIndex.update((i) => Math.min(this.cartService.itemCount() - 1, i + 1));
        break;
      case '-': // Tecla menos para borrar
      case 'Delete':
        this.deleteSelectedItem();
        break;
      case ' ': // Espacio para ir a pagar
        if (this.cartService.total() > 0) this.openPayment();
        break;
    }
  }

  addToCart() {
    const product = this.foundProduct();
    if (product && this.currentWeight && this.currentWeight > 0) {
      this.cartService.addItem(product, this.currentWeight);
      // Reset inputs
      this.currentCode = '';
      this.currentWeight = null;
      // Refocus código
      document.querySelector<HTMLInputElement>('input[placeholder="1xx..."]')?.focus();
    }
  }

  deleteSelectedItem() {
    if (confirm('¿Eliminar ítem seleccionado? (ENTER para sí, ESC para no)')) {
      this.cartService.removeItem(this.selectedIndex());
    }
  }

  focusWeight() {
    // Solo saltar si hay algo escrito, mejora la UX
    if (this.currentCode && this.currentCode.trim().length > 0) {
      // nativeElement accede al objeto <input> real del navegador
      this.weightInputRef.nativeElement.focus();
      this.weightInputRef.nativeElement.select(); // Selecciona el texto si ya había algo
    }
  }

  openPayment() {
    this.showPaymentModal = true;
  }
}
