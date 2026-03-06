import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
<<<<<<< HEAD
  generateClientTicketBytes,
  generateKitchenOrderBytes,
  printToDevice,
=======
  type CashCutCountSummary,
  type CashCutDetails,
  generateCashCutTicketEscPos,
  generateClientTicketEscPos,
  generateKitchenOrderEscPos,
  printMultipleToDevice,
>>>>>>> origen/main
} from "@/lib/printer-formats";
import type { PrinterDevice, PrinterPreferences } from "@/types/printer";
import type { CartItem } from "@/types/pos";
<<<<<<< HEAD

interface PrinterDevice {
  address: string;
  name: string;
  lastUsed?: Date;
}

interface PrinterPreferences {
  clientPrinter80mm?: PrinterDevice;
  kitchenPrinter58mm?: PrinterDevice;
  autoPrint: boolean;
}
=======
import type { CashRegisterSale } from "@/lib/cash-register";
>>>>>>> origen/main

const STORAGE_KEY = "printerPreferences";
const AUTO_PRINTER_ID = "AUTO_PRINTER";
const FIXED_PRINTER_ID = "FIXED_GL_PRINTER";
const FIXED_PRINTER_ADDRESS = "AB:0A:FA:8F:3C:AA";
const AUTO_PRINTER: PrinterDevice = {
  id: AUTO_PRINTER_ID,
  address: AUTO_PRINTER_ID,
  name: "Auto (detectar impresora)",
  type: "80mm",
  status: "connected",
};
const FIXED_PRINTER: PrinterDevice = {
  id: FIXED_PRINTER_ID,
  address: FIXED_PRINTER_ADDRESS,
  name: "GL Printer fija",
  type: "80mm",
  status: "connected",
};

const DEFAULT_PREFERENCES: PrinterPreferences = {
  printers: {
    [AUTO_PRINTER_ID]: AUTO_PRINTER,
    [FIXED_PRINTER_ID]: FIXED_PRINTER,
  },
  clientPrinterId: FIXED_PRINTER_ID,
  autoPrint: true,
  openDrawerOn80mm: true,
  fullCutOn80mm: true,
};

function normalizePreferences(input?: Partial<PrinterPreferences>): PrinterPreferences {
  const printersInput = input?.printers && typeof input.printers === "object" ? input.printers : {};
  const printers = {
    [AUTO_PRINTER_ID]: AUTO_PRINTER,
    [FIXED_PRINTER_ID]: FIXED_PRINTER,
    ...printersInput,
  };
  const ids = Object.keys(printers);
  const requestedId = input?.clientPrinterId;
  const clientPrinterId = requestedId && printers[requestedId] ? requestedId : ids[0];

  return {
    printers,
    clientPrinterId,
    autoPrint:
      typeof input?.autoPrint === "boolean"
        ? input.autoPrint
        : DEFAULT_PREFERENCES.autoPrint,
    openDrawerOn80mm:
      typeof input?.openDrawerOn80mm === "boolean"
        ? input.openDrawerOn80mm
        : DEFAULT_PREFERENCES.openDrawerOn80mm,
    fullCutOn80mm:
      typeof input?.fullCutOn80mm === "boolean"
        ? input.fullCutOn80mm
        : DEFAULT_PREFERENCES.fullCutOn80mm,
  };
}

const DEFAULT_PRINTER: PrinterDevice = {
  address: "AB:0A:FA:8F:3C:AA",
  name: "Impresora Bluetooth",
};

const DEFAULT_PREFERENCES: PrinterPreferences = {
  clientPrinter80mm: DEFAULT_PRINTER,
  kitchenPrinter58mm: DEFAULT_PRINTER,
  autoPrint: true,
  useBluetoothIfAvailable: true,
  fallbackToWeb: true,
};

export function useBluetootPrinter() {
  const [preferences, setPreferences] = useState<PrinterPreferences>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
<<<<<<< HEAD
<<<<<<< HEAD
    return (
      stored && {
        ...JSON.parse(stored),
        autoPrint: true,
      }
    ) || {
      autoPrint: true,
    };
=======
    if (!stored) return DEFAULT_PREFERENCES;

    try {
      const parsed = JSON.parse(stored) as Partial<PrinterPreferences>;
      return normalizePreferences(parsed);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return DEFAULT_PREFERENCES;
    }
>>>>>>> origen/main
=======
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_PREFERENCES, ...parsed };
    }
    // Save defaults on first load
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PREFERENCES));
    return DEFAULT_PREFERENCES;
>>>>>>> 5f9f36c572e74e0818426916ec812d5f80d28e05
  });

  const [isPrinting, setIsPrinting] = useState(false);
  const [printQueue, setPrintQueue] = useState<Array<() => Promise<void>>>([]);

  const savePreferences = useCallback((prefs: PrinterPreferences) => {
    const normalized = normalizePreferences(prefs);
    setPreferences(normalized);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }, []);

<<<<<<< HEAD
  const pairClientPrinter = useCallback(async () => {
    try {
      if (!navigator.bluetooth) {
        toast.error("Web Bluetooth no disponible en este navegador");
        return false;
      }
      toast.loading("Buscando impresoras...");
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ["00001101-0000-1000-8000-00805f9b34fb"] }],
        optionalServices: ["00001101-0000-1000-8000-00805f9b34fb", "0000180a-0000-1000-8000-00805f9b34fb"],
      });
      if (!device) return false;
      const newPrefs = {
        ...preferences,
        clientPrinter80mm: { address: device.id, name: device.name || "Impresora 80mm" },
      };
      savePreferences(newPrefs);
      toast.success(`Impresora "${device.name}" emparejada correctamente`);
      return true;
    } catch (error) {
      console.error("Error al emparejar impresora:", error);
      if (error instanceof Error) {
        if (error.message.includes("User cancelled")) toast.info("Emparejamiento cancelado");
        else toast.error(`Error: ${error.message}`);
      } else {
        toast.error("Error desconocido al emparejar impresora");
      }
      return false;
    }
  }, [preferences, savePreferences]);

  const pairKitchenPrinter = useCallback(async () => {
    try {
      if (!navigator.bluetooth) {
        toast.error("Web Bluetooth no disponible en este navegador");
        return false;
      }
      toast.loading("Buscando impresoras...");
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ["00001101-0000-1000-8000-00805f9b34fb"] }],
        optionalServices: ["00001101-0000-1000-8000-00805f9b34fb", "0000180a-0000-1000-8000-00805f9b34fb"],
      });
      if (!device) return false;
      const newPrefs = {
        ...preferences,
        kitchenPrinter58mm: { address: device.id, name: device.name || "Impresora 58mm" },
      };
      savePreferences(newPrefs);
      toast.success(`Impresora "${device.name}" emparejada correctamente`);
      return true;
    } catch (error) {
      console.error("Error al emparejar impresora:", error);
      if (error instanceof Error) {
        if (error.message.includes("User cancelled")) toast.info("Emparejamiento cancelado");
        else toast.error(`Error: ${error.message}`);
      } else {
        toast.error("Error desconocido al emparejar impresora");
      }
      return false;
    }
  }, [preferences, savePreferences]);
=======
  const enqueuePrintJob = useCallback((job: () => Promise<void>) => {
    return new Promise<void>((resolve, reject) => {
      setPrintQueue((prev) => [
        ...prev,
        async () => {
          try {
            await job();
            resolve();
          } catch (error) {
            reject(error);
            throw error;
          }
        },
      ]);
    });
  }, []);
>>>>>>> origen/main

  useEffect(() => {
    let isMounted = true;
    const processPrintQueue = async () => {
      if (printQueue.length === 0 || isPrinting) return;
      setIsPrinting(true);
      const job = printQueue[0];
      try { await job(); } catch (error) { console.error("Error en trabajo de impresion:", error); }
      finally { if (isMounted) { setPrintQueue((prev) => prev.slice(1)); setIsPrinting(false); } }
    };
<<<<<<< HEAD
    processPrintQueue();
    return () => { isMounted = false; };
  }, [printQueue, isPrinting]);

  const printClientTicket = useCallback(
    async (items: CartItem[], total: number, orderNumber: number | null, customerName: string, dateStr: string) => {
      const printJob = async () => {
        try {
          if (!preferences.clientPrinter80mm) {
            throw new Error("No hay impresora de cliente emparejada");
          }
          const bytes = generateClientTicketBytes(items, total, orderNumber, customerName, dateStr);
          await printToDevice(preferences.clientPrinter80mm.address, bytes, "80mm");
          toast.success("Ticket ESC/POS enviado a cliente");
        } catch (error) {
          console.error("Error al imprimir ticket:", error);
          toast.error("Error al imprimir ticket");
          throw error;
        }
      };
      setPrintQueue((prev) => [...prev, printJob]);
    },
    [preferences],
=======

    void processPrintQueue();

    return () => {
      isMounted = false;
    };
  }, [printQueue, isPrinting]);

  const getClientPrinter = useCallback((): PrinterDevice | null => {
    if (!preferences.clientPrinterId) return null;
    return preferences.printers[preferences.clientPrinterId] || AUTO_PRINTER;
  }, [preferences.clientPrinterId, preferences.printers]);

  const selectClientPrinter = useCallback(async (): Promise<PrinterDevice> => {
    if (typeof navigator === "undefined" || !navigator.bluetooth?.requestDevice) {
      throw new Error("Este navegador no soporta selección manual de impresora Bluetooth.");
    }

    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ["000018f0-0000-1000-8000-00805f9b34fb"],
    });

    const printer: PrinterDevice = {
      id: device.id,
      address: device.id,
      name: device.name || "Impresora Bluetooth",
      type: "80mm",
      status: "connected",
      lastUsed: new Date(),
    };

    savePreferences({
      ...preferences,
      printers: {
        ...preferences.printers,
        [printer.id]: printer,
      },
      clientPrinterId: printer.id,
      autoPrint: true,
    });

    return printer;
  }, [preferences, savePreferences]);

  const printClientTicket = useCallback(
    async (
      items: CartItem[],
      total: number,
      orderNumber: number | null,
      customerName: string,
      dateStr: string,
      paymentMethodLabel: string = "Efectivo"
    ) => {
      const printJob = async () => {
        const selectedPrinter = getClientPrinter() || AUTO_PRINTER;

        const escPosCommands = generateClientTicketEscPos(
          items,
          total,
          orderNumber,
          customerName,
          dateStr,
          paymentMethodLabel,
          {
            openDrawer: preferences.openDrawerOn80mm,
            fullCut: preferences.fullCutOn80mm,
          }
        );

        await printMultipleToDevice(selectedPrinter.address, [
          {
            escPosCommands,
            printerSize: "80mm",
            options: {
              openDrawer: preferences.openDrawerOn80mm,
              fullCut: preferences.fullCutOn80mm,
            },
          },
        ]);
        toast.success("Ticket de cliente enviado a impresora");
      };

      await enqueuePrintJob(printJob);
    },
    [enqueuePrintJob, getClientPrinter, preferences.fullCutOn80mm, preferences.openDrawerOn80mm]
  );

  const printCashCutTicket = useCallback(
    async (
      sales: CashRegisterSale[],
      generatedAt: string,
      title: string = "CORTE DE CAJA",
      countSummary?: CashCutCountSummary,
      details?: CashCutDetails
    ) => {
      const printJob = async () => {
        const selectedPrinter = getClientPrinter() || AUTO_PRINTER;

        const escPosCommands = generateCashCutTicketEscPos(
          sales,
          generatedAt,
          title,
          countSummary,
          details,
          {
            openDrawer: preferences.openDrawerOn80mm,
            fullCut: preferences.fullCutOn80mm,
          }
        );

        await printMultipleToDevice(selectedPrinter.address, [
          {
            escPosCommands,
            printerSize: "80mm",
            options: {
              openDrawer: preferences.openDrawerOn80mm,
              fullCut: preferences.fullCutOn80mm,
            },
          },
        ]);
      };

      await enqueuePrintJob(printJob);
    },
    [enqueuePrintJob, getClientPrinter, preferences.fullCutOn80mm, preferences.openDrawerOn80mm]
>>>>>>> origen/main
  );

  const printKitchenOrder = useCallback(
    async (items: CartItem[], orderNumber: number | null, customerName: string, dateStr: string) => {
<<<<<<< HEAD
      const printJob = async () => {
        try {
          if (!preferences.kitchenPrinter58mm) {
            throw new Error("No hay impresora de cocina emparejada");
          }
          const bytes = generateKitchenOrderBytes(items, orderNumber, customerName, dateStr);
          await printToDevice(preferences.kitchenPrinter58mm.address, bytes, "58mm");
          toast.success("Comanda ESC/POS enviada a cocina");
        } catch (error) {
          console.error("Error al imprimir comanda:", error);
          toast.error("Error al imprimir comanda");
          throw error;
        }
      };
      setPrintQueue((prev) => [...prev, printJob]);
    },
    [preferences],
  );

  const printBoth = useCallback(
    async (items: CartItem[], total: number, orderNumber: number | null, customerName: string, dateStr: string) => {
      await printKitchenOrder(items, orderNumber, customerName, dateStr);
      await printClientTicket(items, total, orderNumber, customerName, dateStr);
    },
    [printKitchenOrder, printClientTicket],
  );

  const unpairClientPrinter = useCallback(() => {
    savePreferences({ ...preferences, clientPrinter80mm: undefined });
    toast.success("Impresora 80mm desemparejada");
  }, [preferences, savePreferences]);

  const unpairKitchenPrinter = useCallback(() => {
    savePreferences({ ...preferences, kitchenPrinter58mm: undefined });
    toast.success("Impresora 58mm desemparejada");
  }, [preferences, savePreferences]);

  return {
    preferences, savePreferences,
    pairClientPrinter, pairKitchenPrinter,
    unpairClientPrinter, unpairKitchenPrinter,
    printClientTicket, printKitchenOrder, printBoth,
    isPrinting, queueLength: printQueue.length,
=======
      const printJob = async () => {
        const selectedPrinter = getClientPrinter() || AUTO_PRINTER;

        const escPosCommands = generateKitchenOrderEscPos(items, orderNumber, customerName, dateStr, {
          fullCut: false,
        });

        await printMultipleToDevice(selectedPrinter.address, [
          {
            escPosCommands,
            printerSize: "80mm",
          },
        ]);
        toast.success("Comanda de cocina enviada a impresora");
      };

      await enqueuePrintJob(printJob);
    },
    [enqueuePrintJob, getClientPrinter]
  );

  const printKitchenAndClientCombined = useCallback(
    async (
      items: CartItem[],
      total: number,
      orderNumber: number | null,
      customerName: string,
      dateStr: string,
      paymentMethodLabel: string = "Efectivo"
    ) => {
      const printJob = async () => {
        const selectedPrinter = getClientPrinter() || AUTO_PRINTER;

        const kitchenEscPos = generateKitchenOrderEscPos(items, orderNumber, customerName, dateStr, {
          fullCut: false,
        });
        const clientEscPos = generateClientTicketEscPos(
          items,
          total,
          orderNumber,
          customerName,
          dateStr,
          paymentMethodLabel,
          {
            openDrawer: preferences.openDrawerOn80mm,
            fullCut: preferences.fullCutOn80mm,
          }
        );

        await printMultipleToDevice(selectedPrinter.address, [
          { escPosCommands: kitchenEscPos, printerSize: "80mm" },
          { escPosCommands: clientEscPos, printerSize: "80mm" },
        ]);
        toast.success("Comanda y ticket enviados a impresora 80mm");
      };

      await enqueuePrintJob(printJob);
    },
    [enqueuePrintJob, getClientPrinter, preferences.fullCutOn80mm, preferences.openDrawerOn80mm]
  );

  const printBoth = useCallback(
    async (
      items: CartItem[],
      total: number,
      orderNumber: number | null,
      customerName: string,
      dateStr: string,
      paymentMethodLabel: string = "Efectivo"
    ) => {
      await printKitchenAndClientCombined(
        items,
        total,
        orderNumber,
        customerName,
        dateStr,
        paymentMethodLabel
      );
    },
    [printKitchenAndClientCombined]
  );

  return {
    preferences,
    savePreferences,
    getClientPrinter,
    selectClientPrinter,
    printClientTicket,
    printCashCutTicket,
    printKitchenOrder,
    printKitchenAndClientCombined,
    printBoth,
    isPrinting,
    queueLength: printQueue.length,
>>>>>>> origen/main
  };
}
