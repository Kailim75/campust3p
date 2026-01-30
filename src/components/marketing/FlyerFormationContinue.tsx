import { Phone, MapPin, Calendar, Star, Trophy, Award, CheckCircle2, Clock, Users, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function FlyerFormationContinue() {
  const formations = [
    {
      type: "Formation Continue VTC",
      duree: "14 heures (2 jours)",
      lieu: "Montrouge (92)",
      prix: "170€",
      color: "bg-blue-500",
    },
    {
      type: "Formation Continue Taxi",
      duree: "14 heures (2 jours)",
      lieu: "Montrouge (92)",
      prix: "250€",
      color: "bg-emerald-500",
    },
    {
      type: "Formation Continue VMDTR",
      duree: "14 heures (2 jours)",
      lieu: "Montrouge (92)",
      prix: "250€",
      color: "bg-orange-500",
    },
  ];

  const avantages = [
    { icon: Star, text: "94% de réussite", color: "text-yellow-500" },
    { icon: Calendar, text: "Sessions toute l'année", color: "text-blue-500" },
    { icon: Trophy, text: "Centre agréé T3P", color: "text-emerald-500" },
    { icon: Shield, text: "Certification Qualiopi", color: "text-purple-500" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5EBD7] to-white">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-[#1B4D3E] to-[#2D6A4F] text-white py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-1 mb-4">
            ⚠️ OBLIGATOIRE POUR LE RENOUVELLEMENT
          </Badge>
          
          <h1 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight">
            <span className="text-red-400">NE PERDEZ PAS</span>
            <br />
            <span className="text-[#D4A853]">VOTRE CARTE PROFESSIONNELLE</span>
          </h1>
          
          <p className="text-xl md:text-2xl font-medium text-white/90 mb-2">
            Formation Continue Obligatoire
          </p>
          
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <Badge variant="outline" className="border-[#D4A853] text-[#D4A853] text-lg px-4 py-1">
              TAXI
            </Badge>
            <Badge variant="outline" className="border-[#D4A853] text-[#D4A853] text-lg px-4 py-1">
              VTC
            </Badge>
            <Badge variant="outline" className="border-[#D4A853] text-[#D4A853] text-lg px-4 py-1">
              VMDTR
            </Badge>
          </div>
        </div>
      </div>

      {/* Avantages Section */}
      <div className="py-8 px-4 bg-white/80">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {avantages.map((avantage, index) => (
              <div
                key={index}
                className="flex flex-col items-center text-center p-4 rounded-xl bg-white shadow-md hover:shadow-lg transition-shadow"
              >
                <avantage.icon className={`h-10 w-10 ${avantage.color} mb-2`} />
                <span className="font-semibold text-gray-800 text-sm md:text-base">
                  {avantage.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tableau des formations */}
      <div className="py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-[#1B4D3E] mb-8">
            📚 Nos Formations Continues
          </h2>
          
          <div className="grid gap-4 md:grid-cols-3">
            {formations.map((formation, index) => (
              <Card
                key={index}
                className="overflow-hidden border-2 hover:border-[#D4A853] transition-all hover:shadow-xl"
              >
                <div className={`${formation.color} text-white py-3 px-4 text-center`}>
                  <h3 className="font-bold text-lg">{formation.type}</h3>
                </div>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-gray-500" />
                    <span className="text-gray-700">{formation.duree}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-gray-500" />
                    <span className="text-gray-700">{formation.lieu}</span>
                  </div>
                  <div className="pt-3 border-t">
                    <div className="text-center">
                      <span className="text-3xl font-extrabold text-[#1B4D3E]">
                        {formation.prix}
                      </span>
                      <span className="text-gray-500 text-sm block">TTC</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <p className="text-center text-gray-500 text-sm mt-4 italic">
            * Tarifs conformes à la réglementation en vigueur
          </p>
        </div>
      </div>

      {/* Ce que vous obtenez */}
      <div className="py-10 px-4 bg-[#1B4D3E]/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-[#1B4D3E] mb-8">
            ✅ Ce que vous obtenez
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            {[
              "Attestation de formation immédiate",
              "Validité de 5 ans pour votre carte pro",
              "Formateurs experts du secteur T3P",
              "Supports de cours inclus",
              "Petit groupe (10 personnes max)",
              "Horaires flexibles (jour ou soir)",
            ].map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 bg-white p-4 rounded-lg shadow-sm"
              >
                <CheckCircle2 className="h-6 w-6 text-emerald-500 flex-shrink-0" />
                <span className="text-gray-700 font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Témoignage */}
      <div className="py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-r from-[#D4A853]/10 to-[#D4A853]/5 border-[#D4A853]/30">
            <CardContent className="p-6 md:p-8">
              <div className="flex items-center justify-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-6 w-6 ${star <= 4 ? "fill-yellow-400 text-yellow-400" : "fill-yellow-400/80 text-yellow-400"}`}
                  />
                ))}
                <span className="ml-2 font-bold text-xl text-[#1B4D3E]">4.8/5</span>
              </div>
              <blockquote className="text-center text-gray-700 italic text-lg mb-4">
                "Formation très complète et formateurs à l'écoute. J'ai renouvelé ma carte sans problème grâce à T3P Campus !"
              </blockquote>
              <p className="text-center text-gray-500 font-medium">
                — Karim M., Chauffeur VTC depuis 2018
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <Users className="h-5 w-5 text-[#1B4D3E]" />
                <span className="text-[#1B4D3E] font-semibold">+200 avis vérifiés</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-12 px-4 bg-gradient-to-r from-[#1B4D3E] to-[#2D6A4F]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-white/10 backdrop-blur rounded-2xl p-8 border border-white/20">
            <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-4">
              🎯 INSCRIVEZ-VOUS MAINTENANT !
            </h2>
            <p className="text-white/90 text-lg mb-6">
              Réservez votre place pour la prochaine session
            </p>
            
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-6">
              <a
                href="tel:0783787663"
                className="inline-flex items-center gap-3 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xl md:text-2xl px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                <Phone className="h-7 w-7" />
                07 83 78 76 63
              </a>
            </div>
            
            <Button
              size="lg"
              className="bg-[#D4A853] hover:bg-[#c49a4a] text-[#1B4D3E] font-bold text-lg px-8 py-6 rounded-xl shadow-lg"
            >
              📅 Réservez votre place maintenant !
            </Button>
            
            {/* QR Code placeholder */}
            <div className="mt-8 flex flex-col items-center">
              <div className="bg-white p-4 rounded-xl shadow-lg">
                <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                  <div className="text-center text-gray-500 text-xs">
                    <div className="text-2xl mb-1">📱</div>
                    QR Code
                    <br />
                    Scannez-moi
                  </div>
                </div>
              </div>
              <p className="text-white/80 text-sm mt-2">
                Scannez pour accéder au site d'inscription
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="py-6 px-4 bg-[#1B4D3E] text-white/80">
        <div className="max-w-4xl mx-auto text-center space-y-2">
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-[#D4A853]" />
              <span>Centre agréé préfecture</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#D4A853]" />
              <span>Certification Qualiopi</span>
            </div>
          </div>
          <p className="text-xs text-white/60">
            ECOLE T3P - 3 rue Corneille, 92120 Montrouge
          </p>
        </div>
      </div>
    </div>
  );
}
