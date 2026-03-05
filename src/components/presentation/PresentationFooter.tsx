import { Link } from "react-router-dom";

export function PresentationFooter() {
  return (
    <footer className="border-t bg-white py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[hsl(222,47%,11%)] flex items-center justify-center">
              <span className="text-white font-bold text-[10px]">T3</span>
            </div>
            <span className="text-sm font-medium text-gray-700">T3P Campus</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link to="/mentions-legales" className="hover:text-gray-800 transition-colors">
              Mentions légales
            </Link>
            <Link to="/politique-confidentialite" className="hover:text-gray-800 transition-colors">
              Confidentialité
            </Link>
          </div>
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} T3P Campus. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
