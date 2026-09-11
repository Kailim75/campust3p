import React from "react";

/**
 * Remplaçant de `@/components/ui/dropdown-menu` pour les tests : le contenu du
 * menu est rendu en place, toujours visible.
 *
 * Le DropdownMenu Radix ne s'ouvre pas dans jsdom (capture de pointeur), et
 * sans ce double aucun test ne peut voir ce qu'un menu propose — c'est
 * exactement ce qui avait laissé passer le bouton « Supprimer cette facture »
 * du menu « +N » de la fiche session.
 *
 * Usage : vi.mock("@/components/ui/dropdown-menu", () => import("@/test/dropdown-natif"));
 */

const Passthrough = ({ children }: { children?: React.ReactNode }) => <>{children}</>;

export const DropdownMenu = Passthrough;
export const DropdownMenuTrigger = Passthrough;
export const DropdownMenuGroup = Passthrough;
export const DropdownMenuPortal = Passthrough;
export const DropdownMenuSub = Passthrough;
export const DropdownMenuRadioGroup = Passthrough;

export function DropdownMenuContent({ children }: { children?: React.ReactNode }) {
  return <div data-testid="dropdown-natif">{children}</div>;
}

export function DropdownMenuItem({
  children,
  onClick,
  disabled,
}: {
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
}) {
  return (
    <button type="button" role="menuitem" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export const DropdownMenuCheckboxItem = DropdownMenuItem;
export const DropdownMenuRadioItem = DropdownMenuItem;
export const DropdownMenuSubTrigger = DropdownMenuItem;
export const DropdownMenuSubContent = DropdownMenuContent;

export function DropdownMenuLabel({ children }: { children?: React.ReactNode }) {
  return <div>{children}</div>;
}

export function DropdownMenuSeparator() {
  return null;
}

export function DropdownMenuShortcut({ children }: { children?: React.ReactNode }) {
  return <span>{children}</span>;
}
