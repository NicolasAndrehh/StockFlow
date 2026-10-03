import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../common/AuthLayout/AuthLayout';
import { FormField } from '../../common/FormField/FormField';
import { Button } from '../../common/Button/Button';
import { useAuth } from './AuthContext';

export default function LoginView() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(code, password);
      // La redirección real la resuelve RequireLocationSelected/ProtectedRoute
      navigate('/', { replace: true });
    } catch {
      setError('Invalid code or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h3 style={{ marginTop: 0 }}>Sign in</h3>
      <form onSubmit={handleSubmit}>
        <FormField
          label="User code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoFocus
        />
        <FormField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p style={{ color: 'var(--orange)', fontSize: '.85rem' }}>{error}</p>}
        <Button type="submit" disabled={loading} style={{ marginTop: '.5rem' }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  );
}