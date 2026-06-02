import { FormEvent, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

import { clearSessionChat, createSession, deleteSession, endSession, fetchLanguages, fetchSession, fetchSessions, sendExpertReply } from '../api';
import { useAuth } from '../auth/AuthContext';
import { useAppOutletContext } from './AppLayout';
import type { ChatMessage, ChatSessionDetail, ChatSessionSummary, LanguageOption } from '../types';

export function ExpertDashboardPage() {
  const { contactInfo, profile, user } = useAuth();
  const { socket } = useAppOutletContext();
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSessionDetail | null>(null);
  const [newSessionName, setNewSessionName] = useState('');
  const [newFarmerName, setNewFarmerName] = useState('');
  const [newSessionLanguage, setNewSessionLanguage] = useState('en');
  const [creating, setCreating] = useState(false);
  const [answer, setAnswer] = useState('');
  const [clearing, setClearing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSessions() {
      try {
        const [languageList, sessionList] = await Promise.all([fetchLanguages(), fetchSessions({ role: 'expert' })]);
        setLanguages(languageList);
        setSessions(sessionList);

        if (sessionList[0]) {
          const session = await fetchSession(sessionList[0]._id);
          setSelectedSession(session);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load expert dashboard.');
      }
    }

    void loadSessions();
  }, []);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleNotification = async (payload: { sessionId: string }) => {
      try {
        const refreshedSessions = await fetchSessions({ role: 'expert' });
        setSessions(refreshedSessions);

        if (!selectedSession) {
          const session = await fetchSession(payload.sessionId);
          setSelectedSession(session);
        }
      } catch {
        return;
      }
    };

    const handleUpdate = (payload: { sessionId: string; messages: ChatMessage[]; session: ChatSessionSummary }) => {
      setSessions((current) => [payload.session, ...current.filter((item) => item._id !== payload.session._id)]);

      if (selectedSession && payload.sessionId === selectedSession._id) {
        setSelectedSession((current) =>
          current
            ? {
                ...current,
                ...payload.session,
                messages: payload.messages,
              }
            : current,
        );
      }
    };

    socket.on('notification', handleNotification);
    socket.on('session:update', handleUpdate);

    return () => {
      socket.off('notification', handleNotification);
      socket.off('session:update', handleUpdate);
    };
  }, [selectedSession, socket]);

  useEffect(() => {
    if (!socket || !selectedSession?._id) {
      return;
    }

    socket.emit('join-session', { sessionId: selectedSession._id });
  }, [selectedSession?._id, socket]);

  if (!profile || profile.role !== 'expert') {
    return <Navigate replace to={profile?.role === 'farmer' ? '/farmer' : '/role-setup'} />;
  }

  const expertProfile = profile;

  async function handleOpenSession(sessionId: string) {
    try {
      const session = await fetchSession(sessionId);
      setSelectedSession(session);
      setError(null);
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : 'Failed to load session details.');
    }
  }

  async function handleCreateSession(event: FormEvent) {
    event.preventDefault();

    if (!newSessionName.trim()) {
      setError('Session name is required to create a session.');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const session = await createSession({
        sessionName: newSessionName.trim(),
        farmerName: newFarmerName.trim() || undefined,
        language: newSessionLanguage,
        ownerUid: user?.uid,
        ownerEmail: contactInfo?.email ?? undefined,
        ownerPhone: contactInfo?.phone ?? user?.phoneNumber ?? undefined,
      });

      const summary: ChatSessionSummary = {
        _id: session._id,
        sessionName: session.sessionName,
        farmerName: session.farmerName,
        expertName: session.expertName,
        kind: session.kind,
        sessionCode: session.sessionCode,
        preferredLanguage: session.preferredLanguage,
        status: session.status,
        updatedAt: session.updatedAt,
        lastMessagePreview: session.lastMessagePreview,
      };

      setSessions((current) => [summary, ...current.filter((item) => item._id !== summary._id)]);
      setSelectedSession(session);
      setNewSessionName('');
      setNewFarmerName('');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create session.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteSession(sessionId: string) {
    try {
      await deleteSession(sessionId);
      const remaining = sessions.filter((item) => item._id !== sessionId);
      setSessions(remaining);

      if (selectedSession?._id === sessionId) {
        if (remaining[0]) {
          const nextSession = await fetchSession(remaining[0]._id);
          setSelectedSession(nextSession);
        } else {
          setSelectedSession(null);
        }
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete session.');
    }
  }

  async function handleEndSession() {
    if (!selectedSession) {
      return;
    }

    setError(null);

    try {
      const response = await endSession(selectedSession._id);
      setSelectedSession((current) =>
        current
          ? {
              ...current,
              ...response.session,
              messages: response.messages,
            }
          : current,
      );
      setSessions((current) => [response.session, ...current.filter((item) => item._id !== response.session._id)]);
      setAnswer('');
    } catch (endError) {
      setError(endError instanceof Error ? endError.message : 'Failed to end session.');
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!selectedSession || !answer.trim() || selectedSession.status === 'ended') {
      return;
    }

    setSending(true);
    setError(null);

    try {
      const response = await sendExpertReply(selectedSession._id, {
        answer,
        language: selectedSession.preferredLanguage,
        expertName: expertProfile.displayName,
      });

      setSelectedSession((current) =>
        current
          ? {
              ...current,
              ...response.session,
              messages: response.messages,
            }
          : current,
      );
      setSessions((current) => [response.session, ...current.filter((item) => item._id !== response.session._id)]);
      setAnswer('');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to send expert reply.');
    } finally {
      setSending(false);
    }
  }

  async function handleClearChat() {
    if (!selectedSession) {
      return;
    }

    setClearing(true);
    setError(null);

    try {
      const response = await clearSessionChat(selectedSession._id);
      setSelectedSession((current) =>
        current
          ? {
              ...current,
              ...response.session,
              messages: response.messages,
            }
          : current,
      );
      setSessions((current) => [response.session, ...current.filter((item) => item._id !== response.session._id)]);
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : 'Failed to clear chat.');
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="workspace-grid expert-layout">
      <section className="glass-card fade-in">
        <div className="section-head">
          <div>
            <p className="eyebrow">Expert Inbox</p>
            <h2>Farmer session history</h2>
          </div>
        </div>

        <form className="stack-form expert-reply-form" onSubmit={handleCreateSession}>
          <div className="responsive-grid">
            <label>
              Session name
              <input
                onChange={(event) => setNewSessionName(event.target.value)}
                placeholder="Tomato Advisory Batch"
                value={newSessionName}
              />
            </label>
            <label>
              Farmer name
              <input onChange={(event) => setNewFarmerName(event.target.value)} placeholder="Optional" value={newFarmerName} />
            </label>
            <label>
              Language
              <select onChange={(event) => setNewSessionLanguage(event.target.value)} value={newSessionLanguage}>
                {languages.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button className="secondary-button" disabled={creating} type="submit">
            {creating ? 'Creating...' : 'Create Session'}
          </button>
        </form>

        <div className="history-list">
          {sessions.map((session) => (
            <article className={`history-card ${session._id === selectedSession?._id ? 'active' : ''}`} key={session._id}>
              <button className="history-open" onClick={() => void handleOpenSession(session._id)} type="button">
                <strong>{session.sessionName}</strong>
                <span>Join ID: {session.sessionCode}</span>
                <small>
                  {session.status === 'ended'
                    ? 'Session ended'
                    : session.status === 'answered'
                      ? `Answered by ${session.expertName ?? 'expert'}`
                      : 'Needs expert reply'}
                </small>
              </button>
              <button className="delete-chat-button" onClick={() => void handleDeleteSession(session._id)} type="button">
                Delete
              </button>
            </article>
          ))}
          {sessions.length === 0 ? <p className="muted-text">No farmer questions have arrived yet.</p> : null}
        </div>
      </section>

      <section className="glass-card delay-in">
        <div className="section-head">
          <div>
            <p className="eyebrow">Selected Session</p>
            <h2>{selectedSession ? `${selectedSession.sessionName} | ${selectedSession.sessionCode}` : 'Pick a session'}</h2>
          </div>
          {selectedSession ? <span className="session-badge">{selectedSession.status}</span> : null}
        </div>

        {selectedSession ? (
          <>
            <div className="message-feed expert-feed">
              {selectedSession.messages
                .filter((message) => message.source !== 'ai')
                .map((message) => (
                <article
                  className={`message-bubble ${message.role === 'farmer' ? 'user' : 'assistant'} slide-up`}
                  key={message.messageId}
                >
                  <div className="message-row">
                    <strong>
                      {message.senderName ||
                        (message.role === 'farmer' ? 'Farmer' : message.role === 'assistant' ? 'Ajrasakha AI' : 'Expert')}
                    </strong>
                    <span>{new Date(message.createdAt).toLocaleString()}</span>
                  </div>
                  <p>{message.text}</p>
                </article>
              ))}
            </div>

            <form className="stack-form expert-reply-form" onSubmit={handleSubmit}>
              <div className="session-action-row">
                <button
                  className="delete-chat-button"
                  disabled={selectedSession.messages.length === 0 || clearing}
                  onClick={() => void handleClearChat()}
                  type="button"
                >
                  {clearing ? 'Clearing...' : 'Clear Chat'}
                </button>
                <button
                  className="secondary-button"
                  disabled={selectedSession.status === 'ended'}
                  onClick={() => void handleEndSession()}
                  type="button"
                >
                  {selectedSession.status === 'ended' ? 'Session Ended' : 'End Session'}
                </button>
              </div>
              <label>
                Expert answer
                <textarea
                  disabled={selectedSession.status === 'ended'}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder={selectedSession.status === 'ended' ? 'This session is closed.' : 'Write the response the farmer should receive.'}
                  rows={5}
                  value={answer}
                />
              </label>
              <button className="primary-button" disabled={sending || selectedSession.status === 'ended'} type="submit">
                {sending ? 'Sending...' : selectedSession.status === 'ended' ? 'Session Closed' : 'Send Expert Reply'}
              </button>
            </form>
          </>
        ) : (
          <p className="muted-text">Select a session from the history list to see the farmer questions.</p>
        )}

        {error ? <p className="error-banner">{error}</p> : null}
      </section>
    </div>
  );
}
