import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { useEffect, useRef } from "react";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import { ChildDobPicker } from "@/components/child-dob-picker";
import {
  buildChildHydrationKey,
  childFormResetValuesEqual,
  infantFormNormalizationPatches,
} from "@/lib/child-form-hydration";
import { resetChildFormRenderCounts, getChildFormRenderCounts } from "@/lib/child-form-debug";

type FormValues = {
  dob: string;
  educationStage?: string;
  scheduleKnown?: boolean;
  name: string;
};

/** Minimal repro of ChildForm infant + hydration + picker wiring. */
function ChildFormLoopHarness({
  childDob,
  parentCountry,
  refetchTick,
}: {
  childDob: string;
  parentCountry: string;
  refetchTick: number;
}) {
  const form = useForm<FormValues>({
    defaultValues: {
      dob: "",
      educationStage: "school",
      scheduleKnown: true,
      name: "Mia",
    },
  });
  const hydrationKeyRef = useRef<string | null>(null);
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  const dob = useWatch({ control: form.control, name: "dob" });
  const totalMonths = dob
    ? (() => {
        const birth = new Date(`${dob}T00:00:00`);
        const now = new Date("2026-06-06T00:00:00");
        return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
      })()
    : 0;
  const isInfant = Boolean(dob) && totalMonths < 12;

  // Simulates react-query refetch with new object identity, stable hydration key.
  useEffect(() => {
    const hydrationKey = buildChildHydrationKey(1, childDob, parentCountry);
    if (hydrationKeyRef.current === hydrationKey) return;
    hydrationKeyRef.current = hydrationKey;

    const next = {
      name: "Mia",
      dob: childDob,
      educationStage: isInfant ? "at_home" : "school",
      scheduleKnown: isInfant ? false : true,
      childClass: "",
      wakeUpTime: "07:00",
      sleepTime: "21:00",
      schoolStartTime: "08:00",
      schoolEndTime: "15:00",
      schoolDays: [1, 2, 3, 4, 5],
      travelMode: "car",
      travelModeOther: "",
      foodType: "veg",
      goals: "",
      babysitterId: undefined,
    };
    const current = form.getValues() as FormValues & Record<string, unknown>;
    if (!childFormResetValuesEqual(current as never, next as never)) {
      form.reset(next);
    }
  }, [childDob, parentCountry, refetchTick, form, isInfant]);

  useEffect(() => {
    if (!isInfant) return;
    const patches = infantFormNormalizationPatches(isInfant, {
      educationStage: form.getValues("educationStage"),
      scheduleKnown: form.getValues("scheduleKnown"),
    });
    if (patches?.educationStage) {
      form.setValue("educationStage", patches.educationStage, { shouldDirty: false });
    }
    if (patches?.scheduleKnown === false) {
      form.setValue("scheduleKnown", false, { shouldDirty: false });
    }
  }, [isInfant, dob, form]);

  return (
    <FormProvider {...form}>
      <ChildDobPicker value={dob} onChange={(v) => form.setValue("dob", v)} max="2026-06-06" />
      <span data-testid="renders">{renderCountRef.current}</span>
    </FormProvider>
  );
}

describe("child form render loop harness", () => {
  beforeEach(() => {
    resetChildFormRenderCounts();
    vi.stubGlobal("import", { meta: { env: { DEV: false } } });
  });

  it("edit infant: stable across react-query refetches without runaway renders", async () => {
    const { rerender, getByTestId } = render(
      <ChildFormLoopHarness childDob="2025-08-01" parentCountry="IN" refetchTick={0} />,
    );

    await act(async () => {
      rerender(<ChildFormLoopHarness childDob="2025-08-01" parentCountry="IN" refetchTick={1} />);
      rerender(<ChildFormLoopHarness childDob="2025-08-01" parentCountry="IN" refetchTick={2} />);
      rerender(<ChildFormLoopHarness childDob="2025-08-01" parentCountry="IN" refetchTick={3} />);
    });

    const renders = Number(getByTestId("renders").textContent);
    expect(renders).toBeLessThan(25);
    expect(getChildFormRenderCounts().get("ChildDobPicker render") ?? 0).toBeLessThan(25);
  });

  it("edit toddler: DOB change does not loop", async () => {
    const { rerender, getByTestId } = render(
      <ChildFormLoopHarness childDob="2022-03-10" parentCountry="IN" refetchTick={0} />,
    );

    await act(async () => {
      rerender(<ChildFormLoopHarness childDob="2022-03-10" parentCountry="IN" refetchTick={1} />);
    });

    const renders = Number(getByTestId("renders").textContent);
    expect(renders).toBeLessThan(20);
  });

  it("parent country load patches once without reset loop", async () => {
    const { rerender, getByTestId } = render(
      <ChildFormLoopHarness childDob="2019-05-15" parentCountry="IN" refetchTick={0} />,
    );

    await act(async () => {
      rerender(<ChildFormLoopHarness childDob="2019-05-15" parentCountry="US" refetchTick={1} />);
      rerender(<ChildFormLoopHarness childDob="2019-05-15" parentCountry="US" refetchTick={2} />);
    });

    const renders = Number(getByTestId("renders").textContent);
    expect(renders).toBeLessThan(25);
  });
});
