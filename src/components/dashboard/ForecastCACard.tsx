import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Euro, TrendingUp, Calendar, ChevronRight } from "lucide-react";
import { startOfMonth, endOfMonth, addMonths, format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ForecastCACardProps {
  onClick?: () => void;
}

export function ForecastCACard({ onClick }: ForecastCACardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["forecast-ca"],
    queryFn: async () => {
      const now = new Date();
      const currentMonthStart = startOfMonth(now);
      const currentMonthEnd = endOfMonth(now);
      const nextMonthStart = startOfMonth(addMonths(now, 1));
      const nextMonthEnd = endOfMonth(addMonths(now, 1));

      // Get invoices for current month (emises + payees)
      const { data: currentMonthInvoices } = await supabase
        .from("factures")
        .select("montant_total, statut")
        .gte("date_emission", currentMonthStart.toISOString())
        .lte("date_emission", currentMonthEnd.toISOString())
        .in("statut", ["emise", "payee", "partiel"]);

      // Get upcoming sessions for next month with their prices
      const { data: nextMonthSessions } = await supabase
        .from("sessions")
        .select("id, prix, places_totales, session_inscriptions(id)")
        .gte("date_debut", nextMonthStart.toISOString())
        .lte("date_debut", nextMonthEnd.toISOString())
        .in("statut", ["a_venir", "complet"]);

      // Calculate current month CA
      const currentMonthCA = currentMonthInvoices?.reduce(
        (sum, inv) => sum + Number(inv.montant_total || 0), 
        0
      ) || 0;

      // Calculate forecast based on enrolled students x session price
      const forecastCA = nextMonthSessions?.reduce((sum, session) => {
        const inscriptions = (session.session_inscriptions as any[])?.length || 0;
        const price = Number(session.prix || 0);
        return sum + (inscriptions * price);
      }, 0) || 0;

      // Potential CA if sessions are full
      const potentialCA = nextMonthSessions?.reduce((sum, session) => {
        const price = Number(session.prix || 0);
        const places = session.places_totales || 0;
        return sum + (places * price);
      }, 0) || 0;

      return {
        currentMonthCA,
        forecastCA,
        potentialCA,
        nextMonth: format(nextMonthStart, "MMMM yyyy", { locale: fr }),
      };
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        onClick && "cursor-pointer hover:border-primary/50 hover:shadow-md group"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          CA Prévisionnel
          {onClick && (
            <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="h-20 flex items-center justify-center">
            <span className="text-muted-foreground">Chargement...</span>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Euro className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Ce mois</span>
                </div>
                <span className="font-semibold">
                  {formatCurrency(data?.currentMonthCA || 0)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-sm capitalize">{data?.nextMonth}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-lg text-primary">
                    {formatCurrency(data?.forecastCA || 0)}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Confirmé (inscrits)
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm text-muted-foreground">
                  Potentiel (si complet)
                </span>
                <span className="text-sm font-medium text-success">
                  {formatCurrency(data?.potentialCA || 0)}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
