import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, FileText, Download, Info, Loader2 } from "lucide-react";
import { format, startOfYear, endOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useExportFEC, downloadFEC } from "@/hooks/useExportFEC";
import { useCentreFormation } from "@/hooks/useCentreFormation";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface ExportFECDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportFECDialog({ open, onOpenChange }: ExportFECDialogProps) {
  const [dateFrom, setDateFrom] = useState<Date>(startOfYear(new Date()));
  const [dateTo, setDateTo] = useState<Date>(endOfMonth(subMonths(new Date(), 1)));
  const [exportFormat, setExportFormat] = useState<"txt" | "xlsx">("txt");

  const { centreFormation } = useCentreFormation();
  const exportFEC = useExportFEC();

  const handleExport = async () => {
    const result = await exportFEC.mutateAsync({
      dateFrom,
      dateTo,
      centreInfo: centreFormation 
        ? { siret: centreFormation.siret, nom: centreFormation.nom_commercial }
        : null,
    });

    downloadFEC(result.lines, result.centreInfo, dateFrom, dateTo, exportFormat);
    onOpenChange(false);
  };

  // Presets de période
  const setPeriod = (preset: "ytd" | "lastMonth" | "lastQuarter" | "lastYear") => {
    const now = new Date();
    switch (preset) {
      case "ytd":
        setDateFrom(startOfYear(now));
        setDateTo(now);
        break;
      case "lastMonth":
        const lastMonth = subMonths(now, 1);
        setDateFrom(new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1));
        setDateTo(endOfMonth(lastMonth));
        break;
      case "lastQuarter":
        const quarter = Math.floor((now.getMonth() - 3) / 3);
        const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
        const quarterEnd = endOfMonth(new Date(now.getFullYear(), quarter * 3 + 2, 1));
        setDateFrom(quarterStart);
        setDateTo(quarterEnd);
        break;
      case "lastYear":
        setDateFrom(new Date(now.getFullYear() - 1, 0, 1));
        setDateTo(new Date(now.getFullYear() - 1, 11, 31));
        break;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Export FEC
          </DialogTitle>
          <DialogDescription>
            Générez le Fichier des Écritures Comptables au format réglementaire DGFiP
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Info alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Format officiel</AlertTitle>
            <AlertDescription>
              Le FEC suit la norme A.47 A-1 du LPF avec les 18 colonnes obligatoires.
              Compatible avec les logiciels de contrôle fiscal.
            </AlertDescription>
          </Alert>

          {/* Période presets */}
          <div className="space-y-2">
            <Label>Période rapide</Label>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-primary/10"
                onClick={() => setPeriod("ytd")}
              >
                Année en cours
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-primary/10"
                onClick={() => setPeriod("lastMonth")}
              >
                Mois dernier
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-primary/10"
                onClick={() => setPeriod("lastQuarter")}
              >
                Trimestre dernier
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-primary/10"
                onClick={() => setPeriod("lastYear")}
              >
                Année précédente
              </Badge>
            </div>
          </div>

          {/* Date pickers */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date de début</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Sélectionner"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={(date) => date && setDateFrom(date)}
                    initialFocus
                    locale={fr}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Date de fin</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "dd/MM/yyyy") : "Sélectionner"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={(date) => date && setDateTo(date)}
                    initialFocus
                    locale={fr}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Format selection */}
          <div className="space-y-3">
            <Label>Format d'export</Label>
            <RadioGroup
              value={exportFormat}
              onValueChange={(v) => setExportFormat(v as "txt" | "xlsx")}
              className="grid grid-cols-2 gap-4"
            >
              <div
                className={cn(
                  "flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors",
                  exportFormat === "txt" && "border-primary bg-primary/5"
                )}
                onClick={() => setExportFormat("txt")}
              >
                <RadioGroupItem value="txt" id="txt" />
                <div className="space-y-1">
                  <Label htmlFor="txt" className="cursor-pointer font-medium">
                    FEC (.txt)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Format officiel DGFiP
                  </p>
                </div>
              </div>
              <div
                className={cn(
                  "flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors",
                  exportFormat === "xlsx" && "border-primary bg-primary/5"
                )}
                onClick={() => setExportFormat("xlsx")}
              >
                <RadioGroupItem value="xlsx" id="xlsx" />
                <div className="space-y-1">
                  <Label htmlFor="xlsx" className="cursor-pointer font-medium">
                    Excel (.xlsx)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Pour visualisation
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* SIRET info */}
          {centreFormation?.siret && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <span className="font-medium">SIRET :</span> {centreFormation.siret}
              <br />
              <span className="font-medium">Fichier :</span>{" "}
              {centreFormation.siret.replace(/\s/g, "").substring(0, 9)}FEC
              {format(dateTo, "yyyyMMdd")}.{exportFormat}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={exportFEC.isPending}
            className="gap-2"
          >
            {exportFEC.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Exporter le FEC
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
