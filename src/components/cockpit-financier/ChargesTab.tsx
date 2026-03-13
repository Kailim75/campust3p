import { useState, useMemo, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, ChevronDown, Pencil, Ban, AlertTriangle, Info, GraduationCap, Car, Calculator, RefreshCw, CheckCircle2 } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";
import { formatEuro, CHARGE_CATEGORIES, CHARGE_CATEGORY_ICONS } from "@/lib/formatFinancial";
import type { PeriodRange } from "@/hooks/useFinancialData";
import { useCharges, useRecurringCharges, useCreateCharge, useUpdateCharge, useCancelCharge, useBudgetPrevisionnel } from "@/hooks/useFinancialData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Props {
  range: PeriodRange;
}

const PERIODICITE_LABELS: Record<string, string> = {
  unique: "Unique",
  mensuelle: "Mensuelle",
  trimestrielle: "Trimestrielle",
  annuelle: "Annuelle",
};

// ── Calculateur coûts formateur ──
function FormateurCostCalculator({ onAddCharge }: { onAddCharge: (charge: { categorie: string; type_charge: string; libelle: string; montant: number; date_charge: string; periodicite: string; prestataire?: string; notes?: string }) => void }) {
  const now = new Date();
  const [theorie, setTheorie] = useState({
    tarif_horaire: 35,
    nb_jours: 10,
    heures_par_jour: 3.5,
    nb_sessions: 1,
    prestataire: "",
  });
  const [pratique, setPratique] = useState({
    cout_par_candidat: 95,
    nb_candidats: 1,
    prestataire: "",
  });

  const coutTheorie = theorie.tarif_horaire * theorie.nb_jours * theorie.heures_par_jour * theorie.nb_sessions;
  const coutPratique = pratique.cout_par_candidat * pratique.nb_candidats;
  const coutTotal = coutTheorie + coutPratique;

  const handleAddTheorie = () => {
    if (coutTheorie <= 0) return;
    onAddCharge({
      categorie: "formateurs_vacataires",
      type_charge: "variable",
      libelle: `Formateur théorie — ${theorie.nb_sessions} session${theorie.nb_sessions > 1 ? "s" : ""} (${theorie.nb_jours}j × ${theorie.heures_par_jour}h × ${formatEuro(theorie.tarif_horaire)}/h)`,
      montant: coutTheorie,
      date_charge: format(now, "yyyy-MM-dd"),
      periodicite: "unique",
      prestataire: theorie.prestataire || undefined,
    });
  };

  const handleAddPratique = () => {
    if (coutPratique <= 0) return;
    onAddCharge({
      categorie: "formateurs_vacataires",
      type_charge: "variable",
      libelle: `Formateur pratique — ${pratique.nb_candidats} candidat${pratique.nb_candidats > 1 ? "s" : ""} (${formatEuro(pratique.cout_par_candidat)}/candidat, incl. 2h conduite + véhicule examen)`,
      montant: coutPratique,
      date_charge: format(now, "yyyy-MM-dd"),
      periodicite: "unique",
      prestataire: pratique.prestataire || undefined,
    });
  };

  const handleAddBoth = () => {
    if (coutTheorie > 0) handleAddTheorie();
    if (coutPratique > 0) handleAddPratique();
  };

  return (
    <Card className="p-5 border-dashed border-2 border-primary/20 bg-primary/[0.02]">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Calculateur coûts formateur</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Théorie */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Formation théorique</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Tarif horaire (€)</label>
              <Input type="number" step="0.5" min="0" value={theorie.tarif_horaire} onChange={e => setTheorie(t => ({ ...t, tarif_horaire: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Nb de jours</label>
              <Input type="number" min="1" value={theorie.nb_jours} onChange={e => setTheorie(t => ({ ...t, nb_jours: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Heures / jour</label>
              <Input type="number" step="0.5" min="0.5" value={theorie.heures_par_jour} onChange={e => setTheorie(t => ({ ...t, heures_par_jour: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Nb sessions</label>
              <Input type="number" min="1" value={theorie.nb_sessions} onChange={e => setTheorie(t => ({ ...t, nb_sessions: parseInt(e.target.value) || 1 }))} />
            </div>
          </div>
          <Input placeholder="Nom du formateur (optionnel)" value={theorie.prestataire} onChange={e => setTheorie(t => ({ ...t, prestataire: e.target.value }))} className="text-sm" />
          <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
            <div className="text-xs text-muted-foreground">
              {theorie.nb_jours}j × {theorie.heures_par_jour}h × {formatEuro(theorie.tarif_horaire)}/h × {theorie.nb_sessions} session{theorie.nb_sessions > 1 ? "s" : ""}
            </div>
            <span className="font-bold text-sm">{formatEuro(coutTheorie)}</span>
          </div>
          <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleAddTheorie} disabled={coutTheorie <= 0}>
            <Plus className="h-3.5 w-3.5" /> Ajouter théorie
          </Button>
        </div>

        {/* Pratique */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Car className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium">Formation pratique</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Coût / candidat (€)</label>
              <Input type="number" step="1" min="0" value={pratique.cout_par_candidat} onChange={e => setPratique(p => ({ ...p, cout_par_candidat: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Nb candidats</label>
              <Input type="number" min="1" value={pratique.nb_candidats} onChange={e => setPratique(p => ({ ...p, nb_candidats: parseInt(e.target.value) || 1 }))} />
            </div>
          </div>
          <Input placeholder="Nom du formateur (optionnel)" value={pratique.prestataire} onChange={e => setPratique(p => ({ ...p, prestataire: e.target.value }))} className="text-sm" />
          <div className="bg-muted/50 p-3 rounded-lg space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{pratique.nb_candidats} candidat{pratique.nb_candidats > 1 ? "s" : ""} × {formatEuro(pratique.cout_par_candidat)}</span>
              <span className="font-bold text-sm">{formatEuro(coutPratique)}</span>
            </div>
            <p className="text-xs text-muted-foreground italic">Inclut 2h de conduite + mise à disposition véhicule le jour de l'examen</p>
          </div>
          <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleAddPratique} disabled={coutPratique <= 0}>
            <Plus className="h-3.5 w-3.5" /> Ajouter pratique
          </Button>
        </div>
      </div>

      {/* Total & add both */}
      <div className="mt-4 flex items-center justify-between p-3 rounded-lg bg-primary/10">
        <span className="text-sm font-semibold">Coût formateur total</span>
        <span className="text-lg font-bold text-primary">{formatEuro(coutTotal)}</span>
      </div>
      <Button className="w-full mt-3 gap-2" onClick={handleAddBoth} disabled={coutTotal <= 0}>
        <Plus className="h-4 w-4" /> Ajouter théorie + pratique en charges
      </Button>
    </Card>
  );
}

// ── Main ──
export function ChargesTab({ range }: Props) {
  const { data: charges = [], isLoading } = useCharges(range);
  const { data: recurring = [] } = useRecurringCharges();
  const createCharge = useCreateCharge();
  const cancelCharge = useCancelCharge();

  const updateCharge = useUpdateCharge();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const { data: budget = [] } = useBudgetPrevisionnel(currentYear);

  // Form state
  const [form, setForm] = useState({
    categorie: "",
    type_charge: "fixe",
    libelle: "",
    montant: "",
    date_charge: format(now, "yyyy-MM-dd"),
    periodicite: "unique",
    prestataire: "",
  });
  const [cancelId, setCancelId] = useState<string | null>(null);

  // Edit state
  const [editCharge, setEditCharge] = useState<null | {
    id: string;
    categorie: string;
    type_charge: string;
    libelle: string;
    montant: string;
    date_charge: string;
    periodicite: string;
    prestataire: string;
  }>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const montant = parseFloat(form.montant);
    if (!form.categorie || !form.libelle || !montant || montant <= 0 || !form.date_charge) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    try {
      await createCharge.mutateAsync({
        categorie: form.categorie,
        type_charge: form.type_charge,
        libelle: form.libelle,
        montant,
        date_charge: form.date_charge,
        periodicite: form.periodicite,
        prestataire: form.prestataire || undefined,
      });
      toast.success("Charge ajoutée");
      setForm({ categorie: "", type_charge: "fixe", libelle: "", montant: "", date_charge: format(now, "yyyy-MM-dd"), periodicite: "unique", prestataire: "" });
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    }
  };

  const handleAddCalculatedCharge = async (charge: { categorie: string; type_charge: string; libelle: string; montant: number; date_charge: string; periodicite: string; prestataire?: string }) => {
    try {
      await createCharge.mutateAsync(charge);
      toast.success("Charge formateur ajoutée");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    }
  };

  const handleCancel = async () => {
    if (!cancelId) return;
    try {
      await cancelCharge.mutateAsync(cancelId);
      toast.success("Charge annulée");
    } catch (err: any) {
      toast.error(err.message);
    }
    setCancelId(null);
  };

  const handleEdit = async () => {
    if (!editCharge) return;
    const montant = parseFloat(editCharge.montant);
    if (!editCharge.categorie || !editCharge.libelle || !montant || montant <= 0) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    try {
      await updateCharge.mutateAsync({
        id: editCharge.id,
        categorie: editCharge.categorie,
        type_charge: editCharge.type_charge,
        libelle: editCharge.libelle,
        montant,
        date_charge: editCharge.date_charge,
        periodicite: editCharge.periodicite,
        prestataire: editCharge.prestataire || null,
      });
      toast.success("Charge modifiée");
      setEditCharge(null);
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    }
  };

  // Group charges by category
  const grouped = useMemo(() => {
    const map: Record<string, typeof charges> = {};
    charges.forEach(c => {
      if (!map[c.categorie]) map[c.categorie] = [];
      map[c.categorie].push(c);
    });
    return Object.entries(map).sort((a, b) => {
      const sumA = a[1].filter(c => c.statut === "active").reduce((s, c) => s + Number(c.montant), 0);
      const sumB = b[1].filter(c => c.statut === "active").reduce((s, c) => s + Number(c.montant), 0);
      return sumB - sumA;
    });
  }, [charges]);

  const totalActive = charges.filter(c => c.statut === "active").reduce((s, c) => s + Number(c.montant), 0);

  // Check recurring charges not entered this month
  const missingRecurring = useMemo(() => {
    const mStart = format(startOfMonth(now), "yyyy-MM-dd");
    const mEnd = format(endOfMonth(now), "yyyy-MM-dd");
    const currentMonthCharges = charges.filter(c =>
      c.date_charge >= mStart && c.date_charge <= mEnd && c.statut === "active"
    );
    return recurring.filter(r =>
      !currentMonthCharges.some(c => c.libelle === r.libelle)
    );
  }, [charges, recurring, now]);

  // Budget lookup
  const budgetByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    budget.filter(b => b.mois === currentMonth && b.type === "charge").forEach(b => {
      map[b.categorie] = Number(b.montant_prevu);
    });
    return map;
  }, [budget, currentMonth]);

  if (isLoading) {
    return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-6">
      {/* CALCULATEUR FORMATEUR */}
      <FormateurCostCalculator onAddCharge={handleAddCalculatedCharge} />

      {/* SECTION A — Form */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Saisir une charge</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select value={form.categorie} onValueChange={v => setForm(f => ({ ...f, categorie: v }))}>
              <SelectTrigger><SelectValue placeholder="Catégorie *" /></SelectTrigger>
              <SelectContent>
                {Object.entries(CHARGE_CATEGORIES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{CHARGE_CATEGORY_ICONS[k]} {v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={form.type_charge} onValueChange={v => setForm(f => ({ ...f, type_charge: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fixe">Fixe</SelectItem>
                <SelectItem value="variable">Variable</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Libellé *" value={form.libelle} onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Input type="number" step="0.01" min="0.01" placeholder="Montant € *" value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} />
            <Input type="date" value={form.date_charge} onChange={e => setForm(f => ({ ...f, date_charge: e.target.value }))} />
            <Select value={form.periodicite} onValueChange={v => setForm(f => ({ ...f, periodicite: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PERIODICITE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Prestataire" value={form.prestataire} onChange={e => setForm(f => ({ ...f, prestataire: e.target.value }))} />
          </div>
          {form.periodicite !== "unique" && (
            <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs text-amber-700 dark:text-amber-400">
                Cette charge sera automatiquement proposée les prochains mois. Vous devrez confirmer chaque mois.
              </AlertDescription>
            </Alert>
          )}
          <Button type="submit" disabled={createCharge.isPending} className="gap-2">
            <Plus className="h-4 w-4" /> Ajouter la charge
          </Button>
        </form>
      </Card>

      {/* SECTION B — Charges grouped */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Charges de la période</h3>
        {grouped.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Aucune charge sur cette période</p>
        ) : (
          <div className="space-y-2">
            {grouped.map(([cat, items]) => {
              const subtotal = items.filter(c => c.statut === "active").reduce((s, c) => s + Number(c.montant), 0);
              const budgetPrevu = budgetByCategory[cat];

              return (
                <Collapsible key={cat} defaultOpen>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                    <span className="text-sm font-medium">{CHARGE_CATEGORY_ICONS[cat]} {CHARGE_CATEGORIES[cat] || cat}</span>
                    <span className="ml-auto text-sm font-semibold">{formatEuro(subtotal)}</span>
                    {budgetPrevu !== undefined && (
                      <Badge variant={subtotal > budgetPrevu ? "destructive" : subtotal > budgetPrevu * 0.8 ? "secondary" : "outline"} className="text-xs ml-2">
                        {formatEuro(subtotal)} / {formatEuro(budgetPrevu)}
                      </Badge>
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Table>
                      <TableBody>
                        {items.map(c => (
                          <TableRow key={c.id} className={c.statut === "annulee" ? "opacity-50" : ""}>
                            <TableCell className="text-sm">{c.libelle}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{c.prestataire || "—"}</TableCell>
                            <TableCell className="text-sm">{format(new Date(c.date_charge), "dd/MM/yyyy")}</TableCell>
                            <TableCell>
                              <Badge variant={c.type_charge === "fixe" ? "default" : "secondary"} className="text-xs">
                                {c.type_charge === "fixe" ? "Fixe" : "Variable"}
                              </Badge>
                            </TableCell>
                            <TableCell className={`text-right font-medium text-sm ${c.statut === "annulee" ? "line-through" : ""}`}>
                              {formatEuro(Number(c.montant))}
                            </TableCell>
                            <TableCell>
                              {c.statut === "annulee" ? (
                                <Badge variant="outline" className="text-xs text-muted-foreground">Annulée</Badge>
                              ) : (
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditCharge({
                                    id: c.id,
                                    categorie: c.categorie,
                                    type_charge: c.type_charge,
                                    libelle: c.libelle,
                                    montant: String(c.montant),
                                    date_charge: c.date_charge,
                                    periodicite: c.periodicite,
                                    prestataire: c.prestataire || "",
                                  })}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCancelId(c.id)}>
                                    <Ban className="h-3.5 w-3.5 text-destructive" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
        {charges.length > 0 && (
          <div className={`mt-4 p-3 rounded-lg font-bold text-sm flex justify-between ${totalActive > 0 ? "bg-red-50 dark:bg-red-950/30 text-destructive" : "bg-muted"}`}>
            <span>TOTAL</span>
            <span>{formatEuro(totalActive)}</span>
          </div>
        )}
      </Card>

      {/* SECTION C — Recurring */}
      {recurring.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Charges récurrentes actives</h3>
          <div className="space-y-2">
            {recurring.map(r => {
              const missing = missingRecurring.some(m => m.id === r.id);
              return (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <span className="text-sm font-medium flex-1">{r.libelle}</span>
                  <span className="text-sm font-semibold">{formatEuro(Number(r.montant))}</span>
                  <Badge variant="outline" className="text-xs">{PERIODICITE_LABELS[r.periodicite]}</Badge>
                  {missing && (
                    <Badge variant="destructive" className="text-xs gap-1">
                      <AlertTriangle className="h-3 w-3" /> Non saisie ce mois
                    </Badge>
                  )}
                  {missing && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setForm({
                        categorie: r.categorie,
                        type_charge: r.type_charge,
                        libelle: r.libelle,
                        montant: String(r.montant),
                        date_charge: format(now, "yyyy-MM-dd"),
                        periodicite: "unique",
                        prestataire: r.prestataire || "",
                      })}
                    >
                      Saisir
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editCharge} onOpenChange={(open) => !open && setEditCharge(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier la charge</DialogTitle>
          </DialogHeader>
          {editCharge && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Catégorie</Label>
                  <Select value={editCharge.categorie} onValueChange={v => setEditCharge(e => e ? { ...e, categorie: v } : null)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CHARGE_CATEGORIES).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{CHARGE_CATEGORY_ICONS[k]} {v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={editCharge.type_charge} onValueChange={v => setEditCharge(e => e ? { ...e, type_charge: v } : null)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixe">Fixe</SelectItem>
                      <SelectItem value="variable">Variable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Libellé</Label>
                <Input value={editCharge.libelle} onChange={e => setEditCharge(ec => ec ? { ...ec, libelle: e.target.value } : null)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Montant (€)</Label>
                  <Input type="number" step="0.01" min="0.01" value={editCharge.montant} onChange={e => setEditCharge(ec => ec ? { ...ec, montant: e.target.value } : null)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" value={editCharge.date_charge} onChange={e => setEditCharge(ec => ec ? { ...ec, date_charge: e.target.value } : null)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Périodicité</Label>
                  <Select value={editCharge.periodicite} onValueChange={v => setEditCharge(e => e ? { ...e, periodicite: v } : null)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PERIODICITE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Prestataire</Label>
                  <Input value={editCharge.prestataire} onChange={e => setEditCharge(ec => ec ? { ...ec, prestataire: e.target.value } : null)} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCharge(null)}>Annuler</Button>
            <Button onClick={handleEdit} disabled={updateCharge.isPending}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <AlertDialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler cette charge ?</AlertDialogTitle>
            <AlertDialogDescription>
              La charge sera marquée comme annulée mais restera visible pour la traçabilité comptable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Non</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground">
              Confirmer l'annulation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
