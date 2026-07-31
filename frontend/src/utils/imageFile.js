// Foto de ficha vem grande demais da câmera do celular. Reduz antes de mandar:
// o que importa para a IA é o texto legível, não a resolução.
const MAX_SIDE = 1600;
const QUALITY = 0.82;

export const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp,image/heic,image/heif';

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Não foi possível abrir a imagem.'));
    image.src = dataUrl;
  });
}

function toBase64(dataUrl) {
  const [header, data] = String(dataUrl).split(',');
  return {
    mime_type: header.slice(header.indexOf(':') + 1, header.indexOf(';')),
    data: data || '',
    preview: dataUrl,
  };
}

/**
 * Converte o arquivo escolhido em { mime_type, data (base64), preview }.
 * Se o navegador não conseguir redimensionar (HEIC, por exemplo), manda o
 * arquivo original — o backend ainda valida tipo e tamanho.
 */
export async function prepareImage(file) {
  const dataUrl = await readAsDataUrl(file);

  try {
    const image = await loadImage(dataUrl);
    const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height));
    if (scale === 1 && file.size <= 1024 * 1024) return toBase64(dataUrl);

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);

    return toBase64(canvas.toDataURL('image/jpeg', QUALITY));
  } catch {
    return toBase64(dataUrl);
  }
}
