import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, CheckCircle2, Wifi, Bell, Zap, Car } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const features = [
    { icon: Zap, title: 'Accès rapide', description: 'Lancez l\'app en un clic depuis votre écran d\'accueil' },
    { icon: Wifi, title: 'Mode hors-ligne', description: 'Consultez vos données même sans connexion' },
    { icon: Bell, title: 'Notifications', description: 'Recevez des alertes pour vos rappels et examens' },
    { icon: Smartphone, title: 'Expérience native', description: 'Interface optimisée pour mobile et tablette' },
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary mx-auto">
            <Car className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">T3P Formation CRM</h1>
          <p className="text-muted-foreground">
            Installez l'application pour une meilleure expérience
          </p>
        </div>

        {/* Status Card */}
        {isInstalled ? (
          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="p-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Application installée !</h2>
              <p className="text-muted-foreground">
                Vous pouvez maintenant lancer T3P CRM depuis votre écran d'accueil.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Installer l'application
              </CardTitle>
              <CardDescription>
                {isIOS 
                  ? 'Pour installer sur iOS, utilisez le menu Partager de Safari'
                  : 'Ajoutez T3P CRM à votre écran d\'accueil pour un accès rapide'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isIOS ? (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-medium mb-2">Comment installer sur iPhone/iPad :</h3>
                    <ol className="space-y-2 text-sm text-muted-foreground">
                      <li>1. Appuyez sur le bouton <strong>Partager</strong> (carré avec flèche)</li>
                      <li>2. Faites défiler et appuyez sur <strong>"Sur l'écran d'accueil"</strong></li>
                      <li>3. Appuyez sur <strong>Ajouter</strong></li>
                    </ol>
                  </div>
                </div>
              ) : deferredPrompt ? (
                <Button size="lg" className="w-full" onClick={handleInstall}>
                  <Download className="h-5 w-5 mr-2" />
                  Installer maintenant
                </Button>
              ) : (
                <div className="p-4 bg-muted rounded-lg text-center text-muted-foreground">
                  <p>Votre navigateur ne supporte pas l'installation PWA ou l'application est déjà installée.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Back link */}
        <div className="text-center">
          <Button variant="link" onClick={() => window.history.back()}>
            ← Retour à l'application
          </Button>
        </div>
      </div>
    </div>
  );
}
