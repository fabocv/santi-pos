import { Component, HostListener, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../../core/services/auth.service';
import { Router } from '@angular/router';

type LoginStep = 'SELECT_USER' | 'ENTER_PIN';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      
      <div class="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-4xl min-h-[500px] flex flex-col relative">
        
        <!-- HEADER COMÚN -->
        <div class="bg-slate-100 p-4 border-b border-gray-200 flex justify-between items-center">
          <h1 class="text-xl font-bold text-slate-700 tracking-wide">
            SANTI POS <span class="text-blue-600">v1.0</span>
          </h1>
          <div class="text-sm font-mono text-gray-500">
             {{ currentDate | date:'HH:mm' }}
          </div>
        </div>

        <!-- VISUALIZACIÓN DE ERRORES -->
        @if (errorMessage()) {
          <div class="bg-red-500 text-white text-center py-2 font-bold animate-pulse absolute top-14 left-0 w-full z-50">
            {{ errorMessage() }}
          </div>
        }

        <!-- PASO 1: SELECCIÓN DE USUARIO (GRILLA) -->
        @if (currentStep() === 'SELECT_USER') {
          <div class="p-8 flex-1 flex flex-col items-center justify-center animate-fade-in">
            <h2 class="text-2xl font-light text-slate-800 mb-8 uppercase tracking-widest">
              Seleccione Operador (Ingrese #)
            </h2>

            <div class="grid grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-3xl">
              @for (user of users; track user.id; let i = $index) {
                <!-- El índice + 1 es el "Número Mágico" para el teclado -->
                <button 
                  (click)="selectUser(user)"
                  class="group relative bg-white border-2 border-slate-200 hover:border-blue-500 hover:shadow-xl rounded-xl p-6 transition-all duration-200 active:scale-95 flex flex-col items-center">
                  
                  <!-- Badge del Número (HotKey) -->
                  <div class="absolute top-3 left-3 w-8 h-8 bg-slate-800 text-white rounded flex items-center justify-center font-bold font-mono text-lg shadow-sm group-hover:bg-blue-600 transition-colors">
                    {{ i + 1 }}
                  </div>

                  <!-- Avatar -->
                  <div class="w-20 h-20 rounded-full bg-slate-100 mb-4 flex items-center justify-center text-3xl text-slate-400 font-bold group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                    {{ user.name.charAt(0) }}
                  </div>

                  <!-- Info -->
                  <div class="text-center">
                    <div class="font-bold text-lg text-slate-800 group-hover:text-blue-700">{{ user.name }}</div>
                    <div class="text-xs text-slate-500 uppercase mt-1">{{ user.role }}</div>
                  </div>
                </button>
              }
            </div>
            
            <p class="mt-10 text-gray-400 text-sm">Use el teclado numérico o toque la pantalla</p>
          </div>
        }

        <!-- PASO 2: INGRESO DE PIN -->
        @if (currentStep() === 'ENTER_PIN' && selectedUser()) {
          <div class="p-8 flex-1 flex flex-col items-center justify-center bg-slate-50 animate-fade-in">
            
            <!-- Botón Volver -->
            <button (click)="resetToUserSelection()" class="absolute top-20 left-6 text-slate-500 hover:text-slate-800 font-bold flex items-center gap-2">
              <span>← Volver</span>
            </button>

            <div class="text-center mb-8">
              <div class="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-2 shadow-lg">
                {{ selectedUser()?.name?.charAt(0) }}
              </div>
              <h2 class="text-xl font-bold text-slate-800">Hola, {{ selectedUser()?.name }}</h2>
              <p class="text-slate-500 text-sm">Ingrese su clave de acceso</p>
            </div>

            <!-- Dots del PIN -->
            <div class="flex gap-3 mb-8 h-8">
               @for (dot of [0,1,2,3]; track dot) {
                 <div class="w-4 h-4 rounded-full border-2 border-slate-400 transition-all"
                      [class.bg-blue-600]="pin().length > dot"
                      [class.border-blue-600]="pin().length > dot">
                 </div>
               }
            </div>

            <!-- Teclado Numérico Visual (Para Touch) -->
            <div class="grid grid-cols-3 gap-3 w-64">
              @for (num of [1,2,3,4,5,6,7,8,9]; track num) {
                <button (click)="appendPin(num)" 
                        class="h-14 bg-white border border-gray-200 rounded shadow-sm text-xl font-bold hover:bg-gray-50 active:bg-blue-100 transition-colors">
                  {{ num }}
                </button>
              }
              <button (click)="pin.set('')" class="h-14 bg-red-50 border border-red-100 rounded text-red-600 font-bold hover:bg-red-100">CLR</button>
              <button (click)="appendPin(0)" class="h-14 bg-white border border-gray-200 rounded shadow-sm text-xl font-bold hover:bg-gray-50">0</button>
              <button (click)="submitLogin()" class="h-14 bg-blue-600 text-white rounded shadow-md font-bold hover:bg-blue-700">OK</button>
            </div>

          </div>
        }

      </div>
    </div>
  `,
  styles: [`
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
      animation: fade-in 0.3s ease-out forwards;
    }
  `]
})
export class LoginComponent {
  authService = inject(AuthService);
  router = inject(Router);

  // ESTADO
  currentStep = signal<LoginStep>('SELECT_USER');
  selectedUser = signal<User | null>(null);
  pin = signal<string>('');
  errorMessage = signal<string>('');
  currentDate = new Date(); // Solo para UI decorativa

  // Datos Mock (o traer del servicio)
  users: User[] = [
    { id: 1, name: 'Jenny (Admin)', pin: '1234', role: 'ADMIN' },
    { id: 2, name: 'Juan (Caja)', pin: '0000', role: 'OPERATOR' },
    { id: 3, name: 'Pedro (Carnic)', pin: '1111', role: 'OPERATOR' }
  ];

  // --- LÓGICA DE NAVEGACIÓN ---

  selectUser(user: User) {
    this.selectedUser.set(user);
    this.currentStep.set('ENTER_PIN');
    this.pin.set('');
    this.errorMessage.set('');
  }

  resetToUserSelection() {
    this.currentStep.set('SELECT_USER');
    this.selectedUser.set(null);
    this.pin.set('');
    this.errorMessage.set('');
  }

  // --- LÓGICA DE PIN ---

  appendPin(num: number) {
    if (this.pin().length < 6) {
      this.pin.update(p => p + num.toString());
      this.errorMessage.set(''); // Limpiar error al escribir
    }
  }

  submitLogin() {
    const user = this.selectedUser();
    const currentPin = this.pin();

    if (!user) return;

    if (user.pin === currentPin) {
      // Login Exitoso
      this.authService.currentUser.set(user);
      this.router.navigate(['/pos']);
    } else {
      // Login Fallido
      this.errorMessage.set('PIN INCORRECTO');
      this.pin.set('');
      
      // Feedback visual: vibrar o sacudir (opcional)
      setTimeout(() => this.errorMessage.set(''), 2000);
    }
  }

  // --- MANEJO DE TECLADO FÍSICO (EL CEREBRO DE LA UX) ---

  @HostListener('window:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent) {
    const key = event.key;
    const isNumber = !isNaN(Number(key));

    // ESC siempre vuelve atrás o limpia
    if (key === 'Escape') {
      if (this.currentStep() === 'ENTER_PIN') {
        this.resetToUserSelection();
      }
      return;
    }

    // MODO 1: SELECCIÓN DE USUARIO
    if (this.currentStep() === 'SELECT_USER') {
      if (isNumber) {
        const index = Number(key) - 1; // Tecla "1" es índice 0
        if (index >= 0 && index < this.users.length) {
          this.selectUser(this.users[index]);
        }
      }
    }
    
    // MODO 2: INGRESO DE PIN
    else if (this.currentStep() === 'ENTER_PIN') {
      if (isNumber) {
        this.appendPin(Number(key));
      } else if (key === 'Backspace') {
        this.pin.update(p => p.slice(0, -1));
      } else if (key === 'Enter') {
        this.submitLogin();
      }
    }
  }
}
