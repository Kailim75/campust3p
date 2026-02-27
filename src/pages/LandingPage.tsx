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
    description: "Plateforme LMS avec quiz et suivi pédagogique complet."
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
    content: "Le module e-learning avec les quiz interactifs est un vrai plus pour nos formations. Les stagiaires adorent !",
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
    
    // Simulation d'envoi
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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-lg border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              T3P Campus CRM
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-slate-300 hover:text-white transition-colors">Fonctionnalités</a>
            <a href="#testimonials" className="text-sm text-slate-300 hover:text-white transition-colors">Témoignages</a>
            <a href="#pricing" className="text-sm text-slate-300 hover:text-white transition-colors">Tarifs</a>
            <a href="#contact" className="text-sm text-slate-300 hover:text-white transition-colors">Contact</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" className="text-slate-300 hover:text-white">
                Connexion
              </Button>
            </Link>
            <Button 
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white border-0"
              onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Essai gratuit
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
        </div>
        
        <div className="container mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-6 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-4 py-2">
              ✨ Le CRM dédié aux centres de formation Taxi / VTC / VMDTR
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Le CRM pensé pour les
              <span className="block bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Centres de Formation
              </span>
            </h1>
            
            <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
              Gérez vos stagiaires, sessions, documents et facturation en un seul endroit. 
              Conforme Qualiopi, avec e-learning intégré et automatisations intelligentes.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white px-8 py-6 text-lg border-0"
                onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Démarrer l'essai gratuit
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white/20 text-white hover:bg-white/10 px-8 py-6 text-lg"
                onClick={handleCalendly}
              >
                <Play className="mr-2 h-5 w-5" />
                Voir la démo
              </Button>
            </div>
          </motion.div>
          
          {/* Stats */}
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-sm text-slate-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-slate-900/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
              Fonctionnalités
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
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
                <Card className="bg-slate-800/50 border-white/10 hover:border-emerald-500/50 transition-all duration-300 h-full group">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center mb-4 group-hover:from-emerald-500/30 group-hover:to-cyan-500/30 transition-colors">
                      <feature.icon className="h-6 w-6 text-emerald-400" />
                    </div>
                    <CardTitle className="text-white text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-slate-400">
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
              <Badge className="mb-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                Pourquoi nous choisir
              </Badge>
              <h2 className="text-4xl font-bold mb-6">
                Conçu spécifiquement pour les formations VTC, Taxi & Transport
              </h2>
              <p className="text-slate-400 mb-8">
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
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <item.icon className="h-5 w-5 text-emerald-400" />
                    </div>
                    <span className="text-slate-300">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-3xl blur-2xl" />
              <div className="relative bg-slate-800/80 border border-white/10 rounded-2xl p-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Users className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">Nouveau apprenant inscrit</div>
                        <div className="text-xs text-slate-400">Jean Dupont - Formation VTC</div>
                      </div>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-cyan-400" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">Convention générée</div>
                        <div className="text-xs text-slate-400">Envoyée automatiquement</div>
                      </div>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">Paiement reçu</div>
                        <div className="text-xs text-slate-400">1 500€ - Facture #2024-156</div>
                      </div>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 bg-slate-900/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
              Témoignages
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              Ils nous font confiance
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
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
                <Card className="bg-slate-800/50 border-white/10 h-full">
                  <CardContent className="pt-6">
                    <div className="flex gap-1 mb-4">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-slate-300 mb-6 italic">"{testimonial.content}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <div className="font-medium text-white">{testimonial.name}</div>
                        <div className="text-sm text-slate-400">{testimonial.role}</div>
                        <div className="text-xs text-emerald-400">{testimonial.company}</div>
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
            <Badge className="mb-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              Tarification
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              Des tarifs simples et transparents
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
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
                    ? 'bg-gradient-to-b from-emerald-900/50 to-slate-800/50 border-emerald-500/50' 
                    : 'bg-slate-800/50 border-white/10'
                }`}>
                  {plan.highlighted && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white border-0">
                        Le plus populaire
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pt-8">
                    <CardTitle className="text-white text-2xl">{plan.name}</CardTitle>
                    <CardDescription className="text-slate-400">{plan.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-5xl font-bold text-white">{plan.price}€</span>
                      <span className="text-slate-400">/mois</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-slate-300">
                          <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button 
                      className={`w-full ${
                        plan.highlighted 
                          ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white border-0' 
                          : 'bg-white/10 hover:bg-white/20 text-white'
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
      <section id="contact" className="py-20 px-4 bg-slate-900/50">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            <div>
              <Badge className="mb-4 bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                Contact
              </Badge>
              <h2 className="text-4xl font-bold mb-4">
                Prêt à transformer votre gestion ?
              </h2>
              <p className="text-slate-400 mb-8">
                Remplissez le formulaire ou contactez-nous directement. Notre équipe vous répond sous 24h.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Mail className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Email</div>
                    <a href="mailto:contact@t3pcampus.com" className="text-white hover:text-emerald-400 transition-colors">
                      contact@t3pcampus.com
                    </a>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                    <Phone className="h-6 w-6 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Téléphone</div>
                    <a href="tel:[KARIM : REMPLACER ICI]" className="text-white hover:text-emerald-400 transition-colors">
                      [KARIM : REMPLACER ICI]
                    </a>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                  onClick={handleWhatsApp}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  WhatsApp
                </Button>
                <Button 
                  variant="outline" 
                  className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                  onClick={handleCalendly}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Prendre RDV
                </Button>
              </div>
            </div>
            
            <Card className="bg-slate-800/50 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Demander une démo</CardTitle>
                <CardDescription className="text-slate-400">
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
                      className="bg-slate-700/50 border-white/10 text-white placeholder:text-slate-500"
                    />
                    <Input 
                      placeholder="Votre email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="bg-slate-700/50 border-white/10 text-white placeholder:text-slate-500"
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input 
                      placeholder="Téléphone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="bg-slate-700/50 border-white/10 text-white placeholder:text-slate-500"
                    />
                    <Input 
                      placeholder="Nom du centre"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="bg-slate-700/50 border-white/10 text-white placeholder:text-slate-500"
                    />
                  </div>
                  <Textarea 
                    placeholder="Votre message (optionnel)"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={4}
                    className="bg-slate-700/50 border-white/10 text-white placeholder:text-slate-500"
                  />
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white border-0"
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
      <footer className="py-12 px-4 border-t border-white/10">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-white">T3P Campus CRM</span>
            </div>
            <p className="text-sm text-slate-400">
              © 2024 T3P Campus. Tous droits réservés.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">Mentions légales</a>
              <a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">Confidentialité</a>
              <a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">CGV</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
