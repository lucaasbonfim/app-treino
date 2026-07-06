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

## Gerar APK Android

O app Android é empacotado com [Capacitor](https://capacitorjs.com/). O APK contém **apenas o frontend**; a API precisa estar online (Render) e a variável `VITE_API_URL` precisa apontar para ela.

### Pré-requisitos (uma vez)

1. Instale o [Android Studio](https://developer.android.com/studio).
2. Abra o Android Studio pelo menos uma vez para ele baixar o **Android SDK** e o **Gradle**.
3. **JDK 21** é obrigatório (o Capacitor 7 compila o Android com Java 21). O Android Studio já traz um JDK 21 embutido (JBR) — o `apk:debug` usa esse JDK automaticamente, mesmo que o `JAVA_HOME` do sistema aponte para outra versão.
4. Use **Node.js 20** (o Capacitor deste projeto está fixado na linha 7.x, compatível com Node 20; a v8 exige Node 22+).

> O script `apk:debug` cria automaticamente o `android/local.properties` (localização do SDK) e escolhe um JDK 21+ para o Gradle. Ambos os arquivos são específicos da máquina e ficam fora do git.

### Configurar a URL da API

Edite `frontend/.env.production` e troque o valor pela URL real do backend no Render, **mantendo o sufixo `/api`**:

```env
# frontend/.env.production
VITE_API_URL=https://SEU-BACKEND.onrender.com/api
```

No backend (Render), configure a variável `FRONTEND_URL` com a URL do frontend para liberá-la no CORS.

### Gerar o APK

```powershell
cd frontend
npm install
npm run apk:debug
```

O comando `apk:debug` executa tudo automaticamente (Windows/Linux/macOS):

1. `npm run build` — gera o bundle web em `frontend/dist/`.
2. `cap add android` (só na primeira vez) e `cap sync android` — sincroniza o web + plugins.
3. Gradle `assembleDebug` (`gradlew.bat` no Windows, `./gradlew` nos demais) — gera o APK.
4. Copia o APK final para a raiz do repositório.

O APK final fica em:

```text
temp/apk/korvix-gym-debug.apk
```

A pasta `temp/apk` é criada automaticamente e está no `.gitignore` (o APK não sobe para o GitHub).

### Instalar no celular

Copie `temp/apk/korvix-gym-debug.apk` para o Android e instale (é preciso permitir "instalar de fontes desconhecidas"). Como é um APK **debug** não assinado para a Play Store, serve para testes e distribuição manual.

> **Sempre que alterar o frontend, gere o APK novamente** com `npm run apk:debug`.

### Scripts disponíveis (frontend)

```bash
npm run apk:debug          # build web + sync + APK + copia para temp/apk
npm run apk:copy           # apenas copia um APK já gerado para temp/apk
npm run cap:sync           # build web + cap sync android
npm run cap:add:android    # adiciona a plataforma android (uso pontual)
npm run android:open       # abre o projeto no Android Studio
```

### Erros comuns

| Erro | Solução |
| --- | --- |
| `The Capacitor CLI requires NodeJS >=22` | Alguém subiu o Capacitor para v8. Mantenha `@capacitor/*` na v7 **ou** atualize o Node para 22+. |
| `Could not find installation of TypeScript` | Rode `npm install` (o `typescript` já está em devDependencies para ler o `capacitor.config.ts`). |
| `SDK location not found` | Instale o Android Studio e **abra-o uma vez** para baixar o SDK. O `apk:debug` gera o `android/local.properties` sozinho; se preciso, defina `ANDROID_HOME`. |
| `invalid source release: 21` | O Gradle pegou um JDK < 21 (ex.: `JAVA_HOME` apontando para JDK 17/20). O `apk:debug` já força o JDK 21 do Android Studio; se persistir, instale/abra o Android Studio ou aponte `JAVA_HOME` para um JDK 21. |
| APK abre mas não carrega dados | `VITE_API_URL` no `.env.production` está errado ou com placeholder. Ajuste (com sufixo `/api`) e gere o APK de novo. |
| App bloqueado por CORS | Configure `FRONTEND_URL` no backend (Render) e confirme que o backend com o novo CORS já foi publicado. |

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
