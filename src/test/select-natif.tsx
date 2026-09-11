import React from "react";

/**
 * Remplaçant de `@/components/ui/select` pour les tests : un <select> natif.
 * Le Select Radix ne s'ouvre pas dans jsdom (événements pointeur) ; ce double
 * garde la même API (value, onValueChange, disabled, SelectItem) pour que les
 * tests pilotent le choix d'un statut par `fireEvent.change`.
 *
 * Usage : vi.mock("@/components/ui/select", () => import("@/test/select-natif"));
 */

interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (valeur: string) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

export function Select({ value, defaultValue, onValueChange, disabled, children }: SelectProps) {
  return (
    <select
      data-testid="select-natif"
      value={value ?? defaultValue ?? ""}
      disabled={disabled}
      onChange={(e) => onValueChange?.(e.target.value)}
    >
      <option value="" />
      {children}
    </select>
  );
}

export function SelectTrigger() {
  return null;
}

export function SelectValue() {
  return null;
}

export function SelectContent({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export function SelectGroup({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export function SelectItem({ value, children }: { value: string; children?: React.ReactNode }) {
  return <option value={value}>{children}</option>;
}

export function SelectLabel() {
  return null;
}

export function SelectSeparator() {
  return null;
}
