import { Navigate, Route, Routes } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import PublicOnlyRoute from './components/PublicOnlyRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Agenda from './pages/Agenda';
import Workouts from './pages/Workouts';
import WorkoutForm from './pages/WorkoutForm';
import WorkoutImport from './pages/WorkoutImport';
import WorkoutDetail from './pages/WorkoutDetail';
import Profile from './pages/Profile';
import WorkoutRun from './pages/WorkoutRun';
import WorkoutHistory from './pages/WorkoutHistory';
import ArchivedWorkouts from './pages/ArchivedWorkouts';
import Friends from './pages/Friends';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
      <Route element={<PrivateRoute />}>
        <Route path="/" element={<Home />} />
        <Route path="/workouts" element={<Workouts />} />
        <Route path="/workouts/archived" element={<ArchivedWorkouts />} />
        <Route path="/workouts/new" element={<WorkoutForm />} />
        <Route path="/workouts/import" element={<WorkoutImport />} />
        <Route path="/workouts/:id" element={<WorkoutDetail />} />
        <Route path="/workouts/:id/edit" element={<WorkoutForm />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/workout-sessions/:id" element={<WorkoutRun />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/schedule" element={<Navigate to="/agenda" replace />} />
        <Route path="/history" element={<WorkoutHistory />} />
        <Route path="/friends" element={<Friends />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
