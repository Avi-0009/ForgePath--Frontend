import { Route, Routes, Outlet } from 'react-router-dom'
import HomePage from "./layouts/HomePage"
import AuthPage from './pages/AuthPage'
import Sidebar from './components/layout/Sidebar'

const MainLayout = () => {
  return (
    <div className="flex h-screen w-full bg-app-bg overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

const App = () => {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route element={<MainLayout />}>
        <Route path='/' element={<HomePage/>} />
      </Route>
    </Routes>
  )
}

export default App