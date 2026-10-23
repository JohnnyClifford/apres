import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { fetchShifts } from '../features/shiftsSlice';
import { formatReadableDate, formatWeekLabel, getWeekStart } from '../utils/dateUtils';
import Hero from '../components/Hero';
import Card from '../components/Card';
import Button from '../components/Button';

export default function Tips() {
  const { user } = useAuth();
  const { list: shifts } = useSelector((state) => state.shifts);
  const dispatch = useDispatch();

  const [date, setDate] = useState('');
  const [totalTips, setTotalTips] = useState('');
  const [breakdown, setBreakdown] = useState(null);
  const [calculationInput, setCalculationInput] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [payoutError, setPayoutError] = useState('');
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [shiftError, setShiftError] = useState('');
  const [payoutWeekOffset, setPayoutWeekOffset] = useState(0);
  const [tipWeekOffset, setTipWeekOffset] = useState(0);

  const isManager = user.role === 'manager' || user.role === 'owner';
  const isStaff = user.role === 'staff';

  useEffect(() => {
    const loadShifts = async () => {
      setShiftLoading(true);
      try { await dispatch(fetchShifts()).unwrap(); }
      catch (err) { setShiftError(err || 'Failed to load shifts.'); }
      finally { setShiftLoading(false); }
    };
    loadShifts();
  }, [dispatch]);

  useEffect(() => {
    if (!isManager) return;
    const loadUsers = async () => {
      try {
        const res = await apiClient.get('/auth/users');
        setUsers(res.data.users);
      } catch (err) { console.error("Failed to load users", err); }
    };
    loadUsers();
  }, [isManager]);

  useEffect(() => {
    if (!isStaff) return;
    const loadPayouts = async () => {
      setPayoutLoading(true);
      setPayoutError('');
      try {
        const res = await apiClient.get('/tips/my-payouts');
        setPayouts(res.data.distributions);
      } catch (err) {
        setPayoutError(err.response?.data?.error || 'Failed to load your tip payouts');
      } finally { setPayoutLoading(false); }
    };
    loadPayouts();
  }, [isStaff]);

  const uniqueDates = [...new Set(shifts.map(s => s.date))].sort();
  const selectedTipWeekMonday = (() => {
  const base = new Date(`${getWeekStart(new Date().toISOString().split('T')[0])}T00:00:00`);
  base.setDate(base.getDate() + tipWeekOffset * 7);
  return base.toISOString().split('T')[0];
    })();
    const selectedTipWeekSunday = (() => {
    const d = new Date(`${selectedTipWeekMonday}T00:00:00`);
    d.setDate(d.getDate() + 6);
    return d.toISOString().split('T')[0];
    })();
    const uniqueDatesInSelectedWeek = uniqueDates.filter(d => d >= selectedTipWeekMonday && d <= selectedTipWeekSunday);
    const getUserName = (userId) => users.find(u => u._id === userId)?.name || 'Unknown User';

  const selectedPayoutWeekMonday = (() => {
    const base = new Date(`${getWeekStart(new Date().toISOString().split('T')[0])}T00:00:00`);
    base.setDate(base.getDate() + payoutWeekOffset * 7);
    return base.toISOString().split('T')[0];
  })();
  const selectedPayoutWeekSunday = (() => {
    const d = new Date(`${selectedPayoutWeekMonday}T00:00:00`);
    d.setDate(d.getDate() + 6);
    return d.toISOString().split('T')[0];
  })();
  const visiblePayouts = payouts.filter(p => p.date >= selectedPayoutWeekMonday && p.date <= selectedPayoutWeekSunday);

  const handleCalculate = async (e) => {
    e.preventDefault();
    setError(''); setBreakdown(null); setCalculationInput(null); setSaveMessage('');
    setLoading(true);
    const shiftsForDate = shifts.filter(s => s.date === date && s.assignedTo);
    if (shiftsForDate.length === 0) {
      setError('No assigned shifts found for this date.');
      setLoading(false); return;
    }
    const shiftData = shiftsForDate.map(s => {
      const start = new Date(`1970-01-01T${s.startTime}:00Z`);
      const end = new Date(`1970-01-01T${s.endTime}:00Z`);
      const hours = (end - start) / (1000 * 60 * 60);
      return { userId: s.assignedTo, role: s.role, hours };
    });
    try {
      const res = await apiClient.post('/tips/calculate', {
        venue: 'Main Restaurant',
        totalTipsCents: Math.round(parseFloat(totalTips) * 100),
        shifts: shiftData
      });
      setBreakdown(res.data.distribution);
      setCalculationInput({
        venue: 'Main Restaurant', date,
        totalTipsCents: Math.round(parseFloat(totalTips) * 100),
        shifts: shiftData,
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to calculate tips');
    } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!calculationInput) return;
    setError(''); setSaveMessage(''); setSaving(true);
    try {
      await apiClient.post('/tips/distribute', calculationInput);
      setSaveMessage('Tip distribution saved successfully.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save tip distribution');
    } finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-cream-50 p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">

        <Hero eyebrow={isManager ? 'Manager' : 'Staff'} title="Tip Pool">
          <p className="text-forest-100/90 text-sm">
            {isManager ? 'Calculate and distribute the tip pool for a shift date.' : 'Your recorded tip payouts.'}
          </p>
          <div className="mt-4">
            <Link to="/dashboard" className="inline-flex items-center bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-full font-medium text-sm transition-colors">
              &larr; Back to Dashboard
            </Link>
          </div>
        </Hero>

        {isManager && (
          <>
            <Card className="p-8">
              {error && <div className="bg-red-50 text-red-700 p-3 rounded-xl mb-4 text-sm border border-red-100">{error}</div>}
              {saveMessage && <div className="bg-forest-50 text-forest-700 p-3 rounded-xl mb-4 text-sm border border-forest-100">{saveMessage}</div>}

              {shiftLoading && <p className="text-ink-600 text-sm mb-4">Loading shift dates...</p>}
              {shiftError && <p className="text-red-600 text-sm mb-4">{shiftError}</p>}

              <form onSubmit={handleCalculate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                <label className="block text-sm font-medium text-ink-900 mb-2">Shift date</label>
                <div className="flex items-center justify-between mb-3 bg-cream-100 p-2 rounded-2xl border border-ink-400/10">
                    <button
                    type="button"
                    onClick={() => setTipWeekOffset(o => o - 1)}
                    className="px-3 py-1 text-sm font-medium text-forest-600 hover:text-forest-700"
                    >
                    &larr; Prev Week
                    </button>
                    <span className="font-medium text-ink-900 text-sm">
                    {formatWeekLabel((() => {
                        const base = new Date(`${getWeekStart(new Date().toISOString().split('T')[0])}T00:00:00`);
                        base.setDate(base.getDate() + tipWeekOffset * 7);
                        return base.toISOString().split('T')[0];
                    })())}
                    </span>
                    <button
                    type="button"
                    onClick={() => setTipWeekOffset(o => o + 1)}
                    className="px-3 py-1 text-sm font-medium text-forest-600 hover:text-forest-700"
                    >
                    Next Week &rarr;
                    </button>
                </div>
                <div className="grid grid-cols-7 gap-2">
                    {uniqueDatesInSelectedWeek.map(d => {
                    const day = new Date(`${d}T00:00:00`);
                    const dayLabel = day.toLocaleDateString('en-GB', { weekday: 'short' });
                    const dateLabel = day.getDate();
                    const isSelected = date === d;
                    return (
                        <button
                        key={d}
                        type="button"
                        onClick={() => setDate(d)}
                        className={`p-2 rounded-xl border text-center transition-colors ${isSelected ? 'bg-forest-600 text-white border-forest-600' : 'bg-white border-ink-400/30 text-ink-900 hover:border-forest-500/50'}`}
                        >
                        <div className="text-xs font-medium opacity-70">{dayLabel}</div>
                        <div className="text-lg font-bold">{dateLabel}</div>
                        </button>
                    );
                    })}
                </div>
                {uniqueDatesInSelectedWeek.length === 0 && (
                    <p className="text-ink-600 text-sm text-center mt-2">No shifts this week.</p>
                )}
                </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-900 mb-1.5" htmlFor="tip-total">Total tips collected ($)</label>
                    <input
                      id="tip-total"
                      type="number" step="0.01" min="0" required
                      value={totalTips}
                      onChange={(e) => setTotalTips(e.target.value)}
                      placeholder="e.g. 250.00"
                      className="w-full px-4 py-2.5 border border-ink-400/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500 text-ink-900 bg-white"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={loading || shiftLoading}>
                    {loading ? 'Calculating...' : 'Calculate Split'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleSave}
                    disabled={!breakdown || saving}
                  >
                    {saving ? 'Saving...' : 'Save Split'}
                  </Button>
                </div>
              </form>
            </Card>

            {breakdown && (
              <Card className="p-8">
                <h2 className="text-xl font-bold text-ink-900 mb-4 border-b border-ink-400/10 pb-3">Payout breakdown</h2>
                <ul className="space-y-3">
                  {breakdown.map((item) => (
                    <li key={item.userId} className="flex justify-between items-center p-4 border border-ink-400/15 rounded-2xl bg-cream-50">
                      <div>
                        <p className="font-medium text-ink-900">{getUserName(item.userId)}</p>
                        {item.hours !== undefined && <p className="text-xs text-ink-600">{item.hours} hours worked</p>}
                      </div>
                      <span className="font-bold text-forest-600 text-lg">${(item.amountCents / 100).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </>
        )}

        {isStaff && (
          <Card className="p-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-ink-900">My Tip Payouts</h2>
                <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-ink-600">
                    {formatWeekLabel(selectedPayoutWeekMonday)}
                </span>
                <div className="flex gap-1 bg-cream-100 p-1 rounded-full">
                    <button onClick={() => setPayoutWeekOffset(o => o - 1)} className="px-3 py-1 text-sm font-medium text-forest-600 hover:text-forest-700">&larr;</button>
                    <button onClick={() => setPayoutWeekOffset(o => o + 1)} className="px-3 py-1 text-sm font-medium text-forest-600 hover:text-forest-700">&rarr;</button>
                </div>
                </div>
            </div>

            {payoutLoading && <p className="text-ink-600 text-sm">Loading your payouts...</p>}
            {payoutError && <p className="text-red-600 text-sm">{payoutError}</p>}
            {!payoutLoading && !payoutError && visiblePayouts.length === 0 && (
              <p className="text-ink-600 text-sm">No payouts recorded for this week.</p>
            )}

            {!payoutLoading && !payoutError && visiblePayouts.length > 0 && (
              <ul className="space-y-3">
                {visiblePayouts.map((distribution) => {
                  const payout = distribution.breakdown.find((item) => String(item.userId) === String(user.id || user._id));
                  if (!payout) return null;
                  return (
                    <li key={distribution._id} className="p-4 border border-ink-400/15 rounded-2xl bg-cream-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-ink-900">{formatReadableDate(distribution.date)}</p>
                          <p className="text-sm text-ink-600">{distribution.venue}</p>
                          <p className="text-xs text-ink-600 mt-1">
                            Pool: <span className="font-semibold text-ink-900">${(distribution.totalTipsCents / 100).toFixed(2)}</span>
                            {payout.hours !== undefined && <><span className="mx-1">·</span><span className="font-semibold text-ink-900">{payout.hours}</span> hours worked</>}
                          </p>
                        </div>
                        <span className="font-bold text-lg text-forest-600">${(payout.amountCents / 100).toFixed(2)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}