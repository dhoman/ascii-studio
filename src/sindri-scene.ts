import { strikeAt } from './sindri-presets';

export function armPoseAt(time: number) {
  const { phase } = strikeAt(time);
  const hammerScale = .7;
  const ready = { x: 443, y: 292, angle: .1 };
  const raised = { x: 426, y: 190, angle: -.55 };
  const loaded = { x: 424, y: 186, angle: -.7 };
  const contactAngle = 1.1;
  const contact = {
    x: 399 - hammerScale * (22 * Math.cos(contactAngle) + 71 * Math.sin(contactAngle)),
    y: 315 - hammerScale * (22 * Math.sin(contactAngle) - 71 * Math.cos(contactAngle)),
    angle: contactAngle,
  };
  const rebound = { x: contact.x + 9, y: contact.y - 14, angle: .86 };
  const ease = (t: number) => t * t * t * (10 + t * (-15 + 6 * t));
  const between = (a: typeof ready, b: typeof ready, t: number) => ({
    x: a.x + (b.x-a.x)*t, y: a.y + (b.y-a.y)*t, angle: a.angle + (b.angle-a.angle)*t,
  });
  // Key poses, not a full wrist revolution: ready, lift, load, blow, rebound, reset.
  const grip = phase < .28 ? ready
    : phase < 1.58 ? between(ready, raised, ease((phase-.28)/1.3))
    : phase < 1.8 ? between(raised, loaded, ease((phase-1.58)/.22))
    : phase < 2.16 ? between(loaded, contact, ((phase-1.8)/.36)**2)
    : phase < 2.38 ? between(contact, rebound, ease((phase-2.16)/.22))
    : phase < 3.18 ? between(rebound, ready, ease((phase-2.38)/.8)) : ready;
  const shoulder = { x: 337, y: 245 };
  const wrist = { x: grip.x, y: grip.y };
  const upperLength = 65, foreLength = 67;
  const dx = wrist.x - shoulder.x, dy = wrist.y - shoulder.y;
  const distance = Math.hypot(dx, dy);
  const along = (upperLength ** 2 - foreLength ** 2 + distance ** 2) / (2 * distance);
  const across = Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2));
  // One continuous elbow branch, outside the torso. Never flip the bend at contact.
  const elbow = {
    x: shoulder.x + along * dx / distance + across * dy / distance,
    y: shoulder.y + along * dy / distance - across * dx / distance,
  };
  return {
    shoulder, elbow, wrist, upperLength, foreLength,
    upperAngle: Math.atan2(elbow.y - shoulder.y, elbow.x - shoulder.x),
    foreAngle: Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x),
    hammerAngle: grip.angle, hammerScale,
  };
}

// Authored scene source. No post-process, UI, or scheduling lives here.
// Coordinates are stable so the same image can feed a future GPU character pass.
export function drawForge(ctx: CanvasRenderingContext2D, time: number): void {
  const { impact } = strikeAt(time);
  const arm = armPoseAt(time);
  ctx.clearRect(0, 0, 640, 540);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 640, 540);
  const poly = (p: number[], color: string) => {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
    ctx.closePath(); ctx.fill();
  };
  const line = (p: number[], color: string, width = 1) => {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
    ctx.stroke();
  };
  const ellipse = (x: number, y: number, rx: number, ry: number, color: string) => {
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  };
  // Receding forge arch, masonry, and a low bed of coals.
  line([118,390,118,158,148,95,223,52,379,52,468,100,500,160,500,390], '#242424', 14);
  line([139,372,139,164,168,112,230,76,373,76,445,116,476,172,476,372], '#101010', 6);
  for (let n = 0; n < 8; n++) {
    line([114,180+n*27,139,180+n*27], '#353535', 2);
    line([476,180+n*27,504,180+n*27], '#292929', 2);
  }
  line([207,66,216,84,205,97,215,109], '#555', 2);
  line([389,68,377,84,389,96,377,108], '#444', 2);
  ellipse(321,462,211,23,'#111');
  for (let n = 0; n < 40; n++) {
    const x = 165 + ((n * 67) % 300), y = 421 + ((n * 19) % 38);
    ellipse(x,y,2+(n%4),1, `rgb(${40+n%5*12},${40+n%5*12},${40+n%5*12})`);
  }
  // Broad squat boots and legs anchor the silhouette.
  poly([213,357,275,355,278,431,248,444,197,439,202,419], '#4b4b4b');
  poly([298,361,348,348,364,422,390,437,388,448,314,447], '#626262');
  poly([204,421,245,414,275,427,274,443,194,443], '#858585');
  poly([320,425,355,418,385,435,389,448,318,447], '#9c9c9c');
  line([206,432,265,433], '#c9c9c9', 3); line([325,437,381,438], '#ddd', 3);
  // Quilted tunic and blacksmith's leather apron.
  poly([219,232,285,212,345,227,365,308,346,386,298,408,222,389,203,320], '#676767');
  poly([228,245,283,228,322,244,341,381,300,397,230,380], '#929292');
  poly([229,268,252,255,255,374,231,375], '#535353');
  poly([267,255,318,250,335,375,280,390], '#a3a3a3');
  for (let n=0;n<6;n++) line([273+n*8,279,281+n*8,371], '#777', 1);
  poly([211,316,346,311,350,331,214,338], '#333');
  poly([276,314,303,312,305,335,278,336], '#ddd');
  poly([282,319,297,318,299,329,283,330], '#555');
  // Left arm: heavy shoulder plate, bracer, glove, tongs.
  poly([220,225,200,235,174,277,181,310,207,315,232,267], '#888');
  poly([204,226,224,229,232,252,190,266,181,257], '#b9b9b9');
  line([189,253,223,242], '#e2e2e2', 3);
  poly([179,285,203,287,223,328,201,341,181,321], '#555');
  poly([196,311,220,308,233,331,214,346,201,339], '#b4b4b4');
  line([220,334,340,349,390,339], '#d3d3d3', 3);
  line([220,340,339,356,391,341], '#777', 3);
  // Fixed shoulder, independently bending elbow, and a hand-locked hammer.
  ctx.save(); ctx.translate(arm.shoulder.x,arm.shoulder.y); ctx.rotate(arm.upperAngle);
  poly([-10,-14,24,-19,58,-13,73,-4,70,12,40,18,8,16], '#999');
  poly([5,-15,32,-17,58,-10,60,-2,26,3,4,7], '#c3c3c3');
  ctx.restore();
  ctx.save(); ctx.translate(arm.elbow.x,arm.elbow.y); ctx.rotate(arm.foreAngle);
  poly([-11,-10,18,-15,57,-11,71,-6,72,9,48,14,8,13,-12,6], '#727272');
  poly([23,-15,53,-13,58,12,27,15], '#a5a5a5');
  line([29,-13,33,14], '#ddd', 2);
  ctx.restore();
  ctx.save(); ctx.translate(arm.wrist.x,arm.wrist.y); ctx.rotate(arm.hammerAngle);
  ctx.scale(arm.hammerScale,arm.hammerScale);
  ctx.translate(-102,26);
  // Wooden handle and two-faced forged hammer, silhouette intentionally oversize.
  poly([97,5,106,4,119,-100,110,-101], '#aaa');
  line([102,-3,116,-95], '#e6e6e6', 2);
  poly([78,-125,132,-131,155,-117,150,-83,97,-77,76,-91], '#d1d1d1');
  poly([78,-125,97,-111,97,-77,76,-91], '#787878');
  poly([97,-111,155,-117,150,-83,97,-77], '#a5a5a5');
  poly([78,-125,132,-131,155,-117,97,-111], '#f3f3f3');
  line([121,-106,121,-89,132,-95,113,-98], '#fff', 2);
  ctx.restore();
  // This stationary cap visibly binds the upper arm into the tunic shoulder.
  poly([323,226,343,223,359,239,351,260,330,256,320,244], '#b9b9b9');
  poly([323,226,343,223,354,236,331,239,320,244], '#ddd');
  line([333,246,350,243], '#777', 2);
  // Hair behind the face. The cap is leather, not a horned fantasy helmet.
  poly([239,156,249,123,291,108,326,125,342,165,333,232,312,250,238,229,224,197], '#7e7e7e');
  poly([245,149,231,176,235,229,251,245,261,207], '#b6b6b6');
  poly([318,142,338,168,333,229,316,249,308,195], '#d2d2d2');
  // Face planes, brows, deep eye sockets, protruding nose.
  poly([259,145,299,139,320,158,316,201,295,221,260,201,249,175], '#aaa');
  poly([282,151,301,145,317,160,310,187,287,195], '#d8d8d8');
  poly([251,166,275,160,277,174,254,178], '#383838');
  poly([290,159,312,157,315,169,291,174], '#363636');
  line([259,172,269,171], '#fff', 2); line([295,168,305,167], '#fff', 2);
  poly([278,164,290,163,302,188,289,199,270,191], '#eee');
  poly([278,166,280,188,270,191,276,177], '#929292');
  // Long forked beard with carved locks and brass rings.
  poly([251,186,270,198,287,202,305,194,320,184,327,219,315,253,299,276,283,297,263,275,244,244,238,211], '#b4b4b4');
  poly([247,199,266,211,282,211,282,283,259,263,249,239], '#d0d0d0');
  poly([290,208,311,198,319,201,312,244,290,280,282,295], '#e4e4e4');
  poly([268,199,282,192,296,197,308,190,312,202,293,211,281,206,265,210,248,199,250,190], '#f1f1f1');
  for (let n=0;n<7;n++) {
    const x=248+n*10;
    line([x,214,x+3,235,x+((n<3)?13:-8),258], n%2?'#777':'#999', 2);
  }
  line([276,224,281,266,281,280], '#777', 2);
  poly([254,244,270,248,270,257,258,253], '#555');
  poly([299,245,313,235,311,245,300,255], '#666');
  // Cap and clasp; final highlight draws the face out of the busy beard.
  poly([242,150,245,126,266,108,299,106,321,121,324,146,286,138], '#5e5e5e');
  poly([245,130,267,112,299,111,315,123,283,124], '#aaa');
  poly([242,145,282,132,325,139,327,151,284,145,242,157], '#bababa');
  poly([279,132,293,132,298,144,285,153,276,146], '#e3e3e3');
  // Anvil is foreground: readable horn, hardy hole, waist, and stone base.
  poly([347,385,414,376,441,430,424,452,329,452,320,437], '#454545');
  poly([347,385,414,376,426,400,340,412], '#858585');
  poly([340,412,426,400,424,452,329,452], '#626262');
  line([349,418,368,425,357,448], '#333', 2);
  poly([350,345,407,342,394,380,408,393,341,399,355,377], '#929292');
  poly([315,321,415,312,458,321,481,328,442,340,407,345,315,345,299,337], '#bdbdbd');
  poly([315,321,415,312,458,321,406,331,299,337], '#f1f1f1');
  poly([315,337,406,331,442,330,407,345,315,345], '#777');
  poly([335,321,347,319,353,323,340,326], '#333');
  // Heated billet and a local impact bloom, still neutral in this source buffer.
  poly([371,316,408,313,418,318,380,323], '#fff');
  // The gripping hand sits in front of the anvil rim, not hidden behind it.
  ctx.save(); ctx.translate(arm.wrist.x,arm.wrist.y); ctx.rotate(arm.hammerAngle);
  poly([-11,-12,7,-14,15,-4,13,10,-6,13,-15,3], '#dedede');
  line([-7,-8,8,-7], '#888', 2);
  line([-8,-2,10,0], '#888', 2);
  ctx.restore();
  if (impact>.01) {
    const glow=ctx.createRadialGradient(399,315,0,399,315,110);
    glow.addColorStop(0,`rgba(255,255,255,${impact*.65})`); glow.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=glow; ctx.fillRect(289,205,220,220);
  }
}
