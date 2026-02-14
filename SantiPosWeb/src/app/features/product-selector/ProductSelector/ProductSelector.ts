import { Component, EventEmitter, Input, Output, Signal, computed, effect, signal, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Product } from '../../../core/models/pos.model';
import { ProductService } from '../../../core/services/product.service';

@Component({
  selector: 'app-product-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isVisible) {
      <div class="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex flex-col p-4 animate-in fade-in duration-200">
        
        <!-- HEADER: Buscador y Botón Cerrar -->
        <div class="flex gap-4 shrink-0 mb-4">
          <div class="flex-1 relative">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">
              🔍 BUSCAR:
            </span>
            <input 
              #searchInput
              type="text" 
              [(ngModel)]="searchTerm"
              (input)="onInput($event)"
              (keydown)="onKeyDown($event)"
              class="w-full bg-slate-900 border-2 border-slate-700 rounded-xl py-4 pl-28 pr-4 text-3xl font-mono text-white shadow-inner focus:border-blue-500 focus:outline-none uppercase"
              placeholder="Ingrese código..."
              autofocus
            />
            <!-- Badge de cantidad -->
            <div class="absolute right-4 top-1/2 -translate-y-1/2 bg-slate-800 text-slate-300 px-3 py-1 rounded text-sm font-bold">
              {{ filteredProducts().length }} RESULTADOS
            </div>
          </div>
          
          <button (click)="close()" class="bg-red-900/50 hover:bg-red-600 text-white px-8 rounded-xl font-bold border border-red-700 transition-colors">
            ESC
          </button>
        </div>

        <!-- GRID DE TARJETAS -->
        <div class="flex-1 overflow-y-auto min-h-0">
          <!-- Grid responsivo: 2 cols en movil, 4 en tablet, 6 en landscape amplio -->
          <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 pb-20">
            
            @for (product of filteredProducts(); track product.code) {
              <div 
                (click)="selectProduct(product)"
                class="aspect-square relative group cursor-pointer rounded-xl border-2 transition-all duration-150 flex flex-col justify-between overflow-hidden shadow-lg hover:scale-105 hover:shadow-2xl hover:z-10"
                [ngClass]="getCategoryStyle(product.code)"
              >
                <!-- Código Gigante de fondo (Marca de agua) -->
                <div class="absolute -right-2 -bottom-4 text-8xl font-black opacity-10 select-none pointer-events-none group-hover:opacity-20 transition-opacity">
                  {{ product.code }}
                </div>

                <!-- Cabecera: Icono y Código Pequeño -->
                <div class="p-3 flex justify-between items-start z-10">
                  <span class="text-3xl filter drop-shadow-md">{{ getCategoryIcon(product.code) }}</span>
                  <span class="bg-black/30 backdrop-blur-md text-white px-2 py-1 rounded font-mono font-bold text-lg border border-white/10 shadow-sm">
                    {{ product.code }}
                  </span>
                </div>

                <!-- Cuerpo: Nombre y Precio -->
                <div class="p-3 z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-10">
                  <div class="text-white font-bold text-lg leading-tight uppercase drop-shadow-md line-clamp-2">
                    {{ product.name }}
                  </div>
                  <div class="text-emerald-300 font-mono text-sm mt-1 font-bold">
                    $ {{ product.pricePerKg | number }} / Kg
                  </div>
                </div>
                
                <!-- Overlay de selección al hacer hover -->
                <div class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              </div>
            }

            @if (filteredProducts().length === 0) {
              <div class="col-span-full h-64 flex flex-col items-center justify-center text-slate-500">
                <span class="text-6xl mb-4">🤷‍♂️</span>
                <span class="text-2xl font-bold">No hay productos con código "{{searchTerm}}"</span>
              </div>
            }

          </div>
        </div>

        <!-- LEYENDA DE CATEGORÍAS (Footer Fijo) -->
        <div class="shrink-0 pt-3 border-t border-slate-800 flex flex-wrap gap-2 justify-center opacity-70">
          <span class="px-2 py-1 rounded bg-yellow-900/50 text-yellow-200 border border-yellow-700/50 text-xs font-bold">1: POLLO</span>
          <span class="px-2 py-1 rounded bg-red-900/50 text-red-200 border border-red-700/50 text-xs font-bold">2: VACUNO</span>
          <span class="px-2 py-1 rounded bg-pink-900/50 text-pink-200 border border-pink-700/50 text-xs font-bold">3: CERDO</span>
          <span class="px-2 py-1 rounded bg-orange-900/50 text-orange-200 border border-orange-700/50 text-xs font-bold">4: EMBUTIDOS</span>
          <span class="px-2 py-1 rounded bg-teal-900/50 text-teal-200 border border-teal-700/50 text-xs font-bold">5: PAVO</span>
        </div>

      </div>
    }
  `
})
export class ProductSelector {
  @Input() isVisible = false;
  @Input() products: Product[] = []; // Recibe todos tus productos
  @Output() onProductSelected = new EventEmitter<Product>();
  @Output() onCancel = new EventEmitter<void>();

  @ViewChild('searchInput') searchInput!: ElementRef;
  service = inject(ProductService)

  allProducts = signal<Product[]>([]);

  searchTerm = '';

  // Filtra automáticamente cuando cambia el searchTerm o los productos
  filteredProducts = computed(() => {
    const term = this.searchTerm.trim();
    if (!term) return this.products; // Mostrar todo si está vacío (o podrías mostrar nada)
    return this.products.filter(p => p.code.startsWith(term));
  });

  // Enfocar el input cuando se abre
  constructor() {
    effect(() => {
      
      this.allProducts.set(this.service.products());
      if (this.isVisible) {
        // Pequeño timeout para asegurar que el DOM existe
        setTimeout(() => this.searchInput?.nativeElement.focus(), 50);
        this.searchTerm = ''; // Limpiar búsqueda anterior
      }
    });
  }

  onInput(e: any) {
    // Lógica adicional para filtrar por nombre
  }

  onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      this.close();
    }
    // Si presiona ENTER y hay UN solo producto filtrado, seleccionarlo
    if (e.key === 'Enter') {
      const currentFiltered = this.filteredProducts();
      if (currentFiltered.length === 1) {
        this.selectProduct(currentFiltered[0]);
      } else if (currentFiltered.length > 0 && this.searchTerm.length >= 3) {
        // Opcional: Si escribió 3 dígitos y coincide exacto
         const exactMatch = currentFiltered.find(p => p.code === this.searchTerm);
         if(exactMatch) this.selectProduct(exactMatch);
      }
    }
  }

  selectProduct(product: Product) {
    this.onProductSelected.emit(product);
    this.searchTerm = '';
  }

  close() {
    this.onCancel.emit();
    this.searchTerm = '';
  }

  // --- AYUDAS VISUALES ---

  getCategoryStyle(code: string): string {
    const initial = code.charAt(0);
    switch (initial) {
      case '1': return 'bg-yellow-900/40 border-yellow-600/50 hover:bg-yellow-800/60'; // Pollo
      case '2': return 'bg-red-900/40 border-red-600/50 hover:bg-red-800/60';       // Vacuno
      case '3': return 'bg-pink-900/40 border-pink-500/50 hover:bg-pink-800/60';     // Cerdo
      case '4': return 'bg-orange-900/40 border-orange-600/50 hover:bg-orange-800/60'; // Embutidos
      case '5': return 'bg-teal-900/40 border-teal-600/50 hover:bg-teal-800/60';     // Pavo
      default: return 'bg-slate-800 border-slate-600 hover:bg-slate-700';           // Otros
    }
  }

  getCategoryIcon(code: string): string {
    const initial = code.charAt(0);
    switch (initial) {
      case '1': return '🐔';
      case '2': return '🥩';
      case '3': return '🥓';
      case '4': return '🌭';
      case '5': return '🦃';
      default: return '🍖';
    }
  }
}
