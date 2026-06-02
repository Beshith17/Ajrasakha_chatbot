import { useEffect, useMemo, useState } from 'react';
import { NavLink, Navigate, Outlet, useNavigate, useOutletContext } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';

import { useAuth } from '../auth/AuthContext';
import type { LiveNotification } from '../types';

const SOCKET_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api').replace(/\/api$/, '');

export interface AppOutletContext {
  socket: Socket | null;
}

export function useAppOutletContext() {
  return useOutletContext<AppOutletContext>();
}

export function AppLayout() {
  const { contactInfo, logout, profile, user } = useAuth();
  const navigate = useNavigate();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);

  useEffect(() => {
    if (!user || !profile) {
      return;
    }

    const nextSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    nextSocket.on('connect', () => {
      nextSocket.emit('register-role', {
        role: profile.role,
        uid: user.uid,
      });
    });

    nextSocket.on('notification', (payload: LiveNotification) => {
      setNotifications((current) => [payload, ...current].slice(0, 4));
    });

    setSocket(nextSocket);

    return () => {
      nextSocket.disconnect();
      setSocket(null);
    };
  }, [profile, user]);

  useEffect(() => {
    if (notifications.length === 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setNotifications((current) => current.slice(0, -1));
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [notifications]);

  const heroCopy = useMemo(() => {
    if (profile?.role === 'expert') {
      return {
        eyebrow: 'Expert Command',
        title: 'Review live farmer sessions and respond in real time.',
        body: 'New farmer questions float in instantly, and selecting a session opens the full thread for expert guidance.',
      };
    }

    return {
      eyebrow: 'Farmer Workspace',
      title: 'Ask questions, track your session, and get expert replies live.',
      body: 'Your dashboard keeps the session code, question history, and expert responses in one place.',
    };
  }, [profile?.role]);

  async function handleLogout() {
    await logout();
    navigate('/signin', { replace: true });
  }

  if (!profile) {
    return <Navigate replace to="/role-setup" />;
  }

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="brand-block fade-in">
          <p className="eyebrow">Ajrasakha</p>
          <h1>{profile.role === 'expert' ? 'Expert response console' : 'Farmer support dashboard'}</h1>
          <p>
            {profile.role === 'expert'
              ? 'Join open sessions, review farmer questions, and answer with field-ready advice.'
              : 'Stay inside your own support session and receive expert guidance without leaving the dashboard.'}
          </p>
        </div>

        <nav className="nav-stack">
          <NavLink className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`} to={profile.role === 'expert' ? '/expert' : '/farmer'}>
            {profile.role === 'expert' ? 'Expert Dashboard' : 'Farmer Dashboard'}
          </NavLink>
          <NavLink className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`} to="/role-setup">
            Switch Role
          </NavLink>
        </nav>

        <div className="profile-card">
          <strong>{profile.displayName || user?.displayName || 'Signed-in user'}</strong>
          <span>{contactInfo?.phone ?? contactInfo?.email ?? user?.phoneNumber ?? user?.email ?? 'No contact info available'}</span>
          <span>{profile.role === 'expert' ? 'Expert access' : `Session ${profile.sessionCode ?? 'not set'}`}</span>
          <button className="secondary-button" onClick={() => void handleLogout()} type="button">
            Logout
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <section className="hero-banner slide-up">
          <div>
            <p className="eyebrow">{heroCopy.eyebrow}</p>
            <h2>{heroCopy.title}</h2>
          </div>
          <p>{heroCopy.body}</p>
        </section>

        <Outlet context={{ socket }} />
      </main>

      <div className="toast-stack">
        {notifications.map((notification) => (
          <article className="toast-card slide-up" key={`${notification.sessionId}-${notification.createdAt}`}>
            <strong>{notification.actorRole === 'expert' ? 'Expert update' : 'New farmer question'}</strong>
            <p>{notification.title}</p>
            <small>
              {notification.sessionCode} · {notification.actorName ?? (notification.actorRole === 'expert' ? 'Expert' : 'Farmer')}
            </small>
          </article>
        ))}
      </div>
    </div>
  );
}
