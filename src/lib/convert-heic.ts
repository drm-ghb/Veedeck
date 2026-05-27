function isHeic(file: File): boolean {
  return /\.(heic|heif)$/i.test(file.name) || file.type === "image/heic" || file.type === "image/heif";
}

export async function convertHeicFiles(files: File[]): Promise<File[]> {
  const converted: File[] = [];
  for (const file of files) {
    if (isHeic(file)) {
      try {
        const heic2any = (await import("heic2any")).default;
        const blob = (await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 })) as Blob;
        const name = file.name.replace(/\.(heic|heif)$/i, ".jpg");
        converted.push(new File([blob], name, { type: "image/jpeg" }));
      } catch {
        converted.push(file);
      }
    } else {
      converted.push(file);
    }
  }
  return converted;
}
