
-- Cash register sessions (corte de caja)
CREATE TABLE public.cash_register_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  opening_amount NUMERIC NOT NULL DEFAULT 0,
  closing_amount NUMERIC,
  expected_amount NUMERIC,
  difference NUMERIC,
  opening_denominations JSONB,
  closing_denominations JSONB,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cash_register_sessions ENABLE ROW LEVEL SECURITY;

-- Policies (public POS, no auth required)
CREATE POLICY "Cash register sessions are publicly readable"
  ON public.cash_register_sessions FOR SELECT USING (true);

CREATE POLICY "Cash register sessions can be inserted"
  ON public.cash_register_sessions FOR INSERT WITH CHECK (true);

CREATE POLICY "Cash register sessions can be updated"
  ON public.cash_register_sessions FOR UPDATE USING (true);
