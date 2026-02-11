// src/app/core/services/cart.service.ts
import { Injectable, signal, computed } from '@angular/core';
import { Product, CartItem } from '../models/pos.model';

@Injectable({ providedIn: 'root' })
export class CartService {
  // Estado reactivo
  cartItems = signal<CartItem[]>([]);
  
  // Computados automáticamente (se actualizan solos)
  total = computed(() => this.cartItems().reduce((acc, item) => acc + item.subtotal, 0));
  itemCount = computed(() => this.cartItems().length);

  // Lógica del contrato: 3.3 Flujo de Venta
  addItem(product: Product, grams: number) {
    // REGLA: subtotal = round((grams / 1000) * price_per_kg)
    const subtotal = Math.round((grams / 1000) * product.pricePerKg);

    const newItem: CartItem = {
      product,
      grams,
      subtotal
    };

    // Actualizamos el signal (inmutable)
    this.cartItems.update(items => [...items, newItem]);
  }

  removeItem(index: number) {
    this.cartItems.update(items => items.filter((_, i) => i !== index));
  }

  clearCart() {
    this.cartItems.set([]);
  }
}
