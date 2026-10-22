// Reproducible motion fixture; this animates a still photo, not recorded camera footage.
// Requires ffmpeg with libvpx-vp9. Original source/license: docs/assets.md.
import { mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
mkdirSync('references/previews', { recursive: true });
const result = spawnSync('ffmpeg', [
  '-hide_banner', '-loglevel', 'error', '-y', '-i', 'references/1000009349.jpg',
  '-vf', "scale=960:-2,zoompan=z='1.05+0.0008*on':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=180:s=480x640:fps=30,format=yuv420p",
  '-frames:v', '180', '-an', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '34', '-deadline', 'realtime', '-cpu-used', '6',
  'references/previews/00-leaves-and-bark-photo-pan.webm',
], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
