import { forgeLooks, quantize, strikeAt, type ForgeLook } from './sindri-presets';
import { drawForge } from './sindri-scene';

const source = document.createElement('canvas'); source.width = 640; source.height = 540;
const scene = source.getContext('2d', { willReadFrequently: true })!;
const small = document.createElement('canvas');
const sample = small.getContext('2d', { willReadFrequently: true })!;
const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export function renderForge(canvas: HTMLCanvasElement, look: ForgeLook, time: number, detail = 1): void {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width, h = canvas.height;
  drawForge(scene, time);
  ctx.fillStyle = look.colors[0]; ctx.fillRect(0, 0, w, h);
  const cell = look.cell * detail;
  const cols = Math.round(640 / cell), rows = Math.round(540 / (look.family === 'ascii' ? cell * 1.35 : cell));
  if (small.width !== cols || small.height !== rows) { small.width = cols; small.height = rows; }
  sample.drawImage(source, 0, 0, cols, rows);
  const data = sample.getImageData(0, 0, cols, rows).data;
  const sx = w / cols, sy = h / rows;
  const ramp = ' .,:;+=xX$&#@';
  ctx.font = `${sy * 1.16}px ui-monospace, monospace`; ctx.textBaseline = 'top';
  const { impact, phase } = strikeAt(time);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const v = data[(y * cols + x) * 4] / 255;
    if (v < .035) continue;
    const edge = Math.abs(v - (data[(y * cols + Math.max(0, x-1)) * 4] / 255)) + Math.abs(v - (data[(Math.max(0,y-1) * cols + x) * 4] / 255));
    let level = quantize(v, x, y, look.family === 'dither' || look.family === 'etch');
    if (look.family === 'edge') level = edge > .09 ? Math.min(3, Math.ceil(edge * 6)) : 0;
    if (look.family === 'embers' && hash(x+y*cols) > v*.85) continue;
    if (!level && look.family !== 'ascii' && look.family !== 'halftone') continue;
    ctx.fillStyle = look.colors[level];
    let dx = x * sx;
    if (look.motion === 'glitch' && Math.sin(time*2+y*.7)>.94) dx += Math.sin(time*19)*w*.018;
    if (look.family === 'ascii') {
      if (v<.13) continue;
      ctx.fillStyle=look.colors[Math.max(1,level)];
      ctx.fillText(ramp[Math.min(ramp.length-1,Math.floor(v*(ramp.length-1)))],dx,y*sy);
    } else if (look.family === 'halftone' || look.family === 'embers') {
      ctx.fillStyle=look.colors[look.family==='halftone'?3:Math.max(1,level)];
      ctx.beginPath(); ctx.ellipse(dx+sx/2,y*sy+sy/2,sx*.56*v,sy*.56*v,0,0,Math.PI*2); ctx.fill();
    } else if (look.family === 'etch') {
      if (level<1) continue;
      ctx.strokeStyle=look.colors[level]; ctx.lineWidth=Math.max(1,sx*.4); ctx.beginPath(); ctx.moveTo(dx,y*sy+sy); ctx.lineTo(dx+sx,y*sy); ctx.stroke();
    } else ctx.fillRect(dx,y*sy,Math.ceil(sx),Math.ceil(sy));
  }
  // Deterministic procedural particle field. It freezes exactly with simulation time.
  ctx.save(); ctx.scale(w/640,h/540);
  const hot=look.colors[3], mid=look.colors[2];
  const originX=399, originY=315;
  for (let i=0;i<110;i++) {
    const r=hash(i+2), r2=hash(i+213), r3=hash(i+900);
    let x=0,y=0,alpha=.5,size=1+r*1.7;
    if (look.motion==='orbit') {
      const a=time*.35+r*Math.PI*2;
      x=315+Math.cos(a)*(130+r2*100); y=265+Math.sin(a)*(95+r2*80);
      alpha=.15+Math.pow((Math.sin(a)+1)/2,3)*.6;
    } else if (look.motion==='snow') {
      x=140+r*365+Math.sin(time*.3+r*20)*12; y=85+((r2*390+time*(8+r*15))%390); alpha=.15+r3*.45;
    } else if (look.motion==='runes') {
      x=155+r*330; y=80+((r2*360-time*(12+r3*8))%360+360)%360; alpha=.15+r2*.4;
    } else {
      const age=((time*(.27+r3*.15)+r)%1);
      x=originX+(r2-.5)*230*age+Math.sin(age*5+i)*9;
      y=originY-age*(170+r3*100)+age*age*60;
      alpha=(1-age)*(.25+look.atmosphere*.6); size*=1-age*.65;
      if (look.motion==='rise') { x=240+r2*180+Math.sin(time+r)*15; y=440-age*350; alpha*=.7; }
    }
    ctx.globalAlpha=alpha; ctx.fillStyle=i%3?hot:mid;
    if (look.motion==='runes') { ctx.font='11px monospace'; ctx.fillText(['ᚠ','ᚱ','ᛟ','ᛞ','+'][i%5],x,y); }
    else ctx.fillRect(Math.round(x),Math.round(y),size,size*(i%5===0?3:1));
  }
  // Strike burst: outward ballistic fragments, not random noise every frame.
  const age=phase-2.16;
  if(age>=0 && age<1.15) for(let i=0;i<65;i++) {
    const angle=-Math.PI*.9+hash(i+31)*Math.PI*.85;
    const speed=65+hash(i+55)*180;
    const x=originX+Math.cos(angle)*speed*age, y=originY+Math.sin(angle)*speed*age+75*age*age;
    ctx.globalAlpha=(1-age/1.15)*(.4+hash(i)*.6); ctx.strokeStyle=hot; ctx.lineWidth=1+hash(i+1)*1.5;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(angle)*5,y+Math.sin(angle)*5);ctx.stroke();
  }
  if(look.motion==='rings'&&age>=0&&age<1.2) {
    ctx.globalAlpha=(1-age/1.2)*.7;ctx.strokeStyle=hot;ctx.lineWidth=1;
    for(let n=0;n<3;n++){ctx.beginPath();ctx.ellipse(originX,originY,age*150+n*12,age*45+n*5,0,0,Math.PI*2);ctx.stroke();}
  }
  ctx.globalAlpha=impact*.8; ctx.fillStyle=hot; ctx.fillRect(384,313,33,3);
  ctx.restore(); ctx.globalAlpha=1;
}
export { forgeLooks };
