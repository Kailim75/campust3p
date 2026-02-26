/**
 * Template HTML professionnel pour tous les emails du CRM
 * Garantit une présentation soignée et cohérente de la marque Ecole T3P
 */

export interface EmailTemplateOptions {
  /** Titre principal affiché en haut de l'email (ex: "📄 Convocation") */
  title: string;
  /** Emoji/icône du titre (optionnel, déjà intégré dans title si souhaité) */
  /** Couleur d'accent pour le bandeau supérieur (hex, default: #1B4D3E vert forêt) */
  accentColor?: string;
  /** Contenu HTML principal du corps de l'email */
  bodyHtml: string;
  /** Nom du destinataire pour la salutation (ex: "Jean Dupont") */
  recipientName?: string;
  /** Afficher la salutation "Bonjour ..." (default true) */
  showGreeting?: boolean;
  /** Informations de session à afficher dans un encart dédié */
  sessionInfo?: {
    nom?: string;
    formationType?: string;
    dateDebut?: string;
    dateFin?: string;
    lieu?: string;
    heureDebut?: string;
  };
  /** Liste de pièces jointes à mentionner dans l'email */
  attachmentNames?: string[];
  /** Texte de pied de page personnalisé (remplace le footer par défaut) */
  customFooter?: string;
}

/**
 * Génère un email HTML complet avec mise en page professionnelle
 */
export function buildEmailHtml(options: EmailTemplateOptions): string {
  const {
    title,
    accentColor = "#1B4D3E",
    bodyHtml,
    recipientName,
    showGreeting = true,
    sessionInfo,
    attachmentNames,
    customFooter,
  } = options;

  const greeting = showGreeting && recipientName
    ? `<p style="font-size: 15px; color: #333; margin: 0 0 16px 0;">Bonjour <strong>${recipientName}</strong>,</p>`
    : showGreeting
    ? `<p style="font-size: 15px; color: #333; margin: 0 0 16px 0;">Bonjour,</p>`
    : "";

  const sessionBlock = sessionInfo
    ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
      <tr>
        <td style="background-color: #f8faf9; border-left: 4px solid ${accentColor}; border-radius: 6px; padding: 18px 20px;">
          ${sessionInfo.nom ? `<p style="margin: 0 0 6px 0; font-size: 16px; font-weight: 700; color: ${accentColor};">${sessionInfo.nom}</p>` : ""}
          ${sessionInfo.formationType ? `<p style="margin: 0 0 4px 0; font-size: 13px; color: #555;"><strong>Formation :</strong> ${sessionInfo.formationType}</p>` : ""}
          ${sessionInfo.dateDebut ? `<p style="margin: 0 0 4px 0; font-size: 13px; color: #555;"><strong>📅 Du :</strong> ${sessionInfo.dateDebut}${sessionInfo.dateFin ? ` au ${sessionInfo.dateFin}` : ""}</p>` : ""}
          ${sessionInfo.lieu ? `<p style="margin: 0 0 4px 0; font-size: 13px; color: #555;"><strong>📍 Lieu :</strong> ${sessionInfo.lieu}</p>` : ""}
          ${sessionInfo.heureDebut ? `<p style="margin: 0 0 0 0; font-size: 13px; color: #555;"><strong>⏰ Heure :</strong> ${sessionInfo.heureDebut}</p>` : ""}
        </td>
      </tr>
    </table>
    `
    : "";

  const attachmentBlock = attachmentNames && attachmentNames.length > 0
    ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 18px 0;">
      <tr>
        <td style="background-color: #fef9ef; border: 1px solid #f5e6c8; border-radius: 6px; padding: 14px 18px;">
          <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #b8860b;">📎 Pièce(s) jointe(s) :</p>
          ${attachmentNames.map(name => `<p style="margin: 0 0 3px 0; font-size: 13px; color: #555;">• ${name}</p>`).join("")}
          <p style="margin: 8px 0 0 0; font-size: 11px; color: #999; font-style: italic;">
            Astuce : si vous ne parvenez pas à ouvrir un fichier, essayez avec Adobe Acrobat Reader (gratuit) ou enregistrez-le sur votre appareil avant de l'ouvrir.
          </p>
        </td>
      </tr>
    </table>
    `
    : "";

  const footer = customFooter || `
    <p style="margin: 0; font-size: 12px; color: #999; line-height: 1.6;">
      <strong>Ecole T3P Montrouge</strong><br>
      Centre de formation Taxi, VTC et VMDTR<br>
      📧 <a href="mailto:montrouge@ecolet3p.fr" style="color: #999; text-decoration: none;">montrouge@ecolet3p.fr</a>
    </p>
    <p style="margin: 12px 0 0 0; font-size: 11px; color: #bbb;">
      Cet email a été envoyé automatiquement. Si vous n'êtes pas le destinataire prévu, merci de l'ignorer.
    </p>
  `;

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f7; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f7;">
    <tr>
      <td align="center" style="padding: 30px 10px;">
        <!-- Main container -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
          
          <!-- Header banner -->
          <tr>
            <td style="background: linear-gradient(135deg, ${accentColor}, ${lightenColor(accentColor, 20)}); padding: 28px 35px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin: 0 0 4px 0; font-size: 13px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 1px; font-family: Arial, Helvetica, sans-serif;">Ecole T3P</p>
                    <h1 style="margin: 0; font-size: 22px; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-weight: 700;">${title}</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 32px 35px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.7; color: #444;">
              ${greeting}
              ${bodyHtml}
              ${sessionBlock}
              ${attachmentBlock}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f8fa; border-top: 1px solid #eee; padding: 24px 35px; font-family: Arial, Helvetica, sans-serif; text-align: center;">
              ${footer}
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Éclaircit une couleur hex de X%
 */
function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(255 * percent / 100));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * percent / 100));
  const b = Math.min(255, (num & 0xff) + Math.round(255 * percent / 100));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/**
 * Formate une date ISO en date française lisible
 */
export function formatDateFr(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}
