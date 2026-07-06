// Pipeline completo para gerar o APK debug do KorVix Gym em um único comando.
// Funciona no Windows (PowerShell/cmd) e em Linux/macOS.
//
//   1. npm run build            -> gera o bundle web em dist/
//   2. cap add android (se necessário) + cap sync android
//   3. Gradle assembleDebug     -> gera o APK debug
//   4. copia o APK para ../temp/apk/korvix-gym-debug.apk
//
// Este projeto usa "type": "module" no package.json, então o script é um ES module.
import { spawnSync } from 'node:child_process';
import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { copyApk } from './copy-apk.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(__dirname, '..');
const androidDir = path.join(frontendDir, 'android');
const isWindows = process.platform === 'win32';

// Descobre onde está o Android SDK e garante que o Gradle consiga encontrá-lo.
// Sem isso o build falha com "SDK location not found".
function findAndroidSdk() {
  const fromEnv = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  const home = os.homedir();
  const candidates = isWindows
    ? [path.join(process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), 'Android', 'Sdk')]
    : process.platform === 'darwin'
      ? [path.join(home, 'Library', 'Android', 'sdk')]
      : [path.join(home, 'Android', 'Sdk'), path.join(home, 'Android', 'sdk')];

  return candidates.find((dir) => existsSync(dir)) || null;
}

function ensureLocalProperties() {
  const localProps = path.join(androidDir, 'local.properties');
  if (existsSync(localProps)) return;

  const sdkDir = findAndroidSdk();
  if (!sdkDir) {
    console.error('\n❌ Android SDK não encontrado.');
    console.error('   Instale o Android Studio e abra-o uma vez para baixar o SDK,');
    console.error('   ou defina a variável de ambiente ANDROID_HOME apontando para o SDK.\n');
    process.exit(1);
  }

  // Barras normais funcionam no formato .properties em qualquer sistema.
  writeFileSync(localProps, `sdk.dir=${sdkDir.replace(/\\/g, '/')}\n`);
  console.log(`\nℹ️  local.properties criado apontando para o SDK:\n   ${sdkDir}`);
}

function run(command, args, options = {}) {
  // Monta uma linha única e cita caminhos com espaço (OneDrive/Program Files).
  // shell: true resolve os .cmd/.bat do Windows (npm, npx, gradlew) sem esforço extra.
  const quoted = /\s/.test(command) ? `"${command}"` : command;
  const line = [quoted, ...args].join(' ');
  console.log(`\n> ${line}`);
  const result = spawnSync(line, {
    stdio: 'inherit',
    cwd: frontendDir,
    shell: true,
    ...options,
  });
  if (result.error) {
    console.error(`\n❌ Não foi possível executar: ${line}`);
    console.error(`   ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`\n❌ Falhou (código ${result.status}): ${line}`);
    process.exit(result.status ?? 1);
  }
}

// Capacitor 7 compila o Android com Java 21. Procura um JDK >= 21 (de preferência
// o JBR que vem com o Android Studio) para não depender do JAVA_HOME do sistema,
// que aqui aponta para um JDK mais antigo ("invalid source release: 21").
function javaMajor(javaHome) {
  try {
    const release = readFileSync(path.join(javaHome, 'release'), 'utf8');
    const match = release.match(/JAVA_VERSION="?(\d+)/);
    if (match) return Number.parseInt(match[1], 10);
  } catch {
    // sem arquivo release -> ignora candidato
  }
  return 0;
}

function findJava21Home() {
  const candidates = [];
  if (process.env.JAVA_HOME) candidates.push(process.env.JAVA_HOME);

  if (isWindows) {
    const localApp = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    candidates.push(
      'C:/Program Files/Android/Android Studio/jbr',
      path.join(localApp, 'Programs', 'Android Studio', 'jbr'),
    );
  } else if (process.platform === 'darwin') {
    candidates.push('/Applications/Android Studio.app/Contents/jbr/Contents/Home');
  } else {
    candidates.push('/opt/android-studio/jbr', '/usr/local/android-studio/jbr');
  }

  return candidates.find((dir) => dir && existsSync(dir) && javaMajor(dir) >= 21) || null;
}

// 1. Build web (usa .env.production automaticamente no modo production do Vite).
run('npm', ['run', 'build']);

// 2. Garante a plataforma Android e sincroniza os arquivos web + plugins.
if (!existsSync(androidDir)) {
  console.log('\nℹ️  Plataforma Android ainda não existe. Rodando "cap add android"...');
  run('npx', ['cap', 'add', 'android']);
}
run('npx', ['cap', 'sync', 'android']);

// 3. Gera o APK debug com o Gradle wrapper (gradlew.bat no Windows, ./gradlew nos demais).
// Caminho absoluto para não depender de o shell procurar o script no diretório atual.
ensureLocalProperties();

const gradleEnv = { ...process.env };
const java21 = findJava21Home();
if (java21) {
  gradleEnv.JAVA_HOME = java21;
  gradleEnv.PATH = path.join(java21, 'bin') + path.delimiter + (gradleEnv.PATH || '');
  console.log(`\nℹ️  Usando JDK 21 para o Gradle:\n   ${java21}`);
} else {
  console.warn(
    '\n⚠️  Não encontrei um JDK 21+. Se o build falhar com "invalid source release: 21",' +
      '\n   instale/abra o Android Studio (traz um JDK 21) ou aponte JAVA_HOME para um JDK 21.',
  );
}

const gradlew = path.join(androidDir, isWindows ? 'gradlew.bat' : 'gradlew');
run(gradlew, ['assembleDebug'], { cwd: androidDir, env: gradleEnv });

// 4. Copia o APK final para temp/apk/korvix-gym-debug.apk.
copyApk();
