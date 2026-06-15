import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Diamond } from 'lucide-react';
import { useStoreSettings } from '../hooks/useStoreSettings';

export function ClientLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { settings, loading } = useStoreSettings();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const correctPassword = settings?.storePassword || '123';
      if (password === correctPassword) {
        localStorage.setItem('storeUnlocked', 'true');
        navigate('/');
      } else {
        setError('Invalid store access password. Please try again.');
      }
    } catch (err: any) {
      console.error(err);
      setError('Invalid store access password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-slate-900">
          {settings?.loginPageLogoUrl ? (
            <img src={settings.loginPageLogoUrl} alt="Login Logo" className="h-20 object-contain" />
          ) : settings?.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="h-20 object-contain" />
          ) : (
            <Diamond className="h-12 w-12" />
          )}
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
          {settings?.loginPageName || 'Exclusive Gem Inventory'}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Please enter the storefront password to access the collection.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-100">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Store Password
              </label>
              <div className="mt-1">
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter access code"
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <div>
              <Button type="submit" className="w-full" disabled={submitting} style={{ backgroundColor: 'var(--color-primary, #4f46e5)', borderColor: 'var(--color-primary, #4f46e5)', color: 'white' }}>
                {submitting ? 'Verifying...' : 'Enter Collection'}
              </Button>
            </div>
          </form>
          
          <div className="mt-6 text-center text-xs">
            <Link to="/admin/login" className="text-slate-500 hover:text-slate-700">
              Admin Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
