import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { format, subMonths, startOfMonth, isAfter, isBefore, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TrendingUp } from 'lucide-react';
import type { QualiopiAudit } from '@/hooks/useQualiopiAudits';

interface QualiopiTrendChartProps {
  audits: QualiopiAudit[] | undefined;
  currentConformityRate: number;
}

const chartConfig = {
  score: {
    label: 'Score conformité',
    color: 'hsl(var(--primary))',
  },
};

export default function QualiopiTrendChart({ audits, currentConformityRate }: QualiopiTrendChartProps) {
  const chartData = useMemo(() => {
    const now = new Date();
    const months: { month: string; date: Date; score: number | null }[] = [];

    // Generate last 12 months
    for (let i = 11; i >= 0; i--) {
      const monthDate = startOfMonth(subMonths(now, i));
      months.push({
        month: format(monthDate, 'MMM yy', { locale: fr }),
        date: monthDate,
        score: null,
      });
    }

    // Map audits to months based on their date
    const completedAudits = (audits || [])
      .filter(a => a.statut === 'termine' || a.statut === 'certifie')
      .filter(a => a.score_global !== null)
      .sort((a, b) => new Date(a.date_audit).getTime() - new Date(b.date_audit).getTime());

    // For each month, find the most recent audit score before or during that month
    months.forEach((monthData, idx) => {
      const monthEnd = idx < months.length - 1 ? months[idx + 1].date : now;
      
      // Find audits that happened before or during this month
      const relevantAudits = completedAudits.filter(a => {
        const auditDate = parseISO(a.date_audit);
        return isBefore(auditDate, monthEnd) || auditDate.getTime() === monthEnd.getTime();
      });

      if (relevantAudits.length > 0) {
        // Use the most recent audit's score
        monthData.score = relevantAudits[relevantAudits.length - 1].score_global;
      }
    });

    // If no audits at all, show current conformity rate for recent months
    const hasAnyScore = months.some(m => m.score !== null);
    if (!hasAnyScore) {
      // Show progression towards current rate for the last 3 months
      const baseRate = Math.max(0, currentConformityRate - 15);
      months[months.length - 3].score = baseRate;
      months[months.length - 2].score = baseRate + (currentConformityRate - baseRate) * 0.5;
      months[months.length - 1].score = currentConformityRate;
    } else {
      // Fill the last month with current rate if no audit this month
      if (months[months.length - 1].score === null) {
        months[months.length - 1].score = currentConformityRate;
      }
    }

    return months.map(m => ({
      month: m.month,
      score: m.score,
    }));
  }, [audits, currentConformityRate]);

  // Calculate trend
  const trend = useMemo(() => {
    const scores = chartData.filter(d => d.score !== null).map(d => d.score as number);
    if (scores.length < 2) return null;
    
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));
    
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    return avgSecond - avgFirst;
  }, [chartData]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Évolution de la conformité
          {trend !== null && (
            <span className={`text-sm font-normal ml-auto ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? '+' : ''}{trend.toFixed(1)}% tendance
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis 
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
                className="text-muted-foreground"
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent 
                    formatter={(value) => [`${value}%`, 'Conformité']}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Basé sur les scores d'audits et le taux de conformité actuel
        </p>
      </CardContent>
    </Card>
  );
}
