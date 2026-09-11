-- ════════════════════════════════════════════════════════════════════════════
-- Migration 2 — Garde et immuabilité des factures émises
--               (phase 1 du chantier des avoirs) — VERSION 2
-- ════════════════════════════════════════════════════════════════════════════
--
-- ATTENTION : à appliquer par l'agent Lovable uniquement, APRÈS la publication
-- du volet front (lignes écrites avant le statut sur un brouillon, { statut }
-- seul hors brouillon, PDF lisant buyer_*), et AVANT la migration 1.
--
-- Rejouable : CREATE OR REPLACE, interrupteurs créés seulement s'ils n'existent
-- pas, rattrapage sans effet quand il n'y a plus rien à rattraper. Le moteur de
-- l'agent (transaction unique ou instruction par instruction) n'est pas connu :
-- l'ordre du fichier est choisi pour qu'aucun point d'arrêt ne laisse de données
-- à moitié écrites, et pour qu'aucun ne fasse échouer un appel existant AVANT la
-- section 6. Ce n'est pas « chaque point d'arrêt laisse la base comme avant » :
-- voir la liste « Ordre du fichier et POINTS D'ARRÊT », qui dit exactement ce
-- qui reste.
-- REMPLACEMENT DES DÉCLENCHEURS : chaque « DROP TRIGGER puis CREATE TRIGGER »
-- est enfermé dans UN bloc DO (donc UNE instruction, donc atomique même sans
-- transaction). Écrits en deux instructions, un arrêt entre les deux retirait
-- une protection RÉELLEMENT EN PLACE lors d'un rejeu, sans aucun signal :
-- mesuré, l'arrêt après le DROP de trg_garde_facture_emise rendait la
-- SUPPRESSION PHYSIQUE d'une facture émise de nouveau possible. Aucun couple
-- DROP/CREATE ne doit être ressorti d'un bloc DO.
-- CONDUITE À TENIR APRÈS UN ARRÊT : ne rien annuler à la main, lire le message,
-- lever l'obstacle, puis REJOUER LE FICHIER ENTIER.
--
-- ── Décisions appliquées (directeur, 11/09/2026) ───────────────────────────
--  D1  Personne ne supprime une facture émise : AUCUNE exemption, ni
--      service_role, ni super_admin (ni suppression, ni corbeille, ni TRUNCATE).
--  D2  Une facture émise est immuable dès l'émission (montants, lignes, client,
--      dates, numéro, coordonnées de l'acheteur). Seule exception : la fusion de
--      contacts (merge_contacts) change le RATTACHEMENT CRM (contact_id).
--  D6  L'annulation manuelle d'une facture émise reste permise ET TRACÉE
--      jusqu'à la livraison des avoirs, puis interdite. Interrupteur :
--      public.factures_annulation_manuelle_permise() ; la migration qui livre
--      l'avoir le passera à false (et rejouer celle-ci ne le rouvre pas).
--
-- ── Révisions de la version 2 ───────────────────────────────────────────────
--  R1  Toutes les vérifications préalables (merge_contacts, déclencheur de
--      snapshot, colonnes, déclencheurs, faisabilité du rattrapage) sont EN TÊTE,
--      dans un bloc sans DDL : si la production diffère, rien n'est appliqué,
--      quel que soit le moteur.
--  R2  L'interrupteur n'est créé que s'il n'existe pas.
--  R3  TRUNCATE refusé sur factures et facture_lignes (déclencheur BEFORE
--      TRUNCATE) et privilège TRUNCATE retiré à anon, authenticated, service_role.
--  R4  Fenêtre de première saisie des lignes : created_at est posé par le
--      serveur à l'INSERT (now()) et ne se modifie plus, brouillon compris.
--      Vérifié le 11/09/2026 : aucun chemin du front, des edge functions ni des
--      migrations n'écrit factures.created_at (seul api-v1 POST transmet un
--      corps libre, c'est le contournement que ceci ferme).
--      À L'INSERT, UN created_at ENVOYÉ EST REFUSÉ, PAS ÉCRASÉ : écraser en
--      silence ferait perdre la date d'origine d'un import historique par
--      api-v1 POST sans que personne ne le voie (useFacturesPaginated trie par
--      created_at : tout l'import s'empilerait au jour de l'import). Le message
--      nomme la colonne. Tolérance d'une seconde : la valeur par défaut de la
--      colonne est now(), donc un corps qui ne transmet rien passe.
--      À L'UPDATE, created_at est protégé par son SEUL déclencheur dédié : il
--      est SORTI des colonnes figées de la garde (section 7), sinon c'est le
--      message générique — « passez la facture au statut Annulée » — qui
--      sortait, conseil destructeur pour un intégrateur qui n'a rien modifié.
--      Comparaison à la MILLISECONDE : now() a la résolution de la microseconde
--      et tout client JSON/JavaScript relit puis renvoie l'horodatage arrondi à
--      la milliseconde ; sans cette tolérance, un lire-modifier-écrire api-v1
--      était refusé sans qu'aucune donnée n'ait changé.
--      Le brouillon est protégé lui aussi, sinon un brouillon « rajeuni » puis
--      émis sans ligne rouvrirait la fenêtre à volonté.
--  R5  Les gardes de lignes lisent la facture avec FOR SHARE : une émission
--      concurrente attend la fin de l'écriture des lignes (ou l'inverse).
--  R6  Transmission électronique et Factur-X : figés SEULEMENT à partir d'une
--      TRANSMISSION RÉELLE, jamais avant. Définition, et pourquoi :
--       • submit-pdp NE TRANSMET RIEN aujourd'hui (« TODO : appel HTTP réel »,
--         réponse { simulated: true }) : elle écrit pourtant sur la facture
--         e_invoice_status = 'envoye', platform_provider et une référence
--         'LOCAL-<horodatage>'. Ce chemin est atteignable EN DEUX CLICS (choisir
--         une PDP dans Réglages › E-invoicing, puis « Transmettre ») : ce n'est
--         PAS un cas d'école. Figer sur cette marque rendrait un faux accusé
--         définitif et incorrigible par quiconque.
--       • Transmission réelle = e_invoice_status renseigné, différent de
--         'non_applicable' / 'not_required', ET référence de transmission qui
--         n'est pas simulée (platform_reference_id NOT LIKE 'LOCAL-%').
--       • DETTE DATÉE, ET BORNÉE PAR UN INTERRUPTEUR : la forme 'LOCAL-%' est
--         une soupape, et quiconque peut écrire platform_reference_id peut y
--         mettre 'LOCAL-camouflage' AVANT toute transmission réelle pour garder
--         le bloc réécrivable à vie. Cette tolérance est donc conditionnée à
--         public.factures_transmission_simulee_toleree() (créée à true, comme
--         l'interrupteur d'annulation, et jamais rouverte par un rejeu). Le lot
--         « vraie PDP » la passe à false DANS LA MÊME MIGRATION où il remplace
--         la simulation de submit-pdp et remet les marques 'LOCAL-%' à zéro ;
--         à partir de là, une référence 'LOCAL-…' fige comme une autre.
--       • Tant que la transmission n'est pas réelle : e_invoice_status,
--         platform_* et facturx_xml restent corrigeables (le XML n'est qu'un
--         brouillon technique dérivé de données déjà figées ; generate-facturx
--         lit d'ailleurs la table `centres`, qui peut être incomplète — SONDE À
--         PASSER : SELECT id, nom, nom_commercial, siret, settings FROM
--         public.centres WHERE id = '<centre_id>').
--       • Dès qu'une transmission réelle est enregistrée : les cinq colonnes de
--         transmission ET facturx_xml sont figées, quel que soit le statut
--         d'accusé (le figeage ne dépend plus du seul mot 'envoye', qu'il
--         suffisait d'éviter pour tout réécrire indéfiniment).
--      CONSÉQUENCE POUR LE LOT « VRAIE PDP », DÈS LE PREMIER ACCUSÉ RÉEL : un
--      accusé de la plateforme (envoye → accepte/rejete), la mise à jour de
--      platform_last_sync_at ET toute régénération de facturx_xml seront
--      refusées par un simple UPDATE — l'écran PdpTransmissionPanel resterait
--      figé sur « envoye » et generate-facturx échouerait par un toast. Le
--      message de refus le dit maintenant explicitement. Ce lot doit donc
--      livrer, DANS LA MÊME MIGRATION que l'appel HTTP réel : (1) la fonction
--      SECURITY DEFINER qui pose l'accusé, (2) la remise à zéro des marques
--      'LOCAL-%' existantes (la section 0i les compte et les signale), (3) le
--      passage de factures_transmission_simulee_toleree() à false. À défaut, la
--      transmission réelle sera bloquée dès le premier accusé. À inscrire dans
--      docs/audit/ROADMAP.md (hors périmètre de cette migration, dépôt en
--      lecture seule pour ce lot).
--  R7  Coordonnées de l'acheteur figées pour TOUTES les factures émises :
--      (a) rattrapage, AVANT la garde, des factures non brouillon sans
--          buyer_name_snapshot, depuis la fiche contact ou entreprise du moment,
--          avec la logique de snapshot_facture_on_emission. UN NOM VIDE N'EST
--          PAS UN NOM : contacts.nom et contacts.prenom sont NOT NULL mais
--          peuvent valoir '' ; la section 0 refuse alors d'appliquer la
--          migration (au lieu de figer '' définitivement, que R9 rendrait
--          ensuite incorrigible), et « sans coordonnées figées » se lit partout
--          NULLIF(btrim(buyer_name_snapshot), '') IS NULL ; nombre journalisé
--          (RAISE NOTICE + une ligne audit_logs de synthèse par centre, sans
--          donnée personnelle : identifiants de factures et compteurs) ;
--      (b) figeage à l'INSERT de toute facture hors brouillon et à tout passage
--          brouillon → non brouillon (payee et partiel compris) ;
--      (c) hors fusion, la garde refuse NULL → valeur sur ces colonnes, et le
--          déclencheur de snapshot ne les complète plus après l'émission.
--      Colonnes d'identité, HUIT depuis la version 3 : buyer_type,
--      buyer_name_snapshot, buyer_siren, buyer_siret, buyer_tva_intracom,
--      buyer_email_facturation, buyer_country, buyer_address_snapshot.
--      buyer_siren EST AJOUTÉ : il figure dans les colonnes figées, mais aucune
--      écriture ne le posait — les factures d'entreprise seraient parties en
--      Factur-X sans le bloc <ram:SpecifiedLegalOrganization> de l'acheteur,
--      définitivement (generate-facturx ne l'émet que si buyer_siren existe, et
--      BuyerSnapshotEditDialog était le seul moyen de le saisir). Il se dérive
--      de la fiche entreprise comme le faisait la migration 20260519123424 :
--      les NEUF PREMIERS CHIFFRES de partners.siret une fois les espaces
--      retirés, et NULL si le SIRET n'a pas exactement 14 chiffres. Le libérer
--      au lieu de le remplir aurait été pire (modifiable après émission,
--      contre D2).
--      MONTANTS DÉRIVÉS (montant_ht, montant_tva) : ils restent figés APRÈS
--      coup, mais deux chemins créent la facture DÉJÀ « emise » sans eux
--      (FactureLibreDialog, conversion d'un devis par useDevis) et les lignes
--      n'arrivent qu'à la requête suivante. Sans quoi suit, ces deux colonnes
--      resteraient NULL POUR TOUJOURS (M1 : INVOICE_HT 8 points et INVOICE_TVA
--      5 points, bloquants ; et generate-facturx produirait un Factur-X à
--      TaxBasisTotalAmount 0,00 face à un GrandTotalAmount non nul). Donc :
--      (d) le rattrapage de la section 5 les pose aussi, sur les factures non
--          brouillon qui ont AU MOINS UNE LIGNE dont la somme CONCORDE avec le
--          montant TTC (à 0,02 près), depuis la somme des lignes ;
--      (e) la garde accepte le passage NULL → valeur sur ces deux colonnes
--          QUAND la valeur proposée égale la somme des lignes de la facture à
--          0,02 près (même tolérance que la règle INVOICE_TOTAL_COHERENCE de
--          M1), QUE la facture a au moins une ligne, ET QUE la somme des lignes
--          concorde avec montant_total (à 0,02 près). Les lignes étant déjà
--          immuables, la valeur n'est pas falsifiable : c'est un calcul, pas une
--          saisie. Le déclencheur de snapshot les pose toujours lui aussi lors
--          d'un passage à « emise », MAIS SOUS LES MÊMES DEUX CONDITIONS que la
--          garde R7e : au moins une ligne (sans ligne il ne fige plus 0,00 —
--          bloquant A du 12/09) ET somme des lignes concordant avec montant_total
--          à 0,02 près (bloquant idempotence du 12/09 : sans ce second contrôle,
--          un aller-retour de statut emise → partiel → emise gravait la somme des
--          lignes d'une facture divergente 0k que le rattrapage et R7e laissent
--          NULL exprès — la garde tournant AVANT le snapshot, elle ne voyait
--          qu'un { statut } sans changement de montant).
--      Ce qui reste sans recours : une facture non brouillon SANS AUCUNE LIGNE
--      n'a pas de somme à laquelle se comparer, et une facture dont les lignes
--      NE CONCORDENT PAS avec le montant TTC (montant_total a bougé 18 fois en
--      90 jours) a une somme qu'on refuse de figer — ni le rattrapage, ni la
--      garde ne leur donneront de montant HT. Les sections 0j (sans ligne) et
--      0k (lignes ≠ TTC) les comptent et le disent avant d'appliquer.
--      La ligne de synthèse du rattrapage se lit dans audit_logs avec
--      table_name = 'factures', action = 'RATTRAPAGE_IDENTITE_ACHETEUR' et
--      record_id = l'identifiant du CENTRE (et non d'une facture) : elle porte
--      des compteurs (identité ET montants) et la liste des identifiants de
--      factures, rien d'autre.
--  R8  Annulation et réactivation manuelles (interrupteur à true) : seulement
--      par une personne connectée (auth.uid() non NULL) ayant le rôle admin,
--      staff ou super_admin, ET dont le rôle de connexion N'EST PAS
--      service_role. Les deux conditions sont écrites : aujourd'hui un jeton
--      service_role ne porte pas de « sub », donc le test auth.uid() suffisait —
--      mais il suffirait qu'une edge function construise un client avec la clé
--      de service TOUT EN propageant les claims d'un utilisateur pour qu'un
--      automate annule des factures au nom d'un administrateur. Le test de rôle
--      est la ceinture qui va avec ces bretelles. Refusées donc à service_role
--      (clé API api-v1, workflows), à un appel serveur sans utilisateur et à un
--      formateur.
--      CONSÉQUENCE MESURÉE SUR LE DÉPÔT : execute-workflow écrit factures.statut
--      avec la clé service_role (auth.uid() NULL en base) et son action
--      update_status accepte la table factures. Un workflow « → annulee »
--      échouerait donc en SILENCE (updateStatusAction renvoie { success: false }
--      sans interrompre l'exécution). La section 0h REFUSE d'appliquer la
--      migration tant qu'un tel workflow existe, ET tant qu'un workflow remet
--      une facture en 'brouillon' (même silence) ; elle SIGNALE en outre tout
--      workflow actif qui écrit factures.statut, quelle que soit la valeur :
--      celui-là tombera en panne muette le jour où la facture visée est
--      annulée (la garde traite alors le changement comme une réactivation et
--      exige une personne connectée). Le vrai correctif — updateStatusAction
--      qui interrompt l'exécution au lieu de la poursuivre — est côté
--      execute-workflow, hors périmètre de cette migration.
--  R9  Colonnes texte figées comparées après NULLIF(btrim(x), '') : '' et NULL
--      sont la même valeur (commentaires notamment).
--  R10 date_echeance reste figée après émission (aucune modification par
--      l'équipe en 90 jours, et aucun écrivain de factures.date_echeance dans
--      le dépôt : front, edge functions et migrations ne font que la lire).
--      HYPOTHÈSE NON ENCORE MESURÉE : les 59 changements sans utilisateur des
--      90 derniers jours viendraient d'UNE intervention ponctuelle hors
--      application. SONDE À PASSER AVANT D'APPLIQUER (sondes-production.sql,
--      section R10) : si ces changements sont étalés sur plusieurs journées, un
--      écrivain vivant existe (cron, script, intégration) et il faut
--      l'identifier avant d'appliquer — sinon il échouera sans surveillance.
--  R11 merge_contacts : accès inchangé (admin ou staff). Le PDF d'une facture
--      émise lit désormais les coordonnées figées (volet front) : LA FUSION
--      CHANGE LE RATTACHEMENT CRM, PAS L'IDENTITÉ IMPRIMÉE. merge_contacts ne
--      complète plus que les factures émises sans aucune identité figée
--      (filet de sécurité, en pratique vide après R7a).
--      EXEMPTION NON FORGEABLE : la garde n'accorde l'exemption de fusion que
--      si DEUX conditions tiennent — le paramètre de session
--      campust3p.fusion_contacts désigne bien la paire concernée, ET la pile
--      d'appel PL/pgSQL (GET DIAGNOSTICS … PG_CONTEXT) contient réellement
--      merge_contacts(uuid,uuid). Poser le paramètre à la main dans une session
--      SQL ne suffit donc plus : la garde ne fait plus confiance à une valeur
--      de session sans lien prouvé avec un appel de la fonction.
--
-- ── Pourquoi des déclencheurs et pas une garde dans soft_delete_record ─────
--  • api-v1 met à la corbeille par UPDATE direct en service_role et son PATCH
--    accepte n'importe quelle colonne ; son POST insère un corps libre ;
--  • execute-workflow modifie statut en service_role ;
--  • la policy centre_delete_factures autorise un DELETE physique, et elle est
--    CONSERVÉE (la retirer changerait le refus en un silence à 0 ligne) ;
--  • assert_soft_delete_allowed laisse passer service_role et sert aussi à
--    restore_record.
--
-- ── Règle de la garde (OLD.statut <> 'brouillon') ──────────────────────────
--  DELETE                     refusé, toujours (cascade d'un contact comprise).
--  TRUNCATE                   refusé, toujours, brouillons compris.
--  deleted_at NULL → valeur   refusé. valeur → NULL (restauration) permis.
--  statut → brouillon         refusé.
--  statut → annulee,
--  annulee → autre statut     permis et tracé si interrupteur = true ET
--                             personne connectée admin/staff/super_admin.
--  emise/partiel/payee/impayee entre eux : libres (paiements, Alma).
--  colonnes figées            refusées si la valeur normalisée change
--                             (identité : NULL → valeur compris, sauf fusion).
--  montant_ht, montant_tva    figées, SAUF le passage NULL → valeur égale à la
--                             somme des lignes (déjà figées) à 0,02 près ET qui
--                             concorde avec montant_total à 0,02 près (R7e).
--  facturx_xml,
--  e_invoice_status,
--  platform_*                 libres tant qu'AUCUNE transmission réelle n'est
--                             enregistrée ; figés dès qu'il y en a une (R6).
--  colonnes libres            deleted_by/delete_reason (avec la restauration),
--                             session_inscription_id, compliance_*,
--                             e_reporting_status, facturx_generated_at,
--                             updated_at.
--  created_at                 posé par le serveur, refusé à l'INSERT s'il est
--                             envoyé, jamais modifié ensuite (tous statuts) —
--                             par son déclencheur dédié, PAS par la garde (R4).
--
-- ── Ordre des déclencheurs BEFORE UPDATE (ordre alphabétique des noms) ─────
--  trg_garde_facture_emise → trg_horodatage_creation_facture →
--  trg_immutable_centre_id_factures → trg_snapshot_facture_on_emission →
--  update_factures_updated_at.
--  La garde juge la demande de l'appelant. Après elle, le snapshot ne complète
--  plus que montant_ht / montant_tva (NULL → valeur). L'assertion finale
--  refuse la migration si un BEFORE UPDATE inconnu passe après la garde.
--
-- ── Ordre du fichier et POINTS D'ARRÊT (moteur non transactionnel) ─────────
--  0. vérifications préalables (lecture seule) ;
--  1-3. fonctions (deux interrupteurs, conseil, identité) ;
--  4. figeage à l'émission (snapshot v2 + déclencheur d'INSERT) ;
--  5. rattrapage des coordonnées acheteur ET des montants dérivés (un seul bloc
--     DO, donc atomique même sans transaction) ;
--  6. date de création posée par le serveur ;
--  7-10. gardes (factures, lignes, insertion de lignes, TRUNCATE) ;
--  11-12. policy de suppression (conservée), merge_contacts ;
--  13. assertions finales.
--  CE QUI RESTE APPLIQUÉ SI LE FICHIER S'ARRÊTE — la promesse n'est pas
--  « chaque point d'arrêt laisse la base comme avant » (ce serait faux), mais
--  « aucun point d'arrêt ne fait échouer un appel existant avant la section 6,
--  et aucun ne laisse de données à moitié écrites » :
--   • pendant 0          rien ;
--   • pendant 1-3        trois fonctions que rien n'appelle : sans effet ;
--   • après 4            snapshot v2 est en place SANS la garde. Deux écarts,
--                        tous deux sans refus : (a) une facture créée
--                        directement « emise » reçoit désormais son identité,
--                        son régime, sa mention d'exonération et sa date
--                        d'émission (la v1 ne le faisait qu'à l'UPDATE) ;
--                        (b) identité, régime, motif et date ne sont plus
--                        complétés lors d'un RETOUR à « emise » d'une facture
--                        déjà émise. Rien n'est refusé ;
--   • pendant 5          rien de plus (bloc DO atomique : un échec annule aussi
--                        la désactivation des trois déclencheurs) ;
--   • après 5            les coordonnées acheteur ET les montants dérivés sont
--                        posés sur les factures déjà émises. Toujours aucune
--                        garde : la base se comporte comme avant, en mieux
--                        renseignée ;
--   • après 6            created_at est posé par le serveur et ne se modifie
--                        plus : un POST api-v1 qui enverrait created_at est
--                        refusé (il l'était silencieusement écrasé auparavant),
--                        et un PATCH qui renverrait la LIGNE ENTIÈRE est refusé
--                        s'il change la date à la milliseconde près. C'EST LE
--                        PREMIER POINT D'ARRÊT QUI PEUT FAIRE ÉCHOUER UN APPEL
--                        EXISTANT ;
--   • après 7 et au-delà la garde est en place : la protection annoncée à Karim
--                        est acquise, les sections suivantes la complètent.
--                        CECI N'EST VRAI QUE PARCE QUE chaque remplacement de
--                        déclencheur tient dans UN bloc DO : écrit en
--                        « DROP TRIGGER ; CREATE TRIGGER », un arrêt entre les
--                        deux instructions d'un REJEU retirait la garde déjà en
--                        place et rendait la suppression d'une facture émise de
--                        nouveau possible, en silence ;
--  POURQUOI 4 AVANT 5 : le déclencheur d'INSERT de la section 4 ferme le seul
--  trou par lequel une facture pourrait naître « emise » sans identité entre le
--  rattrapage et la garde — trou qui ferait échouer l'assertion finale et
--  bloquerait le rejeu (« Rattrapage impossible : la garde existe déjà »).
--  POURQUOI 6 APRÈS 5 : la section 6 est la seule qui peut faire échouer un
--  appel existant ; elle passe donc après l'instruction la plus susceptible
--  d'échouer (le rattrapage, seule écriture de données du fichier).
--  DANS TOUS LES CAS : rien à annuler à la main, corriger l'obstacle signalé
--  par le message et REJOUER LE FICHIER ENTIER.
--
-- ── À NE JAMAIS FAIRE (voir le paragraphe CLAUDE.md fourni avec ce lot) ─────
--  ALTER TABLE public.factures DISABLE TRIGGER USER, ou
--  SET session_replication_role = replica, désactivent aussi cette garde.
--  Seule désactivation ciblée admise : le rattrapage de la section 5 (audit,
--  updated_at, synchronisation des inscriptions — JAMAIS la garde), dans un
--  bloc DO atomique, et seulement s'il reste des factures à rattraper.
--
-- ── Messages ────────────────────────────────────────────────────────────────
--  Français, SQLSTATE P0001 (RAISE par défaut) : messageErreur
--  (src/lib/erreurs.ts) ne traduit pas P0001 et rend tel quel un message
--  français ; api-v1 renvoie error.message. Ne PAS utiliser 23514 ni 42501.
-- ════════════════════════════════════════════════════════════════════════════


-- ── 0. Vérifications préalables (R1) : AUCUN DDL avant ce bloc ──────────────
DO $verifications$
DECLARE
  v_def text;
  v_manque text;
  v_n integer;
  v_n2 integer;
BEGIN
  -- 0a. merge_contacts : version connue du dépôt (20260721140000), ou version 2
  --     de cette migration (rejeu).
  IF to_regprocedure('public.merge_contacts(uuid,uuid)') IS NULL THEN
    RAISE EXCEPTION 'Vérification préalable : public.merge_contacts(uuid, uuid) est absente. Migration interrompue, rien n''a été appliqué.';
  END IF;
  v_def := pg_get_functiondef('public.merge_contacts(uuid,uuid)'::regprocedure);
  IF v_def NOT LIKE '%information_schema.table_constraints%'
     OR v_def NOT LIKE '%Fusionné dans%'
     OR v_def NOT LIKE '%SECURITY DEFINER%'
     OR v_def NOT LIKE '%has_role(auth.uid(), ''staff''::app_role)%' THEN
    RAISE EXCEPTION 'Vérification préalable : merge_contacts en base diffère de la version connue (20260721140000). Migration interrompue, rien n''a été appliqué : relire pg_get_functiondef avant de la remplacer.';
  END IF;

  -- 0b. snapshot_facture_on_emission : version 20260519164035 (mesurée en
  --     production le 11/09/2026), ou version 2 de cette migration (rejeu).
  IF to_regprocedure('public.snapshot_facture_on_emission()') IS NULL THEN
    RAISE EXCEPTION 'Vérification préalable : public.snapshot_facture_on_emission() est absente. Migration interrompue, rien n''a été appliqué.';
  END IF;
  SELECT p.prosrc INTO v_def FROM pg_proc p
  WHERE p.oid = 'public.snapshot_facture_on_emission()'::regprocedure;
  IF NOT (
       (v_def LIKE '%campust3p:snapshot_v2%')
    OR (v_def LIKE '%OLD.statut IS DISTINCT FROM ''emise''%'
        AND v_def LIKE '%v_partner.company_name%'
        AND v_def LIKE '%CONCAT_WS(%'
        AND v_def LIKE '%COALESCE(NEW.montant_ht, v_totals.total_ht)%'
        AND v_def NOT LIKE '%identite_acheteur%')
  ) THEN
    RAISE EXCEPTION 'Vérification préalable : snapshot_facture_on_emission en base diffère de la version connue (20260519164035). Migration interrompue, rien n''a été appliqué.';
  END IF;

  -- 0c. Colonnes lues ou écrites par cette migration.
  SELECT string_agg(attendu.t || '.' || attendu.c, ', ') INTO v_manque
  FROM (VALUES
    ('factures','id'),('factures','statut'),('factures','numero_facture'),('factures','centre_id'),
    ('factures','contact_id'),('factures','client_partner_id'),('factures','created_at'),
    ('factures','updated_at'),('factures','deleted_at'),('factures','commentaires'),
    ('factures','date_emission'),('factures','date_echeance'),('factures','montant_total'),
    ('factures','montant_ht'),('factures','montant_tva'),('factures','regime_tva'),
    ('factures','motif_exoneration_tva'),('factures','buyer_type'),('factures','buyer_name_snapshot'),
    ('factures','buyer_siren'),
    ('factures','buyer_siret'),('factures','buyer_tva_intracom'),('factures','buyer_email_facturation'),
    ('factures','buyer_country'),('factures','buyer_address_snapshot'),('factures','facturx_xml'),
    ('factures','e_invoice_status'),('factures','platform_provider'),('factures','platform_reference_id'),
    ('factures','platform_last_sync_at'),('factures','platform_error_message'),
    ('facture_lignes','id'),('facture_lignes','facture_id'),('facture_lignes','montant_ht'),
    ('facture_lignes','montant_tva'),('facture_lignes','montant_ttc'),
    ('contacts','id'),('contacts','prenom'),('contacts','nom'),('contacts','email'),
    ('contacts','rue'),('contacts','code_postal'),('contacts','ville'),
    ('partners','id'),('partners','company_name'),('partners','siret'),('partners','tva_intracom'),
    ('partners','email'),('partners','email_facturation'),('partners','address'),
    ('partners','code_postal'),('partners','ville'),
    ('centre_formation','id'),('centre_formation','einv_default_vat_regime'),
    ('audit_logs','table_name'),('audit_logs','record_id'),('audit_logs','action'),
    ('audit_logs','old_data'),('audit_logs','new_data'),('audit_logs','changed_fields'),
    ('audit_logs','user_id'),('audit_logs','user_email'),('audit_logs','centre_id'),
    ('audit_logs','created_at')
  ) AS attendu(t, c)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns ic
    WHERE ic.table_schema = 'public' AND ic.table_name = attendu.t AND ic.column_name = attendu.c
  );
  IF v_manque IS NOT NULL THEN
    RAISE EXCEPTION 'Vérification préalable : colonne(s) absente(s) : %. Migration interrompue, rien n''a été appliqué.', v_manque;
  END IF;

  -- 0d. Fonctions et rôles utilisés par la garde.
  IF to_regprocedure('public.has_role(uuid,public.app_role)') IS NULL
     OR to_regprocedure('auth.uid()') IS NULL
     OR to_regprocedure('auth.role()') IS NULL THEN
    RAISE EXCEPTION 'Vérification préalable : has_role(uuid, app_role), auth.uid() ou auth.role() absente. Migration interrompue, rien n''a été appliqué.';
  END IF;
  IF (SELECT count(*) FROM pg_enum e
      WHERE e.enumtypid = 'public.app_role'::regtype
        AND e.enumlabel IN ('admin', 'staff', 'super_admin')) <> 3 THEN
    RAISE EXCEPTION 'Vérification préalable : le type app_role ne contient pas admin, staff et super_admin. Migration interrompue, rien n''a été appliqué.';
  END IF;

  -- 0e. Les huit déclencheurs mesurés sur factures sont présents et actifs
  --     (le rattrapage en désactive trois, puis les réactive).
  SELECT string_agg(n, ', ') INTO v_manque
  FROM unnest(ARRAY['audit_factures','trg_auto_set_centre_id_factures','trg_facture_payment_regression',
                    'trg_immutable_centre_id_factures','trg_persist_facture_compliance',
                    'trg_snapshot_facture_on_emission','trg_sync_inscription_paiement_on_facture',
                    'update_factures_updated_at']) AS n
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    WHERE t.tgrelid = 'public.factures'::regclass AND t.tgname = n AND t.tgenabled = 'O'
  );
  IF v_manque IS NOT NULL THEN
    RAISE EXCEPTION 'Vérification préalable : déclencheur(s) de factures absent(s) ou désactivé(s) : %. Migration interrompue, rien n''a été appliqué.', v_manque;
  END IF;

  -- 0f. Aucun BEFORE UPDATE inconnu ne passerait après la garde.
  SELECT string_agg(t.tgname, ', ') INTO v_manque
  FROM pg_trigger t
  WHERE t.tgrelid = 'public.factures'::regclass
    AND NOT t.tgisinternal
    AND (t.tgtype & 2) = 2 AND (t.tgtype & 16) = 16
    AND (t.tgname COLLATE "C") > ('trg_garde_facture_emise' COLLATE "C")
    AND t.tgname NOT IN ('trg_horodatage_creation_facture', 'trg_immutable_centre_id_factures',
                         'trg_snapshot_facture_on_emission', 'update_factures_updated_at');
  IF v_manque IS NOT NULL THEN
    RAISE EXCEPTION 'Vérification préalable : déclencheur(s) BEFORE UPDATE inconnu(s) qui passeraient après la garde : %. Migration interrompue, rien n''a été appliqué.', v_manque;
  END IF;

  -- 0g. Faisabilité du rattrapage R7a : chaque facture à rattraper a une fiche
  --     lisible QUI DONNE UN NOM (sinon l'engagement « toutes les factures
  --     émises » serait tenu avec un nom d'acheteur vide, que la garde rendrait
  --     ensuite incorrigible : '' et NULL sont la même valeur pour R9).
  --     La logique d'identité est recopiée ici, et non appelée : à la première
  --     application, identite_acheteur_facture() n'existe pas encore (R1 :
  --     aucun DDL avant ce bloc).
  SELECT string_agg(f.numero_facture, ', ') INTO v_manque
  FROM public.factures f
  LEFT JOIN public.partners p ON p.id = f.client_partner_id
  LEFT JOIN public.contacts c ON c.id = f.contact_id
  WHERE f.statut <> 'brouillon'
    AND NULLIF(btrim(f.buyer_name_snapshot), '') IS NULL
    AND CASE
          WHEN f.client_partner_id IS NOT NULL
            THEN p.id IS NULL OR NULLIF(btrim(p.company_name), '') IS NULL
          ELSE c.id IS NULL
            OR NULLIF(btrim(TRIM(CONCAT_WS(' ', c.prenom, c.nom))), '') IS NULL
        END;
  IF v_manque IS NOT NULL THEN
    RAISE EXCEPTION 'Vérification préalable : facture(s) émise(s) sans coordonnées figées dont la fiche contact ou entreprise est absente, illisible ou sans nom : %. Migration interrompue, rien n''a été appliqué : renseigner le nom de ces fiches (ou leur raison sociale) avant de la rejouer.', v_manque;
  END IF;

  -- 0h. R8 : aucun workflow ne doit annuler une facture NI la remettre en
  --     brouillon. execute-workflow écrit avec la clé service_role
  --     (auth.uid() NULL) : après cette migration, une telle action serait
  --     refusée SANS QUE PERSONNE NE LE VOIE (updateStatusAction avale le refus
  --     et l'exécution continue). Le champ « Nouveau statut » de
  --     WorkflowFormDialog est une saisie libre : les deux valeurs qui
  --     produisent un refus CERTAIN bloquent la migration ; toutes les autres
  --     sont SIGNALÉES, parce qu'elles produisent un refus le jour où la
  --     facture visée est annulée (la garde y voit une réactivation et exige
  --     une personne connectée).
  IF to_regclass('public.workflows') IS NOT NULL THEN
    SELECT string_agg(w.nom || ' (→ ' || w.statut_vise || ')', ', ') INTO v_manque
    FROM (
      SELECT w.nom, a->'config'->>'new_status' AS statut_vise
      FROM public.workflows w,
           LATERAL jsonb_array_elements(
             CASE WHEN jsonb_typeof(w.actions) = 'array' THEN w.actions ELSE '[]'::jsonb END) a
      WHERE COALESCE(w.actif, true)
        AND a->>'type' = 'update_status'
        AND a->'config'->>'table' = 'factures'
        AND COALESCE(a->'config'->>'status_field', 'statut') = 'statut'
        AND a->'config'->>'new_status' IN ('annulee', 'brouillon')
    ) w;
    IF v_manque IS NOT NULL THEN
      RAISE EXCEPTION 'Vérification préalable : workflow(s) qui annulent une facture ou la remettent en brouillon automatiquement : %. Après cette migration, l''annulation n''est permise qu''à une personne connectée et le retour en brouillon est interdit : ces actions échoueraient en silence. Migration interrompue, rien n''a été appliqué : retirer ces actions de ces workflows (ou les désactiver) avant de la rejouer.', v_manque;
    END IF;

    SELECT string_agg(w.nom || ' (→ ' || w.statut_vise || ')', ', ') INTO v_manque
    FROM (
      SELECT DISTINCT w.nom, COALESCE(a->'config'->>'new_status', '?') AS statut_vise
      FROM public.workflows w,
           LATERAL jsonb_array_elements(
             CASE WHEN jsonb_typeof(w.actions) = 'array' THEN w.actions ELSE '[]'::jsonb END) a
      WHERE COALESCE(w.actif, true)
        AND a->>'type' = 'update_status'
        AND a->'config'->>'table' = 'factures'
        AND COALESCE(a->'config'->>'status_field', 'statut') = 'statut'
    ) w;
    IF v_manque IS NOT NULL THEN
      RAISE NOTICE 'ATTENTION : workflow(s) actif(s) qui changent le statut d''une facture : %. Ils fonctionnent, SAUF sur une facture déjà annulée : la garde y voit une réactivation et exige une personne connectée, ce qu''execute-workflow n''est jamais. Le refus ne remonte pas (updateStatusAction poursuit l''exécution) : la panne serait muette.', v_manque;
    END IF;
  END IF;

  -- 0i. R6 : marques de transmission SIMULÉES laissées par submit-pdp
  --     (platform_reference_id 'LOCAL-%'). Elles ne bloquent pas la migration —
  --     la garde les laisse corrigeables, c'est tout l'objet de R6 — mais elles
  --     doivent être vues : ce sont de faux accusés de transmission.
  SELECT count(*)::text INTO v_manque
  FROM public.factures
  WHERE COALESCE(platform_reference_id, '') LIKE 'LOCAL-%';
  IF v_manque <> '0' THEN
    RAISE NOTICE 'ATTENTION : % facture(s) portent une référence de transmission SIMULÉE (LOCAL-%%) écrite par submit-pdp sans qu''aucune transmission n''ait eu lieu. La garde les laisse corrigeables (R6) ; le lot « vraie PDP » devra les remettre à zéro.', v_manque;
  END IF;

  -- 0j. CE QUI DEVIENT DÉFINITIVEMENT INCOMPLET. Ne bloque pas (c'est la
  --     conséquence assumée de D2), mais doit être DIT avant d'appliquer :
  --     après cette migration, une facture non brouillon sans aucune ligne ne
  --     pourra plus jamais en recevoir, et sans ligne elle n'aura jamais de
  --     montant HT ni de montant de TVA (aucune somme à laquelle se comparer).
  --     La sonde de production du 11/09/2026 en a compté 54 : ce comptage doit
  --     être remis à Karim, avec la question « on fige, ou le lot ouvre une
  --     fenêtre de rattrapage pour saisir ces lignes d'abord ? ».
  SELECT count(*)::text INTO v_manque
  FROM public.factures f
  WHERE f.statut <> 'brouillon'
    AND NOT EXISTS (SELECT 1 FROM public.facture_lignes l WHERE l.facture_id = f.id);
  IF v_manque <> '0' THEN
    RAISE NOTICE 'ATTENTION : % facture(s) non brouillon n''ont AUCUNE ligne. Après cette migration elles ne seront plus complétables par personne : ni ligne, ni montant HT, ni montant de TVA. CAUSE PRINCIPALE MESURÉE : la facture express (colonnes montant_ht/montant_tva/montant_ttc GENERATED des lignes, jamais alimentées), désormais corrigée côté front. Décision du directeur requise AVANT d''appliquer : figer ces factures, ou faire ouvrir par le lot une fenêtre de saisie des lignes d''abord.', v_manque;
  END IF;

  SELECT count(*) FILTER (WHERE a_des_lignes), count(*) FILTER (WHERE NOT a_des_lignes)
    INTO v_n, v_n2
  FROM (
    SELECT EXISTS (SELECT 1 FROM public.facture_lignes l WHERE l.facture_id = f.id) AS a_des_lignes
    FROM public.factures f
    WHERE f.statut <> 'brouillon' AND (f.montant_ht IS NULL OR f.montant_tva IS NULL)
  ) s;
  IF v_n + v_n2 > 0 THEN
    RAISE NOTICE 'Factures non brouillon sans montant HT ou sans montant de TVA : % avec lignes (rattrapées par la section 5) et % sans ligne (définitivement sans montant).', v_n, v_n2;
  END IF;

  -- 0k. BLOQUANT B (relecture du 12/09) : factures non brouillon dont la SOMME
  --     des lignes NE CONCORDE PAS avec montant_total (écart >= 0,02). Les
  --     lignes étaient librement modifiables et montant_total a bougé 18 fois
  --     en 90 jours : des divergences existent. Le rattrapage de la section 5
  --     NE POSE PAS de montant sur ces factures — il figerait une valeur
  --     arithmétiquement fausse (ex. une ligne « acompte » 100 sur une facture
  --     à 1800 donnerait montant_ht = 100 figé) ; il les laisse à NULL,
  --     honnêtes et réparables (la garde R7e refuse la même valeur pour la même
  --     raison). Ne bloque pas, mais doit être SIGNALÉ, comme les 54 sans ligne.
  SELECT count(*)::text INTO v_manque
  FROM public.factures f
  CROSS JOIN LATERAL (
    SELECT count(*) AS lignes,
           COALESCE(SUM(l.montant_ht), 0) AS total_ht,
           COALESCE(SUM(l.montant_tva), 0) AS total_tva
    FROM public.facture_lignes l WHERE l.facture_id = f.id
  ) t
  WHERE f.statut <> 'brouillon'
    AND t.lignes > 0
    AND abs(t.total_ht + t.total_tva - COALESCE(f.montant_total, 0)) >= 0.02;
  IF v_manque <> '0' THEN
    RAISE NOTICE 'ATTENTION : % facture(s) non brouillon ont des lignes dont la somme NE CONCORDE PAS avec le montant TTC (écart >= 0,02 ; montant_total a bougé 18 fois en 90 jours sur des lignes librement modifiables). Le rattrapage laisse leur montant HT / montant de TVA à NULL — une somme de lignes fausse ne doit pas être figée — et la garde refusera de poser cette valeur : à corriger à la main (lignes ou montant TTC) avant qu''un montant conforme puisse être posé.', v_manque;
  END IF;
END $verifications$;


-- ── 1. Interrupteur de phase : annulation manuelle (R2) ─────────────────────
-- Créé seulement s'il n'existe pas : rejouer cette migration après la phase 3
-- (interrupteur passé à false) ne rouvre pas l'annulation.
DO $interrupteur$
BEGIN
  IF to_regprocedure('public.factures_annulation_manuelle_permise()') IS NULL THEN
    EXECUTE $ddl$
      CREATE FUNCTION public.factures_annulation_manuelle_permise()
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SET search_path = public
      AS $function$
        -- Phase 1 (avoirs non livrés) : true.
        -- La migration qui livre l'avoir remplace ce corps par « SELECT false ».
        SELECT true
      $function$
    $ddl$;
    EXECUTE $ddl$
      COMMENT ON FUNCTION public.factures_annulation_manuelle_permise() IS
        'Phase du chantier des avoirs : true tant que l''avoir n''existe pas (annulation manuelle d''une facture émise permise, tracée, par une personne connectée), false ensuite. Lisible par le front.'
    $ddl$;
    RAISE NOTICE 'Interrupteur factures_annulation_manuelle_permise() créé (true).';
  ELSE
    RAISE NOTICE 'Interrupteur factures_annulation_manuelle_permise() déjà présent : valeur conservée (%).',
      public.factures_annulation_manuelle_permise();
  END IF;
END $interrupteur$;

REVOKE EXECUTE ON FUNCTION public.factures_annulation_manuelle_permise() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.factures_annulation_manuelle_permise() TO authenticated, service_role;

-- ── 1bis. Interrupteur de phase : tolérance des transmissions SIMULÉES (R6) ──
-- Même forme que ci-dessus : créé seulement s'il n'existe pas, donc un rejeu
-- après le lot « vraie PDP » ne rouvre pas la soupape.
-- Tant qu'il vaut true, une référence de plateforme 'LOCAL-%' n'est PAS une
-- transmission : submit-pdp en écrit sans rien transmettre, et figer sur cette
-- marque graverait un faux accusé. C'est aussi une soupape permanente pour qui
-- peut écrire platform_reference_id (mesuré : 'LOCAL-camouflage' posé exprès
-- garde tout le bloc transmission réécrivable) : elle est donc DATÉE, et le lot
-- « vraie PDP » la referme en passant ce corps à « SELECT false », dans la même
-- migration qui remet les marques 'LOCAL-%' existantes à zéro.
DO $interrupteur_pdp$
BEGIN
  IF to_regprocedure('public.factures_transmission_simulee_toleree()') IS NULL THEN
    EXECUTE $ddl$
      CREATE FUNCTION public.factures_transmission_simulee_toleree()
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SET search_path = public
      AS $function$
        -- Phase 1 (submit-pdp ne transmet rien, « TODO : appel HTTP réel ») : true.
        -- Le lot « vraie PDP » remplace ce corps par « SELECT false ».
        SELECT true
      $function$
    $ddl$;
    EXECUTE $ddl$
      COMMENT ON FUNCTION public.factures_transmission_simulee_toleree() IS
        'Phase du chantier e-invoicing : true tant que submit-pdp SIMULE la transmission (référence LOCAL-…) — ces marques restent alors corrigeables. Le lot « vraie PDP » la passe à false EN MÊME TEMPS qu''il remet les marques LOCAL-% à zéro et livre la fonction qui pose les accusés.'
    $ddl$;
    RAISE NOTICE 'Interrupteur factures_transmission_simulee_toleree() créé (true).';
  ELSE
    RAISE NOTICE 'Interrupteur factures_transmission_simulee_toleree() déjà présent : valeur conservée (%).',
      public.factures_transmission_simulee_toleree();
  END IF;
END $interrupteur_pdp$;

REVOKE EXECUTE ON FUNCTION public.factures_transmission_simulee_toleree() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.factures_transmission_simulee_toleree() TO authenticated, service_role;


-- ── 2. Conseil affiché à la fin des messages de refus ──────────────────────
CREATE OR REPLACE FUNCTION public.conseil_facture_emise()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
  SELECT CASE WHEN public.factures_annulation_manuelle_permise()
    THEN ' En cas d''erreur, passez-la au statut « Annulée » puis créez une nouvelle facture.'
    ELSE ' En cas d''erreur, émettez un avoir puis, si besoin, une nouvelle facture.'
  END
$function$;

REVOKE EXECUTE ON FUNCTION public.conseil_facture_emise() FROM PUBLIC, anon, authenticated;


-- ── 3. Identité de l'acheteur (logique unique, R7) ─────────────────────────
-- Reprend EXACTEMENT la logique de snapshot_facture_on_emission 20260519164035 :
-- entreprise (client_partner_id) sinon contact ; entreprise introuvable → rien
-- (pas de repli sur le contact). Utilisée par le figeage à l'émission, le
-- rattrapage et merge_contacts.
CREATE OR REPLACE FUNCTION public.identite_acheteur_facture(p_contact_id uuid, p_client_partner_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $function$
DECLARE
  v_partner record;
  v_contact record;
  v_siret_chiffres text;
BEGIN
  IF p_client_partner_id IS NOT NULL THEN
    SELECT p.company_name, p.siret, p.tva_intracom, p.email, p.email_facturation,
           p.address, p.code_postal, p.ville
      INTO v_partner
      FROM public.partners p WHERE p.id = p_client_partner_id;
    IF NOT FOUND THEN
      RETURN NULL;
    END IF;
    -- buyer_siren : les 9 premiers chiffres du SIRET, espaces retirés, et NULL
    -- si le SIRET n'a pas exactement 14 chiffres (forme de 20260519123424).
    -- Sans cela, buyer_siren resterait NULL et figé pour toutes les factures
    -- d'entreprise : generate-facturx n'émet le bloc SpecifiedLegalOrganization
    -- de l'acheteur que si buyer_siren existe.
    v_siret_chiffres := NULLIF(regexp_replace(COALESCE(v_partner.siret, ''), '[^0-9]', '', 'g'), '');
    RETURN jsonb_build_object(
      'buyer_type',              'b2b',
      'buyer_name_snapshot',     v_partner.company_name,
      'buyer_siren',             CASE WHEN length(v_siret_chiffres) = 14 THEN left(v_siret_chiffres, 9) END,
      'buyer_siret',             v_partner.siret,
      'buyer_tva_intracom',      v_partner.tva_intracom,
      'buyer_email_facturation', COALESCE(v_partner.email_facturation, v_partner.email),
      'buyer_country',           'FR',
      'buyer_address_snapshot',  jsonb_build_object(
                                   'line1', v_partner.address,
                                   'postal_code', v_partner.code_postal,
                                   'city', v_partner.ville,
                                   'country', 'FR'));
  END IF;

  IF p_contact_id IS NOT NULL THEN
    SELECT c.prenom, c.nom, c.email, c.rue, c.code_postal, c.ville
      INTO v_contact
      FROM public.contacts c WHERE c.id = p_contact_id;
    IF NOT FOUND THEN
      RETURN NULL;
    END IF;
    RETURN jsonb_build_object(
      'buyer_type',              'b2c',
      'buyer_name_snapshot',     TRIM(CONCAT_WS(' ', v_contact.prenom, v_contact.nom)),
      'buyer_siren',             NULL,
      'buyer_siret',             NULL,
      'buyer_tva_intracom',      NULL,
      'buyer_email_facturation', v_contact.email,
      'buyer_country',           'FR',
      'buyer_address_snapshot',  jsonb_build_object(
                                   'line1', v_contact.rue,
                                   'postal_code', v_contact.code_postal,
                                   'city', v_contact.ville,
                                   'country', 'FR'));
  END IF;

  RETURN NULL;
END;
$function$;

COMMENT ON FUNCTION public.identite_acheteur_facture(uuid, uuid) IS
  'Coordonnées de l''acheteur d''une facture tirées de la fiche entreprise (client_partner_id) sinon contact, logique de snapshot_facture_on_emission. Interne : figeage, rattrapage, fusion.';

REVOKE EXECUTE ON FUNCTION public.identite_acheteur_facture(uuid, uuid) FROM PUBLIC, anon, authenticated;


-- ── 4. Figeage à l'émission (R7b, R7c) ──────────────────────────────────────
-- Remplace 20260519164035 (vérifiée en tête). Différences, et elles seules :
--  • « émission » = INSERT hors brouillon, ou UPDATE brouillon → non brouillon
--    (emise, mais aussi partiel, payee, impayee, annulee) ;
--  • à l'émission : identité figée, régime de TVA, mention d'exonération et
--    date d'émission (COALESCE, '' traité comme NULL) — À L'INSERT AUSSI, ce
--    que la v1 ne faisait pas : une facture créée directement « emise » aurait
--    sinon une mention d'exonération figée à NULL pour toujours ;
--  • montants depuis les lignes : sur un UPDATE seulement (à l'INSERT, les
--    lignes n'existent pas encore) ;
--  • partiel/payee/impayee/annulee → emise : SEULS montant_ht et montant_tva
--    peuvent encore passer de NULL à une valeur. L'identité, le régime, le
--    motif et la date ne sont plus jamais complétés après l'émission (avant :
--    ils l'étaient, contact renommé compris).
CREATE OR REPLACE FUNCTION public.snapshot_facture_on_emission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- campust3p:snapshot_v2 (20260912090100_garde_factures_emises)
DECLARE
  v_centre_vat_regime TEXT;
  v_identite jsonb;
  v_totals RECORD;
  v_emission boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_emission := NEW.statut <> 'brouillon';
  ELSE
    v_emission := OLD.statut = 'brouillon' AND NEW.statut <> 'brouillon';
  END IF;

  -- 1. Identité de l'acheteur : figée à l'émission, jamais complétée ensuite.
  IF v_emission THEN
    v_identite := public.identite_acheteur_facture(NEW.contact_id, NEW.client_partner_id);
    IF v_identite IS NOT NULL THEN
      NEW.buyer_type              := COALESCE(NULLIF(btrim(NEW.buyer_type), ''), NULLIF(btrim(v_identite->>'buyer_type'), ''));
      NEW.buyer_name_snapshot     := COALESCE(NULLIF(btrim(NEW.buyer_name_snapshot), ''), NULLIF(btrim(v_identite->>'buyer_name_snapshot'), ''));
      NEW.buyer_siren             := COALESCE(NULLIF(btrim(NEW.buyer_siren), ''), NULLIF(btrim(v_identite->>'buyer_siren'), ''));
      NEW.buyer_siret             := COALESCE(NULLIF(btrim(NEW.buyer_siret), ''), NULLIF(btrim(v_identite->>'buyer_siret'), ''));
      NEW.buyer_tva_intracom      := COALESCE(NULLIF(btrim(NEW.buyer_tva_intracom), ''), NULLIF(btrim(v_identite->>'buyer_tva_intracom'), ''));
      NEW.buyer_email_facturation := COALESCE(NULLIF(btrim(NEW.buyer_email_facturation), ''), NULLIF(btrim(v_identite->>'buyer_email_facturation'), ''));
      NEW.buyer_country           := COALESCE(NULLIF(btrim(NEW.buyer_country), ''), NULLIF(btrim(v_identite->>'buyer_country'), ''));
      NEW.buyer_address_snapshot  := COALESCE(NEW.buyer_address_snapshot, v_identite->'buyer_address_snapshot');
    END IF;

    -- BLOQUANT C (relecture du 12/09) : l'identité vient d'être figée par les
    -- COALESCE ci-dessus. Si, à ce stade, AUCUN NOM d'acheteur n'a pu être posé
    -- — fiche contact au nom vide ou fait d'espaces, entreprise à la raison
    -- sociale vide (contacts.nom/prenom et partners.company_name sont NOT NULL
    -- mais acceptent '', et ni api-v1 POST ni le front — z.string().min(1)
    -- accepte une espace — ne rejettent une chaîne d'espaces) — NE PAS GRAVER
    -- une facture émise sans nom. La garde de la section 7 figerait ensuite
    -- BUYER_NAME/BUYER_ADDRESS (NULL → valeur refusé hors fusion) : elles
    -- seraient perdues à vie (Factur-X sans nom), merge_contacts ne traite pas
    -- les entreprises, et le rejeu de M2 s'arrêterait (0g puis « écriture hors
    -- application ? »). On REFUSE l'émission : la facture reste réparable, et
    -- l'assertion finale d'invariant devient permanente. Nomme la pièce.
    IF NULLIF(btrim(NEW.buyer_name_snapshot), '') IS NULL THEN
      RAISE EXCEPTION USING
        MESSAGE = format(
          'Émission refusée : la fiche du client de la facture %s n''a pas de nom. Renseignez le nom (ou la raison sociale) avant d''émettre.',
          NEW.numero_facture),
        HINT = 'garde_facture_emise';
    END IF;
  END IF;

  -- 2. Régime, motif d'exonération et date d'émission : à TOUTE émission,
  --    INSERT COMPRIS. La v1 ne les posait que sur un UPDATE ; une facture
  --    créée directement « emise » (FactureLibreDialog, facture-express,
  --    useDevis) restait donc sans mention d'exonération — et la garde de la
  --    section 7 fige ces colonnes dès l'émission, ce qui la rendrait
  --    définitivement non conforme (règle INVOICE_MOTIF_EXO de M1, 3 points).
  --    Les trois valeurs se déduisent de la fiche du centre, comme l'identité :
  --    il faut les poser AVANT que la garde ne les fige.
  IF v_emission THEN
    SELECT COALESCE(einv_default_vat_regime, 'exonere_261_4_4_a')
      INTO v_centre_vat_regime
      FROM public.centre_formation
      WHERE id = NEW.centre_id;

    IF NULLIF(btrim(NEW.regime_tva), '') IS NULL THEN
      NEW.regime_tva := COALESCE(v_centre_vat_regime, 'exonere_261_4_4_a');
    END IF;

    IF NULLIF(btrim(NEW.motif_exoneration_tva), '') IS NULL THEN
      NEW.motif_exoneration_tva := 'TVA non applicable, art. 261-4-4°a du CGI';
    END IF;

    IF NEW.date_emission IS NULL THEN
      NEW.date_emission := CURRENT_DATE;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- 3. Montants dérivés des lignes : à l'émission, et à tout retour à
    --    « emise » (NULL → valeur seulement). Jamais à l'INSERT : les lignes
    --    n'existent pas encore.
    --    BLOQUANT A (relecture du 12/09) : on ne pose montant_ht / montant_tva
    --    QUE si la facture a AU MOINS UNE LIGNE. Sans ce garde-fou, une facture
    --    émise SANS ligne recevait montant_ht := COALESCE(NULL, SUM=0) = 0,00,
    --    que la garde figeait ensuite (0,00 n'est pas NULL, R7e ne le rattrape
    --    pas) : INVOICE_TOTAL_COHERENCE bloquante à vie face à un TTC non nul,
    --    et Factur-X à TaxBasisTotalAmount 0,00. Sans ligne on laisse donc NULL
    --    (complétable par R7e le jour où les lignes existeront) ; la section 0j
    --    compte ces factures et laisse au directeur le choix « figer » vs
    --    « ouvrir une fenêtre de saisie ».
    --    BLOQUANT (relecture idempotence/contournement du 12/09) : ce bloc se
    --    déclenche non seulement à l'émission (brouillon → emise) mais à TOUT
    --    retour au statut « emise » (payee/partiel/impayee → emise). La garde
    --    (trg_garde_facture_emise) passe AVANT ce snapshot (ordre alphabétique) :
    --    sur un aller-retour de statut où le client n'envoie que { statut }, elle
    --    voit montant_ht NULL → NULL (aucun changement, R7e jamais évalué), puis
    --    ce bloc posait montant_ht := COALESCE(NULL, somme_des_lignes) SANS
    --    confronter cette somme à montant_total. Une facture divergente (0k, ex.
    --    ligne « acompte » 100 sur un TTC de 1800) — laissée à NULL EXPRÈS par le
    --    rattrapage et refusée par R7e à l'écriture directe — se voyait ainsi
    --    graver un montant faux et figé par un simple emise → partiel → emise
    --    (chemin atteint sans privilège : un paiement partiel encaissé puis
    --    annulé le produit via update_facture_statut). On aligne donc CE bloc sur
    --    R7e : on ne pose les montants que si la facture a au moins une ligne ET
    --    que la somme des lignes concorde avec montant_total (à 0,02 près). Une
    --    émission brouillon → emise réellement divergente laisse alors montant_ht
    --    à NULL (signalé par M1) plutôt que figé faux : c'est le comportement
    --    voulu, identique au rattrapage §5 et à la garde R7e.
    IF v_emission OR (NEW.statut = 'emise' AND OLD.statut IS DISTINCT FROM 'emise') THEN
      SELECT
        count(*) AS lignes,
        COALESCE(SUM(montant_ht), 0) AS total_ht,
        COALESCE(SUM(montant_tva), 0) AS total_tva,
        COALESCE(SUM(montant_ttc), 0) AS total_ttc
      INTO v_totals
      FROM public.facture_lignes
      WHERE facture_id = NEW.id;

      IF v_totals.lignes > 0
         AND abs(v_totals.total_ht + v_totals.total_tva - COALESCE(NEW.montant_total, 0)) < 0.02 THEN
        NEW.montant_ht := COALESCE(NEW.montant_ht, v_totals.total_ht);
        NEW.montant_tva := COALESCE(NEW.montant_tva, v_totals.total_tva);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Le déclencheur BEFORE UPDATE trg_snapshot_facture_on_emission existe déjà
-- (vérifié en tête) ; on ajoute l'INSERT.
-- UN SEUL BLOC DO = UNE SEULE INSTRUCTION : un arrêt du moteur ne peut pas
-- laisser la base entre le DROP et le CREATE (voir l'en-tête).
DO $trg$
BEGIN
  EXECUTE 'DROP TRIGGER IF EXISTS trg_snapshot_facture_on_insert ON public.factures';
  EXECUTE 'CREATE TRIGGER trg_snapshot_facture_on_insert
             BEFORE INSERT ON public.factures
             FOR EACH ROW
             EXECUTE FUNCTION public.snapshot_facture_on_emission()';
END $trg$;


-- ── 5. Rattrapage : coordonnées de l'acheteur ET montants dérivés (R7a, R7d) ─
-- Un seul bloc DO : atomique même si le moteur n'ouvre pas de transaction (un
-- échec annule aussi la désactivation des déclencheurs).
-- DEUX rattrapages, tous deux « NULL → valeur », jamais d'écrasement :
--  (a) IDENTITÉ : les huit colonnes d'acheteur des factures non brouillon sans
--      buyer_name_snapshot, depuis la fiche contact ou entreprise du jour ;
--  (b) MONTANTS DÉRIVÉS : montant_ht et montant_tva des factures non brouillon
--      qui ont AU MOINS UNE LIGNE, depuis la somme de leurs lignes. Sans ceci,
--      les factures créées déjà « emise » puis complétées par leurs lignes
--      (FactureLibreDialog, conversion de devis) resteraient sans montant HT ni
--      montant de TVA POUR TOUJOURS, la garde refusant ensuite de les écrire.
--      Les factures SANS ligne ne sont pas touchées : il n'y a pas de somme, et
--      écrire 0 serait faux (la section 0j les compte et le signale).
-- Pour ne modifier AUCUNE autre donnée, trois déclencheurs sont désactivés le
-- temps des UPDATE : audit_factures (sinon une ligne d'audit par facture, avec
-- les données personnelles ; remplacée par une ligne de synthèse),
-- update_factures_updated_at (sinon updated_at réécrit) et
-- trg_sync_inscription_paiement_on_facture (sinon recalcul des statuts de
-- paiement des inscriptions, étranger au rattrapage). Les autres sont sans
-- effet sur ces UPDATE (statut inchangé, et snapshot v1 comme v2 ne font rien
-- hors émission). La garde n'existe pas encore au premier passage. Au rejeu, il
-- n'y a plus d'identité à rattraper (et s'il en reste, c'est une écriture hors
-- application : le bloc s'arrête et le dit) ; il peut en revanche rester des
-- montants à poser, et la garde les accepte puisque ce sont exactement les
-- sommes des lignes figées (R7e).
-- SEULE INSTRUCTION DU FICHIER QUI TOUCHE DES DONNÉES, donc le point d'arrêt le
-- plus probable : elle passe AVANT la section 6 (created_at posé par le
-- serveur), la seule qui puisse faire échouer un appel existant.
-- UN NOM VIDE N'EST PAS UN NOM : « sans coordonnées figées » se lit
-- NULLIF(btrim(buyer_name_snapshot), '') IS NULL, et le COALESCE n'écrit jamais
-- une chaîne vide. La section 0g a déjà refusé d'appliquer la migration s'il
-- existait une fiche sans nom : le contrôle v_restantes ci-dessous est la
-- ceinture qui va avec cette bretelle.
DO $rattrapage$
DECLARE
  c_colonnes CONSTANT text[] := ARRAY['buyer_type','buyer_name_snapshot','buyer_siren','buyer_siret',
                                      'buyer_tva_intracom','buyer_email_facturation','buyer_country',
                                      'buyer_address_snapshot','montant_ht','montant_tva'];
  v_ident_a_rattraper integer;
  v_mont_a_rattraper integer;
  v_ident_rattrapees integer := 0;
  v_mont_rattrapees integer := 0;
  v_restantes integer;
  r record;
BEGIN
  SELECT count(*) INTO v_ident_a_rattraper
  FROM public.factures
  WHERE statut <> 'brouillon' AND NULLIF(btrim(buyer_name_snapshot), '') IS NULL;

  -- BLOQUANT B : « à poser » ne compte QUE les factures dont la somme des
  -- lignes concorde avec montant_total (à 0,02 près) ; les divergentes (0k)
  -- restent NULL, elles ne sont donc pas « à poser ».
  SELECT count(*) INTO v_mont_a_rattraper
  FROM public.factures f
  CROSS JOIN LATERAL (
    SELECT count(*) AS lignes,
           COALESCE(SUM(l.montant_ht), 0) AS total_ht,
           COALESCE(SUM(l.montant_tva), 0) AS total_tva
    FROM public.facture_lignes l WHERE l.facture_id = f.id
  ) t
  WHERE f.statut <> 'brouillon'
    AND (f.montant_ht IS NULL OR f.montant_tva IS NULL)
    AND t.lignes > 0
    AND abs(t.total_ht + t.total_tva - COALESCE(f.montant_total, 0)) < 0.02;

  IF v_ident_a_rattraper = 0 AND v_mont_a_rattraper = 0 THEN
    RAISE NOTICE 'Rattrapage des factures émises : 0 identité et 0 montant à rattraper.';
    RETURN;
  END IF;

  -- L'IDENTITÉ manquante alors que la garde existe déjà ne peut venir que d'une
  -- écriture hors application : on s'arrête. Les MONTANTS, eux, peuvent manquer
  -- légitimement après coup (une facture créée « emise » dont l'application n'a
  -- posé que le montant HT, par exemple) : le rattrapage les pose, et la garde
  -- l'accepte puisqu'il écrit exactement la somme des lignes figées (R7e). Sans
  -- cette distinction, un simple rejeu de sécurité s'arrêterait sur un état
  -- parfaitement normal.
  IF v_ident_a_rattraper > 0
     AND EXISTS (SELECT 1 FROM pg_trigger
                 WHERE tgrelid = 'public.factures'::regclass AND tgname = 'trg_garde_facture_emise') THEN
    RAISE EXCEPTION 'Rattrapage impossible : % facture(s) émise(s) sans coordonnées figées alors que la garde existe déjà (écriture hors application ?). Migration interrompue ; examiner ces factures avant de la rejouer.', v_ident_a_rattraper;
  END IF;

  CREATE TEMP TABLE rattrapage_factures_emises ON COMMIT DROP AS
    SELECT f.id,
           f.centre_id,
           f.client_partner_id IS NOT NULL AS entreprise,
           NULLIF(btrim(f.buyer_name_snapshot), '') IS NULL AS identite_a_poser,
           public.identite_acheteur_facture(f.contact_id, f.client_partner_id) AS identite,
           -- BLOQUANT B : montants posés SEULEMENT si la somme des lignes
           -- concorde avec montant_total (à 0,02 près). Sinon NULL (0k) : figer
           -- une somme de lignes qui ne fait pas le total graverait un montant
           -- arithmétiquement faux, colonne par colonne.
           ((f.montant_ht IS NULL OR f.montant_tva IS NULL)
             AND t.lignes > 0
             AND abs(t.total_ht + t.total_tva - COALESCE(f.montant_total, 0)) < 0.02) AS montants_a_poser,
           t.total_ht,
           t.total_tva
    FROM public.factures f
    CROSS JOIN LATERAL (
      SELECT count(*) AS lignes,
             COALESCE(SUM(l.montant_ht), 0) AS total_ht,
             COALESCE(SUM(l.montant_tva), 0) AS total_tva
      FROM public.facture_lignes l WHERE l.facture_id = f.id
    ) t
    WHERE f.statut <> 'brouillon'
      AND ( NULLIF(btrim(f.buyer_name_snapshot), '') IS NULL
            OR ((f.montant_ht IS NULL OR f.montant_tva IS NULL) AND t.lignes > 0) );

  ALTER TABLE public.factures DISABLE TRIGGER audit_factures;
  ALTER TABLE public.factures DISABLE TRIGGER update_factures_updated_at;
  ALTER TABLE public.factures DISABLE TRIGGER trg_sync_inscription_paiement_on_facture;

  -- (a) NULLIF(btrim(…), '') des DEUX côtés du COALESCE : ni la valeur existante
  --     ni la valeur dérivée ne peuvent écrire une chaîne vide (R7a).
  UPDATE public.factures f SET
    buyer_type              = COALESCE(NULLIF(btrim(f.buyer_type), ''), NULLIF(btrim(s.identite->>'buyer_type'), '')),
    buyer_name_snapshot     = COALESCE(NULLIF(btrim(f.buyer_name_snapshot), ''), NULLIF(btrim(s.identite->>'buyer_name_snapshot'), '')),
    buyer_siren             = COALESCE(NULLIF(btrim(f.buyer_siren), ''), NULLIF(btrim(s.identite->>'buyer_siren'), '')),
    buyer_siret             = COALESCE(NULLIF(btrim(f.buyer_siret), ''), NULLIF(btrim(s.identite->>'buyer_siret'), '')),
    buyer_tva_intracom      = COALESCE(NULLIF(btrim(f.buyer_tva_intracom), ''), NULLIF(btrim(s.identite->>'buyer_tva_intracom'), '')),
    buyer_email_facturation = COALESCE(NULLIF(btrim(f.buyer_email_facturation), ''), NULLIF(btrim(s.identite->>'buyer_email_facturation'), '')),
    buyer_country           = COALESCE(NULLIF(btrim(f.buyer_country), ''), NULLIF(btrim(s.identite->>'buyer_country'), '')),
    buyer_address_snapshot  = COALESCE(f.buyer_address_snapshot, s.identite->'buyer_address_snapshot')
  FROM rattrapage_factures_emises s
  WHERE f.id = s.id AND s.identite_a_poser AND s.identite IS NOT NULL;
  GET DIAGNOSTICS v_ident_rattrapees = ROW_COUNT;

  -- (b) Montants dérivés : somme des lignes, jamais d'écrasement.
  UPDATE public.factures f SET
    montant_ht  = COALESCE(f.montant_ht, s.total_ht),
    montant_tva = COALESCE(f.montant_tva, s.total_tva)
  FROM rattrapage_factures_emises s
  WHERE f.id = s.id AND s.montants_a_poser;
  GET DIAGNOSTICS v_mont_rattrapees = ROW_COUNT;

  ALTER TABLE public.factures ENABLE TRIGGER audit_factures;
  ALTER TABLE public.factures ENABLE TRIGGER update_factures_updated_at;
  ALTER TABLE public.factures ENABLE TRIGGER trg_sync_inscription_paiement_on_facture;

  SELECT count(*) INTO v_restantes
  FROM public.factures
  WHERE statut <> 'brouillon' AND NULLIF(btrim(buyer_name_snapshot), '') IS NULL;
  IF v_restantes > 0 THEN
    RAISE EXCEPTION 'Rattrapage incomplet : % facture(s) émise(s) restent sans coordonnées figées (nom d''acheteur absent ou vide). Migration interrompue, rattrapage annulé.', v_restantes;
  END IF;

  -- BLOQUANT B : ne comptent comme « restantes » que les factures dont la
  -- somme des lignes CONCORDE avec le montant_total (à 0,02 près) : ce sont les
  -- seules que le rattrapage devait poser. Les divergentes (0k) sont laissées à
  -- NULL exprès, elles ne sont pas un rattrapage incomplet.
  SELECT count(*) INTO v_restantes
  FROM public.factures f
  CROSS JOIN LATERAL (
    SELECT count(*) AS lignes,
           COALESCE(SUM(l.montant_ht), 0) AS total_ht,
           COALESCE(SUM(l.montant_tva), 0) AS total_tva
    FROM public.facture_lignes l WHERE l.facture_id = f.id
  ) t
  WHERE f.statut <> 'brouillon'
    AND (f.montant_ht IS NULL OR f.montant_tva IS NULL)
    AND t.lignes > 0
    AND abs(t.total_ht + t.total_tva - COALESCE(f.montant_total, 0)) < 0.02;
  IF v_restantes > 0 THEN
    RAISE EXCEPTION 'Rattrapage incomplet : % facture(s) émise(s) dont les lignes concordent avec le montant TTC restent sans montant HT ou sans montant de TVA. Migration interrompue, rattrapage annulé.', v_restantes;
  END IF;

  -- Une ligne de synthèse par centre, sans donnée personnelle.
  FOR r IN
    SELECT s.centre_id,
           count(*) AS n,
           count(*) FILTER (WHERE s.identite_a_poser) AS n_identite,
           count(*) FILTER (WHERE s.identite_a_poser AND s.entreprise) AS n_entreprises,
           count(*) FILTER (WHERE s.montants_a_poser) AS n_montants,
           jsonb_agg(s.id ORDER BY s.id) AS ids
    FROM rattrapage_factures_emises s
    GROUP BY s.centre_id
  LOOP
    INSERT INTO public.audit_logs (
      table_name, record_id, action, old_data, new_data, changed_fields,
      user_id, user_email, centre_id, created_at
    ) VALUES (
      'factures',
      r.centre_id,
      'RATTRAPAGE_IDENTITE_ACHETEUR',
      NULL,
      jsonb_build_object(
        'migration', '20260912090100_garde_factures_emises',
        'motif', 'coordonnées de l''acheteur figées depuis la fiche contact ou entreprise du jour (R7a), et montants HT/TVA posés depuis la somme des lignes (R7d)',
        'factures_concernees', r.n,
        'factures_rattrapees', r.n_identite,
        'dont_particuliers', r.n_identite - r.n_entreprises,
        'dont_entreprises', r.n_entreprises,
        'factures_montants_rattrapes', r.n_montants,
        'facture_ids', r.ids),
      c_colonnes,
      NULL,
      NULL,
      r.centre_id,
      now()
    );
  END LOOP;

  RAISE NOTICE 'Rattrapage des factures émises : % identité(s) rattrapée(s) sur % à rattraper, et % montant(s) HT/TVA posé(s) sur % à poser.',
    v_ident_rattrapees, v_ident_a_rattraper, v_mont_rattrapees, v_mont_a_rattraper;
END $rattrapage$;


-- ── 6. Date de création posée par le serveur (R4) ───────────────────────────
-- Référence de la fenêtre de première saisie des lignes (section 9).
-- À L'INSERT : posée par le serveur. Un created_at ENVOYÉ est REFUSÉ, il n'est
-- PAS écrasé en silence — api-v1 POST accepte un corps libre, et un import de
-- factures historiques verrait sinon toutes ses dates remplacées par celle de
-- l'import, sans erreur ni notice, alors que date_emission, elle, serait
-- conservée (et useFacturesPaginated trie par created_at). Perdre une donnée
-- sans le dire est pire qu'un refus. Tolérance : une seconde autour de now(),
-- parce que la valeur par défaut de la colonne EST now() — un corps qui ne
-- transmet rien passe donc toujours. À mentionner dans API.md pour les
-- intégrateurs (dépôt en lecture seule pour ce lot).
-- À L'UPDATE : jamais modifiée, brouillon compris (sinon un brouillon
-- « rajeuni » puis émis sans ligne rouvrirait la fenêtre à volonté). Comparaison
-- à la MILLISECONDE : now() a la résolution de la microseconde et tout client
-- JSON/JavaScript relit puis renvoie l'horodatage arrondi à la milliseconde ; un
-- lire-modifier-écrire qui ne touche pas à created_at doit passer.
-- CE DÉCLENCHEUR EST LE SEUL À PROTÉGER created_at : la colonne est SORTIE des
-- colonnes figées de la garde (section 7), sinon c'est le message générique de
-- la garde qui sortait — « passez la facture au statut Annulée puis créez-en une
-- nouvelle » —, conseil destructeur pour quelqu'un qui n'a rien changé.
CREATE OR REPLACE FUNCTION public.horodatage_creation_facture()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.created_at IS NOT NULL AND abs(extract(epoch FROM (now() - NEW.created_at))) > 1 THEN
      RAISE EXCEPTION USING
        MESSAGE = format(
          'Création refusée : la date de création de la facture %s est posée par le serveur, ne l''envoyez pas (colonne created_at). La date de la pièce se renseigne dans date_emission.',
          NEW.numero_facture),
        HINT = 'garde_facture_emise';
    END IF;
    NEW.created_at := now();
  ELSIF date_trunc('milliseconds', NEW.created_at) IS DISTINCT FROM date_trunc('milliseconds', OLD.created_at) THEN
    RAISE EXCEPTION USING
      MESSAGE = format(
        'Modification refusée : la date de création de la facture %s est posée par le serveur et ne se modifie pas (colonne created_at). N''envoyez que les colonnes réellement modifiées.',
        OLD.numero_facture),
      HINT = 'garde_facture_emise';
  ELSE
    -- Arrondi milliseconde d'un client JSON : on rétablit la valeur exacte.
    NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.horodatage_creation_facture() FROM PUBLIC, anon, authenticated;

DO $trg$
BEGIN
  EXECUTE 'DROP TRIGGER IF EXISTS trg_horodatage_creation_facture ON public.factures';
  EXECUTE 'CREATE TRIGGER trg_horodatage_creation_facture
             BEFORE INSERT OR UPDATE ON public.factures
             FOR EACH ROW
             EXECUTE FUNCTION public.horodatage_creation_facture()';
END $trg$;


-- ── 7. Garde des factures ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.garde_facture_emise()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER            -- écrit audit_logs et lit auth.users quel que soit l'appelant
SET search_path = public
AS $function$
DECLARE
  -- Colonnes figées dès l'émission → libellé affiché dans le message.
  -- Comparaison par to_jsonb, après normalisation (R9) : une chaîne est
  -- remplacée par NULLIF(btrim(x), '') ; JSON null et absence valent NULL ;
  -- 1800 = 1800.00 (égalité numérique jsonb).
  c_figees CONSTANT jsonb := jsonb_build_object(
    'id',                        'identifiant',
    'numero_facture',            'numéro',
    'type_facture',              'type de pièce',
    'facture_origine_id',        'facture d''origine',
    'centre_id',                 'centre émetteur',
    -- created_at N'EST PAS ICI : il est protégé, à tous les statuts, par son
    -- seul déclencheur dédié (section 6), qui nomme la colonne et n'ajoute pas
    -- le conseil « annulez la facture » (R4).
    'date_emission',             'date d''émission',
    'date_echeance',             'date d''échéance',
    'montant_total',             'montant TTC',
    'montant_ht',                'montant HT',
    'montant_tva',               'montant de TVA',
    'devise',                    'devise',
    'regime_tva',                'régime de TVA',
    'motif_exoneration_tva',     'mention d''exonération de TVA',
    'type_financement',          'type de financement',
    'contact_id',                'client (apprenant)',
    'client_partner_id',         'client (entreprise)',
    'buyer_type',                'type d''acheteur',
    'buyer_name_snapshot',       'nom de l''acheteur',
    'buyer_siren',               'SIREN de l''acheteur',
    'buyer_siret',               'SIRET de l''acheteur',
    'buyer_tva_intracom',        'TVA intracommunautaire de l''acheteur',
    'buyer_country',             'pays de l''acheteur',
    'buyer_address_snapshot',    'adresse de facturation',
    'delivery_address_snapshot', 'adresse de livraison',
    'buyer_email_facturation',   'e-mail de facturation',
    'buyer_platform_provider',   'plateforme de l''acheteur',
    'buyer_routing_code',        'code de routage de l''acheteur',
    'operation_category',        'catégorie d''opération',
    'service_period_start',      'début de prestation',
    'service_period_end',        'fin de prestation',
    'commentaires',              'observations imprimées'
  );
  -- Transmission électronique : figée dès qu'une transmission RÉELLE est
  -- enregistrée (R6) — voir v_transmission_reelle plus bas.
  c_transmission CONSTANT jsonb := jsonb_build_object(
    'e_invoice_status',          'statut de transmission électronique',
    'platform_provider',         'plateforme de transmission',
    'platform_reference_id',     'référence de transmission',
    'platform_last_sync_at',     'date de synchronisation avec la plateforme',
    'platform_error_message',    'message de la plateforme'
  );
  -- Identité que merge_contacts peut COMPLÉTER (NULL → valeur) pendant une
  -- fusion (R7c) : celle d'un particulier.
  c_snapshot_fusion CONSTANT text[] := ARRAY[
    'buyer_type', 'buyer_name_snapshot', 'buyer_email_facturation',
    'buyer_country', 'buyer_address_snapshot'
  ];
  v_old jsonb;
  v_new jsonb;
  v_o jsonb;
  v_n jsonb;
  v_col text;
  v_refusees text[] := ARRAY[]::text[];
  v_refusees_transmission text[] := ARRAY[]::text[];
  v_fusion text;
  v_en_fusion boolean := false;
  v_pile text;
  v_transmission_reelle boolean;
  v_statut_old text;
  v_uid uuid;
  v_role text;
  v_action text;
  -- Somme des lignes (déjà figées), lue une seule fois et seulement si besoin.
  v_lignes_lues boolean := false;
  v_lignes_n integer;
  v_lignes_ht numeric;
  v_lignes_tva numeric;
  v_propose numeric;
BEGIN
  v_statut_old := CASE OLD.statut::text
    WHEN 'brouillon' THEN 'Brouillon' WHEN 'emise' THEN 'Émise' WHEN 'payee' THEN 'Payée'
    WHEN 'partiel' THEN 'Partiellement payée' WHEN 'impayee' THEN 'Impayée'
    WHEN 'annulee' THEN 'Annulée' ELSE OLD.statut::text END;

  -- ── DELETE ────────────────────────────────────────────────────────────────
  IF TG_OP = 'DELETE' THEN
    IF OLD.statut <> 'brouillon' THEN
      RAISE EXCEPTION USING
        MESSAGE = format(
          'Suppression refusée : la facture %s n''est plus un brouillon (statut « %s »). Une facture émise ne se supprime jamais.',
          OLD.numero_facture, v_statut_old) || public.conseil_facture_emise(),
        HINT = 'garde_facture_emise';
    END IF;
    RETURN OLD;
  END IF;

  -- ── UPDATE d'un brouillon : aucune contrainte ici ────────────────────────
  -- (created_at reste protégé par trg_horodatage_creation_facture.)
  IF OLD.statut = 'brouillon' THEN
    RETURN NEW;
  END IF;

  -- ── Corbeille ─────────────────────────────────────────────────────────────
  IF NEW.deleted_at IS NOT NULL AND NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
    RAISE EXCEPTION USING
      MESSAGE = format(
        'Mise à la corbeille refusée : la facture %s est émise (statut « %s »). Une facture émise ne se supprime pas.',
        OLD.numero_facture, v_statut_old) || public.conseil_facture_emise(),
      HINT = 'garde_facture_emise';
  END IF;

  -- ── Statut ────────────────────────────────────────────────────────────────
  IF NEW.statut IS DISTINCT FROM OLD.statut THEN
    IF NEW.statut = 'brouillon' THEN
      RAISE EXCEPTION USING
        MESSAGE = format(
          'Retour en brouillon refusé : la facture %s est émise et ne peut plus redevenir un brouillon.',
          OLD.numero_facture) || public.conseil_facture_emise(),
        HINT = 'garde_facture_emise';

    ELSIF NEW.statut = 'annulee' OR OLD.statut = 'annulee' THEN
      IF NOT public.factures_annulation_manuelle_permise() THEN
        IF NEW.statut = 'annulee' THEN
          RAISE EXCEPTION USING
            MESSAGE = format(
              'Annulation refusée : la facture %s est émise ; une facture émise s''annule désormais par un avoir.',
              OLD.numero_facture),
            HINT = 'garde_facture_emise';
        ELSE
          RAISE EXCEPTION USING
            MESSAGE = format(
              'Réactivation refusée : la facture %s est annulée et ne peut plus changer de statut ; émettez une nouvelle facture.',
              OLD.numero_facture),
            HINT = 'garde_facture_emise';
        END IF;
      END IF;

      -- R8 : une personne connectée, administrateur, équipe ou super-admin.
      -- DEUX conditions, la ceinture ET les bretelles :
      --  • auth.uid() non NULL et rôle applicatif suffisant ;
      --  • le rôle de connexion n'est PAS service_role. Aujourd'hui un jeton de
      --    service ne porte pas de « sub » (api-v1 et execute-workflow créent
      --    leur client avec la seule clé de service, et les six fonctions qui
      --    propagent l'en-tête Authorization de l'utilisateur le font avec la
      --    clé ANON) : le premier test suffirait. Il suffirait pourtant qu'une
      --    future edge function construise un client avec la clé de service TOUT
      --    EN propageant les claims d'un utilisateur pour qu'un automate annule
      --    des factures au nom d'un administrateur. Le test est donc écrit.
      v_uid := auth.uid();
      v_role := COALESCE(
        NULLIF(btrim(auth.role()), ''),
        NULLIF(btrim(COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'role'), ''),
        '');
      IF v_role = 'service_role'
         OR v_uid IS NULL
         OR NOT (public.has_role(v_uid, 'admin'::public.app_role)
                 OR public.has_role(v_uid, 'staff'::public.app_role)
                 OR public.has_role(v_uid, 'super_admin'::public.app_role)) THEN
        IF NEW.statut = 'annulee' THEN
          RAISE EXCEPTION USING
            MESSAGE = format(
              'Annulation refusée : la facture %s ne peut être annulée que par une personne connectée à l''application (administrateur ou équipe). Une clé API ou un workflow automatique n''annule jamais une facture.',
              OLD.numero_facture),
            HINT = 'garde_facture_emise';
        ELSE
          RAISE EXCEPTION USING
            MESSAGE = format(
              'Réactivation refusée : la facture %s ne peut être réactivée que par une personne connectée à l''application (administrateur ou équipe). Une clé API ou un workflow automatique ne réactive jamais une facture.',
              OLD.numero_facture),
            HINT = 'garde_facture_emise';
        END IF;
      END IF;

      v_action := CASE WHEN NEW.statut = 'annulee' THEN 'ANNULATION_MANUELLE' ELSE 'REACTIVATION_MANUELLE' END;
    END IF;
  END IF;

  -- ── Contexte de fusion de contacts ────────────────────────────────────────
  -- DEUX conditions, et les deux sont exigées :
  --  • le paramètre de session campust3p.fusion_contacts, posé par
  --    merge_contacts avec set_config(…, true) (portée : la transaction ; remis
  --    à '' par la fonction), désigne bien la paire « <fusionnée>><conservée> » ;
  --  • merge_contacts(uuid,uuid) est RÉELLEMENT dans la pile d'appel PL/pgSQL.
  -- Le paramètre seul ne suffit pas : n'importe quelle session capable
  -- d'exécuter du SQL libre peut le poser (mesuré au banc sur la version 2).
  -- La pile d'appel, elle, ne se forge pas depuis PostgREST : il faudrait créer
  -- une fonction PL/pgSQL portant ce nom, donc des droits DDL que ni
  -- authenticated ni service_role n'ont sur ce schéma.
  v_fusion := COALESCE(current_setting('campust3p.fusion_contacts', true), '');
  IF v_fusion <> '' THEN
    GET DIAGNOSTICS v_pile = PG_CONTEXT;
    v_en_fusion := v_pile LIKE '%PL/pgSQL function merge_contacts(uuid,uuid) line%'
      AND OLD.contact_id IS NOT NULL
      AND NEW.contact_id IS NOT NULL
      AND OLD.contact_id::text = split_part(v_fusion, '>', 1)
      AND NEW.contact_id::text IN (split_part(v_fusion, '>', 1), split_part(v_fusion, '>', 2));
  END IF;

  -- ── Colonnes figées (R7c, R9, R10) ────────────────────────────────────────
  v_old := to_jsonb(OLD);
  v_new := to_jsonb(NEW);
  FOR v_col IN SELECT jsonb_object_keys(c_figees) LOOP
    v_o := v_old -> v_col;
    v_n := v_new -> v_col;
    IF jsonb_typeof(v_o) = 'string' THEN v_o := to_jsonb(NULLIF(btrim(v_o #>> '{}'), '')); END IF;
    IF jsonb_typeof(v_n) = 'string' THEN v_n := to_jsonb(NULLIF(btrim(v_n #>> '{}'), '')); END IF;
    IF jsonb_typeof(v_o) = 'null' THEN v_o := NULL; END IF;
    IF jsonb_typeof(v_n) = 'null' THEN v_n := NULL; END IF;
    IF v_o IS DISTINCT FROM v_n THEN
      IF v_en_fusion AND v_col = 'contact_id' THEN
        CONTINUE;
      END IF;
      IF v_en_fusion AND v_col = ANY (c_snapshot_fusion) AND v_o IS NULL THEN
        CONTINUE;
      END IF;

      -- MONTANTS DÉRIVÉS (R7e) : montant_ht et montant_tva peuvent passer de
      -- NULL à une valeur QUAND cette valeur est la somme des lignes de la
      -- facture, à 0,02 près (tolérance de la règle INVOICE_TOTAL_COHERENCE de
      -- M1), et QUE la facture a au moins une ligne. C'est le seul recours des
      -- factures créées DÉJÀ « emise » puis complétées par leurs lignes à la
      -- requête suivante (FactureLibreDialog, conversion de devis) : sans cela
      -- elles resteraient sans montant HT ni montant de TVA pour toujours, et
      -- le seul contournement mesuré était l'aller-retour emise → payee →
      -- emise, c'est-à-dire FALSIFIER LE STATUT DE PAIEMENT pour réparer un
      -- montant. Ce n'est pas une saisie libre : les lignes sont déjà
      -- immuables (sections 8 et 9), donc la valeur acceptée est un calcul.
      IF v_col IN ('montant_ht', 'montant_tva')
         AND v_o IS NULL AND jsonb_typeof(v_n) = 'number' THEN
        IF NOT v_lignes_lues THEN
          SELECT count(*), COALESCE(SUM(l.montant_ht), 0), COALESCE(SUM(l.montant_tva), 0)
            INTO v_lignes_n, v_lignes_ht, v_lignes_tva
            FROM public.facture_lignes l WHERE l.facture_id = OLD.id;
          v_lignes_lues := true;
        END IF;
        v_propose := (v_n #>> '{}')::numeric;
        -- BLOQUANT B : trois conditions, pas deux. Il ne suffit pas que la
        -- valeur proposée soit la somme d'une colonne : la SOMME DES LIGNES doit
        -- aussi concorder avec montant_total (à 0,02 près). Sinon la facture
        -- diverge (0k) et poser la somme des lignes graverait un montant faux
        -- (ex. une ligne « acompte » 100 sur une facture à 1800). montant_total
        -- est figé : OLD et NEW sont égaux pour un passage accepté.
        IF v_lignes_n > 0
           AND abs(v_propose - CASE v_col WHEN 'montant_ht' THEN v_lignes_ht ELSE v_lignes_tva END) < 0.02
           AND abs(v_lignes_ht + v_lignes_tva - COALESCE(OLD.montant_total, 0)) < 0.02 THEN
          CONTINUE;
        END IF;
      END IF;

      v_refusees := v_refusees || (c_figees ->> v_col);
    END IF;
  END LOOP;

  -- ── Transmission réelle ? (R6) ────────────────────────────────────────────
  -- Une transmission COMPTE quand un statut de transmission est enregistré ET
  -- que la référence n'est pas celle d'un envoi simulé. submit-pdp écrit
  -- aujourd'hui e_invoice_status = 'envoye' et une référence 'LOCAL-<horodatage>'
  -- SANS avoir rien transmis (« TODO : appel HTTP réel », { simulated: true }) :
  -- figer sur cette marque rendrait un faux accusé définitif. Inversement, le
  -- figeage ne dépend plus du seul mot 'envoye' : n'importe quel autre statut
  -- d'accusé fige aussi, sinon il suffisait de l'éviter pour tout réécrire.
  -- Sans référence de plateforme, rien n'a été enregistré : le bloc reste libre
  -- (un statut « en_attente » ou « erreur » n'est pas une transmission).
  -- La tolérance des marques 'LOCAL-%' est une DETTE DATÉE, bornée par un
  -- interrupteur : quiconque peut écrire platform_reference_id pourrait sinon y
  -- poser 'LOCAL-camouflage' avant toute transmission et garder le bloc
  -- réécrivable à vie. Le lot « vraie PDP » passe l'interrupteur à false en même
  -- temps qu'il remet ces marques à zéro (section 1bis).
  v_transmission_reelle :=
        NULLIF(btrim(OLD.e_invoice_status), '') IS NOT NULL
    AND NULLIF(btrim(OLD.e_invoice_status), '') NOT IN ('non_applicable', 'not_required')
    AND NULLIF(btrim(OLD.platform_reference_id), '') IS NOT NULL
    AND NOT (btrim(OLD.platform_reference_id) LIKE 'LOCAL-%'
             AND public.factures_transmission_simulee_toleree());

  -- ── Factur-X (R6) : figé une fois la facture réellement transmise ─────────
  -- Avant transmission, le XML n'est qu'un brouillon technique dérivé de
  -- données déjà figées : le régénérer ne change rien à la pièce comptable, et
  -- generate-facturx lit la table `centres`, qui peut encore être incomplète
  -- (vendeur « Vendeur », SIREN vide).
  IF v_transmission_reelle THEN
    v_o := v_old -> 'facturx_xml';
    v_n := v_new -> 'facturx_xml';
    IF jsonb_typeof(v_o) = 'string' THEN v_o := to_jsonb(NULLIF(btrim(v_o #>> '{}'), '')); END IF;
    IF jsonb_typeof(v_n) = 'string' THEN v_n := to_jsonb(NULLIF(btrim(v_n #>> '{}'), '')); END IF;
    IF jsonb_typeof(v_o) = 'null' THEN v_o := NULL; END IF;
    IF jsonb_typeof(v_n) = 'null' THEN v_n := NULL; END IF;
    IF v_o IS DISTINCT FROM v_n THEN
      v_refusees_transmission := v_refusees_transmission || 'fichier Factur-X'::text;
    END IF;
  END IF;

  -- ── Transmission électronique (R6) : figée une fois réellement transmise ──
  IF v_transmission_reelle THEN
    FOR v_col IN SELECT jsonb_object_keys(c_transmission) LOOP
      v_o := v_old -> v_col;
      v_n := v_new -> v_col;
      IF jsonb_typeof(v_o) = 'string' THEN v_o := to_jsonb(NULLIF(btrim(v_o #>> '{}'), '')); END IF;
      IF jsonb_typeof(v_n) = 'string' THEN v_n := to_jsonb(NULLIF(btrim(v_n #>> '{}'), '')); END IF;
      IF jsonb_typeof(v_o) = 'null' THEN v_o := NULL; END IF;
      IF jsonb_typeof(v_n) = 'null' THEN v_n := NULL; END IF;
      IF v_o IS DISTINCT FROM v_n THEN
        v_refusees_transmission := v_refusees_transmission || (c_transmission ->> v_col);
      END IF;
    END LOOP;
  END IF;

  IF cardinality(v_refusees) > 0 THEN
    RAISE EXCEPTION USING
      MESSAGE = format(
        'Modification refusée : la facture %s est émise et son contenu est figé (%s).',
        OLD.numero_facture, array_to_string(v_refusees, ', ')) || public.conseil_facture_emise(),
      HINT = 'garde_facture_emise';
  END IF;

  -- Message distinct pour le bloc « transmission électronique » : le conseil
  -- « annulez la facture » n'a aucun sens ici, et l'appelant doit savoir par
  -- quoi passer. Sans cela, le jour où submit-pdp transmettra vraiment, l'écran
  -- PdpTransmissionPanel resterait figé sur « envoye » et generate-facturx
  -- échouerait par un toast, sans qu'aucun code du dépôt ne dise pourquoi.
  IF cardinality(v_refusees_transmission) > 0 THEN
    RAISE EXCEPTION USING
      MESSAGE = format(
        'Modification refusée : la facture %s a été transmise à la plateforme de facturation électronique ; ces éléments sont figés (%s). L''accusé d''une plateforme se pose par la fonction dédiée du lot e-invoicing, pas par une mise à jour directe.',
        OLD.numero_facture, array_to_string(v_refusees_transmission, ', ')),
      HINT = 'garde_facture_emise';
  END IF;

  -- ── Trace de l'annulation / réactivation (phase 1), une fois tout accepté ──
  IF v_action IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      table_name, record_id, action, old_data, new_data, changed_fields,
      user_id, user_email, centre_id, created_at
    ) VALUES (
      'factures',
      OLD.id,
      v_action,
      jsonb_build_object('statut', OLD.statut, 'numero_facture', OLD.numero_facture,
                         'montant_total', OLD.montant_total, 'date_emission', OLD.date_emission),
      jsonb_build_object('statut', NEW.statut, 'role', auth.role(),
                         'motif', 'avant livraison des avoirs (garde_facture_emise, phase 1)'),
      ARRAY['statut'],
      v_uid,
      (SELECT u.email FROM auth.users u WHERE u.id = v_uid),
      OLD.centre_id,
      now()
    );
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.garde_facture_emise() IS
  'Garde des factures émises (D1, D2, D6 du 11/09/2026, révision 2) : ni suppression, ni corbeille, ni retour en brouillon, ni modification du contenu figé (identité de l''acheteur comprise) ; annulation manuelle par une personne connectée seulement ; aucune exemption de rôle ; seule exception : merge_contacts (campust3p.fusion_contacts). Ne jamais désactiver.';

REVOKE EXECUTE ON FUNCTION public.garde_facture_emise() FROM PUBLIC, anon, authenticated;

-- UN SEUL BLOC DO = UNE SEULE INSTRUCTION. Écrit en deux instructions, un arrêt
-- du moteur entre le DROP et le CREATE, LORS D'UN REJEU, retirait la garde
-- réellement en place : mesuré, la SUPPRESSION PHYSIQUE d'une facture émise
-- redevenait possible et la réécriture de montant_total aussi, sans aucun
-- signal (les assertions finales ne sont jamais atteintes dans ce cas).
DO $trg$
BEGIN
  EXECUTE 'DROP TRIGGER IF EXISTS trg_garde_facture_emise ON public.factures';
  EXECUTE 'CREATE TRIGGER trg_garde_facture_emise
             BEFORE UPDATE OR DELETE ON public.factures
             FOR EACH ROW
             EXECUTE FUNCTION public.garde_facture_emise()';
END $trg$;

COMMENT ON TRIGGER trg_garde_facture_emise ON public.factures IS
  'Immuabilité des factures émises. Son nom doit trier AVANT trg_snapshot_facture_on_emission. Ne jamais désactiver (pas de DISABLE TRIGGER USER ni de session_replication_role sur factures).';


-- ── 8. Garde des lignes : modification et suppression (R5) ─────────────────
CREATE OR REPLACE FUNCTION public.garde_lignes_facture_emise()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER            -- lit et verrouille la facture même si la RLS la masquerait
SET search_path = public
AS $function$
DECLARE
  c_figees CONSTANT jsonb := jsonb_build_object(
    'id',               'identifiant',
    'facture_id',       'facture',
    'description',      'libellé',
    'quantite',         'quantité',
    'prix_unitaire_ht', 'prix unitaire HT',
    'tva_percent',      'taux de TVA',
    'ordre',            'ordre d''affichage',
    'unite',            'unité',
    'code_produit',     'code produit',
    'created_at',       'date de création'
  );
  -- montant_ht / montant_tva / montant_ttc sont GENERATED à partir des colonnes
  -- ci-dessus : les figer suffit. Liens catalogue : seul le passage à NULL est
  -- permis (ON DELETE SET NULL).
  v_statut public.facture_statut;
  v_numero text;
  v_old jsonb;
  v_new jsonb;
  v_col text;
  v_refusees text[] := ARRAY[]::text[];
BEGIN
  -- FOR SHARE : une émission concurrente de cette facture (UPDATE) attend la
  -- fin de cette transaction ; si elle a eu lieu avant, on lit le statut émis.
  SELECT f.statut, f.numero_facture INTO v_statut, v_numero
  FROM public.factures f WHERE f.id = OLD.facture_id
  FOR SHARE;

  -- NOT FOUND : la facture est en train d'être supprimée et la ligne part en
  -- cascade. La garde des factures n'autorise cette suppression que pour un
  -- brouillon : on laisse passer.
  IF FOUND AND v_statut <> 'brouillon' THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION USING
        MESSAGE = format(
          'Suppression de ligne refusée : la facture %s est émise et ses lignes sont figées.',
          v_numero) || public.conseil_facture_emise(),
        HINT = 'garde_facture_emise';
    END IF;

    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    FOR v_col IN SELECT jsonb_object_keys(c_figees) LOOP
      IF (v_old -> v_col) IS DISTINCT FROM (v_new -> v_col) THEN
        v_refusees := v_refusees || (c_figees ->> v_col);
      END IF;
    END LOOP;
    IF (v_old -> 'catalogue_formation_id') IS DISTINCT FROM (v_new -> 'catalogue_formation_id')
       AND jsonb_typeof(v_new -> 'catalogue_formation_id') IS DISTINCT FROM 'null' THEN
      v_refusees := v_refusees || 'formation du catalogue'::text;
    END IF;
    IF (v_old -> 'produit_service_id') IS DISTINCT FROM (v_new -> 'produit_service_id')
       AND jsonb_typeof(v_new -> 'produit_service_id') IS DISTINCT FROM 'null' THEN
      v_refusees := v_refusees || 'produit ou service'::text;
    END IF;

    IF cardinality(v_refusees) > 0 THEN
      RAISE EXCEPTION USING
        MESSAGE = format(
          'Modification de ligne refusée : la facture %s est émise et ses lignes sont figées (%s).',
          v_numero, array_to_string(v_refusees, ', ')) || public.conseil_facture_emise(),
        HINT = 'garde_facture_emise';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  -- Déplacer une ligne VERS une facture émise revient à y ajouter une ligne.
  IF NEW.facture_id IS DISTINCT FROM OLD.facture_id THEN
    SELECT f.statut, f.numero_facture INTO v_statut, v_numero
    FROM public.factures f WHERE f.id = NEW.facture_id
    FOR SHARE;
    IF FOUND AND v_statut <> 'brouillon' THEN
      RAISE EXCEPTION USING
        MESSAGE = format(
          'Ajout de ligne refusé : la facture %s est émise et ses lignes sont figées.',
          v_numero) || public.conseil_facture_emise(),
        HINT = 'garde_facture_emise';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.garde_lignes_facture_emise() FROM PUBLIC, anon, authenticated;

DO $trg$
BEGIN
  EXECUTE 'DROP TRIGGER IF EXISTS trg_garde_lignes_facture_emise ON public.facture_lignes';
  EXECUTE 'CREATE TRIGGER trg_garde_lignes_facture_emise
             BEFORE UPDATE OR DELETE ON public.facture_lignes
             FOR EACH ROW
             EXECUTE FUNCTION public.garde_lignes_facture_emise()';
END $trg$;


-- ── 9. Garde des lignes : insertion (R4, R5) ────────────────────────────────
-- Cinq chemins créent une facture DÉJÀ émise puis, dans la requête suivante,
-- insèrent TOUTES ses lignes en UNE instruction (FactureLibreDialog,
-- FactureFormDialog en création « Émise », useDevis, facture-express ;
-- PaiementsTab n'insère aucune ligne). Règle : sur une facture non brouillon,
-- une instruction INSERT n'est acceptée que si (a) la facture n'avait AUCUNE
-- ligne avant cette instruction et (b) sa date de création, POSÉE PAR LE
-- SERVEUR (section 6), date de moins de 15 minutes. Déclencheur d'instruction :
-- un INSERT de plusieurs lignes voit toutes ses lignes d'un coup.
-- Toutes les factures visées sont verrouillées FOR SHARE, brouillons compris
-- (dans l'ordre des identifiants) : une émission concurrente attend la fin de
-- l'insertion et calcule ses montants sur les lignes validées.
CREATE OR REPLACE FUNCTION public.garde_lignes_facture_emise_insertion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT f.id, f.statut, f.numero_facture, f.created_at
    FROM public.factures f
    WHERE f.id IN (SELECT n.facture_id FROM nouvelles_lignes n)
    ORDER BY f.id
    FOR SHARE
  LOOP
    CONTINUE WHEN r.statut = 'brouillon';
    IF r.created_at < now() - interval '15 minutes'
       OR EXISTS (
         SELECT 1 FROM public.facture_lignes l
         WHERE l.facture_id = r.id
           AND l.id NOT IN (SELECT n.id FROM nouvelles_lignes n)
       )
    THEN
      RAISE EXCEPTION USING
        MESSAGE = format(
          'Ajout de ligne refusé : la facture %s est émise et ses lignes sont figées.',
          r.numero_facture) || public.conseil_facture_emise(),
        HINT = 'garde_facture_emise';
    END IF;
  END LOOP;
  RETURN NULL;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.garde_lignes_facture_emise_insertion() FROM PUBLIC, anon, authenticated;

DO $trg$
BEGIN
  EXECUTE 'DROP TRIGGER IF EXISTS trg_garde_lignes_facture_emise_insert ON public.facture_lignes';
  EXECUTE 'CREATE TRIGGER trg_garde_lignes_facture_emise_insert
             AFTER INSERT ON public.facture_lignes
             REFERENCING NEW TABLE AS nouvelles_lignes
             FOR EACH STATEMENT
             EXECUTE FUNCTION public.garde_lignes_facture_emise_insertion()';
END $trg$;


-- ── 10. TRUNCATE (R3) ───────────────────────────────────────────────────────
-- Un TRUNCATE ne déclenche aucun déclencheur de ligne : sans ceci, il viderait
-- les factures émises d'un coup (mesuré sur le banc de la v1, service_role).
CREATE OR REPLACE FUNCTION public.garde_vidage_factures()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  RAISE EXCEPTION USING
    MESSAGE = CASE TG_TABLE_NAME
      WHEN 'facture_lignes' THEN 'Vidage refusé : les lignes de facture ne se vident jamais d''un bloc. Une facture émise et ses lignes ne se suppriment pas.'
      ELSE 'Vidage refusé : la table des factures ne se vide jamais. Une facture émise ne se supprime pas.'
    END,
    HINT = 'garde_facture_emise';
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.garde_vidage_factures() FROM PUBLIC, anon, authenticated;

DO $trg$
BEGIN
  EXECUTE 'DROP TRIGGER IF EXISTS trg_garde_vidage_factures ON public.factures';
  EXECUTE 'CREATE TRIGGER trg_garde_vidage_factures
             BEFORE TRUNCATE ON public.factures
             FOR EACH STATEMENT
             EXECUTE FUNCTION public.garde_vidage_factures()';
END $trg$;

DO $trg$
BEGIN
  EXECUTE 'DROP TRIGGER IF EXISTS trg_garde_vidage_facture_lignes ON public.facture_lignes';
  EXECUTE 'CREATE TRIGGER trg_garde_vidage_facture_lignes
             BEFORE TRUNCATE ON public.facture_lignes
             FOR EACH STATEMENT
             EXECUTE FUNCTION public.garde_vidage_factures()';
END $trg$;

REVOKE TRUNCATE ON TABLE public.factures, public.facture_lignes FROM PUBLIC, anon, authenticated, service_role;


-- ── 11. Policy de suppression physique : CONSERVÉE TELLE QUELLE ─────────────
-- La version 2 de ce fichier la supprimait. C'était une erreur, et elle est
-- corrigée ici sans DDL : une policy de DELETE qui ne laisse pas passer la
-- ligne ne produit AUCUNE erreur — le DELETE n'affecte simplement aucune ligne
-- et renvoie « succès, 0 ligne ». L'écran afficherait « supprimée » et la
-- facture serait toujours là. C'est le pire mode d'échec possible pour une
-- suppression, et il vaut aussi pour une policy restreinte aux brouillons.
-- La policy centre_delete_factures reste donc exactement celle de
-- 20260717224714, et c'est la GARDE (section 7, BEFORE DELETE, sans exemption
-- de rôle) qui refuse la suppression d'une facture émise — avec un message
-- lisible par l'utilisateur, quel que soit le rôle.
-- Rappel : aucun chemin du front, des edge functions ou du SQL ne fait de
-- DELETE physique sur factures (suppression = soft_delete_record, CLAUDE.md) ;
-- le seul DELETE possible aujourd'hui est celui d'un brouillon, qui reste
-- permis, et la cascade depuis contacts, que la garde refuse.
-- (Aucune instruction dans cette section : c'est volontaire.)


-- ── 12. merge_contacts : exemption explicite (D2, R11) ─────────────────────
-- Version vérifiée en tête (0a). Corps identique à 20260721140000, plus :
--   1bis.    pose du contexte de fusion (paire fusionnée>conservée) ;
--   1ter.    filet de sécurité : fige l'identité des factures émises de la fiche
--            fusionnée qui n'en ont AUCUNE (buyer_name_snapshot NULL), depuis
--            la fiche d'origine. Après le rattrapage R7a il n'y en a plus :
--            la fusion ne change alors que contact_id, jamais l'identité
--            imprimée (R11). Accès inchangé : admin ou staff.
--   1quater. remise à '' du contexte dès la fin des transferts.
CREATE OR REPLACE FUNCTION public.merge_contacts(p_garder uuid, p_fusionner uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  v_centre_garder uuid;
  v_centre_fusionner uuid;
  v_nom_fusionne text;
BEGIN
  IF p_garder = p_fusionner THEN
    RAISE EXCEPTION 'merge_contacts: les deux identifiants sont identiques';
  END IF;

  SELECT centre_id INTO v_centre_garder
    FROM contacts WHERE id = p_garder AND deleted_at IS NULL;
  SELECT centre_id, trim(coalesce(prenom,'') || ' ' || coalesce(nom,''))
    INTO v_centre_fusionner, v_nom_fusionne
    FROM contacts WHERE id = p_fusionner AND deleted_at IS NULL;

  IF v_centre_garder IS NULL OR v_centre_fusionner IS NULL THEN
    RAISE EXCEPTION 'merge_contacts: fiche introuvable ou déjà supprimée';
  END IF;

  -- Autorisation : admin/staff avec accès aux centres des DEUX fiches.
  IF NOT (
    has_centre_access(v_centre_garder)
    AND has_centre_access(v_centre_fusionner)
    AND ((SELECT has_role(auth.uid(), 'admin'::app_role))
         OR (SELECT has_role(auth.uid(), 'staff'::app_role)))
  ) THEN
    RAISE EXCEPTION 'merge_contacts: accès refusé';
  END IF;

  -- 1bis. Contexte de fusion lu par garde_facture_emise (portée transaction).
  PERFORM set_config('campust3p.fusion_contacts', p_fusionner::text || '>' || p_garder::text, true);

  -- 1ter. Filet : factures émises de la fiche fusionnée SANS identité figée.
  --       Les factures d'entreprise (client_partner_id) ne sont pas concernées.
  UPDATE public.factures f SET
    buyer_type              = COALESCE(NULLIF(btrim(f.buyer_type), ''), NULLIF(btrim(s.identite->>'buyer_type'), '')),
    buyer_name_snapshot     = COALESCE(NULLIF(btrim(f.buyer_name_snapshot), ''), NULLIF(btrim(s.identite->>'buyer_name_snapshot'), '')),
    buyer_email_facturation = COALESCE(NULLIF(btrim(f.buyer_email_facturation), ''), NULLIF(btrim(s.identite->>'buyer_email_facturation'), '')),
    buyer_country           = COALESCE(NULLIF(btrim(f.buyer_country), ''), NULLIF(btrim(s.identite->>'buyer_country'), '')),
    buyer_address_snapshot  = COALESCE(f.buyer_address_snapshot, s.identite->'buyer_address_snapshot')
  FROM (SELECT public.identite_acheteur_facture(p_fusionner, NULL) AS identite) s
  WHERE f.contact_id = p_fusionner
    AND f.statut <> 'brouillon'
    AND f.client_partner_id IS NULL
    AND NULLIF(btrim(f.buyer_name_snapshot), '') IS NULL
    AND s.identite IS NOT NULL;

  -- 1. Réassigner dynamiquement toute FK public.* -> contacts(id).
  FOR r IN
    SELECT tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_name = tc.constraint_name
     AND kcu.table_schema = tc.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND ccu.table_name = 'contacts'
      AND ccu.column_name = 'id'
      AND NOT (tc.table_name = 'contacts')
  LOOP
    EXECUTE format('UPDATE public.%I SET %I = $1 WHERE %I = $2',
                   r.table_name, r.column_name, r.column_name)
      USING p_garder, p_fusionner;
  END LOOP;

  -- 1quater. Fin de l'exemption : plus aucune écriture de facture après ce point.
  PERFORM set_config('campust3p.fusion_contacts', '', true);

  -- 2. Compléter les champs vides de la fiche conservée (jamais d'écrasement).
  UPDATE contacts g SET
    email              = COALESCE(g.email, f.email),
    telephone          = COALESCE(g.telephone, f.telephone),
    email_facturation  = COALESCE(g.email_facturation, f.email_facturation),
    date_naissance     = COALESCE(g.date_naissance, f.date_naissance),
    ville_naissance    = COALESCE(g.ville_naissance, f.ville_naissance),
    rue                = COALESCE(g.rue, f.rue),
    code_postal        = COALESCE(g.code_postal, f.code_postal),
    ville              = COALESCE(g.ville, f.ville),
    formation          = COALESCE(g.formation, f.formation),
    email_interne      = COALESCE(g.email_interne, f.email_interne),
    email_interne_consulte_le = COALESCE(g.email_interne_consulte_le, f.email_interne_consulte_le)
  FROM contacts f
  WHERE g.id = p_garder AND f.id = p_fusionner;

  -- 3. Journaliser la fusion sur la fiche conservée.
  INSERT INTO contact_historique (contact_id, type, titre, contenu, auto_category, auto_metadata)
  VALUES (
    p_garder,
    'note',
    '[AUTO] Fusion de fiches',
    format('Fiche « %s » (%s) fusionnée dans celle-ci : historique, documents, factures et examens transférés.', v_nom_fusionne, p_fusionner),
    'fusion_contacts',
    jsonb_build_object('fusionne_id', p_fusionner, 'fusionne_nom', v_nom_fusionne)
  );

  -- 4. Archiver la fiche fusionnée (soft delete, motif maison).
  UPDATE contacts
     SET deleted_at = now(),
         deleted_by = auth.uid(),
         delete_reason = format('Fusionné dans %s', p_garder),
         archived = true
   WHERE id = p_fusionner;

  INSERT INTO audit_logs (table_name, record_id, action, user_id, user_email, new_data)
  VALUES (
    'contacts',
    p_fusionner,
    'MERGE_INTO',
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    jsonb_build_object('merged_into', p_garder, 'merged_at', now())
  );

  RETURN true;
END;
$function$;


-- ── 13. Assertions finales : la migration échoue si l'état obtenu est faux ──
DO $assertions$
DECLARE
  v_inconnus text;
  v_n integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.factures'::regclass
      AND tgname = 'trg_garde_facture_emise' AND tgenabled = 'O'
  ) THEN
    RAISE EXCEPTION 'Assertion : trg_garde_facture_emise absent ou désactivé';
  END IF;

  -- BEFORE UPDATE (tgtype : BEFORE=2, UPDATE=16) qui passent APRÈS la garde.
  SELECT string_agg(t.tgname, ', ') INTO v_inconnus
  FROM pg_trigger t
  WHERE t.tgrelid = 'public.factures'::regclass
    AND NOT t.tgisinternal
    AND (t.tgtype & 2) = 2
    AND (t.tgtype & 16) = 16
    AND (t.tgname COLLATE "C") > ('trg_garde_facture_emise' COLLATE "C")
    AND t.tgname NOT IN ('trg_horodatage_creation_facture', 'trg_immutable_centre_id_factures',
                         'trg_snapshot_facture_on_emission', 'update_factures_updated_at');
  IF v_inconnus IS NOT NULL THEN
    RAISE EXCEPTION 'Assertion : déclencheur(s) BEFORE UPDATE inconnu(s) après la garde : %', v_inconnus;
  END IF;

  -- Tous les déclencheurs attendus, actifs (dont les trois du rattrapage).
  SELECT string_agg(n, ', ') INTO v_inconnus
  FROM unnest(ARRAY['audit_factures','trg_auto_set_centre_id_factures','trg_facture_payment_regression',
                    'trg_immutable_centre_id_factures','trg_persist_facture_compliance',
                    'trg_snapshot_facture_on_emission','trg_sync_inscription_paiement_on_facture',
                    'update_factures_updated_at','trg_garde_facture_emise','trg_horodatage_creation_facture',
                    'trg_snapshot_facture_on_insert','trg_garde_vidage_factures']) AS n
  WHERE NOT EXISTS (SELECT 1 FROM pg_trigger t
                    WHERE t.tgrelid = 'public.factures'::regclass AND t.tgname = n AND t.tgenabled = 'O');
  IF v_inconnus IS NOT NULL THEN
    RAISE EXCEPTION 'Assertion : déclencheur(s) de factures absent(s) ou désactivé(s) : %', v_inconnus;
  END IF;

  IF (SELECT count(*) FROM pg_trigger
      WHERE tgrelid = 'public.facture_lignes'::regclass
        AND tgname IN ('trg_garde_lignes_facture_emise', 'trg_garde_lignes_facture_emise_insert',
                       'trg_garde_vidage_facture_lignes')
        AND tgenabled = 'O') <> 3 THEN
    RAISE EXCEPTION 'Assertion : gardes de facture_lignes absentes ou désactivées';
  END IF;

  -- R3 : plus aucun rôle d'API ne peut vider ces tables.
  SELECT string_agg(r || ' sur ' || t, ', ') INTO v_inconnus
  FROM unnest(ARRAY['anon','authenticated','service_role']) AS r,
       unnest(ARRAY['public.factures','public.facture_lignes']) AS t
  WHERE EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r)
    AND has_table_privilege(r, t, 'TRUNCATE');
  IF v_inconnus IS NOT NULL THEN
    RAISE EXCEPTION 'Assertion : privilège TRUNCATE encore présent : %', v_inconnus;
  END IF;

  -- R2 : interrupteurs présents.
  IF to_regprocedure('public.factures_annulation_manuelle_permise()') IS NULL THEN
    RAISE EXCEPTION 'Assertion : factures_annulation_manuelle_permise() absente';
  END IF;
  IF to_regprocedure('public.factures_transmission_simulee_toleree()') IS NULL THEN
    RAISE EXCEPTION 'Assertion : factures_transmission_simulee_toleree() absente';
  END IF;
  IF public.factures_transmission_simulee_toleree() THEN
    RAISE NOTICE 'RAPPEL : factures_transmission_simulee_toleree() vaut true — une référence de transmission « LOCAL-… » n''est pas considérée comme une transmission, et reste donc réécrivable. Cet interrupteur doit être passé à false par le lot « vraie PDP », dans la migration qui remplace la simulation de submit-pdp et remet les marques LOCAL-%% à zéro.';
  END IF;

  -- R5 : lectures verrouillantes.
  IF (SELECT prosrc FROM pg_proc WHERE oid = 'public.garde_lignes_facture_emise()'::regprocedure) NOT LIKE '%FOR SHARE%'
     OR (SELECT prosrc FROM pg_proc WHERE oid = 'public.garde_lignes_facture_emise_insertion()'::regprocedure) NOT LIKE '%FOR SHARE%' THEN
    RAISE EXCEPTION 'Assertion : les gardes de lignes ne verrouillent pas la facture (FOR SHARE)';
  END IF;

  -- R7 : figeage à l'émission en place, et rattrapage complet.
  IF (SELECT prosrc FROM pg_proc WHERE oid = 'public.snapshot_facture_on_emission()'::regprocedure) NOT LIKE '%campust3p:snapshot_v2%' THEN
    RAISE EXCEPTION 'Assertion : snapshot_facture_on_emission n''est pas la version 2';
  END IF;
  SELECT count(*) INTO v_n FROM public.factures
  WHERE statut <> 'brouillon' AND NULLIF(btrim(buyer_name_snapshot), '') IS NULL;
  IF v_n > 0 THEN
    RAISE EXCEPTION 'Assertion : % facture(s) émise(s) sans coordonnées figées (nom d''acheteur absent ou vide)', v_n;
  END IF;

  -- R7d : aucune facture émise dont les lignes CONCORDENT avec le montant TTC
  -- ne doit rester sans montant dérivé — elle serait définitivement non
  -- conforme (M1 : INVOICE_HT 8 points et INVOICE_TVA 5 points, bloquants) et
  -- son Factur-X ne s'équilibrerait pas. BLOQUANT B : les factures dont les
  -- lignes NE concordent PAS avec montant_total (0k) sont laissées à NULL
  -- exprès (poser une somme fausse serait pire) : elles ne déclenchent pas
  -- cette assertion, elles ont été comptées et signalées en section 0.
  SELECT count(*) INTO v_n FROM public.factures f
  CROSS JOIN LATERAL (
    SELECT count(*) AS lignes,
           COALESCE(SUM(l.montant_ht), 0) AS total_ht,
           COALESCE(SUM(l.montant_tva), 0) AS total_tva
    FROM public.facture_lignes l WHERE l.facture_id = f.id
  ) t
  WHERE f.statut <> 'brouillon'
    AND (f.montant_ht IS NULL OR f.montant_tva IS NULL)
    AND t.lignes > 0
    AND abs(t.total_ht + t.total_tva - COALESCE(f.montant_total, 0)) < 0.02;
  IF v_n > 0 THEN
    RAISE EXCEPTION 'Assertion : % facture(s) émise(s) dont les lignes concordent avec le montant TTC restent sans montant HT ou sans montant de TVA', v_n;
  END IF;

  -- R7 : buyer_siren doit être POSÉ par la logique d'identité, pas seulement
  -- figé — sinon les Factur-X B2B partent sans l'identifiant légal de l'acheteur
  -- et plus personne ne peut le corriger.
  IF (SELECT prosrc FROM pg_proc WHERE oid = 'public.identite_acheteur_facture(uuid, uuid)'::regprocedure)
     NOT LIKE '%buyer_siren%' THEN
    RAISE EXCEPTION 'Assertion : identite_acheteur_facture ne pose pas buyer_siren, qui resterait figé à NULL pour toutes les factures d''entreprise';
  END IF;

  -- R8 : le refus de service_role doit être écrit, pas seulement déduit de
  -- l'absence de « sub » dans un jeton de service.
  IF (SELECT prosrc FROM pg_proc WHERE oid = 'public.garde_facture_emise()'::regprocedure)
     NOT LIKE '%service_role%' THEN
    RAISE EXCEPTION 'Assertion : la garde ne refuse pas explicitement le rôle service_role pour l''annulation et la réactivation';
  END IF;

  -- La policy de DELETE doit EXISTER : sans elle, un DELETE sous RLS ne lève
  -- plus d'erreur, il n'affecte plus aucune ligne (échec silencieux).
  IF NOT EXISTS (SELECT 1 FROM pg_policy
                 WHERE polrelid = 'public.factures'::regclass AND polname = 'centre_delete_factures') THEN
    RAISE EXCEPTION 'Assertion : la policy centre_delete_factures a disparu ; un DELETE sous RLS deviendrait un échec silencieux au lieu du refus de la garde';
  END IF;

  IF pg_get_functiondef('public.merge_contacts(uuid, uuid)'::regprocedure)
     NOT LIKE '%campust3p.fusion_contacts%' THEN
    RAISE EXCEPTION 'Assertion : merge_contacts ne pose pas le contexte de fusion';
  END IF;

  -- R11 : l'exemption de fusion exige la pile d'appel, pas seulement le
  -- paramètre de session (sinon n'importe quelle session SQL la forge).
  IF (SELECT prosrc FROM pg_proc WHERE oid = 'public.garde_facture_emise()'::regprocedure)
     NOT LIKE '%PG_CONTEXT%' THEN
    RAISE EXCEPTION 'Assertion : la garde accorde l''exemption de fusion sans vérifier la pile d''appel';
  END IF;

  -- R6 : le figeage de la transmission ne doit pas dépendre du seul statut
  -- « envoye », ni frapper une transmission simulée par submit-pdp.
  IF (SELECT prosrc FROM pg_proc WHERE oid = 'public.garde_facture_emise()'::regprocedure)
     NOT LIKE '%LOCAL-%%' THEN
    RAISE EXCEPTION 'Assertion : la garde figerait une transmission simulée (référence LOCAL-…)';
  END IF;
END $assertions$;
