import { Route, Routes, Outlet, Navigate } from 'react-router-dom'
import HomePage from "./layouts/HomePage"
import AuthPage from './pages/AuthPage'
import Sidebar from './components/layout/Sidebar'
import { useState } from 'react'
import { HelpCircle, Menu, User } from 'lucide-react'
import { useAuthStore } from './store/useAuthStore'
import SettingsPage from './pages/SettingsPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'

const PublicOnlyRoute = () => {
  const { isAuthenticated } = useAuthStore();
  return !isAuthenticated ? <Outlet/> : <Navigate to='/' replace />
}

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-app-bg overflow-hidden relative">

      {isSidebarOpen && (
        <div
          className='fixed inset-0 bg-black/80 z-40 md:hidden transition-opacity'
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <main className="flex-1 overflow-y-auto flex flex-col relative">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-app-line bg-[#141719] z-20">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="w-10 h-10 rounded-lg border border-app-line bg-[#1c2124] flex items-center justify-center text-app-muted hover:text-app-text"
          >
            <Menu className='w-5 h-5'/>
          </button>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 h-10 rounded-lg border border-app-line bg-[#1c2124] text-xs font-medium text-app-muted">
              <div className="w-1.5 h-1.5 rounded-full bg-app-accent"></div>
              Running locally
            </div>
            <button className="w-10 h-10 rounded-lg border border-app-line bg-[#1c2124] flex items-center justify-center text-app-muted hover:text-app-text">
              <HelpCircle className="w-4 h-4" />
            </button>
            <button 
              className="w-10 h-10 rounded-lg border border-app-line bg-[#1c2124] flex items-center justify-center text-app-muted hover:text-app-text"
            >
              <User className="w-4 h-4" />
            </button>
          </div>
        </header>
        <div className='p-4 sm:p-8 flex-1'>
          <Outlet />
        </div>
      </main>
    </div>
  )
}

const App = () => {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage/>} />
      </Route>
      
      <Route element={<MainLayout />}>
        <Route path='/' element={<HomePage/>} />
        <Route path='/settings' element={<SettingsPage/>} />
      </Route>
    </Routes>
  )
}

export default App;