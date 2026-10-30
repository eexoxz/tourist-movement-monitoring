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
