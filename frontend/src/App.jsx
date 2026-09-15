import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './auth/AuthContext';
import { AppLayout } from './pages/AppLayout';
import { AuthPage } from './pages/AuthPage';
import { ExpertDashboardPage } from './pages/ExpertDashboardPage';
import { FarmerDashboardPage } from './pages/FarmerDashboardPage';
import { RoleSelectionPage } from './pages/RoleSelectionPage';
function DashboardRedirect() {
    const { profile, user } = useAuth();
    if (!user) {
        return <Navigate replace to="/signin"/>;
    }
    if (!profile) {
        return <Navigate replace to="/role-setup"/>;
    }
    return <Navigate replace to={profile.role === 'expert' ? '/expert' : '/farmer'}/>;
}
function App() {
    return (<Routes>
      <Route element={<DashboardRedirect />} path="/"/>
      <Route element={<AuthPage mode="signin"/>} path="/signin"/>
      <Route element={<AuthPage mode="signup"/>} path="/signup"/>
      <Route element={<ProtectedRoute>
            <RoleSelectionPage />
          </ProtectedRoute>} path="/role-setup"/>
      <Route element={<ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>}>
        <Route element={<FarmerDashboardPage />} path="/farmer"/>
        <Route element={<ExpertDashboardPage />} path="/expert"/>
      </Route>
      <Route element={<Navigate replace to="/"/>} path="*"/>
    </Routes>);
}
export default App;
