import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchPendingTimeOff, resolveTimeOff } from '../features/shiftsSlice';
import { formatReadableDate, formatWeekLabel, getWeekStart } from '../utils/dateUtils';
import Hero from '../components/Hero';
import Card from '../components/Card';

const formatLocalDate = (date) => {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return offsetDate.toISOString().split('T')[0];
};

export default function TimeOffApprovals() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const pendingTimeOff = useSelector((state) => state.shifts.pendingTimeOff);
  const [weekOffset, setWeekOffset] = useState(0);
  const today = formatLocalDate(new Date());
  const weekStart = useMemo(() => {
    const week = new Date(`${getWeekStart(today)}T00:00:00`);
    week.setDate(week.getDate() + weekOffset * 7);
    return formatLocalDate(week);
  }, [today, weekOffset]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);
  const [error, setError] = useState('');

  const hero = (
    <Hero eyebrow="Manager" title="Time Off Approvals">
      <div className="space-y-4">
        <p className="text-forest-100">Review and approve staff time off requests.</p>
        <Link to="/dashboard" className="inline-flex items-center rounded-full bg-white/10 px-5 py-2 font-medium text-white transition-colors hover:bg-white/20">
          &larr; Back to Dashboard
        </Link>
      </div>
    </Hero>
  );

  useEffect(() => {
    if (user.role !== 'manager' && user.role !== 'owner') return undefined;

    let isCurrentRequest = true;
    setLoading(true);
    setError('');
    dispatch(fetchPendingTimeOff(weekStart))
      .unwrap()
      .catch((message) => {
        if (isCurrentRequest) setError(message);
      })
      .finally(() => {
        if (isCurrentRequest) setLoading(false);
      });

    return () => { isCurrentRequest = false; };
  }, [dispatch, user.role, weekStart]);

  const handleResolve = async (id, status) => {
    setResolvingId(id);
    setError('');
    try {
      await dispatch(resolveTimeOff({ id, status })).unwrap();
    } catch (message) {
      setError(message || 'Failed to resolve');
    } finally {
      setResolvingId(null);
    }
  };

  if (user.role !== 'manager' && user.role !== 'owner') {
    return (
      <div className="min-h-screen bg-cream-50 p-6 md:p-8">
        <div className="mx-auto max-w-4xl space-y-8">
          {hero}
          <Card className="p-8">
            <p className="text-ink-600">Only managers can approve time off.</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 p-6 md:p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {hero}

        <div className="mb-6 flex items-center justify-between rounded-2xl border border-ink-400/10 bg-cream-100 p-3">
          <button type="button" onClick={() => setWeekOffset((offset) => offset - 1)} className="px-3 py-1 text-sm font-medium text-forest-600 hover:text-forest-700">&larr; Prev Week</button>
          <span className="font-medium text-ink-900">{formatWeekLabel(weekStart)}</span>
          <button type="button" onClick={() => setWeekOffset((offset) => offset + 1)} className="px-3 py-1 text-sm font-medium text-forest-600 hover:text-forest-700">Next Week &rarr;</button>
        </div>

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-bold text-ink-900">Pending requests</h2>
          {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {loading ? (
            <p className="text-sm text-ink-600">Loading pending requests...</p>
          ) : pendingTimeOff.length === 0 ? (
            <p className="text-sm text-ink-600">No pending time off requests for this week.</p>
          ) : (
            pendingTimeOff.map((request) => (
              <div key={request._id} className="mb-3 rounded-2xl border border-ink-400/15 p-4 last:mb-0">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-ink-900">{request.user?.name || 'Unknown'}</p>
                    <p className="text-sm text-ink-600">{request.user?.email}</p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700">Pending</span>
                </div>
                <div className="mb-3 text-sm text-ink-600">
                  <p className="mb-1 font-medium text-ink-900">Dates requested:</p>
                  <ul className="space-y-0.5">
                    {request.slots.map((slot, index) => (
                      <li key={`${slot.date}-${index}`} className="flex items-center gap-2">
                        <span className="text-forest-600">•</span>
                        <span className="font-medium text-ink-900">{formatReadableDate(slot.date)}</span>
                        <span className="text-ink-400">(all day)</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleResolve(request._id, 'approved')} disabled={resolvingId === request._id} className="rounded-full bg-forest-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-forest-700 disabled:opacity-50">
                    {resolvingId === request._id ? 'Approving...' : 'Approve'}
                  </button>
                  <button type="button" onClick={() => handleResolve(request._id, 'rejected')} disabled={resolvingId === request._id} className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50">
                    {resolvingId === request._id ? 'Rejecting...' : 'Reject'}
                  </button>
                </div>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}
