import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { clearSessionChat, deleteSession, fetchLanguages, fetchSession, fetchSessions, joinSession, sendFarmerMessage, synthesizeSpeech, transcribeAudio } from '../api';
import { useAuth } from '../auth/AuthContext';
import { useAppOutletContext } from './AppLayout';
export function FarmerDashboardPage() {
    const { contactInfo, profile, saveProfile, user } = useAuth();
    const { socket } = useAppOutletContext();
    const [languages, setLanguages] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [messages, setMessages] = useState([]);
    const [question, setQuestion] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [language, setLanguage] = useState('en');
    const [sessionId, setSessionId] = useState();
    const [loading, setLoading] = useState(false);
    const [startingNewChat, setStartingNewChat] = useState(false);
    const [clearing, setClearing] = useState(false);
    const [joiningSession, setJoiningSession] = useState(false);
    const [error, setError] = useState(null);
    const [voiceSupported, setVoiceSupported] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [voiceStatus, setVoiceStatus] = useState('Press record and speak your question.');
    const [speakingKey, setSpeakingKey] = useState(null);
    const [audioPaused, setAudioPaused] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const streamRef = useRef(null);
    const audioPlayerRef = useRef(null);
    const activeSession = sessions.find((session) => session._id === sessionId);
    const aiChats = sessions.filter((session) => session.kind === 'chat');
    const expertSessions = sessions.filter((session) => session.kind === 'session');
    useEffect(() => {
        setVoiceSupported(typeof window !== 'undefined' && 'MediaRecorder' in window && !!navigator.mediaDevices);
    }, []);
    useEffect(() => {
        async function loadInitialData() {
            if (!user) {
                return;
            }
            try {
                const [languageList, sessionList] = await Promise.all([
                    fetchLanguages(),
                    fetchSessions({ role: 'farmer', ownerUid: user.uid }),
                ]);
                setLanguages(languageList);
                setSessions(sessionList);
                if (profile?.sessionCode) {
                    setJoinCode(profile.sessionCode);
                    const matchedSession = sessionList.find((item) => item.sessionCode === profile.sessionCode);
                    if (matchedSession) {
                        const fullSession = await fetchSession(matchedSession._id);
                        setSessionId(fullSession._id);
                        setMessages(fullSession.messages);
                        setLanguage(fullSession.preferredLanguage);
                    }
                }
            }
            catch (loadError) {
                setError(loadError instanceof Error ? loadError.message : 'Failed to load farmer workspace.');
            }
        }
        void loadInitialData();
    }, [profile?.sessionCode, user]);
    useEffect(() => {
        if (!socket || !sessionId) {
            return;
        }
        socket.emit('join-session', { sessionId });
        const handleUpdate = (payload) => {
            if (payload.sessionId !== sessionId) {
                return;
            }
            setMessages(payload.messages);
            setSessions((current) => [payload.session, ...current.filter((item) => item._id !== payload.session._id)]);
        };
        socket.on('session:update', handleUpdate);
        return () => {
            socket.off('session:update', handleUpdate);
        };
    }, [sessionId, socket]);
    useEffect(() => {
        return () => {
            mediaRecorderRef.current?.stop();
            streamRef.current?.getTracks().forEach((track) => track.stop());
            audioPlayerRef.current?.pause();
        };
    }, []);
    if (!profile || profile.role !== 'farmer') {
        return <Navigate replace to={profile?.role === 'expert' ? '/expert' : '/role-setup'}/>;
    }
    const farmerProfile = profile;
    async function handleSubmit(event) {
        event.preventDefault();
        if (!question.trim() || !user) {
            return;
        }
        if (activeSession?.status === 'ended') {
            setError('This session has already ended. Join another session to continue.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const response = await sendFarmerMessage({
                question,
                language,
                farmerName: farmerProfile.displayName,
                sessionId,
                sessionCode: farmerProfile.sessionCode,
                ownerUid: user.uid,
                ownerEmail: contactInfo?.email ?? undefined,
                ownerPhone: contactInfo?.phone ?? user.phoneNumber ?? undefined,
            });
            setMessages(response.messages);
            setSessionId(response.sessionId);
            setQuestion('');
            setSessions((current) => [response.session, ...current.filter((item) => item._id !== response.session._id)]);
            setJoinCode(response.session.sessionCode);
            saveProfile({
                ...farmerProfile,
                sessionCode: response.session.sessionCode,
            });
        }
        catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Failed to send question.');
        }
        finally {
            setLoading(false);
        }
    }
    async function handleSessionOpen(nextSessionId) {
        try {
            const session = await fetchSession(nextSessionId);
            setSessionId(session._id);
            setMessages(session.messages);
            setLanguage(session.preferredLanguage);
            setJoinCode(session.sessionCode);
            saveProfile({
                ...farmerProfile,
                sessionCode: session.sessionCode,
            });
            setError(null);
        }
        catch (sessionError) {
            setError(sessionError instanceof Error ? sessionError.message : 'Failed to load session.');
        }
    }
    async function handleJoinSession(event) {
        event.preventDefault();
        if (!user || !joinCode.trim()) {
            setError('Enter a session ID to join.');
            return;
        }
        setJoiningSession(true);
        setError(null);
        try {
            const normalizedCode = joinCode.trim().toUpperCase();
            const session = await joinSession({
                sessionCode: normalizedCode,
                farmerName: farmerProfile.displayName,
                ownerUid: user.uid,
                ownerEmail: contactInfo?.email ?? undefined,
                ownerPhone: contactInfo?.phone ?? user.phoneNumber ?? undefined,
            });
            setSessionId(session._id);
            setMessages(session.messages);
            setLanguage(session.preferredLanguage);
            setJoinCode(session.sessionCode);
            setSessions((current) => [
                {
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
                },
                ...current.filter((item) => item._id !== session._id),
            ]);
            saveProfile({
                ...farmerProfile,
                sessionCode: session.sessionCode,
            });
        }
        catch (joinError) {
            setError(joinError instanceof Error ? joinError.message : 'Failed to join session.');
        }
        finally {
            setJoiningSession(false);
        }
    }
    async function startRecording() {
        if (!voiceSupported) {
            setVoiceStatus('Voice recording is not supported in this browser.');
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            audioChunksRef.current = [];
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };
            recorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
                stream.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
                if (!audioBlob.size) {
                    setVoiceStatus('No audio captured. Please try again.');
                    return;
                }
                setVoiceStatus('Transcribing your speech...');
                try {
                    const result = await transcribeAudio({
                        audio: audioBlob,
                        language,
                    });
                    setQuestion(result.transcript);
                    setVoiceStatus('Voice converted to text. Review and send.');
                }
                catch (voiceError) {
                    setVoiceStatus(voiceError instanceof Error ? voiceError.message : 'Voice transcription failed.');
                }
            };
            recorder.start();
            setIsRecording(true);
            setVoiceStatus(`Recording in ${language.toUpperCase()}...`);
        }
        catch (recordError) {
            setVoiceStatus(recordError instanceof Error ? recordError.message : 'Microphone access failed.');
        }
    }
    function stopRecording() {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    }
    async function handleListenToReply(message, key) {
        try {
            if (speakingKey === key && audioPlayerRef.current) {
                if (audioPaused) {
                    await audioPlayerRef.current.play();
                    setAudioPaused(false);
                    return;
                }
                audioPlayerRef.current.pause();
                setAudioPaused(true);
                return;
            }
            setSpeakingKey(key);
            setAudioPaused(false);
            const { audioBase64 } = await synthesizeSpeech({
                text: message.text,
                language: message.language,
            });
            const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);
            audioPlayerRef.current = audio;
            audio.onended = () => {
                setSpeakingKey(null);
                setAudioPaused(false);
            };
            await audio.play();
        }
        catch (audioError) {
            setError(audioError instanceof Error ? audioError.message : 'Speech playback failed.');
            setSpeakingKey(null);
            setAudioPaused(false);
        }
    }
    async function handleClearChat() {
        if (!sessionId || activeSession?.kind !== 'chat') {
            return;
        }
        setClearing(true);
        setError(null);
        try {
            const response = await clearSessionChat(sessionId);
            setMessages(response.messages);
            setSessions((current) => [response.session, ...current.filter((item) => item._id !== response.session._id)]);
        }
        catch (clearError) {
            setError(clearError instanceof Error ? clearError.message : 'Failed to clear chat.');
        }
        finally {
            setClearing(false);
        }
    }
    async function handleDeleteChat(chatId) {
        try {
            await deleteSession(chatId);
            const remainingSessions = sessions.filter((session) => session._id !== chatId);
            setSessions(remainingSessions);
            if (sessionId === chatId) {
                setSessionId(undefined);
                setMessages([]);
                setQuestion('');
                setJoinCode('');
                saveProfile({
                    ...farmerProfile,
                    sessionCode: undefined,
                });
            }
        }
        catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete chat.');
        }
    }
    function handleNewChat() {
        setStartingNewChat(true);
        audioPlayerRef.current?.pause();
        setAudioPaused(false);
        setSpeakingKey(null);
        setQuestion('');
        setMessages([]);
        setSessionId(undefined);
        setJoinCode('');
        setError(null);
        setVoiceStatus('Press record and speak your question.');
        saveProfile({
            ...farmerProfile,
            sessionCode: undefined,
        });
        window.setTimeout(() => {
            setStartingNewChat(false);
        }, 450);
    }
    return (<div className="workspace-grid">
      <section className="glass-card fade-in">
        <div className="section-head">
          <div>
            <p className="eyebrow">Farmer Session</p>
            <h2>{activeSession?.kind === 'session' ? 'Expert session workspace' : 'Ask Ajrasakha AI'}</h2>
          </div>
          <div className="farmer-chat-header">
            <span className="session-badge">
              {farmerProfile.sessionCode
            ? `${activeSession?.kind === 'session' ? 'Session' : 'Chat'} ${farmerProfile.sessionCode}${activeSession ? ` | ${activeSession.status}` : ''}`
            : 'New session will start automatically'}
            </span>
            <button className="primary-button new-chat-button" onClick={handleNewChat} type="button">
              {startingNewChat ? 'Starting...' : 'New Chat'}
            </button>
          </div>
        </div>

        <form className="stack-form" onSubmit={handleJoinSession}>
          <div className="responsive-grid">
            <label>
              Join expert session with session ID
              <input onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="FARM-101" value={joinCode}/>
            </label>
            <label>
              Language
              <select onChange={(event) => setLanguage(event.target.value)} value={language}>
                {languages.map((item) => (<option key={item.code} value={item.code}>
                    {item.label}
                  </option>))}
              </select>
            </label>
          </div>
          <button className="secondary-button" disabled={joiningSession} type="submit">
            {joiningSession ? 'Joining...' : 'Join Session'}
          </button>
        </form>

        <form className="stack-form farmer-chat-composer" onSubmit={handleSubmit}>
          <div className="farmer-chat-toolbar">
            <div>
              <p className="eyebrow">Ask Ajrasakha AI</p>
              <h3>{sessionId && activeSession?.kind === 'chat' ? 'Continue this AI chat' : 'Start a fresh AI conversation'}</h3>
            </div>
            <p className="farmer-chat-note">
              {sessionId && activeSession?.kind === 'chat'
            ? 'Ask follow-up questions here and keep the context in one private AI thread.'
            : 'Use New Chat anytime to begin a clean AI conversation.'}
            </p>
          </div>

          <div className="responsive-grid">
            <label>
              Farmer name
              <input value={farmerProfile.displayName} disabled/>
            </label>
            <label>
              Language
              <select onChange={(event) => setLanguage(event.target.value)} value={language}>
                {languages.map((item) => (<option key={item.code} value={item.code}>
                    {item.label}
                  </option>))}
              </select>
            </label>
          </div>

          <label>
            Ask a question
            <textarea onChange={(event) => setQuestion(event.target.value)} placeholder="Describe the crop issue, stage, and symptoms." rows={4} value={question}/>
          </label>

          <div className="voice-toolbar">
            <button className={`voice-button ${isRecording ? 'listening' : ''}`} disabled={!voiceSupported} onClick={isRecording ? stopRecording : () => void startRecording()} type="button">
              {isRecording ? 'Stop Recording' : 'Record Voice Question'}
            </button>
            <p className="voice-status">{voiceStatus}</p>
          </div>

          <button className="primary-button" disabled={loading || activeSession?.status === 'ended'} type="submit">
            {loading ? 'Sending...' : activeSession?.status === 'ended' ? 'Session Closed' : 'Send to Expert'}
          </button>

          <p className="muted-text farmer-chat-helper">
            If you do not join a session manually, your first question will create one automatically.
          </p>
        </form>

        {error ? <p className="error-banner">{error}</p> : null}

        <div className="session-action-row">
          {activeSession?.kind === 'chat' ? (<>
              <button className="secondary-button" onClick={handleNewChat} type="button">
                New Chat
              </button>
              <button className="delete-chat-button" disabled={!sessionId || messages.length === 0 || clearing} onClick={() => void handleClearChat()} type="button">
                {clearing ? 'Clearing...' : 'Clear Chat'}
              </button>
            </>) : null}
        </div>

        <div className="message-feed">
          {messages.length === 0 ? <p className="muted-text">Start your session to see questions and expert replies here.</p> : null}
          {messages.map((message) => (<article className={`message-bubble ${message.role === 'farmer' ? 'user' : 'assistant'} slide-up`} key={message.messageId}>
              <div className="message-row">
                <strong>
                  {message.role === 'farmer'
                ? 'You'
                : message.role === 'assistant'
                    ? message.senderName || 'Ajrasakha AI'
                    : message.senderName || 'Expert'}
                </strong>
                <span>{new Date(message.createdAt).toLocaleString()}</span>
              </div>
              <p>{message.text}</p>
              {message.role !== 'farmer' ? (<button className="speak-button" onClick={() => void handleListenToReply(message, message.messageId)} type="button">
                  {speakingKey === message.messageId ? (audioPaused ? 'Resume Audio' : 'Pause Audio') : 'Play Audio'}
                </button>) : null}
            </article>))}
        </div>
      </section>

      <section className="glass-card delay-in">
        <div className="section-head">
          <div>
            <p className="eyebrow">Your History</p>
            <h2>Chats and sessions</h2>
          </div>
        </div>

        <div className="history-section">
          <div className="history-section-head">
            <p className="eyebrow">AI Chats</p>
            <strong>{aiChats.length}</strong>
          </div>
          <div className="history-list">
            {aiChats.map((session) => (<article className={`history-card ${session._id === sessionId ? 'active' : ''}`} key={session._id}>
                <button className="history-open" onClick={() => void handleSessionOpen(session._id)} type="button">
                  <strong>{session.sessionName}</strong>
                  <span>{session.sessionCode}</span>
                  <small>{session.lastMessagePreview ?? 'Private AI conversation'}</small>
                </button>
                <button className="delete-chat-button" onClick={() => void handleDeleteChat(session._id)} type="button">
                  Delete
                </button>
              </article>))}
            {aiChats.length === 0 ? <p className="muted-text">No AI chats yet.</p> : null}
          </div>
        </div>

        <div className="history-section">
          <div className="history-section-head">
            <p className="eyebrow">Expert Sessions</p>
            <strong>{expertSessions.length}</strong>
          </div>
          <div className="history-list">
            {expertSessions.map((session) => (<article className={`history-card ${session._id === sessionId ? 'active' : ''}`} key={session._id}>
              <button className="history-open" onClick={() => void handleSessionOpen(session._id)} type="button">
                <strong>{session.sessionName}</strong>
                <span>{session.sessionCode}</span>
                <small>
                  {session.status === 'ended' ? 'Session ended' : session.status === 'answered' ? 'Expert replied' : 'Waiting for expert'}
                </small>
              </button>
            </article>))}
            {expertSessions.length === 0 ? <p className="muted-text">No expert sessions yet.</p> : null}
          </div>
        </div>
      </section>
    </div>);
}
