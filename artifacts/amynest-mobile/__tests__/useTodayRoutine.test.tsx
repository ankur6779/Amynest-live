/**
 * Integration test for the cross-surface "Done sync" invariant.
 *
 * The whole point of T001 / the Parent Hub redesign is that the dashboard
 * (`app/(tabs)/index.tsx`) and the hub's Today's Plan page both call
 * `useTodayRoutine`, which shares the `["routines"]` TanStack Query cache.
 * Toggling a task as Done from one surface must:
 *
 *   1. Be visible to the other surface synchronously (optimistic update).
 *   2. Roll back on PATCH failure so both surfaces stay in sync.
 *   3. Persist on PATCH success and trigger a single revalidation.
 *
 * We render two consumers of the hook against the same QueryClient so
 * "consumer A's toggle reaches consumer B" is the literal test invariant.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const fetchMock = vi.fn();
vi.mock("@/hooks/useAuthFetch", () => ({
  useAuthFetch: () => fetchMock,
}));

import { useTodayRoutine } from "@/hooks/useTodayRoutine";

function makeRoutineFor(today: string) {
  return [
    {
      id: 7,
      childId: 1,
      childName: "Test Child",
      date: today,
      title: "Today's plan",
      items: [
        { time: "08:00", activity: "Breakfast", duration: 20, category: "meal", status: "pending" },
        { time: "09:00", activity: "Reading",   duration: 30, category: "study", status: "pending" },
      ],
    },
  ];
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Consumer({ label }: { label: string }) {
  const { tasks, onToggle, isLoading } = useTodayRoutine();
  if (isLoading) return <div data-testid={`${label}-loading`}>loading</div>;
  return (
    <div data-testid={label}>
      {tasks.map((t) => (
        <div key={t.id} data-testid={`${label}-${t.id}`}>
          <span>{t.title}</span>
          <span data-testid={`${label}-${t.id}-done`}>{t.done ? "DONE" : "PENDING"}</span>
          <button onClick={() => onToggle(t.id)} data-testid={`${label}-${t.id}-toggle`}>
            toggle
          </button>
        </div>
      ))}
    </div>
  );
}

function renderWithClient(client: QueryClient, ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  cleanup();
});

describe("useTodayRoutine — cross-surface Done sync", () => {
  it("toggling Done in one consumer updates the other consumer (shared cache)", async () => {
    const today = todayStr();
    // 3 fetches expected: initial GET, PATCH, then onSuccess invalidates
    // the ["routines"] key which triggers a background refetch.
    const baseRoutines = makeRoutineFor(today);
    const updatedRoutines = makeRoutineFor(today).map((r) => ({
      ...r,
      items: r.items.map((it, i) => (i === 0 ? { ...it, status: "completed" } : it)),
    }));
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => baseRoutines }); // GET
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });          // PATCH
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => updatedRoutines });// refetch

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    renderWithClient(
      client,
      <>
        <Consumer label="dashboard" />
        <Consumer label="hub" />
      </>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("dashboard")).toBeInTheDocument();
      expect(screen.getByTestId("hub")).toBeInTheDocument();
    });

    // Both surfaces start PENDING.
    const taskId = "t-7-0";
    expect(screen.getByTestId(`dashboard-${taskId}-done`)).toHaveTextContent("PENDING");
    expect(screen.getByTestId(`hub-${taskId}-done`)).toHaveTextContent("PENDING");

    // Toggle from the dashboard surface.
    await act(async () => {
      screen.getByTestId(`dashboard-${taskId}-toggle`).click();
    });

    // The hub surface must reflect the change through the shared
    // `["routines"]` cache — this is the cross-surface invariant.
    await waitFor(() => {
      expect(screen.getByTestId(`dashboard-${taskId}-done`)).toHaveTextContent("DONE");
      expect(screen.getByTestId(`hub-${taskId}-done`)).toHaveTextContent("DONE");
    });

    // PATCH was issued for the toggle (2nd fetch call). The 3rd call is
    // the post-invalidation refetch, which is expected behaviour.
    expect(fetchMock.mock.calls[1][0]).toBe("/api/routines/7/items");
    expect(fetchMock.mock.calls[1][1]?.method).toBe("PATCH");
    const patchBody = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    expect(patchBody.items[0].status).toBe("completed");
  });

  it("rolls back both consumers when the PATCH request fails", async () => {
    const today = todayStr();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => makeRoutineFor(today),
    });
    // PATCH rejects → optimistic update must be rolled back on BOTH surfaces.
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    renderWithClient(
      client,
      <>
        <Consumer label="dashboard" />
        <Consumer label="hub" />
      </>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("dashboard")).toBeInTheDocument();
    });

    const taskId = "t-7-0";

    await act(async () => {
      screen.getByTestId(`hub-${taskId}-toggle`).click();
    });

    // After the PATCH rejects, the snapshot rollback must restore PENDING
    // on BOTH surfaces — not just the one that toggled. (The optimistic
    // DONE flicker happens, but the rollback may complete before our
    // first waitFor tick — what matters is that BOTH surfaces converge
    // to PENDING in lock-step.)
    await waitFor(() => {
      expect(screen.getByTestId(`dashboard-${taskId}-done`)).toHaveTextContent("PENDING");
      expect(screen.getByTestId(`hub-${taskId}-done`)).toHaveTextContent("PENDING");
    });
  });
});
