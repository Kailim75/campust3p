// ═══════════════════════════════════════════════════════════════
// Template HTML par défaut — Contrat d'accompagnement à la conduite
// Prestation : formation pratique 2h + mise à disposition véhicule
// le jour de l'examen (Taxi / VTC).
// Utilisé en fallback si aucun template publié dans Template Studio.
// ═══════════════════════════════════════════════════════════════

import type { FiliereConduite } from "./produitsCatalogue";

const baseStyle = `
<style>
  .contrat-conduite { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; line-height: 1.55; font-size: 12px; }
  .contrat-conduite h1 { color: #1E462D; font-size: 20px; text-align: center; margin: 0 0 4px; letter-spacing: 0.5px; }
  .contrat-conduite h2 { color: #1E462D; font-size: 13px; border-bottom: 1.5px solid #C9A961; padding-bottom: 3px; margin: 18px 0 8px; text-transform: uppercase; letter-spacing: 0.4px; }
  .contrat-conduite .subtitle { text-align: center; color: #666; font-style: italic; margin-bottom: 18px; font-size: 11px; }
  .contrat-conduite .parties { background: #FAF7F0; border-left: 3px solid #C9A961; padding: 10px 14px; margin: 12px 0; }
  .contrat-conduite .parties p { margin: 4px 0; }
  .contrat-conduite .article { margin: 10px 0; text-align: justify; }
  .contrat-conduite ul { padding-left: 18px; margin: 6px 0; }
  .contrat-conduite li { margin: 3px 0; }
  .contrat-conduite table.planning { width: 100%; border-collapse: collapse; margin: 8px 0; }
  .contrat-conduite table.planning th { background: #1E462D; color: #fff; padding: 6px 8px; text-align: left; font-size: 11px; }
  .contrat-conduite table.planning td { border: 1px solid #ddd; padding: 6px 8px; }
  .contrat-conduite .prix-box { background: #1E462D; color: #fff; padding: 10px 14px; border-radius: 3px; margin: 10px 0; display: flex; justify-content: space-between; }
  .contrat-conduite .prix-box strong { font-size: 15px; }
  .contrat-conduite .signatures { display: flex; justify-content: space-between; margin-top: 30px; gap: 24px; }
  .contrat-conduite .signature-box { flex: 1; border-top: 1px solid #333; padding-top: 6px; font-size: 11px; }
  .contrat-conduite .mention { font-size: 10px; color: #555; font-style: italic; margin-top: 8px; }
</style>
`;

export function buildDefaultContratConduiteHtml(filiere: FiliereConduite): string {
  const filiereLabel = filiere === "taxi" ? "TAXI" : "VTC";

  return `${baseStyle}
<div class="contrat-conduite">
  <h1>Contrat de formation pratique à la conduite</h1>
  <p class="subtitle">Préparation à l'épreuve pratique — Examen ${filiereLabel}</p>

  <div class="parties">
    <p><strong>Entre les soussignés :</strong></p>
    <p><strong>{{centre_raison_sociale}}</strong>, SIRET {{centre_siret}} — Déclaration d'activité n° {{centre_numero_da}}<br/>
    Sise {{centre_adresse}} — Tél {{centre_telephone}} — {{centre_email}}<br/>
    <em>Ci-après désigné « l'Organisme de formation »,</em></p>
    <p><strong>Et</strong></p>
    <p><strong>{{contact_prenom}} {{contact_nom}}</strong><br/>
    {{contact_adresse}}, {{contact_code_postal}} {{contact_ville}}<br/>
    Tél {{contact_telephone}} — {{contact_email}}<br/>
    <em>Ci-après désigné « le Stagiaire ».</em></p>
  </div>

  <h2>Article 1 — Objet du contrat</h2>
  <p class="article">
    Le présent contrat a pour objet la fourniture par l'Organisme de formation d'une <strong>prestation de formation pratique à la conduite</strong>,
    destinée à préparer le Stagiaire à l'épreuve pratique de l'examen {{produit_filiere}}.
    Cette prestation constitue un <strong>produit autonome</strong>, distinct de la formation théorique, et n'est rattachée à aucune session collective.
  </p>

  <h2>Article 2 — Contenu et modalités de la prestation</h2>
  <p class="article">La prestation « <strong>{{produit_intitule}}</strong> » comprend :</p>
  <ul>
    <li><strong>Deux (2) heures de conduite accompagnée</strong> avec un formateur habilité, sur un véhicule pédagogique conforme aux exigences de l'épreuve {{produit_filiere}} ;</li>
    <li>Un <strong>bilan de compétences pratiques</strong> et des conseils personnalisés en fin de séance ;</li>
    <li>La <strong>mise à disposition du véhicule le jour de l'examen</strong>, équipé conformément aux prescriptions du centre d'examen ;</li>
    <li>La présence d'un accompagnateur professionnel jusqu'au lieu de convocation ;</li>
    <li>La remise d'une <strong>attestation de suivi</strong> à l'issue de la formation pratique.</li>
  </ul>
  <p class="article">
    La formation se déroule en conditions réelles de circulation. Le formateur adapte le parcours au niveau du Stagiaire et aux exigences de l'épreuve officielle.
  </p>

  <h2>Article 3 — Planning et lieu</h2>
  <table class="planning">
    <tr><th style="width:40%">Élément</th><th>Détail</th></tr>
    <tr><td>Séance de conduite (2 h)</td><td>{{seance_date_conduite}}</td></tr>
    <tr><td>Date d'examen</td><td>{{seance_date_examen}}</td></tr>
    <tr><td>Lieu de rendez-vous</td><td>{{seance_lieu_rdv}}</td></tr>
    <tr><td>Formateur / accompagnateur</td><td>{{seance_accompagnateur}}</td></tr>
  </table>

  <h2>Article 4 — Prix et modalités de paiement</h2>
  <div class="prix-box">
    <span>Prix total de la prestation TTC</span>
    <strong>{{paiement_prix_ttc}}</strong>
  </div>
  <p class="article">
    Montant déjà réglé : <strong>{{paiement_montant_paye}}</strong> — Reste à régler : <strong>{{paiement_reste_a_payer}}</strong>.<br/>
    Le paiement est exigible avant la réalisation de la prestation, sauf convention particulière.
    Le prix inclut l'intégralité des éléments listés à l'Article 2, y compris la mise à disposition du véhicule d'examen.
  </p>

  <h2>Article 5 — Obligations du Stagiaire</h2>
  <p class="article">Le Stagiaire s'engage à :</p>
  <ul>
    <li>Être titulaire d'un <strong>permis de conduire B en cours de validité</strong> et le présenter le jour de la séance et de l'examen ;</li>
    <li>Se présenter à l'heure convenue au lieu de rendez-vous ;</li>
    <li>Respecter le Code de la route et les instructions du formateur pendant toute la durée de la prestation ;</li>
    <li>Ne pas être sous l'emprise d'alcool, de stupéfiants ou de toute substance altérant ses capacités de conduite.</li>
  </ul>
  <p class="article">
    Tout manquement à ces obligations pourra entraîner l'interruption immédiate de la prestation, sans remboursement.
  </p>

  <h2>Article 6 — Véhicule et assurance</h2>
  <p class="article">
    Le véhicule utilisé pour la formation et pour l'examen est fourni par l'Organisme de formation.
    Il est assuré tous risques pour l'usage pédagogique et l'épreuve d'examen.
    Le Stagiaire est couvert en tant que conducteur pendant la durée de la prestation.
    Toute dégradation résultant d'une <strong>faute intentionnelle ou d'un manquement grave</strong> aux règles de sécurité pourra être mise à la charge du Stagiaire, dans les conditions prévues par la police d'assurance.
  </p>

  <h2>Article 7 — Annulation et report</h2>
  <p class="article">
    {{contrat_conditions_annulation}}<br/>
    En cas d'échec à l'examen, une nouvelle prestation pourra être proposée aux tarifs en vigueur.
    En cas de report d'examen à l'initiative du centre d'examen, la prestation est reportée sans frais à la nouvelle date.
  </p>

  <h2>Article 8 — Réclamation et médiation</h2>
  <p class="article">
    Toute réclamation doit être adressée par écrit à {{centre_email}}. À défaut de résolution amiable, le Stagiaire peut saisir le
    médiateur de la consommation compétent. Le présent contrat est régi par le droit français.
  </p>

  <p class="mention">
    Fait à {{contact_ville}}, le {{contrat_date}}, en deux exemplaires originaux, dont un remis à chacune des parties.
  </p>

  <div class="signatures">
    <div class="signature-box">
      <strong>Le Stagiaire</strong><br/>
      {{contact_prenom}} {{contact_nom}}<br/>
      <em>Précédé de la mention « Lu et approuvé — Bon pour accord »</em>
    </div>
    <div class="signature-box">
      <strong>Pour l'Organisme de formation</strong><br/>
      {{centre_raison_sociale}}<br/>
      <em>Signature et cachet</em>
    </div>
  </div>
</div>`;
}
