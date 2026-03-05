// ─── Dashboard URL Filter Helpers ───
// Build query params for navigating from dashboard KPIs to filtered list views.

export interface DashboardFilters {
  range?: string;
  from?: string;
  to?: string;
  status?: string;
  risk?: string;
  track?: string;
  tab?: string;
  filter?: string;
}

function toParams(filters: DashboardFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.range) params.range = filters.range;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.status) params.status = filters.status;
  if (filters.risk) params.risk = filters.risk;
  if (filters.track) params.track = filters.track;
  if (filters.tab) params.tab = filters.tab;
  if (filters.filter) params.filter = filters.filter;
  return params;
}

export function buildFinanceUrl(filters: DashboardFilters = {}): { section: string; params: Record<string, string> } {
  return { section: "finances", params: toParams(filters) };
}

export function buildProspectsUrl(filters: DashboardFilters = {}): { section: string; params: Record<string, string> } {
  return { section: "prospects", params: toParams(filters) };
}

export function buildSessionsUrl(filters: DashboardFilters = {}): { section: string; params: Record<string, string> } {
  return { section: "sessions", params: toParams(filters) };
}

export function buildApprenantsUrl(filters: DashboardFilters = {}): { section: string; params: Record<string, string> } {
  return { section: "contacts", params: toParams(filters) };
}
