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
      audit_logs: {
        Row: {
          action: string
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
      cartes_professionnelles: {
        Row: {
          contact_id: string
          created_at: string
          date_demande: string | null
          date_expiration: string | null
          date_obtention: string | null
          documents_manquants: string[] | null
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
          code: string
          created_at: string
          description: string | null
          duree_heures: number
          id: string
          intitule: string
          objectifs: string | null
          prerequis: string | null
          prix_ht: number
          remise_percent: number
          tva_percent: number
          type_formation: string
          updated_at: string
        }
        Insert: {
          actif?: boolean
          categorie?: string
          code: string
          created_at?: string
          description?: string | null
          duree_heures?: number
          id?: string
          intitule: string
          objectifs?: string | null
          prerequis?: string | null
          prix_ht?: number
          remise_percent?: number
          tva_percent?: number
          type_formation?: string
          updated_at?: string
        }
        Update: {
          actif?: boolean
          categorie?: string
          code?: string
          created_at?: string
          description?: string | null
          duree_heures?: number
          id?: string
          intitule?: string
          objectifs?: string | null
          prerequis?: string | null
          prix_ht?: number
          remise_percent?: number
          tva_percent?: number
          type_formation?: string
          updated_at?: string
        }
        Relationships: []
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
      contact_documents: {
        Row: {
          commentaires: string | null
          contact_id: string
          created_at: string
          date_expiration: string | null
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
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          archived: boolean
          civilite: Database["public"]["Enums"]["civilite"] | null
          code_postal: string | null
          commentaires: string | null
          created_at: string
          custom_id: string | null
          date_delivrance_permis: string | null
          date_expiration_carte: string | null
          date_naissance: string | null
          email: string | null
          filleul: string | null
          fonction: string | null
          formation: Database["public"]["Enums"]["formation_type"] | null
          id: string
          nom: string
          nom_naissance: string | null
          numero_carte_professionnelle: string | null
          numero_permis: string | null
          parrain: string | null
          pays_naissance: string | null
          precisions: string | null
          prefecture_carte: string | null
          prefecture_permis: string | null
          prenom: string
          rue: string | null
          source: string | null
          statut: Database["public"]["Enums"]["contact_statut"] | null
          telephone: string | null
          uid: string | null
          updated_at: string
          ville: string | null
          ville_naissance: string | null
        }
        Insert: {
          archived?: boolean
          civilite?: Database["public"]["Enums"]["civilite"] | null
          code_postal?: string | null
          commentaires?: string | null
          created_at?: string
          custom_id?: string | null
          date_delivrance_permis?: string | null
          date_expiration_carte?: string | null
          date_naissance?: string | null
          email?: string | null
          filleul?: string | null
          fonction?: string | null
          formation?: Database["public"]["Enums"]["formation_type"] | null
          id?: string
          nom: string
          nom_naissance?: string | null
          numero_carte_professionnelle?: string | null
          numero_permis?: string | null
          parrain?: string | null
          pays_naissance?: string | null
          precisions?: string | null
          prefecture_carte?: string | null
          prefecture_permis?: string | null
          prenom: string
          rue?: string | null
          source?: string | null
          statut?: Database["public"]["Enums"]["contact_statut"] | null
          telephone?: string | null
          uid?: string | null
          updated_at?: string
          ville?: string | null
          ville_naissance?: string | null
        }
        Update: {
          archived?: boolean
          civilite?: Database["public"]["Enums"]["civilite"] | null
          code_postal?: string | null
          commentaires?: string | null
          created_at?: string
          custom_id?: string | null
          date_delivrance_permis?: string | null
          date_expiration_carte?: string | null
          date_naissance?: string | null
          email?: string | null
          filleul?: string | null
          fonction?: string | null
          formation?: Database["public"]["Enums"]["formation_type"] | null
          id?: string
          nom?: string
          nom_naissance?: string | null
          numero_carte_professionnelle?: string | null
          numero_permis?: string | null
          parrain?: string | null
          pays_naissance?: string | null
          precisions?: string | null
          prefecture_carte?: string | null
          prefecture_permis?: string | null
          prenom?: string
          rue?: string | null
          source?: string | null
          statut?: Database["public"]["Enums"]["contact_statut"] | null
          telephone?: string | null
          uid?: string | null
          updated_at?: string
          ville?: string | null
          ville_naissance?: string | null
        }
        Relationships: []
      }
      contrats_location: {
        Row: {
          conditions_particulieres: string | null
          contact_id: string
          created_at: string
          created_by: string | null
          date_debut: string
          date_envoi: string | null
          date_fin: string
          date_signature: string | null
          document_genere_path: string | null
          document_signe_path: string | null
          id: string
          modalite_paiement: string | null
          montant_caution: number | null
          montant_mensuel: number
          notes: string | null
          numero_contrat: string
          objet_location: string
          signature_data: string | null
          signature_ip: string | null
          signature_user_agent: string | null
          statut: Database["public"]["Enums"]["contrat_location_statut"]
          template_file_id: string | null
          type_contrat: Database["public"]["Enums"]["contrat_location_type"]
          updated_at: string
          vehicule_id: string | null
        }
        Insert: {
          conditions_particulieres?: string | null
          contact_id: string
          created_at?: string
          created_by?: string | null
          date_debut: string
          date_envoi?: string | null
          date_fin: string
          date_signature?: string | null
          document_genere_path?: string | null
          document_signe_path?: string | null
          id?: string
          modalite_paiement?: string | null
          montant_caution?: number | null
          montant_mensuel?: number
          notes?: string | null
          numero_contrat: string
          objet_location: string
          signature_data?: string | null
          signature_ip?: string | null
          signature_user_agent?: string | null
          statut?: Database["public"]["Enums"]["contrat_location_statut"]
          template_file_id?: string | null
          type_contrat?: Database["public"]["Enums"]["contrat_location_type"]
          updated_at?: string
          vehicule_id?: string | null
        }
        Update: {
          conditions_particulieres?: string | null
          contact_id?: string
          created_at?: string
          created_by?: string | null
          date_debut?: string
          date_envoi?: string | null
          date_fin?: string
          date_signature?: string | null
          document_genere_path?: string | null
          document_signe_path?: string | null
          id?: string
          modalite_paiement?: string | null
          montant_caution?: number | null
          montant_mensuel?: number
          notes?: string | null
          numero_contrat?: string
          objet_location?: string
          signature_data?: string | null
          signature_ip?: string | null
          signature_user_agent?: string | null
          statut?: Database["public"]["Enums"]["contrat_location_statut"]
          template_file_id?: string | null
          type_contrat?: Database["public"]["Enums"]["contrat_location_type"]
          updated_at?: string
          vehicule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contrats_location_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrats_location_template_file_id_fkey"
            columns: ["template_file_id"]
            isOneToOne: false
            referencedRelation: "document_template_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrats_location_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
        ]
      }
      contrats_location_historique: {
        Row: {
          action: string
          ancien_statut: string | null
          contrat_id: string
          created_at: string
          details: string | null
          id: string
          ip_address: string | null
          nouveau_statut: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          ancien_statut?: string | null
          contrat_id: string
          created_at?: string
          details?: string | null
          id?: string
          ip_address?: string | null
          nouveau_statut?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          ancien_statut?: string | null
          contrat_id?: string
          created_at?: string
          details?: string | null
          id?: string
          ip_address?: string | null
          nouveau_statut?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contrats_location_historique_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "contrats_location"
            referencedColumns: ["id"]
          },
        ]
      }
      devis: {
        Row: {
          commentaires: string | null
          contact_id: string
          created_at: string
          date_emission: string | null
          date_validite: string | null
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
          commentaires?: string | null
          contact_id: string
          created_at?: string
          date_emission?: string | null
          date_validite?: string | null
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
          commentaires?: string | null
          contact_id?: string
          created_at?: string
          date_emission?: string | null
          date_validite?: string | null
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
      document_envois: {
        Row: {
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
          session_id: string | null
          statut: string
        }
        Insert: {
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
          session_id?: string | null
          statut?: string
        }
        Update: {
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
          session_id?: string | null
          statut?: string
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
      document_template_files: {
        Row: {
          actif: boolean | null
          categorie: string | null
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
        Relationships: []
      }
      document_templates: {
        Row: {
          actif: boolean
          categorie: string
          contenu: string
          created_at: string
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
          contenu: string
          created_at: string
          id: string
          nom: string
          sujet: string
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          actif?: boolean
          categorie?: string
          contenu: string
          created_at?: string
          id?: string
          nom: string
          sujet: string
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          actif?: boolean
          categorie?: string
          contenu?: string
          created_at?: string
          id?: string
          nom?: string
          sujet?: string
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      emargements: {
        Row: {
          commentaires: string | null
          contact_id: string
          created_at: string
          date_emargement: string
          date_signature: string | null
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
          commentaires: string | null
          contact_id: string
          created_at: string
          date_echeance: string | null
          date_emission: string | null
          id: string
          montant_total: number
          numero_facture: string
          session_inscription_id: string | null
          statut: Database["public"]["Enums"]["facture_statut"]
          type_financement: Database["public"]["Enums"]["financement_type"]
          updated_at: string
        }
        Insert: {
          commentaires?: string | null
          contact_id: string
          created_at?: string
          date_echeance?: string | null
          date_emission?: string | null
          id?: string
          montant_total: number
          numero_facture: string
          session_inscription_id?: string | null
          statut?: Database["public"]["Enums"]["facture_statut"]
          type_financement?: Database["public"]["Enums"]["financement_type"]
          updated_at?: string
        }
        Update: {
          commentaires?: string | null
          contact_id?: string
          created_at?: string
          date_echeance?: string | null
          date_emission?: string | null
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
          ville: string | null
        }
        Insert: {
          actif?: boolean
          adresse?: string | null
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
          ville?: string | null
        }
        Update: {
          actif?: boolean
          adresse?: string | null
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
          ville?: string | null
        }
        Relationships: []
      }
      generated_documents: {
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
        Relationships: []
      }
      paiements: {
        Row: {
          commentaires: string | null
          created_at: string
          date_paiement: string
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
      partners: {
        Row: {
          address: string | null
          category: Database["public"]["Enums"]["partner_category"]
          company_name: string
          contact_name: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          is_active: boolean
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          category?: Database["public"]["Enums"]["partner_category"]
          company_name: string
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          category?: Database["public"]["Enums"]["partner_category"]
          company_name?: string
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
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
      prospects: {
        Row: {
          converted_contact_id: string | null
          created_at: string
          created_by: string | null
          email: string | null
          formation_souhaitee: string | null
          id: string
          is_active: boolean
          nom: string
          notes: string | null
          prenom: string
          source: string | null
          statut: Database["public"]["Enums"]["prospect_status"]
          telephone: string | null
          updated_at: string
        }
        Insert: {
          converted_contact_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          formation_souhaitee?: string | null
          id?: string
          is_active?: boolean
          nom: string
          notes?: string | null
          prenom: string
          source?: string | null
          statut?: Database["public"]["Enums"]["prospect_status"]
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          converted_contact_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          formation_souhaitee?: string | null
          id?: string
          is_active?: boolean
          nom?: string
          notes?: string | null
          prenom?: string
          source?: string | null
          statut?: Database["public"]["Enums"]["prospect_status"]
          telephone?: string | null
          updated_at?: string
        }
        Relationships: [
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
        Relationships: []
      }
      qualiopi_indicateurs: {
        Row: {
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
        Relationships: []
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
      satisfaction_reponses: {
        Row: {
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
      session_inscriptions: {
        Row: {
          commentaires: string | null
          contact_id: string
          created_at: string
          date_inscription: string
          documents_envoyes: string[] | null
          id: string
          session_id: string
          statut: string
          statut_paiement: string | null
          updated_at: string
        }
        Insert: {
          commentaires?: string | null
          contact_id: string
          created_at?: string
          date_inscription?: string
          documents_envoyes?: string[] | null
          id?: string
          session_id: string
          statut?: string
          statut_paiement?: string | null
          updated_at?: string
        }
        Update: {
          commentaires?: string | null
          contact_id?: string
          created_at?: string
          date_inscription?: string
          documents_envoyes?: string[] | null
          id?: string
          session_id?: string
          statut?: string
          statut_paiement?: string | null
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
          catalogue_formation_id: string | null
          created_at: string
          date_debut: string
          date_fin: string
          description: string | null
          duree_heures: number | null
          formateur: string | null
          formateur_id: string | null
          formation_type: Database["public"]["Enums"]["formation_type"]
          heure_debut: string | null
          heure_fin: string | null
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
          tva_percent: number | null
          updated_at: string
        }
        Insert: {
          adresse_code_postal?: string | null
          adresse_rue?: string | null
          adresse_ville?: string | null
          catalogue_formation_id?: string | null
          created_at?: string
          date_debut: string
          date_fin: string
          description?: string | null
          duree_heures?: number | null
          formateur?: string | null
          formateur_id?: string | null
          formation_type: Database["public"]["Enums"]["formation_type"]
          heure_debut?: string | null
          heure_fin?: string | null
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
          tva_percent?: number | null
          updated_at?: string
        }
        Update: {
          adresse_code_postal?: string | null
          adresse_rue?: string | null
          adresse_ville?: string | null
          catalogue_formation_id?: string | null
          created_at?: string
          date_debut?: string
          date_fin?: string
          description?: string | null
          duree_heures?: number | null
          formateur?: string | null
          formateur_id?: string | null
          formation_type?: Database["public"]["Enums"]["formation_type"]
          heure_debut?: string | null
          heure_fin?: string | null
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
          commentaires: string | null
          contact_id: string
          created_at: string
          date_envoi: string | null
          date_expiration: string | null
          date_signature: string | null
          description: string | null
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
          commentaires?: string | null
          contact_id: string
          created_at?: string
          date_envoi?: string | null
          date_expiration?: string | null
          date_signature?: string | null
          description?: string | null
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
          commentaires?: string | null
          contact_id?: string
          created_at?: string
          date_envoi?: string | null
          date_expiration?: string | null
          date_signature?: string | null
          description?: string | null
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
        Relationships: []
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
          created_at?: string | null
          description?: string | null
          id?: string
          nom?: string
          trigger_conditions?: Json | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_numero_contrat: { Args: never; Returns: string }
      generate_numero_devis: { Args: never; Returns: string }
      generate_numero_facture: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
    }
    Enums: {
      app_role: "admin" | "staff"
      civilite: "Monsieur" | "Madame"
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
      contrat_location_statut:
        | "brouillon"
        | "envoye"
        | "signe"
        | "refuse"
        | "expire"
        | "resilie"
      contrat_location_type: "vehicule" | "materiel" | "autre"
      devis_statut:
        | "brouillon"
        | "envoye"
        | "accepte"
        | "refuse"
        | "expire"
        | "converti"
      document_status: "actif" | "archive"
      facture_statut:
        | "brouillon"
        | "emise"
        | "payee"
        | "partiel"
        | "impayee"
        | "annulee"
      financement_type: "personnel" | "entreprise" | "cpf" | "opco"
      formation_type:
        | "TAXI"
        | "VTC"
        | "VMDTR"
        | "ACC VTC"
        | "ACC VTC 75"
        | "Formation continue Taxi"
        | "Formation continue VTC"
        | "Mobilité Taxi"
      mode_paiement: "cb" | "virement" | "cheque" | "especes" | "cpf"
      partner_category:
        | "assurance"
        | "comptable"
        | "medecin"
        | "banque"
        | "vehicule"
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
      app_role: ["admin", "staff"],
      civilite: ["Monsieur", "Madame"],
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
      contrat_location_statut: [
        "brouillon",
        "envoye",
        "signe",
        "refuse",
        "expire",
        "resilie",
      ],
      contrat_location_type: ["vehicule", "materiel", "autre"],
      devis_statut: [
        "brouillon",
        "envoye",
        "accepte",
        "refuse",
        "expire",
        "converti",
      ],
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
      mode_paiement: ["cb", "virement", "cheque", "especes", "cpf"],
      partner_category: [
        "assurance",
        "comptable",
        "medecin",
        "banque",
        "vehicule",
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
    },
  },
} as const
