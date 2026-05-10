type PersonContext = {
  prenom?: string | null;
};

type ProspectFollowUpContext = PersonContext & {
  formationSouhaitee?: string | null;
};

type RappelRdvContext = PersonContext & {
  dateLabel?: string | null;
};

type CmaDocsContext = PersonContext & {
  missingDocsLabels?: string[];
};

function salutation(prenom?: string | null) {
  const cleaned = prenom?.trim();
  return cleaned ? `Bonjour ${cleaned},` : "Bonjour,";
}

function signature() {
  return "Cordialement,\nT3P Campus";
}

export function buildProspectFollowUpWhatsAppMessage({
  prenom,
  formationSouhaitee,
}: ProspectFollowUpContext): string {
  const formation = formationSouhaitee?.trim();
  const formationText = formation ? ` ${formation}` : "";

  return [
    salutation(prenom),
    "",
    `Je reviens vers vous concernant votre projet de formation${formationText}.`,
    "Est-ce que vous êtes toujours intéressé(e) ? Je peux vous aider à avancer sur l'inscription ou répondre à vos questions.",
    "",
    signature(),
  ].join("\n");
}

export function buildRdvConfirmationWhatsAppMessage({ prenom, dateLabel }: RappelRdvContext): string {
  const dateText = dateLabel?.trim() || "aujourd'hui";

  return [
    salutation(prenom),
    "",
    `Nous vous confirmons votre rendez-vous prévu ${dateText}.`,
    "Pouvez-vous me confirmer que c'est toujours bon pour vous ?",
    "",
    signature(),
  ].join("\n");
}

export function buildCmaDocsWhatsAppMessage({ prenom, missingDocsLabels = [] }: CmaDocsContext): string {
  const docs = missingDocsLabels.filter(Boolean);
  const docsBlock = docs.length
    ? `\n\nDocuments manquants :\n${docs.map((label) => `- ${label}`).join("\n")}`
    : "";

  return [
    salutation(prenom),
    "",
    `Pour finaliser votre dossier CMA, il nous manque encore certains éléments.${docsBlock}`,
    "",
    "Merci de nous les transmettre dès que possible.",
    "",
    signature(),
  ].join("\n");
}
