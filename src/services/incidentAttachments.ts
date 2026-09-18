export type IncidentPhotoAttachment = {
  photoDataUrl: string;
  photoName: string;
  photoType: string;
  photoSizeBytes: number;
  photoCapturedAt: string;
};

const maxIncidentPhotoSizeBytes = 3 * 1024 * 1024;
const maxIncidentPhotoDimension = 900;

export function validateIncidentPhotoFile(file: Pick<File, "type" | "size">) {
  if (!file.type.startsWith("image/")) {
    return "Choose an image file for the incident photo.";
  }

  if (file.size > maxIncidentPhotoSizeBytes) {
    return "Choose an image below 3 MB so the report can sync reliably.";
  }

  return null;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Photo could not be read."));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Photo preview could not be prepared."));
    image.src = dataUrl;
  });
}

function resizeImage(image: HTMLImageElement) {
  const scale = Math.min(1, maxIncidentPhotoDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Photo compression is not available in this browser.");
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.78);
}

export async function prepareIncidentPhotoAttachment(file: File): Promise<{ attachment?: IncidentPhotoAttachment; error?: string }> {
  const validationError = validateIncidentPhotoFile(file);
  if (validationError) {
    return { error: validationError };
  }

  try {
    const originalDataUrl = await readFileAsDataUrl(file);
    const image = await loadImage(originalDataUrl);
    const photoDataUrl = resizeImage(image);

    return {
      attachment: {
        photoDataUrl,
        photoName: file.name,
        photoType: "image/jpeg",
        photoSizeBytes: Math.round((photoDataUrl.length * 3) / 4),
        photoCapturedAt: new Date().toISOString(),
      },
    };
  } catch {
    return { error: "Incident photo could not be prepared. Try a smaller image or submit the report without a photo." };
  }
}
