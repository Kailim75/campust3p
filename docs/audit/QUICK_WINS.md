# Quick wins — CRM T3P Campus

**Date :** 13 août 2026 · Complément de `RAPPORT_AUDIT.md`.

15 améliorations à fort impact, chacune réalisable en **moins d'une demi-journée**, prêtes à être traitées **une par une** dans des sessions dédiées. Classées par ratio impact/effort.

> **Légende dépendance :** 🟢 front pur (mergeable directement) · 🔵 nécessite l'agent Lovable (migration / edge function / SQL) · 🟡 nécessite une confirmation préalable dans le panneau Cloud.

| # | Quick win | Fichier(s) | Effort | Dép. | Pourquoi |
|---|---|---|---|---|---|
| 1 | **Retirer les entrées mortes « Inbox » de la recherche ⌘K** | `src/components/layout/CommandPalette.tsx:37,236-239` | XS | 🟢 | Deux entrées (dont une action rapide) mènent silencieusement au Tableau de bord — écran « interdit » pour un profil staff. |
| 2 | **Feedback d'échec sur les écritures silencieuses** (présence, pièce CMA reçue) | `src/components/apprenants/tabs/FormationTab.tsx:61-73`, `CMATab.tsx:91-106` | S | 🟢 | La secrétaire coche « présent »/« reçu » ; en cas d'échec (RLS, réseau) rien ne l'alerte → elle croit le dossier à jour. Ajouter `onError: toast.error(...)`. |
| 3 | **Confirmation avant l'envoi d'un email client** (facture, félicitations) | `src/components/paiements/FactureDetailSheet.tsx:652`, `src/components/apprenants/tabs/ResultatsFormationCard.tsx:139,164` | S | 🟢 | Un mauvais clic envoie un email réel, irréversible. Réutiliser l'`AlertDialog` déjà présent dans `PaiementsPage.tsx:903`. |
| 4 | **Validation `onBlur`** sur les 3 formulaires cœur | `ContactFormDialog.tsx:125`, `FactureFormDialog.tsx:127`, `SessionFormDialog.tsx:92` | XS | 🟢 | Les erreurs (« Email invalide ») n'apparaissent qu'à la soumission. Ajouter `mode: "onBlur"` à `useForm` — 1 ligne par formulaire. |
| 5 | **Ré-encoder l'icône PWA 192×192** (811 Ko → ~15 Ko) | `public/pwa-192x192.png` | XS | 🟢 | ~800 Ko inutiles précachés au premier chargement. `pngquant`/`oxipng`, gain quasi gratuit. |
| 6 | **`REVOKE anon` sur les 4 RPC de signature** (P0) | migration (RPC `get_signature_request_public`, `get_related_signature_docs`, `sign_document_public`, `refuse_document_public`) | S | 🔵 | Ferme la faille critique la plus grave (fuite PII + falsification de signature depuis un simple UUID). |
| 7 | **Contrôle de rôle/centre dans `soft_delete_record`/`restore_record`** (P0/P1) | migration | S | 🔵 | Aujourd'hui tout utilisateur peut supprimer n'importe quelle facture/contact par UUID. Ajouter `is_admin_or_staff()` + `has_centre_access(...)` + `REVOKE … FROM anon`. |
| 8 | **`contact_documents` : basculer le hard-delete en soft-delete** | `src/components/apprenants/tabs/DocumentsTab.tsx:113` | XS | 🟢 | La table est déjà soft-deletable (`useSoftDelete.ts:12`) mais cet écran fait un `.delete()` dur → pièce perdue hors Corbeille. Remplacer par `soft_delete_record('contact_documents', id)`. |
| 9 | **Bucket `produits-photos` → privé** | migration/SQL `UPDATE storage.buckets SET public=false …` | XS | 🟡 | Les policies ont été privatisées mais le flag bucket est resté `public=true` → photos servies sans RLS. Confirmer d'abord qu'aucun usage public légitime. |
| 10 | **Capturer `ip_signature` dans la signature publique** | `supabase/functions/public-sign-document/index.ts:190-200` | XS | 🔵 | Le chemin public (celui des signataires) ne capture jamais l'IP → valeur probante de la signature affaiblie. Lire `x-forwarded-for`. |
| 11 | **Index sur les FK de tables-lignes** | migration (`facture_lignes.facture_id`, `devis_lignes.devis_id`, `versements.paiement_id`) | XS | 🟡 | Scans séquentiels sur les jointures les plus fréquentes. Confirmer d'abord via `pg_indexes` qu'ils n'ont pas été créés au dashboard. |
| 12 | **Tokeniser les couleurs de statut Qualiopi** | `src/components/qualiopi/QualiopiCriteres.tsx:141-142` | XS | 🟢 | `#22c55e/#f97316/#ef4444` en dur au lieu de `--success/--warning/--destructive`. |
| 13 | **Harmoniser le vocabulaire de pilotage** | `src/components/help/AidePage.tsx:10` (« Dashboard » → « Tableau de bord »), `PipelinePage.tsx:337-338` (« Leads » → « prospects ») | XS | 🟢 | L'aide nomme un écran qui n'existe pas sous ce nom ; anglicismes évitables. |
| 14 | **Réduire l'URL signée d'un an** | `src/components/sessions/SendDocumentsToContactDialog.tsx:668` | XS | 🟢 | `createSignedUrl(… 365 j)` : toute fuite du lien donne un accès non révocable pendant un an. Ramener à quelques heures. |
| 15 | **Retirer `react-icons`** (importé pour 1 seule icône) | 10 fichiers (`SiWhatsapp`), ex. `ApprenantTableRow.tsx:9` | XS | 🟢 | Dépendance entière pour une icône ; remplacer par un SVG inline. |

## Notes d'exécution

- **Ordre conseillé pour l'impact utilisateur immédiat :** 1 → 2 → 3 → 4 (tous 🟢, sans dépendance).
- **Bloc sécurité rapide (🔵, via l'agent Lovable) :** 6 → 7 → 10, à enchaîner dans une session dédiée « durcissement » — ce sont les correctifs P0 à plus faible effort. Rappel protocole : merger la PR contenant la migration **avant** de demander son application à l'agent (il ne voit que `main`).
- **Avant de créer un index ou de changer un flag bucket (9, 11) :** confirmer l'état réel dans le panneau Cloud (`pg_indexes`, `storage.buckets`) — la base en ligne peut différer des migrations.
- Chaque quick win est indépendant et réversible ; aucun ne restructure l'arborescence (conforme aux règles Lovable).
