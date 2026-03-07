import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bluetooth, Trash2, Plus } from "lucide-react";
import { useBluetootPrinter } from "@/hooks/useBluetootPrinter";
import { useMemo } from "react";

export function PrinterConfig() {
  const [open, setOpen] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const {
    preferences,
    savePreferences,
    getClientPrinter,
    selectClientPrinter,
  } = useBluetootPrinter();

  const selectedPrinter = getClientPrinter();
  const availablePrinters = useMemo(
    () => Object.values(preferences.printers || {}),
    [preferences.printers]
  );

  const handleToggleAutoPrint = () => {
    savePreferences({
      ...preferences,
      autoPrint: !preferences.autoPrint,
    });
  };

  const handleLinkPrinter = async () => {
    setIsLinking(true);
    try {
      await selectClientPrinter();
    } catch {
      // user cancelled
    } finally {
      setIsLinking(false);
    }
  };

  const handleRemovePrinter = (printerId: string) => {
    const newPrinters = { ...preferences.printers };
    delete newPrinters[printerId];
    const newClientPrinterId =
      preferences.clientPrinterId === printerId
        ? Object.keys(newPrinters)[0] || undefined
        : preferences.clientPrinterId;
    savePreferences({
      ...preferences,
      printers: newPrinters,
      clientPrinterId: newClientPrinterId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Bluetooth className="h-4 w-4" />
          Impresoras
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar Impresoras</DialogTitle>
          <DialogDescription>
            Configura tus impresoras Bluetooth y opciones de impresión
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Impresora activa</h3>
                <p className="text-sm text-muted-foreground">Para tickets y comandas</p>
              </div>
              {selectedPrinter && (
                <div className="text-xs rounded-full bg-green-100 px-2 py-1 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  ✓ {selectedPrinter.name}
                </div>
              )}
            </div>

            <div className="space-y-2">
              {availablePrinters.map((printer) => (
                <div key={printer.id} className="flex items-center justify-between rounded border p-2 text-sm">
                  <span className={printer.id === preferences.clientPrinterId ? "font-semibold text-foreground" : "text-muted-foreground"}>
                    {printer.name}
                  </span>
                  <div className="flex gap-1">
                    {printer.id !== preferences.clientPrinterId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => savePreferences({ ...preferences, clientPrinterId: printer.id })}
                      >
                        Usar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePrinter(printer.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={handleLinkPrinter}
                disabled={isLinking}
              >
                <Plus className="h-4 w-4" />
                {isLinking ? "Buscando..." : "Vincular Impresora"}
              </Button>
            </div>
          </div>

          {/* Opciones */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-print" className="font-medium text-foreground">
                Impresión automática
              </Label>
              <Switch
                id="auto-print"
                checked={preferences.autoPrint}
                onCheckedChange={handleToggleAutoPrint}
              />
            </div>

            {preferences.autoPrint && (
              <p className="text-xs text-muted-foreground">
                Se imprimirán ambos tickets automáticamente al confirmar el pago
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
