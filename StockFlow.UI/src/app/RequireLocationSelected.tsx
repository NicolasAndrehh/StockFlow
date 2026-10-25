import { Outlet } from 'react-router-dom';

export function RequireLocationSelected() {
  // Se elimina el bloqueo inicial: el Administrador entra directo al sistema
  // y puede cambiar de sede libremente desde el control en el menú superior (TopBar).
  return <Outlet />;
}