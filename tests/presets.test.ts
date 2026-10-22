import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultStyle, parseStyle, makeStudy, parseStudy, saveStyle, readStyles } from '../src/presets.ts';

const storageKey = 'ascii-studio.styles.v1';
function memoryStorage(initial: string | null = null): Pick<Storage, 'getItem' | 'setItem'> {
  const values = new Map<string, string>(initial === null ? [] : [[storageKey, initial]]);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
  };
}

test('named styles persist, trim names, replace existing names and retain other presets', () => {
  const storage = memoryStorage();
  assert.deepEqual(Object.keys(readStyles(storage)), []);
  saveStyle(storage, '  First  ', defaultStyle);
  saveStyle(storage, 'Second', { ...defaultStyle, gamma: 2, color: 'sampled' });
  saveStyle(storage, 'First', { ...defaultStyle, columns: 120 });
  const saved = readStyles(storage);
  assert.deepEqual(Object.keys(saved), ['First', 'Second']);
  assert.deepEqual(saved.First, { ...defaultStyle, columns: 120 });
  assert.equal(saved.Second.gamma, 2);
  assert.equal(saved.Second.color, 'sampled');
  assert.deepEqual(JSON.parse(storage.getItem(storageKey)!), { ...saved });
  saved.First.ramp = '@';
  assert.equal(readStyles(storage).First.ramp, defaultStyle.ramp);
});

test('persistence validates names and styles and refuses to overwrite corrupt storage', () => {
  for (const name of ['', '   ', 'x'.repeat(81)]) {
    const storage = memoryStorage();
    assert.throws(() => saveStyle(storage, name, defaultStyle), Error);
    assert.equal(storage.getItem(storageKey), null);
  }
  const storage = memoryStorage();
  assert.throws(() => saveStyle(storage, 'bad', { ...defaultStyle, ramp: '' }));
  assert.equal(storage.getItem(storageKey), null);
  saveStyle(storage, 'x'.repeat(80), defaultStyle);
  for (const raw of ['', '{', 'null', '[]', '42', JSON.stringify({ bad: {} }), JSON.stringify({ '': defaultStyle }), JSON.stringify({ ' spaced ': defaultStyle }), JSON.stringify({ ['x'.repeat(81)]: defaultStyle })]) {
    const corrupt = memoryStorage(raw);
    assert.throws(() => readStyles(corrupt), Error, raw);
    assert.throws(() => saveStyle(corrupt, 'valid', defaultStyle), Error, raw);
    assert.equal(corrupt.getItem(storageKey), raw);
  }
});

test('storage errors propagate to callers', () => {
  const denied = new Error('Storage denied');
  const unreadable = { getItem: (): string | null => { throw denied; }, setItem: () => {} };
  assert.throws(() => readStyles(unreadable), (error) => error === denied);
  assert.throws(() => saveStyle(unreadable, 'style', defaultStyle), (error) => error === denied);
  const full = { getItem: () => null, setItem: () => { throw denied; } };
  assert.throws(() => saveStyle(full, 'style', defaultStyle), (error) => error === denied);
});

test('prototype-like preset names remain own data without changing any prototypes', () => {
  const storage = memoryStorage();
  for (const name of ['__proto__', 'constructor', 'prototype', 'toString']) saveStyle(storage, name, defaultStyle);
  const saved = readStyles(storage);
  assert.equal(Object.getPrototypeOf(saved), null);
  for (const name of ['__proto__', 'constructor', 'prototype', 'toString']) {
    assert.ok(Object.hasOwn(saved, name));
    assert.deepEqual(saved[name], defaultStyle);
  }
  assert.equal(Object.hasOwn(Object.prototype, 'columns'), false);
  assert.equal(Object.getPrototypeOf(readStyles(memoryStorage())), null);
});

test('default style parses without changing ramp spaces or sharing the input', () => {
  assert.deepEqual(defaultStyle, {
    columns: 96, contrast: 1, gamma: 1, ramp: ' .:-=+*#%@', color: 'mono',
  });
  const parsed = parseStyle(defaultStyle);
  assert.deepEqual(parsed, defaultStyle);
  assert.notEqual(parsed, defaultStyle);
});

test('studies preserve all reproducibility metadata across JSON without retaining mutable inputs', () => {
  for (const kind of ['image', 'video', 'webcam'] as const) {
    const source = { kind, name: ' local source.mp4 ', time: 12.345 };
    const study = makeStudy(defaultStyle, source);
    assert.deepEqual(study, {
      version: 1, style: defaultStyle, source,
      font: 'UrsaFont / textmode.js 0.18.0', seed: 0,
    });
    assert.notEqual(study.style, defaultStyle);
    assert.notEqual(study.source, source);
    const restored = parseStudy(JSON.parse(JSON.stringify(study)));
    assert.deepEqual(restored, study);
    assert.notEqual(parseStudy(study).source, study.source);
  }
});

test('study schema rejects invalid metadata and validates source fields when making studies', () => {
  const study = makeStudy(defaultStyle, { kind: 'image', name: 'image.jpg', time: 0 });
  const invalid: unknown[] = [null, [], {}, { ...study, extra: 1 }];
  for (const [key, values] of Object.entries({
    version: [0, 2, '1'], seed: [1, '0'], font: ['', null, 42],
    style: [{ ...defaultStyle, gamma: 0 }], source: [null, {}],
  })) {
    for (const value of values) invalid.push({ ...study, [key]: value });
    const missing = { ...study } as Record<string, unknown>;
    delete missing[key];
    invalid.push(missing);
  }
  for (const [key, values] of Object.entries({
    kind: ['file', null], name: ['', '   ', 'x'.repeat(513), null],
    time: [-1, NaN, Infinity, '0'],
  })) {
    for (const value of values) {
      const source = { ...study.source, [key]: value };
      invalid.push({ ...study, source });
      assert.throws(() => makeStudy(defaultStyle, source), Error);
    }
    const source = { ...study.source } as Record<string, unknown>;
    delete source[key];
    invalid.push({ ...study, source });
  }
  invalid.push({ ...study, source: { ...study.source, extra: true } });
  for (const value of invalid) assert.throws(() => parseStudy(value), Error);
  assert.throws(() => makeStudy({ ...defaultStyle, columns: 1 }, study.source));
  const custom = { ...study, font: 'Historical custom atlas', source: { ...study.source, name: 'x'.repeat(512) } };
  assert.deepEqual(parseStudy(custom), custom);
});

test('style validation enforces exact fields, numeric bounds, ASCII ramps and color enums', () => {
  const invalid: unknown[] = [null, [], 3, 'style', {}, { ...defaultStyle, extra: true }];
  for (const [key, values] of Object.entries({
    columns: [39, 241, 96.5, NaN, Infinity, '96', null],
    contrast: [0.24, 3.01, NaN, Infinity, '1'],
    gamma: [0.24, 3.01, NaN, Infinity, '1'],
    ramp: ['', '   ', '\t@', '\n@', '\x7f', '☀', '@'.repeat(97), null],
    color: ['rgb', '', null],
  })) {
    for (const value of values) invalid.push({ ...defaultStyle, [key]: value });
    const missing = { ...defaultStyle } as Record<string, unknown>;
    delete missing[key];
    invalid.push(missing);
  }
  invalid.push(Object.create(defaultStyle));
  for (const value of invalid) assert.throws(() => parseStyle(value), Error, JSON.stringify(value));
  for (const color of ['mono', 'sampled', 'limited'] as const) {
    for (const bound of [0.25, 3]) {
      const style = { columns: bound === 3 ? 240 : 40, contrast: bound, gamma: bound, ramp: ' @'.repeat(48), color };
      assert.deepEqual(parseStyle(style), style);
    }
  }
});
