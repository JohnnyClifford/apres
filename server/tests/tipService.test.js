const {
  distributeCents,
  calculateHours,
  calculateRoleWeighted,
  calculateHybrid,
} = require('../src/services/tipService');

describe('distributeCents (Largest Remainder Method)', () => {
  it('distributes evenly when weights are equal and division is exact', () => {
    const allocations = [
      { userId: 'a', weight: 10 },
      { userId: 'b', weight: 10 },
    ];
    const res = distributeCents(2000, allocations);
    expect(res).toEqual([
      { userId: 'a', amountCents: 1000 },
      { userId: 'b', amountCents: 1000 },
    ]);
  });

  it('handles fractional remainders and distributes leftover cents', () => {
    // $10.00 split 3 ways = 3.333... each
    const allocations = [
      { userId: 'c', weight: 1 },
      { userId: 'a', weight: 1 },
      { userId: 'b', weight: 1 },
    ];
    const res = distributeCents(1000, allocations);
    
    // Total must equal exactly 1000
    const total = res.reduce((sum, r) => sum + r.amountCents, 0);
    expect(total).toBe(1000);

    // Exact maths is 333.333...
    // Sorted by user ID for tie-breaking: a, b, c
    // 'a' gets 334, 'b' gets 333, 'c' gets 333
    expect(res).toEqual([
      { userId: 'c', amountCents: 333 },
      { userId: 'a', amountCents: 334 },
      { userId: 'b', amountCents: 333 },
    ]);
  });

  it('breaks ties deterministically by userId', () => {
    const allocations = [
      { userId: 'b', weight: 1 },
      { userId: 'a', weight: 1 },
    ];
    const res = distributeCents(101, allocations);
    expect(res).toEqual([
      { userId: 'b', amountCents: 50 },
      { userId: 'a', amountCents: 51 },
    ]);
  });

  it('handles zero tips or zero weights safely', () => {
    expect(distributeCents(0, [{ userId: 'a', weight: 5 }])[0].amountCents).toBe(0);
    expect(distributeCents(100, [{ userId: 'a', weight: 0 }])[0].amountCents).toBe(0);
  });
});

describe('calculateHours', () => {
  it('distributes based on hours worked', () => {
    const shifts = [
      { userId: 'a', hours: 8 },
      { userId: 'b', hours: 4 },
    ];
    const res = calculateHours(3000, shifts);
    expect(res).toEqual([
      { userId: 'a', amountCents: 2000 },
      { userId: 'b', amountCents: 1000 },
    ]);
  });
});

describe('calculateRoleWeighted', () => {
  it('applies role multipliers to hours', () => {
    const shifts = [
      { userId: 'mgr', role: 'manager', hours: 10 },
      { userId: 'stf', role: 'staff', hours: 10 },
    ];
    const weights = { manager: 1.5, staff: 1.0 };
    
    // $25.00 total.
    // mgr: 10 * 1.5 = 15 weight
    // stf: 10 * 1.0 = 10 weight
    // Total weight = 25.
    // mgr gets 15/25 = 60% = $15.00 (1500)
    // stf gets 10/25 = 40% = $10.00 (1000)
    const res = calculateRoleWeighted(2500, shifts, weights);
    expect(res).toEqual([
      { userId: 'mgr', amountCents: 1500 },
      { userId: 'stf', amountCents: 1000 },
    ]);
  });

  it('defaults missing roles to 1.0', () => {
    const shifts = [{ userId: 'x', role: 'unknown', hours: 10 }];
    const res = calculateRoleWeighted(1000, shifts, { manager: 2.0 });
    expect(res[0].amountCents).toBe(1000);
  });
});

describe('calculateHybrid', () => {
  it('gives base per shift, then splits remainder by hours', () => {
    const shifts = [
      { userId: 'a', hours: 8 },
      { userId: 'b', hours: 4 },
    ];
    // Base = $10.00 ($1000) per shift.
    // Base Total = $20.00 ($2000).
    // Total pool = $50.00 ($5000).
    // Remainder pool = $30.00 ($3000).
    // Remainder split by hours: 'a' gets 2/3 ($20), 'b' gets 1/3 ($10).
    // Final: a = $10 base + $20 remainder = $30 (3000)
    // Final: b = $10 base + $10 remainder = $20 (2000)
    const res = calculateHybrid(5000, shifts, 1000);
    expect(res).toEqual([
      { userId: 'a', amountCents: 3000 },
      { userId: 'b', amountCents: 2000 },
    ]);
  });

  it('falls back to hours if base exceeds total', () => {
    const shifts = [
      { userId: 'a', hours: 10 },
      { userId: 'b', hours: 10 },
    ];
    const res = calculateHybrid(1000, shifts, 1000);
    expect(res).toEqual([
      { userId: 'a', amountCents: 500 },
      { userId: 'b', amountCents: 500 },
    ]);
  });
});