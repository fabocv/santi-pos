// Helper function para calcular el desglose del pago
export function calculatePaymentSplit(total: number, cashGiven: number) {
  let cardAmount = 0;
  let change = 0;

  if (cashGiven === 0) {
    // Caso 1
    cardAmount = total;
    change = 0;
  } else if (cashGiven > 0 && cashGiven < total) {
    // Caso 2: Mixto
    cardAmount = total - cashGiven;
    change = 0;
  } else if (cashGiven === total) {
    // Caso 3: Exacto
    cardAmount = 0;
    change = 0;
  } else if (cashGiven > total) {
    // Caso 4: Vuelto
    cardAmount = 0;
    change = cashGiven - total;
  }

  return { cardAmount, change };
}
