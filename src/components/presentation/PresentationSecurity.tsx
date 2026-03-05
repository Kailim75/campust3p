import { Shield, Lock, FileSearch, Database } from "lucide-react";

const items = [
  {
    icon: Shield,
    title: "Isolation des données (RLS)",
    desc: "Chaque centre accède uniquement à ses propres données. Aucune fuite possible entre tenants.",
  },
  {
    icon: Lock,
    title: "Contrôle d'accès par rôle",
    desc: "Admin, staff, formateur : chaque rôle a des permissions strictes. Les données sensibles sont protégées.",
  },
  {
    icon: FileSearch,
    title: "Traçabilité complète",
    desc: "Journal d'audit sur chaque action. Conformité RGPD avec export et anonymisation intégrés.",
  },
  {
    icon: Database,
    title: "Hébergement & sauvegardes",
    desc: "Infrastructure cloud européenne avec sauvegardes automatiques et chiffrement des données au repos.",
  },
];

export function PresentationSecurity() {
  return (
    <section className="py-16 sm:py-24 bg-[hsl(222,47%,11%)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Sécurité & Conformité
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Vos données sont protégées selon les standards les plus exigeants.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-white/10 bg-white/5 p-5"
            >
              <item.icon className="w-6 h-6 text-[hsl(173,58%,39%)] mb-3" />
              <h3 className="font-semibold text-white text-sm mb-1.5">{item.title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
