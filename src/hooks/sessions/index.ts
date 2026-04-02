// Barrel export — façade for session hooks
export { useSessionsList, useUpcomingSessions, useSessionDetails } from "./useSessionsList";
export { useSessionInscriptions, useSessionInscriptionsCount, useAllSessionInscriptionsCounts } from "./useSessionEnrollments";
export { useCreateSession, useUpdateSession, useDeleteSession, useAddInscription, useRemoveInscription } from "./useSessionMutations";

// Re-export types
export type { Session } from "./useSessionsList";
export type { SessionInscription } from "./useSessionEnrollments";
export type { SessionInsert, SessionUpdate } from "./useSessionMutations";
