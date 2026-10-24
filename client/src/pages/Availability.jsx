import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { deleteMyAvailability, fetchMyAvailability, saveMyAvailability } from '../features/shiftsSlice';
import { formatReadableDate, formatWeekLabel, getWeekStart } from '../utils/dateUtils';
import Hero from '../components/Hero';
import Card from '../components/Card';

const formatLocalDate = (date) => {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return offsetDate.toISOString().split('T')[0];
};

const getWeekDates = (weekStart, today) => Array.from({ length: 7 }, (_, dayOffset) => {
  const date = new Date(`${weekStart}T00:00:00`);
  date.setDate(date.getDate() + dayOffset);

  return {
    dateStr: formatLocalDate(date),
    dayName: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date),
    dayNum: date.getDate(),
    isPast: formatLocalDate(date) < today,
  };
});

const getStatusBadge = (status) => {
  if (status === 'pending') return { label: '⏳ Pending manager approval', shortLabel: '⏳ Pending', className: 'border border-amber-200 bg-amber-50 text-amber-700' };
  if (status === 'approved') return { label: '✓ Approved', shortLabel: '✓ Approved', className: 'border border-forest-200 bg-forest-50 text-forest-700' };
  if (status === 'rejected') return { label: '✗ Rejected — you can edit and resubmit', shortLabel: '✗ Rejected', className: 'border border-red-200 bg-red-50 text-red-700' };
  return null;
};

export default function Availability() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const [weekOffset, setWeekOffset] = useState(0);
  const today = formatLocalDate(new Date());
  const weekStart = useMemo(() => {
    const week = new Date(`${getWeekStart(today)}T00:00:00`);
    week.setDate(week.getDate() + weekOffset * 7);
    return formatLocalDate(week);
  }, [today, weekOffset]);
  const [selectedDates, setSelectedDates] = useState(new Set());
  const [availabilityId, setAvailabilityId] = useState(null);
  const [slots, setSlots] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const weekDates = useMemo(() => getWeekDates(weekStart, today), [weekStart, today]);
  const statusBadge = getStatusBadge(status);
  const isApproved = status === 'approved';

  useEffect(() => {
    if (user.role !== 'staff') return undefined;

    let isCurrentRequest = true;
    setLoading(true);
    setError('');
    setSuccessMsg('');
    setAvailabilityId(null);
    setSlots([]);
    setStatus(null);
    setSelectedDates(new Set());

    dispatch(fetchMyAvailability(weekStart))
      .unwrap()
      .then((availability) => {
        if (!isCurrentRequest) return;
        setSelectedDates(new Set((availability?.slots || []).map((slot) => slot.date)));
        setAvailabilityId(availability?._id || null);
        setSlots(availability?.slots || []);
        setStatus(availability?.status || null);
      })
      .catch((message) => {
        if (!isCurrentRequest) return;
        setSelectedDates(new Set());
        setAvailabilityId(null);
        setSlots([]);
        setStatus(null);
        setError(message);
      })
      .finally(() => {
        if (isCurrentRequest) setLoading(false);
      });

    return () => { isCurrentRequest = false; };
  }, [dispatch, user.role, weekStart]);

  const toggleDate = (dateStr, isPast) => {
    if (isPast || isApproved) return;

    setSelectedDates((currentDates) => {
      const nextDates = new Set(currentDates);
      if (nextDates.has(dateStr)) nextDates.delete(dateStr);
      else nextDates.add(dateStr);
      return nextDates;
    });
    setError('');
    setSuccessMsg('');
  };

  const handleSave = async () => {
    if (isApproved || selectedDates.size === 0) return;

    const slots = Array.from(selectedDates).map((date) => ({
      date,
      startTime: '00:00',
      endTime: '23:59',
    }));
    const previousStatus = status;

    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      const availability = await dispatch(saveMyAvailability({ weekStart, slots })).unwrap();
      setAvailabilityId(availability._id);
      setSlots(availability.slots);
      setStatus('pending');
      setSuccessMsg('Time off request submitted');
      if (previousStatus === 'pending' || previousStatus === null) setSelectedDates(new Set());
    } catch (message) {
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this time off request?')) return;

    setDeleting(true);
    setError('');
    try {
      await dispatch(deleteMyAvailability(id)).unwrap();
      setAvailabilityId(null);
      setSlots([]);
      setStatus(null);
      setSelectedDates(new Set());
    } catch (message) {
      setError(message || 'Failed to delete request');
    } finally {
      setDeleting(false);
    }
  };

  if (user.role !== 'staff') {
    return (
      <div className="min-h-screen bg-cream-50 p-6 md:p-8">
        <div className="mx-auto max-w-6xl">
          <Hero eyebrow="Staff" title="Time Off Requests">
            <div className="space-y-4">
              <p className="text-forest-100">Select the dates you need off. Your manager will approve or reject each request.</p>
              <Link to="/dashboard" className="inline-flex items-center rounded-full bg-white/10 px-5 py-2 font-medium text-white transition-colors hover:bg-white/20">
                &larr; Back to Dashboard
              </Link>
            </div>
          </Hero>
          <Card className="mt-8 p-8">
            <p className="text-ink-600">Time off is requested by staff members.</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 p-6 md:p-8">
      <div className="mx-auto max-w-6xl">
        <Hero eyebrow="Staff" title="Time Off Requests">
          <div className="space-y-4">
            <p className="text-forest-100">Select the dates you need off. Your manager will approve or reject each request.</p>
            <Link to="/dashboard" className="inline-flex items-center rounded-full bg-white/10 px-5 py-2 font-medium text-white transition-colors hover:bg-white/20">
              &larr; Back to Dashboard
            </Link>
          </div>
        </Hero>

        <div className="mb-6 mt-8 flex items-center justify-between rounded-2xl border border-ink-400/10 bg-cream-100 p-3">
          <button type="button" onClick={() => setWeekOffset((offset) => offset - 1)} className="px-3 py-1 text-sm font-medium text-forest-600 hover:text-forest-700">&larr; Prev Week</button>
          <span className="font-medium text-ink-900">{formatWeekLabel(weekStart)}</span>
          <button type="button" onClick={() => setWeekOffset((offset) => offset + 1)} className="px-3 py-1 text-sm font-medium text-forest-600 hover:text-forest-700">Next Week &rarr;</button>
        </div>

        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-ink-900">Select dates</h2>
            {statusBadge && <span className={`inline-flex rounded-full px-4 py-2 text-sm font-medium ${statusBadge.className}`}>{statusBadge.label}</span>}
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-ink-600">Loading time off request...</p>
          ) : (
            <>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                {weekDates.map(({ dateStr, dayName, dayNum, isPast }) => {
                  const isSelected = selectedDates.has(dateStr);
                  const isDisabled = isPast || isApproved;
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => toggleDate(dateStr, isPast)}
                      className={`aspect-square rounded-2xl p-4 text-center transition-colors ${isSelected ? 'bg-forest-600 text-white hover:bg-forest-700' : 'border border-ink-400/30 bg-white text-ink-900 hover:bg-cream-50'} ${isDisabled ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      <span className="block text-sm font-medium">{dayName}</span>
                      <span className="mt-1 block text-3xl font-bold">{dayNum}</span>
                    </button>
                  );
                })}
              </div>

              {isApproved && <p className="mt-4 text-sm text-forest-700">Your time off is approved.</p>}
              {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              {successMsg && <p className="mt-4 rounded-xl bg-forest-50 p-3 text-sm text-forest-700">{successMsg}</p>}

              <div className="mt-6 flex justify-end">
                <button type="button" onClick={handleSave} disabled={selectedDates.size === 0 || isApproved || saving} className="rounded-full bg-forest-600 px-5 py-2 font-medium text-white transition-colors hover:bg-forest-700 disabled:cursor-not-allowed disabled:opacity-50">
                  {saving ? 'Submitting...' : 'Submit request'}
                </button>
              </div>
            </>
          )}
        </Card>

        <Card className="mt-6 p-6">
          <h2 className="mb-4 text-xl font-bold text-ink-900">My requests for this week</h2>

          {loading && <p className="text-sm text-ink-600">Loading...</p>}

          {!loading && !availabilityId && (
            <p className="text-sm text-ink-600">No request submitted for this week.</p>
          )}

          {!loading && availabilityId && (
            <div className="rounded-2xl border border-ink-400/15 p-4">
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-ink-900">{formatWeekLabel(weekStart)}</p>
                  <p className="mt-1 text-sm text-ink-600">{slots.length} date{slots.length !== 1 ? 's' : ''} requested</p>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge && <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${statusBadge.className}`}>{statusBadge.shortLabel}</span>}
                  {status !== 'approved' && (
                    <button type="button" onClick={() => handleDelete(availabilityId)} disabled={deleting} className="px-2 text-lg font-bold text-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50" title="Delete request">
                      {deleting ? '...' : '✕'}
                    </button>
                  )}
                </div>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-ink-600">
                {slots.map((slot, index) => (
                  <li key={`${slot.date}-${index}`} className="flex items-center gap-2">
                    <span className="text-forest-600">•</span>
                    <span className="font-medium text-ink-900">{formatReadableDate(slot.date)}</span>
                    <span className="text-ink-400">(all day)</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
