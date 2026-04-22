# API CampusT3P v1

API REST pour piloter le CRM depuis l'extérieur (intégrations, scripts, automatisations).

## 🔐 Authentification

Toutes les requêtes nécessitent une clé API au format `ct3p_<64 hex chars>`.

**Génération** : Module Super Admin → onglet **"Clés API"** → sélectionner un centre → "Générer la clé".  
⚠️ La clé n'est affichée **qu'une seule fois**. Stockez-la en lieu sûr.

**Utilisation** : header HTTP
```
x-api-key: ct3p_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Toutes les requêtes sont automatiquement scopées au `centre_id` lié à la clé.  
Impossible d'accéder ou modifier les données d'un autre centre.

## 🌐 Base URL

```
https://zhgbbujqapcigmduuqiy.supabase.co/functions/v1/api-v1
```

## 📦 Ressources exposées

`contacts`, `prospects`, `sessions`, `session_inscriptions`, `factures`, `paiements`, `catalogue_formations`, `formateurs`, `vehicules`, `creneaux_conduite`, `contact_documents`, `contact_historique`, `emargements`, `rappels`.

## 🛠️ Endpoints génériques (CRUD)

### `GET /api-v1/<resource>`
Liste paginée. Paramètres :
- `limit` (défaut 50, max 500)
- `offset` (défaut 0)
- `order` (ex: `created_at.desc`, `nom.asc`)
- `search` (ILIKE multi-colonnes — voir tableau ci-dessous)
- `<field>=<value>` (filtre exact, ex: `?statut=actif`)

**Colonnes de recherche `?search=` :**
| Ressource | Colonnes |
|---|---|
| `contacts` | nom, prenom, email, telephone, ville |
| `prospects` | nom, prenom, email, telephone |
| `sessions` | nom, formation_type, lieu |
| `catalogue_formations` | intitule, code, categorie |
| `formateurs` | nom, prenom, email |
| `factures` | numero_facture |

### `GET /api-v1/<resource>/<id>`
Récupère un enregistrement.

### `POST /api-v1/<resource>`
Crée un enregistrement. `centre_id` est ajouté automatiquement.

### `PATCH /api-v1/<resource>/<id>`
Met à jour un enregistrement. Toute tentative de changer `centre_id` est ignorée.

### `DELETE /api-v1/<resource>/<id>`
Supprime un enregistrement. ⚠️ Pour les ressources soumises à soft-delete (sessions, contacts, factures), préférez un PATCH `{deleted_at: "..."}` ou utilisez l'interface CRM.

## 🎯 Endpoint spécial

### `GET /api-v1/contacts/<id>/summary`
Agrégat lecture seule : contact + inscriptions (avec sessions jointes) + factures + documents + 20 dernières interactions + stats.

```json
{
  "data": {
    "contact": { "id": "...", "nom": "...", ... },
    "inscriptions": [{ "id": "...", "sessions": { "nom": "..." }, ... }],
    "factures": [...],
    "documents": [...],
    "historique": [...],
    "stats": { "nb_inscriptions": 3, "nb_factures": 2, "ca_total": 1500 }
  }
}
```

## 📋 Format de réponse

**Succès** : `{ "data": ..., "count"?: N, "limit"?: N, "offset"?: N }`  
**Erreur** : `{ "error": "message" }` avec status HTTP 400/401/404/405/500.

## 🧪 Exemples curl

### Créer un contact
```bash
curl -X POST https://zhgbbujqapcigmduuqiy.supabase.co/functions/v1/api-v1/contacts \
  -H "x-api-key: ct3p_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Dupont",
    "prenom": "Jean",
    "email": "jean.dupont@example.com",
    "telephone": "0612345678",
    "formation": "TAXI",
    "statut_apprenant": "actif"
  }'
```

### Mettre à jour un contact
```bash
curl -X PATCH https://zhgbbujqapcigmduuqiy.supabase.co/functions/v1/api-v1/contacts/<uuid> \
  -H "x-api-key: ct3p_xxx" \
  -H "Content-Type: application/json" \
  -d '{ "telephone": "0698765432" }'
```

### Rechercher un contact
```bash
curl "https://zhgbbujqapcigmduuqiy.supabase.co/functions/v1/api-v1/contacts?search=dupont&limit=10" \
  -H "x-api-key: ct3p_xxx"
```

### Lister les sessions filtrées par type
```bash
curl "https://zhgbbujqapcigmduuqiy.supabase.co/functions/v1/api-v1/sessions?formation_type=TAXI&order=date_debut.asc" \
  -H "x-api-key: ct3p_xxx"
```

### Inscrire un apprenant à une session
```bash
curl -X POST https://zhgbbujqapcigmduuqiy.supabase.co/functions/v1/api-v1/session_inscriptions \
  -H "x-api-key: ct3p_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "<session-uuid>",
    "contact_id": "<contact-uuid>"
  }'
```
> Les triggers `auto_populate_inscription_montant` et `snapshot_inscription_track` se déclenchent automatiquement (prix de la session, parcours canonique).

### Récupérer les inscriptions d'un contact
```bash
curl "https://zhgbbujqapcigmduuqiy.supabase.co/functions/v1/api-v1/session_inscriptions?contact_id=<uuid>" \
  -H "x-api-key: ct3p_xxx"
```

### Vue 360° d'un contact
```bash
curl "https://zhgbbujqapcigmduuqiy.supabase.co/functions/v1/api-v1/contacts/<uuid>/summary" \
  -H "x-api-key: ct3p_xxx"
```

### Créer un prospect
```bash
curl -X POST https://zhgbbujqapcigmduuqiy.supabase.co/functions/v1/api-v1/prospects \
  -H "x-api-key: ct3p_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Martin",
    "prenom": "Sophie",
    "telephone": "0611223344",
    "source": "API",
    "statut": "nouveau"
  }'
```

## ⚠️ Règles métier respectées

L'API passe par les mêmes triggers et contraintes que l'interface :

- ✅ `normalize_email` / `normalize_telephone` : nettoyage automatique
- ✅ `auto_populate_inscription_montant` : prix injecté depuis la session
- ✅ `snapshot_inscription_track` : parcours canonique figé
- ✅ `inherit_session_track_from_catalogue` : track hérité du catalogue
- ✅ `audit_trigger_function` : journal d'audit complet
- ✅ `sync_inscription_statut_paiement` : statut de paiement synchronisé
- ✅ `prevent_centre_id_change` : centre_id immuable
- ✅ Validation des enums (`formation_type`, `statut_apprenant`, etc.) côté Postgres

## 🔁 Rotation / révocation des clés

Module Super Admin → onglet "Clés API" → "Régénérer" (révoque l'ancienne et génère une nouvelle) ou "Révoquer".

## 📊 Codes HTTP

| Code | Signification |
|---|---|
| 200 | OK (GET/PATCH/DELETE) |
| 201 | Créé (POST) |
| 400 | Erreur de validation / payload invalide |
| 401 | Clé API manquante, invalide ou révoquée |
| 404 | Ressource introuvable |
| 405 | Méthode HTTP non supportée |
| 500 | Erreur serveur |

## 🚫 Limites actuelles

- Filtres uniquement en `=` (égalité stricte) sauf `search` qui fait du ILIKE
- Pas de jointures arbitraires (sauf endpoint `/summary`)
- Pas de webhooks sortants (à demander si besoin)
- Soft-delete non automatique sur DELETE — utiliser PATCH avec `deleted_at` pour les ressources critiques
