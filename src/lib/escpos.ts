/**
 * ESC/POS command builder with CP850 encoding for JHP-A series thermal printers.
 * Reference: ESC/POS command manual for 58mm/80mm printers.
 */

// ── CP850 conversion table ──────────────────────────────────────────
const utf8ToCP850: Record<string, number> = {
  'á': 160, 'é': 130, 'í': 161, 'ó': 162, 'ú': 163,
  'ñ': 164, 'ü': 129,
  'Á': 181, 'É': 144, 'Í': 214, 'Ó': 224, 'Ú': 233,
  'Ñ': 165, 'Ü': 154,
  '¿': 168, '¡': 173,
  'ª': 166, 'º': 167,
  '«': 174, '»': 175,
  '°': 248,
};

// Characters to replace for safety
const unsafeReplacements: Record<string, string> = {
  '\u2014': '-',  // em dash
  '\u2013': '-',  // en dash
  '\u2026': '...', // ellipsis
  '\u2018': "'",  // left single quote
  '\u2019': "'",  // right single quote
  '\u201C': '"',  // left double quote
  '\u201D': '"',  // right double quote
  '\u2022': '*',  // bullet
};

/** Convert a single character to CP850 byte(s). Returns array of byte values. */
function charToCP850(char: string): number[] {
  // Check unsafe replacements first
  if (unsafeReplacements[char]) {
    return unsafeReplacements[char].split('').map(c => c.charCodeAt(0));
  }
  // CP850 mapped character
  if (utf8ToCP850[char] !== undefined) {
    return [utf8ToCP850[char]];
  }
  const code = char.charCodeAt(0);
  // Standard ASCII (printable + control)
  if (code <= 127) {
    return [code];
  }
  // Strip emojis and unsupported chars → space
  return [32];
}

/** Convert full string to CP850 byte array */
export function textToCP850(text: string): number[] {
  const result: number[] = [];
  for (const char of text) {
    result.push(...charToCP850(char));
  }
  return result;
}

// ── ESC/POS command constants ───────────────────────────────────────
const ESC = 0x1B;
const GS  = 0x1D;
const LF  = 0x0A;

export const CMD = {
  /** Reset printer to defaults */
  INIT: [ESC, 0x40],
  /** Select CP850 code page */
  CP850: [ESC, 0x74, 0x02],

  // Alignment
  ALIGN_LEFT:   [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT:  [ESC, 0x61, 0x02],

  // Text style
  BOLD_ON:  [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],

  // Character size (GS ! n)
  SIZE_NORMAL:       [GS, 0x21, 0x00],  // n=0
  SIZE_DOUBLE_W:     [GS, 0x21, 0x10],  // n=16
  SIZE_DOUBLE_H:     [GS, 0x21, 0x01],  // n=1
  SIZE_DOUBLE_WH:    [GS, 0x21, 0x11],  // n=17

  // Paper feed
  FEED_3: [ESC, 0x64, 0x03],
  FEED_5: [ESC, 0x64, 0x05],

  // Cut paper
  CUT_PARTIAL: [GS, 0x56, 0x01],
  CUT_FULL:    [GS, 0x56, 0x00],
  /** Cut with feed: GS V 66 n (feed n lines then partial cut) */
  CUT_FEED: (n: number) => [GS, 0x56, 0x42, n],
} as const;

// ── Builder helpers ─────────────────────────────────────────────────

/** Create a line feed */
export function lf(): number[] {
  return [LF];
}

/** Print text line in CP850 + LF */
export function textLine(text: string): number[] {
  return [...textToCP850(text), LF];
}

/** Print separator line */
export function separator(char: string = '=', width: number = 32): number[] {
  return textLine(char.repeat(width));
}

/**
 * Build a complete ESC/POS byte array for a kitchen order (58mm).
 */
export function buildKitchenOrderBytes(
  items: Array<{
    quantity: number;
    productName: string;
    sizeName?: string;
    customLabel?: string;
    ingredients?: string[];
  }>,
  orderNumber: number | null,
  customerName: string,
  dateStr: string,
): number[] {
  const W = 32; // chars per line for 58mm
  const cmds: number[] = [];

  // Init + code page
  cmds.push(...CMD.INIT);
  cmds.push(...CMD.CP850);

  // Header
  cmds.push(...CMD.ALIGN_CENTER);
  cmds.push(...CMD.SIZE_DOUBLE_WH);
  cmds.push(...CMD.BOLD_ON);
  cmds.push(...textLine('COMANDA'));
  cmds.push(...CMD.SIZE_DOUBLE_H);
  cmds.push(...textLine(`#${orderNumber || '---'}`));
  cmds.push(...CMD.BOLD_OFF);
  cmds.push(...CMD.SIZE_NORMAL);

  // Separator
  cmds.push(...CMD.ALIGN_LEFT);
  cmds.push(...separator('=', W));

  // Client + time
  cmds.push(...CMD.BOLD_ON);
  cmds.push(...textLine(`Cliente: ${customerName}`));
  cmds.push(...CMD.BOLD_OFF);
  cmds.push(...textLine(`Hora: ${dateStr}`));

  // Separator
  cmds.push(...separator('=', W));

  // Items
  for (const item of items) {
    cmds.push(...CMD.BOLD_ON);
    cmds.push(...CMD.SIZE_DOUBLE_H);
    const line = `${item.quantity}x ${item.productName.toUpperCase()}`;
    cmds.push(...textLine(line));
    cmds.push(...CMD.SIZE_NORMAL);
    cmds.push(...CMD.BOLD_OFF);

    if (item.sizeName) {
      cmds.push(...textLine(`  Tamano: ${item.sizeName}`));
    }

    if (item.ingredients && item.ingredients.length > 0) {
      for (const ing of item.ingredients) {
        cmds.push(...textLine(`  * ${ing}`));
      }
    }

    if (item.customLabel) {
      cmds.push(...textLine(`  > ${item.customLabel}`));
    }

    cmds.push(...separator('-', W));
  }

  // Footer
  cmds.push(...CMD.ALIGN_CENTER);
  cmds.push(...CMD.SIZE_DOUBLE_WH);
  cmds.push(...CMD.BOLD_ON);
  cmds.push(...textLine('PREPARAR AHORA'));
  cmds.push(...CMD.BOLD_OFF);
  cmds.push(...CMD.SIZE_NORMAL);
  cmds.push(...CMD.ALIGN_LEFT);

  // Feed + cut
  cmds.push(...CMD.FEED_5);
  cmds.push(...CMD.CUT_PARTIAL);

  return cmds;
}

/**
 * Build a complete ESC/POS byte array for a client ticket (80mm).
 */
export function buildClientTicketBytes(
  items: Array<{
    quantity: number;
    productName: string;
    sizeName?: string;
    customLabel?: string;
    subtotal: number;
  }>,
  total: number,
  orderNumber: number | null,
  customerName: string,
  dateStr: string,
  business: {
    name: string;
    subtitle: string;
    address: string;
    phone: string;
  } = {
    name: 'JULIANA',
    subtitle: 'BARRA COTIDIANA',
    address: 'Av. Miguel Hidalgo #276',
    phone: 'Tel: 417 206 0111',
  },
): number[] {
  const W = 42; // chars per line for 80mm
  const cmds: number[] = [];

  // Init + code page
  cmds.push(...CMD.INIT);
  cmds.push(...CMD.CP850);

  // Business header
  cmds.push(...CMD.ALIGN_CENTER);
  cmds.push(...CMD.SIZE_DOUBLE_WH);
  cmds.push(...CMD.BOLD_ON);
  cmds.push(...textLine(business.name));
  cmds.push(...CMD.SIZE_NORMAL);
  cmds.push(...CMD.BOLD_OFF);
  cmds.push(...textLine(business.subtitle));
  cmds.push(...textLine(business.address));
  cmds.push(...textLine(business.phone));

  // Separator
  cmds.push(...CMD.ALIGN_LEFT);
  cmds.push(...separator('=', W));

  // Order info
  cmds.push(...CMD.BOLD_ON);
  cmds.push(...textLine(`Pedido: #${orderNumber || '---'}`));
  cmds.push(...textLine(`Nombre: ${customerName}`));
  cmds.push(...CMD.BOLD_OFF);
  cmds.push(...textLine(dateStr));

  // Separator
  cmds.push(...separator('=', W));

  // Items
  for (const item of items) {
    const desc = `${item.quantity}x ${item.productName}${item.sizeName ? ` (${item.sizeName})` : ''}`;
    const price = `$${item.subtotal.toFixed(0)}`;
    // Right-pad description, left-pad price
    const availWidth = W - price.length - 1;
    const descTrunc = desc.length > availWidth ? desc.substring(0, availWidth) : desc;
    const padded = descTrunc.padEnd(availWidth) + ' ' + price;
    cmds.push(...textLine(padded));

    if (item.customLabel) {
      cmds.push(...textLine(`  * ${item.customLabel}`));
    }
  }

  // Separator
  cmds.push(...separator('=', W));

  // Total
  cmds.push(...CMD.ALIGN_CENTER);
  cmds.push(...CMD.SIZE_DOUBLE_WH);
  cmds.push(...CMD.BOLD_ON);
  cmds.push(...textLine(`TOTAL: $${total.toFixed(0)}`));
  cmds.push(...CMD.BOLD_OFF);
  cmds.push(...CMD.SIZE_NORMAL);

  // Separator
  cmds.push(...CMD.ALIGN_LEFT);
  cmds.push(...separator('=', W));

  // Footer
  cmds.push(...CMD.ALIGN_CENTER);
  cmds.push(...textLine('Gracias por tu visita!'));
  cmds.push(...textLine('Vuelve pronto'));
  cmds.push(...CMD.ALIGN_LEFT);

  // Feed + cut
  cmds.push(...CMD.FEED_5);
  cmds.push(...CMD.CUT_PARTIAL);

  return cmds;
}
