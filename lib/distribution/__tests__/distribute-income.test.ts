import { distributeIncome } from '@/lib/distribution';
import type { AppState, Debt, MonthlyCoverage } from '@/types/models';
import { roundPLN } from '@/lib/distribution/helpers';

/**
 * Build a minimal valid AppState for testing, with overrides.
 */
function makeState(overrides: Partial<AppState> = {}): AppState {
  return {
    schemaVersion: 1,
    installationDate: '2024-01-01',
    onboardingCompleted: true,
    monthlyNeeds: { housing: 0, food: 0, transport: 0, other: 0 },
    debts: [],
    incomes: [],
    deferredPayments: [],
    monthlyCoverage: [],
    realityChecks: [],
    settings: {
      currency: 'PLN',
      locale: 'pl',
      lastRealityCheckAt: null,
      tier1PriorityOrder: 'food_first',
    },
    ...overrides,
  };
}

/**
 * Build a minimal valid Debt for testing, with overrides.
 */
function makeDebt(overrides: Partial<Debt> = {}): Debt {
  return {
    id: 'debt-1',
    label: 'Test Debt',
    type: 'credit',
    creditorKind: 'bank',
    originalAmount: 1000,
    remainingAmount: 1000,
    minimumPayment: 200,
    interestRate: 0,
    createdAt: '2024-01-01',
    closedAt: null,
    ...overrides,
  };
}

/**
 * Sum all allocations from a distribution result.
 */
function totalAllocated(alloc: ReturnType<typeof distributeIncome>): number {
  const { needs, minimumPayments, extraDebtPayment, deferredPayments } = alloc;
  let total = deferredPayments;
  total += needs.housing + needs.food + needs.transport + needs.other;
  total += Object.values(minimumPayments).reduce((s, v) => s + v, 0);
  if (extraDebtPayment) total += extraDebtPayment.amount;
  return roundPLN(total);
}

describe('distributeIncome', () => {
  const testDate = new Date('2024-06-15');

  // ─── Zero income ────────────────────────────────────────────────────
  it('should return empty allocation when income is 0', () => {
    const state = makeState();
    const result = distributeIncome(0, state, testDate);

    expect(result.needs.housing).toBe(0);
    expect(result.needs.food).toBe(0);
    expect(result.needs.transport).toBe(0);
    expect(result.needs.other).toBe(0);
    expect(result.minimumPayments).toEqual({});
    expect(result.extraDebtPayment).toBeNull();
    expect(result.unallocated).toBe(0);
  });

  // ─── Negative income ───────────────────────────────────────────────
  it('should return empty allocation when income is negative', () => {
    const state = makeState();
    const result = distributeIncome(-500, state, testDate);

    expect(result.needs.housing).toBe(0);
    expect(result.unallocated).toBe(0);
    expect(result.extraDebtPayment).toBeNull();
  });

  // ─── Test 8: Debt minimums proportional consistency ─────────────────
  it('should allocate debt minimums proportionally when income is insufficient', () => {
    const state = makeState({
      debts: [
        makeDebt({ id: 'debt_A', label: 'A', minimumPayment: 200, remainingAmount: 1000 }),
        makeDebt({ id: 'debt_B', label: 'B', minimumPayment: 300, remainingAmount: 2000 }),
      ],
    });

    const result = distributeIncome(100, state, testDate);

    // needs are all 0, so 100 goes to Step 3 (debt minimums)
    // total minimums = 500, available = 100
    // A: 100 * 200/500 = 40, B: 100 - 40 = 60
    expect(result.minimumPayments['debt_A']).toBe(40);
    expect(result.minimumPayments['debt_B']).toBe(60);
    expect(roundPLN(result.minimumPayments['debt_A'] + result.minimumPayments['debt_B'])).toBe(100);
  });

  // ─── Sufficient income for all tiers + snowball ─────────────────────
  it('should cover all tiers and apply snowball when income is sufficient', () => {
    const state = makeState({
      monthlyNeeds: { housing: 2000, food: 1000, transport: 500, other: 300 },
      debts: [
        makeDebt({ id: 'd1', label: 'Small', remainingAmount: 500, minimumPayment: 100 }),
        makeDebt({ id: 'd2', label: 'Big', remainingAmount: 5000, minimumPayment: 300 }),
      ],
    });

    const result = distributeIncome(10000, state, testDate);

    expect(result.needs.housing).toBe(2000);
    expect(result.needs.food).toBe(1000);
    expect(result.minimumPayments['d1']).toBe(100);
    expect(result.minimumPayments['d2']).toBe(300);
    expect(result.needs.transport).toBe(500);
    expect(result.needs.other).toBe(300);

    // Snowball: smallest remaining is d1 (500), already paid 100 minimum
    // max extra = 500 - 100 = 400
    // remaining after tiers = 10000 - 2000 - 1000 - 100 - 300 - 500 - 300 = 5800
    // snowball gets min(5800, 400) = 400
    expect(result.extraDebtPayment).not.toBeNull();
    expect(result.extraDebtPayment!.debtId).toBe('d1');
    expect(result.extraDebtPayment!.amount).toBe(400);

    // unallocated = 5800 - 400 = 5400
    expect(result.unallocated).toBe(5400);
  });

  // ─── Deficit at Tier 1 — both categories get non-zero ──────────────
  it('should give both housing and food non-zero allocations when income only partially covers Tier 1', () => {
    const state = makeState({
      monthlyNeeds: { housing: 1000, food: 800, transport: 500, other: 300 },
    });

    const result = distributeIncome(566, state, testDate);

    // Floor+Waterfall: housing floor = 600, food floor = 400
    // sumFloors=1000, 566 < 1000 => fallback proportional
    // housing: 566 * 600/1000 = 339.6
    // food: 566 - 339.6 = 226.4
    expect(result.needs.housing).toBe(339.6);
    expect(result.needs.food).toBe(226.4);
    expect(result.needs.housing).toBeGreaterThan(0);
    expect(result.needs.food).toBeGreaterThan(0);

    // Nothing left for lower tiers
    expect(result.needs.transport).toBe(0);
    expect(result.needs.other).toBe(0);
    expect(result.unallocated).toBe(0);
  });

  // ─── Partial Tier 1 + partial Tier 2 ───────────────────────────────
  it('should progress through tiers and partially cover Tier 2 when income bridges both', () => {
    const state = makeState({
      monthlyNeeds: { housing: 500, food: 300, transport: 400, other: 200 },
      debts: [
        makeDebt({ id: 'd1', label: 'D1', remainingAmount: 2000, minimumPayment: 100 }),
      ],
    });

    // Tier 1: housing(500) + food(300) = 800
    // Tier 2 (Step 3): min payment = 100
    // Tier 3 (Step 4): transport(400) + other(200) = 600
    // Total needed before snowball: 800 + 100 + 600 = 1500
    // Income: 1100 => covers Tier 1 (800) + Tier 2 (100) + partial Tier 3 (200)
    const result = distributeIncome(1100, state, testDate);

    expect(result.needs.housing).toBe(500);
    expect(result.needs.food).toBe(300);
    expect(result.minimumPayments['d1']).toBe(100);

    // Tier 3: transport floor=0.3*400=120, other floor=0
    // remaining = 1100 - 800 - 100 = 200
    // sumFloors = 120 + 0 = 120, 200 >= 120
    // pass 1: transport=120, other=0, rem=80
    // waterfall: transport(pri=1) needs 280 more, gets 80 => transport=200
    // other(pri=2) gets nothing
    expect(result.needs.transport).toBe(200);
    expect(result.needs.other).toBe(0);
    expect(result.unallocated).toBe(0);
  });

  // ─── food_first vs housing_first settings ──────────────────────────
  it('should allocate more to food in waterfall when food_first is set', () => {
    const state = makeState({
      monthlyNeeds: { housing: 1000, food: 800, transport: 0, other: 0 },
      settings: {
        currency: 'PLN',
        locale: 'pl',
        lastRealityCheckAt: null,
        tier1PriorityOrder: 'food_first',
      },
    });

    // housing floor=600, food floor=400, sumFloors=1000
    // available=1200, remainder=200
    // food_first => food priority=1, housing priority=2
    // waterfall: food gets 200 (needs 400 more) => food=600
    // housing stays at floor=600
    const foodFirst = distributeIncome(1200, state, testDate);

    expect(foodFirst.needs.food).toBe(600);
    expect(foodFirst.needs.housing).toBe(600);
  });

  it('should allocate more to housing in waterfall when housing_first is set', () => {
    const state = makeState({
      monthlyNeeds: { housing: 1000, food: 800, transport: 0, other: 0 },
      settings: {
        currency: 'PLN',
        locale: 'pl',
        lastRealityCheckAt: null,
        tier1PriorityOrder: 'housing_first',
      },
    });

    // housing floor=600, food floor=400, sumFloors=1000
    // available=1200, remainder=200
    // housing_first => housing priority=1, food priority=2
    // waterfall: housing gets 200 (needs 400 more) => housing=800
    // food stays at floor=400
    const housingFirst = distributeIncome(1200, state, testDate);

    expect(housingFirst.needs.housing).toBe(800);
    expect(housingFirst.needs.food).toBe(400);
  });

  // ─── floorOverrides ────────────────────────────────────────────────
  it('should respect floorOverrides when distributing within a tier', () => {
    const state = makeState({
      monthlyNeeds: { housing: 1000, food: 800, transport: 0, other: 0 },
      settings: {
        currency: 'PLN',
        locale: 'pl',
        lastRealityCheckAt: null,
        tier1PriorityOrder: 'food_first',
        floorOverrides: { housing: 700 },
      },
    });

    // housing floor overridden to 700 (clamped to min(700,1000)=700)
    // food floor default = 0.5 * 800 = 400
    // sumFloors = 1100, available=566 < 1100 => fallback
    // housing: 566 * 700/1100 = 360.18
    // food: 566 - 360.18 = 205.82
    const result = distributeIncome(566, state, testDate);

    expect(result.needs.housing).toBe(360.18);
    expect(result.needs.food).toBe(205.82);
  });

  // ─── Invariant: sum(allocations) + unallocated == income ────────────
  it('should satisfy invariant: total allocated + unallocated == income', () => {
    const state = makeState({
      monthlyNeeds: { housing: 2000, food: 1000, transport: 500, other: 300 },
      debts: [
        makeDebt({ id: 'd1', label: 'A', remainingAmount: 1500, minimumPayment: 200 }),
        makeDebt({ id: 'd2', label: 'B', remainingAmount: 3000, minimumPayment: 150 }),
      ],
    });

    const income = 5555.55;
    const result = distributeIncome(income, state, testDate);

    const total = roundPLN(totalAllocated(result) + result.unallocated);
    expect(total).toBe(income);
  });

  // ─── With existing monthlyCoverage ─────────────────────────────────
  it('should reduce outstanding needs by existing monthly coverage', () => {
    const coverage: MonthlyCoverage = {
      month: '2024-06',
      needs: { housing: 1500, food: 500, transport: 0, other: 0 },
      minimumPayments: {},
    };

    const state = makeState({
      monthlyNeeds: { housing: 2000, food: 1000, transport: 500, other: 300 },
      monthlyCoverage: [coverage],
    });

    // Outstanding: housing=500, food=500, transport=500, other=300
    // housing floor = 0.6*500=300, food floor = 0.5*500=250
    // sumFloors=550, available=2000 >= 550
    // pass 1: housing=300, food=250, rem=1450
    // waterfall (food_first): food needs 250 more, gets 250 => food=500, rem=1200
    //                         housing needs 200 more, gets 200 => housing=500, rem=1000
    const result = distributeIncome(2000, state, testDate);

    expect(result.needs.housing).toBe(500);
    expect(result.needs.food).toBe(500);
    expect(result.needs.transport).toBe(500);
    expect(result.needs.other).toBe(300);
    // remaining = 2000 - 500 - 500 - 500 - 300 = 200, no debts -> unallocated
    expect(result.unallocated).toBe(200);
  });

  // ─── No debts: skip steps 3 and 5 ─────────────────────────────────
  it('should skip debt steps and allocate only to needs when no debts exist', () => {
    const state = makeState({
      monthlyNeeds: { housing: 1000, food: 500, transport: 200, other: 100 },
    });

    const result = distributeIncome(3000, state, testDate);

    expect(result.needs.housing).toBe(1000);
    expect(result.needs.food).toBe(500);
    expect(result.needs.transport).toBe(200);
    expect(result.needs.other).toBe(100);
    expect(result.minimumPayments).toEqual({});
    expect(result.extraDebtPayment).toBeNull();
    expect(result.unallocated).toBe(1200);
  });

  // ─── All debts fully paid ──────────────────────────────────────────
  it('should skip debt steps when all debts have remainingAmount=0', () => {
    const state = makeState({
      monthlyNeeds: { housing: 500, food: 300, transport: 0, other: 0 },
      debts: [
        makeDebt({ id: 'd1', label: 'Paid', remainingAmount: 0, minimumPayment: 100 }),
      ],
    });

    const result = distributeIncome(1000, state, testDate);

    expect(result.minimumPayments).toEqual({});
    expect(result.extraDebtPayment).toBeNull();
    expect(result.unallocated).toBe(200);
  });

  // ─── Snowball targets smallest balance ─────────────────────────────
  it('should direct snowball extra payment to the debt with smallest remaining balance', () => {
    const state = makeState({
      debts: [
        makeDebt({ id: 'd1', label: 'Big', remainingAmount: 5000, minimumPayment: 100 }),
        makeDebt({ id: 'd2', label: 'Small', remainingAmount: 200, minimumPayment: 50 }),
        makeDebt({ id: 'd3', label: 'Medium', remainingAmount: 1000, minimumPayment: 75 }),
      ],
    });

    // minimums: d1=100, d2=50, d3=75 = 225
    // remaining after minimums = 1000 - 225 = 775
    // snowball target = d2 (smallest: 200)
    // max extra for d2 = 200 - 50 = 150
    // snowball amount = min(775, 150) = 150
    const result = distributeIncome(1000, state, testDate);

    expect(result.extraDebtPayment).not.toBeNull();
    expect(result.extraDebtPayment!.debtId).toBe('d2');
    expect(result.extraDebtPayment!.amount).toBe(150);
    expect(result.unallocated).toBe(625);
  });

  // ─── Snowball tie-breaking: alphabetical by label ──────────────────
  it('should break snowball ties alphabetically by label', () => {
    const state = makeState({
      debts: [
        makeDebt({ id: 'd1', label: 'Zebra', remainingAmount: 500, minimumPayment: 50 }),
        makeDebt({ id: 'd2', label: 'Alpha', remainingAmount: 500, minimumPayment: 50 }),
      ],
    });

    const result = distributeIncome(2000, state, testDate);

    // Both have same remainingAmount=500, alphabetical: Alpha < Zebra
    expect(result.extraDebtPayment!.debtId).toBe('d2'); // Alpha
  });

  // ─── Minimum payment cap: don't pay more than totalOwed ────────────
  it('should cap minimum payment at remainingAmount when minimum exceeds balance', () => {
    const state = makeState({
      debts: [
        makeDebt({ id: 'd1', label: 'Almost Done', remainingAmount: 50, minimumPayment: 200 }),
      ],
    });

    // effective minimum = min(200, 50) = 50
    const result = distributeIncome(1000, state, testDate);

    expect(result.minimumPayments['d1']).toBe(50);
    // snowball: target is d1 (only debt), max extra = 50 - 50 = 0
    expect(result.extraDebtPayment).toBeNull();
    expect(result.unallocated).toBe(950);
  });

  // ─── All needs already covered this month ──────────────────────────
  it('should skip needs allocation when coverage already equals needs', () => {
    const coverage: MonthlyCoverage = {
      month: '2024-06',
      needs: { housing: 2000, food: 1000, transport: 500, other: 300 },
      minimumPayments: {},
    };

    const state = makeState({
      monthlyNeeds: { housing: 2000, food: 1000, transport: 500, other: 300 },
      monthlyCoverage: [coverage],
      debts: [
        makeDebt({ id: 'd1', label: 'D1', remainingAmount: 1000, minimumPayment: 200 }),
      ],
    });

    const result = distributeIncome(500, state, testDate);

    // All needs outstanding = 0
    expect(result.needs.housing).toBe(0);
    expect(result.needs.food).toBe(0);
    expect(result.needs.transport).toBe(0);
    expect(result.needs.other).toBe(0);

    // All income goes to debt: minimum=200, remaining=300 for snowball
    expect(result.minimumPayments['d1']).toBe(200);
    expect(result.extraDebtPayment).not.toBeNull();
    expect(result.extraDebtPayment!.debtId).toBe('d1');
    expect(result.extraDebtPayment!.amount).toBe(300);
    expect(result.unallocated).toBe(0);
  });

  // ─── Closed debts are excluded ─────────────────────────────────────
  it('should ignore closed debts in minimum payments and snowball', () => {
    const state = makeState({
      debts: [
        makeDebt({ id: 'd1', label: 'Closed', remainingAmount: 500, minimumPayment: 100, closedAt: '2024-05-01' }),
        makeDebt({ id: 'd2', label: 'Active', remainingAmount: 300, minimumPayment: 50 }),
      ],
    });

    const result = distributeIncome(1000, state, testDate);

    expect(result.minimumPayments['d1']).toBeUndefined();
    expect(result.minimumPayments['d2']).toBe(50);
    expect(result.extraDebtPayment!.debtId).toBe('d2');
  });

  // ─── Income only enough for partial debt minimums ──────────────────
  it('should proportionally split across debts when income is less than total minimums', () => {
    const state = makeState({
      debts: [
        makeDebt({ id: 'd1', label: 'A', remainingAmount: 5000, minimumPayment: 400 }),
        makeDebt({ id: 'd2', label: 'B', remainingAmount: 3000, minimumPayment: 600 }),
      ],
    });

    // total minimums = 1000, available = 500
    // d1: 500 * 400/1000 = 200
    // d2: 500 - 200 = 300
    const result = distributeIncome(500, state, testDate);

    expect(result.minimumPayments['d1']).toBe(200);
    expect(result.minimumPayments['d2']).toBe(300);
    expect(result.unallocated).toBe(0);
    expect(result.extraDebtPayment).toBeNull();
  });

  // ─── Large surplus stays as unallocated ────────────────────────────
  it('should leave surplus as unallocated after snowball fully covers target', () => {
    const state = makeState({
      monthlyNeeds: { housing: 100, food: 100, transport: 0, other: 0 },
      debts: [
        makeDebt({ id: 'd1', label: 'Only', remainingAmount: 50, minimumPayment: 50 }),
      ],
    });

    // Tier 1: 200, Tier 2: min=50 (capped at 50), Tier 3: 0
    // remaining = 10000 - 200 - 50 = 9750
    // snowball target d1: max extra = 50 - 50 = 0
    // no snowball possible
    const result = distributeIncome(10000, state, testDate);

    expect(result.extraDebtPayment).toBeNull();
    expect(result.unallocated).toBe(9750);
  });

  // ─── Existing minimum payment coverage reduces outstanding ─────────
  it('should subtract existing minimum payment coverage from required minimums', () => {
    const coverage: MonthlyCoverage = {
      month: '2024-06',
      needs: { housing: 0, food: 0, transport: 0, other: 0 },
      minimumPayments: { 'd1': 150 },
    };

    const state = makeState({
      monthlyCoverage: [coverage],
      debts: [
        makeDebt({ id: 'd1', label: 'D1', remainingAmount: 1000, minimumPayment: 200 }),
      ],
    });

    // Outstanding minimum: 200 - 150 = 50
    const result = distributeIncome(1000, state, testDate);

    expect(result.minimumPayments['d1']).toBe(50);
    // snowball: max extra = 1000 - 50 - 150 = 800
    // remaining after min = 1000 - 50 = 950
    expect(result.extraDebtPayment!.debtId).toBe('d1');
    expect(result.extraDebtPayment!.amount).toBe(800);
    expect(result.unallocated).toBe(150);
  });

  // ─── Determinism: same inputs always produce same outputs ──────────
  it('should produce identical results for identical inputs', () => {
    const state = makeState({
      monthlyNeeds: { housing: 1500, food: 800, transport: 400, other: 200 },
      debts: [
        makeDebt({ id: 'd1', label: 'A', remainingAmount: 2000, minimumPayment: 150 }),
        makeDebt({ id: 'd2', label: 'B', remainingAmount: 1000, minimumPayment: 100 }),
      ],
    });

    const r1 = distributeIncome(3333.33, state, testDate);
    const r2 = distributeIncome(3333.33, state, testDate);

    expect(r1).toEqual(r2);
  });
});
