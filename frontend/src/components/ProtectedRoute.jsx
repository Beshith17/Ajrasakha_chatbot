import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
export function ProtectedRoute({ children }) {
    const { loading, user } = useAuth();
    if (loading) {
        return (<div className="center-screen">
        <div className="loading-orb"/>
        <p>Checking your sign-in...</p>
      </div>);
    }
    if (!user) {
        return <Navigate replace to="/signin"/>;
    }
    return children;
}
