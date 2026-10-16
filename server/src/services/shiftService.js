const MINUTES_PER_HOUR = 60;

function toMinutes(hhmm) {
  if (typeof hhmm !== 'string' || !/^\d{2}:\d{2}$/.test(hhmm)) {
    throw new Error(`Invalid time format: ${hhmm}`);
  }
  const [h, m] = hhmm.split(':').map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) {
    throw new Error(`Invalid time value: ${hhmm}`);
  }
  return h * MINUTES_PER_HOUR + m;
}

function shiftDurationMinutes(shift) {
  return toMinutes(shift.endTime) - toMinutes(shift.startTime);
}

function hasOverlap(a, b) {
  if (a.date !== b.date) return false;
  const aStart = toMinutes(a.startTime);
  const aEnd = toMinutes(a.endTime);
  const bStart = toMinutes(b.startTime);
  const bEnd = toMinutes(b.endTime);
  return aStart < bEnd && bStart < aEnd;
}

function findConflict(candidate, existingShifts) {
  for (const existing of existingShifts) {
    if (candidate._id && existing._id && String(candidate._id) === String(existing._id)) {
      continue;
    }
    if (hasOverlap(candidate, existing)) {
      return existing;
    }
  }
  return null;
}

function weeklyHours(shifts) {
  return shifts.reduce((sum, s) => sum + shiftDurationMinutes(s) / 60, 0);
}


function wouldCauseOvertime(candidate, existingShifts, weeklyLimit = 40) {
  const candidateDate = new Date(candidate.date);
  const day = candidateDate.getUTCDay(); 
  const offsetToMonday = (day + 6) % 7;
  const weekStart = new Date(candidateDate);
  weekStart.setUTCDate(weekStart.getUTCDate() - offsetToMonday);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  const sameWeek = existingShifts.filter((s) => {
    const d = new Date(s.date);
    return d >= weekStart && d < weekEnd;
  });

  const total = weeklyHours([...sameWeek, candidate]);
  return total > weeklyLimit;
}

module.exports = {
  toMinutes,
  shiftDurationMinutes,
  hasOverlap,
  findConflict,
  weeklyHours,
  wouldCauseOvertime,
};