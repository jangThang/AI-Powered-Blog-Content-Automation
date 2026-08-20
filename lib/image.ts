import type { PhotoInput } from "./types";

const MAX_EDGE = 1400;
// Keep a 100-photo local request manageable while retaining enough detail for visual analysis.
const MAX_BYTES = 350_000;
const STANDARD_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const HEIC_IMAGE_TYPES = new Set(["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"]);
const STANDARD_IMAGE_EXTENSIONS = /\.(?:jpe?g|png|webp)$/i;
const HEIC_IMAGE_EXTENSIONS = /\.(?:heic|heif)$/i;

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("사진 변환에 실패했습니다."))), "image/jpeg", quality);
  });
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("사진을 읽지 못했습니다."));
    reader.readAsDataURL(blob);
  });
}

function isStandardImage(file: File) {
  return STANDARD_IMAGE_TYPES.has(file.type.toLowerCase()) || STANDARD_IMAGE_EXTENSIONS.test(file.name);
}

function isHeicImage(file: File) {
  return HEIC_IMAGE_TYPES.has(file.type.toLowerCase()) || HEIC_IMAGE_EXTENSIONS.test(file.name);
}

async function convertHeicToJpeg(file: File) {
  try {
    // HEIC support is loaded only when needed, keeping the normal upload path light.
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
    const jpeg = Array.isArray(converted) ? converted[0] : converted;
    if (!jpeg) throw new Error("변환 결과가 비어 있습니다.");
    return jpeg;
  } catch {
    throw new Error(`${file.name}: HEIC 사진을 변환하지 못했습니다. 파일이 손상되지 않았는지 확인해주세요.`);
  }
}

export async function compressPhoto(file: File): Promise<PhotoInput> {
  const isHeic = isHeicImage(file);
  if (!isHeic && !isStandardImage(file)) throw new Error(`${file.name}: JPG, PNG, WebP 또는 HEIC 사진만 사용할 수 있습니다.`);

  const source = isHeic ? await convertHeicToJpeg(file) : file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(source);
  } catch {
    throw new Error(`${file.name}: 사진을 열지 못했습니다. 파일이 손상되지 않았는지 확인해주세요.`);
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  let canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("사진 처리 기능을 사용할 수 없습니다.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let quality = 0.82;
  let blob = await canvasToBlob(canvas, quality);
  while (blob.size > MAX_BYTES && quality > 0.5) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, quality);
  }

  while (blob.size > MAX_BYTES && Math.max(canvas.width, canvas.height) > 700) {
    const smaller = document.createElement("canvas");
    smaller.width = Math.max(1, Math.round(canvas.width * 0.82));
    smaller.height = Math.max(1, Math.round(canvas.height * 0.82));
    const smallerContext = smaller.getContext("2d");
    if (!smallerContext) throw new Error("사진 처리 기능을 사용할 수 없습니다.");
    smallerContext.drawImage(canvas, 0, 0, smaller.width, smaller.height);
    canvas = smaller;
    blob = await canvasToBlob(canvas, 0.68);
  }
  if (blob.size > MAX_BYTES) throw new Error(`${file.name}: 압축 후에도 사진이 너무 큽니다.`);
  return { name: file.name.replace(/\.[^.]+$/, ".jpg"), dataUrl: await blobToDataUrl(blob) };
}
