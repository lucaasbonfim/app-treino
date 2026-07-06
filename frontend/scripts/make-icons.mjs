// Gera as imagens-fonte (1024x1024) que o @capacitor/assets usa para produzir
// os ícones do Android, a partir do logo do app (public/korvix-logo.svg).
//   - icon-only.png       -> ícone completo (o logo)
//   - icon-background.png  -> fundo do ícone adaptativo (cor sólida escura)
//   - icon-foreground.png  -> frente do ícone adaptativo (logo reduzido na safe zone)
// Depois rode:  npx capacitor-assets generate --android
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const assetsDir = path.join(root, 'assets');
const logo = path.join(root, 'public', 'korvix-logo.svg');
mkdirSync(assetsDir, { recursive: true });

const SIZE = 1024;
const BG = '#0a0e13'; // cor de fundo do logo (parte inferior do gradiente)

// icon-only: o logo preenchendo o quadrado.
await sharp(logo, { density: 400 })
  .resize(SIZE, SIZE, { fit: 'contain', background: BG })
  .png()
  .toFile(path.join(assetsDir, 'icon-only.png'));

// icon-background: cor sólida (o mascaramento adaptativo cuida do formato).
await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: BG } })
  .png()
  .toFile(path.join(assetsDir, 'icon-background.png'));

// icon-foreground: logo reduzido (~80%) e centralizado em fundo transparente,
// para caber na "safe zone" do ícone adaptativo sem ser cortado pela máscara.
const inner = Math.round(SIZE * 0.8);
const fg = await sharp(logo, { density: 400 })
  .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: fg, gravity: 'center' }])
  .png()
  .toFile(path.join(assetsDir, 'icon-foreground.png'));

console.log('Ícones-fonte gerados em assets/ (icon-only, icon-background, icon-foreground).');
