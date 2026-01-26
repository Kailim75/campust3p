import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ComplianceCategory = 'cnil' | 'qualiopi';
export type ComplianceCriticite = 'obligatoire' | 'recommande' | 'optionnel';
export type ValidationStatut = 'non_valide' | 'en_cours' | 'valide' | 'non_applicable';

export interface ComplianceItem {
  id: string;
  code: string;
  categorie: ComplianceCategory;
  sous_categorie: string | null;
  titre: string;
  description: string | null;
  reference_legale: string | null;
  criticite: ComplianceCriticite;
  ordre: number;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export interface ComplianceValidation {
  id: string;
  item_id: string;
  centre_id: string | null;
  statut: ValidationStatut;
  commentaire: string | null;
  preuves: string[] | null;
  valide_par: string | null;
  valide_at: string | null;
  date_prochaine_revue: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplianceValidationHistory {
  id: string;
  validation_id: string;
  action: string;
  ancien_statut: string | null;
  nouveau_statut: string | null;
  commentaire: string | null;
  changed_by: string | null;
  changed_at: string;
}

export interface ItemWithValidation extends ComplianceItem {
  validation?: ComplianceValidation;
}

export function useComplianceChecklist(centreId?: string | null) {
  const queryClient = useQueryClient();

  // Get all checklist items
  const { data: items, isLoading: loadingItems } = useQuery({
    queryKey: ["compliance-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compliance_checklist_items")
        .select("*")
        .eq("actif", true)
        .order("ordre", { ascending: true });
      if (error) throw error;
      return data as ComplianceItem[];
    },
  });

  // Get validations for a specific centre (or global if null)
  const { data: validations, isLoading: loadingValidations } = useQuery({
    queryKey: ["compliance-validations", centreId],
    queryFn: async () => {
      let query = supabase.from("compliance_validations").select("*");
      
      if (centreId) {
        query = query.eq("centre_id", centreId);
      } else {
        query = query.is("centre_id", null);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ComplianceValidation[];
    },
  });

  // Get validation history
  const getValidationHistory = async (validationId: string) => {
    const { data, error } = await supabase
      .from("compliance_validation_history")
      .select("*")
      .eq("validation_id", validationId)
      .order("changed_at", { ascending: false });
    if (error) throw error;
    return data as ComplianceValidationHistory[];
  };

  // Upsert validation
  const upsertValidationMutation = useMutation({
    mutationFn: async (validation: {
      item_id: string;
      centre_id?: string | null;
      statut: ValidationStatut;
      commentaire?: string | null;
      preuves?: string[] | null;
      date_prochaine_revue?: string | null;
    }) => {
      const payload = {
        ...validation,
        centre_id: validation.centre_id || null,
        valide_par: validation.statut === 'valide' ? (await supabase.auth.getUser()).data.user?.id : null,
        valide_at: validation.statut === 'valide' ? new Date().toISOString() : null,
      };

      const { data, error } = await supabase
        .from("compliance_validations")
        .upsert(payload, { onConflict: 'item_id,centre_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance-validations", centreId] });
    },
  });

  // Combine items with validations
  const itemsWithValidations: ItemWithValidation[] = items?.map(item => ({
    ...item,
    validation: validations?.find(v => v.item_id === item.id),
  })) || [];

  // Group by category
  const cnilItems = itemsWithValidations.filter(i => i.categorie === 'cnil');
  const qualiopiItems = itemsWithValidations.filter(i => i.categorie === 'qualiopi');

  // Group by subcategory
  const groupBySubcategory = (items: ItemWithValidation[]) => {
    const groups: Record<string, ItemWithValidation[]> = {};
    items.forEach(item => {
      const key = item.sous_categorie || 'Autre';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  };

  // Stats
  const calculateStats = (items: ItemWithValidation[]) => {
    const total = items.length;
    const obligatoires = items.filter(i => i.criticite === 'obligatoire');
    const valides = items.filter(i => i.validation?.statut === 'valide');
    const validesObligatoires = obligatoires.filter(i => i.validation?.statut === 'valide');
    const enCours = items.filter(i => i.validation?.statut === 'en_cours');
    const nonApplicables = items.filter(i => i.validation?.statut === 'non_applicable');
    
    const applicables = total - nonApplicables.length;
    const conformitePct = applicables > 0 ? Math.round((valides.length / applicables) * 100) : 0;
    const conformiteObligatoirePct = obligatoires.length > 0 
      ? Math.round((validesObligatoires.length / (obligatoires.length - obligatoires.filter(i => i.validation?.statut === 'non_applicable').length)) * 100) 
      : 0;

    return {
      total,
      valides: valides.length,
      enCours: enCours.length,
      nonApplicables: nonApplicables.length,
      nonValides: total - valides.length - enCours.length - nonApplicables.length,
      obligatoires: obligatoires.length,
      validesObligatoires: validesObligatoires.length,
      conformitePct,
      conformiteObligatoirePct,
    };
  };

  const globalStats = calculateStats(itemsWithValidations);
  const cnilStats = calculateStats(cnilItems);
  const qualiopiStats = calculateStats(qualiopiItems);

  return {
    items: itemsWithValidations,
    cnilItems,
    qualiopiItems,
    cnilGroups: groupBySubcategory(cnilItems),
    qualiopiGroups: groupBySubcategory(qualiopiItems),
    isLoading: loadingItems || loadingValidations,
    globalStats,
    cnilStats,
    qualiopiStats,
    getValidationHistory,
    upsertValidation: upsertValidationMutation.mutateAsync,
    isUpdating: upsertValidationMutation.isPending,
  };
}
