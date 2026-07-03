import AppShell from '../components/AppShell';
import CurrentWorkoutCard from '../components/CurrentWorkoutCard';
import TodayWorkoutCard from '../components/TodayWorkoutCard';
import WeeklyProgressCard from '../components/WeeklyProgressCard';

export default function Home() {
  return (
    <AppShell title="Início" subtitle="Sua semana">
      <CurrentWorkoutCard />
      <TodayWorkoutCard />
      <WeeklyProgressCard />
    </AppShell>
  );
}
