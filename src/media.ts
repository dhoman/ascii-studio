export function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach(track => track.stop());
}

export async function openCamera(signal: AbortSignal): Promise<MediaStream> {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera requires localhost or HTTPS and a browser with camera support.');
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { width: { ideal: 1280 }, height: { ideal: 720 } } });
  if (signal.aborted) {
    stopStream(stream);
    throw new DOMException('Camera request cancelled', 'AbortError');
  }
  return stream;
}

export function loadVideo(video: HTMLVideoElement, source: string | MediaStream, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener('loadeddata', ready);
      video.removeEventListener('error', failed);
      signal.removeEventListener('abort', cancelled);
    };
    const ready = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error('Video could not be decoded. Try an H.264 MP4 or WebM.')); };
    const cancelled = () => { cleanup(); reject(new DOMException('Cancelled', 'AbortError')); };
    const timer = window.setTimeout(() => { cleanup(); reject(new Error('Video load timed out. Try another clip.')); }, 20000);
    video.addEventListener('loadeddata', ready, { once: true });
    video.addEventListener('error', failed, { once: true });
    signal.addEventListener('abort', cancelled, { once: true });
    if (signal.aborted) { cancelled(); return; }
    video.muted = true; video.playsInline = true; video.preload = 'auto';
    if (typeof source === 'string') { video.srcObject = null; video.src = source; video.load(); }
    else { video.removeAttribute('src'); video.srcObject = source; void video.play().catch(failed); }
  });
}

export function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  const target = Math.max(0, Math.min(video.duration || 0, time));
  if (Math.abs(video.currentTime - target) < 0.00001 && !video.seeking) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const cleanup = () => { clearTimeout(timer); video.removeEventListener('seeked', done); video.removeEventListener('error', failed); };
    const done = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error('Could not seek this video.')); };
    const timer = window.setTimeout(failed, 10000);
    video.addEventListener('seeked', done, { once: true });
    video.addEventListener('error', failed, { once: true });
    video.currentTime = target;
  });
}

export function cameraError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'NotAllowedError') return 'Camera permission denied. Allow camera access in your browser, then try Start camera again.';
  if (error instanceof DOMException && error.name === 'NotFoundError') return 'No camera found. Connect a camera, then try again.';
  if (error instanceof DOMException && error.name === 'NotReadableError') return 'Camera is busy or unavailable. Close other camera apps and retry.';
  return `Camera unavailable: ${String(error)}`;
}
