import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BarChart, Bar, XAxis } from "recharts";
import { ThemeProvider, useTheme } from "next-themes";
import { Calendar } from "@/components/ui/calendar";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";

/**
 * Test de fumée de la migration React 19.
 *
 * Les 696 tests existants passent sous React 19 sans rien changer — mais AUCUN
 * ne rend un graphique, le calendrier, le thème ni un vrai tiroir (celui de la
 * fiche facture est remplacé par un faux). Leur passage au vert ne prouvait donc
 * rien pour les quatre bibliothèques les plus exposées à la montée de version.
 *
 * Le cas du fragment est le garde-fou central. recharts 2 reconnaît ses enfants
 * via react-is ; si react-is reste en 18 sous React 19, les séries placées dans
 * un <>…</> DISPARAISSENT, sans erreur ni avertissement. Ce test passe sous
 * React 18 ; il échouera sous React 19 si l'override react-is est oublié.
 */

const donnees = [
  { mois: "janv", ca: 1200 },
  { mois: "févr", ca: 1800 },
];

describe("graphiques (recharts)", () => {
  it("rend une série posée directement dans le graphique", () => {
    const { container } = render(
      <BarChart width={400} height={200} data={donnees}>
        <XAxis dataKey="mois" />
        <Bar dataKey="ca" />
      </BarChart>,
    );
    expect(container.querySelectorAll(".recharts-bar").length).toBe(1);
  });

  it("rend AUSSI une série posée dans un fragment — le piège react-is de React 19", () => {
    const { container } = render(
      <BarChart width={400} height={200} data={donnees}>
        <>
          <XAxis dataKey="mois" />
          <Bar dataKey="ca" />
        </>
      </BarChart>,
    );
    expect(
      container.querySelectorAll(".recharts-bar").length,
      "série absente : react-is n'est pas aligné sur la version de React",
    ).toBe(1);
  });
});

describe("calendrier (react-day-picker)", () => {
  it("sélectionne un jour et passe au mois suivant", () => {
    const onSelect = vi.fn();
    render(
      <Calendar mode="single" month={new Date(2026, 8, 1)} onSelect={onSelect} />,
    );
    fireEvent.click(screen.getByRole("gridcell", { name: "15" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect((onSelect.mock.calls[0][0] as Date).getDate()).toBe(15);

    const avant = screen.getByRole("grid").getAttribute("aria-label") ?? "";
    fireEvent.click(screen.getByRole("button", { name: /next month|mois suivant/i }));
    expect(screen.getByRole("grid").getAttribute("aria-label")).not.toBe(avant);
  });
});

describe("tiroir (vaul)", () => {
  it("s’ouvre et affiche son contenu", () => {
    render(
      <Drawer open>
        <DrawerContent>
          <DrawerTitle>Facture F-2026-001</DrawerTitle>
          <DrawerDescription>Détail de la facture</DrawerDescription>
        </DrawerContent>
      </Drawer>,
    );
    expect(screen.getByText("Facture F-2026-001")).toBeInTheDocument();
  });
});

describe("thème (next-themes)", () => {
  it("pose la classe dark sur la racine quand on passe en sombre", async () => {
    let basculer: (t: string) => void = () => {};
    const Sonde = () => {
      basculer = useTheme().setTheme;
      return null;
    };
    render(
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <Sonde />
      </ThemeProvider>,
    );
    await act(async () => basculer("dark"));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    await act(async () => basculer("light"));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
