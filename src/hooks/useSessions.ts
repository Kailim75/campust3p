// Backward-compatible re-exports — all hooks are now in src/hooks/sessions/
export {
  useSessionsList as useSessions,
  useUpcomingSessions,
  useSessionDetails as useSession,
  useSessionInscriptions,
  useSessionInscriptionsCount,
  useAllSessionInscriptionsCounts,
  useCreateSession,
  useUpdateSession,
  useDeleteSession,
  useAddInscription,
  useRemoveInscription,
} from "./sessions";

export type {
  Session,
  SessionInscription,
  SessionInsert,
  SessionUpdate,
} from "./sessions";
