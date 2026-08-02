import { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import { LoadingView } from '../components/StatusView';
import { useAuth } from '../contexts/auth-context';
import { friendService } from '../services';
import { errorMessage } from '../services/api';

const MEDALS = ['🥇', '🥈', '🥉'];
const FEEDBACK_TIMEOUT_MS = 4000;

function initial(name) {
  return String(name || '').trim().charAt(0).toUpperCase() || '?';
}

// offset 0 = mês corrente; negativo volta no tempo.
function monthParam(offset) {
  const today = new Date();
  const target = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`;
}

function PersonIdentity({ name, username, suffix = '' }) {
  return (
    <>
      <span className="ranking-avatar">{initial(name)}</span>
      <div className="ranking-identity">
        <strong>{name}{suffix}</strong>
        <small>@{username}</small>
      </div>
    </>
  );
}

function RankingRow({ entry }) {
  const medal = entry.position <= MEDALS.length ? MEDALS[entry.position - 1] : null;
  return (
    <li className={`ranking-row ${entry.is_me ? 'is-me' : ''}`}>
      <span className="ranking-position">{medal || `${entry.position}º`}</span>
      <span className="ranking-avatar">{initial(entry.name)}</span>
      <div className="ranking-identity">
        <strong>{entry.name}{entry.is_me ? ' · você' : ''}</strong>
        <div className="ranking-chips">
          <span className="ranking-chip">@{entry.username}</span>
          {entry.streak > 0 && <span className="ranking-chip">🔥 {entry.streak}</span>}
          <span className="ranking-chip">{entry.goal_percent}% da meta</span>
        </div>
      </div>
      <div className="ranking-days">
        <strong>{entry.days}</strong>
        <small>{entry.days === 1 ? 'dia' : 'dias'}</small>
      </div>
    </li>
  );
}

export default function Friends() {
  const { user } = useAuth();
  const [tab, setTab] = useState('ranking');
  const [monthOffset, setMonthOffset] = useState(0);
  const [ranking, setRanking] = useState(null);
  const [requests, setRequests] = useState({ received: [], sent: [] });
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [confirmingRemoval, setConfirmingRemoval] = useState(null);

  // Toda mutação (aceitar, remover, adicionar) incrementa este contador para o
  // efeito recarregar ranking, pedidos e lista de uma vez só.
  const [reloadToken, setReloadToken] = useState(0);
  const reload = () => setReloadToken((current) => current + 1);

  useEffect(() => {
    let active = true;
    Promise.all([
      friendService.ranking(monthOffset === 0 ? null : monthParam(monthOffset), { force: true }),
      friendService.requests({ force: true }),
      friendService.list({ force: true }),
    ])
      .then(([rankingResponse, requestsResponse, friendsResponse]) => {
        if (!active) return;
        setError('');
        setRanking(rankingResponse.data);
        setRequests(requestsResponse.data);
        setFriends(friendsResponse.data);
      })
      .catch((requestError) => {
        if (active) setError(errorMessage(requestError, 'Não foi possível carregar seus amigos.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [monthOffset, reloadToken]);

  // O aviso de sucesso some sozinho: deixar o banner fixo empurra o conteúdo
  // e dá a impressão de que algo ainda está pendente.
  useEffect(() => {
    if (!feedback) return undefined;
    const timer = window.setTimeout(() => setFeedback(''), FEEDBACK_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const openAdd = () => {
    setAddOpen(true);
    setTerm('');
    setSearchResult(null);
    setSearchError('');
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    setSearchError('');
    setSearchResult(null);
    setSearching(true);
    try {
      const { data } = await friendService.search(term);
      setSearchResult(data);
    } catch (requestError) {
      setSearchError(errorMessage(requestError, 'Não foi possível buscar esse @.'));
    } finally {
      setSearching(false);
    }
  };

  const handleSend = async (username) => {
    setBusyId(`send:${username}`);
    setSearchError('');
    try {
      const { data } = await friendService.sendRequest({ username });
      setFeedback(data.message);
      setAddOpen(false);
      reload();
    } catch (requestError) {
      setSearchError(errorMessage(requestError, 'Não foi possível enviar o pedido.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleRespond = async (requestId, action) => {
    setBusyId(`request:${requestId}`);
    try {
      const { data } = await friendService.respondRequest(requestId, action);
      setFeedback(data.message);
      setAddOpen(false);
      reload();
    } catch (requestError) {
      setError(errorMessage(requestError, 'Não foi possível responder ao pedido.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (friendId) => {
    setBusyId(`remove:${friendId}`);
    try {
      const { data } = await friendService.remove(friendId);
      setFeedback(data.message);
      setConfirmingRemoval(null);
      reload();
    } catch (requestError) {
      setError(errorMessage(requestError, 'Não foi possível desfazer a amizade.'));
    } finally {
      setBusyId(null);
    }
  };

  const pending = requests.received.length;
  const hasFriends = friends.length > 0;
  const me = ranking?.me;

  return (
    <AppShell
      title="Amigos"
      subtitle={tab === 'ranking' ? 'Ranking do mês' : 'Sua turma de treino'}
      action={(
        <button className="icon-button" type="button" onClick={openAdd} aria-label="Adicionar amigo">
          <Icon>person_add</Icon>
        </button>
      )}
    >
      <div className="friends-screen">
        {error && <p className="error-banner">{error}</p>}
        {feedback && <p className="success-banner">{feedback}</p>}

        <div className="history-tabs friends-tabs" role="tablist" aria-label="Seções de amigos">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'ranking'}
            className={`history-tab ${tab === 'ranking' ? 'active' : ''}`}
            onClick={() => setTab('ranking')}
          >
            <Icon>emoji_events</Icon> Ranking
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'amigos'}
            className={`history-tab ${tab === 'amigos' ? 'active' : ''}`}
            onClick={() => setTab('amigos')}
          >
            <Icon>group</Icon> Amigos
            {pending > 0 && <span className="nav-badge">{pending}</span>}
          </button>
        </div>

        {loading && <LoadingView />}

        {!loading && tab === 'ranking' && (
          <section className="friends-card">
            <header className="friends-month">
              <button type="button" aria-label="Mês anterior" onClick={() => setMonthOffset((current) => current - 1)}>
                <Icon>chevron_left</Icon>
              </button>
              <div>
                <strong>{ranking?.label || '—'}</strong>
                <small>Dias treinados</small>
              </div>
              <button
                type="button"
                aria-label="Próximo mês"
                disabled={monthOffset >= 0}
                onClick={() => setMonthOffset((current) => Math.min(0, current + 1))}
              >
                <Icon>chevron_right</Icon>
              </button>
            </header>

            {!hasFriends && (
              <div className="friends-empty">
                <Icon>emoji_events</Icon>
                <h3>Seu ranking começa com um amigo</h3>
                <p>Adicione alguém pelo @ e vocês passam a disputar quem treina mais dias no mês.</p>
                <button className="button button-primary" type="button" onClick={openAdd}>
                  Adicionar amigo
                </button>
              </div>
            )}

            {hasFriends && ranking && (
              <>
                {me && (
                  <div className="ranking-me">
                    <div>
                      <small>Sua posição</small>
                      <strong>{me.position}º</strong>
                    </div>
                    <div>
                      <small>Dias treinados</small>
                      <strong>{me.days}</strong>
                    </div>
                    <div>
                      <small>Sequência</small>
                      <strong>{me.streak ? `🔥 ${me.streak}` : '—'}</strong>
                    </div>
                  </div>
                )}
                <ol className="ranking-list">
                  {ranking.entries.map((entry) => <RankingRow key={entry.user_id} entry={entry} />)}
                </ol>
              </>
            )}
          </section>
        )}

        {!loading && tab === 'amigos' && (
          <>
            {pending > 0 && (
              <section className="friends-card friends-card-highlight">
                <div className="friends-card-title">
                  <span className="friends-card-icon"><Icon>group_add</Icon></span>
                  <div>
                    <h2>Pedidos recebidos</h2>
                    <p>{pending === 1 ? '1 pessoa quer' : `${pending} pessoas querem`} treinar com você.</p>
                  </div>
                </div>
                <ul className="friends-list">
                  {requests.received.map((request) => (
                    <li key={request.request_id} className="friends-list-row">
                      <PersonIdentity name={request.name} username={request.username} />
                      <div className="friends-row-actions">
                        <button
                          className="button button-muted"
                          type="button"
                          disabled={busyId === `request:${request.request_id}`}
                          onClick={() => handleRespond(request.request_id, 'reject')}
                        >
                          Recusar
                        </button>
                        <button
                          className="button button-primary"
                          type="button"
                          disabled={busyId === `request:${request.request_id}`}
                          onClick={() => handleRespond(request.request_id, 'accept')}
                        >
                          Aceitar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="friends-card">
              <div className="friends-card-title">
                <span className="friends-card-icon"><Icon>group</Icon></span>
                <div>
                  <h2>Meus amigos</h2>
                  <p>{hasFriends ? `${friends.length} no seu ranking.` : 'Ninguém por aqui ainda.'}</p>
                </div>
                <button className="button button-muted friends-add-inline" type="button" onClick={openAdd}>
                  <Icon>person_add</Icon>
                </button>
              </div>

              {!hasFriends && (
                <div className="friends-empty">
                  <Icon>diversity_3</Icon>
                  <h3>Nenhum amigo ainda</h3>
                  <p>Peça o @ de quem treina com você e mande o pedido.</p>
                  <button className="button button-primary" type="button" onClick={openAdd}>
                    Adicionar amigo
                  </button>
                </div>
              )}

              {hasFriends && (
                <ul className="friends-list">
                  {friends.map((friend) => (
                    <li key={friend.id} className="friends-list-row">
                      <PersonIdentity name={friend.name} username={friend.username} />
                      {confirmingRemoval === friend.id ? (
                        <div className="friends-row-actions">
                          <button className="button button-muted" type="button" onClick={() => setConfirmingRemoval(null)}>
                            Cancelar
                          </button>
                          <button
                            className="button button-danger"
                            type="button"
                            disabled={busyId === `remove:${friend.id}`}
                            onClick={() => handleRemove(friend.id)}
                          >
                            Remover
                          </button>
                        </div>
                      ) : (
                        <button
                          className="friends-remove"
                          type="button"
                          aria-label={`Desfazer amizade com ${friend.name}`}
                          onClick={() => setConfirmingRemoval(friend.id)}
                        >
                          <Icon>person_remove</Icon>
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {requests.sent.length > 0 && (
              <section className="friends-card friends-card-quiet">
                <div className="friends-card-title">
                  <span className="friends-card-icon"><Icon>hourglass_top</Icon></span>
                  <div>
                    <h2>Aguardando resposta</h2>
                    <p>{requests.sent.length} pedido(s) enviado(s).</p>
                  </div>
                </div>
                <ul className="friends-list">
                  {requests.sent.map((request) => (
                    <li key={request.request_id} className="friends-list-row">
                      <PersonIdentity name={request.name} username={request.username} />
                      <button
                        className="button button-muted"
                        type="button"
                        disabled={busyId === `remove:${request.id}`}
                        onClick={() => handleRemove(request.id)}
                      >
                        Cancelar
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>

      {addOpen && (
        <Modal
          title="Adicionar amigo"
          subtitle="Busque pelo nome de usuário"
          onClose={() => setAddOpen(false)}
        >
          <form className="friends-search" onSubmit={handleSearch}>
            <div className="friends-search-field">
              <span aria-hidden="true">@</span>
              <input
                value={term}
                onChange={(event) => setTerm(event.target.value.replace(/\s/g, ''))}
                placeholder="nome.de.usuario"
                maxLength={20}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
              />
            </div>
            <button className="button button-primary" type="submit" disabled={searching || !term.trim()}>
              {searching ? 'Buscando...' : 'Buscar'}
            </button>
          </form>

          {searchError && <p className="error-banner">{searchError}</p>}

          {searchResult && (
            <div className="friends-result">
              <PersonIdentity name={searchResult.name} username={searchResult.username} />
              {searchResult.relation === 'none' && (
                <button
                  className="button button-primary"
                  type="button"
                  disabled={busyId === `send:${searchResult.username}`}
                  onClick={() => handleSend(searchResult.username)}
                >
                  Adicionar
                </button>
              )}
              {searchResult.relation === 'self' && <span className="friends-tag">É você</span>}
              {searchResult.relation === 'friend' && <span className="friends-tag">Já são amigos</span>}
              {searchResult.relation === 'request_sent' && <span className="friends-tag">Pedido enviado</span>}
              {searchResult.relation === 'request_received' && (
                <button
                  className="button button-primary"
                  type="button"
                  disabled={busyId === `request:${searchResult.request_id}`}
                  onClick={() => handleRespond(searchResult.request_id, 'accept')}
                >
                  Aceitar
                </button>
              )}
            </div>
          )}

          {user?.username && (
            <p className="friends-hint">
              Seu @ é <strong>@{user.username}</strong> — compartilhe para te acharem.
            </p>
          )}
        </Modal>
      )}
    </AppShell>
  );
}
