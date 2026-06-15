import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Diamond } from 'lucide-react';
import { Input } from '../components/Input';
import { useStoreSettings } from '../hooks/useStoreSettings';

export function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { settings, loading: settingsLoading } = useStoreSettings();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (settingsLoading) return;
    
    setError('');
    setLoading(true);

    try {
      const correctPassword = settings?.adminPassword || 'P123';
      if (username === 'admin' && password === correctPassword) {
        localStorage.setItem('adminUnlocked', 'true');
        navigate('/admin');
      } else {
        setError('Invalid username or password.');
      }
    } catch (err: any) {
      console.error(err);
      setError('An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-slate-900">
          <Diamond className="h-12 w-12" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
          Supplier Administration
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Log in with your administrator account to manage inventory.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-100">
          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label 
                htmlFor="username" 
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Username
              </label>
              <Input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
              />
            </div>
            
            <div>
              <label 
                htmlFor="password" 
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full text-base"
              disabled={loading || settingsLoading}
            >
              {loading || settingsLoading ? 'Loading...' : 'Log In'}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-xs">
            <Link to="/login" className="text-slate-500 hover:text-slate-700">
              Return to Storefront Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
