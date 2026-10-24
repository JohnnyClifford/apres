import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchMyWeeklyAvailability, saveMyWeeklyAvailability } from '../features/shiftsSlice';
import Hero from '../components/Hero';
import Card from '../components/Card';

const DAYS = [
  { dayOfWeek: 1, name: 'Monday' },
  { dayOfWeek: 2, name: 'Tuesday' },
  { dayOfWeek: 3, name: 'Wednesday' },
  { dayOfWeek: 4, name: 'Thursday' },
  { dayOfWeek: 5, name: 'Friday' },
  { dayOfWeek: 6, name: 'Saturday' },
  { dayOfWeek: 0, name: 'Sunday' },
];
const HOURS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];
const DEFAULT_RANGE = { start: { h: '09', m: '00' }, end: { h: '17', m: '00' } };

const splitTime = (time) => {
  const [h = '00', m = '00'] = time.split(':');
  return { h, m };
};

const createDays = () => Object.fromEntries(Array.from({ length: 7 }, (_, dayOfWeek) => [
  dayOfWeek,
  { ranges: [] },
]));

const buildDays = (weeklyAvailability) => {
  const days = createDays();
  (weeklyAvailability?.slots || []).forEach((slot) => {
    days[slot.dayOfWeek].ranges.push({
      start: splitTime(slot.startTime),
      end: splitTime(slot.endTime),
    });
  });
  return days;
};

function TimeSelects({ label, time, onChange }) {
  return (
    <div className="flex items-center gap-1">
      <select value={time.h} onChange={(event) => onChange('h', event.target.value)} className="px-2 py-1 border border-ink-400/30 rounded-lg text-sm bg-white" aria-label={`${label} hour`}>
        {HOURS.map((hour) => <option key={hour} value={hour}>{hour}</option>)}
      </select>
      <span className="text-ink-400">:</span>
      <select value={time.m} onChange={(event) => onChange('m', event.target.value)} className="px-2 py-1 border border-ink-400/30 rounded-lg text-sm bg-white" aria-label={`${label} minute`}>
        {MINUTES.map((minute) => <option key={minute} value={minute}>{minute}</option>)}
      </select>
    </div>
  );
}

export default function WeeklyAvailability() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const myWeeklyAvailability = useSelector((state) => state.shifts.myWeeklyAvailability);
  const [days, setDays] = useState(createDays);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (user.role !== 'staff') return undefined;

    let isCurrentRequest = true;
    setLoading(true);
    setDays(createDays());
    setError('');
    dispatch(fetchMyWeeklyAvailability())
      .unwrap()
      .catch((message) => {
        if (isCurrentRequest) setError(message);
      })
      .finally(() => {
        if (isCurrentRequest) setLoading(false);
      });

    return () => { isCurrentRequest = false; };
  }, [dispatch, user.role]);

  useEffect(() => {
    setDays(buildDays(myWeeklyAvailability));
  }, [myWeeklyAvailability]);

  const addRange = (dayOfWeek) => {
    setDays((currentDays) => ({
      ...currentDays,
      [dayOfWeek]: {
        ...currentDays[dayOfWeek],
        ranges: [...currentDays[dayOfWeek].ranges, {
        start: { ...DEFAULT_RANGE.start },
        end: { ...DEFAULT_RANGE.end },
        }],
      },
    }));
    setSuccessMsg('');
  };

  const updateRange = (dayOfWeek, index, boundary, part, value) => {
    setDays((currentDays) => ({
      ...currentDays,
      [dayOfWeek]: {
        ...currentDays[dayOfWeek],
        ranges: currentDays[dayOfWeek].ranges.map((range, rangeIndex) => (
          rangeIndex === index
            ? { ...range, [boundary]: { ...range[boundary], [part]: value } }
            : range
        )),
      },
    }));
    setSuccessMsg('');
  };

  const removeRange = (dayOfWeek, index) => {
    setDays((currentDays) => {
      const ranges = currentDays[dayOfWeek].ranges.filter((_, rangeIndex) => rangeIndex !== index);
      return {
        ...currentDays,
        [dayOfWeek]: { ranges },
      };
    });
    setSuccessMsg('');
  };

  const handleSave = async () => {
    const slots = Array.from({ length: 7 }, (_, dayOfWeek) => (
      days[dayOfWeek].ranges.map((range) => ({
        dayOfWeek,
        startTime: `${range.start.h}:${range.start.m}`,
        endTime: `${range.end.h}:${range.end.m}`,
      }))
    )).flat();

    if (slots.some((slot) => slot.endTime <= slot.startTime)) {
      setError('End time must be after start time');
      setSuccessMsg('');
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      await dispatch(saveMyWeeklyAvailability({ slots })).unwrap();
      setSuccessMsg('Weekly unavailability saved');
    } catch (message) {
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const hero = (
    <Hero eyebrow="Staff" title="Weekly Unavailability">
      <div className="space-y-4">
        <p className="text-forest-100">By default, you're available for any shift. Mark the days and times you cannot work below — your manager will schedule around these.</p>
        <Link to="/dashboard" className="inline-flex items-center bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-full font-medium transition-colors">
          &larr; Back to Dashboard
        </Link>
      </div>
    </Hero>
  );

  if (user.role !== 'staff') {
    return (
      <div className="min-h-screen bg-cream-50 p-6 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {hero}
          <Card className="p-8">
            <p className="text-ink-600">Weekly unavailability is set by staff members.</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {hero}
        <Card className="p-8">
          {loading && <p className="text-ink-600">Loading weekly availability...</p>}

          {!loading && (
            <>
              <div className="space-y-4">
                {DAYS.map(({ dayOfWeek, name }) => (
                  <div key={dayOfWeek} className="border border-ink-400/15 rounded-2xl p-4 mb-4">
                    <div className="flex items-center mb-3">
                      <div className="flex items-center">
                        <h3 className="font-semibold text-ink-900 text-lg">{name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ml-2 ${days[dayOfWeek].ranges.length === 0 ? 'bg-forest-50 text-forest-700' : 'bg-amber-50 text-amber-700'}`}>
                          {days[dayOfWeek].ranges.length === 0 ? 'Fully available' : `${days[dayOfWeek].ranges.length} block${days[dayOfWeek].ranges.length === 1 ? '' : 's'}`}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 mt-3">
                      {days[dayOfWeek].ranges.map((range, index) => (
                        <div key={`${dayOfWeek}-${index}`} className="bg-cream-100 rounded-2xl p-3 flex flex-wrap items-center gap-2">
                          <span className="text-red-600 text-sm font-medium">Unavailable</span>
                          <TimeSelects label="Start" time={range.start} onChange={(part, value) => updateRange(dayOfWeek, index, 'start', part, value)} />
                          <span className="text-sm text-ink-600">to</span>
                          <TimeSelects label="End" time={range.end} onChange={(part, value) => updateRange(dayOfWeek, index, 'end', part, value)} />
                          <button type="button" onClick={() => removeRange(dayOfWeek, index)} className="ml-auto text-red-500 hover:text-red-700 font-bold" aria-label={`Delete range ${index + 1} for ${name}`}>✕</button>
                        </div>
                      ))}
                      <button type="button" onClick={() => addRange(dayOfWeek)} className="bg-forest-600 hover:bg-forest-700 text-white text-sm px-4 py-2 rounded-full font-medium">+ Add unavailability block</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <button onClick={handleSave} disabled={saving} className="rounded-full bg-forest-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-forest-700 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save weekly availability'}
                </button>
              </div>
              {error && <p className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</p>}
              {successMsg && <p className="mt-4 rounded-xl bg-forest-50 border border-forest-200 p-3 text-sm text-forest-700">{successMsg}</p>}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
