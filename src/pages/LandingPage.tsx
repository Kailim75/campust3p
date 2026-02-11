import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Users, Calendar, FileText, CreditCard, GraduationCap, 
  BarChart3, Bell, Zap, CheckCircle2, ArrowRight, 
  Mail, Phone, MessageCircle, Star, Play, Shield,
  Clock, TrendingUp, Award, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const features = [
  {
    icon: Users,
    title: "Gestion des Contacts",
    description: "Centralisez tous vos stagiaires, prospects et partenaires. Suivi complet du parcours de formation."
  },
  {
    icon: Calendar,
    title: "Planning des Sessions",
    description: "Calendrier interactif, gestion des inscriptions et émargements numériques intégrés."
  },
  {
    icon: FileText,
    title: "Documents Automatisés",
    description: "Génération automatique de conventions, attestations, certificats conformes Qualiopi."
  },
  {
    icon: CreditCard,
    title: "Facturation Complète",
    description: "Devis, factures, relances automatiques et suivi des paiements en temps réel."
  },
  {
    icon: GraduationCap,
    title: "E-Learning Intégré",
    description: "Plateforme LMS avec quiz, modules 3D/BIM et suivi pédagogique complet."
  },
  {
    icon: BarChart3,
    title: "Tableaux de Bord",
    description: "KPIs en temps réel, projections de CA et analyses de performance détaillées."
  },
  {
    icon: Bell,
    title: "Alertes Intelligentes",
    description: "Rappels automatiques pour examens, documents expirés et échéances importantes."
  },
  {
    icon: Zap,
    title: "Automatisations",
    description: "Workflows personnalisables pour automatiser vos processus répétitifs."
  }
];

const testimonials = [
  {
    name: "Marie Dupont",
    role: "Directrice Formation VTC",
    company: "FormaParis",
    content: "Ce CRM a transformé notre gestion quotidienne. Nous avons gagné 10h par semaine sur l'administratif.",
    rating: 5,
    avatar: "MD"
  },
  {
    name: "Jean-Pierre Martin",
    role: "Gérant Centre Taxi",
    company: "École Taxi 75",
    content: "La génération automatique des documents Qualiopi nous a permis de passer notre audit sans stress.",
    rating: 5,
    avatar: "JPM"
  },
  {
    name: "Sophie Lambert",
    role: "Responsable Pédagogique",
    company: "Transport Academy",
    content: "Le module e-learning avec BIM 3D est un vrai plus pour nos formations. Les stagiaires adorent !",
    rating: 5,
    avatar: "SL"
  }
];

const pricingPlans = [
  {
    name: "Starter",
    price: "49",
    description: "Idéal pour démarrer",
    features: [
      "Jusqu'à 50 contacts",
      "Gestion des sessions",
      "Génération documents basiques",
      "Support email",
      "1 utilisateur"
    ],
    highlighted: false
  },
  {
    name: "Pro",
    price: "99",
    description: "Le plus populaire",
    features: [
      "Contacts illimités",
      "Toutes les fonctionnalités",
      "E-learning & quiz",
      "Automatisations",
      "Support prioritaire",
      "5 utilisateurs"
    ],
    highlighted: true
  },
  {
    name: "Enterprise",
    price: "199",
    description: "Pour les grands centres",
    features: [
      "Multi-centres",
      "API & intégrations",
      "Formation personnalisée",
      "Account manager dédié",
      "SLA garanti",
      "Utilisateurs illimités"
    ],
    highlighted: false
  }
];

const stats = [
  { value: "500+", label: "Centres de formation" },
  { value: "50K+", label: "Stagiaires gérés" },
  { value: "10h", label: "Gagnées par semaine" },
  { value: "99.9%", label: "Disponibilité" }
];

export default function LandingPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success("Demande envoyée ! Nous vous recontactons sous 24h.");
    setFormData({ name: "", email: "", phone: "", company: "", message: "" });
    setIsSubmitting(false);
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent("Bonjour, je souhaite en savoir plus sur votre CRM pour centres de formation.");
    window.open(`https://wa.me/33612345678?text=${message}`, "_blank");
  };

  const handleCalendly = () => {
    window.open("https://calendly.com/votre-lien", "_blank");
  };

  return (
    <div className="min-h-screen bg-[hsl(38,55%,95%)] text-foreground">
      {/* Header - style ecolet3p.fr */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[hsl(38,55%,95%)]/90 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">T3P</span>
            </div>
            <div>
              <span className="text-lg font-bold text-primary">ÉCOLE T3P</span>
              <p className="text-[10px] text-muted-foreground leading-tight">Centre de formation agréé Préfecture</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-primary transition-colors">Fonctionnalités</a>
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-primary transition-colors">Témoignages</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-primary transition-colors">Tarifs</a>
            <a href="#contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">Contact</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" className="text-muted-foreground hover:text-primary">
                Connexion
              </Button>
            </Link>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90 border-0 font-semibold">
              S'inscrire
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section - warm cream bg like ecolet3p.fr */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="container mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 px-4 py-2">
              Centre agréé Préfecture
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight text-foreground">
              Le CRM pensé pour les{" "}
              <span className="text-accent">Centres de Formation</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-3xl mb-10">
              Gérez vos stagiaires, sessions, documents et facturation en un seul endroit. 
              Conforme Qualiopi, avec e-learning intégré et automatisations intelligentes.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <Button 
                size="lg" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg border-0 font-semibold"
                onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
              >
                S'inscrire à la formation
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-primary/30 text-primary hover:bg-primary/5 px-8 py-6 text-lg"
                onClick={handleCalendly}
              >
                <Play className="mr-2 h-5 w-5" />
                Voir la démo
              </Button>
            </div>
          </motion.div>
          
          {/* Stats - style cards like ecolet3p.fr */}
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-4xl"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {stats.map((stat, index) => (
              <div key={index} className="bg-card rounded-xl p-4 border border-border/50 shadow-sm text-center">
                <div className="text-3xl font-bold text-primary">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-card/60">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-accent/10 text-accent border-accent/20">
              Fonctionnalités
            </Badge>
            <h2 className="text-4xl font-bold mb-4 text-foreground">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Une suite complète d'outils pour gérer efficacement votre centre de formation
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="bg-card border-border/50 hover:border-primary/30 transition-all duration-300 h-full group hover:shadow-md">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-foreground text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-muted-foreground">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                Pourquoi nous choisir
              </Badge>
              <h2 className="text-4xl font-bold mb-6 text-foreground">
                Conçu spécifiquement pour les formations VTC, Taxi & Transport
              </h2>
              <p className="text-muted-foreground mb-8">
                Nous comprenons les spécificités de votre métier. Notre CRM intègre nativement 
                tous les documents réglementaires et processus propres aux formations T3P.
              </p>
              
              <div className="space-y-4">
                {[
                  { icon: Shield, text: "100% conforme Qualiopi" },
                  { icon: Clock, text: "Mise en place en moins de 24h" },
                  { icon: TrendingUp, text: "ROI visible dès le premier mois" },
                  { icon: Award, text: "Support français réactif" }
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-foreground">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="relative bg-card border border-border/50 rounded-2xl p-8 shadow-lg">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">Nouveau stagiaire inscrit</div>
                        <div className="text-xs text-muted-foreground">Jean Dupont - Formation VTC</div>
                      </div>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">Convention générée</div>
                        <div className="text-xs text-muted-foreground">Envoyée automatiquement</div>
                      </div>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-info" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">Paiement reçu</div>
                        <div className="text-xs text-muted-foreground">1 500€ - Facture #2024-156</div>
                      </div>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20">
              Témoignages
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              Ils nous font confiance
            </h2>
            <p className="text-primary-foreground/70 max-w-2xl mx-auto">
              Découvrez ce que nos clients disent de leur expérience avec T3P Campus CRM
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="bg-primary-foreground/10 border-primary-foreground/20 h-full backdrop-blur-sm">
                  <CardContent className="pt-6">
                    <div className="flex gap-1 mb-4">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-accent text-accent" />
                      ))}
                    </div>
                    <p className="text-primary-foreground/90 mb-6 italic">"{testimonial.content}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-semibold">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <div className="font-medium text-primary-foreground">{testimonial.name}</div>
                        <div className="text-sm text-primary-foreground/70">{testimonial.role}</div>
                        <div className="text-xs text-accent">{testimonial.company}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-accent/10 text-accent border-accent/20">
              Tarification
            </Badge>
            <h2 className="text-4xl font-bold mb-4 text-foreground">
              Des tarifs simples et transparents
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choisissez l'offre adaptée à la taille de votre centre. Sans engagement.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className={`relative h-full ${
                  plan.highlighted 
                    ? 'bg-primary/5 border-primary/30 shadow-lg' 
                    : 'bg-card border-border/50'
                }`}>
                  {plan.highlighted && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-accent text-accent-foreground border-0 font-semibold">
                        Le plus populaire
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pt-8">
                    <CardTitle className="text-foreground text-2xl">{plan.name}</CardTitle>
                    <CardDescription className="text-muted-foreground">{plan.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-5xl font-bold text-primary">{plan.price}€</span>
                      <span className="text-muted-foreground">/mois</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-foreground">
                          <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button 
                      className={`w-full ${
                        plan.highlighted 
                          ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                          : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                      }`}
                      onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                      Commencer
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-4 bg-card/60">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            <div>
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                Contact
              </Badge>
              <h2 className="text-4xl font-bold mb-4 text-foreground">
                Prêt à transformer votre gestion ?
              </h2>
              <p className="text-muted-foreground mb-8">
                Remplissez le formulaire ou contactez-nous directement. Notre équipe vous répond sous 24h.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Email</div>
                    <a href="mailto:contact@ecolet3p.fr" className="text-foreground hover:text-primary transition-colors">
                      contact@ecolet3p.fr
                    </a>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Phone className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Téléphone</div>
                    <a href="tel:+33188750555" className="text-foreground hover:text-primary transition-colors">
                      01 88 75 05 55
                    </a>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="border-primary/30 text-primary hover:bg-primary/5"
                  onClick={handleWhatsApp}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  WhatsApp
                </Button>
                <Button 
                  variant="outline" 
                  className="border-accent/30 text-accent hover:bg-accent/5"
                  onClick={handleCalendly}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Prendre RDV
                </Button>
              </div>
            </div>
            
            <Card className="bg-card border-border/50 shadow-md">
              <CardHeader>
                <CardTitle className="text-foreground">Demander une démo</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Essai gratuit de 14 jours, sans carte bancaire
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input 
                      placeholder="Votre nom"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                    <Input 
                      placeholder="Votre email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input 
                      placeholder="Téléphone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                    <Input 
                      placeholder="Nom du centre"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    />
                  </div>
                  <Textarea 
                    placeholder="Votre message (optionnel)"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={4}
                  />
                  <Button 
                    type="submit" 
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Envoi en cours..." : "Demander ma démo gratuite"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border bg-primary text-primary-foreground">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                <span className="text-accent-foreground font-bold text-xs">T3P</span>
              </div>
              <span className="font-bold">ÉCOLE T3P — Campus CRM</span>
            </div>
            <p className="text-sm text-primary-foreground/70">
              © {new Date().getFullYear()} ÉCOLE T3P. Tous droits réservés.
            </p>
            <div className="flex gap-6">
              <Link to="/mentions-legales" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">Mentions légales</Link>
              <Link to="/politique-confidentialite" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">Confidentialité</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
