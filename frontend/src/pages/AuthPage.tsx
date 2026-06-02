import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';

function normalizePhoneNumber(value: string) {
  return value.replace(/[\s()-]/g, '');
}

function getIdentifierType(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailPattern.test(trimmedValue)) {
    return 'email';
  }

  const normalizedPhone = normalizePhoneNumber(trimmedValue);
  const phonePattern = /^\+?[1-9]\d{9,14}$/;
  if (phonePattern.test(normalizedPhone)) {
    return 'phone';
  }

  return null;
}

export function AuthPage({ mode }: { mode: 'signin' | 'signup' }) {
  const isSignup = mode === 'signup';
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, signup } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const destination = (location.state as { from?: string } | null)?.from ?? '/';
  const identifierType = getIdentifierType(identifier);
  const usingPhoneAuth = identifierType === 'phone';

  function handleIdentifierChange(value: string) {
    setIdentifier(value);
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedIdentifier = identifier.trim();
    const nextIdentifierType = getIdentifierType(trimmedIdentifier);

    if (!nextIdentifierType) {
      setError('Enter a valid email address or phone number.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (!password.trim()) {
        throw new Error('Enter your password to continue.');
      }

      if (isSignup) {
        await signup(nextIdentifierType === 'phone' ? normalizePhoneNumber(trimmedIdentifier) : trimmedIdentifier, password);
      } else {
        await login(nextIdentifierType === 'phone' ? normalizePhoneNumber(trimmedIdentifier) : trimmedIdentifier, password);
      }

      navigate(destination, { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setSubmitting(true);
    setError(null);

    try {
      await loginWithGoogle();
      navigate(destination, { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Google login failed.');
    } finally {
      setSubmitting(false);
    }
  }

  function getSubmitLabel() {
    return submitting ? 'Please wait...' : isSignup ? 'Create Account' : 'Sign In';
  }

  return (
    <div className="auth-shell">
      <div className="auth-backdrop" />
      <section className="auth-copy fade-in">
        <p className="eyebrow">Ajrasakha Access</p>
        <h1>Reliable crop guidance with live farmer and expert collaboration.</h1>
        <p>
          Sign in to continue to the farmer support workspace, manage sessions, and exchange questions and answers in
          real time.
        </p>
      </section>

      <section className="auth-card slide-up">
        <div className="auth-tabs">
          <Link className={!isSignup ? 'active' : ''} to="/signin">
            Sign In
          </Link>
          <Link className={isSignup ? 'active' : ''} to="/signup">
            Sign Up
          </Link>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>{isSignup ? 'Create your account' : 'Welcome back'}</h2>
          <label>
            Email or phone number
            <input
              autoComplete={usingPhoneAuth ? 'tel' : 'email'}
              onChange={(event) => handleIdentifierChange(event.target.value)}
              placeholder="farmer.support@example.com or +91 9876543210"
              type="text"
              value={identifier}
            />
          </label>

          <label>
            Password
            <input
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimum 6 characters"
              type="password"
              value={password}
            />
          </label>

          <button className="primary-button" disabled={submitting} type="submit">
            {getSubmitLabel()}
          </button>

          <p className="auth-helper-text">
            {usingPhoneAuth
              ? 'Use your phone number and password in the same form as email login.'
              : 'Use your email and password, or switch to a valid phone number to sign in the same way.'}
          </p>
        </form>

        <div className="auth-divider" aria-hidden="true">
          <span>or</span>
        </div>

        <button className="secondary-button auth-google-button" disabled={submitting} onClick={() => void handleGoogleLogin()} type="button">
          Continue with Google
        </button>

        <p className="auth-helper-text">Use email, phone number, or Google to access the workspace.</p>

        {error ? <p className="error-banner">{error}</p> : null}
      </section>
    </div>
  );
}
