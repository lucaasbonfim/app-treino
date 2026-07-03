import ActionSheet from './ActionSheet';

export default function AbandonWorkoutConfirmModal({
  open,
  onClose,
  onConfirm,
  loading = false,
}) {
  return (
    <ActionSheet
      open={open}
      onClose={onClose}
      title="Abandonar este treino?"
      description="O progresso dessa sessão não aparecerá como treino finalizado."
      icon="warning"
      actions={[{
        key: 'abandon',
        label: loading ? 'Abandonando...' : 'Abandonar treino',
        description: 'A sessão não contará no histórico nem como check-in',
        icon: 'cancel',
        tone: 'danger',
        disabled: loading,
        keepOpen: true,
        onSelect: onConfirm,
      }]}
    />
  );
}
