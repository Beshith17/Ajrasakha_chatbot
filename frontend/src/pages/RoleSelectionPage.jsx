import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
export function RoleSelectionPage() {
    const { profile, saveProfile, user } = useAuth();
    const navigate = useNavigate();
    const [role, setRole] = useState('farmer');
    const [displayName, setDisplayName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (!displayName && user?.displayName) {
            setDisplayName(user.displayName);
        }
    }, [displayName, user?.displayName]);
    if (!user) {
        return <Navigate replace to="/signin"/>;
    }
    async function handleSubmit(event) {
        event.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            const trimmedName = displayName.trim() || (role === 'expert' ? 'Expert' : 'Farmer');
            saveProfile({
                role,
                displayName: trimmedName,
            });
            navigate(role === 'expert' ? '/expert' : '/farmer', { replace: true });
        }
        catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Failed to save role settings.');
        }
        finally {
            setSubmitting(false);
        }
    }
    return (<div className="glass-card role-card slide-up">
      <div className="section-head">
        <div>
          <p className="eyebrow">First Login Setup</p>
          <h2>{profile ? 'Update role access' : 'Choose your workspace'}</h2>
        </div>
      </div>

      <form className="stack-form" onSubmit={handleSubmit}>
        <div className="role-switcher">
          <button className={`role-option ${role === 'farmer' ? 'active' : ''}`} onClick={() => setRole('farmer')} type="button">
            Farmer
          </button>
          <button className={`role-option ${role === 'expert' ? 'active' : ''}`} onClick={() => setRole('expert')} type="button">
            Expert
          </button>
        </div>

        <label>
          Display name
          <input onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" value={displayName}/>
        </label>

        <p className="muted-text">
          {role === 'expert'
            ? 'Experts can monitor all farmer sessions and reply from the expert dashboard.'
            : 'Farmers can choose or join a session later from the farmer dashboard.'}
        </p>

        <button className="primary-button" disabled={submitting} type="submit">
          {submitting ? 'Saving...' : 'Continue'}
        </button>
      </form>

      {error ? <p className="error-banner">{error}</p> : null}
    </div>);
}
