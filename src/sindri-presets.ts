export type Treatment = 'dither' | 'pixel' | 'ascii' | 'edge' | 'halftone' | 'etch' | 'embers';
export interface ForgeLook {
  id: string; name: string; family: Treatment; note: string;
  colors: [string, string, string, string]; cell: number; motion: string; atmosphere: number;
}
export const forgeLooks: ForgeLook[] = [
  { id: 'coal-and-gold', name: 'Coal & gold', family: 'dither', note: 'The starting point. Ordered grain, white-hot steel, a slow shower of gold.', colors: ['#0b1011','#333f3d','#9d7950','#ffdb91'], cell: 3, motion: 'sparks', atmosphere: .65 },
  { id: 'terminal-smith', name: 'Terminal smith', family: 'ascii', note: 'A living character portrait. Dense glyphs hold the beard; sparks break the grid.', colors: ['#080f0c','#164c35','#4b9b65','#b4f4a3'], cell: 7, motion: 'runes', atmosphere: .25 },
  { id: 'copper-age', name: 'Copper age', family: 'pixel', note: 'Chunky copper planes. An arcade-sized blacksmith with a proper hammer swing.', colors: ['#160d10','#542b2b','#bc6845','#ffce88'], cell: 5, motion: 'sparks', atmosphere: .45 },
  { id: 'moon-forge', name: 'Moon forge', family: 'dither', note: 'Cold steel and blue fire. More quiet myth than hot workshop.', colors: ['#080d1b','#24364c','#608eae','#d0f3ff'], cell: 2, motion: 'snow', atmosphere: .8 },
  { id: 'rune-engine', name: 'Rune engine', family: 'ascii', note: 'Electric violet glyphs and orbiting runes. A more magical machine.', colors: ['#100c1b','#482b6e','#a76cee','#f4ccff'], cell: 6, motion: 'orbit', atmosphere: .6 },
  { id: 'woodcut', name: 'Woodcut', family: 'etch', note: 'Paper, ink, and diagonal cuts. An illustrated alternative to the computer look.', colors: ['#e5d8b7','#b3a481','#5c5545','#282c28'], cell: 3, motion: 'sparks', atmosphere: .15 },
  { id: 'white-hot', name: 'White hot', family: 'halftone', note: 'A bright editorial field with hard ink dots and a blacksmith in silhouette.', colors: ['#efe9da','#b7aa93','#686252','#282e2b'], cell: 5, motion: 'sparks', atmosphere: .1 },
  { id: 'ember-body', name: 'Ember body', family: 'embers', note: 'The smith almost dissolves into sparks. Atmospheric, deliberately less literal.', colors: ['#110c0a','#5b251a','#c96230','#ffe2a0'], cell: 4, motion: 'rise', atmosphere: 1 },
  { id: 'blueprint', name: 'Blueprint', family: 'edge', note: 'Only contours survive. An architectural drawing that comes alive at impact.', colors: ['#081725','#22455b','#5089a4','#a4e8e2'], cell: 2, motion: 'runes', atmosphere: .25 },
  { id: 'red-room', name: 'Red room', family: 'dither', note: 'A brutal two-tone crimson forge. High tension, low detail.', colors: ['#12080b','#3b1018','#a92b38','#ff6f62'], cell: 4, motion: 'sparks', atmosphere: .85 },
  { id: 'game-boy', name: 'Pocket forge', family: 'pixel', note: 'Four olive inks and big pixels. Friendly handheld-game nostalgia.', colors: ['#182e29','#3c5842','#83965b','#d8df9d'], cell: 7, motion: 'sparks', atmosphere: .15 },
  { id: 'silver-script', name: 'Silver script', family: 'ascii', note: 'Fine silver type on charcoal. Restrained enough to sit behind a real headline.', colors: ['#0d1015','#373d45','#7b8993','#e0e6e4'], cell: 5, motion: 'snow', atmosphere: .3 },
  { id: 'solar-flare', name: 'Solar flare', family: 'halftone', note: 'A sun-bright strike with expanding impact rings. Dot-screen rather than pixels.', colors: ['#1a1015','#753c3d','#dd8560','#ffe9b5'], cell: 4, motion: 'rings', atmosphere: .9 },
  { id: 'ghost-smith', name: 'Ghost smith', family: 'edge', note: 'A spectral outline, drifting ash, and very little visual weight.', colors: ['#091515','#19413f','#498d7a','#c7f8cf'], cell: 3, motion: 'snow', atmosphere: .65 },
  { id: 'brass-terminal', name: 'Brass terminal', family: 'ascii', note: 'Large amber characters with falling rune trails. Deliberately more graphic.', colors: ['#130f09','#5a3d1e','#b98237','#ffe0a2'], cell: 9, motion: 'runes', atmosphere: .6 },
  { id: 'cobalt-crush', name: 'Cobalt crush', family: 'pixel', note: 'Saturated blue blocks and a peach-white strike. A punchy digital poster.', colors: ['#0b1030','#283aa0','#586ee0','#ffc6a2'], cell: 4, motion: 'rings', atmosphere: .5 },
  { id: 'newsprint', name: 'Newsprint', family: 'halftone', note: 'Oversized dot clusters on warm stock. Rough, tactile, and intentionally imperfect.', colors: ['#dcd6c6','#aaa18b','#615b4c','#222d2b'], cell: 7, motion: 'snow', atmosphere: .2 },
  { id: 'interference', name: 'Interference', family: 'ascii', note: 'Magenta signal breaks and a glitching glyph field. The loudest digital direction.', colors: ['#110c1c','#44335f','#cb669b','#b9fff2'], cell: 6, motion: 'glitch', atmosphere: .6 },
  { id: 'obsidian', name: 'Obsidian', family: 'etch', note: 'Black volcanic glass, sparse gold hatching, and one concentrated point of heat.', colors: ['#090b0d','#262d31','#6d6c59','#e6cb87'], cell: 3, motion: 'orbit', atmosphere: .45 },
  { id: 'bifrost', name: 'Bifröst', family: 'dither', note: 'Teal shadows, lavender metal, and an orbit of fragments. A softer fantasy finish.', colors: ['#0c1520','#28585c','#9c88b5','#f7d9c4'], cell: 3, motion: 'orbit', atmosphere: .75 },
];
export const BAYER = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
export function quantize(value: number, x: number, y: number, dither: boolean): number {
  const bias = dither ? (BAYER[(y & 3) * 4 + (x & 3)] / 16 - .5) * .38 : 0;
  return Math.min(3, Math.max(0, Math.round((value + bias) * 3)));
}
export function strikeAt(time: number): { swing: number; impact: number; phase: number } {
  const phase = ((time % 3.8) + 3.8) % 3.8;
  const swing = phase < 1.8 ? 1.6 - 2.25 * Math.sin(phase / 1.8 * Math.PI / 2) : phase < 2.16 ? -.65 + 2.25 * ((phase - 1.8) / .36) ** 3 : 1.6 + .025 * Math.sin((phase - 2.16) * 22) * Math.exp(-(phase - 2.16) * 5);
  return { swing, impact: Math.exp(-Math.max(0, phase - 2.16) * 7) * (phase >= 2.16 ? 1 : 0), phase };
}
