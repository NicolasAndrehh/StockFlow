    import { AuthLayout } from '../../common/AuthLayout/AuthLayout';
import { Button } from '../../common/Button/Button';
import { useAuth } from './AuthContext';

export default function NoAccessView() {
  const { user, logout } = useAuth();

  return (
    <AuthLayout>
      <h3 style={{ marginTop: 0 }}>No sections available yet</h3>
      <p style={{ color: 'var(--dim)', fontSize: '.85rem' }}>
        There are no modules enabled for the {user?.role} role yet. Check back once this sprint's features are ready.
      </p>
      <Button variant="ghost" onClick={logout} style={{ marginTop: '.5rem' }}>
        Sign out
      </Button>
    </AuthLayout>
  );
}