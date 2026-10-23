import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import Hero from '../components/Hero';
import Card from '../components/Card';
import Button from '../components/Button';

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [venueInput, setVenueInput] = useState('');
  const [venueMessage, setVenueMessage] = useState('');
  const [venueError, setVenueError] = useState('');
  const [savingVenue, setSavingVenue] = useState(false);
  const [loading, setLoading] = useState(true);

  // Route Guard: Only owners can see this page
  useEffect(() => {
    if (user.role !== 'owner') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Load initial settings
  useEffect(() => {
    if (user.role !== 'owner') return;
    const loadSettings = async () => {
      try {
        const res = await apiClient.get('/settings');
        setVenueInput(res.data.settings.venueName);
      } catch (err) {
        setVenueError(err.response?.data?.error || 'Failed to load settings.');
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, [user.role]);

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
      await apiClient.put('/settings', { venueName: venueInput });
      setVenueMessage('Venue settings saved successfully.');
    } catch (err) {
      setVenueError(err.response?.data?.error || 'Failed to save venue settings.');
    } finally {
      setSavingVenue(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-cream-50 p-8 text-center text-ink-600">Loading settings...</div>;

  return (
    <div className="min-h-screen bg-cream-50 p-6 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        <Hero eyebrow="Administration" title="Settings">
          <p className="text-forest-100/90 text-sm">Manage your venue and team access.</p>
        </Hero>

        <Card className="p-8">
          <h2 className="text-xl font-bold text-ink-900 mb-4 border-b pb-2">Venue Settings</h2>
          {venueError && <p className="mb-3 rounded bg-red-50 p-3 text-sm text-red-700 border border-red-100">{venueError}</p>}
          {venueMessage && <p className="mb-3 rounded bg-forest-50 p-3 text-sm text-forest-700 border border-forest-100">{venueMessage}</p>}
          
          <form onSubmit={handleSaveVenue} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink-900 mb-1.5" htmlFor="venueName">Venue name</label>
              <input
                id="venueName"
                type="text"
                value={venueInput}
                onChange={(e) => setVenueInput(e.target.value)}
                className="w-full px-4 py-2.5 border border-ink-400/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500 text-ink-900 bg-white"
              />
            </div>
            <Button type="submit" disabled={savingVenue}>
              {savingVenue ? 'Saving...' : 'Save Venue Name'}
            </Button>
          </form>
        </Card>

        <Card className="p-8">
          <h2 className="text-xl font-bold text-ink-900 mb-4 border-b pb-2">Team Management</h2>
          <p className="text-sm text-ink-600 mb-4">Promote staff to managers, update roles, and manage access.</p>
          <Link to="/users">
            <Button variant="secondary">Manage Users</Button>
          </Link>
        </Card>

        <div className="text-center pt-4">
          <Link to="/dashboard" className="text-forest-600 hover:text-forest-700 text-sm font-medium">
            &larr; Back to Dashboard
          </Link>
        </div>

      </div>
    </div>
  );
}