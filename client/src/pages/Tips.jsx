import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { fetchShifts } from '../features/shiftsSlice';
import { formatReadableDate, formatWeekLabel, getWeekStart } from '../utils/dateUtils';

export default function Tips() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const { list: shifts } = useSelector((state) => state.shifts);
  
  const [date, setDate] = useState('');
  const [totalTips, setTotalTips] = useState('');
  const [breakdown, setBreakdown] = useState(null);
  const [calculationInput, setCalculationInput] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [venueName, setVenueName] = useState('');
  const [shiftLoading, setShiftLoading] = useState(false);
  const [shiftError, setShiftError] = useState('');
  
  const [users, setUsers] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [payoutError, setPayoutError] = useState('');
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutWeekOffset, setPayoutWeekOffset] = useState(0);

  const isManager = user.role === 'manager' || user.role === 'owner';
  const isStaff = user.role === 'staff';

  useEffect(() => {
    let isMounted = true;

    const loadShifts = async () => {
      setShiftLoading(true);
      setShiftError('');
      try {
        await dispatch(fetchShifts()).unwrap();
      } catch (err) {
        if (isMounted) setShiftError(err || 'Failed to load shifts.');
      } finally {
        if (isMounted) setShiftLoading(false);
      }
    };

    loadShifts();
    return () => { isMounted = false; };
  }, [dispatch]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await apiClient.get('/settings');
        setVenueName(res.data.settings.venueName);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load venue settings');
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (!isManager) return;
    const loadUsers = async () => {
      try {
        const res = await apiClient.get('/auth/users');
        setUsers(res.data.users);
      } catch (err) {
        console.error("Failed to load users", err);
      }
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
      } finally {
        setPayoutLoading(false);
      }
    };
    loadPayouts();
  }, [isStaff]);

  const uniqueDates = [...new Set(shifts.map(s => s.date))].sort();
  const shiftsForSelectedDate = shifts.filter((shift) => shift.date === date);
  const getUserName = (userId) => users.find(u => u._id === userId)?.name || 'Unknown User';
  const formatLocalDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const getSelectedPayoutWeekMonday = (offset) => {
    const currentMonday = new Date(`${getWeekStart(formatLocalDate(new Date()))}T00:00:00`);
    currentMonday.setDate(currentMonday.getDate() + offset * 7);
    return formatLocalDate(currentMonday);
  };
  const selectedPayoutWeekMonday = getSelectedPayoutWeekMonday(payoutWeekOffset);
  const selectedPayoutWeekSunday = new Date(`${selectedPayoutWeekMonday}T00:00:00`);
  selectedPayoutWeekSunday.setDate(selectedPayoutWeekSunday.getDate() + 6);
  const selectedPayoutWeekSundayDate = formatLocalDate(selectedPayoutWeekSunday);
  const selectedWeekPayouts = payouts.filter((distribution) => (
    distribution.date >= selectedPayoutWeekMonday && distribution.date <= selectedPayoutWeekSundayDate
  ));

  const handleCalculate = async (e) => {
    e.preventDefault();
    setError('');
    setBreakdown(null);
    setCalculationInput(null);
    setSaveMessage('');

    if (!venueName) {
      setError('Venue settings are still loading. Please try again.');
      return;
    }

    setLoading(true);

    const shiftsForDate = shifts.filter(s => s.date === date && s.assignedTo);

    if (shiftsForDate.length === 0) {
      setError('No assigned shifts found for this date.');
      setLoading(false);
      return;
    }

    const shiftData = shiftsForDate.map(s => {
      const start = new Date(`1970-01-01T${s.startTime}:00Z`);
      const end = new Date(`1970-01-01T${s.endTime}:00Z`);
      const hours = (end - start) / (1000 * 60 * 60);
      return { userId: s.assignedTo, role: s.role, hours: hours };
    });

    try {
      const res = await apiClient.post('/tips/calculate', {
        venue: venueName,
        totalTipsCents: Math.round(parseFloat(totalTips) * 100),
        shifts: shiftData
      });
      setBreakdown(res.data.distribution);
      setCalculationInput({
        venue: venueName,
        date,
        totalTipsCents: Math.round(parseFloat(totalTips) * 100),
        shifts: shiftData,
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to calculate tips');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!calculationInput || !venueName) {
      if (!venueName) setError('Venue settings are still loading. Please try again.');
      return;
    }
    setError('');
    setSaveMessage('');
    setSaving(true);
    try {
      await apiClient.post('/tips/distribute', calculationInput);
      setSaveMessage('Tip distribution saved successfully.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save tip distribution');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        <div className="bg-white p-6 rounded-lg shadow flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Tip Pool</h1>
            <p className="text-gray-600 text-sm">View or calculate shift tips.</p>
          </div>
          <Link to="/dashboard" className="text-blue-600 hover:underline font-medium">
            &larr; Back to Dashboard
          </Link>
        </div>

        {isManager && (
          <>
            <div className="bg-white p-6 rounded-lg shadow">
              {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
              {shiftLoading && <div className="bg-gray-100 text-gray-700 p-3 rounded mb-4">Loading shifts...</div>}
              {shiftError && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{shiftError}</div>}
              {saveMessage && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{saveMessage}</div>}
              
              <form onSubmit={handleCalculate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="tip-shift-date">Select Shift Date</label>
                    <select 
                      id="tip-shift-date"
                      value={date} 
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="" disabled>Select a date...</option>
                      {uniqueDates.map(d => <option key={d} value={d}>{formatReadableDate(d)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="tip-total">Total Tips Collected ($)</label>
                    <input 
                      id="tip-total"
                      type="number" step="0.01" min="0" required
                      value={totalTips} 
                      onChange={(e) => setTotalTips(e.target.value)}
                      placeholder="e.g. 250.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button 
                    type="submit" 
                    disabled={loading || shiftLoading || shiftsForSelectedDate.length === 0}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow disabled:opacity-50"
                  >
                    {loading ? 'Calculating...' : 'Calculate Split'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!breakdown || saving || !venueName}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded shadow disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Split'}
                  </button>
                </div>
              </form>
            </div>

            {breakdown && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-4 border-b pb-2">Payout Breakdown</h2>
                {calculationInput?.date && <p className="mb-4 text-gray-600">{formatReadableDate(calculationInput.date)}</p>}
                <ul className="space-y-3">
                  {breakdown.map((item) => (
                    <li key={item.userId} className="flex justify-between items-center p-3 border rounded bg-gray-50">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-800 text-lg">{getUserName(item.userId)}</span>
                        {item.hours !== undefined && <span className="text-xs text-gray-500">{item.hours} hours worked</span>}
                      </div>
                      <span className="font-bold text-lg text-green-600">${(item.amountCents / 100).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {isStaff && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4 border-b pb-2">My Tip Payouts</h2>
            <div className="flex items-center justify-between mb-4 bg-gray-50 p-2 rounded-lg border">
              <button onClick={() => setPayoutWeekOffset(o => o - 1)}>&larr; Prev Week</button>
              <span>{formatWeekLabel(selectedPayoutWeekMonday)}</span>
              <button onClick={() => setPayoutWeekOffset(o => o + 1)}>Next Week &rarr;</button>
            </div>
            {payoutLoading && <p className="text-gray-600">Loading your payouts...</p>}
            {payoutError && <p className="text-red-700">{payoutError}</p>}
            
            {!payoutLoading && !payoutError && selectedWeekPayouts.length === 0 && (
              <p className="text-gray-600">No tip payouts recorded for this week.</p>
            )}
            
            {!payoutLoading && !payoutError && selectedWeekPayouts.length > 0 && (
              <ul className="space-y-3">
                {selectedWeekPayouts.map((distribution) => {
                  const payout = distribution.breakdown.find(
                    (item) => String(item.userId) === String(user.id || user._id)
                  );
                  if (!payout) return null;

                  return (
                    <li key={distribution._id} className="p-3 border rounded bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-800">{formatReadableDate(distribution.date)}</p>
                          <p className="text-sm text-gray-500">{distribution.venue}</p>
                            <p className="text-xs text-gray-500 mt-1">
                            Pool: <span className="font-semibold">${(distribution.totalTipsCents / 100).toFixed(2)}</span>
                                {payout.hours !== undefined && (
                                    <>
                                    {" · "}
                                    <span className="font-semibold">{payout.hours}</span> hours worked
                                    </>
                                )}
                            </p>
                        </div>
                        <span className="font-bold text-lg text-green-600">
                          ${(payout.amountCents / 100).toFixed(2)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
