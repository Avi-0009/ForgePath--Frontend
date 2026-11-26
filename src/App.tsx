import {
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";

import HomePage from "./layouts/HomePage";
import AppLayout from "./layouts/AppLayout";

import AuthPage from "./pages/AuthPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import WorkspacePage from "./pages/WorkspacePage";
import RepositoriesPage from "./pages/RepositoriesPage";
import TasksPage from "./pages/TasksPage";
import AgentRunsPage from "./pages/AgentRunsPage";
import CodeIntelligencePage from "./pages/CodeIntelligencePage";
import InvestigationPage from "./pages/InvestigationPage";
import PatchReviewPage from "./pages/PatchReviewPage";
import TestLabPage from "./pages/TestLabPage";
import ApprovalsPage from "./pages/ApprovalsPage";

import { useAuthStore } from "./store/useAuthStore";
import {
  ACCOUNT_ROUTES,
  canAccessProtectedRoute,
} from "./routing/accountRoutes";

const PublicOnlyRoute = () => {
  const isAuthenticated = useAuthStore(
    (state) => state.isAuthenticated,
  );

  return isAuthenticated
    ? <Navigate to="/" replace />
    : <Outlet />;
};

const RequireAuth = () => {
  const isAuthenticated = useAuthStore(
    (state) => state.isAuthenticated,
  );
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  return user && canAccessProtectedRoute({ isAuthenticated, token, user })
    ? <AppLayout key={user.id} />
    : <Navigate to="/auth" replace />;
};

const App = () => (
  <Routes>
    <Route element={<PublicOnlyRoute />}>
      <Route path="/auth" element={<AuthPage />} />
      <Route
        path="/forgot-password"
        element={<ForgotPasswordPage />}
      />
    </Route>

    <Route element={<RequireAuth />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/tasks" element={<TasksPage />} />
      <Route
        path="/repositories"
        element={<RepositoriesPage />}
      />
      <Route path="/runs" element={<AgentRunsPage />} />
      <Route
        path="/intel"
        element={<CodeIntelligencePage />}
      />
      <Route
        path="/investigation"
        element={<InvestigationPage />}
      />
      <Route
        path="/patch-review"
        element={<PatchReviewPage />}
      />
      <Route path="/test-lab" element={<TestLabPage />} />
      <Route
        path="/approvals"
        element={<ApprovalsPage />}
      />
      <Route path={ACCOUNT_ROUTES.settings} element={<SettingsPage />} />
      <Route
        path="/workspace"
        element={<WorkspacePage />}
      />

      <Route path={ACCOUNT_ROUTES.profile} element={<ProfilePage />} />
    </Route>
  </Routes>
);

export default App;
