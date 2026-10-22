export type LabStyle = {
  columns: number;
  contrast: number;
  gamma: number;
  ramp: string;
  color: 'mono' | 'sampled' | 'limited';
};

export const defaultStyle: LabStyle = {
  columns: 96, contrast: 1, gamma: 1, ramp: ' .:-=+*#%@', color: 'mono',
};

export type Study = {
  version: 1;
  style: LabStyle;
  source: { kind: 'image' | 'video' | 'webcam'; name: string; time: number };
  font: string;
  seed: 0;
};

export function makeStudy(style: LabStyle, source: Study['source']): Study {
  return parseStudy({ version: 1, style, source, font: 'UrsaFont / textmode.js 0.18.0', seed: 0 });
}

export function parseStudy(value: unknown): Study {
  const study = exactObject(value, ['version', 'style', 'source', 'font', 'seed'], 'Study');
  if (study.version !== 1) throw new Error('Study version must be 1');
  if (study.seed !== 0) throw new Error('Study seed must be 0');
  if (typeof study.font !== 'string' || !study.font.trim()) throw new Error('Study font must be nonblank');
  const source = exactObject(study.source, ['kind', 'name', 'time'], 'Source');
  const { kind, name } = source;
  if (kind !== 'image' && kind !== 'video' && kind !== 'webcam') throw new Error('Invalid source kind');
  if (typeof name !== 'string' || !name.trim() || name.length > 512) {
    throw new Error('Source name must be nonblank and at most 512 characters');
  }
  const time = boundedNumber(source.time, 0, Number.MAX_VALUE, 'Source time');
  return { version: 1, style: parseStyle(study.style), source: { kind, name, time }, font: study.font, seed: 0 };
}

const storageKey = 'ascii-studio.styles.v1';

function presetName(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 80) {
    throw new Error('Preset name must be nonblank and at most 80 characters');
  }
  return value.trim();
}

export function readStyles(storage: Pick<Storage, 'getItem' | 'setItem'>): Record<string, LabStyle> {
  const raw = storage.getItem(storageKey);
  const styles: Record<string, LabStyle> = Object.create(null);
  if (raw === null) return styles;
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Stored styles must be an object');
  }
  for (const [name, style] of Object.entries(parsed)) {
    if (presetName(name) !== name) throw new Error('Stored preset names must be trimmed');
    styles[name] = parseStyle(style);
  }
  return styles;
}

export function saveStyle(storage: Pick<Storage, 'getItem' | 'setItem'>, name: string, style: LabStyle): void {
  const key = presetName(name);
  const validated = parseStyle(style);
  const styles = readStyles(storage);
  styles[key] = validated;
  storage.setItem(storageKey, JSON.stringify(styles));
}

function exactObject(value: unknown, fields: string[], label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  const keys = Reflect.ownKeys(value);
  if (keys.length !== fields.length || !fields.every((key) => Object.hasOwn(value, key))) {
    throw new Error(`${label} must contain exactly: ${fields.join(', ')}`);
  }
  return value as Record<string, unknown>;
}

function boundedNumber(value: unknown, min: number, max: number, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${label} must be a finite number from ${min} to ${max}`);
  }
  return value;
}

export function parseStyle(value: unknown): LabStyle {
  const style = exactObject(value, ['columns', 'contrast', 'gamma', 'ramp', 'color'], 'Style');
  const columns = boundedNumber(style.columns, 40, 240, 'Columns');
  if (!Number.isInteger(columns)) throw new Error('Columns must be an integer');
  const contrast = boundedNumber(style.contrast, 0.25, 3, 'Contrast');
  const gamma = boundedNumber(style.gamma, 0.25, 3, 'Gamma');
  const { ramp, color } = style;
  if (typeof ramp !== 'string' || ramp.length > 96 || !/^[\x20-\x7e]*$/.test(ramp) || !/[^ ]/.test(ramp)) {
    throw new Error('Ramp must contain visible printable ASCII and be at most 96 characters');
  }
  if (color !== 'mono' && color !== 'sampled' && color !== 'limited') {
    throw new Error('Color must be mono, sampled, or limited');
  }
  return { columns, contrast, gamma, ramp, color };
}
