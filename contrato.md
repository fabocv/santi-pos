# CONTRATO DE DEFINICIÓN FUNCIONAL  
## Sistema de Ventas a Granel – Carnicería (MVP v1.0)

**Fecha:**  
**Proveedor:**  
**Cliente (Carnicería):**  

---

# 1. OBJETO

El presente documento define el alcance funcional del Sistema de Ventas a Granel desarrollado exclusivamente para la operación de la carnicería, con funcionamiento offline-first, control de caja y emisión de ticket térmico 58mm.

---

# 2. ALCANCE GENERAL

El sistema permitirá:

- Venta de productos a granel por peso (gramos).
- Cálculo automático de subtotales y totales.
- Registro de forma de pago (efectivo, tarjeta, mixto).
- Control de caja diario.
- Almacenamiento local con sincronización posterior.
- Impresión de ticket térmico 58mm.
- Administración externa de productos y precios.

---

# 3. MODELO DE OPERACIÓN

## 3.1 Inicio de Sesión

- Inicio mediante lector de código de barras.
- En caso de falla:
  - Selección numérica de usuario.
  - Ingreso de PIN de 4–6 dígitos.
- Usuarios precargados desde panel administrativo externo.

---

## 3.2 Categorías de Productos

Estructura de códigos:

- 1xx → Pollo  
- 2xx → Vacuno  
- 3xx → Cerdo  
- 4xx → Embutidos  

Los productos se venden exclusivamente a granel (no preenvasados).

---

## 3.3 Flujo de Venta

1. Ingreso de código de producto.
2. Ingreso de peso en gramos (solo números).
3. Cálculo automático:
`subtotal = round((grams / 1000) * price_per_kg)`

4. Visualización inmediata en carrito.
5. Total acumulado visible permanentemente.

---

# 4. REGLAS DE PRECIO

- Cada producto posee un único precio por kilo vigente.
- No se permite:
  - Modificar precio durante venta.
  - Aplicar descuentos manuales.
  - Editar subtotal.
- Cambio de precio solo en modo administrador.
- Registro obligatorio de:
  - Precio anterior
  - Nuevo precio
  - Usuario
  - Fecha y hora

---

# 5. GESTIÓN DE CARRITO

Navegación mediante flechas ↑ ↓.

Eliminar ítem:

- Tecla `-`
- Confirmación con ENTER
- Cancelación con ESC

No se permite edición directa de peso.
En caso de error:
- Eliminar
- Reingresar correctamente

---

# 6. CIERRE DE VENTA

Pantalla única:

```
TOTAL: $XXXX

Ingrese efectivo:
$ ______
```


## Reglas automáticas:

Sea:

- T = total
- E = efectivo ingresado

### Caso 1: E = 0
- Tarjeta = T
- Vuelto = 0

### Caso 2: 0 < E < T
- Tarjeta = T - E
- Vuelto = 0

### Caso 3: E = T
- Tarjeta = 0
- Vuelto = 0

### Caso 4: E > T
- Tarjeta = 0
- Vuelto = E - T

La tarjeta nunca se ingresa manualmente.

---

# 7. CONTROL DE CAJA

## Apertura de turno

Ingreso obligatorio de: Monto inicial de caja


## Durante el día

Consulta en tiempo real de:

- Total ventas
- Ventas efectivo
- Ventas tarjeta
- Vuelto entregado
- Efectivo esperado en caja

## Cierre de turno

Resumen automático:

- Ventas totales
- Efectivo recibido
- Vuelto entregado
- Efectivo esperado
- Diferencias (si existen)

---

# 8. FUNCIONAMIENTO OFFLINE

- Todas las ventas se almacenan localmente.
- Si no hay internet:
  - Las ventas se apilan.
- Sincronización automática cuando exista conexión.
- Nunca se bloquea una venta por falta de red.

---

# 9. IMPRESIÓN DE TICKET (58mm)

Cada venta imprimirá:

- Nombre del local
- Fecha y hora
- Operador
- Listado de productos:
  - Nombre
  - Gramos
  - Precio por kilo
  - Subtotal
- Total
- Forma de pago
- Vuelto (si aplica)

La impresión no bloquea el guardado de la venta.

---

# 10. AUDITORÍA Y REGISTRO

El sistema almacenará:

- ID de venta
- Operador
- Fecha y hora
- Detalle de productos
- Montos
- Forma de pago
- Cambios de precio (log)
- Eliminaciones de ítems (registro interno)

---

# 11. EXCLUSIONES (MVP)

El sistema NO incluye en esta versión:

- Facturación electrónica.
- Integración directa con POS bancario.
- Gestión de inventario avanzado.
- Reportes tributarios automáticos.
- Multi-sucursal.
- Multi-empresa.

---

# 12. PROPIEDAD Y USO

El sistema es desarrollado exclusivamente para la carnicería cliente en su versión actual (MVP).

Cualquier ampliación futura será acordada mediante anexo técnico adicional.

---

# 13. ACEPTACIÓN

Ambas partes declaran estar conformes con el alcance funcional descrito.

---

**Firma Cliente:** ___________________________  

**Firma Proveedor:** ___________________________  

**Fecha:** ___________________________

