import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, FileText, Download, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import { useSessionInscrits } from "@/hooks/useSessionInscrits";
import { useInscritsExamResults } from "@/hooks/useInscritsExamResults";
import { useSessionQualiopi } from "@/hooks/useSessionQualiopi";
import { useSession } from "@/hooks/useSessions";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useMemo } from "react";
import jsPDF from "jspdf";

interface PackAuditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
}

export function PackAuditModal({ open, onOpenChange, sessionId }: PackAuditModalProps) {
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);
  const { inscrits } = useSessionInscrits(sessionId);
  const { data: session } = useSession(sessionId);
  const contactIds = useMemo(() => inscrits?.map(i => i.contact_id) || [], [inscrits]);
  const { data: examResults = {} } = useInscritsExamResults(contactIds);
  const { data: qualiopi } = useSessionQualiopi(sessionId);

  const handleExportCSV = () => {
    if (!inscrits?.length || !session) {
      toast.error("Aucun inscrit");
      return;
    }
    setExporting("csv");

    try {
      const headers = [
        "Prénom", "Nom", "Email", "Téléphone",
        "Statut CMA", "Théorie", "Pratique",
        "Session", "Date début", "Date fin",
      ];
      const rows = inscrits.map(i => {
        const c = i.contact;
        const exam = examResults[i.contact_id];
        return [
          c?.prenom || "",
          c?.nom || "",
          c?.email || "",
          c?.telephone || "",
          i.statut || "",
          exam?.theorie === "admis" ? "Réussi" : exam?.theorie === "ajourne" ? "Échoué" : "En attente",
          exam?.pratique === "admis" ? "Réussi" : exam?.pratique === "ajourne" ? "Échoué" : exam?.theorie === "admis" ? "En attente" : "Verrouillé",
          session.nom,
          format(new Date(session.date_debut), "dd/MM/yyyy"),
          format(new Date(session.date_fin), "dd/MM/yyyy"),
        ].join(";");
      });

      const csv = "\uFEFF" + [headers.join(";"), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Pack_Audit_${session.nom.replace(/\s/g, "_")}_${format(new Date(), "yyyyMMdd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export CSV téléchargé");
    } catch {
      toast.error("Erreur lors de l'export");
    } finally {
      setExporting(null);
    }
  };

  const handleExportPDF = () => {
    if (!session) {
      toast.error("Session non trouvée");
      return;
    }
    setExporting("pdf");

    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const margin = 15;
      let y = margin;

      // Title
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Récapitulatif Audit — Session", margin, y);
      y += 8;

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(session.nom, margin, y);
      y += 6;

      doc.setFontSize(9);
      doc.text(`${format(new Date(session.date_debut), "dd MMMM yyyy", { locale: fr })} — ${format(new Date(session.date_fin), "dd MMMM yyyy", { locale: fr })}`, margin, y);
      y += 5;
      doc.text(`${inscrits?.length || 0} inscrits • ${session.formation_type || ""}`, margin, y);
      y += 10;

      // Qualiopi score
      if (qualiopi) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`Score Qualiopi : ${qualiopi.score}% — ${qualiopi.score >= 80 ? "Audit-ready" : "À compléter"}`, margin, y);
        y += 6;

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`${qualiopi.conformeCount}/${qualiopi.totalApplicable} critères conformes`, margin, y);
        y += 8;

        // Criteria list
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Preuves :", margin, y);
        y += 5;

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        for (const c of qualiopi.criteria) {
          const icon = c.status === "conforme" ? "✓" : c.status === "partiel" ? "◐" : c.status === "non_conforme" ? "✗" : "—";
          doc.text(`${icon}  ${c.label} : ${c.detail || c.status}`, margin + 2, y);
          y += 4;
          if (y > 270) {
            doc.addPage();
            y = margin;
          }
        }
        y += 4;

        // Alertes
        if (qualiopi.alertes.length > 0) {
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text(`Alertes (${qualiopi.alertes.length}) :`, margin, y);
          y += 5;
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          for (const a of qualiopi.alertes) {
            doc.text(`⚠ ${a}`, margin + 2, y);
            y += 4;
            if (y > 270) { doc.addPage(); y = margin; }
          }
          y += 4;
        }
      }

      // Inscrits summary
      if (inscrits?.length) {
        if (y > 240) { doc.addPage(); y = margin; }
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`Stagiaires (${inscrits.length}) :`, margin, y);
        y += 5;

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        for (const i of inscrits) {
          const c = i.contact;
          const exam = examResults[i.contact_id];
          const th = exam?.theorie === "admis" ? "T:✓" : exam?.theorie === "ajourne" ? "T:✗" : "T:—";
          const pr = exam?.pratique === "admis" ? "P:✓" : exam?.pratique === "ajourne" ? "P:✗" : "P:—";
          doc.text(`${c?.prenom || ""} ${c?.nom || ""} — ${th} ${pr}`, margin + 2, y);
          y += 4;
          if (y > 270) { doc.addPage(); y = margin; }
        }
      }

      // Footer
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(`Généré le ${format(new Date(), "dd/MM/yyyy à HH:mm")}`, margin, 285);

      doc.save(`Pack_Audit_${session.nom.replace(/\s/g, "_")}_${format(new Date(), "yyyyMMdd")}.pdf`);
      toast.success("PDF téléchargé");
    } catch {
      toast.error("Erreur lors de l'export PDF");
    } finally {
      setExporting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Pack Audit — {session?.nom || "Session"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Exportez le dossier complet de la session pour un audit Qualiopi.
          </p>

          {qualiopi && (
            <div className="flex items-center gap-2 p-3 rounded-lg border bg-card">
              <Badge variant="outline" className={
                qualiopi.score >= 80
                  ? "bg-success/10 text-success border-success/20"
                  : "bg-warning/10 text-warning border-warning/20"
              }>
                {qualiopi.score}%
              </Badge>
              <span className="text-sm text-muted-foreground">
                {qualiopi.conformeCount}/{qualiopi.totalApplicable} preuves conformes
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="outline"
              className="justify-start gap-3 h-14"
              onClick={handleExportCSV}
              disabled={exporting !== null}
            >
              {exporting === "csv" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-5 w-5 text-success" />
              )}
              <div className="text-left">
                <div className="text-sm font-medium">Export CSV</div>
                <div className="text-xs text-muted-foreground">1 ligne par inscrit — identité, examens, preuves</div>
              </div>
              <Download className="h-4 w-4 ml-auto text-muted-foreground" />
            </Button>

            <Button
              variant="outline"
              className="justify-start gap-3 h-14"
              onClick={handleExportPDF}
              disabled={exporting !== null}
            >
              {exporting === "pdf" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <FileText className="h-5 w-5 text-primary" />
              )}
              <div className="text-left">
                <div className="text-sm font-medium">Récap PDF</div>
                <div className="text-xs text-muted-foreground">Résumé session + stats + preuves + alertes</div>
              </div>
              <Download className="h-4 w-4 ml-auto text-muted-foreground" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
