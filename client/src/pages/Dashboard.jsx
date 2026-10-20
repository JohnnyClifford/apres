import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDispatch, useSelector } from 'react-redux';
import { fetchShifts, createShift, fetchUsers, shiftReceivedViaSocket, socket } from '../features/shiftsSlice';
import { useNavigate, Link } from 'react-router-dom';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { list: shifts, users, loading, error } = useSelector((state) => state.shifts);

  const [formData, setFormData] = useState({
    venue: 'Main Restaurant',
    date: '',
    startTime: '17:00',
    endTime: '23:00',
    role: 'staff',
    assignedTo: '',
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    dispatch(fetchShifts());
    if (user.role === 'manager' || user.role === 'owner') {
      dispatch(fetchUsers());
    }

    socket.connect();
    
    const handleNewShift = (newShift) => {
      dispatch(shiftReceivedViaSocket(newShift));
    };
    
    socket.on('shift:created', handleNewShift);

    return () => {
      socket.off('shift:created', handleNewShift);
      socket.disconnect();
    };
  }, [dispatch, user.role]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCreateShift = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await dispatch(createShift(formData)).unwrap();
      setFormData({ ...formData, date: '', assignedTo: '' });
    } catch (err) {
      setFormError(err);
    }
  };

  const isManager = user.role === 'manager' || user.role === 'owner';

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-lg shadow">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-gray-600">Welcome, {user.name} ({user.role})</p>
          </div>
          <div className="flex gap-4">
            {isManager && (
              <Link to="/tips" className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-4 py-2 rounded shadow font-medium flex items-center">
                Tip Calculator
              </Link>
            )}
            <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded shadow">
              Log Out
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4 border-b pb-2">Upcoming Shifts</h2>
            {loading && <p>Loading shifts...</p>}
            {error && <p className="text-red-500">{error}</p>}
            {!loading && shifts.length === 0 && <p className="text-gray-500">No shifts scheduled yet.</p>}
            
            <div className="space-y-4">
              {shifts.map(shift => (
                <div key={shift._id} className="border p-4 rounded flex justify-between items-center">
                  <div>
                    <p className="font-bold text-lg">{shift.date} <span className="text-sm font-normal text-gray-500">at {shift.venue}</span></p>
                    <p className="text-gray-700">{shift.startTime} - {shift.endTime} ({shift.role})</p>
                  </div>
                  {shift.assignedTo ? (
                    <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">Assigned</span>
                  ) : (
                    <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Unassigned</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {isManager && (
            <div className="bg-white p-6 rounded-lg shadow h-fit">
              <h2 className="text-xl font-bold mb-4 border-b pb-2">Add Shift</h2>
              {formError && <div className="bg-red-100 text-red-700 p-2 rounded mb-4 text-sm">{formError}</div>}
              
              <form onSubmit={handleCreateShift} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <input 
                    type="date" required
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start</label>
                    <input 
                      type="time" required
                      value={formData.startTime}
                      onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">End</label>
                    <input 
                      type="time" required
                      value={formData.endTime}
                      onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Assign To</label>
                  <select 
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({...formData, assignedTo: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                  >
                    <option value="">-- Leave Unassigned --</option>
                    {users.map(u => (
                      <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>

                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow">
                  Create Shift
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}