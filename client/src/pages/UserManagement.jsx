import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import Hero from '../components/Hero';
import Card from '../components/Card';

export default function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    apiClient.get('/auth/users')
      .then(res => setUsers(res.data.users))
      .catch(err => setError(err.response?.data?.error || 'Failed to load users'));
  }, []);

  const handleRoleChange = async (id, role) => {
    setSaving(id); setError(''); setSuccessMessage('');
    try {
      const res = await apiClient.patch(`/auth/users/${id}/role`, { role });
      setUsers(prev => prev.map(u => u._id === id ? res.data.user : u));
      setSuccessMessage(`Role updated to ${role}.`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update role');
    } finally { setSaving(null); }
  };

  if (user.role !== 'owner') {
    return <div className="min-h-screen bg-cream-50 p-8 text-center text-ink-600">Only owners can access this page.</div>;
  }

  return (
    <div className="min-h-screen bg-cream-50 p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">

        <Hero eyebrow="Owner" title="Manage Users">
          <p className="text-forest-100/90 text-sm">Promote staff, adjust roles, and manage access.</p>
          <div className="mt-4">
            <Link to="/settings" className="inline-flex items-center bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-full font-medium text-sm transition-colors">
              &larr; Back to Settings
            </Link>
          </div>
        </Hero>

        {error && <div className="bg-red-50 text-red-700 p-4 rounded-2xl text-sm border border-red-100">{error}</div>}
        {successMessage && <div className="bg-forest-50 text-forest-700 p-4 rounded-2xl text-sm border border-forest-100">{successMessage}</div>}

        <Card className="p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-cream-100">
              <tr>
                <th className="text-left p-4 font-medium text-ink-600 text-xs uppercase tracking-wider">Name</th>
                <th className="text-left p-4 font-medium text-ink-600 text-xs uppercase tracking-wider">Email</th>
                <th className="text-left p-4 font-medium text-ink-600 text-xs uppercase tracking-wider">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={3} className="p-8 text-center text-ink-600 text-sm">No users found.</td></tr>
              )}
              {users.map(u => {
                const isSelf = u._id === (user.id || user._id);
                return (
                  <tr key={u._id} className="border-t border-ink-400/10">
                    <td className="p-4 text-ink-900 font-medium">{u.name}</td>
                    <td className="p-4 text-sm text-ink-600">{u.email}</td>
                    <td className="p-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        disabled={saving === u._id || isSelf}
                        title={isSelf ? 'You cannot change your own role' : ''}
                        className="px-3 py-1.5 border border-ink-400/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="staff">Staff</option>
                        <option value="manager">Manager</option>
                        <option value="owner">Owner</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

      </div>
    </div>
  );
}