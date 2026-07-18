
ALTER POLICY staff_delete_links ON public.crm_email_links TO authenticated;
ALTER POLICY produit_tarifs_modify ON public.produit_tarifs TO authenticated;
ALTER POLICY produits_services_insert ON public.produits_services TO authenticated;
ALTER POLICY produits_services_update ON public.produits_services TO authenticated;
ALTER POLICY produits_services_delete ON public.produits_services TO authenticated;
ALTER POLICY produit_categories_insert ON public.produit_categories TO authenticated;
ALTER POLICY produit_categories_update ON public.produit_categories TO authenticated;
ALTER POLICY produit_categories_delete ON public.produit_categories TO authenticated;
