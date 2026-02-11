import { Injectable, effect, inject } from '@angular/core';
import { Sale } from '../models/pos.model';

@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly STORAGE_KEY = 'santi_pos_pending_sales';

  saveSaleLocally(sale: Sale) {
    const currentQueue = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
    sale.synced = false;
    currentQueue.push(sale);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(currentQueue));
    
    // Intentar sincronizar si hay red
    if (navigator.onLine) {
      this.trySync();
    }
  }

  private async trySync() {
    // Lógica para enviar al backend
    // Si éxito -> sale.synced = true -> actualizar localStorage
  }
}
