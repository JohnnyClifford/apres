import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

const roles = ['staff', 'manager', 'owner'];

export default function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingUserId, setSavingUserId] = useState('');
  const [saveError, setSaveError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (user.role !== 'owner') {
      setLoading(false);
      return;
    }

    async function loadUsers() {
      setLoading(true);
      setError('');
      try {
        const response = await apiClient.get('/auth/users');
        setUsers(response.data.users);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load users.');
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, [user.role]);

  const getId = (value) => (value?.id || value?._id || value)?.toString();

  const handleRoleChange = async (targetUser, role) => {
    const targetUserId = getId(targetUser);
    setSavingUserId(targetUserId);
    setSaveError('');
    setSuccessMessage('');

    try {
      const response = await apiClient.patch(`/auth/users/${targetUserId}/role`, { role });
      const updatedUser = response.data.user;
      setUsers((currentUsers) => currentUsers.map((currentUser) => (
        getId(currentUser) === targetUserId ? updatedUser : currentUser
      )));
      setSuccessMessage(`${updatedUser.name}'s role was updated to ${updatedUser.role}.`);
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Failed to save the role change.');
    } finally {
      setSavingUserId('');
    }
  };

  if (user.role !== 'owner') {
    return <p className="p-8">Only owners can access this page.</p>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-5xl mx-auto bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
          <Link to="/dashboard" className="text-blue-600 hover:text-blue-800 font-medium">Back to Dashboard</Link>
        </div>

        {loading && <p>Loading users...</p>}
        {error && <p className="rounded bg-red-100 p-3 text-red-700">{error}</p>}
        {saveError && <p className="mb-4 rounded bg-red-100 p-3 text-red-700">{saveError}</p>}
        {successMessage && <p className="mb-4 rounded bg-green-100 p-3 text-green-700">{successMessage}</p>}

        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b text-sm text-gray-600">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((listedUser) => {
                  const listedUserId = getId(listedUser);
                  const isCurrentUser = listedUserId === getId(user);
                  const isSaving = savingUserId === listedUserId;
                  return (
                    <tr key={listedUserId} className="border-b">
                      <td className="p-3">{listedUser.name}</td>
                      <td className="p-3">{listedUser.email}</td>
                      <td className="p-3">
                        <select
                          value={listedUser.role}
                          disabled={isCurrentUser || isSaving}
                          onChange={(event) => handleRoleChange(listedUser, event.target.value)}
                          className="border rounded px-3 py-2 disabled:opacity-50"
                          aria-label={`Role for ${listedUser.name}`}
                        >
                          {roles.map((role) => <option key={role} value={role}>{role}</option>)}
                        </select>
                        {isSaving && <span className="ml-2 text-sm text-gray-500">Saving...</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
