// A permission prompt may finish after its panel closes. Release that late stream
// instead of attaching it to an abandoned scanner.
export function createQrCameraSession() {
  let revision = 0;
  let pending = false;
  let current: MediaStream | null = null;
  const release = (stream: MediaStream | null) => stream?.getTracks().forEach((track) => track.stop());
  return {
    async start(request: () => Promise<MediaStream>) {
      if (pending) return null;
      pending = true;
      const requestRevision = ++revision;
      try {
        const stream = await request();
        if (requestRevision !== revision) { release(stream); return null; }
        release(current);
        current = stream;
        return stream;
      } catch (error) {
        if (requestRevision !== revision) return null;
        throw error;
      } finally { if (requestRevision === revision) pending = false; }
    },
    isCurrent: (stream: MediaStream) => current === stream,
    stop() { revision++; pending = false; release(current); current = null; },
  };
}

export async function createQrFrameReader() {
  const { default: decode } = await import("jsqr");
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Camera frames could not be read.");

  return (video: HTMLVideoElement) => {
    if (!video.videoWidth || !video.videoHeight) return;
    const scale = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.max(1, Math.round(video.videoWidth * scale));
    const height = Math.max(1, Math.round(video.videoHeight * scale));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    context.drawImage(video, 0, 0, width, height);
    const frame = context.getImageData(0, 0, width, height);
    return decode(frame.data, width, height, { inversionAttempts: "dontInvert" })?.data;
  };
}
