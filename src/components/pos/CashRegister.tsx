import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  MXN_DENOMINATIONS,
  type Denomination,
  type CashRegisterSession,
  useCashRegister,
} from "@/hooks/useCashRegister";
import { DollarSign, Lock, Unlock, History, ChevronDown, ChevronUp } from "lucide-react";

// ── Denomination counter ────────────────────────────────────────────
function DenominationCounter({
  denominations,
  onChange,
}: {
  denominations: Denomination[];
  onChange: (d: Denomination[]) => void;
}) {
  const updateCount = (index: number, count: number) => {
    const updated = [...denominations];
    updated[index] = { ...updated[index], count: Math.max(0, count) };
    onChange(updated);
  };

  const total = denominations.reduce((s, d) => s + d.value * d.count, 0);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-1 text-xs font-medium text-muted-foreground px-1">
        <span>Denominación</span>
        <span className="text-center">Cantidad</span>
        <span className="text-right">Subtotal</span>
      </div>
      <div className="max-h-[40vh] overflow-y-auto space-y-1">
        {denominations.map((d, i) => (
          <div
            key={d.value}
            className="grid grid-cols-3 items-center gap-1 rounded-md bg-muted/50 px-2 py-1.5"
          >
            <span className="text-sm font-medium text-foreground">{d.label}</span>
            <Input
              type="number"
              min={0}
              value={d.count || ""}
              onChange={(e) => updateCount(i, parseInt(e.target.value) || 0)}
              className="h-8 text-center text-sm"
            />
            <span className="text-right text-sm font-medium text-foreground">
              ${(d.value * d.count).toLocaleString("es-MX")}
            </span>
          </div>
        ))}
      </div>
      <div className="flex justify-between rounded-lg bg-primary/10 px-3 py-2 text-sm font-bold">
        <span className="text-foreground">Total contado</span>
        <span className="text-primary">${total.toLocaleString("es-MX")}</span>
      </div>
    </div>
  );
}

// ── Open register modal ─────────────────────────────────────────────
export function OpenRegisterModal({
  open,
  onClose,
  onOpen,
}: {
  open: boolean;
  onClose: () => void;
  onOpen: (amount: number, denominations: Denomination[]) => void;
}) {
  const [denominations, setDenominations] = useState<Denomination[]>(
    MXN_DENOMINATIONS.map((d) => ({ ...d, count: 0 })),
  );

  const total = denominations.reduce((s, d) => s + d.value * d.count, 0);

  const handleOpen = () => {
    if (total <= 0) {
      toast.error("Debes contar al menos alguna denominación");
      return;
    }
    onOpen(total, denominations);
    setDenominations(MXN_DENOMINATIONS.map((d) => ({ ...d, count: 0 })));
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Unlock className="h-5 w-5 text-green-600" />
            Apertura de Caja
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Cuenta el efectivo inicial en la caja registradora.
        </p>

        <DenominationCounter denominations={denominations} onChange={setDenominations} />

        <Button onClick={handleOpen} className="w-full gap-2">
          <Unlock className="h-4 w-4" />
          Abrir Caja con ${total.toLocaleString("es-MX")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ── Close register modal ────────────────────────────────────────────
export function CloseRegisterModal({
  open,
  onClose,
  session,
  expectedAmount,
  onCloseRegister,
}: {
  open: boolean;
  onClose: () => void;
  session: CashRegisterSession;
  expectedAmount: number;
  onCloseRegister: (closingAmount: number, denominations: Denomination[], notes: string) => void;
}) {
  const [denominations, setDenominations] = useState<Denomination[]>(
    MXN_DENOMINATIONS.map((d) => ({ ...d, count: 0 })),
  );
  const [notes, setNotes] = useState("");

  const closingTotal = denominations.reduce((s, d) => s + d.value * d.count, 0);
  const difference = closingTotal - expectedAmount;

  const handleClose = () => {
    onCloseRegister(closingTotal, denominations, notes);
    setDenominations(MXN_DENOMINATIONS.map((d) => ({ ...d, count: 0 })));
    setNotes("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Lock className="h-5 w-5 text-red-600" />
            Cierre de Caja (Corte)
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-lg bg-muted p-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fondo inicial</span>
            <span className="font-medium text-foreground">
              ${Number(session.opening_amount).toLocaleString("es-MX")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ventas del turno</span>
            <span className="font-medium text-foreground">
              ${(expectedAmount - Number(session.opening_amount)).toLocaleString("es-MX")}
            </span>
          </div>
          <div className="flex justify-between border-t pt-1 font-bold">
            <span className="text-foreground">Esperado en caja</span>
            <span className="text-primary">${expectedAmount.toLocaleString("es-MX")}</span>
          </div>
        </div>

        <DenominationCounter denominations={denominations} onChange={setDenominations} />

        {closingTotal > 0 && (
          <div
            className={`rounded-lg p-3 text-center text-sm font-bold ${
              difference === 0
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                : difference > 0
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                  : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
            }`}
          >
            {difference === 0
              ? "Cuadre perfecto"
              : difference > 0
                ? `Sobrante: +$${difference.toLocaleString("es-MX")}`
                : `Faltante: -$${Math.abs(difference).toLocaleString("es-MX")}`}
          </div>
        )}

        <Textarea
          placeholder="Notas del corte (opcional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />

        <Button onClick={handleClose} variant="destructive" className="w-full gap-2">
          <Lock className="h-4 w-4" />
          Cerrar Caja
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ── Cash register status bar ────────────────────────────────────────
export function CashRegisterBar() {
  const { activeSession, isLoading, isOpen, openRegister, closeRegister, calcExpected, history } =
    useCashRegister();

  const [showOpen, setShowOpen] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [expectedAmount, setExpectedAmount] = useState(0);

  const handleOpenRegister = (amount: number, denominations: Denomination[]) => {
    openRegister.mutate(
      { amount, denominations },
      { onSuccess: () => toast.success("Caja abierta correctamente") },
    );
  };

  const handlePrepareClose = async () => {
    if (!activeSession) return;
    try {
      const expected = await calcExpected(activeSession);
      setExpectedAmount(expected);
      setShowClose(true);
    } catch {
      toast.error("Error al calcular el esperado");
    }
  };

  const handleCloseRegister = (
    closingAmount: number,
    denominations: Denomination[],
    notes: string,
  ) => {
    if (!activeSession) return;
    closeRegister.mutate(
      {
        sessionId: activeSession.id,
        closingAmount,
        denominations,
        expectedAmount,
        notes,
      },
      { onSuccess: () => toast.success("Caja cerrada correctamente") },
    );
  };

  if (isLoading) return null;

  return (
    <>
      <div className="flex items-center gap-2">
        {isOpen ? (
          <>
            <div className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Caja abierta
            </div>
            <Button variant="outline" size="sm" onClick={handlePrepareClose} className="gap-1 text-xs">
              <Lock className="h-3.5 w-3.5" /> Cerrar
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              Caja cerrada
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowOpen(true)} className="gap-1 text-xs">
              <Unlock className="h-3.5 w-3.5" /> Abrir
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowHistory(!showHistory)}
          className="gap-1 text-xs"
        >
          <History className="h-3.5 w-3.5" />
        </Button>
      </div>

      <OpenRegisterModal open={showOpen} onClose={() => setShowOpen(false)} onOpen={handleOpenRegister} />

      {activeSession && (
        <CloseRegisterModal
          open={showClose}
          onClose={() => setShowClose(false)}
          session={activeSession}
          expectedAmount={expectedAmount}
          onCloseRegister={handleCloseRegister}
        />
      )}

      {/* History dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <History className="h-5 w-5" /> Historial de Cortes
            </DialogTitle>
          </DialogHeader>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin registros</p>
          ) : (
            <div className="space-y-3">
              {history.map((s) => (
                <HistoryItem key={s.id} session={s} />
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function HistoryItem({ session: s }: { session: CashRegisterSession }) {
  const [expanded, setExpanded] = useState(false);
  const openDate = new Date(s.opened_at).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
  const closeDate = s.closed_at
    ? new Date(s.closed_at).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })
    : null;

  return (
    <div className="rounded-lg border bg-card p-3 text-sm">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div>
          <div className="font-medium text-foreground">{openDate}</div>
          <div className="text-xs text-muted-foreground">
            {s.status === "open" ? "En curso" : `Cerrada: ${closeDate}`}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {s.status === "closed" && s.difference !== null && (
            <span
              className={`text-xs font-bold ${
                s.difference === 0
                  ? "text-green-600"
                  : Number(s.difference) > 0
                    ? "text-blue-600"
                    : "text-red-600"
              }`}
            >
              {s.difference === 0
                ? "Cuadre"
                : Number(s.difference) > 0
                  ? `+$${Number(s.difference).toLocaleString("es-MX")}`
                  : `-$${Math.abs(Number(s.difference)).toLocaleString("es-MX")}`}
            </span>
          )}
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {expanded && (
        <div className="mt-2 space-y-1 border-t pt-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fondo inicial</span>
            <span className="text-foreground">${Number(s.opening_amount).toLocaleString("es-MX")}</span>
          </div>
          {s.closing_amount !== null && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Contado al cierre</span>
              <span className="text-foreground">${Number(s.closing_amount).toLocaleString("es-MX")}</span>
            </div>
          )}
          {s.expected_amount !== null && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Esperado</span>
              <span className="text-foreground">${Number(s.expected_amount).toLocaleString("es-MX")}</span>
            </div>
          )}
          {s.notes && (
            <div className="mt-1 rounded bg-muted p-2 text-muted-foreground">{s.notes}</div>
          )}
        </div>
      )}
    </div>
  );
}
