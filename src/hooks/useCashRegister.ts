import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Denomination {
  label: string;
  value: number;
  count: number;
}

export const MXN_DENOMINATIONS: Omit<Denomination, "count">[] = [
  { label: "$1,000", value: 1000 },
  { label: "$500", value: 500 },
  { label: "$200", value: 200 },
  { label: "$100", value: 100 },
  { label: "$50", value: 50 },
  { label: "$20", value: 20 },
  { label: "$10", value: 10 },
  { label: "$5", value: 5 },
  { label: "$2", value: 2 },
  { label: "$1", value: 1 },
  { label: "$0.50", value: 0.5 },
];

export interface CashRegisterSession {
  id: string;
  opened_at: string;
  closed_at: string | null;
  opening_amount: number;
  closing_amount: number | null;
  expected_amount: number | null;
  difference: number | null;
  opening_denominations: Denomination[] | null;
  closing_denominations: Denomination[] | null;
  notes: string | null;
  status: "open" | "closed";
  created_at: string;
}

export function useCashRegister() {
  const queryClient = useQueryClient();

  // Get current open session
  const {
    data: activeSession,
    isLoading,
  } = useQuery({
    queryKey: ["cash-register-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_register_sessions")
        .select("*")
        .eq("status", "open")
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as CashRegisterSession | null;
    },
  });

  // Get session history
  const { data: history } = useQuery({
    queryKey: ["cash-register-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_register_sessions")
        .select("*")
        .order("opened_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as unknown as CashRegisterSession[];
    },
  });

  // Calculate expected amount (opening + sales since opening)
  const calcExpected = async (session: CashRegisterSession): Promise<number> => {
    const { data, error } = await supabase
      .from("orders")
      .select("total")
      .eq("status", "pagado")
      .gte("created_at", session.opened_at);
    if (error) throw error;
    const salesTotal = (data || []).reduce((sum, o) => sum + Number(o.total), 0);
    return Number(session.opening_amount) + salesTotal;
  };

  // Open register
  const openRegister = useMutation({
    mutationFn: async ({
      amount,
      denominations,
    }: {
      amount: number;
      denominations: Denomination[];
    }) => {
      const { data, error } = await supabase
        .from("cash_register_sessions")
        .insert([{
          opening_amount: amount,
          opening_denominations: JSON.parse(JSON.stringify(denominations)),
          status: "open",
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-register-active"] });
      queryClient.invalidateQueries({ queryKey: ["cash-register-history"] });
    },
  });

  // Close register
  const closeRegister = useMutation({
    mutationFn: async ({
      sessionId,
      closingAmount,
      denominations,
      expectedAmount,
      notes,
    }: {
      sessionId: string;
      closingAmount: number;
      denominations: Denomination[];
      expectedAmount: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("cash_register_sessions")
        .update({
          closing_amount: closingAmount,
          closing_denominations: JSON.parse(JSON.stringify(denominations)),
          expected_amount: expectedAmount,
          difference: closingAmount - expectedAmount,
          closed_at: new Date().toISOString(),
          status: "closed",
          notes: notes || null,
        })
        .eq("id", sessionId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-register-active"] });
      queryClient.invalidateQueries({ queryKey: ["cash-register-history"] });
    },
  });

  return {
    activeSession,
    isLoading,
    history: history || [],
    openRegister,
    closeRegister,
    calcExpected,
    isOpen: !!activeSession,
  };
}
