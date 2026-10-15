import { Route, Routes } from 'react-router-dom'
import HomePage from "./layouts/HomePage"
import AuthPage from './pages/AuthPage'

const App = () => {
  return (
    <Routes>
      <Route path='/' element={<HomePage/>} />
      <Route path="/auth" element={<AuthPage />} />
    </Routes>
  )
}

export default App