# KorVix Gym

Aplicativo web mobile-first para montar treinos manualmente. O projeto tem frontend e backend próprios.

## Tecnologias

- Frontend: React 19, Vite 8, React Router, Axios e Tailwind CSS 4.
- Backend: Node.js 20+, Express 5, PostgreSQL, Knex, JWT, bcrypt e Nodemailer.
- Banco: PostgreSQL 16 (há um `compose.yml` opcional para desenvolvimento).

## Estrutura

```text
app-treino/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── db/migrations/
│   │   ├── middlewares/
│   │   ├── repositories/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   └── test/
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/
│       ├── contexts/
│       ├── pages/
│       ├── services/
│       └── utils/
└── compose.yml
```

## Executar localmente

Pré-requisitos: Node.js 20 ou superior, npm e PostgreSQL. Para iniciar o PostgreSQL com Docker:

```bash
cd app-treino
docker compose up -d
```

Backend:

```bash
cd backend
copy .env.example .env
npm install
npm run migrate
npm run dev
```

No macOS/Linux, use `cp .env.example .env`. Antes de expor a API, substitua `JWT_SECRET` no `.env`.

Frontend, em outro terminal:

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

A interface fica em `http://localhost:5173` e a API em `http://localhost:3001`. Crie a primeira conta pela opção **Criar conta** da tela de login.

## Rodar as migrations

Com o PostgreSQL em execução e as variáveis `DB_*` preenchidas em `backend/.env`:

```bash
cd backend
npm run migrate:status
npm run migrate
```

O primeiro comando mostra migrations executadas e pendentes. O segundo executa todas as pendentes. Para desfazer somente o último lote:

```bash
npm run migrate:rollback
```

Se estiver usando o banco do `compose.yml`, inicie o Docker Desktop antes de rodar `docker compose up -d`.

## Variáveis de ambiente e envio de código

O backend carrega `backend/.env`. Todas as chaves necessárias estão em `backend/.env.example`.

- `APP_URL`: endereço do frontend aberto pelo botão do e-mail.
- `EMAIL_VERIFICATION_EXPIRY_MINUTES`: validade do código de cadastro.
- `BREVO_API_KEY`: método prioritário de envio, seguindo o padrão do Grana Control.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`: fallback SMTP.
- `SMTP_FROM`: remetente; no Brevo, o endereço precisa estar autorizado na conta.

Para usar Brevo, preencha `BREVO_API_KEY` e `SMTP_FROM`. Para usar somente SMTP, deixe `BREVO_API_KEY` vazio e preencha todas as chaves `SMTP_*`. Em desenvolvimento, se Brevo e SMTP estiverem vazios, o e-mail completo e o código aparecem no terminal do backend.

O frontend usa somente:

```env
VITE_API_URL=http://localhost:3001/api
```

## Comandos úteis

```bash
# backend
npm run migrate
npm run migrate:status
npm run migrate:rollback
npm test
npm start

# frontend
npm run dev
npm run build
npm run lint
npm run preview
```

## API

Todas as rotas, exceto autenticação e health check, exigem `Authorization: Bearer <token>`.

```text
GET    /health
POST   /api/auth/register
POST   /api/auth/register/verify
POST   /api/auth/login
GET    /api/auth/me
PUT    /api/auth/name
POST   /api/auth/change-password
POST   /api/auth/email/request
POST   /api/auth/email/confirm

GET    /api/workouts
POST   /api/workouts
GET    /api/workouts/:id
PUT    /api/workouts/:id
DELETE /api/workouts/:id
POST   /api/workouts/:workoutId/sessions

POST   /api/workouts/:workoutId/muscle-groups
PUT    /api/muscle-groups/:id
DELETE /api/muscle-groups/:id

POST   /api/muscle-groups/:muscleGroupId/exercises
PUT    /api/exercises/:id
DELETE /api/exercises/:id

GET    /api/workout-sessions
GET    /api/workout-sessions/:id
PUT    /api/workout-sessions/:id
POST   /api/workout-sessions/:id/finish
PUT    /api/workout-sessions/:sessionId/exercises/:exerciseId
```

As consultas e alterações de treino, grupo, exercício e sessão verificam o `user_id` do token. Sessões guardam snapshots dos nomes e valores planejados para preservar o histórico.

## Escopo desta versão

Incluído: cadastro com confirmação por e-mail, login, lista semanal, CRUD de treinos, grupos musculares e exercícios, execução de treino, timer de descanso configurável, progresso, retomada de sessão em andamento, histórico, perfil, tema claro/escuro, cache e isolamento por usuário.

Fora desta versão: recuperação de senha, login social, reordenação por arrastar, controle individual de séries, cronômetro de duração total, estatísticas, gráficos de progressão de carga, exclusão manual de sessões, testes HTTP automatizados e publicação/PWA offline.
