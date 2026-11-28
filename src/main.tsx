import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";

import App from "./App.tsx";
import AccountScopedQueryCache from "./components/auth/AccountScopedQueryCache.tsx";
import AppErrorBoundary from "./components/errors/AppErrorBoundary.tsx";
import AuthSessionProvider from "./components/auth/AuthSessionProvider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>
      <AuthSessionProvider>
        <AccountScopedQueryCache>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AccountScopedQueryCache>
      </AuthSessionProvider>
    </AppErrorBoundary>
  </StrictMode>,
);
