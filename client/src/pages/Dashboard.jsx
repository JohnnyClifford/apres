import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Dashboard</h2>
      <p>Welcome, {user.name}! (Role: {user.role})</p>
      <button onClick={handleLogout}>Log Out</button>
    </div>
  );
}