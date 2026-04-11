// Formation type color palette - consistent across all session views
// Colors are designed for both light and dark modes using Tailwind classes

export const FORMATION_COLORS: Record<string, {
  bg: string;
  border: string;
  text: string;
  dot: string;
  badge: string;
}> = {
  TAXI: {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-l-amber-500 border-amber-200 dark:border-amber-700",
    text: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
    badge: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
  },
  VTC: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-l-blue-500 border-blue-200 dark:border-blue-700",
    text: "text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500",
    badge: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
  },
  VMDTR: {
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-l-emerald-500 border-emerald-200 dark:border-emerald-700",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700",
  },
  "ACC VTC": {
    bg: "bg-violet-50 dark:bg-violet-900/20",
    border: "border-l-violet-500 border-violet-200 dark:border-violet-700",
    text: "text-violet-700 dark:text-violet-300",
    dot: "bg-violet-500",
    badge: "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700",
  },
  "ACC VTC 75": {
    bg: "bg-pink-50 dark:bg-pink-900/20",
    border: "border-l-pink-500 border-pink-200 dark:border-pink-700",
    text: "text-pink-700 dark:text-pink-300",
    dot: "bg-pink-500",
    badge: "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-700",
  },
  "Formation continue Taxi": {
    bg: "bg-orange-50 dark:bg-orange-900/20",
    border: "border-l-orange-500 border-orange-200 dark:border-orange-700",
    text: "text-orange-700 dark:text-orange-300",
    dot: "bg-orange-500",
    badge: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700",
  },
  "Formation continue VTC": {
    bg: "bg-cyan-50 dark:bg-cyan-900/20",
    border: "border-l-cyan-500 border-cyan-200 dark:border-cyan-700",
    text: "text-cyan-700 dark:text-cyan-300",
    dot: "bg-cyan-500",
    badge: "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-700",
  },
  "Mobilité Taxi": {
    bg: "bg-rose-50 dark:bg-rose-900/20",
    border: "border-l-rose-500 border-rose-200 dark:border-rose-700",
    text: "text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
    badge: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700",
  },
  Passerelle: {
    bg: "bg-indigo-50 dark:bg-indigo-900/20",
    border: "border-l-indigo-500 border-indigo-200 dark:border-indigo-700",
    text: "text-indigo-700 dark:text-indigo-300",
    dot: "bg-indigo-500",
    badge: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700",
  },
  Services: {
    bg: "bg-slate-50 dark:bg-slate-900/20",
    border: "border-l-slate-500 border-slate-200 dark:border-slate-700",
    text: "text-slate-700 dark:text-slate-300",
    dot: "bg-slate-500",
    badge: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/30 dark:text-slate-300 dark:border-slate-700",
  },
  Premium: {
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    border: "border-l-yellow-500 border-yellow-200 dark:border-yellow-700",
    text: "text-yellow-700 dark:text-yellow-300",
    dot: "bg-yellow-500",
    badge: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700",
  },
};

// Default color for unknown formation types
export const DEFAULT_FORMATION_COLOR = {
  bg: "bg-gray-50 dark:bg-gray-900/20",
  border: "border-l-gray-500 border-gray-200 dark:border-gray-700",
  text: "text-gray-700 dark:text-gray-300",
  dot: "bg-gray-500",
  badge: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-700",
};

export function getFormationColor(formationType?: string | null) {
  if (!formationType) {
    return DEFAULT_FORMATION_COLOR;
  }

  return FORMATION_COLORS[formationType] || DEFAULT_FORMATION_COLOR;
}

export const FORMATION_LABELS: Record<string, string> = {
  TAXI: "Taxi",
  VTC: "VTC",
  VMDTR: "VMDTR",
  "ACC VTC": "ACC VTC",
  "ACC VTC 75": "ACC VTC 75",
  "Formation continue Taxi": "Continue Taxi",
  "Formation continue VTC": "Continue VTC",
  "Mobilité Taxi": "Mobilité Taxi",
  Passerelle: "Passerelle",
  Services: "Services",
  Premium: "Premium",
};

export function getFormationLabel(formationType?: string | null): string {
  if (!formationType) {
    return "Non classé";
  }

  return FORMATION_LABELS[formationType] || formationType;
}
