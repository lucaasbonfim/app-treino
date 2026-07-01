import { useCallback, useEffect, useState } from 'react';
import Icon from './Icon';
import ProgressBar from './ProgressBar';
import CheckinButton from './CheckinButton';
import ProgressDetails from './ProgressDetails';
import WeeklyGoalModal from './WeeklyGoalModal';
import { apiCache, progressService } from '../services';

export default function WeeklyProgressCard() {
  const [summary, setSummary] = useState(() => apiCache.getData('/progress/weekly-summary') || null);
  const [monthly, setMonthly] = useState(() => apiCache.getData('/progress/monthly-checkins') || null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);

  const refresh = useCallback(async () => {
    const [summaryResult, monthlyResult] = await Promise.allSettled([
      progressService.weeklySummary({ force: true }),
      progressService.monthlyCheckins({ force: true }),
    ]);
    if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value.data);
    if (monthlyResult.status === 'fulfilled') setMonthly(monthlyResult.value.data);
  }, []);

  useEffect(() => {
    let active = true;
    progressService.weeklySummary()
      .then(({ data }) => { if (active) setSummary(data); })
      .catch(() => {});
    progressService.monthlyCheckins()
      .then(({ data }) => { if (active) setMonthly(data); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const handleCheckin = async () => {
    setCheckingIn(true);
    try {
      await progressService.checkin();
      await refresh();
    } catch {
      // Silencioso: o card apenas não atualiza se a rede falhar.
    } finally {
      setCheckingIn(false);
    }
  };

  const handleSaveGoal = async (goal) => {
    await progressService.updateWeeklyGoal({ weekly_goal_trainings: goal });
    await refresh();
  };

  if (!summary) return null;

  const streakLabel = `${summary.streak} ${summary.streak === 1 ? 'dia' : 'dias'}`;

  return (
    <>
      <section className="weekly-card">
        <header className="weekly-head">
          <span className="eyebrow">Esta semana</span>
          <button type="button" className="weekly-goal-chip" onClick={() => setGoalOpen(true)}>
            <Icon>target</Icon> Meta: {summary.goal}
          </button>
        </header>

        <div className="weekly-main">
          <strong>{summary.completed}/{summary.goal} treinos</strong>
          {summary.streak > 0 && (
            <span className="weekly-streak">
              <Icon filled>local_fire_department</Icon> {streakLabel}
            </span>
          )}
        </div>

        <ProgressBar percent={summary.progress_percent} />

        <p className="weekly-message">{summary.message}</p>

        <div className="weekly-actions">
          <CheckinButton
            checkedIn={summary.today_checked_in}
            loading={checkingIn}
            onCheckin={handleCheckin}
          />
          <button type="button" className="weekly-details" onClick={() => setDetailsOpen(true)}>
            Ver progresso <Icon>chevron_right</Icon>
          </button>
        </div>
      </section>

      {detailsOpen && (
        <ProgressDetails
          summary={summary}
          monthly={monthly}
          onClose={() => setDetailsOpen(false)}
          onEditGoal={() => { setDetailsOpen(false); setGoalOpen(true); }}
        />
      )}
      {goalOpen && (
        <WeeklyGoalModal
          current={summary.goal}
          onClose={() => setGoalOpen(false)}
          onSave={handleSaveGoal}
        />
      )}
    </>
  );
}
