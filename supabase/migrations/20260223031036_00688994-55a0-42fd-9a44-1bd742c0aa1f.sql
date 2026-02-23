
-- 1. Add visible_eleve to creneaux_conduite
ALTER TABLE public.creneaux_conduite 
ADD COLUMN IF NOT EXISTS visible_eleve boolean DEFAULT false;

-- 2. Create tokens_reservation table
CREATE TABLE public.tokens_reservation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  actif boolean DEFAULT true,
  date_expiration timestamptz DEFAULT now() + INTERVAL '90 days',
  nb_utilisations int DEFAULT 0,
  derniere_utilisation timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.tokens_reservation ENABLE ROW LEVEL SECURITY;

-- Admin + staff: full CRUD
CREATE POLICY "Admin staff full access tokens_reservation"
  ON public.tokens_reservation FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Anon: validate token only (SELECT on specific token)
CREATE POLICY "Anon validate token"
  ON public.tokens_reservation FOR SELECT
  TO anon
  USING (true);

-- 3. Create RPC function for public token validation (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.validate_reservation_token(p_token text)
RETURNS TABLE(
  apprenant_id uuid,
  apprenant_prenom text,
  apprenant_nom text,
  apprenant_formation text,
  token_actif boolean,
  token_expire boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.apprenant_id,
    c.prenom AS apprenant_prenom,
    c.nom AS apprenant_nom,
    c.formation::text AS apprenant_formation,
    t.actif AS token_actif,
    (t.date_expiration < now()) AS token_expire
  FROM public.tokens_reservation t
  JOIN public.contacts c ON c.id = t.apprenant_id
  WHERE t.token = p_token;
END;
$$;

-- 4. RPC to increment token usage
CREATE OR REPLACE FUNCTION public.use_reservation_token(p_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tokens_reservation
  SET nb_utilisations = nb_utilisations + 1,
      derniere_utilisation = now()
  WHERE token = p_token AND actif = true AND date_expiration > now();
  RETURN FOUND;
END;
$$;

-- 5. RPC for public reservation creation (anon user via token)
CREATE OR REPLACE FUNCTION public.reserver_creneau_public(
  p_token text,
  p_creneau_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token RECORD;
  v_creneau RECORD;
  v_existing RECORD;
BEGIN
  -- Validate token
  SELECT * INTO v_token FROM tokens_reservation
  WHERE token = p_token AND actif = true AND date_expiration > now();
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token invalide ou expiré');
  END IF;

  -- Check creneau
  SELECT * INTO v_creneau FROM creneaux_conduite
  WHERE id = p_creneau_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Créneau introuvable');
  END IF;
  IF v_creneau.statut != 'disponible' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce créneau n''est plus disponible');
  END IF;
  IF v_creneau.visible_eleve IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce créneau n''est pas ouvert à la réservation');
  END IF;
  IF v_creneau.type_seance = 'accompagnement_examen' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce type de séance ne peut pas être réservé en ligne');
  END IF;

  -- Check no existing confirmed reservation for same creneau + student
  SELECT * INTO v_existing FROM reservations_conduite
  WHERE apprenant_id = v_token.apprenant_id AND creneau_id = p_creneau_id AND statut = 'confirmee';
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vous avez déjà réservé ce créneau');
  END IF;

  -- Create reservation
  INSERT INTO reservations_conduite (creneau_id, apprenant_id, statut)
  VALUES (p_creneau_id, v_token.apprenant_id, 'confirmee');

  -- For individual sessions, mark slot as reserved
  IF v_creneau.type_seance != 'conduite_preventive' THEN
    UPDATE creneaux_conduite SET statut = 'reserve', contact_id = v_token.apprenant_id, reserve_at = now()
    WHERE id = p_creneau_id AND statut = 'disponible';
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 6. RPC for public cancellation (anon via token)
CREATE OR REPLACE FUNCTION public.annuler_reservation_public(
  p_token text,
  p_reservation_id uuid,
  p_motif text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token RECORD;
  v_resa RECORD;
BEGIN
  -- Validate token
  SELECT * INTO v_token FROM tokens_reservation
  WHERE token = p_token AND actif = true AND date_expiration > now();
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token invalide ou expiré');
  END IF;

  -- Get reservation
  SELECT * INTO v_resa FROM reservations_conduite
  WHERE id = p_reservation_id AND apprenant_id = v_token.apprenant_id AND statut = 'confirmee';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Réservation introuvable');
  END IF;

  -- Cancel reservation
  UPDATE reservations_conduite
  SET statut = 'annulee_eleve', motif_annulation = p_motif
  WHERE id = p_reservation_id;

  -- Free the slot
  UPDATE creneaux_conduite
  SET statut = 'disponible', contact_id = NULL, reserve_at = NULL
  WHERE id = v_resa.creneau_id AND statut = 'reserve';

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 7. Anon SELECT policy on creneaux_conduite (visible slots)
CREATE POLICY "Anon view available creneaux"
  ON public.creneaux_conduite FOR SELECT
  TO anon
  USING (
    visible_eleve = true
    AND statut = 'disponible'
    AND type_seance != 'accompagnement_examen'
  );

-- 8. Anon SELECT on reservations_conduite - via RPC only (no direct)
-- (reservations are accessed via RPC functions, no direct anon policy needed)

-- 9. Anon SELECT on ressources_conduite (visible_eleve = true)
CREATE POLICY "Anon view visible ressources"
  ON public.ressources_conduite FOR SELECT
  TO anon
  USING (visible_eleve = true);

-- 10. Anon SELECT on progression_conduite (via RPC only, no direct policy needed)
