import { HashRouter, Route, Routes } from 'react-router-dom'
import { SceneProvider } from './context/SceneContext'
import { SceneApp } from './pages/SceneApp'

export default function App() {
  return (
    <SceneProvider>
      <HashRouter>
        <Routes>
          <Route path="*" element={<SceneApp />} />
        </Routes>
      </HashRouter>
    </SceneProvider>
  )
}
