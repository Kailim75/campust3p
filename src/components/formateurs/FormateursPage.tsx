import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Users, 
  Calendar, 
  Euro, 
  TrendingUp,
  BarChart3,
  CalendarDays,
  CheckCircle,
  Clock,
  ArrowUpRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useFormateursStats, useFormateursDisponibilite } from "@/hooks/useFormateurs";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from "recharts";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--info))",
  "hsl(var(--destructive))",
];

export function FormateursPage() {
  const [selectedFormateur, setSelectedFormateur] = useState<string>("all");
  const { data: formateursStats, isLoading } = useFormateursStats();
  const { data: disponibilites } = useFormateursDisponibilite();

  const filteredStats = selectedFormateur === "all" 
    ? formateursStats 
    : formateursStats?.filter((f) => f.formateur === selectedFormateur);

  const totalSessions = formateursStats?.reduce((acc, f) => acc + f.sessionsTotal, 0) || 0;
  const totalStagiaires = formateursStats?.reduce((acc, f) => acc + f.stagiairesFormes, 0) || 0;
  const totalCA = formateursStats?.reduce((acc, f) => acc + f.caGenere, 0) || 0;
  const avgRemplissage = formateursStats?.length 
    ? Math.round(formateursStats.reduce((acc, f) => acc + f.tauxRemplissage, 0) / formateursStats.length)
    : 0;

  // Chart data
  const sessionsChartData = formateursStats?.slice(0, 6).map((f, i) => ({
    name: f.formateur.length > 10 ? f.formateur.slice(0, 10) + "…" : f.formateur,
    fullName: f.formateur,
    sessions: f.sessionsTotal,
    stagiaires: f.stagiairesFormes,
    color: COLORS[i % COLORS.length],
  })) || [];

  const caChartData = formateursStats?.slice(0, 6).map((f, i) => ({
    name: f.formateur,
    value: f.caGenere,
    color: COLORS[i % COLORS.length],
  })) || [];

  // Disponibilité filtered
  const filteredDisponibilite = selectedFormateur === "all"
    ? disponibilites
    : disponibilites?.filter((d) => d.formateur === selectedFormateur);

  // Group disponibilite by month
  const disponibiliteByMonth: Record<string, typeof filteredDisponibilite> = {};
  filteredDisponibilite?.forEach((d) => {
    if (!disponibiliteByMonth[d.mois]) disponibiliteByMonth[d.mois] = [];
    disponibiliteByMonth[d.mois]!.push(d);
  });

  return (
    <div className="min-h-screen">
      <Header 
        title="Statistiques Formateurs" 
        subtitle="Performances et disponibilités"
      />

      <main className="p-6 space-y-6 animate-fade-in">
        {/* Global Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="card-elevated">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Formateurs actifs</p>
                  <p className="text-2xl font-display font-bold">
                    {isLoading ? "..." : formateursStats?.length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-info/10">
                  <Calendar className="h-6 w-6 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sessions totales</p>
                  <p className="text-2xl font-display font-bold">
                    {isLoading ? "..." : totalSessions}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-success/10">
                  <Users className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Stagiaires formés</p>
                  <p className="text-2xl font-display font-bold">
                    {isLoading ? "..." : totalStagiaires}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-warning/10">
                  <Euro className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CA généré</p>
                  <p className="text-2xl font-display font-bold">
                    {isLoading ? "..." : `${(totalCA / 1000).toFixed(1)}k€`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-4">
          <Select value={selectedFormateur} onValueChange={setSelectedFormateur}>
            <SelectTrigger className="w-64">
              <User className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrer par formateur" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les formateurs</SelectItem>
              {formateursStats?.map((f) => (
                <SelectItem key={f.formateur} value={f.formateur}>
                  {f.formateur}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="performances" className="space-y-6">
          <TabsList>
            <TabsTrigger value="performances" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Performances
            </TabsTrigger>
            <TabsTrigger value="disponibilites" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Disponibilités
            </TabsTrigger>
          </TabsList>

          {/* Performances Tab */}
          <TabsContent value="performances" className="space-y-6">
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sessions per formateur */}
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Sessions par formateur
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-48 w-full" />
                  ) : sessionsChartData.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-muted-foreground">
                      Aucune donnée
                    </div>
                  ) : (
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sessionsChartData} layout="vertical">
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis 
                            type="category" 
                            dataKey="name" 
                            tick={{ fontSize: 11 }} 
                            width={80}
                          />
                          <Tooltip 
                            formatter={(value: number, name: string) => [value, name === "sessions" ? "Sessions" : "Stagiaires"]}
                            labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ""}
                          />
                          <Bar dataKey="sessions" radius={[0, 4, 4, 0]}>
                            {sessionsChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* CA par formateur */}
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Euro className="h-5 w-5 text-primary" />
                    CA par formateur
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-48 w-full" />
                  ) : caChartData.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-muted-foreground">
                      Aucune donnée
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={caChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => 
                              `${name.slice(0, 8)}${name.length > 8 ? "…" : ""} ${(percent * 100).toFixed(0)}%`
                            }
                            labelLine={false}
                          >
                            {caChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => [`${value.toLocaleString("fr-FR")}€`, "CA"]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Stats Table */}
            <Card className="card-elevated overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base font-medium">Détail par formateur</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Formateur</TableHead>
                        <TableHead className="font-semibold text-center">Sessions</TableHead>
                        <TableHead className="font-semibold text-center">Stagiaires</TableHead>
                        <TableHead className="font-semibold text-center">Taux remplissage</TableHead>
                        <TableHead className="font-semibold text-right">CA généré</TableHead>
                        <TableHead className="font-semibold">Prochaines sessions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStats?.map((stats) => (
                        <TableRow key={stats.formateur} className="table-row-hover">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{stats.formateur}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  {stats.sessionsEnCours > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3 text-warning" />
                                      {stats.sessionsEnCours} en cours
                                    </span>
                                  )}
                                  {stats.sessionsAVenir > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3 text-info" />
                                      {stats.sessionsAVenir} à venir
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{stats.sessionsTotal}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-success/10 text-success">
                              {stats.stagiairesFormes}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center gap-2 justify-center">
                              <Progress 
                                value={stats.tauxRemplissage} 
                                className="w-16 h-2"
                              />
                              <span className="text-sm text-muted-foreground">
                                {stats.tauxRemplissage}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {stats.caGenere.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
                          </TableCell>
                          <TableCell>
                            {stats.prochaineSessions.length === 0 ? (
                              <span className="text-muted-foreground text-sm">Aucune</span>
                            ) : (
                              <div className="space-y-1">
                                {stats.prochaineSessions.map((session) => (
                                  <div key={session.id} className="text-xs flex items-center gap-1">
                                    <ArrowUpRight className="h-3 w-3 text-info" />
                                    <span className="truncate max-w-[120px]">{session.nom}</span>
                                    <span className="text-muted-foreground">
                                      ({format(parseISO(session.date_debut), "dd/MM")})
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Disponibilités Tab */}
          <TabsContent value="disponibilites" className="space-y-6">
            {Object.entries(disponibiliteByMonth).map(([mois, dispos]) => (
              <Card key={mois} className="card-elevated">
                <CardHeader>
                  <CardTitle className="text-base font-medium">
                    {format(parseISO(mois + "-01"), "MMMM yyyy", { locale: fr })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dispos?.map((dispo) => {
                      const tauxOccupation = Math.round((dispo.joursOccupes / dispo.joursTotaux) * 100);
                      const isOccupe = tauxOccupation > 70;
                      const isLibre = tauxOccupation < 30;

                      return (
                        <Card 
                          key={`${dispo.formateur}-${dispo.mois}`} 
                          className={cn(
                            "border-l-4",
                            isOccupe && "border-l-destructive",
                            isLibre && "border-l-success",
                            !isOccupe && !isLibre && "border-l-warning"
                          )}
                        >
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                  <User className="h-4 w-4" />
                                </div>
                                <span className="font-medium">{dispo.formateur}</span>
                              </div>
                              <Badge 
                                variant="secondary"
                                className={cn(
                                  isOccupe && "bg-destructive/10 text-destructive",
                                  isLibre && "bg-success/10 text-success",
                                  !isOccupe && !isLibre && "bg-warning/10 text-warning"
                                )}
                              >
                                {isLibre ? "Disponible" : isOccupe ? "Occupé" : "Partiel"}
                              </Badge>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Occupation</span>
                                <span className="font-medium">{dispo.joursOccupes}/{dispo.joursTotaux} jours</span>
                              </div>
                              <Progress 
                                value={tauxOccupation} 
                                className={cn(
                                  "h-2",
                                  isOccupe && "[&>div]:bg-destructive",
                                  isLibre && "[&>div]:bg-success",
                                  !isOccupe && !isLibre && "[&>div]:bg-warning"
                                )}
                              />
                            </div>

                            {dispo.sessions.length > 0 && (
                              <div className="mt-3 pt-3 border-t">
                                <p className="text-xs text-muted-foreground mb-2">Sessions prévues:</p>
                                <div className="space-y-1">
                                  {dispo.sessions.slice(0, 2).map((s) => (
                                    <div key={s.id} className="text-xs flex items-center gap-1">
                                      <Calendar className="h-3 w-3 text-muted-foreground" />
                                      <span className="truncate">{s.nom}</span>
                                    </div>
                                  ))}
                                  {dispo.sessions.length > 2 && (
                                    <span className="text-xs text-muted-foreground">
                                      +{dispo.sessions.length - 2} autres
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}

            {Object.keys(disponibiliteByMonth).length === 0 && (
              <Card className="card-elevated">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Aucune session planifiée pour les prochains mois</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
