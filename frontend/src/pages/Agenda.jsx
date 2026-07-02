import AppShell from '../components/AppShell';
import WeeklyScheduleBoard from '../components/WeeklyScheduleBoard';

export default function Agenda() {
  return (
    <AppShell title="Agenda semanal" subtitle="Organize sua semana" back>
      <WeeklyScheduleBoard showSummary />
    </AppShell>
  );
}
