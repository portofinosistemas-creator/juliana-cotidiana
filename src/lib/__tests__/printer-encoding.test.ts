// src/lib/__tests__/printer-encoding.test.ts

import { describe, it, expect } from 'vitest';
import { 
  generateClientTicketEscPos, 
  generateKitchenOrderEscPos,
} from '../printer-formats';
import type { CartItem } from '@/types/pos';

const mockProduct = {
  category_id: "cat-1",
  created_at: "2026-01-01T00:00:00Z",
  description: null,
  display_order: 0,
  id: "prod-1",
  is_customizable: false,
  name: "Pérez y Ñandú",
  price: 128,
};

const mockSize = {
  display_order: 0,
  id: "size-1",
  name: "Mediana",
  price: 128,
  product_id: "prod-1",
};

const mockIngredient = (name: string) => ({
  created_at: "2026-01-01T00:00:00Z",
  display_order: 0,
  id: `ing-${name}`,
  is_premium: false,
  name,
  type: "topping",
});

describe('Encoding CP850 en tickets', () => {
  
  const mockItems: CartItem[] = [
    {
      id: "item-1",
      quantity: 1,
      product: mockProduct,
      productSize: mockSize,
      unitPrice: 128,
      subtotal: 128,
      customLabel: "ÁÉÍÓÚ áéíóú Ññ Üü ¿¡ €",
      kitchenNote: "Bien cocido",
      customizations: [
        { ingredient: mockIngredient("jalapeño") },
        { ingredient: mockIngredient("aguacate") }
      ]
    }
  ];

  it('debe incluir ESC @ (0x1B 0x40) al inicio de cada ticket', () => {
    const clientTicket = generateClientTicketEscPos(
      mockItems, 128, 159, "Cliente", "27/02/2026", "Efectivo"
    );
    
    expect(clientTicket[0]).toBe(0x1B);
    expect(clientTicket[1]).toBe(0x40);
    
    const kitchenTicket = generateKitchenOrderEscPos(
      mockItems, 159, "César", "27/02/2026"
    );
    
    expect(kitchenTicket[0]).toBe(0x1B);
    expect(kitchenTicket[1]).toBe(0x40);
  });

  it('debe incluir ESC t 2 (0x1B 0x74 0x02) después del RESET', () => {
    const clientTicket = generateClientTicketEscPos(
      mockItems, 128, 159, "Cliente", "27/02/2026", "Efectivo"
    );
    
    expect(clientTicket[2]).toBe(0x1B);
    expect(clientTicket[3]).toBe(0x74);
    expect(clientTicket[4]).toBe(0x02);
    
    const kitchenTicket = generateKitchenOrderEscPos(
      mockItems, 159, "César", "27/02/2026"
    );
    
    expect(kitchenTicket[2]).toBe(0x1B);
    expect(kitchenTicket[3]).toBe(0x74);
    expect(kitchenTicket[4]).toBe(0x02);
  });

  it('debe mantener los saltos de línea como LF (0x0A)', () => {
    const ticket = generateClientTicketEscPos(
      mockItems, 128, 159, "Cliente", "27/02/2026", "Efectivo"
    );
    
    const hasCR = ticket.some(b => b === 0x0D);
    expect(hasCR).toBe(false);
    
    const hasLF = ticket.some(b => b === 0x0A);
    expect(hasLF).toBe(true);
  });

  it('debe reemplazar caracteres no soportados por espacio', () => {
    const itemsConEmojis: CartItem[] = [{
      ...mockItems[0],
      customLabel: "😊 🌟 ❤️"
    }];
    
    const ticket = generateClientTicketEscPos(
      itemsConEmojis, 128, 159, "Cliente", "27/02/2026", "Efectivo"
    );
    
    const ticketString = ticket.map(b => String.fromCharCode(b)).join('');
    expect(ticketString).not.toContain('😊');
    expect(ticketString).not.toContain('🌟');
    expect(ticketString).not.toContain('❤️');
  });
});

describe('Validación de bytes específicos', () => {
  const mockItems: CartItem[] = [{
    id: "item-test",
    quantity: 1,
    product: { ...mockProduct, name: "Test" },
    unitPrice: 128,
    subtotal: 128,
    customLabel: "",
    customizations: []
  }];

  it('debe generar ticket sin errores', () => {
    const ticket = generateClientTicketEscPos(
      mockItems, 128, 159, "Cliente", "27/02/2026", "Efectivo"
    );
    expect(ticket.length).toBeGreaterThan(0);
    expect(ticket[0]).toBe(0x1B);
    expect(ticket[1]).toBe(0x40);
  });
});
