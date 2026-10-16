const {
  toMinutes,
  shiftDurationMinutes,
  hasOverlap,
  findConflict,
  weeklyHours,
  wouldCauseOvertime,
} = require('../src/services/shiftService');

describe('toMinutes', () => {
  it('converts HH:MM to minutes since midnight', () => {
    expect(toMinutes('00:00')).toBe(0);
    expect(toMinutes('09:30')).toBe(570);
    expect(toMinutes('23:59')).toBe(1439);
  });

  it('throws on malformed input', () => {
    expect(() => toMinutes('9:30')).toThrow();
    expect(() => toMinutes('25:00')).toThrow();
    expect(() => toMinutes('12:60')).toThrow();
    expect(() => toMinutes(930)).toThrow();
  });

  it('throws when hours are out of range but format is valid', () => {
    expect(() => toMinutes('24:00')).toThrow();
  });
});

describe('shiftDurationMinutes', () => {
  it('returns the duration in minutes', () => {
    expect(shiftDurationMinutes({ startTime: '09:00', endTime: '17:00' })).toBe(480);
    expect(shiftDurationMinutes({ startTime: '22:00', endTime: '23:30' })).toBe(90);
  });
});

describe('hasOverlap', () => {
  const base = { date: '2026-11-01', startTime: '10:00', endTime: '14:00' };

  it('returns false for different dates', () => {
    const other = { date: '2026-11-02', startTime: '10:00', endTime: '14:00' };
    expect(hasOverlap(base, other)).toBe(false);
  });

  it('returns true when intervals partially overlap', () => {
    const other = { date: '2026-11-01', startTime: '13:00', endTime: '16:00' };
    expect(hasOverlap(base, other)).toBe(true);
  });

  it('returns true when one interval contains the other', () => {
    const other = { date: '2026-11-01', startTime: '11:00', endTime: '12:00' };
    expect(hasOverlap(base, other)).toBe(true);
  });

  it('returns false when intervals touch but do not overlap', () => {
    const after = { date: '2026-11-01', startTime: '14:00', endTime: '18:00' };
    const before = { date: '2026-11-01', startTime: '06:00', endTime: '10:00' };
    expect(hasOverlap(base, after)).toBe(false);
    expect(hasOverlap(base, before)).toBe(false);
  });
});

describe('findConflict', () => {
  const existing = [
    { _id: 'a', date: '2026-11-01', startTime: '09:00', endTime: '13:00' },
    { _id: 'b', date: '2026-11-01', startTime: '15:00', endTime: '19:00' },
  ];

  it('returns the first conflicting shift', () => {
    const candidate = { date: '2026-11-01', startTime: '12:00', endTime: '16:00' };
    expect(findConflict(candidate, existing)._id).toBe('a');
  });

  it('returns null when there is no conflict', () => {
    const candidate = { date: '2026-11-01', startTime: '13:00', endTime: '15:00' };
    expect(findConflict(candidate, existing)).toBeNull();
  });

  it('skips the shift against itself when updating', () => {
    const candidate = { _id: 'a', date: '2026-11-01', startTime: '09:00', endTime: '13:00' };
    expect(findConflict(candidate, existing)).toBeNull();
  });
});

describe('weeklyHours', () => {
  it('sums durations across shifts', () => {
    const shifts = [
      { startTime: '09:00', endTime: '17:00' },
      { startTime: '10:00', endTime: '14:00' },
    ];
    expect(weeklyHours(shifts)).toBe(12);
  });

  it('returns 0 for an empty list', () => {
    expect(weeklyHours([])).toBe(0);
  });
});

describe('wouldCauseOvertime', () => {
  const monday = '2026-11-02';

  it('is false when the total stays under 40', () => {
    const existing = [
      { date: '2026-11-03', startTime: '09:00', endTime: '17:00' },
    ];
    const candidate = { date: monday, startTime: '09:00', endTime: '17:00' };
    expect(wouldCauseOvertime(candidate, existing)).toBe(false);
  });

  it('is true when the total exceeds 40', () => {
    const existing = Array.from({ length: 4 }, (_, i) => ({
      date: `2026-11-0${i + 3}`,
      startTime: '09:00',
      endTime: '17:00',
    }));
    const candidate = { date: monday, startTime: '09:00', endTime: '17:00' };
    expect(wouldCauseOvertime(candidate, existing)).toBe(false);

    const longer = { date: monday, startTime: '09:00', endTime: '18:00' };
    expect(wouldCauseOvertime(longer, existing)).toBe(true);
  });

  it('ignores shifts outside the candidate week', () => {
    const existing = [
      { date: '2026-10-26', startTime: '09:00', endTime: '17:00' },
    ];
    const candidate = { date: monday, startTime: '09:00', endTime: '17:00' };
    expect(wouldCauseOvertime(candidate, existing)).toBe(false);
  });
});