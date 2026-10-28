import { Route, Routes, Outlet, Navigate } from 'react-router-dom'
import HomePage from "./layouts/HomePage"
import AuthPage from './pages/AuthPage'
import Sidebar from './components/layout/Sidebar'
import { useState } from 'react'
import { Menu } from 'lucide-react'
import { useAuthStore } from './store/useAuthStore'
import SettingsPage from './pages/SettingsPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ProfileDropdown from './components/layout/ProfileDropdown'
import ProfilePage from './pages/ProfilePage'
import WorkspacePage from './pages/WorkspacePage'

const PublicOnlyRoute = () => {
  const { isAuthenticated } = useAuthStore();
  return !isAuthenticated ? <Outlet/> : <Navigate to='/' replace />
}

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-app-bg">
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-black/80 transition-opacity md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <main className="relative flex flex-1 flex-col overflow-y-auto scrollbar-none">
        <header className="z-20 flex items-center justify-between border-b border-app-line bg-[#141719] p-4 md:hidden">
          <button
            type="button"
            aria-label="Open navigation menu"
            onClick={() => setIsSidebarOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-app-line bg-[#1c2124] text-app-muted transition-colors hover:text-app-text"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-10 items-center gap-2 rounded-lg border border-app-line bg-[#1c2124] px-3 text-xs font-medium text-app-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-app-accent" />
              Running locally
            </div>
            <ProfileDropdown />
          </div>
        </header>

        <div className="flex-1 p-4 sm:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};


const App = () => {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage/>} />
      </Route>
      
      <Route element={<MainLayout />}>
        <Route path='/' element={<HomePage/>} />
        <Route path='/profile' element={<ProfilePage/>} />
        <Route path='/settings' element={<SettingsPage/>} />
        <Route path='/workspace' element={<WorkspacePage/>} />
      </Route>
    </Routes>
  )
}

export default App;