export const onboardingChecklistL10n = {
  widget: {
    title: "Premiers pas",
    progress: (done: number, total: number) => `${done}/${total}`,
  },
  sheet: {
    title: "Tes premiers pas",
    subtitle: (done: number, total: number, pct: number) =>
      `Progression : ${done}/${total} étapes (${pct}%)`,
    later: "Plus tard",
    skipped: "Étape passée — tu pourras y revenir plus tard.",
  },
  celebration: {
    toast: "🎉 Bravo ! Ton CRM est prêt à fonctionner à 100%.",
  },
  steps: {
    customize_centre: {
      title: "Personnalise ton centre",
      hint: "Ajoute ton logo et ton nom commercial pour des documents pro.",
      cta: "Ouvrir paramètres",
    },
    invite_team: {
      title: "Invite ton équipe",
      hint: "Travaille à plusieurs sur le même centre.",
      cta: "Inviter un collaborateur",
    },
    create_formation: {
      title: "Crée ta 1ère formation",
      hint: "Définis ton catalogue pour planifier ensuite des sessions.",
      cta: "Créer une formation",
    },
    create_session: {
      title: "Planifie ta 1ère session",
      hint: "Choisis une formation et programme une date.",
      cta: "Créer une session",
    },
    add_apprenant: {
      title: "Ajoute ton 1er apprenant",
      hint: "Inscris un contact pour démarrer le suivi pédagogique.",
      cta: "Ajouter un apprenant",
    },
    configure_iban: {
      title: "Configure ton IBAN",
      hint: "Indispensable pour encaisser tes premiers paiements.",
      cta: "Configurer IBAN",
    },
    customize_email: {
      title: "Personnalise un email",
      hint: "Adapte les modèles à ton image avant d'envoyer.",
      cta: "Personnaliser un email",
    },
    send_invoice: {
      title: "Envoie ta 1ère facture",
      hint: "Le moment de vérité : facture ton premier client.",
      cta: "Créer une facture",
    },
  },
} as const;

export type OnboardingStepId = keyof typeof onboardingChecklistL10n.steps;
