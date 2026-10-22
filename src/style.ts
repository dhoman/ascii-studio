// Style math is independent of the source and of the character renderer.
export function contrastByte(value: number, contrast: number): number {
  return Math.round(Math.max(0, Math.min(255, (value - 128) * contrast + 128)));
}

export const ramps = { Classic: ' .:-=+*#%@', Sparse: ' .:+#', Binary: ' @' };
export function rampError(ramp: string): string {
  if (!ramp.trim()) return 'Use at least one visible character. Keeping the last valid ramp.';
  if (/[^\x20-\x7e]/.test(ramp)) return 'Use printable ASCII characters (spaces are allowed).';
  return '';
}
