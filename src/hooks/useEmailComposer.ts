import { useState, useCallback } from "react";
import type { EmailRecipient } from "@/components/email/EmailComposerModal";
import type { ActionCategory } from "@/lib/aujourdhui-actions";
import type { EmailAttachment } from "@/lib/session-document-helpers";

interface EmailComposerState {
  open: boolean;
  recipients: EmailRecipient[];
  defaultSubject: string;
  defaultBody: string;
  autoNoteCategory?: ActionCategory;
  autoNoteExtra?: string;
  onSuccess?: () => void;
  attachments?: EmailAttachment[];
}

const initialState: EmailComposerState = {
  open: false,
  recipients: [],
  defaultSubject: "",
  defaultBody: "",
};

export function useEmailComposer() {
  const [state, setState] = useState<EmailComposerState>(initialState);

  const openComposer = useCallback((opts: Omit<EmailComposerState, "open">) => {
    setState({ ...opts, open: true });
  }, []);

  const closeComposer = useCallback(() => {
    setState(initialState);
  }, []);

  const setOpen = useCallback((open: boolean) => {
    if (!open) closeComposer();
  }, [closeComposer]);

  return {
    composerProps: {
      open: state.open,
      onOpenChange: setOpen,
      recipients: state.recipients,
      defaultSubject: state.defaultSubject,
      defaultBody: state.defaultBody,
      autoNoteCategory: state.autoNoteCategory,
      autoNoteExtra: state.autoNoteExtra,
      onSuccess: state.onSuccess,
      attachments: state.attachments,
    },
    openComposer,
    closeComposer,
  };
}
