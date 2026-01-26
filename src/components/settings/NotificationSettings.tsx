import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, Check, X, Smartphone } from "lucide-react";
import { 
  isPushSupported, 
  requestPushPermission, 
  getPushPermission,
  isInstalledPWA,
  showPWANotification
} from "@/lib/pwa-notifications";
import { toast } from "sonner";

export function NotificationSettings() {
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    setIsSupported(isPushSupported());
    setPermission(getPushPermission());
    setIsPWA(isInstalledPWA());
  }, []);

  const handleEnableNotifications = async () => {
    const result = await requestPushPermission();
    setPermission(result);
    
    if (result === "granted") {
      toast.success("Notifications activées !");
      // Send test notification
      setTimeout(() => {
        showPWANotification("🎉 Notifications actives", {
          body: "Vous recevrez désormais des alertes importantes.",
        });
      }, 1000);
    } else if (result === "denied") {
      toast.error("Notifications refusées. Vous pouvez les activer dans les paramètres de votre navigateur.");
    }
  };

  const handleTestNotification = () => {
    if (permission === "granted") {
      showPWANotification("🔔 Test de notification", {
        body: "Ceci est un test des notifications PWA.",
        tag: "test",
      });
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Les notifications ne sont pas supportées par votre navigateur.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications Push
        </CardTitle>
        <CardDescription>
          Recevez des alertes pour les nouvelles inscriptions, rappels de session, etc.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Statut</span>
            {permission === "granted" ? (
              <Badge variant="default" className="gap-1">
                <Check className="h-3 w-3" />
                Activées
              </Badge>
            ) : permission === "denied" ? (
              <Badge variant="destructive" className="gap-1">
                <X className="h-3 w-3" />
                Bloquées
              </Badge>
            ) : (
              <Badge variant="secondary">Non configurées</Badge>
            )}
          </div>
          
          {isPWA && (
            <Badge variant="outline" className="gap-1">
              <Smartphone className="h-3 w-3" />
              App installée
            </Badge>
          )}
        </div>

        {/* Actions */}
        {permission !== "granted" && permission !== "denied" && (
          <Button onClick={handleEnableNotifications} className="w-full">
            <Bell className="h-4 w-4 mr-2" />
            Activer les notifications
          </Button>
        )}

        {permission === "granted" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Nouvelles inscriptions</span>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Rappels de session</span>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Documents prêts</span>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Alertes importantes</span>
              <Switch defaultChecked />
            </div>
            
            <Button variant="outline" onClick={handleTestNotification} size="sm" className="w-full">
              Tester les notifications
            </Button>
          </div>
        )}

        {permission === "denied" && (
          <p className="text-sm text-muted-foreground">
            Les notifications sont bloquées. Pour les activer, accédez aux paramètres de votre navigateur 
            et autorisez les notifications pour ce site.
          </p>
        )}

        {!isPWA && (
          <p className="text-xs text-muted-foreground mt-4">
            💡 Installez l'application pour une meilleure expérience de notification.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
