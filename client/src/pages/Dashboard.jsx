import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchShifts, createShift, fetchUsers, fetchSwaps, deleteShift, updateShift,
  shiftReceivedViaSocket, shiftDeletedViaSocket, swapReceivedViaSocket,
  subscribeToSwapEvents, socket
} from '../features/shiftsSlice';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/client';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { list: shifts, users, swaps, loading, error } = useSelector((state) => state.shifts);

  const [viewMode, setViewMode] = useState('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatTarget, setChatTarget] = useState('team');
  const chatEndRef = useRef(null);

  const [formData, setFormData] = useState({
    venue: '', date: '', startTime: '17:00', endTime: '23:00', role: 'staff', assignedTo: '',
  });
  const [formError, setFormError] = useState('');
  const [creatingShift, setCreatingShift] = useState(false);
  const [venueName, setVenueName] = useState('');
  const [venueInput, setVenueInput] = useState('');
  const [venueMessage, setVenueMessage] = useState('');
  const [venueError, setVenueError] = useState('');
  const [savingVenue, setSavingVenue] = useState(false);
  
  const [swapShift, setSwapShift] = useState(null);
  const [swapTargetId, setSwapTargetId] = useState('');
  const [swapRequestedShiftId, setSwapRequestedShiftId] = useState('');
  const [swapError, setSwapError] = useState('');
  const [submittingSwap, setSubmittingSwap] = useState(false);

  const [editingShift, setEditingShift] = useState(null);
  const [editFormData, setEditFormData] = useState({
    venue: '', date: '', startTime: '', endTime: '', role: '', assignedTo: '',
  });
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingShiftId, setDeletingShiftId] = useState('');
  const [resolvingSwapId, setResolvingSwapId] = useState('');

  useEffect(() => {
    dispatch(fetchShifts());
    dispatch(fetchUsers());
    dispatch(fetchSwaps());

    const fetchChatHistory = async () => {
      try {
        const res = await apiClient.get('/chat');
        setMessages(res.data.messages);
      } catch (err) { console.error('Failed to load chat history', err); }
    };
    fetchChatHistory();

    socket.connect();
    socket.emit('register', user.id || user._id); 
    
    const handleNewShift = (newShift) => dispatch(shiftReceivedViaSocket(newShift));
    const handleDeletedShift = (shiftId) => dispatch(shiftDeletedViaSocket(shiftId));
    const handleNewMessage = (message) => setMessages((prev) => [...prev, message]);
    const unsubscribeSwapEvents = subscribeToSwapEvents(dispatch);
    
    socket.on('shift:created', handleNewShift);
    socket.on('shift:updated', handleNewShift);
    socket.on('shift:deleted', handleDeletedShift);
    socket.on('chat:message', handleNewMessage);

    return () => {
      socket.off('shift:created', handleNewShift);
      socket.off('shift:updated', handleNewShift);
      socket.off('shift:deleted', handleDeletedShift);
      socket.off('chat:message', handleNewMessage);
      unsubscribeSwapEvents();
      socket.disconnect();
    };
  }, [dispatch, user.role]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await apiClient.get('/settings');
        const fetchedVenueName = res.data.settings.venueName;
        setVenueName(fetchedVenueName);
        setVenueInput(fetchedVenueName);
        setFormData((current) => ({ ...current, venue: fetchedVenueName }));
      } catch (err) {
        setVenueError(err.response?.data?.error || 'Failed to load venue settings.');
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatTarget]);

  const handleLogout = () => { logout(); navigate('/login'); };
  const isManager = user.role === 'manager' || user.role === 'owner';
  const isStaff = user.role === 'staff';
  const isOwner = user.role === 'owner';

  const getId = (value) => (typeof value === 'object' && value !== null ? value._id : value)?.toString();
  const getUserName = (userId) => users.find(u => getId(u._id) === getId(userId))?.name || 'Assigned';
  const isPastShift = (dateStr) => new Date(dateStr + 'T23:59:59') < new Date();

  const handleCreateShift = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!venueName) {
      setFormError('Venue settings are still loading. Please try again.');
      return;
    }
    setCreatingShift(true);
    try {
      await dispatch(createShift(formData)).unwrap();
      setFormData({ ...formData, date: '', assignedTo: '' });
    } catch (err) { setFormError(err); } finally {
      setCreatingShift(false);
    }
  };

  const handleSaveVenue = async (e) => {
    e.preventDefault();
    setVenueError('');
    setVenueMessage('');
    if (!venueInput.trim()) {
      setVenueError('Venue name cannot be empty.');
      return;
    }

    setSavingVenue(true);
    try {
      const res = await apiClient.put('/settings', { venueName: venueInput });
      const savedVenueName = res.data.settings.venueName;
      setVenueName(savedVenueName);
      setVenueInput(savedVenueName);
      setFormData((current) => ({ ...current, venue: savedVenueName }));
      setVenueMessage('Venue settings saved successfully.');
    } catch (err) {
      setVenueError(err.response?.data?.error || 'Failed to save venue settings.');
    } finally {
      setSavingVenue(false);
    }
  };

  const handleDeleteShift = async (id) => {
    if (window.confirm('Are you sure you want to delete this shift?')) {
      setDeletingShiftId(id);
      try {
        await dispatch(deleteShift(id));
      } finally {
        setDeletingShiftId('');
      }
    }
  };

  const openEditShift = (shift) => {
    setEditingShift(shift);
    setEditFormData({
      venue: shift.venue || '',
      date: shift.date || '',
      startTime: shift.startTime || '',
      endTime: shift.endTime || '',
      role: shift.role || '',
      assignedTo: getId(shift.assignedTo) || '',
    });
    setEditError('');
  };

  const handleEditFieldChange = (field, value) => {
    setEditFormData((current) => ({ ...current, [field]: value }));
    setEditError('');
  };

  const handleUpdateShift = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    setEditError('');
    try {
      await dispatch(updateShift({ id: editingShift._id, changes: editFormData })).unwrap();
      setEditingShift(null);
    } catch (err) {
      setEditError(err?.error || err || 'Failed to update shift.');
    } finally {
      setSavingEdit(false);
    }
  };

  const openSwapRequest = (shift) => {
    setSwapShift(shift);
    setSwapTargetId('');
    setSwapRequestedShiftId('');
    setSwapError('');
  };

  const closeSwapRequest = () => {
    if (!submittingSwap) setSwapShift(null);
  };

  const closeEditShift = () => {
    if (!savingEdit) setEditingShift(null);
  };

  useEffect(() => {
    if (!swapShift && !editingShift) return;

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      if (editingShift) {
        closeEditShift();
      } else if (swapShift) {
        closeSwapRequest();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [swapShift, editingShift, submittingSwap, savingEdit]);

  const handleRequestSwap = async (e) => {
    e.preventDefault();
    if (!swapTargetId) {
      setSwapError('Choose a colleague to request the swap with.');
      return;
    }
    if (!swapRequestedShiftId) {
      setSwapError('Choose which of their shifts you want in return.');
      return;
    }
    setSubmittingSwap(true);
    setSwapError('');
    try {
      const res = await apiClient.post('/swaps', {
        shiftId: swapShift._id,
        toUserId: swapTargetId,
        requestedShiftId: swapRequestedShiftId,
      });
      dispatch(swapReceivedViaSocket(res.data.swap));
      setSwapShift(null);
    } catch (err) {
      setSwapError(err.response?.data?.error || 'Unable to request this swap.');
    } finally {
      setSubmittingSwap(false);
    }
  };

  const handleResolveSwap = async (swapId, status) => {
    setResolvingSwapId(swapId);
    try {
      const res = await apiClient.patch(`/swaps/${swapId}`, { status });
      dispatch(swapReceivedViaSocket(res.data.swap));
    } catch (err) {
      setSwapError(err.response?.data?.error || 'Unable to update this swap request.');
    } finally {
      setResolvingSwapId('');
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const recipientId = chatTarget === 'team' ? null : chatTarget;
    socket.emit('chat:message', { userId: user.id || user._id, recipientId, content: newMessage });
    setNewMessage('');
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
  const daysInMonth = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  const firstDay = getFirstDayOfMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));

  const targetUserShifts = swapTargetId
    ? shifts.filter(s => getId(s.assignedTo) === swapTargetId)
    : [];

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-lg shadow">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-gray-600">Welcome, {user.name} ({user.role})</p>
          </div>
          <div className="flex gap-4">
            {isManager && <Link to="/tips" className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-4 py-2 rounded shadow font-medium">Tip Calculator</Link>}
            {isStaff && <Link to="/tips" className="bg-green-100 hover:bg-green-200 text-green-800 px-4 py-2 rounded shadow font-medium">My Tip Payouts</Link>}
            <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded shadow">Log Out</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 bg-white p-6 rounded-lg shadow">
            
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h2 className="text-xl font-bold">Shifts</h2>
              <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                <button onClick={() => setViewMode('list')} className={`px-3 py-1 text-sm font-medium rounded-md ${viewMode === 'list' ? 'bg-white shadow' : 'text-gray-500 hover:text-gray-800'}`}>List</button>
                <button onClick={() => setViewMode('calendar')} className={`px-3 py-1 text-sm font-medium rounded-md ${viewMode === 'calendar' ? 'bg-white shadow' : 'text-gray-500 hover:text-gray-800'}`}>Calendar</button>
              </div>
            </div>

            {loading && <p>Loading shifts...</p>}
            {error && <p className="text-red-500">{error}</p>}

            {viewMode === 'list' && (
              <div className="space-y-4">
                {shifts.length === 0 && <p className="text-gray-500">No shifts scheduled yet.</p>}
                {shifts.map(shift => {
                  const past = isPastShift(shift.date);
                  const isMyShift = getId(shift.assignedTo) === getId(user.id || user._id);
                  return (
                    <div key={shift._id} className={`border p-4 rounded flex justify-between items-center ${past ? 'bg-gray-100 opacity-60' : 'bg-white'}`}>
                      <div>
                        <p className="font-bold text-lg">{shift.date} <span className="text-sm font-normal text-gray-500">at {shift.venue}</span></p>
                        <p className="text-gray-700">{shift.startTime} - {shift.endTime} ({shift.role})</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {shift.assignedTo ? (
                          <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">{getUserName(shift.assignedTo)}</span>
                        ) : (
                          <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Unassigned</span>
                        )}
                        {isManager && (
                          <>
                            <button onClick={() => openEditShift(shift)} className="text-blue-600 hover:text-blue-800 text-sm font-medium px-2" title="Edit Shift">Edit</button>
                            <button onClick={() => handleDeleteShift(shift._id)} disabled={deletingShiftId === shift._id} className="text-red-500 hover:text-red-700 text-sm font-bold px-2 disabled:opacity-50" title="Delete Shift" aria-label="Delete shift">{deletingShiftId === shift._id ? 'Deleting...' : '✕'}</button>
                          </>
                        )}
                        {isMyShift && !past && (
                          <button onClick={() => openSwapRequest(shift)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-1 rounded">Request Swap</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {viewMode === 'calendar' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <button onClick={prevMonth} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded">&larr; Prev</button>
                  <h3 className="font-bold text-lg">{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                  <button onClick={nextMonth} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded">Next &rarr;</button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-2 font-medium text-gray-500 text-sm">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, idx) => {
                    if (!day) return <div key={`empty-${idx}`} className="h-24 bg-gray-50 rounded p-1"></div>;
                    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayShifts = shifts.filter(s => s.date === dateStr);
                    const isToday = dateStr === new Date().toISOString().split('T')[0];
                    return (
                      <div key={day} className={`h-24 border rounded p-1 overflow-y-auto text-sm ${isToday ? 'border-blue-500 bg-blue-50' : 'bg-white'}`}>
                        <span className={`font-bold ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>{day}</span>
                        <div className="mt-1 space-y-1">
                          {dayShifts.map(s => {
                            const past = isPastShift(s.date);
                            return (
                              <div key={s._id} className={`text-xs p-1 rounded truncate ${past ? 'bg-gray-200 text-gray-500' : 'bg-blue-100 text-blue-800'}`} title={`${s.startTime} - ${s.endTime}: ${s.assignedTo ? getUserName(s.assignedTo) : 'Unassigned'}`}>
                                {s.startTime} {getUserName(s.assignedTo)}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-8">
            {isOwner && (
              <div className="bg-white p-6 rounded-lg shadow h-fit">
                <h2 className="text-xl font-bold mb-4 border-b pb-2">Owner Controls</h2>
                <Link to="/users" className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded shadow">
                  Manage Users
                </Link>
              </div>
            )}

            {isOwner && (
              <div className="bg-white p-6 rounded-lg shadow h-fit">
                <h2 className="text-xl font-bold mb-4 border-b pb-2">Venue Settings</h2>
                {venueError && <p className="mb-3 rounded bg-red-100 p-2 text-sm text-red-700">{venueError}</p>}
                {venueMessage && <p className="mb-3 rounded bg-green-100 p-2 text-sm text-green-700">{venueMessage}</p>}
                <form onSubmit={handleSaveVenue} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700" htmlFor="venueName">Venue name</label>
                    <input
                      id="venueName"
                      type="text"
                      value={venueInput}
                      onChange={(e) => setVenueInput(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <button type="submit" disabled={savingVenue || !venueName} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded shadow disabled:opacity-50">
                    {savingVenue ? 'Saving...' : 'Save'}
                  </button>
                </form>
              </div>
            )}

            {isManager && (
              <div className="bg-white p-6 rounded-lg shadow h-fit">
                <h2 className="text-xl font-bold mb-4 border-b pb-2">Pending Swaps</h2>
                {swapError && <p className="mb-3 rounded bg-red-100 p-2 text-sm text-red-700">{swapError}</p>}
                {swaps.filter((swap) => swap.status === 'pending').length === 0 ? (
                  <p className="text-sm text-gray-500">No pending swap requests.</p>
                ) : (
                  <div className="space-y-3">
                    {swaps.filter((swap) => swap.status === 'pending').map((swap) => {
                      const offered = shifts.find((item) => getId(item._id) === getId(swap.shift));
                      const requested = swap.requestedShift
                        ? shifts.find((item) => getId(item._id) === getId(swap.requestedShift))
                        : null;
                      return (
                        <div key={swap._id} className="border rounded p-3 text-sm">
                          <p className="font-semibold">{getUserName(swap.fromUser)} ⇄ {getUserName(swap.toUser)}</p>
                          <p className="text-gray-500 mt-1">
                            Gives: {offered ? `${offered.date} ${offered.startTime}–${offered.endTime}` : '—'}
                          </p>
                          <p className="text-gray-500">
                            Wants: {requested ? `${requested.date} ${requested.startTime}–${requested.endTime}` : '—'}
                          </p>
                          <div className="flex gap-2 mt-3">
                            <button onClick={() => handleResolveSwap(swap._id, 'accepted')} disabled={resolvingSwapId === swap._id} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded disabled:opacity-50">{resolvingSwapId === swap._id ? 'Approving...' : 'Approve'}</button>
                            <button onClick={() => handleResolveSwap(swap._id, 'rejected')} disabled={resolvingSwapId === swap._id} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded disabled:opacity-50">{resolvingSwapId === swap._id ? 'Denying...' : 'Deny'}</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {isManager && venueName && (
              <div className="bg-white p-6 rounded-lg shadow h-fit">
                <h2 className="text-xl font-bold mb-4 border-b pb-2">Add Shift</h2>
                {formError && <div className="bg-red-100 text-red-700 p-2 rounded mb-4 text-sm">{formError}</div>}
                <form onSubmit={handleCreateShift} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700" htmlFor="shift-date">Date</label>
                    <input id="shift-date" type="date" required value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="mt-1 block w-full px-3 py-2 border rounded-md" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700" htmlFor="shift-start-time">Start</label>
                      <input id="shift-start-time" type="time" required value={formData.startTime} onChange={(e) => setFormData({...formData, startTime: e.target.value})} className="mt-1 block w-full px-3 py-2 border rounded-md" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700" htmlFor="shift-end-time">End</label>
                      <input id="shift-end-time" type="time" required value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})} className="mt-1 block w-full px-3 py-2 border rounded-md" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700" htmlFor="shift-assignee">Assign To</label>
                    <select id="shift-assignee" value={formData.assignedTo} onChange={(e) => setFormData({...formData, assignedTo: e.target.value})} className="mt-1 block w-full px-3 py-2 border rounded-md">
                      <option value="">-- Leave Unassigned --</option>
                      {users.map(u => <option key={u._id} value={u._id}>{u.name} ({u.role})</option>)}
                    </select>
                  </div>
                  <button type="submit" disabled={creatingShift} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded shadow disabled:opacity-50">{creatingShift ? 'Creating...' : 'Create Shift'}</button>
                </form>
              </div>
            )}

            <div className="bg-white p-6 rounded-lg shadow flex flex-col h-96">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h2 className="text-xl font-bold">Team Chat</h2>
                <select value={chatTarget} onChange={(e) => setChatTarget(e.target.value)} className="text-sm border-gray-300 rounded-md shadow-sm">
                  <option value="team">Everyone (Public)</option>
                  {users.filter(u => u._id !== (user.id || user._id)).map(u => <option key={u._id} value={u._id}>DM: {u.name}</option>)}
                </select>
              </div>
              <div className="flex-1 overflow-y-auto mb-4 space-y-3 pr-2">
                {messages.filter(msg => {
                  const myId = user.id || user._id;
                  if (chatTarget === 'team') return !msg.recipient;
                  return (msg.sender?._id === myId && msg.recipient?._id === chatTarget) || (msg.recipient?._id === myId && msg.sender?._id === chatTarget);
                }).map((msg, idx) => {
                  const isMe = msg.sender?._id === (user.id || user._id);
                  return (
                    <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <span className="text-xs text-gray-500 mb-1">{isMe ? 'You' : (msg.sender?.name || 'Unknown')} {msg.recipient && <span className="text-gray-400 ml-1">(Private)</span>}</span>
                      <div className={`px-3 py-2 rounded-lg max-w-[85%] ${isMe ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>{msg.content}</div>
                      <span className="text-[10px] text-gray-400 mt-1">{new Date(msg.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 px-3 py-2 border rounded-md shadow-sm text-sm" />
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow text-sm font-medium">Send</button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {swapShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <form onSubmit={handleRequestSwap} className="w-full max-w-md bg-white rounded-lg shadow-xl p-6">
            <h2 className="text-xl font-bold">Request a shift trade</h2>
            <p className="text-sm text-gray-600 mt-2">
              You give: <strong>{swapShift.date} {swapShift.startTime}–{swapShift.endTime}</strong>
            </p>
            {swapError && <p className="mt-3 rounded bg-red-100 p-2 text-sm text-red-700">{swapError}</p>}

            <label className="block mt-4 text-sm font-medium text-gray-700" htmlFor="swap-target">Trade with</label>
            <select
              id="swap-target"
              required
              value={swapTargetId}
              onChange={(e) => { setSwapTargetId(e.target.value); setSwapRequestedShiftId(''); }}
              className="mt-1 block w-full px-3 py-2 border rounded-md"
            >
              <option value="">Select a colleague</option>
              {users
                .filter((c) => getId(c._id) !== getId(user.id || user._id))
                .map((c) => (
                  <option key={c._id} value={c._id}>{c.name} ({c.role})</option>
                ))}
            </select>

            {swapTargetId && (
              <>
                <label className="block mt-4 text-sm font-medium text-gray-700" htmlFor="swap-requested-shift">In exchange for</label>
                {targetUserShifts.length === 0 ? (
                  <p className="mt-1 text-sm text-gray-500">
                    This colleague has no upcoming shifts available for trade.
                  </p>
                ) : (
                  <select
                    id="swap-requested-shift"
                    required
                    value={swapRequestedShiftId}
                    onChange={(e) => setSwapRequestedShiftId(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">Select one of their shifts</option>
                    {targetUserShifts.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.date} {s.startTime}–{s.endTime}
                      </option>
                    ))}
                  </select>
                )}
              </>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={closeSwapRequest} disabled={submittingSwap} className="px-4 py-2 rounded border">Cancel</button>
              <button type="submit" disabled={submittingSwap || !swapRequestedShiftId} className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2 rounded">{submittingSwap ? 'Sending…' : 'Send Request'}</button>
            </div>
          </form>
        </div>
      )}

      {editingShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-shift-title">
          <form onSubmit={handleUpdateShift} className="w-full max-w-md bg-white rounded-lg shadow-xl p-6">
            <h2 id="edit-shift-title" className="text-xl font-bold">Edit shift</h2>
            {editError && <p className="mt-3 rounded bg-red-100 p-2 text-sm text-red-700">{editError}</p>}

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700" htmlFor="edit-shift-venue">Venue</label>
              <input id="edit-shift-venue" type="text" value={editFormData.venue} readOnly className="mt-1 block w-full px-3 py-2 border rounded-md bg-gray-100 text-gray-600" />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700" htmlFor="edit-shift-date">Date</label>
              <input id="edit-shift-date" type="date" required value={editFormData.date} onChange={(e) => handleEditFieldChange('date', e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="edit-shift-start-time">Start</label>
                <input id="edit-shift-start-time" type="time" required value={editFormData.startTime} onChange={(e) => handleEditFieldChange('startTime', e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="edit-shift-end-time">End</label>
                <input id="edit-shift-end-time" type="time" required value={editFormData.endTime} onChange={(e) => handleEditFieldChange('endTime', e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md" />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700" htmlFor="edit-shift-role">Role</label>
              <input id="edit-shift-role" type="text" required value={editFormData.role} onChange={(e) => handleEditFieldChange('role', e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md" />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700" htmlFor="edit-shift-assignee">Assign To</label>
              <select id="edit-shift-assignee" value={editFormData.assignedTo} onChange={(e) => handleEditFieldChange('assignedTo', e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md">
                <option value="">-- Leave Unassigned --</option>
                {users.map((member) => <option key={member._id} value={member._id}>{member.name} ({member.role})</option>)}
              </select>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={closeEditShift} disabled={savingEdit} className="px-4 py-2 rounded border disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={savingEdit} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded">{savingEdit ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
