import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { OnboardingChecklist } from "../OnboardingChecklist";

// Mocks
vi.mock("canvas-confetti", () => ({ default: vi.fn() }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn() }) }));

const mockUseOnboardingProgress = vi.fn();
vi.mock("@/hooks/useOnboardingProgress", () => ({
  useOnboardingProgress: (...args: unknown[]) => mockUseOnboardingProgress(...args),
}));

const baseSteps = [
  { id: "customize_centre", title: "Personnalise ton centre", hint: "h", ctaLabel: "Ouvrir", route: "/settings", completed: true, skippable: false },
  { id: "invite_team", title: "Invite ton équipe", hint: "h", ctaLabel: "Inviter", route: "/settings", completed: false, skippable: true },
  { id: "create_formation", title: "Crée ta 1ère formation", hint: "h", ctaLabel: "Créer", route: "/formations", completed: false, skippable: false },
];

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe("OnboardingChecklist", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the floating widget with progress", async () => {
    mockUseOnboardingProgress.mockReturnValue({
      steps: baseSteps,
      completedCount: 1,
      total: 3,
      progress: 33,
      allCompleted: false,
      dismissed: false,
      isReady: true,
      skipStep: vi.fn(),
      dismiss: vi.fn(),
    });

    render(<OnboardingChecklist />, { wrapper });
    expect(await screen.findByText(/Premiers pas/i)).toBeInTheDocument();
    expect(screen.getByText("1/3")).toBeInTheDocument();
  });

  it("triggers dismiss + hides on full completion", async () => {
    const dismiss = vi.fn().mockResolvedValue(undefined);
    mockUseOnboardingProgress.mockReturnValue({
      steps: baseSteps.map((s) => ({ ...s, completed: true })),
      completedCount: 3,
      total: 3,
      progress: 100,
      allCompleted: true,
      dismissed: false,
      isReady: true,
      skipStep: vi.fn(),
      dismiss,
    });

    vi.useFakeTimers();
    render(<OnboardingChecklist />, { wrapper });
    await vi.advanceTimersByTimeAsync(3000);
    vi.useRealTimers();
    await waitFor(() => expect(dismiss).toHaveBeenCalled());
  });

  it("does not render when dismissed", () => {
    mockUseOnboardingProgress.mockReturnValue({
      steps: baseSteps,
      completedCount: 1,
      total: 3,
      progress: 33,
      allCompleted: false,
      dismissed: true,
      isReady: true,
      skipStep: vi.fn(),
      dismiss: vi.fn(),
    });
    const { container } = render(<OnboardingChecklist />, { wrapper });
    expect(container).toBeEmptyDOMElement();
  });
});
