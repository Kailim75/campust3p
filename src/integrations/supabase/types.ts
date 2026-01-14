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
      session_inscriptions: {
        Row: {
          commentaires: string | null
          contact_id: string
          created_at: string
          date_inscription: string
          id: string
          session_id: string
          statut: string
          updated_at: string
        }
        Insert: {
          commentaires?: string | null
          contact_id: string
          created_at?: string
          date_inscription?: string
          id?: string
          session_id: string
          statut?: string
          updated_at?: string
        }
        Update: {
          commentaires?: string | null
          contact_id?: string
          created_at?: string
          date_inscription?: string
          id?: string
          session_id?: string
          statut?: string
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
          created_at: string
          date_debut: string
          date_fin: string
          description: string | null
          formateur: string | null
          formation_type: Database["public"]["Enums"]["formation_type"]
          id: string
          lieu: string | null
          nom: string
          places_totales: number
          prix: number | null
          statut: Database["public"]["Enums"]["session_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_debut: string
          date_fin: string
          description?: string | null
          formateur?: string | null
          formation_type: Database["public"]["Enums"]["formation_type"]
          id?: string
          lieu?: string | null
          nom: string
          places_totales?: number
          prix?: number | null
          statut?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_debut?: string
          date_fin?: string
          description?: string | null
          formateur?: string | null
          formation_type?: Database["public"]["Enums"]["formation_type"]
          id?: string
          lieu?: string | null
          nom?: string
          places_totales?: number
          prix?: number | null
          statut?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_numero_devis: { Args: never; Returns: string }
      generate_numero_facture: { Args: never; Returns: string }
    }
    Enums: {
      civilite: "Monsieur" | "Madame"
      contact_statut: "En attente de validation" | "Client" | "Bravo"
      devis_statut:
        | "brouillon"
        | "envoye"
        | "accepte"
        | "refuse"
        | "expire"
        | "converti"
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
      civilite: ["Monsieur", "Madame"],
      contact_statut: ["En attente de validation", "Client", "Bravo"],
      devis_statut: [
        "brouillon",
        "envoye",
        "accepte",
        "refuse",
        "expire",
        "converti",
      ],
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
      session_status: ["a_venir", "en_cours", "terminee", "annulee", "complet"],
    },
  },
} as const
