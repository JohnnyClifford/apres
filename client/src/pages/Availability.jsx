import { useEffect, useState } from 'react';
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

const getStatusBadge = (status) => {
  if (status === 'pending') return { label: '⏳ Pending manager approval', shortLabel: '⏳ Pending', className: 'border border-amber-200 bg-amber-50 text-amber-700' };
  if (status === 'approved') return { label: '✓ Approved', shortLabel: '✓ Approved', className: 'border border-forest-200 bg-forest-50 text-forest-700' };
  if (status === 'rejected') return { label: '✗ Rejected — you can edit and resubmit', shortLabel: '✗ Rejected', className: 'border border-red-200 bg-red-50 text-red-700' };
  return null;
};

const getDatesInRange = (start, end) => {
  const dates = [];
  const current = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);

  while (current <= endDate) {
    dates.push(formatLocalDate(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

const formatSelectionDate = (dateString) => new Date(`${dateString}T00:00:00`).toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
});

export default function Availability() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const today = formatLocalDate(new Date());
  const [currentMonth, setCurrentMonth] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [currentWeekStart] = useState(getWeekStart(today));
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [submittedDates, setSubmittedDates] = useState(new Set());
  const [availabilityId, setAvailabilityId] = useState(null);
  const [slots, setSlots] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const statusBadge = getStatusBadge(status);
  const isApproved = status === 'approved';
  const selectedDatesList = rangeStart
    ? rangeEnd
      ? getDatesInRange(rangeStart, rangeEnd)
      : [rangeStart]
    : [];
  const firstDayOfWeek = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();

  const loadCurrentWeek = async () => {
    const availability = await dispatch(fetchMyAvailability(currentWeekStart)).unwrap();
    setAvailabilityId(availability?._id || null);
    setSlots(availability?.slots || []);
    setStatus(availability?.status || null);
    setSubmittedDates(new Set((availability?.slots || []).map((slot) => slot.date)));
  };

  useEffect(() => {
    if (user.role !== 'staff') return undefined;

    let isCurrentRequest = true;
    setLoading(true);
    setError('');
    setSuccessMsg('');
    setRangeStart(null);
    setRangeEnd(null);

    dispatch(fetchMyAvailability(currentWeekStart))
      .unwrap()
      .then((availability) => {
        if (!isCurrentRequest) return;
        setAvailabilityId(availability?._id || null);
        setSlots(availability?.slots || []);
        setStatus(availability?.status || null);
        setSubmittedDates(new Set((availability?.slots || []).map((slot) => slot.date)));
      })
      .catch((message) => {
        if (!isCurrentRequest) return;
        setAvailabilityId(null);
        setSlots([]);
        setStatus(null);
        setSubmittedDates(new Set());
        setError(message);
      })
      .finally(() => {
        if (isCurrentRequest) setLoading(false);
      });

    return () => { isCurrentRequest = false; };
  }, [currentWeekStart, dispatch, user.role]);

  const handleDateClick = (dateStr) => {
    if (!rangeStart) {
      setRangeStart(dateStr);
      setRangeEnd(null);
    } else if (!rangeEnd) {
      if (dateStr === rangeStart) {
        setRangeStart(null);
      } else {
        const [start, end] = dateStr < rangeStart ? [dateStr, rangeStart] : [rangeStart, dateStr];
        setRangeStart(start);
        setRangeEnd(end);
      }
    } else {
      setRangeStart(dateStr);
      setRangeEnd(null);
    }
    setError('');
    setSuccessMsg('');
  };

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const handleSave = async () => {
    if (selectedDatesList.length === 0 || saving || isApproved) return;

    const byWeek = {};
    selectedDatesList.forEach((date) => {
      const weekStart = getWeekStart(date);
      if (!byWeek[weekStart]) byWeek[weekStart] = [];
      byWeek[weekStart].push(date);
    });

    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      for (const [weekStart, dates] of Object.entries(byWeek)) {
        const requestSlots = dates.map((date) => ({ date, startTime: '00:00', endTime: '23:59' }));
        await dispatch(saveMyAvailability({ weekStart, slots: requestSlots })).unwrap();
      }
      setSuccessMsg('Time off request submitted');
      setRangeStart(null);
      setRangeEnd(null);
      await loadCurrentWeek();
    } catch (message) {
      setError(message || 'Failed to submit request');
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
      setRangeStart(null);
      setRangeEnd(null);
      setSubmittedDates(new Set());
    } catch (message) {
      setError(message || 'Failed to delete request');
    } finally {
      setDeleting(false);
    }
  };

  const hero = (
    <Hero eyebrow="Staff" title="Time Off Requests">
      <div className="space-y-4">
        <p className="text-forest-100">Select the dates you need off. Your manager will approve or reject each request.</p>
        <Link to="/dashboard" className="inline-flex items-center rounded-full bg-white/10 px-5 py-2 font-medium text-white transition-colors hover:bg-white/20">
          &larr; Back to Dashboard
        </Link>
      </div>
    </Hero>
  );

  if (user.role !== 'staff') {
    return (
      <div className="min-h-screen bg-cream-50 p-6 md:p-8">
        <div className="mx-auto max-w-6xl">
          {hero}
          <Card className="mt-8 p-8"><p className="text-ink-600">Time off is requested by staff members.</p></Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 p-6 md:p-8">
      <div className="mx-auto max-w-6xl">
        {hero}

        <Card className="mt-8 p-6">
          <div className="mb-6 flex items-center justify-between">
            <button type="button" onClick={prevMonth} className="rounded-full bg-cream-100 px-4 py-2 text-sm font-medium text-ink-900 hover:bg-cream-50">&larr; Prev</button>
            <h2 className="text-xl font-bold text-ink-900">{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
            <button type="button" onClick={nextMonth} className="rounded-full bg-cream-100 px-4 py-2 text-sm font-medium text-ink-900 hover:bg-cream-50">Next &rarr;</button>
          </div>

          {statusBadge && <span className={`mb-4 inline-flex rounded-full px-4 py-2 text-sm font-medium ${statusBadge.className}`}>{statusBadge.label}</span>}
          <p className="mb-4 text-sm text-ink-600">Click a start date, then an end date to select a range.</p>

          <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-medium uppercase tracking-wider text-ink-400">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day}>{day}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: firstDayOfWeek }).map((_, index) => <div key={`empty-${index}`} />)}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const dayNum = index + 1;
              const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isPast = dateStr < today;
              const isSelected = selectedDatesList.includes(dateStr);
              const isSubmitted = submittedDates.has(dateStr);
              const isRangeStart = dateStr === rangeStart;
              const isRangeEnd = dateStr === rangeEnd;
              const isToday = dateStr === today;
              return (
                <button
                  key={dateStr}
                  type="button"
                  disabled={isPast || isApproved}
                  onClick={() => handleDateClick(dateStr)}
                  className={`aspect-square rounded-2xl p-2 text-center transition-colors ${isSelected ? 'bg-forest-600 text-white' : isSubmitted ? 'border-2 border-forest-500 bg-white text-forest-700' : isPast ? 'cursor-not-allowed bg-cream-100/50 text-ink-400' : 'border border-ink-400/15 bg-white text-ink-900 hover:bg-cream-50'} ${isToday && !isSelected ? 'ring-2 ring-forest-400 ring-offset-2' : ''} ${isSelected && (isRangeStart || isRangeEnd) ? 'ring-2 ring-forest-300' : ''} ${isApproved ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <span className="text-lg font-bold">{dayNum}</span>
                </button>
              );
            })}
          </div>

          {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {successMsg && <p className="mt-4 rounded-xl bg-forest-50 p-3 text-sm text-forest-700">{successMsg}</p>}
          <p className="mt-4 text-sm text-ink-600">
            {selectedDatesList.length === 0
              ? 'No dates selected'
              : `Selected: ${selectedDatesList.length} date${selectedDatesList.length === 1 ? '' : 's'}${rangeEnd ? ` (${formatSelectionDate(rangeStart)} – ${formatSelectionDate(rangeEnd)})` : ''}`}
          </p>
          <div className="mt-6 flex justify-end">
            <button type="button" onClick={handleSave} disabled={selectedDatesList.length === 0 || isApproved || saving} className="rounded-full bg-forest-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-forest-700 disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? 'Submitting...' : selectedDatesList.length === 0 ? 'Select dates' : `Submit ${selectedDatesList.length} date${selectedDatesList.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </Card>

        <Card className="mt-6 p-6">
          <h2 className="mb-4 text-xl font-bold text-ink-900">My recent requests</h2>
          {loading && <p className="text-sm text-ink-600">Loading...</p>}
          {!loading && !availabilityId && <p className="text-sm text-ink-600">No request submitted for this week.</p>}
          {!loading && availabilityId && (
            <div className="rounded-2xl border border-ink-400/15 p-4">
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-ink-900">{formatWeekLabel(currentWeekStart)}</p>
                  <p className="mt-1 text-sm text-ink-600">{slots.length} date{slots.length !== 1 ? 's' : ''} requested</p>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge && <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${statusBadge.className}`}>{statusBadge.shortLabel}</span>}
                  {status !== 'approved' && <button type="button" onClick={() => handleDelete(availabilityId)} disabled={deleting} className="px-2 text-lg font-bold text-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50" title="Delete request">{deleting ? '...' : '✕'}</button>}
                </div>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-ink-600">
                {slots.map((slot, index) => <li key={`${slot.date}-${index}`} className="flex items-center gap-2"><span className="text-forest-600">•</span><span className="font-medium text-ink-900">{formatReadableDate(slot.date)}</span><span className="text-ink-400">(all day)</span></li>)}
              </ul>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
