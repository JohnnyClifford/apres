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
import { formatReadableDate, formatWeekLabel, getWeekStart } from '../utils/dateUtils';
import Hero from '../components/Hero';
import Card from '../components/Card';

export default function Dashboard() {

  /* ========================================================================
     1. CONTEXT, REDUX & ROUTING
     ======================================================================== */
     
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { list: shifts, users, swaps, loading, error } = useSelector((state) => state.shifts);

  /* ========================================================================
     2. UI STATE
     ======================================================================== */

  const [viewMode, setViewMode] = useState('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
  const [shiftWeekOffset, setShiftWeekOffset] = useState(0);
  const [ownerFilterActive, setOwnerFilterActive] = useState(false);

  const [formData, setFormData] = useState({
    venue: '', date: '', startTime: '17:00', endTime: '23:00', role: 'staff', assignedTo: '',
  });
  const [formError, setFormError] = useState('');
  const [creatingShift, setCreatingShift] = useState(false);
  const [venueName, setVenueName] = useState('');

  const [editingShift, setEditingShift] = useState(null);
  const [editFormData, setEditFormData] = useState({
    venue: '', date: '', startTime: '', endTime: '', role: '', assignedTo: '',
  });
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [swapShift, setSwapShift] = useState(null);
  const [swapTargetId, setSwapTargetId] = useState('');
  const [swapRequestedShiftId, setSwapRequestedShiftId] = useState('');
  const [swapError, setSwapError] = useState('');
  const [submittingSwap, setSubmittingSwap] = useState(false);
  const [resolvingSwapId, setResolvingSwapId] = useState('');
  const [deletingShiftId, setDeletingShiftId] = useState('');

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatTarget, setChatTarget] = useState('team');
  const chatEndRef = useRef(null);

  /* ========================================================================
     3. EFFECTS
     ======================================================================== */

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
        setFormData((current) => ({ ...current, venue: fetchedVenueName }));
      } catch (err) {
        console.error('Failed to load venue settings');
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatTarget]);

  /* ========================================================================
     4. HELPERS & DERIVED DATA
     ======================================================================== */

  const handleLogout = () => { logout(); navigate('/login'); };
  const isManager = user.role === 'manager' || user.role === 'owner';
  const isStaff = user.role === 'staff';
  const isOwner = user.role === 'owner';

  const getId = (value) => (typeof value === 'object' && value !== null ? value._id : value)?.toString();
  const getUserName = (userId) => users.find(u => getId(u._id) === getId(userId))?.name || 'Assigned';
  const isPastShift = (dateStr) => new Date(dateStr + 'T23:59:59') < new Date();

  const formatLocalDate = (date) => {
    const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
    return offsetDate.toISOString().split('T')[0];
  };

  const today = new Date();
  const sevenDaysFromToday = new Date(today);
  sevenDaysFromToday.setDate(today.getDate() + 7);
  const todayDate = formatLocalDate(today);
  const sevenDaysFromTodayDate = formatLocalDate(sevenDaysFromToday);

  const upcomingUnassignedShifts = shifts.filter((shift) => (
    !shift.assignedTo && shift.date >= todayDate && shift.date <= sevenDaysFromTodayDate
  ));
  const displayedShifts = ownerFilterActive ? upcomingUnassignedShifts : shifts;

  const getSelectedWeekMonday = (offset) => {
    const currentMonday = new Date(`${getWeekStart(formatLocalDate(new Date()))}T00:00:00`);
    currentMonday.setDate(currentMonday.getDate() + offset * 7);
    return formatLocalDate(currentMonday);
  };
  const selectedWeekMonday = getSelectedWeekMonday(shiftWeekOffset);
  const selectedWeekSunday = new Date(`${selectedWeekMonday}T00:00:00`);
  selectedWeekSunday.setDate(selectedWeekSunday.getDate() + 6);
  const selectedWeekSundayDate = formatLocalDate(selectedWeekSunday);
  const selectedWeekShifts = displayedShifts.filter((shift) => (
    shift.date >= selectedWeekMonday && shift.date <= selectedWeekSundayDate
  ));

  const selectedDayShifts = displayedShifts.filter((shift) => shift.date === selectedDay);
  const shiftsByRole = selectedDayShifts.reduce((groups, shift) => {
    const role = shift.role || 'Unspecified role';
    if (!groups[role]) groups[role] = [];
    groups[role].push(shift);
    return groups;
  }, {});

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
  const daysInMonth = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  const firstDay = getFirstDayOfMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const changeSelectedDay = (days) => {
    const nextDay = new Date(`${selectedDay}T00:00:00`);
    nextDay.setDate(nextDay.getDate() + days);
    setSelectedDay(formatLocalDate(nextDay));
  };

  useEffect(() => {
    const selectedWeekDate = new Date(`${selectedWeekMonday}T00:00:00`);
    setCurrentMonth(new Date(selectedWeekDate.getFullYear(), selectedWeekDate.getMonth(), 1));
  }, [selectedWeekMonday]);

  const targetUserShifts = swapTargetId ? shifts.filter(s => getId(s.assignedTo) === swapTargetId) : [];

  /* ========================================================================
     5. ACTION HANDLERS
     ======================================================================== */

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

  const handleDeleteShift = async (id) => {
    if (window.confirm('Are you sure you want to delete this shift?')) {
      setDeletingShiftId(id);
      try { await dispatch(deleteShift(id)); } finally { setDeletingShiftId(''); }
    }
  };

  const openEditShift = (shift) => {
    setEditingShift(shift);
    setEditFormData({
      venue: shift.venue || '', date: shift.date || '', startTime: shift.startTime || '',
      endTime: shift.endTime || '', role: shift.role || '', assignedTo: getId(shift.assignedTo) || '',
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
    } catch (err) { setEditError(err?.error || err || 'Failed to update shift.'); } finally {
      setSavingEdit(false);
    }
  };

  const openSwapRequest = (shift) => {
    setSwapShift(shift); setSwapTargetId(''); setSwapRequestedShiftId(''); setSwapError('');
  };

  const handleRequestSwap = async (e) => {
    e.preventDefault();
    if (!swapTargetId || !swapRequestedShiftId) { setSwapError('Fill all fields.'); return; }
    setSubmittingSwap(true); setSwapError('');
    try {
      const res = await apiClient.post('/swaps', {
        shiftId: swapShift._id, toUserId: swapTargetId, requestedShiftId: swapRequestedShiftId,
      });
      dispatch(swapReceivedViaSocket(res.data.swap));
      setSwapShift(null);
    } catch (err) { setSwapError(err.response?.data?.error || 'Unable to request this swap.'); } finally {
      setSubmittingSwap(false);
    }
  };

  const handleResolveSwap = async (swapId, status) => {
    setResolvingSwapId(swapId);
    try {
      const res = await apiClient.patch(`/swaps/${swapId}`, { status });
      dispatch(swapReceivedViaSocket(res.data.swap));
    } catch (err) { setSwapError(err.response?.data?.error || 'Unable to update swap.'); } finally {
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

  const closeSwapRequest = () => { if (!submittingSwap) setSwapShift(null); };
  const closeEditShift = () => { if (!savingEdit) setEditingShift(null); };

  /* ========================================================================
     6. RENDER
     ======================================================================== */

  return (
    <div className="min-h-screen bg-cream-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto">

        {/* === HERO HEADER === */}
        <Hero eyebrow={`Welcome, ${user.name} (${user.role})`} title="Dashboard">
          <div className="flex flex-wrap gap-3">
            {isManager && (
              <Link to="/tips" className="inline-flex items-center bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-full font-medium transition-colors">
                Tip Calculator
              </Link>
            )}
            {isStaff && (
              <Link to="/tips" className="inline-flex items-center bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-full font-medium transition-colors">
                My Tip Payouts
              </Link>
            )}
            {isOwner && (
              <Link to="/settings" className="inline-flex items-center bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-full font-medium transition-colors">
                ⚙ Settings
              </Link>
            )}
            <button onClick={handleLogout} className="inline-flex items-center bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-full font-medium transition-colors">
              Log Out
            </button>
          </div>
        </Hero>

        {/* === MAIN GRID === */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">

          {/* --- LEFT COLUMN: SHIFTS PANEL --- */}
          <Card className="md:col-span-2 p-6 md:p-8">

            {/* View Toggle */}
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h2 className="text-xl font-bold text-ink-900">Shifts</h2>
              <div className="flex gap-2 bg-cream-100 p-1 rounded-full">
                {['list', 'calendar', 'day'].map(mode => (
                  <button key={mode} onClick={() => setViewMode(mode)} className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${viewMode === mode ? 'bg-white shadow text-forest-700' : 'text-ink-600 hover:text-ink-900'}`}>
                    {mode === 'day' ? 'By Day' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {loading && <p className="text-ink-600">Loading shifts...</p>}
            {error && <p className="text-red-500">{error}</p>}

            {/* Week Navigation */}
            {viewMode !== 'day' && (
              <div className="flex items-center justify-between mb-4 bg-cream-100 p-2 rounded-2xl border border-ink-400/10">
                <button onClick={() => setShiftWeekOffset(o => o - 1)} className="px-3 py-1 text-sm font-medium text-forest-600 hover:text-forest-700">&larr; Prev Week</button>
                <span className="font-medium text-ink-900">{formatWeekLabel(selectedWeekMonday)}</span>
                <button onClick={() => setShiftWeekOffset(o => o + 1)} className="px-3 py-1 text-sm font-medium text-forest-600 hover:text-forest-700">Next Week &rarr;</button>
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="space-y-3">
                {selectedWeekShifts.length === 0 && <p className="text-ink-600">No shifts scheduled for this week.</p>}
                {selectedWeekShifts.map(shift => {
                  const past = isPastShift(shift.date);
                  const isMyShift = getId(shift.assignedTo) === getId(user.id || user._id);
                  return (
                    <div key={shift._id} className={`border border-ink-400/15 p-4 rounded-2xl flex justify-between items-center transition-colors ${past ? 'bg-cream-100 opacity-60' : 'bg-white hover:border-forest-500/30'}`}>
                      <div>
                        <p className="font-bold text-ink-900">{formatReadableDate(shift.date)} <span className="text-sm font-normal text-ink-600">at {shift.venue}</span></p>
                        <p className="text-ink-600 text-sm">{shift.startTime} - {shift.endTime} ({shift.role})</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {shift.assignedTo ? (
                          <span className="text-xs bg-forest-50 text-forest-700 px-3 py-1 rounded-full font-medium">{getUserName(shift.assignedTo)}</span>
                        ) : (
                          <span className="text-xs bg-amber-50 text-amber-700 px-3 py-1 rounded-full font-medium">Unassigned</span>
                        )}
                        {isManager && (
                          <>
                            <button onClick={() => openEditShift(shift)} className="text-forest-600 hover:text-forest-700 text-sm font-medium px-2">Edit</button>
                            <button onClick={() => handleDeleteShift(shift._id)} disabled={deletingShiftId === shift._id} className="text-red-500 hover:text-red-700 text-sm font-bold px-2 disabled:opacity-50">{deletingShiftId === shift._id ? '...' : '✕'}</button>
                          </>
                        )}
                        {isMyShift && !past && (
                          <button onClick={() => openSwapRequest(shift)} className="bg-forest-600 hover:bg-forest-700 text-white text-xs font-medium px-3 py-1.5 rounded-full">Swap</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Calendar View */}
            {viewMode === 'calendar' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <button onClick={prevMonth} className="px-3 py-1 bg-cream-100 rounded-full text-sm">&larr;</button>
                  <h3 className="font-bold text-ink-900">{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                  <button onClick={nextMonth} className="px-3 py-1 bg-cream-100 rounded-full text-sm">&rarr;</button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-2 font-medium text-ink-400 text-xs uppercase tracking-wider">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, idx) => {
                    if (!day) return <div key={`empty-${idx}`} className="h-24 bg-cream-100/50 rounded-xl p-1"></div>;
                    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayShifts = selectedWeekShifts.filter(s => s.date === dateStr);
                    const isToday = dateStr === new Date().toISOString().split('T')[0];
                    return (
                      <div key={day} className={`h-24 border rounded-xl p-1.5 overflow-y-auto text-sm ${isToday ? 'border-forest-500 bg-forest-50' : 'bg-white border-ink-400/10'}`}>
                        <span className={`font-bold text-xs ${isToday ? 'text-forest-600' : 'text-ink-600'}`}>{day}</span>
                        <div className="mt-1 space-y-1">
                          {dayShifts.map(s => (
                            <div key={s._id} className={`text-[11px] px-1.5 py-0.5 rounded truncate ${isPastShift(s.date) ? 'bg-cream-100 text-ink-400' : 'bg-forest-100 text-forest-700'}`}>{s.startTime} {getUserName(s.assignedTo)}</div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* By Day View */}
            {viewMode === 'day' && (
              <div>
                <div className="flex items-center justify-between mb-4 bg-cream-100 p-2 rounded-2xl border border-ink-400/10">
                  <button onClick={() => changeSelectedDay(-1)} className="px-3 py-1 text-sm font-medium text-forest-600">&larr; Prev</button>
                  <span className="font-medium text-ink-900">{formatReadableDate(selectedDay)}</span>
                  <button onClick={() => changeSelectedDay(1)} className="px-3 py-1 text-sm font-medium text-forest-600">Next &rarr;</button>
                </div>
                {selectedDayShifts.length === 0 && <p className="text-ink-600">No shifts scheduled for {formatReadableDate(selectedDay)}.</p>}
                {Object.entries(shiftsByRole).map(([role, roleShifts]) => (
                  <section key={role} className="mb-6">
                    <div className="flex items-center gap-2 font-semibold text-lg border-b border-ink-400/10 pb-1 mb-3">
                      <h4 className="text-ink-900">{role}</h4>
                      {roleShifts.some((shift) => !shift.assignedTo) && <span className="bg-red-50 text-red-700 text-xs font-bold px-2 py-1 rounded-full">⚠️ Unassigned</span>}
                    </div>
                    <ul className="space-y-2">
                      {roleShifts.map((shift) => (
                        <li key={shift._id} className="flex justify-between items-center p-3 bg-cream-50 rounded-xl border border-ink-400/10">
                          <span className="text-ink-900">{shift.startTime} - {shift.endTime}</span>
                          <span className="text-sm text-ink-600">{shift.assignedTo ? getUserName(shift.assignedTo) : 'Unassigned'}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </Card>

          {/* --- RIGHT COLUMN: SIDE PANELS --- */}
          <div className="space-y-6">

            {/* Owner Coverage Alert */}
            {isOwner && upcomingUnassignedShifts.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-3xl p-6">
                <h2 className="text-red-800 font-bold">Coverage Alert</h2>
                <p className="mt-2 text-red-800 text-sm">⚠️ {upcomingUnassignedShifts.length} unassigned shift(s) in the next 7 days.</p>
                <button onClick={() => setOwnerFilterActive((active) => !active)} className={`mt-3 px-4 py-2 rounded-full text-sm text-white font-medium ${ownerFilterActive ? 'bg-ink-600 hover:bg-ink-900' : 'bg-red-600 hover:bg-red-700'}`}>
                  {ownerFilterActive ? 'Show all shifts' : 'Show only unassigned'}
                </button>
              </div>
            )}

            {/* Pending Swaps */}
            {isManager && (
              <Card className="p-6">
                <h2 className="text-lg font-bold text-ink-900 mb-4">Pending Swaps</h2>
                {swapError && <p className="mb-3 rounded-xl bg-red-50 border border-red-200 p-2 text-sm text-red-700">{swapError}</p>}
                {swaps.filter((swap) => swap.status === 'pending').length === 0 ? (
                  <p className="text-sm text-ink-600">No pending swap requests.</p>
                ) : (
                  <div className="space-y-3">
                    {swaps.filter((swap) => swap.status === 'pending').map((swap) => {
                      const offered = shifts.find((item) => getId(item._id) === getId(swap.shift));
                      const requested = swap.requestedShift ? shifts.find((item) => getId(item._id) === getId(swap.requestedShift)) : null;
                      return (
                        <div key={swap._id} className="border border-ink-400/15 rounded-2xl p-4 text-sm">
                          <p className="font-semibold text-ink-900">{getUserName(swap.fromUser)} ⇄ {getUserName(swap.toUser)}</p>
                          <p className="text-ink-600 mt-1 text-xs">Gives: {offered ? `${formatReadableDate(offered.date)} ${offered.startTime}–${offered.endTime}` : '—'}</p>
                          <p className="text-ink-600 text-xs">Wants: {requested ? `${formatReadableDate(requested.date)} ${requested.startTime}–${requested.endTime}` : '—'}</p>
                          <div className="flex gap-2 mt-3">
                            <button onClick={() => handleResolveSwap(swap._id, 'accepted')} disabled={resolvingSwapId === swap._id} className="bg-forest-600 hover:bg-forest-700 text-white text-xs px-3 py-1.5 rounded-full disabled:opacity-50">Approve</button>
                            <button onClick={() => handleResolveSwap(swap._id, 'rejected')} disabled={resolvingSwapId === swap._id} className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-full disabled:opacity-50">Deny</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            )}

            {/* Add Shift Form */}
            {isManager && venueName && (
              <Card className="p-6">
                <h2 className="text-lg font-bold text-ink-900 mb-4">Add Shift</h2>
                {formError && <div className="bg-red-50 text-red-700 p-2 rounded-xl mb-4 text-sm border border-red-200">{formError}</div>}
                <form onSubmit={handleCreateShift} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-900 mb-1.5" htmlFor="shift-date">Date</label>
                    <input id="shift-date" type="date" required value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="block w-full px-4 py-2 border border-ink-400/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500 text-ink-900 bg-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-ink-900 mb-1.5" htmlFor="shift-start-time">Start</label>
                      <input id="shift-start-time" type="time" required value={formData.startTime} onChange={(e) => setFormData({...formData, startTime: e.target.value})} className="block w-full px-4 py-2 border border-ink-400/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500 text-ink-900 bg-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink-900 mb-1.5" htmlFor="shift-end-time">End</label>
                      <input id="shift-end-time" type="time" required value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})} className="block w-full px-4 py-2 border border-ink-400/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500 text-ink-900 bg-white" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-900 mb-1.5" htmlFor="shift-assignee">Assign To</label>
                    <select id="shift-assignee" value={formData.assignedTo} onChange={(e) => setFormData({...formData, assignedTo: e.target.value})} className="block w-full px-4 py-2 border border-ink-400/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500 text-ink-900 bg-white">
                      <option value="">-- Leave Unassigned --</option>
                      {users.map(u => <option key={u._id} value={u._id}>{u.name} ({u.role})</option>)}
                    </select>
                  </div>
                  <button type="submit" disabled={creatingShift} className="w-full bg-forest-600 hover:bg-forest-700 text-white font-medium py-2.5 rounded-full disabled:opacity-50 transition-colors">{creatingShift ? 'Creating...' : 'Create Shift'}</button>
                </form>
              </Card>
            )}

            {/* Team Chat */}
            <Card className="p-6 flex flex-col h-96">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-ink-900">Team Chat</h2>
                <select value={chatTarget} onChange={(e) => setChatTarget(e.target.value)} className="text-xs border border-ink-400/30 rounded-lg px-2 py-1 bg-white">
                  <option value="team">Everyone</option>
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
                      <span className="text-[10px] text-ink-400 mb-1">{isMe ? 'You' : (msg.sender?.name || 'Unknown')} {msg.recipient && <span className="ml-1">(Private)</span>}</span>
                      <div className={`px-3 py-2 rounded-2xl max-w-[85%] text-sm ${isMe ? 'bg-forest-600 text-white' : 'bg-cream-100 text-ink-900'}`}>{msg.content}</div>
                      <span className="text-[10px] text-ink-400 mt-1">{new Date(msg.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 px-4 py-2 border border-ink-400/30 rounded-full shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-forest-500/30" />
                <button type="submit" className="bg-forest-600 hover:bg-forest-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors">Send</button>
              </form>
            </Card>

          </div>
        </div>
      </div>

      {/* === MODALS === */}

      {/* Swap Request Modal */}
      {swapShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <form onSubmit={handleRequestSwap} className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
            <h2 className="text-xl font-bold text-ink-900">Request a shift trade</h2>
            <p className="text-sm text-ink-600 mt-2">You give: <strong className="text-ink-900">{formatReadableDate(swapShift.date)} {swapShift.startTime}–{swapShift.endTime}</strong></p>
            {swapError && <p className="mt-3 rounded-xl bg-red-50 border border-red-200 p-2 text-sm text-red-700">{swapError}</p>}

            <label className="block mt-4 text-sm font-medium text-ink-900 mb-1.5" htmlFor="swap-target">Trade with</label>
            <select id="swap-target" required value={swapTargetId} onChange={(e) => { setSwapTargetId(e.target.value); setSwapRequestedShiftId(''); }} className="block w-full px-4 py-2 border border-ink-400/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500/30">
              <option value="">Select a colleague</option>
              {users.filter((c) => getId(c._id) !== getId(user.id || user._id)).map((c) => <option key={c._id} value={c._id}>{c.name} ({c.role})</option>)}
            </select>

            {swapTargetId && (
              <>
                <label className="block mt-4 text-sm font-medium text-ink-900 mb-1.5" htmlFor="swap-requested-shift">In exchange for</label>
                {targetUserShifts.length === 0 ? <p className="mt-1 text-sm text-ink-600">No upcoming shifts available.</p> : (
                  <select id="swap-requested-shift" required value={swapRequestedShiftId} onChange={(e) => setSwapRequestedShiftId(e.target.value)} className="block w-full px-4 py-2 border border-ink-400/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500/30">
                    <option value="">Select one of their shifts</option>
                    {targetUserShifts.map((s) => <option key={s._id} value={s._id}>{formatReadableDate(s.date)} {s.startTime}–{s.endTime}</option>)}
                  </select>
                )}
              </>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={closeSwapRequest} disabled={submittingSwap} className="px-5 py-2 rounded-full border border-ink-400/30 text-ink-600 hover:bg-cream-50 font-medium transition-colors">Cancel</button>
              <button type="submit" disabled={submittingSwap || !swapRequestedShiftId} className="bg-forest-600 hover:bg-forest-700 disabled:opacity-40 text-white px-5 py-2 rounded-full font-medium transition-colors">{submittingSwap ? 'Sending…' : 'Send Request'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Shift Modal */}
      {editingShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <form onSubmit={handleUpdateShift} className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
            <h2 className="text-xl font-bold text-ink-900">Edit shift</h2>
            {editError && <p className="mt-3 rounded-xl bg-red-50 border border-red-200 p-2 text-sm text-red-700">{editError}</p>}
            <div className="mt-4">
              <label className="block text-sm font-medium text-ink-900 mb-1.5" htmlFor="edit-shift-venue">Venue</label>
              <input id="edit-shift-venue" type="text" value={editFormData.venue} readOnly className="block w-full px-4 py-2 border border-ink-400/30 rounded-xl bg-cream-100 text-ink-600" />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-ink-900 mb-1.5" htmlFor="edit-shift-date">Date</label>
              <input id="edit-shift-date" type="date" required value={editFormData.date} onChange={(e) => handleEditFieldChange('date', e.target.value)} className="block w-full px-4 py-2 border border-ink-400/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500/30" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-ink-900 mb-1.5" htmlFor="edit-shift-start-time">Start</label>
                <input id="edit-shift-start-time" type="time" required value={editFormData.startTime} onChange={(e) => handleEditFieldChange('startTime', e.target.value)} className="block w-full px-4 py-2 border border-ink-400/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-900 mb-1.5" htmlFor="edit-shift-end-time">End</label>
                <input id="edit-shift-end-time" type="time" required value={editFormData.endTime} onChange={(e) => handleEditFieldChange('endTime', e.target.value)} className="block w-full px-4 py-2 border border-ink-400/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500/30" />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-ink-900 mb-1.5" htmlFor="edit-shift-role">Role</label>
              <input id="edit-shift-role" type="text" required value={editFormData.role} onChange={(e) => handleEditFieldChange('role', e.target.value)} className="block w-full px-4 py-2 border border-ink-400/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500/30" />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-ink-900 mb-1.5" htmlFor="edit-shift-assignee">Assign To</label>
              <select id="edit-shift-assignee" value={editFormData.assignedTo} onChange={(e) => handleEditFieldChange('assignedTo', e.target.value)} className="block w-full px-4 py-2 border border-ink-400/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500/30">
                <option value="">-- Leave Unassigned --</option>
                {users.map((member) => <option key={member._id} value={member._id}>{member.name} ({member.role})</option>)}
              </select>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={closeEditShift} disabled={savingEdit} className="px-5 py-2 rounded-full border border-ink-400/30 text-ink-600 hover:bg-cream-50 font-medium transition-colors">Cancel</button>
              <button type="submit" disabled={savingEdit} className="bg-forest-600 hover:bg-forest-700 text-white px-5 py-2 rounded-full font-medium transition-colors">{savingEdit ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}