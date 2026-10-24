import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Tips from './pages/Tips';
import UserManagement from './pages/UserManagement';
import Settings from './pages/Settings';
import Availability from './pages/Availability';
import WeeklyAvailability from './pages/WeeklyAvailability';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/tips" 
        element={
          <ProtectedRoute>
            <Tips />
          </ProtectedRoute>
        } 
      />
      <Route
        path="/time-off"
        element={
          <ProtectedRoute>
            <Availability />
          </ProtectedRoute>
        }
      />
      <Route path="/availability" element={<Navigate to="/time-off" replace />} />
      <Route
        path="/weekly-availability"
        element={
          <ProtectedRoute>
            <WeeklyAvailability />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <UserManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
