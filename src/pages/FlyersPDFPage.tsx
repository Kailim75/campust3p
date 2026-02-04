import { useState } from "react";
import { Download, Eye, FileText, Car, Bike } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { downloadFlyerPDF, previewFlyerPDF } from "@/lib/flyer-pdf-generator";

type FlyerType = "VTC" | "TAXI" | "VMDTR";

export default function FlyersPDFPage() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<FlyerType | null>(null);

  const flyers: { type: FlyerType; prix: string; color: string; bgColor: string; icon: React.ReactNode }[] = [
    { 
      type: "VTC", 
      prix: "170€", 
      color: "text-blue-600", 
      bgColor: "bg-blue-50 border-blue-200",
      icon: <Car className="h-8 w-8 text-blue-600" />
    },
    { 
      type: "TAXI", 
      prix: "239€", 
      color: "text-emerald-600", 
      bgColor: "bg-emerald-50 border-emerald-200",
      icon: <Car className="h-8 w-8 text-emerald-600" />
    },
    { 
      type: "VMDTR", 
      prix: "239€", 
      color: "text-orange-500", 
      bgColor: "bg-orange-50 border-orange-200",
      icon: <Bike className="h-8 w-8 text-orange-500" />
    },
  ];

  const handlePreview = (type: FlyerType) => {
    const url = previewFlyerPDF(type);
    setPreviewUrl(url);
    setPreviewType(type);
  };

  const handleDownload = (type: FlyerType) => {
    downloadFlyerPDF(type);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5EBD7] to-white py-10 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-[#1B4D3E] mb-2">
            📄 Flyers Formation Continue
          </h1>
          <p className="text-gray-600">
            Téléchargez les flyers au format PDF (A4 recto-verso)
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {flyers.map((flyer) => (
            <Card key={flyer.type} className={`border-2 ${flyer.bgColor} hover:shadow-lg transition-shadow`}>
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-2">{flyer.icon}</div>
                <CardTitle className={`text-2xl ${flyer.color}`}>
                  Formation Continue {flyer.type}
                </CardTitle>
                <Badge variant="secondary" className="mt-2 text-lg">
                  {flyer.prix} TTC
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center text-sm text-gray-600 mb-4">
                  <p>• 14 heures (2 jours)</p>
                  <p>• Format A4 recto-verso</p>
                  <p>• Prêt à imprimer</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => handlePreview(flyer.type)}
                    variant="outline"
                    className="w-full"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Aperçu
                  </Button>
                  <Button
                    onClick={() => handleDownload(flyer.type)}
                    className="w-full bg-[#1B4D3E] hover:bg-[#2D6A4F]"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Preview */}
        {previewUrl && (
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#1B4D3E]">
                <FileText className="inline h-5 w-5 mr-2" />
                Aperçu : Flyer {previewType}
              </h2>
              <Button
                variant="ghost"
                onClick={() => setPreviewUrl(null)}
              >
                Fermer
              </Button>
            </div>
            <iframe
              src={previewUrl}
              className="w-full h-[600px] border rounded-lg"
              title={`Aperçu flyer ${previewType}`}
            />
          </div>
        )}

        {/* Bouton télécharger tous */}
        <div className="text-center mt-8">
          <Button
            size="lg"
            onClick={() => {
              handleDownload("VTC");
              setTimeout(() => handleDownload("TAXI"), 500);
              setTimeout(() => handleDownload("VMDTR"), 1000);
            }}
            className="bg-[#D4A853] hover:bg-[#c49a4a] text-[#1B4D3E] font-bold"
          >
            <Download className="h-5 w-5 mr-2" />
            Télécharger les 3 flyers
          </Button>
        </div>
      </div>
    </div>
  );
}
