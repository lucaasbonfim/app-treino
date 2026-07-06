// Copia o APK debug gerado pelo Gradle para a pasta temp/apk na raiz do repositório.
// Este projeto usa "type": "module" no package.json, então o script é um ES module.
import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// scripts/ fica dentro de frontend/, então subimos um nível para chegar em frontend
// e dois níveis para chegar na raiz do repositório (onde vive temp/).
const APK_SOURCE = path.resolve(
  __dirname,
  '..',
  'android',
  'app',
  'build',
  'outputs',
  'apk',
  'debug',
  'app-debug.apk',
);
const DEST_DIR = path.resolve(__dirname, '..', '..', 'temp', 'apk');
const DEST_FILE = path.join(DEST_DIR, 'korvix-gym-debug.apk');

export function copyApk() {
  if (!existsSync(APK_SOURCE)) {
    console.error('\n❌ APK debug não encontrado em:');
    console.error(`   ${APK_SOURCE}`);
    console.error('\n   O build Android precisa ser executado primeiro.');
    console.error('   Rode:  npm run apk:debug');
    console.error('   (ou gere o APK debug pelo Android Studio antes de copiar).\n');
    process.exit(1);
  }

  // Cria temp/apk automaticamente se ainda não existir.
  mkdirSync(DEST_DIR, { recursive: true });
  copyFileSync(APK_SOURCE, DEST_FILE);

  console.log('\n✅ APK gerado com sucesso em:');
  console.log('   temp/apk/korvix-gym-debug.apk\n');
}

// Permite rodar direto (`node scripts/copy-apk.js`) ou importar de build-apk.js.
const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  copyApk();
}

export { APK_SOURCE, DEST_FILE };
