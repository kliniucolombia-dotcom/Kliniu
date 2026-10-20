// Reduce la foto antes de subirla: el celular entrega 5-12 MB y Vercel corta el body en 4,5 MB.
export async function compressPhoto(file: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.8));
    if (blob) return new File([blob], "entrega.jpg", { type: "image/jpeg" });
  } catch { /* formato que el navegador no decodifica: se sube tal cual si es liviano */ }
  if (file.size > 4 * 1024 * 1024) throw new Error("No se pudo preparar la foto. Intenta tomarla de nuevo.");
  return file;
}
