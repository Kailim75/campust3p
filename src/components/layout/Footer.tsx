import { Link } from "react-router-dom";
import { FileText, Shield, Scale } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-muted/30 py-4 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} CampusT3P. Tous droits réservés.
          </p>
          <div className="flex items-center gap-6 text-sm">
            <Link
              to="/mentions-legales"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
            >
              <Scale className="h-3.5 w-3.5" />
              Mentions légales
            </Link>
            <Link
              to="/politique-confidentialite"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
            >
              <Shield className="h-3.5 w-3.5" />
              Confidentialité
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
