export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      action_logs: {
        Row: {
          action_type: string
          centre_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          label: string | null
          metadata: Json | null
          note: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          centre_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          label?: string | null
          metadata?: Json | null
          note?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          centre_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          label?: string | null
          metadata?: Json | null
          note?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_actions_audit: {
        Row: {
          action_name: string
          action_type: string
          executed_at: string
          id: string
          ip_address: string | null
          parameters: Json | null
          result: Json | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_name: string
          action_type: string
          executed_at?: string
          id?: string
          ip_address?: string | null
          parameters?: Json | null
          result?: Json | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_name?: string
          action_type?: string
          executed_at?: string
          id?: string
          ip_address?: string | null
          parameters?: Json | null
          result?: Json | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_assistant_logs: {
        Row: {
          action: string | null
          assistant_response: string
          created_at: string
          id: string
          user_id: string | null
          user_message: string
        }
        Insert: {
          action?: string | null
          assistant_response: string
          created_at?: string
          id?: string
          user_id?: string | null
          user_message: string
        }
        Update: {
          action?: string | null
          assistant_response?: string
          created_at?: string
          id?: string
          user_id?: string | null
          user_message?: string
        }
        Relationships: []
      }
      attestation_certificates: {
        Row: {
          contact_id: string
          created_at: string
          date_emission: string
          document_url: string | null
          emis_par: string | null
          id: string
          metadata: Json | null
          numero_certificat: string
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          session_id: string | null
          status: string
          type_attestation: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          date_emission?: string
          document_url?: string | null
          emis_par?: string | null
          id?: string
          metadata?: Json | null
          numero_certificat: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          session_id?: string | null
          status?: string
          type_attestation?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          date_emission?: string
          document_url?: string | null
          emis_par?: string | null
          id?: string
          metadata?: Json | null
          numero_certificat?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          session_id?: string | null
          status?: string
          type_attestation?: string
        }
        Relationships: [
          {
            foreignKeyName: "attestation_certificates_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attestation_certificates_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          centre_id: string | null
          changed_fields: string[] | null
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          centre_id?: string | null
          changed_fields?: string[] | null
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          centre_id?: string | null
          changed_fields?: string[] | null
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      blockage_logs: {
        Row: {
          centre_id: string | null
          code: string
          detected_at: string
          entity_id: string
          entity_type: string
          id: string
          impact_score: number | null
          justification: string | null
          message: string
          resolution_type: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
        }
        Insert: {
          centre_id?: string | null
          code: string
          detected_at?: string
          entity_id: string
          entity_type: string
          id?: string
          impact_score?: number | null
          justification?: string | null
          message: string
          resolution_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
        }
        Update: {
          centre_id?: string | null
          code?: string
          detected_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          impact_score?: number | null
          justification?: string | null
          message?: string
          resolution_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "blockage_logs_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blockage_logs_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_previsionnel: {
        Row: {
          annee: number
          categorie: string
          created_at: string
          id: string
          mois: number
          montant_prevu: number
          type: Database["public"]["Enums"]["budget_type"]
        }
        Insert: {
          annee: number
          categorie: string
          created_at?: string
          id?: string
          mois: number
          montant_prevu: number
          type: Database["public"]["Enums"]["budget_type"]
        }
        Update: {
          annee?: number
          categorie?: string
          created_at?: string
          id?: string
          mois?: number
          montant_prevu?: number
          type?: Database["public"]["Enums"]["budget_type"]
        }
        Relationships: []
      }
      cartes_professionnelles: {
        Row: {
          contact_id: string
          created_at: string
          date_demande: string | null
          date_expiration: string | null
          date_obtention: string | null
          documents_manquants: string[] | null
          formation_type: string | null
          id: string
          notes: string | null
          numero_carte: string | null
          numero_dossier: string | null
          prefecture: string | null
          statut: string
          type_carte: string
          updated_at: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          date_demande?: string | null
          date_expiration?: string | null
          date_obtention?: string | null
          documents_manquants?: string[] | null
          formation_type?: string | null
          id?: string
          notes?: string | null
          numero_carte?: string | null
          numero_dossier?: string | null
          prefecture?: string | null
          statut?: string
          type_carte: string
          updated_at?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          date_demande?: string | null
          date_expiration?: string | null
          date_obtention?: string | null
          documents_manquants?: string[] | null
          formation_type?: string | null
          id?: string
          notes?: string | null
          numero_carte?: string | null
          numero_dossier?: string | null
          prefecture?: string | null
          statut?: string
          type_carte?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cartes_professionnelles_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogue_formations: {
        Row: {
          actif: boolean
          categorie: string
          centre_id: string
          code: string
          competences_visees: string[] | null
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          duree_heures: number
          id: string
          intitule: string
          modalites_evaluation: string | null
          modalites_pedagogiques: string | null
          objectifs: string | null
          prerequis: string | null
          prix_ht: number
          public_concerne: string | null
          references_reglementaires: string | null
          remise_percent: number
          track: Database["public"]["Enums"]["formation_track"]
          tva_percent: number
          type_formation: string
          updated_at: string
          version: number | null
          zone_geographique: string | null
        }
        Insert: {
          actif?: boolean
          categorie?: string
          centre_id: string
          code: string
          competences_visees?: string[] | null
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          duree_heures?: number
          id?: string
          intitule: string
          modalites_evaluation?: string | null
          modalites_pedagogiques?: string | null
          objectifs?: string | null
          prerequis?: string | null
          prix_ht?: number
          public_concerne?: string | null
          references_reglementaires?: string | null
          remise_percent?: number
          track?: Database["public"]["Enums"]["formation_track"]
          tva_percent?: number
          type_formation?: string
          updated_at?: string
          version?: number | null
          zone_geographique?: string | null
        }
        Update: {
          actif?: boolean
          categorie?: string
          centre_id?: string
          code?: string
          competences_visees?: string[] | null
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          duree_heures?: number
          id?: string
          intitule?: string
          modalites_evaluation?: string | null
          modalites_pedagogiques?: string | null
          objectifs?: string | null
          prerequis?: string | null
          prix_ht?: number
          public_concerne?: string | null
          references_reglementaires?: string | null
          remise_percent?: number
          track?: Database["public"]["Enums"]["formation_track"]
          tva_percent?: number
          type_formation?: string
          updated_at?: string
          version?: number | null
          zone_geographique?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogue_formations_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_formations_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      centre_api_keys: {
        Row: {
          actif: boolean
          centre_id: string
          created_at: string
          created_by: string | null
          id: string
          key_hash: string
          key_prefix: string
          label: string | null
          last_used_at: string | null
          revoked_at: string | null
          revoked_by: string | null
        }
        Insert: {
          actif?: boolean
          centre_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          label?: string | null
          last_used_at?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
        }
        Update: {
          actif?: boolean
          centre_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          label?: string | null
          last_used_at?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "centre_api_keys_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centre_api_keys_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      centre_formation: {
        Row: {
          adresse_complete: string
          agrement_prefecture: string | null
          agrement_prefecture_date: string | null
          agrements_autres: Json | null
          bic: string
          code_rncp: string | null
          code_rs: string | null
          created_at: string | null
          email: string
          forme_juridique: string
          iban: string
          id: string
          logo_url: string | null
          nda: string
          nom_commercial: string
          nom_legal: string
          qualiopi_date_expiration: string | null
          qualiopi_date_obtention: string | null
          qualiopi_numero: string | null
          region_declaration: string
          responsable_legal_fonction: string
          responsable_legal_nom: string
          signature_cachet_url: string | null
          siret: string
          telephone: string
          updated_at: string | null
        }
        Insert: {
          adresse_complete: string
          agrement_prefecture?: string | null
          agrement_prefecture_date?: string | null
          agrements_autres?: Json | null
          bic: string
          code_rncp?: string | null
          code_rs?: string | null
          created_at?: string | null
          email: string
          forme_juridique: string
          iban: string
          id?: string
          logo_url?: string | null
          nda: string
          nom_commercial: string
          nom_legal: string
          qualiopi_date_expiration?: string | null
          qualiopi_date_obtention?: string | null
          qualiopi_numero?: string | null
          region_declaration: string
          responsable_legal_fonction: string
          responsable_legal_nom: string
          signature_cachet_url?: string | null
          siret: string
          telephone: string
          updated_at?: string | null
        }
        Update: {
          adresse_complete?: string
          agrement_prefecture?: string | null
          agrement_prefecture_date?: string | null
          agrements_autres?: Json | null
          bic?: string
          code_rncp?: string | null
          code_rs?: string | null
          created_at?: string | null
          email?: string
          forme_juridique?: string
          iban?: string
          id?: string
          logo_url?: string | null
          nda?: string
          nom_commercial?: string
          nom_legal?: string
          qualiopi_date_expiration?: string | null
          qualiopi_date_obtention?: string | null
          qualiopi_numero?: string | null
          region_declaration?: string
          responsable_legal_fonction?: string
          responsable_legal_nom?: string
          signature_cachet_url?: string | null
          siret?: string
          telephone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      centres: {
        Row: {
          actif: boolean | null
          adresse_complete: string | null
          created_at: string | null
          email: string
          health_score: number | null
          id: string
          last_activity_at: string | null
          logo_url: string | null
          max_contacts: number | null
          max_users: number | null
          nda: string | null
          nom: string
          nom_commercial: string | null
          onboarding_completed_at: string | null
          plan_end_date: string | null
          plan_start_date: string | null
          plan_type: string | null
          settings: Json | null
          siret: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          telephone: string | null
          updated_at: string | null
        }
        Insert: {
          actif?: boolean | null
          adresse_complete?: string | null
          created_at?: string | null
          email: string
          health_score?: number | null
          id?: string
          last_activity_at?: string | null
          logo_url?: string | null
          max_contacts?: number | null
          max_users?: number | null
          nda?: string | null
          nom: string
          nom_commercial?: string | null
          onboarding_completed_at?: string | null
          plan_end_date?: string | null
          plan_start_date?: string | null
          plan_type?: string | null
          settings?: Json | null
          siret?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          telephone?: string | null
          updated_at?: string | null
        }
        Update: {
          actif?: boolean | null
          adresse_complete?: string | null
          created_at?: string | null
          email?: string
          health_score?: number | null
          id?: string
          last_activity_at?: string | null
          logo_url?: string | null
          max_contacts?: number | null
          max_users?: number | null
          nda?: string | null
          nom?: string
          nom_commercial?: string | null
          onboarding_completed_at?: string | null
          plan_end_date?: string | null
          plan_start_date?: string | null
          plan_type?: string | null
          settings?: Json | null
          siret?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          telephone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      charges: {
        Row: {
          categorie: Database["public"]["Enums"]["charge_categorie"]
          created_at: string
          created_by: string | null
          date_charge: string
          id: string
          libelle: string
          montant: number
          notes: string | null
          periodicite: Database["public"]["Enums"]["charge_periodicite"]
          prestataire: string | null
          statut: Database["public"]["Enums"]["charge_statut"]
          type_charge: Database["public"]["Enums"]["type_charge"]
        }
        Insert: {
          categorie: Database["public"]["Enums"]["charge_categorie"]
          created_at?: string
          created_by?: string | null
          date_charge: string
          id?: string
          libelle: string
          montant: number
          notes?: string | null
          periodicite?: Database["public"]["Enums"]["charge_periodicite"]
          prestataire?: string | null
          statut?: Database["public"]["Enums"]["charge_statut"]
          type_charge: Database["public"]["Enums"]["type_charge"]
        }
        Update: {
          categorie?: Database["public"]["Enums"]["charge_categorie"]
          created_at?: string
          created_by?: string | null
          date_charge?: string
          id?: string
          libelle?: string
          montant?: number
          notes?: string | null
          periodicite?: Database["public"]["Enums"]["charge_periodicite"]
          prestataire?: string | null
          statut?: Database["public"]["Enums"]["charge_statut"]
          type_charge?: Database["public"]["Enums"]["type_charge"]
        }
        Relationships: []
      }
      charter_acceptances: {
        Row: {
          accepted_at: string
          charter_id: string
          id: string
          ip_address: string | null
          role_at_acceptance: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          charter_id: string
          id?: string
          ip_address?: string | null
          role_at_acceptance: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          charter_id?: string
          id?: string
          ip_address?: string | null
          role_at_acceptance?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "charter_acceptances_charter_id_fkey"
            columns: ["charter_id"]
            isOneToOne: false
            referencedRelation: "security_charters"
            referencedColumns: ["id"]
          },
        ]
      }
      chevalets: {
        Row: {
          contact_id: string
          created_by: string | null
          formation_type: string
          generated_at: string
          id: string
          pdf_path: string | null
        }
        Insert: {
          contact_id: string
          created_by?: string | null
          formation_type: string
          generated_at?: string
          id?: string
          pdf_path?: string | null
        }
        Update: {
          contact_id?: string
          created_by?: string | null
          formation_type?: string
          generated_at?: string
          id?: string
          pdf_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chevalets_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_checklist_items: {
        Row: {
          actif: boolean
          categorie: string
          code: string
          created_at: string
          criticite: string
          description: string | null
          id: string
          ordre: number
          reference_legale: string | null
          sous_categorie: string | null
          titre: string
          updated_at: string
        }
        Insert: {
          actif?: boolean
          categorie: string
          code: string
          created_at?: string
          criticite?: string
          description?: string | null
          id?: string
          ordre?: number
          reference_legale?: string | null
          sous_categorie?: string | null
          titre: string
          updated_at?: string
        }
        Update: {
          actif?: boolean
          categorie?: string
          code?: string
          created_at?: string
          criticite?: string
          description?: string | null
          id?: string
          ordre?: number
          reference_legale?: string | null
          sous_categorie?: string | null
          titre?: string
          updated_at?: string
        }
        Relationships: []
      }
      compliance_validation_history: {
        Row: {
          action: string
          ancien_statut: string | null
          changed_at: string
          changed_by: string | null
          commentaire: string | null
          id: string
          nouveau_statut: string | null
          validation_id: string
        }
        Insert: {
          action: string
          ancien_statut?: string | null
          changed_at?: string
          changed_by?: string | null
          commentaire?: string | null
          id?: string
          nouveau_statut?: string | null
          validation_id: string
        }
        Update: {
          action?: string
          ancien_statut?: string | null
          changed_at?: string
          changed_by?: string | null
          commentaire?: string | null
          id?: string
          nouveau_statut?: string | null
          validation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_validation_history_validation_id_fkey"
            columns: ["validation_id"]
            isOneToOne: false
            referencedRelation: "compliance_validations"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_validations: {
        Row: {
          centre_id: string | null
          commentaire: string | null
          created_at: string
          date_prochaine_revue: string | null
          id: string
          item_id: string
          preuves: string[] | null
          statut: string
          updated_at: string
          valide_at: string | null
          valide_par: string | null
        }
        Insert: {
          centre_id?: string | null
          commentaire?: string | null
          created_at?: string
          date_prochaine_revue?: string | null
          id?: string
          item_id: string
          preuves?: string[] | null
          statut?: string
          updated_at?: string
          valide_at?: string | null
          valide_par?: string | null
        }
        Update: {
          centre_id?: string | null
          commentaire?: string | null
          created_at?: string
          date_prochaine_revue?: string | null
          id?: string
          item_id?: string
          preuves?: string[] | null
          statut?: string
          updated_at?: string
          valide_at?: string | null
          valide_par?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_validations_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_validations_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_validations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "compliance_checklist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      compte_rendu_seance: {
        Row: {
          created_at: string | null
          duree_reelle_minutes: number | null
          formateur_id: string | null
          id: string
          niveau_global: Database["public"]["Enums"]["niveau_conduite"]
          points_ameliorer: string | null
          points_positifs: string | null
          points_travailles: string[] | null
          recommandation_seances_sup: number | null
          reservation_id: string
        }
        Insert: {
          created_at?: string | null
          duree_reelle_minutes?: number | null
          formateur_id?: string | null
          id?: string
          niveau_global?: Database["public"]["Enums"]["niveau_conduite"]
          points_ameliorer?: string | null
          points_positifs?: string | null
          points_travailles?: string[] | null
          recommandation_seances_sup?: number | null
          reservation_id: string
        }
        Update: {
          created_at?: string | null
          duree_reelle_minutes?: number | null
          formateur_id?: string | null
          id?: string
          niveau_global?: Database["public"]["Enums"]["niveau_conduite"]
          points_ameliorer?: string | null
          points_positifs?: string | null
          points_travailles?: string[] | null
          recommandation_seances_sup?: number | null
          reservation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compte_rendu_seance_formateur_id_fkey"
            columns: ["formateur_id"]
            isOneToOne: false
            referencedRelation: "formateurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compte_rendu_seance_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations_conduite"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_documents: {
        Row: {
          commentaires: string | null
          contact_id: string
          created_at: string
          date_expiration: string | null
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          nom: string
          type_document: string
          updated_at: string
        }
        Insert: {
          commentaires?: string | null
          contact_id: string
          created_at?: string
          date_expiration?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          nom: string
          type_document: string
          updated_at?: string
        }
        Update: {
          commentaires?: string | null
          contact_id?: string
          created_at?: string
          date_expiration?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          nom?: string
          type_document?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_documents_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_historique: {
        Row: {
          alerte_active: boolean | null
          contact_id: string
          contenu: string | null
          created_at: string
          created_by: string | null
          date_echange: string
          date_rappel: string | null
          duree_minutes: number | null
          id: string
          rappel_description: string | null
          titre: string
          type: string
        }
        Insert: {
          alerte_active?: boolean | null
          contact_id: string
          contenu?: string | null
          created_at?: string
          created_by?: string | null
          date_echange?: string
          date_rappel?: string | null
          duree_minutes?: number | null
          id?: string
          rappel_description?: string | null
          titre: string
          type: string
        }
        Update: {
          alerte_active?: boolean | null
          contact_id?: string
          contenu?: string | null
          created_at?: string
          created_by?: string | null
          date_echange?: string
          date_rappel?: string | null
          duree_minutes?: number | null
          id?: string
          rappel_description?: string | null
          titre?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_historique_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_partners: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          notes: string | null
          partner_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          notes?: string | null
          partner_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          partner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_partners_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_partners_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_stats"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "contact_partners_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          archived: boolean
          centre_id: string
          civilite: Database["public"]["Enums"]["civilite"] | null
          code_postal: string | null
          commentaires: string | null
          created_at: string
          custom_id: string | null
          date_apport: string | null
          date_delivrance_permis: string | null
          date_expiration_carte: string | null
          date_naissance: string | null
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          filleul: string | null
          fonction: string | null
          formation: Database["public"]["Enums"]["formation_type"] | null
          id: string
          nom: string
          nom_naissance: string | null
          numero_carte_professionnelle: string | null
          numero_permis: string | null
          origine: Database["public"]["Enums"]["contact_origin"] | null
          parrain: string | null
          partenaire_referent_id: string | null
          pays_naissance: string | null
          precisions: string | null
          prefecture_carte: string | null
          prefecture_permis: string | null
          prenom: string
          rue: string | null
          source: string | null
          statut: Database["public"]["Enums"]["contact_statut"] | null
          statut_apprenant: Database["public"]["Enums"]["statut_apprenant"]
          statut_cma: Database["public"]["Enums"]["statut_cma"]
          telephone: string | null
          telephone_normalise: string | null
          uid: string | null
          updated_at: string
          ville: string | null
          ville_naissance: string | null
        }
        Insert: {
          archived?: boolean
          centre_id: string
          civilite?: Database["public"]["Enums"]["civilite"] | null
          code_postal?: string | null
          commentaires?: string | null
          created_at?: string
          custom_id?: string | null
          date_apport?: string | null
          date_delivrance_permis?: string | null
          date_expiration_carte?: string | null
          date_naissance?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          filleul?: string | null
          fonction?: string | null
          formation?: Database["public"]["Enums"]["formation_type"] | null
          id?: string
          nom: string
          nom_naissance?: string | null
          numero_carte_professionnelle?: string | null
          numero_permis?: string | null
          origine?: Database["public"]["Enums"]["contact_origin"] | null
          parrain?: string | null
          partenaire_referent_id?: string | null
          pays_naissance?: string | null
          precisions?: string | null
          prefecture_carte?: string | null
          prefecture_permis?: string | null
          prenom: string
          rue?: string | null
          source?: string | null
          statut?: Database["public"]["Enums"]["contact_statut"] | null
          statut_apprenant?: Database["public"]["Enums"]["statut_apprenant"]
          statut_cma?: Database["public"]["Enums"]["statut_cma"]
          telephone?: string | null
          telephone_normalise?: string | null
          uid?: string | null
          updated_at?: string
          ville?: string | null
          ville_naissance?: string | null
        }
        Update: {
          archived?: boolean
          centre_id?: string
          civilite?: Database["public"]["Enums"]["civilite"] | null
          code_postal?: string | null
          commentaires?: string | null
          created_at?: string
          custom_id?: string | null
          date_apport?: string | null
          date_delivrance_permis?: string | null
          date_expiration_carte?: string | null
          date_naissance?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          filleul?: string | null
          fonction?: string | null
          formation?: Database["public"]["Enums"]["formation_type"] | null
          id?: string
          nom?: string
          nom_naissance?: string | null
          numero_carte_professionnelle?: string | null
          numero_permis?: string | null
          origine?: Database["public"]["Enums"]["contact_origin"] | null
          parrain?: string | null
          partenaire_referent_id?: string | null
          pays_naissance?: string | null
          precisions?: string | null
          prefecture_carte?: string | null
          prefecture_permis?: string | null
          prenom?: string
          rue?: string | null
          source?: string | null
          statut?: Database["public"]["Enums"]["contact_statut"] | null
          statut_apprenant?: Database["public"]["Enums"]["statut_apprenant"]
          statut_cma?: Database["public"]["Enums"]["statut_cma"]
          telephone?: string | null
          telephone_normalise?: string | null
          uid?: string | null
          updated_at?: string
          ville?: string | null
          ville_naissance?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_partenaire_referent_id_fkey"
            columns: ["partenaire_referent_id"]
            isOneToOne: false
            referencedRelation: "partner_stats"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "contacts_partenaire_referent_id_fkey"
            columns: ["partenaire_referent_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      creneaux_conduite: {
        Row: {
          annule_at: string | null
          annule_par: string | null
          capacite_max: number
          centre_id: string
          commentaires: string | null
          confirme_at: string | null
          confirme_par: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          date_creneau: string
          fiche_pratique_id: string | null
          formateur_id: string | null
          heure_debut: string
          heure_fin: string
          id: string
          lieu_arrivee: string | null
          lieu_depart: string | null
          motif_annulation: string | null
          notes_formateur: string | null
          parcours: string | null
          rappel_envoye: boolean | null
          rappel_envoye_at: string | null
          recurrence_id: string | null
          reserve_at: string | null
          reserve_par: string | null
          statut: string
          type_seance: string
          updated_at: string
          vehicule_id: string | null
          visible_eleve: boolean | null
        }
        Insert: {
          annule_at?: string | null
          annule_par?: string | null
          capacite_max?: number
          centre_id: string
          commentaires?: string | null
          confirme_at?: string | null
          confirme_par?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          date_creneau: string
          fiche_pratique_id?: string | null
          formateur_id?: string | null
          heure_debut: string
          heure_fin: string
          id?: string
          lieu_arrivee?: string | null
          lieu_depart?: string | null
          motif_annulation?: string | null
          notes_formateur?: string | null
          parcours?: string | null
          rappel_envoye?: boolean | null
          rappel_envoye_at?: string | null
          recurrence_id?: string | null
          reserve_at?: string | null
          reserve_par?: string | null
          statut?: string
          type_seance?: string
          updated_at?: string
          vehicule_id?: string | null
          visible_eleve?: boolean | null
        }
        Update: {
          annule_at?: string | null
          annule_par?: string | null
          capacite_max?: number
          centre_id?: string
          commentaires?: string | null
          confirme_at?: string | null
          confirme_par?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          date_creneau?: string
          fiche_pratique_id?: string | null
          formateur_id?: string | null
          heure_debut?: string
          heure_fin?: string
          id?: string
          lieu_arrivee?: string | null
          lieu_depart?: string | null
          motif_annulation?: string | null
          notes_formateur?: string | null
          parcours?: string | null
          rappel_envoye?: boolean | null
          rappel_envoye_at?: string | null
          recurrence_id?: string | null
          reserve_at?: string | null
          reserve_par?: string | null
          statut?: string
          type_seance?: string
          updated_at?: string
          vehicule_id?: string | null
          visible_eleve?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "creneaux_conduite_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creneaux_conduite_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creneaux_conduite_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creneaux_conduite_fiche_pratique_id_fkey"
            columns: ["fiche_pratique_id"]
            isOneToOne: false
            referencedRelation: "fiches_pratique"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creneaux_conduite_formateur_id_fkey"
            columns: ["formateur_id"]
            isOneToOne: false
            referencedRelation: "formateurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creneaux_conduite_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_email_accounts: {
        Row: {
          centre_id: string
          created_at: string
          display_name: string | null
          email_address: string
          id: string
          is_active: boolean
          last_history_id: string | null
          last_sync_at: string | null
          oauth_encrypted_token: string | null
          oauth_refresh_token: string | null
          oauth_token_expires_at: string | null
          provider: string
          sync_error: string | null
          sync_status: string
          updated_at: string
        }
        Insert: {
          centre_id: string
          created_at?: string
          display_name?: string | null
          email_address: string
          id?: string
          is_active?: boolean
          last_history_id?: string | null
          last_sync_at?: string | null
          oauth_encrypted_token?: string | null
          oauth_refresh_token?: string | null
          oauth_token_expires_at?: string | null
          provider?: string
          sync_error?: string | null
          sync_status?: string
          updated_at?: string
        }
        Update: {
          centre_id?: string
          created_at?: string
          display_name?: string | null
          email_address?: string
          id?: string
          is_active?: boolean
          last_history_id?: string | null
          last_sync_at?: string | null
          oauth_encrypted_token?: string | null
          oauth_refresh_token?: string | null
          oauth_token_expires_at?: string | null
          provider?: string
          sync_error?: string | null
          sync_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_email_accounts_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_email_accounts_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_email_attachments: {
        Row: {
          centre_id: string
          created_at: string
          filename: string
          gmail_attachment_id: string | null
          id: string
          message_id: string
          mime_type: string | null
          promoted_at: string | null
          promoted_by: string | null
          promoted_to_document_id: string | null
          promoted_to_table: string | null
          sha256_hash: string | null
          size_bytes: number | null
          storage_path: string | null
        }
        Insert: {
          centre_id: string
          created_at?: string
          filename: string
          gmail_attachment_id?: string | null
          id?: string
          message_id: string
          mime_type?: string | null
          promoted_at?: string | null
          promoted_by?: string | null
          promoted_to_document_id?: string | null
          promoted_to_table?: string | null
          sha256_hash?: string | null
          size_bytes?: number | null
          storage_path?: string | null
        }
        Update: {
          centre_id?: string
          created_at?: string
          filename?: string
          gmail_attachment_id?: string | null
          id?: string
          message_id?: string
          mime_type?: string | null
          promoted_at?: string | null
          promoted_by?: string | null
          promoted_to_document_id?: string | null
          promoted_to_table?: string | null
          sha256_hash?: string | null
          size_bytes?: number | null
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_email_attachments_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_email_attachments_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_email_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "crm_email_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_email_links: {
        Row: {
          centre_id: string
          confidence_score: number | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          is_primary: boolean
          link_source: string
          linked_at: string
          linked_by: string | null
          thread_id: string
        }
        Insert: {
          centre_id: string
          confidence_score?: number | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          is_primary?: boolean
          link_source?: string
          linked_at?: string
          linked_by?: string | null
          thread_id: string
        }
        Update: {
          centre_id?: string
          confidence_score?: number | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          is_primary?: boolean
          link_source?: string
          linked_at?: string
          linked_by?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_email_links_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_email_links_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_email_links_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "crm_email_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_email_messages: {
        Row: {
          bcc_addresses: Json | null
          body_html: string | null
          body_text: string | null
          cc_addresses: Json | null
          centre_id: string
          created_at: string
          direction: string
          from_address: string
          from_name: string | null
          gmail_internal_date: string | null
          gmail_label_ids: string[] | null
          has_attachments: boolean
          id: string
          in_reply_to: string | null
          message_id_header: string | null
          provider: string
          provider_message_id: string
          received_at: string
          references_header: string | null
          send_error: string | null
          send_status: string | null
          sent_at: string | null
          sent_by: string | null
          snippet: string | null
          source_system: string
          subject: string | null
          thread_id: string
          to_addresses: Json
        }
        Insert: {
          bcc_addresses?: Json | null
          body_html?: string | null
          body_text?: string | null
          cc_addresses?: Json | null
          centre_id: string
          created_at?: string
          direction: string
          from_address: string
          from_name?: string | null
          gmail_internal_date?: string | null
          gmail_label_ids?: string[] | null
          has_attachments?: boolean
          id?: string
          in_reply_to?: string | null
          message_id_header?: string | null
          provider?: string
          provider_message_id: string
          received_at?: string
          references_header?: string | null
          send_error?: string | null
          send_status?: string | null
          sent_at?: string | null
          sent_by?: string | null
          snippet?: string | null
          source_system?: string
          subject?: string | null
          thread_id: string
          to_addresses?: Json
        }
        Update: {
          bcc_addresses?: Json | null
          body_html?: string | null
          body_text?: string | null
          cc_addresses?: Json | null
          centre_id?: string
          created_at?: string
          direction?: string
          from_address?: string
          from_name?: string | null
          gmail_internal_date?: string | null
          gmail_label_ids?: string[] | null
          has_attachments?: boolean
          id?: string
          in_reply_to?: string | null
          message_id_header?: string | null
          provider?: string
          provider_message_id?: string
          received_at?: string
          references_header?: string | null
          send_error?: string | null
          send_status?: string | null
          sent_at?: string | null
          sent_by?: string | null
          snippet?: string | null
          source_system?: string
          subject?: string | null
          thread_id?: string
          to_addresses?: Json
        }
        Relationships: [
          {
            foreignKeyName: "crm_email_messages_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_email_messages_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_email_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "crm_email_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_email_notes: {
        Row: {
          centre_id: string
          content: string
          created_at: string
          created_by: string
          id: string
          thread_id: string
          updated_at: string
        }
        Insert: {
          centre_id: string
          content: string
          created_at?: string
          created_by: string
          id?: string
          thread_id: string
          updated_at?: string
        }
        Update: {
          centre_id?: string
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          thread_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_email_notes_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_email_notes_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_email_notes_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "crm_email_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_email_threads: {
        Row: {
          account_id: string
          archived_at: string | null
          assigned_at: string | null
          assigned_by: string | null
          assigned_to: string | null
          centre_id: string
          created_at: string
          crm_labels: string[]
          has_attachments: boolean
          has_inbound: boolean
          id: string
          is_unread: boolean
          last_message_at: string | null
          message_count: number
          participants: Json | null
          priority: string
          provider: string
          provider_thread_id: string
          snippet: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          archived_at?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          centre_id: string
          created_at?: string
          crm_labels?: string[]
          has_attachments?: boolean
          has_inbound?: boolean
          id?: string
          is_unread?: boolean
          last_message_at?: string | null
          message_count?: number
          participants?: Json | null
          priority?: string
          provider?: string
          provider_thread_id: string
          snippet?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          archived_at?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          centre_id?: string
          created_at?: string
          crm_labels?: string[]
          has_attachments?: boolean
          has_inbound?: boolean
          id?: string
          is_unread?: boolean
          last_message_at?: string | null
          message_count?: number
          participants?: Json | null
          priority?: string
          provider?: string
          provider_thread_id?: string
          snippet?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_email_threads_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "crm_email_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_email_threads_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_email_threads_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_label_definitions: {
        Row: {
          centre_id: string
          color: string
          created_at: string
          id: string
          is_system: boolean
          name: string
          short_name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          centre_id: string
          color?: string
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          short_name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          centre_id?: string
          color?: string
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          short_name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_label_definitions_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_label_definitions_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      data_breach_history: {
        Row: {
          action: string
          breach_id: string
          changed_at: string
          changed_by: string | null
          changed_fields: string[] | null
          id: string
          new_values: Json | null
          notes: string | null
          old_values: Json | null
        }
        Insert: {
          action: string
          breach_id: string
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[] | null
          id?: string
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
        }
        Update: {
          action?: string
          breach_id?: string
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[] | null
          id?: string
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "data_breach_history_breach_id_fkey"
            columns: ["breach_id"]
            isOneToOne: false
            referencedRelation: "data_breaches"
            referencedColumns: ["id"]
          },
        ]
      }
      data_breaches: {
        Row: {
          categories_donnees: string[]
          categories_personnes: string[]
          closed_at: string | null
          closed_by: string | null
          code: string
          created_at: string
          created_by: string | null
          date_detection: string
          date_notification_cnil: string | null
          date_notification_personnes: string | null
          description: string
          detecte_par: string | null
          documents_associes: string[] | null
          id: string
          justification_non_notification: string | null
          mesures_correctives: string | null
          mesures_immediates: string | null
          mesures_preventives: string | null
          nombre_personnes_affectees: number | null
          notification_cnil_requise: boolean | null
          notification_personnes_requise: boolean | null
          origine: string | null
          responsable_traitement: string | null
          risque_pour_personnes: string | null
          severite: string
          statut: string
          titre: string
          type_violation: string
          updated_at: string
        }
        Insert: {
          categories_donnees?: string[]
          categories_personnes?: string[]
          closed_at?: string | null
          closed_by?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          date_detection?: string
          date_notification_cnil?: string | null
          date_notification_personnes?: string | null
          description: string
          detecte_par?: string | null
          documents_associes?: string[] | null
          id?: string
          justification_non_notification?: string | null
          mesures_correctives?: string | null
          mesures_immediates?: string | null
          mesures_preventives?: string | null
          nombre_personnes_affectees?: number | null
          notification_cnil_requise?: boolean | null
          notification_personnes_requise?: boolean | null
          origine?: string | null
          responsable_traitement?: string | null
          risque_pour_personnes?: string | null
          severite: string
          statut?: string
          titre: string
          type_violation: string
          updated_at?: string
        }
        Update: {
          categories_donnees?: string[]
          categories_personnes?: string[]
          closed_at?: string | null
          closed_by?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          date_detection?: string
          date_notification_cnil?: string | null
          date_notification_personnes?: string | null
          description?: string
          detecte_par?: string | null
          documents_associes?: string[] | null
          id?: string
          justification_non_notification?: string | null
          mesures_correctives?: string | null
          mesures_immediates?: string | null
          mesures_preventives?: string | null
          nombre_personnes_affectees?: number | null
          notification_cnil_requise?: boolean | null
          notification_personnes_requise?: boolean | null
          origine?: string | null
          responsable_traitement?: string | null
          risque_pour_personnes?: string | null
          severite?: string
          statut?: string
          titre?: string
          type_violation?: string
          updated_at?: string
        }
        Relationships: []
      }
      devis: {
        Row: {
          centre_id: string
          commentaires: string | null
          contact_id: string
          created_at: string
          date_emission: string | null
          date_validite: string | null
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          facture_id: string | null
          id: string
          montant_total: number
          numero_devis: string
          session_inscription_id: string | null
          statut: Database["public"]["Enums"]["devis_statut"]
          type_financement: Database["public"]["Enums"]["financement_type"]
          updated_at: string
        }
        Insert: {
          centre_id: string
          commentaires?: string | null
          contact_id: string
          created_at?: string
          date_emission?: string | null
          date_validite?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          facture_id?: string | null
          id?: string
          montant_total?: number
          numero_devis: string
          session_inscription_id?: string | null
          statut?: Database["public"]["Enums"]["devis_statut"]
          type_financement?: Database["public"]["Enums"]["financement_type"]
          updated_at?: string
        }
        Update: {
          centre_id?: string
          commentaires?: string | null
          contact_id?: string
          created_at?: string
          date_emission?: string | null
          date_validite?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          facture_id?: string | null
          id?: string
          montant_total?: number
          numero_devis?: string
          session_inscription_id?: string | null
          statut?: Database["public"]["Enums"]["devis_statut"]
          type_financement?: Database["public"]["Enums"]["financement_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "devis_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_session_inscription_id_fkey"
            columns: ["session_inscription_id"]
            isOneToOne: false
            referencedRelation: "session_inscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      devis_lignes: {
        Row: {
          catalogue_formation_id: string | null
          created_at: string
          description: string
          devis_id: string
          id: string
          montant_ht: number | null
          montant_ttc: number | null
          montant_tva: number | null
          ordre: number
          prix_unitaire_ht: number
          quantite: number
          remise_percent: number
          tva_percent: number
        }
        Insert: {
          catalogue_formation_id?: string | null
          created_at?: string
          description: string
          devis_id: string
          id?: string
          montant_ht?: number | null
          montant_ttc?: number | null
          montant_tva?: number | null
          ordre?: number
          prix_unitaire_ht: number
          quantite?: number
          remise_percent?: number
          tva_percent?: number
        }
        Update: {
          catalogue_formation_id?: string | null
          created_at?: string
          description?: string
          devis_id?: string
          id?: string
          montant_ht?: number | null
          montant_ttc?: number | null
          montant_tva?: number | null
          ordre?: number
          prix_unitaire_ht?: number
          quantite?: number
          remise_percent?: number
          tva_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "devis_lignes_catalogue_formation_id_fkey"
            columns: ["catalogue_formation_id"]
            isOneToOne: false
            referencedRelation: "catalogue_formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_lignes_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
        ]
      }
      dismissed_alerts: {
        Row: {
          alert_id: string
          dismissed_at: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          alert_id: string
          dismissed_at?: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          alert_id?: string
          dismissed_at?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      document_envois: {
        Row: {
          click_count: number
          clicked_at: string | null
          commentaires: string | null
          contact_id: string | null
          created_at: string
          date_envoi: string
          date_reception: string | null
          document_name: string
          document_path: string | null
          document_type: string
          envoi_type: string
          envoyé_par: string | null
          formateur_id: string | null
          id: string
          metadata: Json | null
          sent_at: string | null
          session_id: string | null
          statut: string
          tracking_token: string | null
        }
        Insert: {
          click_count?: number
          clicked_at?: string | null
          commentaires?: string | null
          contact_id?: string | null
          created_at?: string
          date_envoi?: string
          date_reception?: string | null
          document_name: string
          document_path?: string | null
          document_type: string
          envoi_type?: string
          envoyé_par?: string | null
          formateur_id?: string | null
          id?: string
          metadata?: Json | null
          sent_at?: string | null
          session_id?: string | null
          statut?: string
          tracking_token?: string | null
        }
        Update: {
          click_count?: number
          clicked_at?: string | null
          commentaires?: string | null
          contact_id?: string | null
          created_at?: string
          date_envoi?: string
          date_reception?: string | null
          document_name?: string
          document_path?: string | null
          document_type?: string
          envoi_type?: string
          envoyé_par?: string | null
          formateur_id?: string | null
          id?: string
          metadata?: Json | null
          sent_at?: string | null
          session_id?: string | null
          statut?: string
          tracking_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_envois_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_envois_formateur_id_fkey"
            columns: ["formateur_id"]
            isOneToOne: false
            referencedRelation: "formateurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_envois_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      document_instances: {
        Row: {
          centre_id: string | null
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["template_entity_type"]
          id: string
          metadata: Json | null
          rendered_output_url: string | null
          status: Database["public"]["Enums"]["document_instance_status"]
          template_id: string | null
        }
        Insert: {
          centre_id?: string | null
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["template_entity_type"]
          id?: string
          metadata?: Json | null
          rendered_output_url?: string | null
          status?: Database["public"]["Enums"]["document_instance_status"]
          template_id?: string | null
        }
        Update: {
          centre_id?: string | null
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["template_entity_type"]
          id?: string
          metadata?: Json | null
          rendered_output_url?: string | null
          status?: Database["public"]["Enums"]["document_instance_status"]
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_instances_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_instances_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "template_studio_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      document_pack_items: {
        Row: {
          auto_generate: boolean | null
          created_at: string | null
          id: string
          is_required: boolean | null
          pack_id: string
          sort_order: number | null
          template_id: string
        }
        Insert: {
          auto_generate?: boolean | null
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          pack_id: string
          sort_order?: number | null
          template_id: string
        }
        Update: {
          auto_generate?: boolean | null
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          pack_id?: string
          sort_order?: number | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_pack_items_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "document_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_pack_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "template_studio_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      document_packs: {
        Row: {
          applies_to: Database["public"]["Enums"]["template_applies_to"]
          centre_id: string
          created_at: string | null
          created_by: string | null
          formation_category: string | null
          id: string
          is_default: boolean | null
          name: string
          track_scope: Database["public"]["Enums"]["template_track_scope"]
          updated_at: string | null
        }
        Insert: {
          applies_to?: Database["public"]["Enums"]["template_applies_to"]
          centre_id: string
          created_at?: string | null
          created_by?: string | null
          formation_category?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          track_scope?: Database["public"]["Enums"]["template_track_scope"]
          updated_at?: string | null
        }
        Update: {
          applies_to?: Database["public"]["Enums"]["template_applies_to"]
          centre_id?: string
          created_at?: string | null
          created_by?: string | null
          formation_category?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          track_scope?: Database["public"]["Enums"]["template_track_scope"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_packs_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_packs_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      document_template_files: {
        Row: {
          actif: boolean | null
          categorie: string | null
          centre_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          file_path: string
          file_size: number | null
          formation_type: string | null
          id: string
          is_default: boolean
          mime_type: string | null
          nom: string
          type_document: string | null
          type_fichier: string
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          actif?: boolean | null
          categorie?: string | null
          centre_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_path: string
          file_size?: number | null
          formation_type?: string | null
          id?: string
          is_default?: boolean
          mime_type?: string | null
          nom: string
          type_document?: string | null
          type_fichier: string
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          actif?: boolean | null
          categorie?: string | null
          centre_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_path?: string
          file_size?: number | null
          formation_type?: string | null
          id?: string
          is_default?: boolean
          mime_type?: string | null
          nom?: string
          type_document?: string | null
          type_fichier?: string
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "document_template_files_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_template_files_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          actif: boolean
          categorie: string
          contenu: string
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          id: string
          nom: string
          type_document: string
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          actif?: boolean
          categorie?: string
          contenu: string
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          nom: string
          type_document?: string
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          actif?: boolean
          categorie?: string
          contenu?: string
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          nom?: string
          type_document?: string
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          contact_id: string | null
          created_at: string
          error_message: string | null
          facture_id: string | null
          id: string
          metadata: Json | null
          recipient_email: string
          recipient_name: string | null
          resend_id: string | null
          session_id: string | null
          status: string
          subject: string
          template_used: string | null
          type: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          error_message?: string | null
          facture_id?: string | null
          id?: string
          metadata?: Json | null
          recipient_email: string
          recipient_name?: string | null
          resend_id?: string | null
          session_id?: string | null
          status?: string
          subject: string
          template_used?: string | null
          type: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          error_message?: string | null
          facture_id?: string | null
          id?: string
          metadata?: Json | null
          recipient_email?: string
          recipient_name?: string | null
          resend_id?: string | null
          session_id?: string | null
          status?: string
          subject?: string
          template_used?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          actif: boolean
          categorie: string
          centre_id: string | null
          contenu: string
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          nom: string
          sujet: string
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          actif?: boolean
          categorie?: string
          centre_id?: string | null
          contenu: string
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          nom: string
          sujet: string
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          actif?: boolean
          categorie?: string
          centre_id?: string | null
          contenu?: string
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          nom?: string
          sujet?: string
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_templates_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      email_tracking_events: {
        Row: {
          centre_id: string | null
          contact_id: string | null
          created_at: string
          event_type: string
          id: string
          ip_address: unknown
          source_id: string
          source_table: string
          target_url: string | null
          tracking_token: string
          user_agent: string | null
        }
        Insert: {
          centre_id?: string | null
          contact_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          ip_address?: unknown
          source_id: string
          source_table: string
          target_url?: string | null
          tracking_token: string
          user_agent?: string | null
        }
        Update: {
          centre_id?: string | null
          contact_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: unknown
          source_id?: string
          source_table?: string
          target_url?: string | null
          tracking_token?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_tracking_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      emargements: {
        Row: {
          commentaires: string | null
          contact_id: string
          created_at: string
          date_emargement: string
          date_signature: string | null
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          heure_debut: string | null
          heure_fin: string | null
          id: string
          ip_signature: string | null
          periode: string
          present: boolean
          session_id: string
          signature_data: string | null
          signature_url: string | null
          updated_at: string
          user_agent_signature: string | null
        }
        Insert: {
          commentaires?: string | null
          contact_id: string
          created_at?: string
          date_emargement: string
          date_signature?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          heure_debut?: string | null
          heure_fin?: string | null
          id?: string
          ip_signature?: string | null
          periode: string
          present?: boolean
          session_id: string
          signature_data?: string | null
          signature_url?: string | null
          updated_at?: string
          user_agent_signature?: string | null
        }
        Update: {
          commentaires?: string | null
          contact_id?: string
          created_at?: string
          date_emargement?: string
          date_signature?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          heure_debut?: string | null
          heure_fin?: string | null
          id?: string
          ip_signature?: string | null
          periode?: string
          present?: boolean
          session_id?: string
          signature_data?: string | null
          signature_url?: string | null
          updated_at?: string
          user_agent_signature?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emargements_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emargements_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      enquete_tokens: {
        Row: {
          contact_id: string
          created_at: string
          expire_at: string
          id: string
          session_id: string | null
          token: string
          type: string
          used_at: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string
          expire_at?: string
          id?: string
          session_id?: string | null
          token?: string
          type?: string
          used_at?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string
          expire_at?: string
          id?: string
          session_id?: string | null
          token?: string
          type?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enquete_tokens_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquete_tokens_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      envois_groupes: {
        Row: {
          created_at: string | null
          date_envoi: string | null
          destinataires_ids: string[]
          id: string
          nombre_destinataires: number
          session_id: string | null
          type_document: string
        }
        Insert: {
          created_at?: string | null
          date_envoi?: string | null
          destinataires_ids: string[]
          id?: string
          nombre_destinataires: number
          session_id?: string | null
          type_document: string
        }
        Update: {
          created_at?: string | null
          date_envoi?: string | null
          destinataires_ids?: string[]
          id?: string
          nombre_destinataires?: number
          session_id?: string | null
          type_document?: string
        }
        Relationships: [
          {
            foreignKeyName: "envois_groupes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      examens_pratique: {
        Row: {
          adresse_centre: string | null
          centre_examen: string | null
          contact_id: string
          created_at: string
          date_examen: string
          document_resultat_path: string | null
          evaluateur_id: string | null
          fiche_pratique_id: string
          heure_examen: string | null
          id: string
          numero_tentative: number | null
          observations: string | null
          resultat: string | null
          score: number | null
          statut: string
          type_examen: string
          updated_at: string
          vehicule_id: string | null
        }
        Insert: {
          adresse_centre?: string | null
          centre_examen?: string | null
          contact_id: string
          created_at?: string
          date_examen: string
          document_resultat_path?: string | null
          evaluateur_id?: string | null
          fiche_pratique_id: string
          heure_examen?: string | null
          id?: string
          numero_tentative?: number | null
          observations?: string | null
          resultat?: string | null
          score?: number | null
          statut?: string
          type_examen: string
          updated_at?: string
          vehicule_id?: string | null
        }
        Update: {
          adresse_centre?: string | null
          centre_examen?: string | null
          contact_id?: string
          created_at?: string
          date_examen?: string
          document_resultat_path?: string | null
          evaluateur_id?: string | null
          fiche_pratique_id?: string
          heure_examen?: string | null
          id?: string
          numero_tentative?: number | null
          observations?: string | null
          resultat?: string | null
          score?: number | null
          statut?: string
          type_examen?: string
          updated_at?: string
          vehicule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "examens_pratique_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "examens_pratique_evaluateur_id_fkey"
            columns: ["evaluateur_id"]
            isOneToOne: false
            referencedRelation: "formateurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "examens_pratique_fiche_pratique_id_fkey"
            columns: ["fiche_pratique_id"]
            isOneToOne: false
            referencedRelation: "fiches_pratique"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "examens_pratique_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
        ]
      }
      examens_t3p: {
        Row: {
          centre_examen: string | null
          contact_id: string
          created_at: string
          date_examen: string
          date_expiration: string | null
          date_reussite: string | null
          departement: string | null
          document_resultat_path: string | null
          heure_examen: string | null
          id: string
          numero_convocation: string | null
          numero_dossier: string | null
          numero_tentative: number
          observations: string | null
          resultat: string | null
          score: number | null
          statut: string
          type_formation: string
          updated_at: string
        }
        Insert: {
          centre_examen?: string | null
          contact_id: string
          created_at?: string
          date_examen: string
          date_expiration?: string | null
          date_reussite?: string | null
          departement?: string | null
          document_resultat_path?: string | null
          heure_examen?: string | null
          id?: string
          numero_convocation?: string | null
          numero_dossier?: string | null
          numero_tentative?: number
          observations?: string | null
          resultat?: string | null
          score?: number | null
          statut?: string
          type_formation: string
          updated_at?: string
        }
        Update: {
          centre_examen?: string | null
          contact_id?: string
          created_at?: string
          date_examen?: string
          date_expiration?: string | null
          date_reussite?: string | null
          departement?: string | null
          document_resultat_path?: string | null
          heure_examen?: string | null
          id?: string
          numero_convocation?: string | null
          numero_dossier?: string | null
          numero_tentative?: number
          observations?: string | null
          resultat?: string | null
          score?: number | null
          statut?: string
          type_formation?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "examens_t3p_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      facture_lignes: {
        Row: {
          catalogue_formation_id: string | null
          created_at: string
          description: string
          facture_id: string
          id: string
          montant_ht: number | null
          montant_ttc: number | null
          montant_tva: number | null
          ordre: number
          prix_unitaire_ht: number
          quantite: number
          tva_percent: number
        }
        Insert: {
          catalogue_formation_id?: string | null
          created_at?: string
          description: string
          facture_id: string
          id?: string
          montant_ht?: number | null
          montant_ttc?: number | null
          montant_tva?: number | null
          ordre?: number
          prix_unitaire_ht: number
          quantite?: number
          tva_percent?: number
        }
        Update: {
          catalogue_formation_id?: string | null
          created_at?: string
          description?: string
          facture_id?: string
          id?: string
          montant_ht?: number | null
          montant_ttc?: number | null
          montant_tva?: number | null
          ordre?: number
          prix_unitaire_ht?: number
          quantite?: number
          tva_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "facture_lignes_catalogue_formation_id_fkey"
            columns: ["catalogue_formation_id"]
            isOneToOne: false
            referencedRelation: "catalogue_formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facture_lignes_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
        ]
      }
      factures: {
        Row: {
          centre_id: string
          commentaires: string | null
          contact_id: string
          created_at: string
          date_echeance: string | null
          date_emission: string | null
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          montant_total: number
          numero_facture: string
          session_inscription_id: string | null
          statut: Database["public"]["Enums"]["facture_statut"]
          type_financement: Database["public"]["Enums"]["financement_type"]
          updated_at: string
        }
        Insert: {
          centre_id: string
          commentaires?: string | null
          contact_id: string
          created_at?: string
          date_echeance?: string | null
          date_emission?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          montant_total: number
          numero_facture: string
          session_inscription_id?: string | null
          statut?: Database["public"]["Enums"]["facture_statut"]
          type_financement?: Database["public"]["Enums"]["financement_type"]
          updated_at?: string
        }
        Update: {
          centre_id?: string
          commentaires?: string | null
          contact_id?: string
          created_at?: string
          date_echeance?: string | null
          date_emission?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          montant_total?: number
          numero_facture?: string
          session_inscription_id?: string | null
          statut?: Database["public"]["Enums"]["facture_statut"]
          type_financement?: Database["public"]["Enums"]["financement_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "factures_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_session_inscription_id_fkey"
            columns: ["session_inscription_id"]
            isOneToOne: false
            referencedRelation: "session_inscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      fiches_pratique: {
        Row: {
          contact_id: string
          created_at: string
          date_debut: string | null
          date_fin_prevue: string | null
          formation_type: string
          heures_prevues: number
          heures_realisees: number
          id: string
          notes: string | null
          statut: string
          updated_at: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          date_debut?: string | null
          date_fin_prevue?: string | null
          formation_type: string
          heures_prevues?: number
          heures_realisees?: number
          id?: string
          notes?: string | null
          statut?: string
          updated_at?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          date_debut?: string | null
          date_fin_prevue?: string | null
          formation_type?: string
          heures_prevues?: number
          heures_realisees?: number
          id?: string
          notes?: string | null
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiches_pratique_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_cash_manual: {
        Row: {
          amount: number
          created_at: string
          financial_month_id: string
          id: string
          label: string
          type: string
        }
        Insert: {
          amount?: number
          created_at?: string
          financial_month_id: string
          id?: string
          label: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          financial_month_id?: string
          id?: string
          label?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_cash_manual_financial_month_id_fkey"
            columns: ["financial_month_id"]
            isOneToOne: false
            referencedRelation: "financial_months"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_costs: {
        Row: {
          amount: number
          created_at: string
          financial_month_id: string
          id: string
          label: string
          type: string
        }
        Insert: {
          amount?: number
          created_at?: string
          financial_month_id: string
          id?: string
          label: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          financial_month_id?: string
          id?: string
          label?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_costs_financial_month_id_fkey"
            columns: ["financial_month_id"]
            isOneToOne: false
            referencedRelation: "financial_months"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_months: {
        Row: {
          created_at: string
          id: string
          month: string
        }
        Insert: {
          created_at?: string
          id?: string
          month: string
        }
        Update: {
          created_at?: string
          id?: string
          month?: string
        }
        Relationships: []
      }
      formateur_documents: {
        Row: {
          commentaires: string | null
          created_at: string
          date_expiration: string | null
          date_obtention: string | null
          file_path: string | null
          formateur_id: string
          id: string
          nom: string
          type_document: string
        }
        Insert: {
          commentaires?: string | null
          created_at?: string
          date_expiration?: string | null
          date_obtention?: string | null
          file_path?: string | null
          formateur_id: string
          id?: string
          nom: string
          type_document: string
        }
        Update: {
          commentaires?: string | null
          created_at?: string
          date_expiration?: string | null
          date_obtention?: string | null
          file_path?: string | null
          formateur_id?: string
          id?: string
          nom?: string
          type_document?: string
        }
        Relationships: [
          {
            foreignKeyName: "formateur_documents_formateur_id_fkey"
            columns: ["formateur_id"]
            isOneToOne: false
            referencedRelation: "formateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      formateur_factures: {
        Row: {
          commentaires: string | null
          created_at: string
          date_facture: string
          date_paiement: string | null
          formateur_id: string
          id: string
          montant_ht: number
          montant_ttc: number
          numero_facture: string
          periode_debut: string | null
          periode_fin: string | null
          statut: string
          tva_percent: number
          updated_at: string
        }
        Insert: {
          commentaires?: string | null
          created_at?: string
          date_facture?: string
          date_paiement?: string | null
          formateur_id: string
          id?: string
          montant_ht?: number
          montant_ttc?: number
          numero_facture: string
          periode_debut?: string | null
          periode_fin?: string | null
          statut?: string
          tva_percent?: number
          updated_at?: string
        }
        Update: {
          commentaires?: string | null
          created_at?: string
          date_facture?: string
          date_paiement?: string | null
          formateur_id?: string
          id?: string
          montant_ht?: number
          montant_ttc?: number
          numero_facture?: string
          periode_debut?: string | null
          periode_fin?: string | null
          statut?: string
          tva_percent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "formateur_factures_formateur_id_fkey"
            columns: ["formateur_id"]
            isOneToOne: false
            referencedRelation: "formateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      formateurs: {
        Row: {
          actif: boolean
          adresse: string | null
          centre_id: string
          code_postal: string | null
          created_at: string
          date_agrement: string | null
          diplomes: string[] | null
          email: string | null
          id: string
          nom: string
          notes: string | null
          numero_agrement: string | null
          prenom: string
          rib: string | null
          siret: string | null
          specialites: string[] | null
          taux_horaire: number | null
          telephone: string | null
          updated_at: string
          user_id: string | null
          ville: string | null
        }
        Insert: {
          actif?: boolean
          adresse?: string | null
          centre_id: string
          code_postal?: string | null
          created_at?: string
          date_agrement?: string | null
          diplomes?: string[] | null
          email?: string | null
          id?: string
          nom: string
          notes?: string | null
          numero_agrement?: string | null
          prenom: string
          rib?: string | null
          siret?: string | null
          specialites?: string[] | null
          taux_horaire?: number | null
          telephone?: string | null
          updated_at?: string
          user_id?: string | null
          ville?: string | null
        }
        Update: {
          actif?: boolean
          adresse?: string | null
          centre_id?: string
          code_postal?: string | null
          created_at?: string
          date_agrement?: string | null
          diplomes?: string[] | null
          email?: string | null
          id?: string
          nom?: string
          notes?: string | null
          numero_agrement?: string | null
          prenom?: string
          rib?: string | null
          siret?: string | null
          specialites?: string[] | null
          taux_horaire?: number | null
          telephone?: string | null
          updated_at?: string
          user_id?: string | null
          ville?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "formateurs_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formateurs_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      gdpr_processing_history: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          changed_fields: string[] | null
          id: string
          new_values: Json | null
          notes: string | null
          old_values: Json | null
          processing_id: string
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[] | null
          id?: string
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
          processing_id: string
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[] | null
          id?: string
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
          processing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gdpr_processing_history_processing_id_fkey"
            columns: ["processing_id"]
            isOneToOne: false
            referencedRelation: "gdpr_processing_register"
            referencedColumns: ["id"]
          },
        ]
      }
      gdpr_processing_register: {
        Row: {
          analyse_impact_requise: boolean | null
          base_legale: string
          categories_donnees: string[]
          categories_personnes: string[]
          code: string
          created_at: string
          created_by: string | null
          date_mise_en_oeuvre: string | null
          decisions_automatisees: boolean | null
          delais_conservation: string | null
          description: string | null
          destinataires: string[] | null
          finalites: string
          id: string
          mesures_securite: string[] | null
          nom_traitement: string
          responsable_traitement: string | null
          source_donnees: string | null
          sous_traitants: Json | null
          statut: string
          transferts_hors_ue: Json | null
          updated_at: string
        }
        Insert: {
          analyse_impact_requise?: boolean | null
          base_legale: string
          categories_donnees?: string[]
          categories_personnes?: string[]
          code: string
          created_at?: string
          created_by?: string | null
          date_mise_en_oeuvre?: string | null
          decisions_automatisees?: boolean | null
          delais_conservation?: string | null
          description?: string | null
          destinataires?: string[] | null
          finalites: string
          id?: string
          mesures_securite?: string[] | null
          nom_traitement: string
          responsable_traitement?: string | null
          source_donnees?: string | null
          sous_traitants?: Json | null
          statut?: string
          transferts_hors_ue?: Json | null
          updated_at?: string
        }
        Update: {
          analyse_impact_requise?: boolean | null
          base_legale?: string
          categories_donnees?: string[]
          categories_personnes?: string[]
          code?: string
          created_at?: string
          created_by?: string | null
          date_mise_en_oeuvre?: string | null
          decisions_automatisees?: boolean | null
          delais_conservation?: string | null
          description?: string | null
          destinataires?: string[] | null
          finalites?: string
          id?: string
          mesures_securite?: string[] | null
          nom_traitement?: string
          responsable_traitement?: string | null
          source_donnees?: string | null
          sous_traitants?: Json | null
          statut?: string
          transferts_hors_ue?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      generated_documents_legacy: {
        Row: {
          contact_id: string
          created_at: string
          created_by: string | null
          file_path: string
          file_size: number | null
          id: string
          metadata: Json | null
          mime_type: string | null
          nom: string
          session_id: string | null
          template_file_id: string | null
          template_text_id: string | null
          version: number | null
        }
        Insert: {
          contact_id: string
          created_at?: string
          created_by?: string | null
          file_path: string
          file_size?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          nom: string
          session_id?: string | null
          template_file_id?: string | null
          template_text_id?: string | null
          version?: number | null
        }
        Update: {
          contact_id?: string
          created_at?: string
          created_by?: string | null
          file_path?: string
          file_size?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          nom?: string
          session_id?: string | null
          template_file_id?: string | null
          template_text_id?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_template_file_id_fkey"
            columns: ["template_file_id"]
            isOneToOne: false
            referencedRelation: "document_template_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_template_text_id_fkey"
            columns: ["template_text_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_documents_v2: {
        Row: {
          centre_id: string
          contact_id: string | null
          created_at: string | null
          created_by: string | null
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          error_message: string | null
          file_name: string | null
          file_path: string | null
          file_type: string | null
          id: string
          inscription_id: string | null
          pack_id: string | null
          session_id: string | null
          status: Database["public"]["Enums"]["generated_doc_status"] | null
          template_id: string
          template_version_id: string | null
          variables_snapshot: Json | null
        }
        Insert: {
          centre_id: string
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          error_message?: string | null
          file_name?: string | null
          file_path?: string | null
          file_type?: string | null
          id?: string
          inscription_id?: string | null
          pack_id?: string | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["generated_doc_status"] | null
          template_id: string
          template_version_id?: string | null
          variables_snapshot?: Json | null
        }
        Update: {
          centre_id?: string
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          error_message?: string | null
          file_name?: string | null
          file_path?: string | null
          file_type?: string | null
          id?: string
          inscription_id?: string | null
          pack_id?: string | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["generated_doc_status"] | null
          template_id?: string
          template_version_id?: string | null
          variables_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_v2_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_v2_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_v2_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_v2_inscription_id_fkey"
            columns: ["inscription_id"]
            isOneToOne: false
            referencedRelation: "session_inscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_v2_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "document_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_v2_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_v2_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "template_studio_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_v2_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      grilles_evaluation: {
        Row: {
          categorie: string
          commentaire: string | null
          competence: string
          created_at: string
          examen_pratique_id: string | null
          id: string
          note: string | null
        }
        Insert: {
          categorie: string
          commentaire?: string | null
          competence: string
          created_at?: string
          examen_pratique_id?: string | null
          id?: string
          note?: string | null
        }
        Update: {
          categorie?: string
          commentaire?: string | null
          competence?: string
          created_at?: string
          examen_pratique_id?: string | null
          id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grilles_evaluation_examen_pratique_id_fkey"
            columns: ["examen_pratique_id"]
            isOneToOne: false
            referencedRelation: "examens_pratique"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_action_logs: {
        Row: {
          action_type: string
          anomaly_id: string
          anomaly_title: string | null
          centre_id: string | null
          created_at: string
          created_by: string | null
          entity_ids: string[] | null
          id: string
          payload: Json | null
          result: Json | null
          status: string
        }
        Insert: {
          action_type: string
          anomaly_id: string
          anomaly_title?: string | null
          centre_id?: string | null
          created_at?: string
          created_by?: string | null
          entity_ids?: string[] | null
          id?: string
          payload?: Json | null
          result?: Json | null
          status?: string
        }
        Update: {
          action_type?: string
          anomaly_id?: string
          anomaly_title?: string | null
          centre_id?: string | null
          created_at?: string
          created_by?: string | null
          entity_ids?: string[] | null
          id?: string
          payload?: Json | null
          result?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ia_action_logs_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_action_logs_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_prospect_scoring: {
        Row: {
          centre_id: string
          created_at: string
          date_derniere_analyse: string
          delai_optimal_relance: number | null
          facteurs_negatifs: string[] | null
          facteurs_positifs: string[] | null
          id: string
          niveau_chaleur: string
          probabilite_conversion: number
          prospect_id: string
          score_conversion: number
          updated_at: string
          valeur_potentielle_euros: number
        }
        Insert: {
          centre_id: string
          created_at?: string
          date_derniere_analyse?: string
          delai_optimal_relance?: number | null
          facteurs_negatifs?: string[] | null
          facteurs_positifs?: string[] | null
          id?: string
          niveau_chaleur?: string
          probabilite_conversion?: number
          prospect_id: string
          score_conversion?: number
          updated_at?: string
          valeur_potentielle_euros?: number
        }
        Update: {
          centre_id?: string
          created_at?: string
          date_derniere_analyse?: string
          delai_optimal_relance?: number | null
          facteurs_negatifs?: string[] | null
          facteurs_positifs?: string[] | null
          id?: string
          niveau_chaleur?: string
          probabilite_conversion?: number
          prospect_id?: string
          score_conversion?: number
          updated_at?: string
          valeur_potentielle_euros?: number
        }
        Relationships: [
          {
            foreignKeyName: "ia_prospect_scoring_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_prospect_scoring_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_prospect_scoring_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: true
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_score_history: {
        Row: {
          centre_id: string
          created_at: string
          date_snapshot: string
          details: Json | null
          id: string
          ponderations: Json
          score_admin: number
          score_commercial: number
          score_financier: number
          score_global: number
          score_risque_ca: number
          score_sante: number
        }
        Insert: {
          centre_id: string
          created_at?: string
          date_snapshot?: string
          details?: Json | null
          id?: string
          ponderations?: Json
          score_admin?: number
          score_commercial?: number
          score_financier?: number
          score_global?: number
          score_risque_ca?: number
          score_sante?: number
        }
        Update: {
          centre_id?: string
          created_at?: string
          date_snapshot?: string
          details?: Json | null
          id?: string
          ponderations?: Json
          score_admin?: number
          score_commercial?: number
          score_financier?: number
          score_global?: number
          score_risque_ca?: number
          score_sante?: number
        }
        Relationships: [
          {
            foreignKeyName: "ia_score_history_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_score_history_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          centre_name: string
          contact_name: string
          created_at: string
          email: string
          id: string
          message: string | null
          phone: string | null
          source: string | null
          volume: string | null
        }
        Insert: {
          centre_name: string
          contact_name: string
          created_at?: string
          email: string
          id?: string
          message?: string | null
          phone?: string | null
          source?: string | null
          volume?: string | null
        }
        Update: {
          centre_name?: string
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          phone?: string | null
          source?: string | null
          volume?: string | null
        }
        Relationships: []
      }
      legal_mentions: {
        Row: {
          activated_at: string | null
          archived_at: string | null
          capital_social: string | null
          contenu: string
          created_at: string
          created_by: string | null
          directeur_publication: string | null
          email_contact: string | null
          forme_juridique: string | null
          hebergeur_adresse: string | null
          hebergeur_contact: string | null
          hebergeur_nom: string | null
          id: string
          nda: string | null
          raison_sociale: string | null
          rcs: string | null
          siege_social: string | null
          siret: string | null
          status: string
          telephone_contact: string | null
          version: number
        }
        Insert: {
          activated_at?: string | null
          archived_at?: string | null
          capital_social?: string | null
          contenu: string
          created_at?: string
          created_by?: string | null
          directeur_publication?: string | null
          email_contact?: string | null
          forme_juridique?: string | null
          hebergeur_adresse?: string | null
          hebergeur_contact?: string | null
          hebergeur_nom?: string | null
          id?: string
          nda?: string | null
          raison_sociale?: string | null
          rcs?: string | null
          siege_social?: string | null
          siret?: string | null
          status?: string
          telephone_contact?: string | null
          version?: number
        }
        Update: {
          activated_at?: string | null
          archived_at?: string | null
          capital_social?: string | null
          contenu?: string
          created_at?: string
          created_by?: string | null
          directeur_publication?: string | null
          email_contact?: string | null
          forme_juridique?: string | null
          hebergeur_adresse?: string | null
          hebergeur_contact?: string | null
          hebergeur_nom?: string | null
          id?: string
          nda?: string | null
          raison_sociale?: string | null
          rcs?: string | null
          siege_social?: string | null
          siret?: string | null
          status?: string
          telephone_contact?: string | null
          version?: number
        }
        Relationships: []
      }
      legal_mentions_history: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          changed_fields: string[] | null
          id: string
          mention_id: string
          new_values: Json | null
          old_values: Json | null
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[] | null
          id?: string
          mention_id: string
          new_values?: Json | null
          old_values?: Json | null
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[] | null
          id?: string
          mention_id?: string
          new_values?: Json | null
          old_values?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_mentions_history_mention_id_fkey"
            columns: ["mention_id"]
            isOneToOne: false
            referencedRelation: "legal_mentions"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_answers: {
        Row: {
          created_at: string | null
          explication: string | null
          id: string
          is_correct: boolean | null
          ordre: number | null
          question_id: string
          texte: string
        }
        Insert: {
          created_at?: string | null
          explication?: string | null
          id?: string
          is_correct?: boolean | null
          ordre?: number | null
          question_id: string
          texte: string
        }
        Update: {
          created_at?: string | null
          explication?: string | null
          id?: string
          is_correct?: boolean | null
          ordre?: number | null
          question_id?: string
          texte?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "lms_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_competencies: {
        Row: {
          categorie: string
          code: string
          created_at: string
          description: string | null
          id: string
          libelle: string
          updated_at: string
        }
        Insert: {
          categorie: string
          code: string
          created_at?: string
          description?: string | null
          id?: string
          libelle: string
          updated_at?: string
        }
        Update: {
          categorie?: string
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          libelle?: string
          updated_at?: string
        }
        Relationships: []
      }
      lms_enrollments: {
        Row: {
          contact_id: string
          created_at: string
          date_completion: string | null
          date_debut: string
          date_fin_prevue: string | null
          formation_id: string
          id: string
          progression_pct: number
          session_id: string | null
          statut: string
          temps_total_sec: number
          updated_at: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          date_completion?: string | null
          date_debut?: string
          date_fin_prevue?: string | null
          formation_id: string
          id?: string
          progression_pct?: number
          session_id?: string | null
          statut?: string
          temps_total_sec?: number
          updated_at?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          date_completion?: string | null
          date_debut?: string
          date_fin_prevue?: string | null
          formation_id?: string
          id?: string
          progression_pct?: number
          session_id?: string | null
          statut?: string
          temps_total_sec?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_enrollments_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "lms_formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_enrollments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_exam_attempts: {
        Row: {
          analyse_competences: Json | null
          analyse_themes: Json | null
          completed_at: string | null
          contact_id: string
          created_at: string
          id: string
          mock_exam_id: string
          nb_correct: number
          nb_total: number
          reponses_detail: Json | null
          reussi: boolean
          score_pct: number
          started_at: string
          temps_passe_sec: number
          tentative_numero: number
        }
        Insert: {
          analyse_competences?: Json | null
          analyse_themes?: Json | null
          completed_at?: string | null
          contact_id: string
          created_at?: string
          id?: string
          mock_exam_id: string
          nb_correct?: number
          nb_total?: number
          reponses_detail?: Json | null
          reussi?: boolean
          score_pct?: number
          started_at?: string
          temps_passe_sec?: number
          tentative_numero?: number
        }
        Update: {
          analyse_competences?: Json | null
          analyse_themes?: Json | null
          completed_at?: string | null
          contact_id?: string
          created_at?: string
          id?: string
          mock_exam_id?: string
          nb_correct?: number
          nb_total?: number
          reponses_detail?: Json | null
          reussi?: boolean
          score_pct?: number
          started_at?: string
          temps_passe_sec?: number
          tentative_numero?: number
        }
        Relationships: [
          {
            foreignKeyName: "lms_exam_attempts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_exam_attempts_mock_exam_id_fkey"
            columns: ["mock_exam_id"]
            isOneToOne: false
            referencedRelation: "lms_mock_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_formations: {
        Row: {
          actif: boolean
          catalogue_formation_id: string | null
          categorie: string
          centre_id: string | null
          code: string
          competences_visees: string[] | null
          created_at: string
          description: string | null
          duree_heures: number
          id: string
          image_url: string | null
          modalites_evaluation: string | null
          modalites_pedagogiques: string | null
          nom: string
          ordre: number
          public_concerne: string | null
          references_reglementaires: string | null
          seuil_reussite_pct: number
          type_formation: string
          updated_at: string
          version: number | null
          zone_geographique: string | null
        }
        Insert: {
          actif?: boolean
          catalogue_formation_id?: string | null
          categorie: string
          centre_id?: string | null
          code: string
          competences_visees?: string[] | null
          created_at?: string
          description?: string | null
          duree_heures?: number
          id?: string
          image_url?: string | null
          modalites_evaluation?: string | null
          modalites_pedagogiques?: string | null
          nom: string
          ordre?: number
          public_concerne?: string | null
          references_reglementaires?: string | null
          seuil_reussite_pct?: number
          type_formation: string
          updated_at?: string
          version?: number | null
          zone_geographique?: string | null
        }
        Update: {
          actif?: boolean
          catalogue_formation_id?: string | null
          categorie?: string
          centre_id?: string | null
          code?: string
          competences_visees?: string[] | null
          created_at?: string
          description?: string | null
          duree_heures?: number
          id?: string
          image_url?: string | null
          modalites_evaluation?: string | null
          modalites_pedagogiques?: string | null
          nom?: string
          ordre?: number
          public_concerne?: string | null
          references_reglementaires?: string | null
          seuil_reussite_pct?: number
          type_formation?: string
          updated_at?: string
          version?: number | null
          zone_geographique?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lms_formations_catalogue_formation_id_fkey"
            columns: ["catalogue_formation_id"]
            isOneToOne: false
            referencedRelation: "catalogue_formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_formations_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_formations_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_lesson_progress: {
        Row: {
          completed_at: string | null
          contact_id: string
          created_at: string
          id: string
          lesson_id: string
          position_video_sec: number | null
          statut: string
          temps_passe_sec: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          contact_id: string
          created_at?: string
          id?: string
          lesson_id: string
          position_video_sec?: number | null
          statut?: string
          temps_passe_sec?: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          contact_id?: string
          created_at?: string
          id?: string
          lesson_id?: string
          position_video_sec?: number | null
          statut?: string
          temps_passe_sec?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_lesson_progress_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lms_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_lessons: {
        Row: {
          actif: boolean
          contenu_html: string | null
          created_at: string
          description: string | null
          duree_estimee_min: number
          id: string
          module_id: string
          niveau: string
          ordre: number
          titre: string
          updated_at: string
        }
        Insert: {
          actif?: boolean
          contenu_html?: string | null
          created_at?: string
          description?: string | null
          duree_estimee_min?: number
          id?: string
          module_id: string
          niveau?: string
          ordre?: number
          titre: string
          updated_at?: string
        }
        Update: {
          actif?: boolean
          contenu_html?: string | null
          created_at?: string
          description?: string | null
          duree_estimee_min?: number
          id?: string
          module_id?: string
          niveau?: string
          ordre?: number
          titre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "lms_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_mock_exams: {
        Row: {
          actif: boolean
          conditions_reelles: boolean
          config_timer: Json | null
          created_at: string
          description: string | null
          formation_id: string
          id: string
          nb_questions: number
          ordre: number
          seuil_reussite_pct: number
          temps_limite_min: number
          titre: string
          updated_at: string
        }
        Insert: {
          actif?: boolean
          conditions_reelles?: boolean
          config_timer?: Json | null
          created_at?: string
          description?: string | null
          formation_id: string
          id?: string
          nb_questions?: number
          ordre?: number
          seuil_reussite_pct?: number
          temps_limite_min?: number
          titre: string
          updated_at?: string
        }
        Update: {
          actif?: boolean
          conditions_reelles?: boolean
          config_timer?: Json | null
          created_at?: string
          description?: string | null
          formation_id?: string
          id?: string
          nb_questions?: number
          ordre?: number
          seuil_reussite_pct?: number
          temps_limite_min?: number
          titre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_mock_exams_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "lms_formations"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_modules: {
        Row: {
          actif: boolean
          conditions_deblocage: Json | null
          created_at: string
          description: string | null
          duree_estimee_min: number
          formation_id: string
          icone: string | null
          id: string
          obligatoire: boolean
          ordre: number
          titre: string
          updated_at: string
        }
        Insert: {
          actif?: boolean
          conditions_deblocage?: Json | null
          created_at?: string
          description?: string | null
          duree_estimee_min?: number
          formation_id: string
          icone?: string | null
          id?: string
          obligatoire?: boolean
          ordre?: number
          titre: string
          updated_at?: string
        }
        Update: {
          actif?: boolean
          conditions_deblocage?: Json | null
          created_at?: string
          description?: string | null
          duree_estimee_min?: number
          formation_id?: string
          icone?: string | null
          id?: string
          obligatoire?: boolean
          ordre?: number
          titre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_modules_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "lms_formations"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_questions: {
        Row: {
          actif: boolean
          competency_id: string | null
          created_at: string
          enonce: string
          exam_id: string | null
          explication: string | null
          id: string
          niveau: string
          points: number
          quiz_id: string | null
          reponses: Json
          theme_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          actif?: boolean
          competency_id?: string | null
          created_at?: string
          enonce: string
          exam_id?: string | null
          explication?: string | null
          id?: string
          niveau?: string
          points?: number
          quiz_id?: string | null
          reponses: Json
          theme_id?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          actif?: boolean
          competency_id?: string | null
          created_at?: string
          enonce?: string
          exam_id?: string | null
          explication?: string | null
          id?: string
          niveau?: string
          points?: number
          quiz_id?: string | null
          reponses?: Json
          theme_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_questions_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "lms_competencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "lms_mock_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "lms_quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_questions_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "lms_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_quiz_attempts: {
        Row: {
          completed_at: string | null
          contact_id: string
          created_at: string
          id: string
          nb_correct: number
          nb_total: number
          quiz_id: string
          reponses_detail: Json | null
          reussi: boolean
          score_pct: number
          started_at: string
          temps_passe_sec: number
          tentative_numero: number
        }
        Insert: {
          completed_at?: string | null
          contact_id: string
          created_at?: string
          id?: string
          nb_correct?: number
          nb_total?: number
          quiz_id: string
          reponses_detail?: Json | null
          reussi?: boolean
          score_pct?: number
          started_at?: string
          temps_passe_sec?: number
          tentative_numero?: number
        }
        Update: {
          completed_at?: string | null
          contact_id?: string
          created_at?: string
          id?: string
          nb_correct?: number
          nb_total?: number
          quiz_id?: string
          reponses_detail?: Json | null
          reussi?: boolean
          score_pct?: number
          started_at?: string
          temps_passe_sec?: number
          tentative_numero?: number
        }
        Relationships: [
          {
            foreignKeyName: "lms_quiz_attempts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "lms_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_quizzes: {
        Row: {
          actif: boolean
          afficher_correction: boolean
          created_at: string
          description: string | null
          id: string
          lesson_id: string | null
          melanger_questions: boolean
          module_id: string | null
          nb_questions: number
          seuil_reussite_pct: number
          temps_limite_min: number | null
          tentatives_max: number | null
          titre: string
          updated_at: string
        }
        Insert: {
          actif?: boolean
          afficher_correction?: boolean
          created_at?: string
          description?: string | null
          id?: string
          lesson_id?: string | null
          melanger_questions?: boolean
          module_id?: string | null
          nb_questions?: number
          seuil_reussite_pct?: number
          temps_limite_min?: number | null
          tentatives_max?: number | null
          titre: string
          updated_at?: string
        }
        Update: {
          actif?: boolean
          afficher_correction?: boolean
          created_at?: string
          description?: string | null
          id?: string
          lesson_id?: string | null
          melanger_questions?: boolean
          module_id?: string | null
          nb_questions?: number
          seuil_reussite_pct?: number
          temps_limite_min?: number | null
          tentatives_max?: number | null
          titre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lms_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_quizzes_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "lms_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_resources: {
        Row: {
          contenu: string | null
          created_at: string
          description: string | null
          duree_secondes: number | null
          file_path: string | null
          id: string
          lesson_id: string
          obligatoire: boolean
          ordre: number
          titre: string
          type: string
          url_externe: string | null
        }
        Insert: {
          contenu?: string | null
          created_at?: string
          description?: string | null
          duree_secondes?: number | null
          file_path?: string | null
          id?: string
          lesson_id: string
          obligatoire?: boolean
          ordre?: number
          titre: string
          type: string
          url_externe?: string | null
        }
        Update: {
          contenu?: string | null
          created_at?: string
          description?: string | null
          duree_secondes?: number | null
          file_path?: string | null
          id?: string
          lesson_id?: string
          obligatoire?: boolean
          ordre?: number
          titre?: string
          type?: string
          url_externe?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lms_resources_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lms_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_themes: {
        Row: {
          code: string
          created_at: string
          description: string | null
          icone: string | null
          id: string
          libelle: string
          ordre: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          icone?: string | null
          id?: string
          libelle: string
          ordre?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          icone?: string | null
          id?: string
          libelle?: string
          ordre?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          metadata?: Json | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      objectifs: {
        Row: {
          actif: boolean | null
          annee: number
          centre_id: string | null
          created_at: string
          description: string | null
          id: string
          mois: number | null
          trimestre: number | null
          type_objectif: string
          type_periode: string
          updated_at: string
          valeur_cible: number
        }
        Insert: {
          actif?: boolean | null
          annee: number
          centre_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          mois?: number | null
          trimestre?: number | null
          type_objectif: string
          type_periode: string
          updated_at?: string
          valeur_cible: number
        }
        Update: {
          actif?: boolean | null
          annee?: number
          centre_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          mois?: number | null
          trimestre?: number | null
          type_objectif?: string
          type_periode?: string
          updated_at?: string
          valeur_cible?: number
        }
        Relationships: [
          {
            foreignKeyName: "objectifs_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objectifs_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_state: {
        Row: {
          centre_id: string | null
          created_at: string
          dismissed_at: string | null
          steps_skipped: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          centre_id?: string | null
          created_at?: string
          dismissed_at?: string | null
          steps_skipped?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          centre_id?: string | null
          created_at?: string
          dismissed_at?: string | null
          steps_skipped?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_state_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_state_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      paiements: {
        Row: {
          commentaires: string | null
          created_at: string
          date_paiement: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          facture_id: string
          id: string
          mode_paiement: Database["public"]["Enums"]["mode_paiement"]
          montant: number
          reference: string | null
        }
        Insert: {
          commentaires?: string | null
          created_at?: string
          date_paiement?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          facture_id: string
          id?: string
          mode_paiement: Database["public"]["Enums"]["mode_paiement"]
          montant: number
          reference?: string | null
        }
        Update: {
          commentaires?: string | null
          created_at?: string
          date_paiement?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          facture_id?: string
          id?: string
          mode_paiement?: Database["public"]["Enums"]["mode_paiement"]
          montant?: number
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paiements_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
        ]
      }
      parametres_financiers: {
        Row: {
          created_at: string
          devise: string | null
          id: string
          prix_moyen_recyclage: number | null
          prix_moyen_taxi: number | null
          prix_moyen_vmdtr: number | null
          prix_moyen_vtc: number | null
          regime_tva: boolean | null
        }
        Insert: {
          created_at?: string
          devise?: string | null
          id?: string
          prix_moyen_recyclage?: number | null
          prix_moyen_taxi?: number | null
          prix_moyen_vmdtr?: number | null
          prix_moyen_vtc?: number | null
          regime_tva?: boolean | null
        }
        Update: {
          created_at?: string
          devise?: string | null
          id?: string
          prix_moyen_recyclage?: number | null
          prix_moyen_taxi?: number | null
          prix_moyen_vmdtr?: number | null
          prix_moyen_vtc?: number | null
          regime_tva?: boolean | null
        }
        Relationships: []
      }
      partners: {
        Row: {
          address: string | null
          category: Database["public"]["Enums"]["partner_category"]
          centre_id: string
          commission_payee: number | null
          company_name: string
          contact_name: string | null
          created_at: string
          created_by: string | null
          date_debut_contrat: string | null
          date_fin_contrat: string | null
          email: string | null
          id: string
          is_active: boolean
          mode_remuneration:
            | Database["public"]["Enums"]["partner_remuneration_mode"]
            | null
          montant_forfait: number | null
          notes: string | null
          phone: string | null
          statut_partenaire:
            | Database["public"]["Enums"]["partner_status"]
            | null
          taux_commission: number | null
          type_partenaire: Database["public"]["Enums"]["partner_type"] | null
          updated_at: string
          zone_geographique: string | null
        }
        Insert: {
          address?: string | null
          category?: Database["public"]["Enums"]["partner_category"]
          centre_id: string
          commission_payee?: number | null
          company_name: string
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          date_debut_contrat?: string | null
          date_fin_contrat?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          mode_remuneration?:
            | Database["public"]["Enums"]["partner_remuneration_mode"]
            | null
          montant_forfait?: number | null
          notes?: string | null
          phone?: string | null
          statut_partenaire?:
            | Database["public"]["Enums"]["partner_status"]
            | null
          taux_commission?: number | null
          type_partenaire?: Database["public"]["Enums"]["partner_type"] | null
          updated_at?: string
          zone_geographique?: string | null
        }
        Update: {
          address?: string | null
          category?: Database["public"]["Enums"]["partner_category"]
          centre_id?: string
          commission_payee?: number | null
          company_name?: string
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          date_debut_contrat?: string | null
          date_fin_contrat?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          mode_remuneration?:
            | Database["public"]["Enums"]["partner_remuneration_mode"]
            | null
          montant_forfait?: number | null
          notes?: string | null
          phone?: string | null
          statut_partenaire?:
            | Database["public"]["Enums"]["partner_status"]
            | null
          taux_commission?: number | null
          type_partenaire?: Database["public"]["Enums"]["partner_type"] | null
          updated_at?: string
          zone_geographique?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partners_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partners_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      pedagogical_documents: {
        Row: {
          contact_id: string
          created_at: string
          created_by: string | null
          document_type: Database["public"]["Enums"]["pedagogical_document_type"]
          file_name: string
          file_path: string
          id: string
          notes: string | null
          session_id: string | null
          status: Database["public"]["Enums"]["document_status"]
          updated_at: string
          version: number
        }
        Insert: {
          contact_id: string
          created_at?: string
          created_by?: string | null
          document_type: Database["public"]["Enums"]["pedagogical_document_type"]
          file_name: string
          file_path: string
          id?: string
          notes?: string | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          contact_id?: string
          created_at?: string
          created_by?: string | null
          document_type?: Database["public"]["Enums"]["pedagogical_document_type"]
          file_name?: string
          file_path?: string
          id?: string
          notes?: string | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedagogical_documents_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedagogical_documents_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      progression_conduite: {
        Row: {
          accompagnement_examen_fait: boolean | null
          apprenant_id: string
          commentaire_global: string | null
          date_dernier_bilan: string | null
          heures_preventive_realisees: number | null
          heures_ville_realisees: number | null
          id: string
          niveau_actuel: Database["public"]["Enums"]["niveau_conduite"] | null
          updated_at: string | null
        }
        Insert: {
          accompagnement_examen_fait?: boolean | null
          apprenant_id: string
          commentaire_global?: string | null
          date_dernier_bilan?: string | null
          heures_preventive_realisees?: number | null
          heures_ville_realisees?: number | null
          id?: string
          niveau_actuel?: Database["public"]["Enums"]["niveau_conduite"] | null
          updated_at?: string | null
        }
        Update: {
          accompagnement_examen_fait?: boolean | null
          apprenant_id?: string
          commentaire_global?: string | null
          date_dernier_bilan?: string | null
          heures_preventive_realisees?: number | null
          heures_ville_realisees?: number | null
          id?: string
          niveau_actuel?: Database["public"]["Enums"]["niveau_conduite"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "progression_conduite_apprenant_id_fkey"
            columns: ["apprenant_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      progression_pedagogique: {
        Row: {
          commentaire: string | null
          competence: string
          contact_id: string
          created_at: string
          date_evaluation: string
          fiche_pratique_id: string
          formateur_id: string | null
          id: string
          niveau: number
          updated_at: string
        }
        Insert: {
          commentaire?: string | null
          competence: string
          contact_id: string
          created_at?: string
          date_evaluation?: string
          fiche_pratique_id: string
          formateur_id?: string | null
          id?: string
          niveau?: number
          updated_at?: string
        }
        Update: {
          commentaire?: string | null
          competence?: string
          contact_id?: string
          created_at?: string
          date_evaluation?: string
          fiche_pratique_id?: string
          formateur_id?: string | null
          id?: string
          niveau?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "progression_pedagogique_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progression_pedagogique_fiche_pratique_id_fkey"
            columns: ["fiche_pratique_id"]
            isOneToOne: false
            referencedRelation: "fiches_pratique"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progression_pedagogique_formateur_id_fkey"
            columns: ["formateur_id"]
            isOneToOne: false
            referencedRelation: "formateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_historique: {
        Row: {
          contenu: string | null
          created_at: string
          created_by: string | null
          date_echange: string
          date_rappel: string | null
          duree_minutes: number | null
          id: string
          prospect_id: string
          resultat: string | null
          titre: string
          type: string
        }
        Insert: {
          contenu?: string | null
          created_at?: string
          created_by?: string | null
          date_echange?: string
          date_rappel?: string | null
          duree_minutes?: number | null
          id?: string
          prospect_id: string
          resultat?: string | null
          titre: string
          type: string
        }
        Update: {
          contenu?: string | null
          created_at?: string
          created_by?: string | null
          date_echange?: string
          date_rappel?: string | null
          duree_minutes?: number | null
          id?: string
          prospect_id?: string
          resultat?: string | null
          titre?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_historique_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          assigned_to: string | null
          centre_id: string
          converted_contact_id: string | null
          created_at: string
          created_by: string | null
          date_prochaine_relance: string | null
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          formation_souhaitee: string | null
          id: string
          is_active: boolean
          last_contacted_at: string | null
          next_action_at: string | null
          next_action_type: string | null
          nom: string
          notes: string | null
          prenom: string
          priorite: string | null
          source: string | null
          statut: Database["public"]["Enums"]["prospect_status"]
          telephone: string | null
          telephone_normalise: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          centre_id: string
          converted_contact_id?: string | null
          created_at?: string
          created_by?: string | null
          date_prochaine_relance?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          formation_souhaitee?: string | null
          id?: string
          is_active?: boolean
          last_contacted_at?: string | null
          next_action_at?: string | null
          next_action_type?: string | null
          nom: string
          notes?: string | null
          prenom: string
          priorite?: string | null
          source?: string | null
          statut?: Database["public"]["Enums"]["prospect_status"]
          telephone?: string | null
          telephone_normalise?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          centre_id?: string
          converted_contact_id?: string | null
          created_at?: string
          created_by?: string | null
          date_prochaine_relance?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          formation_souhaitee?: string | null
          id?: string
          is_active?: boolean
          last_contacted_at?: string | null
          next_action_at?: string | null
          next_action_type?: string | null
          nom?: string
          notes?: string | null
          prenom?: string
          priorite?: string | null
          source?: string | null
          statut?: Database["public"]["Enums"]["prospect_status"]
          telephone?: string | null
          telephone_normalise?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospects_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_converted_contact_id_fkey"
            columns: ["converted_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      qualiopi_actions: {
        Row: {
          created_at: string | null
          date_echeance: string | null
          date_realisation: string | null
          description: string
          id: string
          indicateur_id: string | null
          priorite: string | null
          responsable: string | null
          statut: string | null
          titre: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date_echeance?: string | null
          date_realisation?: string | null
          description: string
          id?: string
          indicateur_id?: string | null
          priorite?: string | null
          responsable?: string | null
          statut?: string | null
          titre: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date_echeance?: string | null
          date_realisation?: string | null
          description?: string
          id?: string
          indicateur_id?: string | null
          priorite?: string | null
          responsable?: string | null
          statut?: string | null
          titre?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qualiopi_actions_indicateur_id_fkey"
            columns: ["indicateur_id"]
            isOneToOne: false
            referencedRelation: "qualiopi_indicateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      qualiopi_audits: {
        Row: {
          centre_id: string | null
          created_at: string | null
          date_audit: string
          date_prochaine_echeance: string | null
          id: string
          non_conformites_majeures: number | null
          non_conformites_mineures: number | null
          observations: string | null
          organisme_certificateur: string | null
          score_global: number | null
          statut: string | null
          type_audit: string
          updated_at: string | null
        }
        Insert: {
          centre_id?: string | null
          created_at?: string | null
          date_audit: string
          date_prochaine_echeance?: string | null
          id?: string
          non_conformites_majeures?: number | null
          non_conformites_mineures?: number | null
          observations?: string | null
          organisme_certificateur?: string | null
          score_global?: number | null
          statut?: string | null
          type_audit: string
          updated_at?: string | null
        }
        Update: {
          centre_id?: string | null
          created_at?: string | null
          date_audit?: string
          date_prochaine_echeance?: string | null
          id?: string
          non_conformites_majeures?: number | null
          non_conformites_mineures?: number | null
          observations?: string | null
          organisme_certificateur?: string | null
          score_global?: number | null
          statut?: string | null
          type_audit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qualiopi_audits_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qualiopi_audits_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      qualiopi_indicateurs: {
        Row: {
          centre_id: string | null
          created_at: string | null
          critere: number
          description: string
          id: string
          numero: string
          preuves_attendues: string[] | null
          statut: string | null
          titre: string
          updated_at: string | null
        }
        Insert: {
          centre_id?: string | null
          created_at?: string | null
          critere: number
          description: string
          id?: string
          numero: string
          preuves_attendues?: string[] | null
          statut?: string | null
          titre: string
          updated_at?: string | null
        }
        Update: {
          centre_id?: string | null
          created_at?: string | null
          critere?: number
          description?: string
          id?: string
          numero?: string
          preuves_attendues?: string[] | null
          statut?: string | null
          titre?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qualiopi_indicateurs_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qualiopi_indicateurs_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      qualiopi_preuves: {
        Row: {
          created_at: string | null
          date_creation: string
          date_validite: string | null
          description: string | null
          fichier_url: string | null
          id: string
          indicateur_id: string | null
          titre: string
          type_preuve: string
          valide: boolean | null
        }
        Insert: {
          created_at?: string | null
          date_creation?: string
          date_validite?: string | null
          description?: string | null
          fichier_url?: string | null
          id?: string
          indicateur_id?: string | null
          titre: string
          type_preuve: string
          valide?: boolean | null
        }
        Update: {
          created_at?: string | null
          date_creation?: string
          date_validite?: string | null
          description?: string | null
          fichier_url?: string | null
          id?: string
          indicateur_id?: string | null
          titre?: string
          type_preuve?: string
          valide?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "qualiopi_preuves_indicateur_id_fkey"
            columns: ["indicateur_id"]
            isOneToOne: false
            referencedRelation: "qualiopi_indicateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      reclamations: {
        Row: {
          categorie: string | null
          centre_id: string | null
          contact_id: string | null
          created_at: string | null
          date_resolution: string | null
          delai_traitement_jours: number | null
          description: string
          id: string
          priorite: string | null
          resolution: string | null
          session_id: string | null
          statut: string | null
          titre: string
          updated_at: string | null
        }
        Insert: {
          categorie?: string | null
          centre_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          date_resolution?: string | null
          delai_traitement_jours?: number | null
          description: string
          id?: string
          priorite?: string | null
          resolution?: string | null
          session_id?: string | null
          statut?: string | null
          titre: string
          updated_at?: string | null
        }
        Update: {
          categorie?: string | null
          centre_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          date_resolution?: string | null
          delai_traitement_jours?: number | null
          description?: string
          id?: string
          priorite?: string | null
          resolution?: string | null
          session_id?: string | null
          statut?: string | null
          titre?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reclamations_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reclamations_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reclamations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reclamations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      relance_paiement_config: {
        Row: {
          actif: boolean
          centre_id: string
          created_at: string
          delai_premiere_relance_jours: number
          id: string
          intervalle_jours: number
          nb_relances_max: number
          template_email_id: string | null
          updated_at: string
        }
        Insert: {
          actif?: boolean
          centre_id: string
          created_at?: string
          delai_premiere_relance_jours?: number
          id?: string
          intervalle_jours?: number
          nb_relances_max?: number
          template_email_id?: string | null
          updated_at?: string
        }
        Update: {
          actif?: boolean
          centre_id?: string
          created_at?: string
          delai_premiere_relance_jours?: number
          id?: string
          intervalle_jours?: number
          nb_relances_max?: number
          template_email_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relance_paiement_config_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: true
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relance_paiement_config_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: true
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relance_paiement_config_template_email_id_fkey"
            columns: ["template_email_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      relance_paiement_queue: {
        Row: {
          centre_id: string
          click_count: number
          clicked_at: string | null
          contact_id: string
          created_at: string
          email_destinataire: string | null
          error_message: string | null
          facture_id: string
          id: string
          metadata: Json | null
          numero_relance: number
          scheduled_at: string
          sent_at: string | null
          statut: string
          tracking_token: string | null
          updated_at: string
        }
        Insert: {
          centre_id: string
          click_count?: number
          clicked_at?: string | null
          contact_id: string
          created_at?: string
          email_destinataire?: string | null
          error_message?: string | null
          facture_id: string
          id?: string
          metadata?: Json | null
          numero_relance?: number
          scheduled_at: string
          sent_at?: string | null
          statut?: string
          tracking_token?: string | null
          updated_at?: string
        }
        Update: {
          centre_id?: string
          click_count?: number
          clicked_at?: string | null
          contact_id?: string
          created_at?: string
          email_destinataire?: string | null
          error_message?: string | null
          facture_id?: string
          id?: string
          metadata?: Json | null
          numero_relance?: number
          scheduled_at?: string
          sent_at?: string | null
          statut?: string
          tracking_token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relance_paiement_queue_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relance_paiement_queue_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relance_paiement_queue_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relance_paiement_queue_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations_conduite: {
        Row: {
          apprenant_id: string
          created_at: string | null
          creneau_id: string
          id: string
          motif_annulation: string | null
          rappel_24h_envoye: boolean | null
          rappel_2h_envoye: boolean | null
          statut: Database["public"]["Enums"]["statut_reservation_conduite"]
        }
        Insert: {
          apprenant_id: string
          created_at?: string | null
          creneau_id: string
          id?: string
          motif_annulation?: string | null
          rappel_24h_envoye?: boolean | null
          rappel_2h_envoye?: boolean | null
          statut?: Database["public"]["Enums"]["statut_reservation_conduite"]
        }
        Update: {
          apprenant_id?: string
          created_at?: string | null
          creneau_id?: string
          id?: string
          motif_annulation?: string | null
          rappel_24h_envoye?: boolean | null
          rappel_2h_envoye?: boolean | null
          statut?: Database["public"]["Enums"]["statut_reservation_conduite"]
        }
        Relationships: [
          {
            foreignKeyName: "reservations_conduite_apprenant_id_fkey"
            columns: ["apprenant_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_conduite_creneau_id_fkey"
            columns: ["creneau_id"]
            isOneToOne: false
            referencedRelation: "creneaux_conduite"
            referencedColumns: ["id"]
          },
        ]
      }
      ressources_conduite: {
        Row: {
          categorie: Database["public"]["Enums"]["categorie_ressource_conduite"]
          contenu: string
          created_at: string | null
          formation_cible:
            | Database["public"]["Enums"]["formation_cible_conduite"]
            | null
          id: string
          ordre_affichage: number | null
          titre: string
          type_contenu: Database["public"]["Enums"]["type_contenu_ressource"]
          visible_eleve: boolean | null
        }
        Insert: {
          categorie: Database["public"]["Enums"]["categorie_ressource_conduite"]
          contenu: string
          created_at?: string | null
          formation_cible?:
            | Database["public"]["Enums"]["formation_cible_conduite"]
            | null
          id?: string
          ordre_affichage?: number | null
          titre: string
          type_contenu: Database["public"]["Enums"]["type_contenu_ressource"]
          visible_eleve?: boolean | null
        }
        Update: {
          categorie?: Database["public"]["Enums"]["categorie_ressource_conduite"]
          contenu?: string
          created_at?: string | null
          formation_cible?:
            | Database["public"]["Enums"]["formation_cible_conduite"]
            | null
          id?: string
          ordre_affichage?: number | null
          titre?: string
          type_contenu?: Database["public"]["Enums"]["type_contenu_ressource"]
          visible_eleve?: boolean | null
        }
        Relationships: []
      }
      satisfaction_reponses: {
        Row: {
          centre_id: string | null
          commentaire: string | null
          contact_id: string | null
          created_at: string | null
          date_reponse: string | null
          id: string
          note_formateur: number | null
          note_globale: number | null
          note_locaux: number | null
          note_supports: number | null
          nps_score: number | null
          objectifs_atteints: string | null
          session_id: string | null
          type_questionnaire: string | null
        }
        Insert: {
          centre_id?: string | null
          commentaire?: string | null
          contact_id?: string | null
          created_at?: string | null
          date_reponse?: string | null
          id?: string
          note_formateur?: number | null
          note_globale?: number | null
          note_locaux?: number | null
          note_supports?: number | null
          nps_score?: number | null
          objectifs_atteints?: string | null
          session_id?: string | null
          type_questionnaire?: string | null
        }
        Update: {
          centre_id?: string | null
          commentaire?: string | null
          contact_id?: string | null
          created_at?: string | null
          date_reponse?: string | null
          id?: string
          note_formateur?: number | null
          note_globale?: number | null
          note_locaux?: number | null
          note_supports?: number | null
          nps_score?: number | null
          objectifs_atteints?: string | null
          session_id?: string | null
          type_questionnaire?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "satisfaction_reponses_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satisfaction_reponses_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satisfaction_reponses_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satisfaction_reponses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      seances_conduite: {
        Row: {
          competences_travaillees: string[] | null
          contact_id: string
          created_at: string
          date_seance: string
          date_validation: string | null
          duree_minutes: number
          fiche_pratique_id: string
          formateur_id: string | null
          heure_debut: string
          heure_fin: string
          id: string
          note_globale: number | null
          observations: string | null
          parcours: string | null
          signature_data: string | null
          signature_url: string | null
          type_seance: string
          updated_at: string
          validation_formateur: boolean | null
          vehicule_id: string | null
        }
        Insert: {
          competences_travaillees?: string[] | null
          contact_id: string
          created_at?: string
          date_seance: string
          date_validation?: string | null
          duree_minutes: number
          fiche_pratique_id: string
          formateur_id?: string | null
          heure_debut: string
          heure_fin: string
          id?: string
          note_globale?: number | null
          observations?: string | null
          parcours?: string | null
          signature_data?: string | null
          signature_url?: string | null
          type_seance?: string
          updated_at?: string
          validation_formateur?: boolean | null
          vehicule_id?: string | null
        }
        Update: {
          competences_travaillees?: string[] | null
          contact_id?: string
          created_at?: string
          date_seance?: string
          date_validation?: string | null
          duree_minutes?: number
          fiche_pratique_id?: string
          formateur_id?: string | null
          heure_debut?: string
          heure_fin?: string
          id?: string
          note_globale?: number | null
          observations?: string | null
          parcours?: string | null
          signature_data?: string | null
          signature_url?: string | null
          type_seance?: string
          updated_at?: string
          validation_formateur?: boolean | null
          vehicule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seances_conduite_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seances_conduite_fiche_pratique_id_fkey"
            columns: ["fiche_pratique_id"]
            isOneToOne: false
            referencedRelation: "fiches_pratique"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seances_conduite_formateur_id_fkey"
            columns: ["formateur_id"]
            isOneToOne: false
            referencedRelation: "formateurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seances_conduite_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
        ]
      }
      security_charters: {
        Row: {
          activated_at: string | null
          archived_at: string | null
          contenu: string
          created_at: string
          created_by: string | null
          document_type: string
          id: string
          roles_requis: string[]
          status: Database["public"]["Enums"]["charter_status"]
          titre: string
          version: number
        }
        Insert: {
          activated_at?: string | null
          archived_at?: string | null
          contenu: string
          created_at?: string
          created_by?: string | null
          document_type?: string
          id?: string
          roles_requis?: string[]
          status?: Database["public"]["Enums"]["charter_status"]
          titre?: string
          version?: number
        }
        Update: {
          activated_at?: string | null
          archived_at?: string | null
          contenu?: string
          created_at?: string
          created_by?: string | null
          document_type?: string
          id?: string
          roles_requis?: string[]
          status?: Database["public"]["Enums"]["charter_status"]
          titre?: string
          version?: number
        }
        Relationships: []
      }
      security_runs: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          status: string
          summary_json: Json
          total_fail: number
          total_pass: number
          total_warn: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          status?: string
          summary_json?: Json
          total_fail?: number
          total_pass?: number
          total_warn?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          status?: string
          summary_json?: Json
          total_fail?: number
          total_pass?: number
          total_warn?: number
        }
        Relationships: []
      }
      session_inscriptions: {
        Row: {
          commentaires: string | null
          contact_id: string
          contract_document_type: string | null
          contract_frame_status: string | null
          created_at: string
          date_inscription: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          documents_envoyes: string[] | null
          id: string
          montant_formation: number | null
          montant_pris_en_charge: number | null
          payeur_partner_id: string | null
          qualification_source: string | null
          qualified_at: string | null
          qualified_by: string | null
          reste_a_charge: number | null
          session_id: string
          statut: string
          statut_paiement: string | null
          track: Database["public"]["Enums"]["formation_track"]
          type_payeur: string
          updated_at: string
        }
        Insert: {
          commentaires?: string | null
          contact_id: string
          contract_document_type?: string | null
          contract_frame_status?: string | null
          created_at?: string
          date_inscription?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          documents_envoyes?: string[] | null
          id?: string
          montant_formation?: number | null
          montant_pris_en_charge?: number | null
          payeur_partner_id?: string | null
          qualification_source?: string | null
          qualified_at?: string | null
          qualified_by?: string | null
          reste_a_charge?: number | null
          session_id: string
          statut?: string
          statut_paiement?: string | null
          track?: Database["public"]["Enums"]["formation_track"]
          type_payeur?: string
          updated_at?: string
        }
        Update: {
          commentaires?: string | null
          contact_id?: string
          contract_document_type?: string | null
          contract_frame_status?: string | null
          created_at?: string
          date_inscription?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          documents_envoyes?: string[] | null
          id?: string
          montant_formation?: number | null
          montant_pris_en_charge?: number | null
          payeur_partner_id?: string | null
          qualification_source?: string | null
          qualified_at?: string | null
          qualified_by?: string | null
          reste_a_charge?: number | null
          session_id?: string
          statut?: string
          statut_paiement?: string | null
          track?: Database["public"]["Enums"]["formation_track"]
          type_payeur?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_inscriptions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_inscriptions_payeur_partner_id_fkey"
            columns: ["payeur_partner_id"]
            isOneToOne: false
            referencedRelation: "partner_stats"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "session_inscriptions_payeur_partner_id_fkey"
            columns: ["payeur_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_inscriptions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          adresse_code_postal: string | null
          adresse_rue: string | null
          adresse_ville: string | null
          archived: boolean | null
          archived_at: string | null
          archived_by: string | null
          catalogue_formation_id: string | null
          centre_id: string
          created_at: string
          date_debut: string
          date_fin: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          duree_heures: number | null
          formateur: string | null
          formateur_id: string | null
          formation_type: Database["public"]["Enums"]["formation_type"]
          heure_debut: string | null
          heure_debut_aprem: string | null
          heure_debut_matin: string | null
          heure_fin: string | null
          heure_fin_aprem: string | null
          heure_fin_matin: string | null
          horaire_type: string
          id: string
          lieu: string | null
          nom: string
          numero_session: string | null
          objectifs: string | null
          places_totales: number
          prerequis: string | null
          prix: number | null
          prix_ht: number | null
          statut: Database["public"]["Enums"]["session_status"]
          track: Database["public"]["Enums"]["formation_track"]
          tva_percent: number | null
          updated_at: string
        }
        Insert: {
          adresse_code_postal?: string | null
          adresse_rue?: string | null
          adresse_ville?: string | null
          archived?: boolean | null
          archived_at?: string | null
          archived_by?: string | null
          catalogue_formation_id?: string | null
          centre_id: string
          created_at?: string
          date_debut: string
          date_fin: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          duree_heures?: number | null
          formateur?: string | null
          formateur_id?: string | null
          formation_type: Database["public"]["Enums"]["formation_type"]
          heure_debut?: string | null
          heure_debut_aprem?: string | null
          heure_debut_matin?: string | null
          heure_fin?: string | null
          heure_fin_aprem?: string | null
          heure_fin_matin?: string | null
          horaire_type?: string
          id?: string
          lieu?: string | null
          nom: string
          numero_session?: string | null
          objectifs?: string | null
          places_totales?: number
          prerequis?: string | null
          prix?: number | null
          prix_ht?: number | null
          statut?: Database["public"]["Enums"]["session_status"]
          track?: Database["public"]["Enums"]["formation_track"]
          tva_percent?: number | null
          updated_at?: string
        }
        Update: {
          adresse_code_postal?: string | null
          adresse_rue?: string | null
          adresse_ville?: string | null
          archived?: boolean | null
          archived_at?: string | null
          archived_by?: string | null
          catalogue_formation_id?: string | null
          centre_id?: string
          created_at?: string
          date_debut?: string
          date_fin?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          duree_heures?: number | null
          formateur?: string | null
          formateur_id?: string | null
          formation_type?: Database["public"]["Enums"]["formation_type"]
          heure_debut?: string | null
          heure_debut_aprem?: string | null
          heure_debut_matin?: string | null
          heure_fin?: string | null
          heure_fin_aprem?: string | null
          heure_fin_matin?: string | null
          horaire_type?: string
          id?: string
          lieu?: string | null
          nom?: string
          numero_session?: string | null
          objectifs?: string | null
          places_totales?: number
          prerequis?: string | null
          prix?: number | null
          prix_ht?: number | null
          statut?: Database["public"]["Enums"]["session_status"]
          track?: Database["public"]["Enums"]["formation_track"]
          tva_percent?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_catalogue_formation_id_fkey"
            columns: ["catalogue_formation_id"]
            isOneToOne: false
            referencedRelation: "catalogue_formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_formateur_id_fkey"
            columns: ["formateur_id"]
            isOneToOne: false
            referencedRelation: "formateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_requests: {
        Row: {
          access_token: string | null
          commentaires: string | null
          contact_id: string
          created_at: string
          date_envoi: string | null
          date_expiration: string | null
          date_signature: string | null
          description: string | null
          document_storage_bucket: string | null
          document_storage_path: string | null
          document_url: string | null
          id: string
          ip_signature: string | null
          session_inscription_id: string | null
          signature_data: string | null
          signature_url: string | null
          statut: string
          titre: string
          type_document: string
          updated_at: string
          user_agent_signature: string | null
        }
        Insert: {
          access_token?: string | null
          commentaires?: string | null
          contact_id: string
          created_at?: string
          date_envoi?: string | null
          date_expiration?: string | null
          date_signature?: string | null
          description?: string | null
          document_storage_bucket?: string | null
          document_storage_path?: string | null
          document_url?: string | null
          id?: string
          ip_signature?: string | null
          session_inscription_id?: string | null
          signature_data?: string | null
          signature_url?: string | null
          statut?: string
          titre: string
          type_document?: string
          updated_at?: string
          user_agent_signature?: string | null
        }
        Update: {
          access_token?: string | null
          commentaires?: string | null
          contact_id?: string
          created_at?: string
          date_envoi?: string | null
          date_expiration?: string | null
          date_signature?: string | null
          description?: string | null
          document_storage_bucket?: string | null
          document_storage_path?: string | null
          document_url?: string | null
          id?: string
          ip_signature?: string | null
          session_inscription_id?: string | null
          signature_data?: string | null
          signature_url?: string | null
          statut?: string
          titre?: string
          type_document?: string
          updated_at?: string
          user_agent_signature?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_requests_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_requests_session_inscription_id_fkey"
            columns: ["session_inscription_id"]
            isOneToOne: false
            referencedRelation: "session_inscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      template_approval_logs: {
        Row: {
          action: string
          centre_id: string | null
          comment: string | null
          created_at: string
          created_by: string | null
          id: string
          template_id: string
          version: number
        }
        Insert: {
          action: string
          centre_id?: string | null
          comment?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          template_id: string
          version: number
        }
        Update: {
          action?: string
          centre_id?: string | null
          comment?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          template_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "template_approval_logs_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_approval_logs_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_approval_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "template_studio_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_audit_log: {
        Row: {
          action: string
          centre_id: string | null
          contact_id: string | null
          created_at: string | null
          created_by: string | null
          generated_document_id: string | null
          id: string
          metadata: Json | null
          session_id: string | null
          template_id: string | null
          version_id: string | null
        }
        Insert: {
          action: string
          centre_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          generated_document_id?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string | null
          template_id?: string | null
          version_id?: string | null
        }
        Update: {
          action?: string
          centre_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          generated_document_id?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string | null
          template_id?: string | null
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_audit_log_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_audit_log_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_audit_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_audit_log_generated_document_id_fkey"
            columns: ["generated_document_id"]
            isOneToOne: false
            referencedRelation: "generated_documents_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_audit_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_audit_log_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "template_studio_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_audit_log_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      template_studio_templates: {
        Row: {
          applies_to: Database["public"]["Enums"]["template_applies_to"] | null
          category: Database["public"]["Enums"]["template_category"] | null
          centre_id: string | null
          compliance_report_json: Json | null
          compliance_score: number | null
          compliance_tags: Json | null
          compliance_validated_at: string | null
          compliance_validated_by: string | null
          created_at: string
          created_by: string | null
          current_version_id: string | null
          description: string | null
          format: Database["public"]["Enums"]["template_format"]
          id: string
          is_active: boolean
          name: string
          scenario: string | null
          status: Database["public"]["Enums"]["template_status"]
          template_body: string
          track_scope:
            | Database["public"]["Enums"]["template_track_scope"]
            | null
          type: Database["public"]["Enums"]["template_type"]
          updated_at: string
          variables_schema: Json | null
          version: number
        }
        Insert: {
          applies_to?: Database["public"]["Enums"]["template_applies_to"] | null
          category?: Database["public"]["Enums"]["template_category"] | null
          centre_id?: string | null
          compliance_report_json?: Json | null
          compliance_score?: number | null
          compliance_tags?: Json | null
          compliance_validated_at?: string | null
          compliance_validated_by?: string | null
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          description?: string | null
          format?: Database["public"]["Enums"]["template_format"]
          id?: string
          is_active?: boolean
          name: string
          scenario?: string | null
          status?: Database["public"]["Enums"]["template_status"]
          template_body?: string
          track_scope?:
            | Database["public"]["Enums"]["template_track_scope"]
            | null
          type?: Database["public"]["Enums"]["template_type"]
          updated_at?: string
          variables_schema?: Json | null
          version?: number
        }
        Update: {
          applies_to?: Database["public"]["Enums"]["template_applies_to"] | null
          category?: Database["public"]["Enums"]["template_category"] | null
          centre_id?: string | null
          compliance_report_json?: Json | null
          compliance_score?: number | null
          compliance_tags?: Json | null
          compliance_validated_at?: string | null
          compliance_validated_by?: string | null
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          description?: string | null
          format?: Database["public"]["Enums"]["template_format"]
          id?: string
          is_active?: boolean
          name?: string
          scenario?: string | null
          status?: Database["public"]["Enums"]["template_status"]
          template_body?: string
          track_scope?:
            | Database["public"]["Enums"]["template_track_scope"]
            | null
          type?: Database["public"]["Enums"]["template_type"]
          updated_at?: string
          variables_schema?: Json | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "template_studio_templates_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_studio_templates_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      template_versions: {
        Row: {
          centre_id: string | null
          changelog: string | null
          compliance_report_json: Json | null
          compliance_score: number | null
          compliance_tags: Json | null
          created_at: string
          created_by: string | null
          css: string | null
          id: string
          is_published: boolean | null
          status: Database["public"]["Enums"]["template_status"]
          template_body: string
          template_id: string
          variables_schema: Json | null
          version: number
        }
        Insert: {
          centre_id?: string | null
          changelog?: string | null
          compliance_report_json?: Json | null
          compliance_score?: number | null
          compliance_tags?: Json | null
          created_at?: string
          created_by?: string | null
          css?: string | null
          id?: string
          is_published?: boolean | null
          status?: Database["public"]["Enums"]["template_status"]
          template_body: string
          template_id: string
          variables_schema?: Json | null
          version: number
        }
        Update: {
          centre_id?: string | null
          changelog?: string | null
          compliance_report_json?: Json | null
          compliance_score?: number | null
          compliance_tags?: Json | null
          created_at?: string
          created_by?: string | null
          css?: string | null
          id?: string
          is_published?: boolean | null
          status?: Database["public"]["Enums"]["template_status"]
          template_body?: string
          template_id?: string
          variables_schema?: Json | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "template_versions_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_versions_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "template_studio_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      tokens_reservation: {
        Row: {
          actif: boolean | null
          apprenant_id: string
          created_at: string | null
          created_by: string | null
          date_expiration: string | null
          derniere_utilisation: string | null
          id: string
          nb_utilisations: number | null
          token: string
        }
        Insert: {
          actif?: boolean | null
          apprenant_id: string
          created_at?: string | null
          created_by?: string | null
          date_expiration?: string | null
          derniere_utilisation?: string | null
          id?: string
          nb_utilisations?: number | null
          token?: string
        }
        Update: {
          actif?: boolean | null
          apprenant_id?: string
          created_at?: string | null
          created_by?: string | null
          date_expiration?: string | null
          derniere_utilisation?: string | null
          id?: string
          nb_utilisations?: number | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "tokens_reservation_apprenant_id_fkey"
            columns: ["apprenant_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions_bancaires: {
        Row: {
          banque: string | null
          categorie: string | null
          charge_id: string | null
          compte: string | null
          created_at: string
          created_by: string | null
          date_operation: string
          date_valeur: string | null
          facture_id: string | null
          id: string
          import_batch_id: string | null
          libelle: string
          montant: number
          notes: string | null
          paiement_id: string | null
          rapproche: boolean
          reference_bancaire: string | null
          type_operation: string
        }
        Insert: {
          banque?: string | null
          categorie?: string | null
          charge_id?: string | null
          compte?: string | null
          created_at?: string
          created_by?: string | null
          date_operation: string
          date_valeur?: string | null
          facture_id?: string | null
          id?: string
          import_batch_id?: string | null
          libelle: string
          montant: number
          notes?: string | null
          paiement_id?: string | null
          rapproche?: boolean
          reference_bancaire?: string | null
          type_operation?: string
        }
        Update: {
          banque?: string | null
          categorie?: string | null
          charge_id?: string | null
          compte?: string | null
          created_at?: string
          created_by?: string | null
          date_operation?: string
          date_valeur?: string | null
          facture_id?: string | null
          id?: string
          import_batch_id?: string | null
          libelle?: string
          montant?: number
          notes?: string | null
          paiement_id?: string | null
          rapproche?: boolean
          reference_bancaire?: string | null
          type_operation?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_bancaires_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_bancaires_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_bancaires_paiement_id_fkey"
            columns: ["paiement_id"]
            isOneToOne: false
            referencedRelation: "paiements"
            referencedColumns: ["id"]
          },
        ]
      }
      tresorerie_alertes: {
        Row: {
          created_at: string
          date_alerte: string
          description: string | null
          id: string
          montant_seuil: number | null
          statut: string
          titre: string
          type_alerte: string
        }
        Insert: {
          created_at?: string
          date_alerte?: string
          description?: string | null
          id?: string
          montant_seuil?: number | null
          statut?: string
          titre: string
          type_alerte: string
        }
        Update: {
          created_at?: string
          date_alerte?: string
          description?: string | null
          id?: string
          montant_seuil?: number | null
          statut?: string
          titre?: string
          type_alerte?: string
        }
        Relationships: []
      }
      tresorerie_soldes: {
        Row: {
          banque: string | null
          compte: string | null
          created_at: string
          date_solde: string
          id: string
          notes: string | null
          solde_previsionnel: number | null
          solde_reel: number
        }
        Insert: {
          banque?: string | null
          compte?: string | null
          created_at?: string
          date_solde: string
          id?: string
          notes?: string | null
          solde_previsionnel?: number | null
          solde_reel?: number
        }
        Update: {
          banque?: string | null
          compte?: string | null
          created_at?: string
          date_solde?: string
          id?: string
          notes?: string | null
          solde_previsionnel?: number | null
          solde_reel?: number
        }
        Relationships: []
      }
      user_centres: {
        Row: {
          centre_id: string
          created_at: string | null
          id: string
          is_primary: boolean | null
          user_id: string
        }
        Insert: {
          centre_id: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          user_id: string
        }
        Update: {
          centre_id?: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_centres_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_centres_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicules: {
        Row: {
          actif: boolean
          categorie: string
          centre_id: string
          created_at: string
          date_assurance: string | null
          date_controle_technique: string | null
          date_mise_circulation: string | null
          id: string
          immatriculation: string
          marque: string
          modele: string
          notes: string | null
          statut: string
          type_vehicule: string
          updated_at: string
        }
        Insert: {
          actif?: boolean
          categorie?: string
          centre_id: string
          created_at?: string
          date_assurance?: string | null
          date_controle_technique?: string | null
          date_mise_circulation?: string | null
          id?: string
          immatriculation: string
          marque: string
          modele: string
          notes?: string | null
          statut?: string
          type_vehicule?: string
          updated_at?: string
        }
        Update: {
          actif?: boolean
          categorie?: string
          centre_id?: string
          created_at?: string
          date_assurance?: string | null
          date_controle_technique?: string | null
          date_mise_circulation?: string | null
          id?: string
          immatriculation?: string
          marque?: string
          modele?: string
          notes?: string | null
          statut?: string
          type_vehicule?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicules_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicules_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      versements: {
        Row: {
          created_at: string
          date_encaissement: string
          id: string
          mode: Database["public"]["Enums"]["mode_versement"]
          montant: number
          notes: string | null
          paiement_id: string
          reference: string | null
        }
        Insert: {
          created_at?: string
          date_encaissement: string
          id?: string
          mode: Database["public"]["Enums"]["mode_versement"]
          montant: number
          notes?: string | null
          paiement_id: string
          reference?: string | null
        }
        Update: {
          created_at?: string
          date_encaissement?: string
          id?: string
          mode?: Database["public"]["Enums"]["mode_versement"]
          montant?: number
          notes?: string | null
          paiement_id?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "versements_paiement_id_fkey"
            columns: ["paiement_id"]
            isOneToOne: false
            referencedRelation: "paiements"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          result: Json | null
          started_at: string | null
          status: string | null
          trigger_data: Json | null
          workflow_id: string | null
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          result?: Json | null
          started_at?: string | null
          status?: string | null
          trigger_data?: Json | null
          workflow_id?: string | null
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          result?: Json | null
          started_at?: string | null
          status?: string | null
          trigger_data?: Json | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          actif: boolean | null
          actions: Json
          centre_id: string | null
          created_at: string | null
          description: string | null
          id: string
          nom: string
          trigger_conditions: Json | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          actif?: boolean | null
          actions?: Json
          centre_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          nom: string
          trigger_conditions?: Json | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          actif?: boolean | null
          actions?: Json
          centre_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          nom?: string
          trigger_conditions?: Json | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflows_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      centres_stats: {
        Row: {
          actif: boolean | null
          adresse_complete: string | null
          ca_total: number | null
          created_at: string | null
          email: string | null
          health_score: number | null
          id: string | null
          last_activity_at: string | null
          logo_url: string | null
          max_contacts: number | null
          max_users: number | null
          nb_contacts: number | null
          nb_sessions: number | null
          nb_users: number | null
          nda: string | null
          nom: string | null
          nom_commercial: string | null
          onboarding_completed_at: string | null
          plan_end_date: string | null
          plan_start_date: string | null
          plan_type: string | null
          settings: Json | null
          siret: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          telephone: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      partner_stats: {
        Row: {
          ca_genere: number | null
          centre_id: string | null
          commission_calculee: number | null
          commission_payee: number | null
          commission_restante: number | null
          company_name: string | null
          mode_remuneration:
            | Database["public"]["Enums"]["partner_remuneration_mode"]
            | null
          montant_forfait: number | null
          nb_apprenants: number | null
          partner_id: string | null
          statut_partenaire:
            | Database["public"]["Enums"]["partner_status"]
            | null
          taux_commission: number | null
          type_partenaire: Database["public"]["Enums"]["partner_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "partners_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partners_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      session_inscription_counts: {
        Row: {
          inscription_count: number | null
          session_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_inscriptions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      v_communication_timeline: {
        Row: {
          click_count: number | null
          clicked_at: string | null
          contact_id: string | null
          facture_id: string | null
          id: string | null
          kind: string | null
          metadata: Json | null
          numero_relance: number | null
          sent_at: string | null
          session_id: string | null
          statut: string | null
          subject_type: string | null
          title: string | null
          tracking_token: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_charter: { Args: { p_charter_id: string }; Returns: boolean }
      admin_recalc_track_for_catalogue: {
        Args: { p_catalogue_id: string; p_recalc_inscriptions?: boolean }
        Returns: Json
      }
      annuler_reservation_public: {
        Args: { p_motif?: string; p_reservation_id: string; p_token: string }
        Returns: Json
      }
      anonymize_contact: { Args: { p_contact_id: string }; Returns: boolean }
      archive_session: { Args: { p_session_id: string }; Returns: boolean }
      cancel_certificate: {
        Args: { p_certificate_id: string; p_reason?: string }
        Returns: boolean
      }
      check_creneau_conflicts: {
        Args: {
          p_contact_id?: string
          p_date: string
          p_exclude_id?: string
          p_formateur_id?: string
          p_heure_debut: string
          p_heure_fin: string
          p_vehicule_id?: string
        }
        Returns: {
          conflict_heure_debut: string
          conflict_heure_fin: string
          conflict_id: string
          conflict_label: string
          conflict_type: string
        }[]
      }
      check_duplicate_contacts: {
        Args: {
          p_date_naissance?: string
          p_email?: string
          p_exclude_id?: string
          p_nom: string
          p_prenom: string
        }
        Returns: {
          date_naissance: string
          email: string
          formation: string
          id: string
          match_type: string
          nom: string
          prenom: string
          telephone: string
        }[]
      }
      check_email_antiflood: {
        Args: {
          p_recipient_email: string
          p_type: string
          p_window_minutes?: number
        }
        Returns: boolean
      }
      cleanup_old_dismissed_alerts: { Args: never; Returns: undefined }
      create_attestation_certificate: {
        Args: {
          p_contact_id: string
          p_metadata?: Json
          p_session_id?: string
          p_type_attestation?: string
        }
        Returns: {
          date_emission: string
          id: string
          numero_certificat: string
        }[]
      }
      dismiss_onboarding_checklist: { Args: never; Returns: undefined }
      export_contact_data: { Args: { p_contact_id: string }; Returns: Json }
      generate_breach_code: { Args: never; Returns: string }
      generate_numero_certificat: {
        Args: { p_type_attestation?: string }
        Returns: string
      }
      generate_numero_devis: { Args: never; Returns: string }
      generate_numero_facture: { Args: never; Returns: string }
      get_active_charter: {
        Args: never
        Returns: {
          activated_at: string
          contenu: string
          id: string
          roles_requis: string[]
          titre: string
          version: number
        }[]
      }
      get_active_document: {
        Args: { p_document_type?: string }
        Returns: {
          activated_at: string
          contenu: string
          document_type: string
          id: string
          roles_requis: string[]
          titre: string
          version: number
        }[]
      }
      get_active_legal_mentions: {
        Args: never
        Returns: {
          activated_at: string
          capital_social: string
          contenu: string
          directeur_publication: string
          email_contact: string
          forme_juridique: string
          hebergeur_adresse: string
          hebergeur_contact: string
          hebergeur_nom: string
          id: string
          nda: string
          raison_sociale: string
          rcs: string
          siege_social: string
          siret: string
          telephone_contact: string
          version: number
        }[]
      }
      get_carte_pro_for_formation: {
        Args: { p_contact_id: string; p_formation_type: string }
        Returns: {
          date_expiration: string
          date_obtention: string
          numero_carte: string
          prefecture: string
          type_carte: string
        }[]
      }
      get_delete_impact: {
        Args: { p_record_id: string; p_table_name: string }
        Returns: Json
      }
      get_onboarding_progress: { Args: { p_centre_id: string }; Returns: Json }
      get_partner_stats: {
        Args: { p_partner_id: string }
        Returns: {
          ca_ce_mois: number
          ca_genere: number
          commission_calculee: number
          commission_restante: number
          nb_apprenants: number
          nb_apprenants_ce_mois: number
        }[]
      }
      get_pending_documents: {
        Args: never
        Returns: {
          contenu: string
          document_type: string
          id: string
          titre: string
          version: number
        }[]
      }
      get_related_signature_docs: {
        Args: { p_contact_id: string }
        Returns: {
          date_envoi: string
          date_signature: string
          document_url: string
          id: string
          statut: string
          titre: string
          type_document: string
        }[]
      }
      get_signature_request_public: {
        Args: { p_signature_id: string }
        Returns: {
          contact_email: string
          contact_id: string
          contact_nom: string
          contact_prenom: string
          date_expiration: string
          description: string
          document_storage_bucket: string
          document_storage_path: string
          document_url: string
          id: string
          signature_url: string
          statut: string
          titre: string
          type_document: string
        }[]
      }
      get_trash_items: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_table_filter?: string
        }
        Returns: {
          delete_reason: string
          deleted_at: string
          deleted_by: string
          deleted_by_email: string
          item_id: string
          item_label: string
          related_count: number
          table_name: string
        }[]
      }
      get_user_centre_id: { Args: never; Returns: string }
      get_user_formateur_id: { Args: never; Returns: string }
      get_user_role_for_charter: { Args: never; Returns: string }
      has_accepted_current_charter: { Args: never; Returns: boolean }
      has_accepted_current_document: {
        Args: { p_document_type?: string }
        Returns: boolean
      }
      has_centre_access: { Args: { p_centre_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
      pay_partner_commission: {
        Args: { p_amount: number; p_partner_id: string }
        Returns: boolean
      }
      reconcile_factures_inscriptions: {
        Args: never
        Returns: {
          contact_id: string
          facture_id: string
          numero_facture: string
          session_inscription_id: string
          session_nom: string
        }[]
      }
      refuse_document_public: {
        Args: { p_commentaires?: string; p_signature_id: string }
        Returns: Json
      }
      reserver_creneau: {
        Args: { p_contact_id: string; p_creneau_id: string }
        Returns: Json
      }
      reserver_creneau_public: {
        Args: { p_creneau_id: string; p_token: string }
        Returns: Json
      }
      restore_record: {
        Args: { p_record_id: string; p_table_name: string }
        Returns: boolean
      }
      restore_session: { Args: { p_session_id: string }; Returns: Json }
      revoke_certificate: {
        Args: { p_certificate_id: string; p_reason?: string }
        Returns: boolean
      }
      run_security_smoke_tests: { Args: never; Returns: Json }
      sign_document_public: {
        Args: {
          p_signature_id: string
          p_signature_url: string
          p_user_agent?: string
        }
        Returns: Json
      }
      skip_onboarding_step: { Args: { p_step_id: string }; Returns: undefined }
      soft_delete_record: {
        Args: { p_reason?: string; p_record_id: string; p_table_name: string }
        Returns: boolean
      }
      soft_delete_session: {
        Args: { p_reason?: string; p_session_id: string }
        Returns: Json
      }
      storage_object_centre_id: {
        Args: { object_name: string }
        Returns: string
      }
      submit_reclamation_with_token: {
        Args: {
          p_categorie?: string
          p_description: string
          p_priorite?: string
          p_titre: string
          p_token: string
        }
        Returns: Json
      }
      submit_satisfaction_with_token: {
        Args: {
          p_commentaire?: string
          p_note_formateur: number
          p_note_globale: number
          p_note_locaux: number
          p_note_supports: number
          p_nps_score: number
          p_objectifs_atteints: string
          p_token: string
        }
        Returns: Json
      }
      unarchive_session: { Args: { p_session_id: string }; Returns: boolean }
      use_reservation_token: { Args: { p_token: string }; Returns: boolean }
      validate_api_key: { Args: { p_key_hash: string }; Returns: string }
      validate_enquete_token: {
        Args: { p_token: string }
        Returns: {
          contact_email: string
          contact_id: string
          contact_nom: string
          contact_prenom: string
          created_at: string
          expire_at: string
          id: string
          session_formation_type: string
          session_id: string
          session_nom: string
          token: string
          type: string
          used_at: string
        }[]
      }
      validate_learner_portal_token: {
        Args: { p_token: string }
        Returns: {
          contact_formation: string
          contact_id: string
          contact_nom: string
          contact_prenom: string
          expire_at: string
          used_at: string
        }[]
      }
      validate_reservation_token: {
        Args: { p_token: string }
        Returns: {
          apprenant_formation: string
          apprenant_id: string
          apprenant_nom: string
          apprenant_prenom: string
          token_actif: boolean
          token_expire: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "super_admin" | "formateur"
      budget_type: "charge" | "revenu"
      categorie_ressource_conduite:
        | "regles_centre"
        | "regles_formateur"
        | "deroulement_examen"
        | "adresses_secteur"
        | "checklist_jour_j"
        | "conseils_conduite"
        | "documents_apporter"
      charge_categorie:
        | "loyer"
        | "salaires"
        | "charges_sociales"
        | "formateurs_vacataires"
        | "materiel_pedagogique"
        | "logiciels_abonnements"
        | "marketing_publicite"
        | "comptabilite_juridique"
        | "assurances"
        | "telephone_internet"
        | "fournitures_bureau"
        | "deplacement"
        | "entretien_locaux"
        | "taxes_impots"
        | "autre"
      charge_periodicite: "unique" | "mensuelle" | "trimestrielle" | "annuelle"
      charge_statut: "active" | "annulee"
      charter_status: "draft" | "active" | "archived"
      civilite: "Monsieur" | "Madame"
      contact_origin:
        | "site_web"
        | "bouche_a_oreille"
        | "partenaire"
        | "reseaux_sociaux"
        | "publicite"
        | "salon"
        | "autre"
      contact_statut:
        | "En attente de validation"
        | "Client"
        | "Bravo"
        | "En formation théorique"
        | "Examen T3P programmé"
        | "T3P obtenu"
        | "En formation pratique"
        | "Examen pratique programmé"
        | "Abandonné"
      devis_statut:
        | "brouillon"
        | "envoye"
        | "accepte"
        | "refuse"
        | "expire"
        | "converti"
      document_instance_status: "generated" | "sent" | "signed" | "archived"
      document_status: "actif" | "archive"
      facture_statut:
        | "brouillon"
        | "emise"
        | "payee"
        | "partiel"
        | "impayee"
        | "annulee"
      financement_type: "personnel" | "entreprise" | "cpf" | "opco"
      formation_cible_conduite: "taxi_initial" | "vtc" | "vmdtr" | "tous"
      formation_track: "initial" | "continuing"
      formation_type:
        | "TAXI"
        | "VTC"
        | "VMDTR"
        | "ACC VTC"
        | "ACC VTC 75"
        | "Formation continue Taxi"
        | "Formation continue VTC"
        | "Mobilité Taxi"
      generated_doc_status: "queued" | "generated" | "failed"
      mode_paiement: "cb" | "virement" | "cheque" | "especes" | "cpf" | "alma"
      mode_versement: "especes" | "cb" | "virement" | "alma" | "cpf"
      niveau_conduite: "debutant" | "intermediaire" | "avance" | "pret_examen"
      partner_category:
        | "assurance"
        | "comptable"
        | "medecin"
        | "banque"
        | "vehicule"
        | "autre"
      partner_remuneration_mode: "commission" | "forfait" | "aucun"
      partner_status: "actif" | "inactif" | "suspendu"
      partner_type:
        | "apporteur_affaires"
        | "auto_ecole"
        | "entreprise"
        | "organisme_formation"
        | "prescripteur"
        | "autre"
      pedagogical_document_type:
        | "inscription"
        | "entree_sortie"
        | "test_positionnement"
        | "attestation"
        | "autre"
      prospect_status: "nouveau" | "contacte" | "relance" | "converti" | "perdu"
      session_status:
        | "a_venir"
        | "en_cours"
        | "terminee"
        | "annulee"
        | "complet"
      statut_apprenant: "actif" | "diplome" | "abandon" | "archive"
      statut_cma: "docs_manquants" | "en_cours" | "valide" | "rejete"
      statut_reservation_conduite:
        | "confirmee"
        | "annulee_eleve"
        | "annulee_formateur"
        | "no_show"
        | "realisee"
      template_applies_to: "contact" | "session" | "inscription"
      template_category: "finance" | "formation" | "admin" | "qualite"
      template_entity_type:
        | "prospect"
        | "stagiaire"
        | "inscription"
        | "session"
        | "paiement"
        | "centre"
      template_format: "html" | "pdf" | "docx" | "email" | "markdown"
      template_status:
        | "draft"
        | "review"
        | "approved"
        | "published"
        | "inactive"
        | "archived"
      template_track_scope: "initial" | "continuing" | "both"
      template_type:
        | "invoice"
        | "email"
        | "attestation"
        | "programme"
        | "contrat"
        | "convention"
        | "bulletin_inscription"
        | "positionnement"
        | "evaluation"
        | "emargement"
        | "chef_oeuvre"
        | "reglement_interieur"
        | "convocation"
        | "autre"
        | "evaluation_chaud"
        | "evaluation_froid"
        | "test_positionnement"
        | "feuille_emargement"
        | "procedure_reclamation"
        | "devis"
      type_charge: "fixe" | "variable"
      type_contenu_ressource: "texte" | "liste" | "carte" | "pdf" | "video"
      type_seance_conduite:
        | "conduite_preventive"
        | "conduite_ville"
        | "accompagnement_examen"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff", "super_admin", "formateur"],
      budget_type: ["charge", "revenu"],
      categorie_ressource_conduite: [
        "regles_centre",
        "regles_formateur",
        "deroulement_examen",
        "adresses_secteur",
        "checklist_jour_j",
        "conseils_conduite",
        "documents_apporter",
      ],
      charge_categorie: [
        "loyer",
        "salaires",
        "charges_sociales",
        "formateurs_vacataires",
        "materiel_pedagogique",
        "logiciels_abonnements",
        "marketing_publicite",
        "comptabilite_juridique",
        "assurances",
        "telephone_internet",
        "fournitures_bureau",
        "deplacement",
        "entretien_locaux",
        "taxes_impots",
        "autre",
      ],
      charge_periodicite: ["unique", "mensuelle", "trimestrielle", "annuelle"],
      charge_statut: ["active", "annulee"],
      charter_status: ["draft", "active", "archived"],
      civilite: ["Monsieur", "Madame"],
      contact_origin: [
        "site_web",
        "bouche_a_oreille",
        "partenaire",
        "reseaux_sociaux",
        "publicite",
        "salon",
        "autre",
      ],
      contact_statut: [
        "En attente de validation",
        "Client",
        "Bravo",
        "En formation théorique",
        "Examen T3P programmé",
        "T3P obtenu",
        "En formation pratique",
        "Examen pratique programmé",
        "Abandonné",
      ],
      devis_statut: [
        "brouillon",
        "envoye",
        "accepte",
        "refuse",
        "expire",
        "converti",
      ],
      document_instance_status: ["generated", "sent", "signed", "archived"],
      document_status: ["actif", "archive"],
      facture_statut: [
        "brouillon",
        "emise",
        "payee",
        "partiel",
        "impayee",
        "annulee",
      ],
      financement_type: ["personnel", "entreprise", "cpf", "opco"],
      formation_cible_conduite: ["taxi_initial", "vtc", "vmdtr", "tous"],
      formation_track: ["initial", "continuing"],
      formation_type: [
        "TAXI",
        "VTC",
        "VMDTR",
        "ACC VTC",
        "ACC VTC 75",
        "Formation continue Taxi",
        "Formation continue VTC",
        "Mobilité Taxi",
      ],
      generated_doc_status: ["queued", "generated", "failed"],
      mode_paiement: ["cb", "virement", "cheque", "especes", "cpf", "alma"],
      mode_versement: ["especes", "cb", "virement", "alma", "cpf"],
      niveau_conduite: ["debutant", "intermediaire", "avance", "pret_examen"],
      partner_category: [
        "assurance",
        "comptable",
        "medecin",
        "banque",
        "vehicule",
        "autre",
      ],
      partner_remuneration_mode: ["commission", "forfait", "aucun"],
      partner_status: ["actif", "inactif", "suspendu"],
      partner_type: [
        "apporteur_affaires",
        "auto_ecole",
        "entreprise",
        "organisme_formation",
        "prescripteur",
        "autre",
      ],
      pedagogical_document_type: [
        "inscription",
        "entree_sortie",
        "test_positionnement",
        "attestation",
        "autre",
      ],
      prospect_status: ["nouveau", "contacte", "relance", "converti", "perdu"],
      session_status: ["a_venir", "en_cours", "terminee", "annulee", "complet"],
      statut_apprenant: ["actif", "diplome", "abandon", "archive"],
      statut_cma: ["docs_manquants", "en_cours", "valide", "rejete"],
      statut_reservation_conduite: [
        "confirmee",
        "annulee_eleve",
        "annulee_formateur",
        "no_show",
        "realisee",
      ],
      template_applies_to: ["contact", "session", "inscription"],
      template_category: ["finance", "formation", "admin", "qualite"],
      template_entity_type: [
        "prospect",
        "stagiaire",
        "inscription",
        "session",
        "paiement",
        "centre",
      ],
      template_format: ["html", "pdf", "docx", "email", "markdown"],
      template_status: [
        "draft",
        "review",
        "approved",
        "published",
        "inactive",
        "archived",
      ],
      template_track_scope: ["initial", "continuing", "both"],
      template_type: [
        "invoice",
        "email",
        "attestation",
        "programme",
        "contrat",
        "convention",
        "bulletin_inscription",
        "positionnement",
        "evaluation",
        "emargement",
        "chef_oeuvre",
        "reglement_interieur",
        "convocation",
        "autre",
        "evaluation_chaud",
        "evaluation_froid",
        "test_positionnement",
        "feuille_emargement",
        "procedure_reclamation",
        "devis",
      ],
      type_charge: ["fixe", "variable"],
      type_contenu_ressource: ["texte", "liste", "carte", "pdf", "video"],
      type_seance_conduite: [
        "conduite_preventive",
        "conduite_ville",
        "accompagnement_examen",
      ],
    },
  },
} as const
