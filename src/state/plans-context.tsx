import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { todayISO } from '../engine/format.ts';
import {
  createEmptyPlan,
  standardDeductionFor,
  defaultLcdOptions,
  sanitizePlan,
  type OptionInput,
  type Plan,
} from '../engine/plan.ts';
import { loadCurrentPlan, loadPlans, saveCurrentPlan, savePlans } from './storage.ts';
import { useSettings } from './settings-context.tsx';

interface PlansApi {
  plans: Plan[];
  current: Plan;
  updateCurrent: (patch: Partial<Plan>) => void;
  updateOption: (id: string, patch: Partial<OptionInput>) => void;
  addOption: () => void;
  removeOption: (id: string) => void;
  newPlan: () => void;
  resetNumbers: () => void;
  saveCurrent: () => void;
  openPlan: (id: string) => void;
  duplicatePlan: (id: string) => void;
  deletePlan: (id: string) => void;
}

const PlansContext = createContext<PlansApi | null>(null);

export function PlansProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const [plans, setPlans] = useState<Plan[]>(() => loadPlans().map(sanitizePlan));
  const [current, setCurrent] = useState<Plan>(() => {
    const stored = loadCurrentPlan();
    return sanitizePlan(stored ?? createEmptyPlan(settings, todayISO()));
  });

  useEffect(() => {
    savePlans(plans);
  }, [plans]);

  useEffect(() => {
    saveCurrentPlan(current);
  }, [current]);

  const touch = useCallback((plan: Plan): Plan => {
    return sanitizePlan({ ...plan, updatedAt: new Date().toISOString() });
  }, []);

  const updateCurrent = useCallback(
    (patch: Partial<Plan>) => {
      setCurrent((plan) => touch({ ...plan, ...patch }));
    },
    [touch],
  );

  const updateOption = useCallback(
    (id: string, patch: Partial<OptionInput>) => {
      setCurrent((plan) =>
        touch({
          ...plan,
          options: plan.options.map((option) => (option.id === id ? { ...option, ...patch } : option)),
        }),
      );
    },
    [touch],
  );

  const addOption = useCallback(() => {
    setCurrent((plan) => {
      if (plan.options.length >= 3) return plan;
      const hasFifty = plan.options.some((option) => option.writeOffRate === 0.5);
      const rate = hasFifty ? 0.3 : 0.5;
      return touch({
        ...plan,
        options: [
          ...plan.options,
          {
            id: crypto.randomUUID(),
            name: rate === 0.5 ? 'LCD (50)%' : 'LCD (30)%',
            lcd: 0,
            gasOil: 0,
            writeOffRate: rate,
          },
        ],
      });
    });
  }, [touch]);

  const removeOption = useCallback(
    (id: string) => {
      setCurrent((plan) => touch({ ...plan, options: plan.options.filter((option) => option.id !== id) }));
    },
    [touch],
  );

  const newPlan = useCallback(() => {
    setCurrent(createEmptyPlan(settings, todayISO()));
  }, [settings]);

  const resetNumbers = useCallback(() => {
    setCurrent((plan) =>
      touch({
        ...plan,
        agi: 0,
        standardDeduction: standardDeductionFor(settings, plan.clientStatus ?? 'single'),
        qbi: 0,
        planningFees: 0,
        options: defaultLcdOptions(),
      }),
    );
  }, [settings, touch]);

  const saveCurrent = useCallback(() => {
    const saved = touch(current);
    setCurrent(saved);
    setPlans((list) => {
      const exists = list.some((plan) => plan.id === saved.id);
      if (!exists) return [saved, ...list];
      return list.map((plan) => (plan.id === saved.id ? saved : plan));
    });
  }, [current, touch]);

  const openPlan = useCallback(
    (id: string) => {
      const plan = plans.find((item) => item.id === id);
      if (!plan) return;
      setCurrent(touch(structuredClone(plan)));
    },
    [plans, touch],
  );

  const duplicatePlan = useCallback((id: string) => {
    setPlans((list) => {
      const plan = list.find((item) => item.id === id);
      if (!plan) return list;
      const copy = sanitizePlan({
        ...structuredClone(plan),
        id: crypto.randomUUID(),
        clientName: plan.clientName.trim() ? `${plan.clientName.trim()} (copy)` : 'Untitled client (copy)',
        updatedAt: new Date().toISOString(),
      });
      return [copy, ...list];
    });
  }, []);

  const deletePlan = useCallback((id: string) => {
    setPlans((list) => list.filter((plan) => plan.id !== id));
  }, []);

  const api = useMemo(
    () => ({
      plans,
      current,
      updateCurrent,
      updateOption,
      addOption,
      removeOption,
      newPlan,
      resetNumbers,
      saveCurrent,
      openPlan,
      duplicatePlan,
      deletePlan,
    }),
    [
      plans,
      current,
      updateCurrent,
      updateOption,
      addOption,
      removeOption,
      newPlan,
      resetNumbers,
      saveCurrent,
      openPlan,
      duplicatePlan,
      deletePlan,
    ],
  );

  return <PlansContext.Provider value={api}>{children}</PlansContext.Provider>;
}

export function usePlans(): PlansApi {
  const value = useContext(PlansContext);
  if (!value) throw new Error('usePlans must be used within PlansProvider');
  return value;
}
