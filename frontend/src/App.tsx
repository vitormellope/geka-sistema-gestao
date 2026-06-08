import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import Toast, { setToastHandler, type ToastType } from '@/components/Toast';
import Spinner from '@/components/Spinner';

// Pages
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import NewDemand from '@/pages/NewDemand';
import Campaigns from '@/pages/Campaigns';
import TriageQueue from '@/pages/TriageQueue';
import DecupageQueue from '@/pages/DecupageQueue';
import KanbanBoard from '@/pages/KanbanBoard';
import UsersPage from '@/pages/Users';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function RoleRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles: string[];
}) {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <Login />
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/demands/new" element={<NewDemand />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route
          path="/queue/triage"
          element={
            <RoleRoute roles={['orcamentista', 'gerente']}>
              <TriageQueue />
            </RoleRoute>
          }
        />
        <Route
          path="/queue/project"
          element={
            <RoleRoute roles={['projetista', 'gerente']}>
              <DecupageQueue />
            </RoleRoute>
          }
        />
        <Route
          path="/kanban"
          element={
            <RoleRoute roles={['gerente']}>
              <KanbanBoard />
            </RoleRoute>
          }
        />
        <Route
          path="/users"
          element={
            <RoleRoute roles={['gerente']}>
              <UsersPage />
            </RoleRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = ++nextId.current;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  useEffect(() => {
    setToastHandler(addToast);
    return () => setToastHandler(() => {});
  }, [addToast]);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <AuthProvider>
      <AppRoutes />

      {/* Toast container */}
      <div className="fixed right-4 top-4 z-[100] flex flex-col gap-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </AuthProvider>
  );
}
