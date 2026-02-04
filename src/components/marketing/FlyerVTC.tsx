import { Phone, MapPin, Calendar, Star, Trophy, Award, CheckCircle2, Clock, Users, Shield, Car, CreditCard, BookOpen, HeadphonesIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function FlyerVTC() {
  const modules = [
    { titre: "Réglementation T3P", heures: "4h" },
    { titre: "Sécurité routière", heures: "4h" },
    { titre: "Gestion d'entreprise", heures: "3h" },
    { titre: "Relation client", heures: "3h" },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* ========== RECTO (Page 1) ========== */}
      <div className="min-h-screen bg-gradient-to-b from-[#F5EBD7] to-white print:break-after-page">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-8 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-1 mb-4">
              ⚠️ OBLIGATOIRE POUR LE RENOUVELLEMENT
            </Badge>
            
            <div className="flex items-center justify-center gap-3 mb-4">
              <Car className="h-12 w-12 text-white" />
              <h1 className="text-4xl md:text-6xl font-extrabold">
                VTC
              </h1>
            </div>
            
            <h2 className="text-2xl md:text-3xl font-bold text-blue-100 mb-2">
              Formation Continue
            </h2>
            
            <p className="text-xl text-white/90">
              Renouvelez votre carte professionnelle
            </p>
          </div>
        </div>

        {/* Prix Hero */}
        <div className="py-8 px-4 bg-white">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl px-10 py-6 shadow-xl">
              <div className="text-5xl md:text-7xl font-extrabold">170€</div>
              <div className="text-xl text-blue-100">TTC - Tout compris</div>
            </div>
          </div>
        </div>

        {/* Avantages clés */}
        <div className="py-8 px-4 bg-[#F5EBD7]/50">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Clock, text: "14 heures", subtext: "2 jours" },
                { icon: Star, text: "94% réussite", subtext: "Taux de satisfaction" },
                { icon: Users, text: "10 max", subtext: "Petit groupe" },
                { icon: Shield, text: "Qualiopi", subtext: "Certifié" },
              ].map((item, index) => (
                <div key={index} className="flex flex-col items-center text-center p-4 bg-white rounded-xl shadow-md">
                  <item.icon className="h-10 w-10 text-blue-600 mb-2" />
                  <span className="font-bold text-gray-800">{item.text}</span>
                  <span className="text-sm text-gray-500">{item.subtext}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Ce que vous obtenez */}
        <div className="py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-center text-[#1B4D3E] mb-6">
              ✅ Ce que vous obtenez
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                "Attestation de formation immédiate",
                "Validité 5 ans pour votre carte pro",
                "Formateurs experts du secteur VTC",
                "Supports de cours inclus",
                "Petit groupe (10 personnes max)",
                "Café et collations offerts",
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3 bg-blue-50 p-4 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-blue-600 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-10 px-4 bg-gradient-to-r from-blue-600 to-blue-800">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4">
              🎯 INSCRIVEZ-VOUS MAINTENANT !
            </h2>
            <a
              href="tel:0783787663"
              className="inline-flex items-center gap-3 bg-[#D4A853] hover:bg-[#c49a4a] text-[#1B4D3E] font-bold text-2xl px-10 py-5 rounded-xl shadow-lg transition-all"
            >
              <Phone className="h-8 w-8" />
              07 83 78 76 63
            </a>
            <p className="text-white/80 mt-4">
              📍 3 rue Corneille, 92120 Montrouge
            </p>
          </div>
        </div>
      </div>

      {/* ========== VERSO (Page 2) ========== */}
      <div className="min-h-screen bg-gradient-to-b from-white to-[#F5EBD7] print:break-before-page">
        {/* Header Verso */}
        <div className="bg-blue-600 text-white py-6 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold">
              Programme de Formation VTC - 14 heures
            </h2>
          </div>
        </div>

        {/* Modules */}
        <div className="py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-4">
              {modules.map((module, index) => (
                <Card key={index} className="border-l-4 border-l-blue-600">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <BookOpen className="h-6 w-6 text-blue-600" />
                        <span className="font-semibold text-gray-800">{module.titre}</span>
                      </div>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                        {module.heures}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Objectifs */}
        <div className="py-8 px-4 bg-blue-50">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-xl font-bold text-[#1B4D3E] mb-4">🎯 Objectifs de la formation</h3>
            <ul className="space-y-2">
              {[
                "Maîtriser les évolutions réglementaires du secteur VTC",
                "Renforcer les compétences en sécurité routière",
                "Optimiser la gestion de votre activité",
                "Améliorer la qualité de service client",
              ].map((obj, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{obj}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Informations pratiques */}
        <div className="py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-xl font-bold text-[#1B4D3E] mb-4">📋 Informations pratiques</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border">
                <Clock className="h-8 w-8 text-blue-600 mb-2" />
                <h4 className="font-semibold">Horaires</h4>
                <p className="text-gray-600 text-sm">9h00 - 17h00<br />Pause déjeuner incluse</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border">
                <MapPin className="h-8 w-8 text-blue-600 mb-2" />
                <h4 className="font-semibold">Lieu</h4>
                <p className="text-gray-600 text-sm">3 rue Corneille<br />92120 Montrouge</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border">
                <CreditCard className="h-8 w-8 text-blue-600 mb-2" />
                <h4 className="font-semibold">Paiement</h4>
                <p className="text-gray-600 text-sm">CB, espèces<br />Facilités de paiement</p>
              </div>
            </div>
          </div>
        </div>

        {/* Témoignage */}
        <div className="py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <blockquote className="text-center text-gray-700 italic mb-3">
                  "Formation très complète et formateurs à l'écoute. J'ai renouvelé ma carte VTC sans problème !"
                </blockquote>
                <p className="text-center text-gray-500 font-medium">
                  — Karim M., Chauffeur VTC depuis 2018
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="py-6 px-4 bg-[#1B4D3E] text-white">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex flex-wrap items-center justify-center gap-6 mb-3">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-[#D4A853]" />
                <span>Centre agréé préfecture</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#D4A853]" />
                <span>Certification Qualiopi</span>
              </div>
            </div>
            <p className="text-xs text-white/70">
              ECOLE T3P - SIRET: XXX XXX XXX XXXXX - NDA: XXXXXXXXXXX
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
