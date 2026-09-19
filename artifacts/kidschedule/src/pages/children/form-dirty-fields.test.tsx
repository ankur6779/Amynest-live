/**
 * Regression: partial PATCH must see react-hook-form dirtyFields on submit.
 * RHF 7 wraps formState in a Proxy — dirtyFields is empty unless subscribed during render.
 */
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";

function DirtyFieldsProbe({ onSubmit }: { onSubmit: (dirty: Record<string, unknown>) => void }) {
  const form = useForm<{ name: string }>({ defaultValues: { name: "Alice" } });
  // Intentionally NOT subscribing to dirtyFields during render (mirrors ChildForm bug).

  return (
    <form
      onSubmit={form.handleSubmit((data) => {
        onSubmit(form.formState.dirtyFields);
      })}
    >
      <input aria-label="name" {...form.register("name")} />
      <button type="submit">Save</button>
    </form>
  );
}

function DirtyFieldsSubscribed({ onSubmit }: { onSubmit: (dirty: Record<string, unknown>) => void }) {
  const form = useForm<{ name: string }>({ defaultValues: { name: "Alice" } });
  const { dirtyFields } = form.formState;

  return (
    <form
      onSubmit={form.handleSubmit(() => {
        onSubmit(dirtyFields);
      })}
    >
      <input aria-label="name" {...form.register("name")} />
      <button type="submit">Save</button>
    </form>
  );
}

describe("react-hook-form dirtyFields subscription", () => {
  it("returns empty dirtyFields on submit when not subscribed during render", async () => {
    const user = userEvent.setup();
    let captured: Record<string, unknown> = {};
    render(<DirtyFieldsProbe onSubmit={(d) => { captured = d; }} />);

    await user.clear(screen.getByLabelText("name"));
    await user.type(screen.getByLabelText("name"), "Bob");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(captured).toEqual({});
    });
  });

  it("returns dirty name on submit when subscribed during render", async () => {
    const user = userEvent.setup();
    let captured: Record<string, unknown> = {};
    render(<DirtyFieldsSubscribed onSubmit={(d) => { captured = d; }} />);

    await user.clear(screen.getByLabelText("name"));
    await user.type(screen.getByLabelText("name"), "Bob");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(captured.name).toBe(true);
    });
  });
});
