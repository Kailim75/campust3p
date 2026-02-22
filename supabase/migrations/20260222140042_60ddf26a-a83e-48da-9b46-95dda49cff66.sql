
-- Allow staff to also insert/update/delete financial data
CREATE POLICY "Staff peuvent gérer financial_months"
  ON public.financial_months FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff peuvent gérer financial_costs"
  ON public.financial_costs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff peuvent gérer financial_cash_manual"
  ON public.financial_cash_manual FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'staff'));
