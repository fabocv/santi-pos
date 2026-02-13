import { Component, HostListener, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../../core/services/auth.service';
import { Router } from '@angular/router';

type LoginStep = 'SELECT_USER' | 'ENTER_PIN';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: "login.html",
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

  MAX_PIN_LENGTH = 4;

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
    if (this.pin().length < this.MAX_PIN_LENGTH) {
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
