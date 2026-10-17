function distributeCents(totalCents, allocations) {
  if (totalCents === 0 || allocations.length === 0) {
    return allocations.map((a) => ({ ...a, amountCents: 0 }));
  }

  const totalWeight = allocations.reduce((sum, a) => sum + a.weight, 0);
  if (totalWeight === 0) {
    return allocations.map((a) => ({ ...a, amountCents: 0 }));
  }

  let distributed = 0;
  const results = allocations.map((a) => {
    const exact = (a.weight / totalWeight) * totalCents;
    const floor = Math.floor(exact);
    distributed += floor;
    return {
      ...a,
      amountCents: floor,
      remainder: exact - floor,
    };
  });

  let leftover = totalCents - distributed;

  const sorted = [...results].sort((a, b) => {
    if (b.remainder !== a.remainder) {
      return b.remainder - a.remainder;
    }
    return String(a.userId).localeCompare(String(b.userId));
  });

  for (let i = 0; i < leftover; i++) {
    sorted[i % sorted.length].amountCents += 1;
  }

  return results.map((r) => ({
    userId: r.userId,
    amountCents: r.amountCents,
  }));
}

function calculateHours(totalTipsCents, shifts) {
  const allocations = shifts.map((s) => ({
    userId: s.userId,
    weight: s.hours,
  }));
  return distributeCents(totalTipsCents, allocations);
}

function calculateRoleWeighted(totalTipsCents, shifts, roleWeights = {}) {
  const allocations = shifts.map((s) => {
    const roleWeight = roleWeights[s.role] !== undefined ? roleWeights[s.role] : 1.0;
    return {
      userId: s.userId,
      weight: s.hours * roleWeight,
    };
  });
  return distributeCents(totalTipsCents, allocations);
}

function calculateHybrid(totalTipsCents, shifts, basePerShiftCents = 0) {
  if (basePerShiftCents <= 0) {
    return calculateHours(totalTipsCents, shifts);
  }

  const baseTotalCents = basePerShiftCents * shifts.length;
  if (baseTotalCents >= totalTipsCents) {
    return calculateHours(totalTipsCents, shifts);
  }

  const remainderPoolCents = totalTipsCents - baseTotalCents;
  const hoursAllocations = calculateHours(remainderPoolCents, shifts);

  const resultMap = {};
  shifts.forEach((s) => {
    resultMap[s.userId] = basePerShiftCents;
  });

  hoursAllocations.forEach((ha) => {
    resultMap[ha.userId] += ha.amountCents;
  });

  return Object.keys(resultMap).map((userId) => ({
    userId,
    amountCents: resultMap[userId],
  }));
}

module.exports = {
  distributeCents,
  calculateHours,
  calculateRoleWeighted,
  calculateHybrid,
};