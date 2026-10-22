const {
  isRequesterAssigned,
  isShiftInFuture,
  areDistinctUsers,
  hasPendingSwap,
  canResolve,
  canTransition,
  validateSwapRequest,
} = require('../src/services/swapService');

const FIXED_NOW = new Date('2026-11-01T12:00:00Z');

describe('isRequesterAssigned', () => {
  it('is true when the user matches assignedTo', () => {
    expect(isRequesterAssigned({ assignedTo: 'u1' }, 'u1')).toBe(true);
  });
  it('is false when the user differs', () => {
    expect(isRequesterAssigned({ assignedTo: 'u1' }, 'u2')).toBe(false);
  });
  it('is false when the shift has no assignee', () => {
    expect(isRequesterAssigned({ assignedTo: null }, 'u1')).toBe(false);
  });
  it('is false when the shift is null', () => {
    expect(isRequesterAssigned(null, 'u1')).toBe(false);
  });
});

describe('isShiftInFuture', () => {
  it('is true for a shift after now', () => {
    const shift = { date: '2026-11-02', startTime: '09:00' };
    expect(isShiftInFuture(shift, FIXED_NOW)).toBe(true);
  });
  it('is false for a shift before now', () => {
    const shift = { date: '2026-10-30', startTime: '09:00' };
    expect(isShiftInFuture(shift, FIXED_NOW)).toBe(false);
  });
});

describe('areDistinctUsers', () => {
  it('is true for different ids', () => {
    expect(areDistinctUsers('a', 'b')).toBe(true);
  });
  it('is false for identical ids', () => {
    expect(areDistinctUsers('a', 'a')).toBe(false);
  });
});

describe('hasPendingSwap', () => {
  it('is true if any swap is pending', () => {
    expect(hasPendingSwap([{ status: 'rejected' }, { status: 'pending' }])).toBe(true);
  });
  it('is false if none are pending', () => {
    expect(hasPendingSwap([{ status: 'accepted' }])).toBe(false);
  });
  it('is false for an empty list', () => {
    expect(hasPendingSwap([])).toBe(false);
  });
});

describe('canResolve', () => {
  it('is true for manager and owner', () => {
    expect(canResolve('manager')).toBe(true);
    expect(canResolve('owner')).toBe(true);
  });
  it('is false for staff', () => {
    expect(canResolve('staff')).toBe(false);
  });
});

describe('canTransition', () => {
  it('allows pending → accepted/rejected/cancelled', () => {
    expect(canTransition('pending', 'accepted')).toBe(true);
    expect(canTransition('pending', 'rejected')).toBe(true);
    expect(canTransition('pending', 'cancelled')).toBe(true);
  });
  it('rejects transitions from non-pending states', () => {
    expect(canTransition('accepted', 'rejected')).toBe(false);
    expect(canTransition('rejected', 'accepted')).toBe(false);
  });
  it('rejects transitions to invalid statuses', () => {
    expect(canTransition('pending', 'garbage')).toBe(false);
  });
});

describe('validateSwapRequest', () => {
  const FIXED_NOW = new Date('2026-10-01T12:00:00Z');
  const baseShift = {
    _id: 'shift1',
    assignedTo: 'u1',
    date: '2026-11-02',
    startTime: '09:00',
  };

  it('rejects a missing shift', () => {
    const err = validateSwapRequest({
      shift: null, requesterId: 'u1', toUserId: 'u2', now: FIXED_NOW,
    });
    expect(err.status).toBe(404);
    expect(err.error).toMatch(/not found/i);
  });

  it('rejects when requester is not the assignee', () => {
    const err = validateSwapRequest({
      shift: baseShift, requesterId: 'u3', toUserId: 'u2', existingSwaps: [], now: FIXED_NOW,
    });
    expect(err.status).toBe(403);
    expect(err.error).toMatch(/not assigned/i);
  });

  it('rejects self-swap', () => {
    const err = validateSwapRequest({
      shift: baseShift, requesterId: 'u1', toUserId: 'u1', existingSwaps: [], now: FIXED_NOW,
    });
    expect(err.status).toBe(400);
    expect(err.error).toMatch(/yourself/i);
  });

  it('rejects a past shift', () => {
    const past = { ...baseShift, date: '2020-01-01' };
    const err = validateSwapRequest({
      shift: past, requesterId: 'u1', toUserId: 'u2', existingSwaps: [], now: FIXED_NOW,
    });
    expect(err.status).toBe(400);
    expect(err.error).toMatch(/already started/i);
  });

  it('rejects when a pending swap already exists', () => {
    const err = validateSwapRequest({
      shift: baseShift, requesterId: 'u1', toUserId: 'u2',
      existingSwaps: [{ status: 'pending' }], now: FIXED_NOW,
    });
    expect(err.status).toBe(409);
    expect(err.error).toMatch(/pending swap/i);
  });
});