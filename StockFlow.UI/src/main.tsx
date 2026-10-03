import { createRoot } from 'react-dom/client';
import { AppRouter } from './app/router';
import './styles/_variables.scss';
import './styles/_typography.scss';
import './styles/_sizing.scss';

createRoot(document.getElementById('root')!).render(<AppRouter />);