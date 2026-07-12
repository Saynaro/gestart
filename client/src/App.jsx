import './App.css'
import HomePage from './HomePage/HomePage'
import LandingPage from './LandingPage/LandingPage'
import { Routes, Route } from 'react-router-dom'

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<HomePage />} />

      </Routes>
    </>
  )
}

export default App
