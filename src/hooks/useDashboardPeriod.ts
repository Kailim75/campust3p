import { create } from 'zustand';
import { subDays, subMonths, startOfDay } from 'date-fns';

export type PeriodKey = '7d' | '30d' | '3m' | '12m';

interface PeriodOption {
  key: PeriodKey;
  label: string;
  getStartDate: () => Date;
}

export const periodOptions: PeriodOption[] = [
  { key: '7d', label: '7 derniers jours', getStartDate: () => startOfDay(subDays(new Date(), 7)) },
  { key: '30d', label: '30 derniers jours', getStartDate: () => startOfDay(subDays(new Date(), 30)) },
  { key: '3m', label: '3 derniers mois', getStartDate: () => startOfDay(subMonths(new Date(), 3)) },
  { key: '12m', label: '12 derniers mois', getStartDate: () => startOfDay(subMonths(new Date(), 12)) },
];

interface DashboardPeriodState {
  selectedPeriod: PeriodKey;
  setSelectedPeriod: (period: PeriodKey) => void;
  getStartDate: () => Date;
  getPreviousPeriodStart: () => Date;
}

export const useDashboardPeriod = create<DashboardPeriodState>((set, get) => ({
  selectedPeriod: '30d',
  setSelectedPeriod: (period) => set({ selectedPeriod: period }),
  getStartDate: () => {
    const option = periodOptions.find(p => p.key === get().selectedPeriod);
    return option?.getStartDate() || startOfDay(subDays(new Date(), 30));
  },
  getPreviousPeriodStart: () => {
    const now = new Date();
    const currentStart = get().getStartDate();
    const daysDiff = Math.floor((now.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24));
    return startOfDay(subDays(currentStart, daysDiff));
  },
}));
