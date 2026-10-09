import { HashRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import PublicLayout from './public-site/components/PublicLayout';
import ClientLayout from './public-site/components/ClientLayout';
import BookAppointment from './public-site/pages/BookAppointment';
import PublicErrorBoundary from './public-site/components/PublicErrorBoundary';

// BookAppointment se importa de forma eager (no lazy) porque es la pagina de "/" y
// "/agendar" — la mas visitada y la que de verdad importa que abra rapido para que la
// gente agende. Cargarla lazy solo agregaba una espera de red extra (bundle principal ->
// React monta -> router resuelve ruta -> RECIEN ahi empieza a pedir el chunk) antes de
// poder mostrar nada. El resto de paginas (login, perfil, etc.) se mantienen lazy: no
// las necesita quien entra a reservar.
const Home = lazy(() => import('./public-site/pages/Home'));
const Services = lazy(() => import('./public-site/pages/Services'));
const Login = lazy(() => import('./public-site/pages/Login'));
const Profile = lazy(() => import('./public-site/pages/Profile'));
const ClientDashboard = lazy(() => import('./public-site/pages/ClientDashboard'));
const ForgotPassword = lazy(() => import('./public-site/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./public-site/pages/ResetPassword'));
const CompleteRegistration = lazy(() => import('./public-site/pages/CompleteRegistration'));
const ClientAppointments = lazy(() => import('./public-site/pages/ClientAppointments'));
const ClientSettings = lazy(() => import('./public-site/pages/ClientSettings'));
const Explore = lazy(() => import('./public-site/pages/Explore'));

export default function PublicRouter() {
  return (
    <HashRouter>
      <PublicErrorBoundary>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/admin.html" element={<Home />} />  {/* legacy redirect */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<BookAppointment />} />
              <Route path="/agendar" element={<BookAppointment />} />
              <Route path="/servicios" element={<Services />} />
              <Route path="/registro" element={<Login />} />
              <Route path="/login" element={<Login />} />
              <Route path="/olvidar-contraseña" element={<ForgotPassword />} />
              <Route path="/restablecer-contraseña" element={<ResetPassword />} />
              <Route path="/completar-registro" element={<CompleteRegistration />} />
              <Route path="/perfil" element={<ClientLayout />}>
                <Route index element={<ClientDashboard />} />
                <Route path="club" element={<Profile />} />
                <Route path="citas" element={<ClientAppointments />} />
                <Route path="reservar" element={<BookAppointment isEmbedded={true} />} />
                <Route path="explorar" element={<Explore />} />
                <Route path="ajustes" element={<ClientSettings />} />
              </Route>
              <Route path="*" element={<BookAppointment />} />
            </Route>
          </Routes>
        </Suspense>
      </PublicErrorBoundary>
    </HashRouter>
  );
}
