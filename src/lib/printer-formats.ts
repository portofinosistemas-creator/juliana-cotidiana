import type { CartItem } from "@/types/pos";
import { buildKitchenOrderBytes, buildClientTicketBytes } from "./escpos";

/** Map CartItem[] to the shape expected by ESC/POS builders */
function mapItemsForKitchen(items: CartItem[]) {
  return items.map((item) => ({
    quantity: item.quantity,
    productName: item.product.name,
    sizeName: item.productSize?.name,
    customLabel: item.customLabel || undefined,
    ingredients: item.customizations?.map((c) => c.ingredient.name) || [],
  }));
}

function mapItemsForTicket(items: CartItem[]) {
  return items.map((item) => ({
    quantity: item.quantity,
    productName: item.product.name,
    sizeName: item.productSize?.name,
    customLabel: item.customLabel || undefined,
    subtotal: item.subtotal,
  }));
}

/**
 * Generate raw ESC/POS bytes for kitchen order (58mm)
 */
export function generateKitchenOrderBytes(
  items: CartItem[],
  orderNumber: number | null,
  customerName: string,
  dateStr: string,
): number[] {
  return buildKitchenOrderBytes(
    mapItemsForKitchen(items),
    orderNumber,
    customerName,
    dateStr,
  );
}

/**
 * Generate raw ESC/POS bytes for client ticket (80mm)
 */
export function generateClientTicketBytes(
  items: CartItem[],
  total: number,
  orderNumber: number | null,
  customerName: string,
  dateStr: string,
): number[] {
  return buildClientTicketBytes(
    mapItemsForTicket(items),
    total,
    orderNumber,
    customerName,
    dateStr,
  );
}

/**
 * Send raw ESC/POS bytes to a Bluetooth printer via Web Bluetooth API.
 */
export async function printToDevice(
  _deviceAddress: string,
  bytes: number[],
  printerSize: "80mm" | "58mm",
): Promise<void> {
  if (!navigator.bluetooth) {
    throw new Error("Web Bluetooth API no disponible en este navegador");
  }
  const printData = bytes;

  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: ["00001101-0000-1000-8000-00805f9b34fb"] }],
      optionalServices: [
        "00001101-0000-1000-8000-00805f9b34fb",
        "0000180a-0000-1000-8000-00805f9b34fb",
      ],
    });

    if (!device) throw new Error("No se selecciono dispositivo");

    const server = await device.gatt?.connect();
    if (!server) throw new Error("No se pudo conectar a GATT server");

    const service = await server.getPrimaryService("00001101-0000-1000-8000-00805f9b34fb");

    let characteristic;
    try {
      characteristic = await service.getCharacteristic("2a19");
    } catch {
      const characteristics = await service.getCharacteristics();
      characteristic = characteristics.find(
        (c) => c.properties.write || c.properties.writeWithoutResponse,
      );
      if (!characteristic) throw new Error("No se encontro caracteristica escribible");
    }

    // Send in chunks (Android limit ~512 bytes)
    const CHUNK_SIZE = 512;
    for (let i = 0; i < printData.length; i += CHUNK_SIZE) {
      const chunk = printData.slice(i, Math.min(i + CHUNK_SIZE, printData.length));
      const buffer = new Uint8Array(chunk);
      if (characteristic.properties.writeWithoutResponse) {
        await characteristic.writeValueWithoutResponse(buffer);
      } else {
        await characteristic.writeValue(buffer);
      }
      await new Promise((r) => setTimeout(r, 50));
    }

    await new Promise((r) => setTimeout(r, 200));
    device.gatt?.disconnect();
  } catch (error) {
    console.error(`Error de impresion ESC/POS (${printerSize}):`, error);
    throw error;
  }
}
