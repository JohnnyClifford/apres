// client/src/pages/Tips.jsx
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';

export default function Tips() {
  const { list: shifts } = useSelector((state) => state.shifts);
  
  const [date, setDate] = useState('');
  const [totalTips, setTotalTips] = useState('');
  const [breakdown, setBreakdown] = useState(null);
  const [strategy, setStrategy] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const uniqueDates = [...new Set(shifts.map(s => s.date))].sort();

  const handleCalculate = async (e) => {
    e.preventDefault();
    setError('');
    setBreakdown(null);
    setLoading(true);

    const shiftsForDate = shifts.filter(s => s.date === date && s.assignedTo);

    if (shiftsForDate.length === 0) {
      setError('No assigned shifts found for this date.');
      setLoading(false);
      return;
    }

    // Map shifts into the format the backend expects: { userId, role, hours }
    const shiftData = shiftsForDate.map(s => {
      const start = new Date(`1970-01-01T${s.startTime}:00Z`);
      const end = new Date(`1970-01-01T${s.endTime}:00Z`);
      const hours = (end - start) / (1000 * 60 * 60);
      return {
        userId: s.assignedTo,
        role: s.role,
        hours: hours
      };
    });

    try {
      const res = await apiClient.post('/tips/calculate', {
        venue: 'Main Restaurant',
        totalTipsCents: Math.round(parseFloat(totalTips) * 100),
        shifts: shiftData
      });
      setBreakdown(res.data.distribution);
      setStrategy(res.data.strategy);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to calculate tips');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        <div className="bg-white p-6 rounded-lg shadow flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Tip Pool Calculator</h1>
            <p className="text-gray-600 text-sm">Calculate tips based on scheduled shifts.</p>
          </div>
          <Link to="/dashboard" className="text-blue-600 hover:underline font-medium">
            &larr; Back to Dashboard
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
          
          <form onSubmit={handleCalculate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Shift Date</label>
                <select 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="" disabled>Select a date...</option>
                  {uniqueDates.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Tips Collected ($)</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  required
                  value={totalTips} 
                  onChange={(e) => setTotalTips(e.target.value)}
                  placeholder="e.g. 250.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full md:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow disabled:opacity-50"
            >
              {loading ? 'Calculating...' : 'Calculate Split'}
            </button>
          </form>
        </div>

        {breakdown && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4 border-b pb-2">Payout Breakdown</h2>
            <p className="text-sm text-gray-500 mb-4">Strategy applied: <span className="font-bold text-gray-700 uppercase">{strategy}</span></p>
            
            <ul className="space-y-3">
              {breakdown.map((item) => (
                <li key={item.userId} className="flex justify-between items-center p-3 border rounded bg-gray-50">
                  <span className="font-mono text-sm text-gray-600">User ID: {item.userId}</span>
                  <span className="font-bold text-lg text-green-600">
                    ${(item.amountCents / 100).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>
    </div>
  );
}