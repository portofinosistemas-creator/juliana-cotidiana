import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  generateClientTicketBytes,
  generateKitchenOrderBytes,
  printToDevice,
} from "@/lib/printer-formats";
import type { CartItem } from "@/types/pos";

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

const STORAGE_KEY = "printerPreferences";

export function useBluetootPrinter() {
  const [preferences, setPreferences] = useState<PrinterPreferences>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (
      stored && {
        ...JSON.parse(stored),
        autoPrint: true,
      }
    ) || {
      autoPrint: true,
    };
  });

  const [isPrinting, setIsPrinting] = useState(false);
  const [printQueue, setPrintQueue] = useState<Array<() => Promise<void>>>([]);

  const savePreferences = useCallback((prefs: PrinterPreferences) => {
    setPreferences(prefs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, []);

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

  useEffect(() => {
    let isMounted = true;
    const processPrintQueue = async () => {
      if (printQueue.length === 0 || isPrinting) return;
      setIsPrinting(true);
      const job = printQueue[0];
      try { await job(); } catch (error) { console.error("Error en trabajo de impresion:", error); }
      finally { if (isMounted) { setPrintQueue((prev) => prev.slice(1)); setIsPrinting(false); } }
    };
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
  );

  const printKitchenOrder = useCallback(
    async (items: CartItem[], orderNumber: number | null, customerName: string, dateStr: string) => {
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
  };
}
