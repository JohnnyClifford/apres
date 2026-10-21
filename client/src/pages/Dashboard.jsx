import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDispatch, useSelector } from 'react-redux';
import { fetchShifts, createShift, fetchUsers, shiftReceivedViaSocket, socket } from '../features/shiftsSlice';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/client';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { list: shifts, users, loading, error } = useSelector((state) => state.shifts);
  console.log("USERS IN DROPDOWN:", users);

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatTarget, setChatTarget] = useState('team');
  const chatEndRef = useRef(null);

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

    const fetchChatHistory = async () => {
      try {
        const res = await apiClient.get('/chat');
        setMessages(res.data.messages);
      } catch (err) {
        console.error('Failed to load chat history', err);
      }
    };
    fetchChatHistory();

    socket.connect();
    
    const handleNewShift = (newShift) => {
      dispatch(shiftReceivedViaSocket(newShift));
    };

    const handleNewMessage = (message) => {
      setMessages((prev) => [...prev, message]);
    };
    
    socket.on('shift:created', handleNewShift);
    socket.on('chat:message', handleNewMessage);

    return () => {
      socket.off('shift:created', handleNewShift);
      socket.off('chat:message', handleNewMessage);
      socket.disconnect();
    };
  }, [dispatch, user.role]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatTarget]);

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

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const recipientId = chatTarget === 'team' ? null : chatTarget;

    socket.emit('chat:message', {
      userId: user.id || user._id,
      recipientId,
      content: newMessage,
    });

    setNewMessage('');
  };

  const isManager = user.role === 'manager' || user.role === 'owner';

  const visibleMessages = messages.filter((msg) => {
    const myId = user.id || user._id;
    const isSender = msg.sender?._id === myId;
    const isRecipient = msg.recipient?._id === myId;
    const isPublic = !msg.recipient;

    if (chatTarget === 'team') {
      return isPublic;
    } 
    else {
      return (isSender && msg.recipient?._id === chatTarget) || 
        (isRecipient && msg.sender?._id === chatTarget);
    }
  });

  const formatDate = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        
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

          <div className="space-y-8">
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

            <div className="bg-white p-6 rounded-lg shadow flex flex-col h-96">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h2 className="text-xl font-bold">Team Chat</h2>
                <select 
                  value={chatTarget} 
                  onChange={(e) => setChatTarget(e.target.value)}
                  className="text-sm border-gray-300 rounded-md shadow-sm"
                >
                  <option value="team">Everyone (Public)</option>
                  {users.filter(u => u._id !== (user.id || user._id)).map(u => (
                    <option key={u._id} value={u._id}>DM: {u.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex-1 overflow-y-auto mb-4 space-y-3 pr-2">
                {visibleMessages.length === 0 && <p className="text-gray-400 text-sm text-center mt-4">No messages yet. Say hello!</p>}
                {visibleMessages.map((msg, idx) => {
                  const isMe = msg.sender?._id === (user.id || user._id);
                  return (
                    <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <span className="text-xs text-gray-500 mb-1">
                        {isMe ? 'You' : (msg.sender?.name || 'Unknown')} 
                        {msg.recipient && <span className="text-gray-400 ml-1">(Private)</span>}
                      </span>
                      <div className={`px-3 py-2 rounded-lg max-w-[85%] ${isMe ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                        {msg.content}
                      </div>
                      <span className="text-[10px] text-gray-400 mt-1">
                        {formatDate(msg.createdAt)}
                      </span>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={chatTarget === 'team' ? "Message everyone..." : "Send a private message..."}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm"
                />
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow text-sm font-medium">
                  Send
                </button>
              </form>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}