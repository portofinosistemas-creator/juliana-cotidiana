import type { CartItem } from "@/types/pos";
import { buildKitchenOrderBytes, buildClientTicketBytes } from "./escpos";

interface PrinterConfig {
  width: number;
  charsPerLine: number;
}

const PRINTER_CONFIGS: Record<string, PrinterConfig> = {
  "80mm": { width: 80, charsPerLine: 42 },
  "58mm": { width: 58, charsPerLine: 32 },
};

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
 * Generate HTML for kitchen order (fallback browser print)
 */
export function generateKitchenOrderHTML(
  items: CartItem[],
  orderNumber: number | null,
  customerName: string,
  dateStr: string,
): string {
  const config = PRINTER_CONFIGS["58mm"];

  let html = `
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { margin:0; padding:0; font-family:'Courier New',monospace; font-size:13px; width:${config.width}mm; line-height:1.3; }
          .comanda { padding:3mm; text-align:center; white-space:pre-wrap; word-wrap:break-word; }
          .header { font-size:18px; font-weight:bold; margin-bottom:2mm; text-transform:uppercase; letter-spacing:1px; }
          .order-info { font-size:12px; text-align:left; margin-bottom:2mm; padding:1mm 0; border-bottom:2px solid #000; border-top:2px solid #000; }
          .info-line { margin:1mm 0; font-weight:bold; }
          .items-section { margin:2mm 0; text-align:left; }
          .item-group { margin:2mm 0; padding:1mm; border:1px solid #000; text-align:left; }
          .item-line { font-size:14px; font-weight:bold; text-transform:uppercase; margin:1mm 0; }
          .ingredient { font-size:11px; font-weight:normal; margin-left:3mm; margin-top:0.5mm; }
          .ingredient::before { content:"* "; font-weight:bold; }
          .footer { margin-top:2mm; padding-top:1mm; border-top:2px solid #000; font-size:14px; font-weight:bold; text-transform:uppercase; letter-spacing:1px; }
        </style>
      </head>
      <body>
        <div class="comanda">
          <div class="header">COMANDA #${orderNumber || "---"}</div>
          <div class="order-info">
            <div class="info-line">CLIENTE: ${customerName.toUpperCase()}</div>
            <div class="info-line" style="font-size:11px;font-weight:normal;">Hora: ${dateStr}</div>
          </div>
          <div class="items-section">`;

  items.forEach((item) => {
    html += `<div class="item-group">`;
    html += `<div class="item-line">${item.quantity}x ${item.product.name}${item.productSize ? ` (${item.productSize.name})` : ""}</div>`;
    if (item.customizations && item.customizations.length > 0) {
      html += `<div style="margin-top:0.5mm;margin-left:2mm;">`;
      item.customizations.forEach((c) => {
        html += `<div class="ingredient">${c.ingredient.name}</div>`;
      });
      html += `</div>`;
    }
    if (item.customLabel) {
      html += `<div class="ingredient" style="font-style:italic;">> ${item.customLabel}</div>`;
    }
    if ((!item.customizations || item.customizations.length === 0) && !item.customLabel) {
      html += `<div class="ingredient">Sin modificaciones</div>`;
    }
    html += `</div>`;
  });

  html += `</div><div class="footer">PREPARAR YA</div></div></body></html>`;
  return html;
}

/**
 * Generate HTML for client ticket (fallback browser print)
 */
export function generateClientTicketHTML(
  items: CartItem[],
  total: number,
  orderNumber: number | null,
  customerName: string,
  dateStr: string,
): string {
  const config = PRINTER_CONFIGS["80mm"];

  let html = `
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { margin:0; padding:0; font-family:'Courier New',monospace; font-size:12px; width:${config.width}mm; line-height:1.4; }
          .receipt { padding:3mm; text-align:center; white-space:pre-wrap; word-wrap:break-word; }
          .header { font-weight:bold; font-size:18px; margin-bottom:2mm; }
          .subheader { font-size:10px; margin-bottom:3mm; }
          .line-sep { margin:2mm 0; border-bottom:1px dashed #000; }
          .item { text-align:left; font-size:11px; margin:1mm 0; display:flex; justify-content:space-between; }
          .item-detail { text-align:left; font-size:9px; padding-left:3mm; color:#666; }
          .total { font-weight:bold; font-size:14px; margin:2mm 0; display:flex; justify-content:space-between; }
          .bold { font-weight:bold; }
          .footer { font-size:10px; margin-top:3mm; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">JULIANA</div>
          <div class="subheader">BARRA COTIDIANA</div>
          <div class="subheader">Av. Miguel Hidalgo #276</div>
          <div class="subheader">Tel: 417 206 0111</div>
          <div class="line-sep"></div>
          <div style="text-align:left;">
            <div class="bold">Pedido: #${orderNumber || "---"}</div>
            <div class="bold">Nombre: ${customerName || "---"}</div>
            <div>${dateStr}</div>
          </div>
          <div class="line-sep"></div>`;

  items.forEach((item) => {
    const itemLine = `${item.quantity}x ${item.product.name}${item.productSize ? ` (${item.productSize.name})` : ""}`;
    const priceLine = `$${item.subtotal.toFixed(0)}`;
    html += `<div class="item"><span>${itemLine}</span><span>${priceLine}</span></div>`;
    if (item.customLabel) {
      html += `<div class="item-detail">* ${item.customLabel}</div>`;
    }
  });

  html += `
          <div class="line-sep"></div>
          <div class="total"><span>TOTAL</span><span>$${total.toFixed(0)}</span></div>
          <div class="line-sep"></div>
          <div class="footer">Gracias por tu visita!</div>
          <div class="footer">Vuelve pronto</div>
        </div>
      </body>
    </html>`;
  return html;
}

/**
 * Send raw ESC/POS bytes to a Bluetooth printer via Web Bluetooth API.
 */
export async function printToDevice(
  deviceAddress: string,
  bytesOrHtml: number[] | string,
  printerSize: "80mm" | "58mm",
): Promise<void> {
  if (!navigator.bluetooth) {
    throw new Error("Web Bluetooth API no disponible en este navegador");
  }

  // If we received HTML (legacy path), just use browser fallback
  if (typeof bytesOrHtml === "string") {
    printViaBrowser(bytesOrHtml, printerSize === "80mm" ? "Ticket Cliente" : "Comanda Cocina");
    return;
  }

  const printData = bytesOrHtml;

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
    console.error("Error de impresion:", error);
    throw error;
  }
}

/**
 * Print via browser window (fallback)
 */
export function printViaBrowser(htmlContent: string, title: string = "Impresion"): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) throw new Error("No se pudo abrir ventana de impresion");
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.onload = () => printWindow.print();
}
