const VALID_STATUSES = ['pending', 'accepted', 'rejected', 'cancelled'];

function isRequesterAssigned(shift, requesterId) {
  if (!shift || !shift.assignedTo) return false;
  return String(shift.assignedTo) === String(requesterId);
}

function isShiftInFuture(shift, now = new Date()) {
  const shiftStart = new Date(`${shift.date}T${shift.startTime}:00`);
  return shiftStart > now;
}

function areDistinctUsers(fromUserId, toUserId) {
  return String(fromUserId) !== String(toUserId);
}

function hasPendingSwap(existingSwaps) {
  return (existingSwaps || []).some((s) => s.status === 'pending');
}

function canResolve(role) {
  return role === 'manager' || role === 'owner';
}

function canTransition(fromStatus, toStatus) {
  if (!VALID_STATUSES.includes(toStatus)) return false;
  if (fromStatus !== 'pending') return false;
  return ['accepted', 'rejected', 'cancelled'].includes(toStatus);
}

function validateSwapRequest({ shift, requesterId, toUserId, existingSwaps, now = new Date() }) {
  if (!shift) return 'Shift not found';
  if (!isRequesterAssigned(shift, requesterId)) return 'You are not assigned to this shift';
  if (!areDistinctUsers(requesterId, toUserId)) return 'You cannot swap with yourself';
  if (!isShiftInFuture(shift, now)) return 'Cannot swap a shift that has already started';
  if (hasPendingSwap(existingSwaps)) return 'This shift already has a pending swap';
  return null;
}

module.exports = {
  isRequesterAssigned,
  isShiftInFuture,
  areDistinctUsers,
  hasPendingSwap,
  canResolve,
  canTransition,
  validateSwapRequest,
};
