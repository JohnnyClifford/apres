import { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function App() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios
      .get(`${API_URL}/health`)
      .then((res) => setHealth(res.data))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-800 rounded-2xl p-8 shadow-lg">
        <h1 className="text-3xl font-bold mb-2">Apres</h1>
        <p className="text-slate-400 mb-6">Shift scheduling for hospitality teams</p>
        <div className="text-sm">
          <div className="font-semibold mb-2">API status</div>
          {error && <div className="text-red-400">Error: {error}</div>}
          {health && (
            <pre className="bg-slate-900 rounded p-3 overflow-auto text-xs">
              {JSON.stringify(health, null, 2)}
            </pre>
          )}
          {!health && !error && <div className="text-slate-400">Checking…</div>}
        </div>
      </div>
    </div>
  );
}
