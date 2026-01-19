// Analytics and event tracking utility
// Logs events in development, can be extended for production analytics

type EventData = Record<string, string | number | boolean | null | undefined>;

/**
 * Track an event for analytics
 * @param event - Event name (e.g., 'contact_created', 'session_scheduled')
 * @param data - Optional event data
 */
export function trackEvent(event: string, data?: EventData) {
  // Development logging
  if (import.meta.env.DEV) {
    console.info(`[Analytics] ${event}`, data);
  }

  // Production: Send to analytics service
  // Uncomment and configure for your analytics provider
  /*
  if (import.meta.env.PROD) {
    // Example: Plausible
    window.plausible?.(event, { props: data });
    
    // Example: PostHog
    window.posthog?.capture(event, data);
    
    // Example: Google Analytics
    window.gtag?.('event', event, data);
  }
  */
}

/**
 * Track a page view
 * @param page - Page path
 */
export function trackPageView(page: string) {
  trackEvent('page_view', { page });
}

/**
 * Track user actions related to CRM
 */
export const CRMEvents = {
  contactCreated: (id: string) => trackEvent('contact_created', { id }),
  contactUpdated: (id: string) => trackEvent('contact_updated', { id }),
  contactDeleted: (id: string) => trackEvent('contact_deleted', { id }),
  
  sessionCreated: (id: string, formationType: string) => 
    trackEvent('session_created', { id, formation_type: formationType }),
  sessionEnrolled: (sessionId: string, contactId: string) => 
    trackEvent('session_enrollment', { session_id: sessionId, contact_id: contactId }),
  sessionClosed: (id: string) => trackEvent('session_closed', { id }),
  
  factureCreated: (id: string, montant: number) => 
    trackEvent('facture_created', { id, montant }),
  paiementRegistered: (factureId: string, montant: number) => 
    trackEvent('paiement_registered', { facture_id: factureId, montant }),
  
  documentGenerated: (type: string, contactId: string) => 
    trackEvent('document_generated', { type, contact_id: contactId }),
  emailSent: (type: string, contactId: string) => 
    trackEvent('email_sent', { type, contact_id: contactId }),
  
  aiAssistantUsed: (action: string) => 
    trackEvent('ai_assistant_used', { action }),
  
  exportPerformed: (type: string, count: number) => 
    trackEvent('export_performed', { type, count }),
};
