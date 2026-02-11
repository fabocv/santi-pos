// src/app/core/services/auth.service.ts
import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

export interface User {
  id: number;
  name: string;
  pin: string; // En producción esto debería estar hasheado
  role: 'ADMIN' | 'OPERATOR';
  barcode?: string; // Para login con tarjeta/credencial
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private router = inject(Router);
  
  // Estado reactivo del usuario actual (null = no logueado)
  currentUser = signal<User | null>(null);
  
  // Computed para saber fácilmente si está logueado
  isLoggedIn = computed(() => !!this.currentUser());

  // MOCK DE USUARIOS (Según contrato 3.1: "precargados")
  private users: User[] = [
    { id: 1, name: 'Santi (Dueño)', pin: '1234', role: 'ADMIN', barcode: 'ADM001' },
    { id: 2, name: 'Juan Carnicero', pin: '0000', role: 'OPERATOR', barcode: 'OP001' },
    { id: 3, name: 'Cajera Maria', pin: '1111', role: 'OPERATOR', barcode: 'OP002' }
  ];

  login(pinOrBarcode: string): boolean {
    // Intenta buscar por PIN o por Código de Barras
    const user = this.users.find(u => u.pin === pinOrBarcode || u.barcode === pinOrBarcode);

    if (user) {
      this.currentUser.set(user);
      this.router.navigate(['/pos']); // Redirigir al POS
      return true;
    }
    return false;
  }

  logout() {
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }
}
