import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchMyAvailability, saveMyAvailability } from '../features/shiftsSlice';
import { formatWeekLabel, getWeekStart } from '../utils/dateUtils';
import Hero from '../components/Hero';
import Card from '../components/Card';

const HOURS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'));
const QUARTERS = ['00', '15', '30', '45'];
const DEFAULT_RANGE = {
  start: { h: '09', m: '00' },
  end: { h: '17', m: '00' },
};

const formatLocalDate = (date) => {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return offsetDate.toISOString().split('T')[0];
};

const getWeekDates = (weekStart) => Array.from({ length: 7 }, (_, dayOffset) => {
  const date = new Date(`${weekStart}T00:00:00`);
  date.setDate(date.getDate() + dayOffset);
  return formatLocalDate(date);
});

const splitTime = (time) => {
  const [h = '00', m = '00'] = time.split(':');
  return { h, m };
};

const toMinutes = (time) => Number(time.h) * 60 + Number(time.m);

const formatDayLabel = (dateString) => {
  const date = new Date(`${dateString}T00:00:00`);
  const day = date.getDate();
  const lastTwoDigits = day % 100;
  const suffix = lastTwoDigits >= 11 && lastTwoDigits <= 13
    ? 'th'
    : ({ 1: 'st', 2: 'nd', 3: 'rd' }[day % 10] || 'th');
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date);
  const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
  return `${weekday} ${day}${suffix} ${month}`;
};

function TimeSelects({ label, time, onChange }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-sm text-ink-600">{label}</span>
      <select aria-label={`${label} hour`} value={time.h} onChange={(event) => onChange('h', event.target.value)} className="bg-white border border-ink-400/30 rounded-lg px-3 py-2 text-sm">
        {HOURS.map((hour) => <option key={hour} value={hour}>{hour}</option>)}
      </select>
      <span className="text-ink-400">:</span>
      <select aria-label={`${label} minutes`} value={time.m} onChange={(event) => onChange('m', event.target.value)} className="bg-white border border-ink-400/30 rounded-lg px-3 py-2 text-sm">
        {QUARTERS.map((quarter) => <option key={quarter} value={quarter}>{quarter}</option>)}
      </select>
    </div>
  );
}

export default function Availability() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + weekOffset * 7);
    return getWeekStart(formatLocalDate(date));
  }, [weekOffset]);
  const [ranges, setRanges] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (user.role !== 'staff') return undefined;

    let isCurrentRequest = true;
    setLoading(true);
    setError('');
    setSuccessMsg('');

    dispatch(fetchMyAvailability(weekStart))
      .unwrap()
      .then((availability) => {
        if (!isCurrentRequest) return;

        const weekDates = new Set(getWeekDates(weekStart));
        const loadedRanges = (availability?.slots || []).reduce((groupedRanges, slot) => {
          if (!weekDates.has(slot.date)) return groupedRanges;
          if (!groupedRanges[slot.date]) groupedRanges[slot.date] = [];
          groupedRanges[slot.date].push({
            start: splitTime(slot.startTime),
            end: splitTime(slot.endTime),
          });
          return groupedRanges;
        }, {});

        setRanges(loadedRanges);
      })
      .catch((message) => {
        if (isCurrentRequest) {
          setRanges({});
          setError(message);
        }
      })
      .finally(() => {
        if (isCurrentRequest) setLoading(false);
      });

    return () => { isCurrentRequest = false; };
  }, [dispatch, user.role, weekStart]);

  const addRange = (date) => {
    setRanges((currentRanges) => ({
      ...currentRanges,
      [date]: [...(currentRanges[date] || []), {
        start: { ...DEFAULT_RANGE.start },
        end: { ...DEFAULT_RANGE.end },
      }],
    }));
    setSuccessMsg('');
  };

  const deleteRange = (date, index) => {
    setRanges((currentRanges) => ({
      ...currentRanges,
      [date]: currentRanges[date].filter((_, rangeIndex) => rangeIndex !== index),
    }));
    setSuccessMsg('');
  };

  const updateRange = (date, index, boundary, part, value) => {
    setRanges((currentRanges) => ({
      ...currentRanges,
      [date]: currentRanges[date].map((range, rangeIndex) => (
        rangeIndex === index
          ? { ...range, [boundary]: { ...range[boundary], [part]: value } }
          : range
      )),
    }));
    setSuccessMsg('');
  };

  const handleSave = async () => {
    const slots = getWeekDates(weekStart).flatMap((date) => (
      (ranges[date] || []).map((range) => ({
        date,
        startTime: `${range.start.h}:${range.start.m}`,
        endTime: `${range.end.h}:${range.end.m}`,
      }))
    ));

    if (Object.values(ranges).flat().some((range) => toMinutes(range.end) <= toMinutes(range.start))) {
      setError('End time must be after start time');
      setSuccessMsg('');
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      await dispatch(saveMyAvailability({ weekStart, slots })).unwrap();
      setSuccessMsg('Time off saved');
    } catch (message) {
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (user.role !== 'staff') {
    return (
      <div className="min-h-screen bg-cream-50 p-6 md:p-8">
        <div className="max-w-6xl mx-auto">
          <Hero eyebrow="Staff — Time Off" title="My Time Off">
            <div className="space-y-4">
              <p className="text-forest-100">Mark the dates and times you cannot work — the manager will schedule around them.</p>
              <Link to="/dashboard" className="inline-flex items-center bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-full font-medium transition-colors">
                &larr; Back to Dashboard
              </Link>
            </div>
          </Hero>
          <Card className="p-8 mt-8">
            <p className="text-ink-600">Availability is set by staff members.</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <Hero eyebrow="Staff — Time Off" title="My Time Off">
          <div className="space-y-4">
            <p className="text-forest-100">Mark the dates and times you cannot work — the manager will schedule around them.</p>
            <Link to="/dashboard" className="inline-flex items-center bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-full font-medium transition-colors">
              &larr; Back to Dashboard
            </Link>
          </div>
        </Hero>

        <div className="mt-8 flex items-center justify-between bg-cream-100 p-2 rounded-2xl border border-ink-400/10">
          <button onClick={() => setWeekOffset((offset) => offset - 1)} className="px-3 py-1 text-sm font-medium text-forest-600 hover:text-forest-700">&larr; Prev Week</button>
          <span className="font-medium text-ink-900">{formatWeekLabel(weekStart)}</span>
          <button onClick={() => setWeekOffset((offset) => offset + 1)} className="px-3 py-1 text-sm font-medium text-forest-600 hover:text-forest-700">Next Week &rarr;</button>
        </div>

        <Card className="p-8 mt-4">
          {loading && <p className="mb-4 text-sm text-ink-600">Loading availability...</p>}
          {error && <p className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</p>}
          {successMsg && <p className="mb-4 rounded-xl bg-forest-50 border border-forest-200 p-3 text-sm text-forest-700">{successMsg}</p>}
          {!loading && Object.values(ranges).every((dayRanges) => dayRanges.length === 0) && (
            <p className="mb-4 text-sm text-ink-600">You have no time off marked — you're available for all shifts by default.</p>
          )}

          <div className="space-y-4">
            {getWeekDates(weekStart).map((date) => (
              <section key={date} className="rounded-2xl border border-ink-400/15 bg-white p-4">
                <h2 className="font-semibold text-ink-900">{formatDayLabel(date)}</h2>
                <div className="mt-3 space-y-2">
                  {(ranges[date] || []).map((range, index) => (
                    <div key={`${date}-${index}`} className="flex flex-wrap items-center gap-2 rounded-2xl bg-cream-50 p-3">
                      <TimeSelects label="Start" time={range.start} onChange={(part, value) => updateRange(date, index, 'start', part, value)} />
                      <span className="text-sm text-ink-600">to</span>
                      <TimeSelects label="End" time={range.end} onChange={(part, value) => updateRange(date, index, 'end', part, value)} />
                      <button type="button" onClick={() => deleteRange(date, index)} className="ml-auto rounded-full px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50" aria-label={`Delete range ${index + 1} for ${formatDayLabel(date)}`}>✕</button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => addRange(date)} className="mt-3 rounded-full bg-forest-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-forest-700">+ Add time off</button>
              </section>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button onClick={handleSave} disabled={saving} className="rounded-full bg-forest-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-forest-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save time off'}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
