/**
 * Programmes de formation T3P - Nomenclature réglementaire
 * 
 * Format : [TYPE]-[METIER]-[ZONE]-v[VERSION]
 * 
 * TYPES :
 * - INIT : Formation initiale (accès à la profession)
 * - FC : Formation continue (renouvellement carte professionnelle)
 * - MOB : Mobilité (extension territoriale - TAXI uniquement)
 * 
 * METIERS :
 * - TAXI : Conducteur de taxi
 * - VTC : Conducteur de voiture de transport avec chauffeur
 * - VMDTR : Conducteur de véhicule motorisé à deux ou trois roues (moto-taxi)
 * 
 * ZONES :
 * - NAT : National
 * - 75 : Paris
 * - 92 : Hauts-de-Seine
 * - 93 : Seine-Saint-Denis (réservé)
 * - 94 : Val-de-Marne (réservé)
 * 
 * ⚠️ ATTENTION RÉGLEMENTAIRE :
 * - MOB-VTC n'existe PAS (les VTC n'ont pas de contrainte territoriale)
 * - MOB-VMDTR n'existe PAS (pas de mobilité pour les moto-taxis)
 * - Seuls les TAXI peuvent faire une mobilité départementale
 */

// Types de formation
export type ProgrammeType = 'INIT' | 'FC' | 'MOB';
export type Metier = 'TAXI' | 'VTC' | 'VMDTR';
export type ZoneGeographique = 'NAT' | '75' | '92' | '93' | '94';

// Interface programme
export interface ProgrammeFormation {
  code: string;
  type: ProgrammeType;
  metier: Metier;
  zone: ZoneGeographique;
  intitule: string;
  intituleCourt: string;
  dureeHeures: number;
  description: string;
  couleur: string;
}

// =====================================================
// FORMATIONS INITIALES (INIT)
// =====================================================
export const PROGRAMMES_INITIALES: ProgrammeFormation[] = [
  {
    code: 'INIT-TAXI-NAT-v1',
    type: 'INIT',
    metier: 'TAXI',
    zone: 'NAT',
    intitule: 'Formation initiale - Conducteur de Taxi',
    intituleCourt: 'Formation initiale Taxi',
    dureeHeures: 34, // Durée adaptée au format du centre
    description: 'Préparation à l\'examen d\'accès à la profession de conducteur de taxi',
    couleur: '#F59E0B', // amber-500
  },
  {
    code: 'INIT-VTC-NAT-v1',
    type: 'INIT',
    metier: 'VTC',
    zone: 'NAT',
    intitule: 'Formation initiale - Conducteur de VTC',
    intituleCourt: 'Formation initiale VTC',
    dureeHeures: 34, // Durée adaptée au format du centre
    description: 'Préparation à l\'examen d\'accès à la profession de conducteur VTC',
    couleur: '#3B82F6', // blue-500
  },
  {
    code: 'INIT-VMDTR-NAT-v1',
    type: 'INIT',
    metier: 'VMDTR',
    zone: 'NAT',
    intitule: 'Formation initiale - Conducteur de VMDTR',
    intituleCourt: 'Formation initiale VMDTR',
    dureeHeures: 34, // Durée adaptée au format du centre
    description: 'Préparation à l\'examen d\'accès à la profession de moto-taxi',
    couleur: '#10B981', // emerald-500
  },
];

// =====================================================
// FORMATIONS CONTINUES (FC)
// =====================================================
export const PROGRAMMES_CONTINUES: ProgrammeFormation[] = [
  {
    code: 'FC-TAXI-NAT-v1',
    type: 'FC',
    metier: 'TAXI',
    zone: 'NAT',
    intitule: 'Formation continue - Conducteur de Taxi',
    intituleCourt: 'Formation continue Taxi',
    dureeHeures: 14,
    description: 'Formation obligatoire pour le renouvellement de la carte professionnelle taxi',
    couleur: '#F59E0B',
  },
  {
    code: 'FC-VTC-NAT-v1',
    type: 'FC',
    metier: 'VTC',
    zone: 'NAT',
    intitule: 'Formation continue - Conducteur de VTC',
    intituleCourt: 'Formation continue VTC',
    dureeHeures: 14,
    description: 'Formation obligatoire pour le renouvellement de la carte professionnelle VTC',
    couleur: '#3B82F6',
  },
  {
    code: 'FC-VMDTR-NAT-v1',
    type: 'FC',
    metier: 'VMDTR',
    zone: 'NAT',
    intitule: 'Formation continue - Conducteur de VMDTR',
    intituleCourt: 'Formation continue VMDTR',
    dureeHeures: 14,
    description: 'Formation obligatoire pour le renouvellement de la carte professionnelle VMDTR',
    couleur: '#10B981',
  },
];

// =====================================================
// FORMATIONS MOBILITÉ (MOB) - TAXI UNIQUEMENT
// =====================================================
export const PROGRAMMES_MOBILITE: ProgrammeFormation[] = [
  {
    code: 'MOB-TAXI-75-v1',
    type: 'MOB',
    metier: 'TAXI',
    zone: '75',
    intitule: 'Mobilité Taxi - Département 75 (Paris)',
    intituleCourt: 'Mobilité Taxi Paris',
    dureeHeures: 14,
    description: 'Extension d\'activité taxi sur le territoire de Paris',
    couleur: '#EF4444', // red-500
  },
  {
    code: 'MOB-TAXI-92-v1',
    type: 'MOB',
    metier: 'TAXI',
    zone: '92',
    intitule: 'Mobilité Taxi - Département 92 (Hauts-de-Seine)',
    intituleCourt: 'Mobilité Taxi 92',
    dureeHeures: 14,
    description: 'Extension d\'activité taxi sur le territoire des Hauts-de-Seine',
    couleur: '#8B5CF6', // violet-500
  },
];

// =====================================================
// TOUS LES PROGRAMMES
// =====================================================
export const TOUS_PROGRAMMES: ProgrammeFormation[] = [
  ...PROGRAMMES_INITIALES,
  ...PROGRAMMES_CONTINUES,
  ...PROGRAMMES_MOBILITE,
];

// =====================================================
// HELPERS
// =====================================================

/**
 * Récupère un programme par son code
 */
export function getProgrammeByCode(code: string): ProgrammeFormation | undefined {
  return TOUS_PROGRAMMES.find(p => p.code === code);
}

/**
 * Récupère les programmes par type
 */
export function getProgrammesByType(type: ProgrammeType): ProgrammeFormation[] {
  return TOUS_PROGRAMMES.filter(p => p.type === type);
}

/**
 * Récupère les programmes par métier
 */
export function getProgrammesByMetier(metier: Metier): ProgrammeFormation[] {
  return TOUS_PROGRAMMES.filter(p => p.metier === metier);
}

/**
 * Vérifie si un code de programme est valide selon la nomenclature
 */
export function isValidProgrammeCode(code: string): boolean {
  const pattern = /^(INIT|FC|MOB)-(TAXI|VTC|VMDTR)-(NAT|75|92|93|94)-v\d+$/;
  if (!pattern.test(code)) return false;
  
  // Vérification des règles métier
  const [type, metier, zone] = code.split('-');
  
  // MOB n'existe que pour TAXI
  if (type === 'MOB' && metier !== 'TAXI') {
    return false;
  }
  
  // MOB ne peut pas être NAT (doit avoir un département spécifique)
  // Sauf MOB-TAXI-NAT qui est une formation générique
  
  return true;
}

/**
 * Génère un nouveau code de programme
 */
export function generateProgrammeCode(
  type: ProgrammeType,
  metier: Metier,
  zone: ZoneGeographique,
  version: number = 1
): string | null {
  // Validation des règles métier
  if (type === 'MOB' && metier !== 'TAXI') {
    console.error('⚠️ MOB-VTC et MOB-VMDTR n\'existent pas réglementairement');
    return null;
  }
  
  return `${type}-${metier}-${zone}-v${version}`;
}

/**
 * Parse un code de programme
 */
export function parseProgrammeCode(code: string): {
  type: ProgrammeType;
  metier: Metier;
  zone: ZoneGeographique;
  version: number;
} | null {
  const pattern = /^(INIT|FC|MOB)-(TAXI|VTC|VMDTR)-(NAT|75|92|93|94)-v(\d+)$/;
  const match = code.match(pattern);
  
  if (!match) return null;
  
  return {
    type: match[1] as ProgrammeType,
    metier: match[2] as Metier,
    zone: match[3] as ZoneGeographique,
    version: parseInt(match[4], 10),
  };
}

/**
 * Labels pour affichage
 */
export const TYPE_LABELS: Record<ProgrammeType, string> = {
  INIT: 'Formation initiale',
  FC: 'Formation continue',
  MOB: 'Mobilité',
};

export const METIER_LABELS: Record<Metier, string> = {
  TAXI: 'Taxi',
  VTC: 'VTC',
  VMDTR: 'VMDTR (Moto-taxi)',
};

export const ZONE_LABELS: Record<ZoneGeographique, string> = {
  NAT: 'National',
  '75': 'Paris (75)',
  '92': 'Hauts-de-Seine (92)',
  '93': 'Seine-Saint-Denis (93)',
  '94': 'Val-de-Marne (94)',
};

// =====================================================
// MAPPING LEGACY → NOUVEAU
// =====================================================
export const LEGACY_TO_NEW_CODES: Record<string, string> = {
  'TAXI-INIT': 'INIT-TAXI-NAT-v1',
  'VTC-INIT': 'INIT-VTC-NAT-v1',
  'VMDTR': 'INIT-VMDTR-NAT-v1',
  'TAXI-CONT': 'FC-TAXI-NAT-v1',
  'VTC-CONT': 'FC-VTC-NAT-v1',
  'VMDTR-CONTINUE': 'FC-VMDTR-NAT-v1',
  'TAXI-MOB': 'MOB-TAXI-NAT-v1',
};

/**
 * Convertit un ancien code en nouveau code
 */
export function convertLegacyCode(legacyCode: string): string {
  return LEGACY_TO_NEW_CODES[legacyCode] || legacyCode;
}
