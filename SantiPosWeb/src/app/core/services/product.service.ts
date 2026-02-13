import { Injectable, signal, computed, effect } from '@angular/core';
import { Product } from '../models/pos.model';


// Interfaz para el Log de cambios de precio (Requisito Sección 4)
export interface PriceChangeLog {
  productId: string;
  oldPrice: number;
  newPrice: number;
  operatorId: string;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly STORAGE_KEY = 'santi_pos_catalog';

  // BASE DE DATOS DE PRODUCTOS
  private _products: Product[] = [
    // --- 100: POLLO ---
    { code: '100', name: 'Trutro de Pollo', pricePerKg: 2990, category: 'POLLO' },
    { code: '101', name: 'Alitas de Pollo', pricePerKg: 3590, category: 'POLLO' },
    { code: '102', name: 'Patitas de Pollo', pricePerKg: 1500, category: 'POLLO' },
    { code: '103', name: 'Trutro Cuarto', pricePerKg: 2490, category: 'POLLO' },
    { code: '104', name: 'Pechuga Deshuesada', pricePerKg: 4990, category: 'POLLO' },
    { code: '105', name: 'Panita de Pollo', pricePerKg: 1890, category: 'POLLO' },

    // --- 200: VACUNO ---
    { code: '200', name: 'Posta Paleta', pricePerKg: 8990, category: 'VACUNO' },
    { code: '201', name: 'Punta de Ganso', pricePerKg: 12990 , category: 'VACUNO'},
    { code: '202', name: 'Entrecot', pricePerKg: 14990 , category: 'VACUNO'},
    { code: '203', name: 'Costilla Centro', pricePerKg: 9990 , category: 'VACUNO'},

    // --- 300: CERDO ---
    { code: '300', name: 'Chuleta Centro', pricePerKg: 4990 , category: 'CERDO'},
    { code: '301', name: 'Chuleta Vetada', pricePerKg: 5490 , category: 'CERDO'},
    { code: '302', name: 'Pulpa de Cerdo', pricePerKg: 4690 , category: 'CERDO'},

    // --- 400: CECINAS ---
    { code: '400', name: 'Longaniza Chillán', pricePerKg: 7990, category: 'EMBUTIDOS' },
    { code: '401', name: 'Longaniza Oma Wurtz', pricePerKg: 8990, category: 'EMBUTIDOS' },
    { code: '402', name: 'Vienesas Pacel', pricePerKg: 3200, category: 'EMBUTIDOS' },
  ];

  // 1. STATE (Signals)
  // Mantenemos la lista privada y exponemos una lectura o computados
  private productsSignal = signal<Product[]>(this._products);

  // Exponemos la lista como solo lectura para los componentes
  public products = this.productsSignal.asReadonly();
  
  // Signal para saber si estamos cargando datos (útil para la UI)
  public isLoading = signal<boolean>(false);

  constructor() {
    // Al iniciar el servicio, intentamos cargar primero lo que haya en local
    this.loadFromStorage();
    
    // Luego intentamos actualizar desde "la nube" (simulado aquí)
    this.fetchProductsFromApi();
  }

  // 2. BÚSQUEDA OPTIMIZADA (Requisito 3.3)
  // Busca por coincidencia exacta de código. Retorna undefined si no existe.
  getProductByCode(code: number): Product | undefined {
    const searchCode = code.toString().trim(); 
    return this.productsSignal().find(p => p.code.toString() === searchCode);
  }


  // 3. ACTUALIZACIÓN DE PRECIOS (Requisito 4)
  // Solo el admin puede llamar a esto. Genera un log de auditoría.
  updatePrice(code: string, newPrice: number, operatorId: string): PriceChangeLog | null {
    const currentProducts = this.productsSignal();
    const productIndex = currentProducts.findIndex(p => p.code === code);

    if (productIndex === -1) return null;

    const product = currentProducts[productIndex];
    const oldPrice = product.pricePerKg;

    // Regla de negocio: No permitir actualizaciones si el precio es igual
    if (oldPrice === newPrice) return null;

    // Crear el log de auditoría
    const auditLog: PriceChangeLog = {
      productId: code,
      oldPrice,
      newPrice,
      operatorId,
      timestamp: new Date().toISOString()
    };

    // Actualizamos el estado inmutablemente
    const updatedProducts = [...currentProducts];
    updatedProducts[productIndex] = { ...product, pricePerKg: newPrice };
    
    this.productsSignal.set(updatedProducts);
    
    // Guardamos inmediatamente en local para persistencia
    this.saveToStorage(updatedProducts);

    // Aquí deberíamos enviar el log al backend
    console.log('[AUDIT] Precio actualizado:', auditLog);
    
    return auditLog;
  }

  // 4. MANEJO DE DATOS (Simulación API + Offline)
  
  private loadFromStorage() {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        this.productsSignal.set(JSON.parse(stored));
      } catch (e) {
        console.error('Error leyendo caché local', e);
      }
    }
  }

  private saveToStorage(data: Product[]) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }

  // Simula la llamada al backend para obtener la lista maestra
  public fetchProductsFromApi() {
    this.isLoading.set(true);

    // Simulamos delay de red
    setTimeout(() => {
      // DATA MOCK SEGÚN CATEGORÍAS DEL CONTRATO (3.2)
      const mockData: Product[] = this._products

      // Actualizamos la señal con los datos "nuevos" del servidor
      this.productsSignal.set(mockData);
      
      // Actualizamos el caché local para la próxima vez que se abra sin internet
      this.saveToStorage(mockData);
      
      this.isLoading.set(false);
    }, 1000);
  }
}
