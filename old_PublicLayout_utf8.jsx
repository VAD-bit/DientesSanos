import { Outlet } from 'react-router-dom';

export default function PublicLayout() {
  return (
    <div style={{ minHeight: '100vh', background: '#e9eae8' }}>
      <Outlet />
    </div>
  );
}
