import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle } from "lucide-react";

export function PresentationLeadForm() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    centre_name: "",
    contact_name: "",
    email: "",
    phone: "",
    volume: "",
    message: "",
  });

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.centre_name || !form.contact_name || !form.email) {
      toast({ title: "Champs requis", description: "Merci de renseigner le nom du centre, votre nom et votre email.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("leads" as any).insert({
      centre_name: form.centre_name.trim(),
      contact_name: form.contact_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      volume: form.volume.trim() || null,
      message: form.message.trim() || null,
      source: "presentation",
    });

    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: "Impossible d'envoyer votre demande. Réessayez.", variant: "destructive" });
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <section className="py-16 sm:py-24 bg-[hsl(210,40%,98%)]">
        <div className="max-w-lg mx-auto px-4 sm:px-6 text-center">
          <CheckCircle className="w-12 h-12 text-[hsl(173,58%,39%)] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[hsl(222,47%,11%)] mb-2">
            Merci pour votre intérêt !
          </h2>
          <p className="text-gray-600">
            Nous avons bien reçu votre demande et reviendrons vers vous sous 24h.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 sm:py-24 bg-[hsl(210,40%,98%)]">
      <div className="max-w-lg mx-auto px-4 sm:px-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-[hsl(222,47%,11%)] mb-3">
            Planifier une démo
          </h2>
          <p className="text-gray-600">
            Remplissez le formulaire et nous vous recontacterons pour une démo personnalisée.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-sm">
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              placeholder="Nom du centre *"
              value={form.centre_name}
              onChange={update("centre_name")}
              required
              className="h-11"
            />
            <Input
              placeholder="Votre prénom & nom *"
              value={form.contact_name}
              onChange={update("contact_name")}
              required
              className="h-11"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              type="email"
              placeholder="Email professionnel *"
              value={form.email}
              onChange={update("email")}
              required
              className="h-11"
            />
            <Input
              type="tel"
              placeholder="Téléphone"
              value={form.phone}
              onChange={update("phone")}
              className="h-11"
            />
          </div>
          <Input
            placeholder="Nombre d'apprenants par an (ex: 200)"
            value={form.volume}
            onChange={update("volume")}
            className="h-11"
          />
          <Textarea
            placeholder="Décrivez vos besoins ou questions..."
            value={form.message}
            onChange={update("message")}
            rows={3}
          />
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-[hsl(173,58%,39%)] hover:bg-[hsl(173,62%,32%)] text-white text-base"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Planifier une démo"}
          </Button>
          <p className="text-xs text-gray-400 text-center">
            Vos données sont traitées conformément au RGPD. Aucun spam.
          </p>
        </form>
      </div>
    </section>
  );
}
