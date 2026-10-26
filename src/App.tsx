import { BrowserRouter, Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { BodyWeightPage } from './pages/BodyWeightPage'
import { CategoryWorkoutPage } from './pages/CategoryWorkoutPage'
import { DashboardPage } from './pages/DashboardPage'
import { ExercisesPage } from './pages/ExercisesPage'
import { HistoryPage } from './pages/HistoryPage'
import { MorePage } from './pages/MorePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PlanEditPage } from './pages/PlanEditPage'
import { PlansPage } from './pages/PlansPage'
import { ProgressPage } from './pages/ProgressPage'
import { SettingsPage } from './pages/SettingsPage'
import { TrainingHomePage } from './pages/TrainingHomePage'
import { WelcomePage } from './pages/WelcomePage'
import { WorkoutPage } from './pages/WorkoutPage'
import { useStore } from './state/store'

export default function App() {
  const { ready, mode } = useStore()
  if (!ready) return <div className="flex min-h-dvh items-center justify-center text-zinc-500">Lade …</div>
  if (mode === 'none') return <WelcomePage />
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<TrainingHomePage />} />
          <Route path="training/:kind" element={<CategoryWorkoutPage />} />
          <Route path="workout/:id" element={<WorkoutPage />} />
          <Route path="uebersicht" element={<DashboardPage />} />
          <Route path="verlauf" element={<HistoryPage />} />
          <Route path="fortschritt" element={<ProgressPage />} />
          <Route path="mehr" element={<MorePage />} />
          <Route path="plaene" element={<PlansPage />} />
          <Route path="plaene/:id" element={<PlanEditPage />} />
          <Route path="uebungen" element={<ExercisesPage />} />
          <Route path="koerpergewicht" element={<BodyWeightPage />} />
          <Route path="einstellungen" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
