import { Button } from "@/components/ui/button";

interface Props {
  onDemo: () => void;
  onContact: () => void;
}

export function PresentationNav({ onDemo, onContact }: Props) {
  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[hsl(222,47%,11%)] flex items-center justify-center">
            <span className="text-white font-bold text-sm">T3</span>
          </div>
          <span className="font-semibold text-lg text-[hsl(222,47%,11%)]">
            T3P Campus
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-6 text-sm text-gray-600">
          <button onClick={onDemo} className="hover:text-gray-900 transition-colors">
            Démo
          </button>
          <a href="#features" className="hover:text-gray-900 transition-colors">
            Fonctionnalités
          </a>
          <a href="#pricing" className="hover:text-gray-900 transition-colors">
            Tarifs
          </a>
        </div>
        <Button
          onClick={onContact}
          className="bg-[hsl(173,58%,39%)] hover:bg-[hsl(173,62%,32%)] text-white text-sm h-9 px-4"
        >
          Demander une démo
        </Button>
      </div>
    </nav>
  );
}
