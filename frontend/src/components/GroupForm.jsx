import { useState } from 'react';
import Modal from './Modal';
import { errorMessage } from '../services/api';

export default function GroupForm({ group, onSubmit, onClose }) {
  const [name, setName] = useState(group?.name || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSubmit({ name });
      onClose();
    } catch (requestError) {
      setError(errorMessage(requestError, 'Não foi possível salvar o grupo.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={group ? 'Editar grupo' : 'Adicionar grupo'}
      subtitle="Organize os exercícios por região muscular."
      onClose={onClose}
    >
      <form className="form-stack" onSubmit={submit}>
        <label className="field">
          <span>Grupo muscular</span>
          <input
            autoFocus
            required
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Peito"
          />
        </label>
        {error && <p className="error-banner">{error}</p>}
        <div className="form-actions">
          <button className="button button-muted" type="button" onClick={onClose}>Cancelar</button>
          <button className="button button-primary" type="submit" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

