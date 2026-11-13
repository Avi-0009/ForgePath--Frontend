import {
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";

import HomePage from "./layouts/HomePage";

import AuthPage from "./pages/AuthPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import WorkspacePage from "./pages/WorkspacePage";
import RepositoriesPage from "./pages/RepositoriesPage";

import { useAuthStore } from "./store/useAuthStore";
import AppLayout from "./layouts/AppLayout";

function PublicOnlyRoute() {
  const isAuthenticated = useAuthStore(
    (state) => state.isAuthenticated
  );

  return isAuthenticated
    ? <Navigate to="/" replace />
    : <Outlet />;
}

function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/forgot-password"
          element={<ForgotPasswordPage />}
        />
      </Route>

      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />

        <Route
          path="/repositories"
          element={<RepositoriesPage />}
        />

        <Route
          path="/settings"
          element={<SettingsPage />}
        />

        <Route
          path="/profile"
          element={<ProfilePage />}
        />

        <Route
          path="/workspace"
          element={<WorkspacePage />}
        />
      </Route>
    </Routes>
  );
}

export default App;