import { textToCP850, buildKitchenOrderBytes, buildClientTicketBytes } from "@/lib/escpos";
import type { CartItem } from "@/types/pos";

const mockProduct = {
  id: "123",
  category_id: "cat-1",
  name: "Ensalada House",
  description: "Ensalada fresca",
  price: 125,
  is_customizable: true,
  display_order: 1,
  created_at: new Date().toISOString(),
};

const mockIngredient = {
  id: "ing-1",
  type: "proteina" as const,
  name: "Pollo",
  is_premium: false,
  display_order: 1,
  created_at: new Date().toISOString(),
};

const mockCartItem: CartItem = {
  id: "cart-1",
  product: mockProduct,
  quantity: 1,
  unitPrice: 125,
  subtotal: 125,
  customizations: [{ ingredient: mockIngredient, extraCost: 0 }],
  customLabel: "Sin croutones",
};

describe("ESC/POS CP850 encoding", () => {
  test("ASCII characters pass through unchanged", () => {
    const bytes = textToCP850("Hello");
    expect(bytes).toEqual([72, 101, 108, 108, 111]);
  });

  test("Spanish accented characters convert to CP850", () => {
    const bytes = textToCP850("á");
    expect(bytes).toEqual([160]);
  });

  test("ñ converts correctly", () => {
    expect(textToCP850("ñ")).toEqual([164]);
    expect(textToCP850("Ñ")).toEqual([165]);
  });

  test("Emojis are replaced with space", () => {
    const bytes = textToCP850("🍽️");
    // Emojis should become spaces (code 32)
    expect(bytes.every((b) => b === 32)).toBe(true);
  });

  test("buildKitchenOrderBytes starts with ESC @ (init) and ESC t 2 (CP850)", () => {
    const bytes = buildKitchenOrderBytes(
      [{ quantity: 1, productName: "Test" }],
      1, "Juan", "01/01/2026 10:00",
    );
    // First two bytes: ESC @ (0x1B 0x40)
    expect(bytes[0]).toBe(0x1B);
    expect(bytes[1]).toBe(0x40);
    // Next three bytes: ESC t 2 (0x1B 0x74 0x02)
    expect(bytes[2]).toBe(0x1B);
    expect(bytes[3]).toBe(0x74);
    expect(bytes[4]).toBe(0x02);
  });

  test("buildClientTicketBytes ends with cut command", () => {
    const bytes = buildClientTicketBytes(
      [{ quantity: 1, productName: "Test", subtotal: 100 }],
      100, 1, "Juan", "01/01/2026 10:00",
    );
    const last3 = bytes.slice(-3);
    // GS V 1 (partial cut)
    expect(last3).toEqual([0x1D, 0x56, 0x01]);
  });
});
