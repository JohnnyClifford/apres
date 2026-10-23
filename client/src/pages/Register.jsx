import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Hero from '../components/Hero';
import Card from '../components/Card';
import Button from '../components/Button';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await register(email, password, name);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 p-6 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <Hero eyebrow="Join the team" title="Après">
          <p className="text-forest-100/90 text-sm">
            Create your account to manage shifts and tips.
          </p>
        </Hero>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl border border-red-100">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="register-name" className="block text-sm font-medium text-ink-900 mb-1.5">
                Full name
              </label>
              <input
                id="register-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-4 py-2.5 border border-ink-400/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500 text-ink-900 bg-white"
              />
            </div>

            <div>
              <label htmlFor="register-email" className="block text-sm font-medium text-ink-900 mb-1.5">
                Email
              </label>
              <input
                id="register-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-4 py-2.5 border border-ink-400/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500 text-ink-900 bg-white"
              />
            </div>

            <div>
              <label htmlFor="register-password" className="block text-sm font-medium text-ink-900 mb-1.5">
                Password
              </label>
              <input
                id="register-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-4 py-2.5 border border-ink-400/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500 text-ink-900 bg-white"
              />
              <p className="text-xs text-ink-400 mt-1.5">Must be at least 8 characters</p>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          <p className="text-center text-sm text-ink-600 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-forest-600 hover:text-forest-700 font-medium">
              Log in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}