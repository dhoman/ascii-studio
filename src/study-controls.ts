import { makeStudy, parseStudy, readStyles, saveStyle, type LabStyle, type Study } from './presets';
import { element } from './ui';

interface StudyHost {
  getStyle(): LabStyle;
  setStyle(style: LabStyle): void;
  getSource(): Study['source'];
  hasSource(): boolean;
  pause(): Promise<void>;
  renderer: { snapshot(): Promise<Blob> };
  restore(study: Study): Promise<string>;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename;
  document.body.append(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function connectStudyControls(host: StudyHost) {
  const message = element('study-message');
  const saved = element<HTMLSelectElement>('saved-styles');
  const name = element<HTMLInputElement>('preset-name');
  let busy = false;
  function act(action: () => void | Promise<void>) {
    if (busy) return;
    busy = true;
    Promise.resolve().then(action).catch(error => { message.textContent = String(error); }).finally(() => { busy = false; });
  }
  function refresh() {
    const styles = readStyles(localStorage);
    saved.replaceChildren(new Option('Choose a saved style', ''));
    Object.keys(styles).sort().forEach(name => saved.add(new Option(name, name)));
  }
  try { refresh(); } catch { message.textContent = 'Saved styles are unavailable or damaged. JSON export still works.'; }
  element('save-style').addEventListener('click', () => act(() => {
    saveStyle(localStorage, name.value, host.getStyle()); refresh(); saved.value = name.value.trim();
    message.textContent = `Saved “${name.value.trim()}” in this browser.`;
  }));
  element('load-style').addEventListener('click', () => act(() => {
    const styles = readStyles(localStorage);
    if (!saved.value || !Object.hasOwn(styles, saved.value)) throw new Error('Choose a saved style first.');
    host.setStyle(styles[saved.value]); message.textContent = `Loaded “${saved.value}” on the current input.`;
  }));
  function stem() {
    return `ascii-${host.getSource().name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 70)}-${host.getSource().time.toFixed(3)}s`;
  }
  element('export-study').addEventListener('click', () => act(async () => {
    if (!host.hasSource()) throw new Error('Load media or start the camera first.');
    await host.pause();
    const study = makeStudy(host.getStyle(), host.getSource());
    download(new Blob([JSON.stringify(study, null, 2)], { type: 'application/json' }), `${stem()}.json`);
    message.textContent = 'Study JSON exported. Media is not included; moving previews were paused.';
  }));
  element('export-png').addEventListener('click', () => act(async () => {
    if (!host.hasSource()) throw new Error('Load media or start the camera first.');
    await host.pause();
    download(await host.renderer.snapshot(), `${stem()}.png`);
    message.textContent = 'PNG exported locally. Export study JSON too to preserve the settings.';
  }));
  element<HTMLInputElement>('import-study').addEventListener('change', event => act(async () => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0]; input.value = '';
    if (!file) return;
    if (file.size > 64000) throw new Error('Study JSON must be smaller than 64 KB.');
    const study = parseStudy(JSON.parse(await file.text()));
    if (study.font !== makeStudy(host.getStyle(), host.getSource()).font) {
      throw new Error('Unsupported font/version in study. This lab uses UrsaFont / textmode.js 0.18.0.');
    }
    host.setStyle(study.style);
    message.textContent = await host.restore(study);
  }));
}
