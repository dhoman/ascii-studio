import { renderForge, forgeLooks } from './sindri-renderer';
import './sindri.css';

const app = document.querySelector<HTMLElement>('#app')!;
app.innerHTML = `
<header class="masthead"><a href="/" class="brand"><span class="brand-mark">✳</span> ASCII STUDIO <span class="brand-muted">/ EXPLORATIONS</span></a><nav><a href="/">Media lab ↗</a><span class="edition">STUDY 002 · SindriSelect</span></nav></header>
<main>
<section class="intro"><div><p class="eyebrow">THE FORGE / A HERO EXPLORATION</p><h1>Twenty ways to<br>strike a spark<span>.</span></h1></div><div class="intro-note"><p>One dwarf. One hammer.<br>Twenty different atmospheres.</p><p class="muted">A collection of animated, code-drawn hero studies. Pick a treatment, watch it move, and keep the ones worth forging further.</p><a href="#directions">Explore all 20 directions ↓</a></div></section>
<section class="preview-shell" aria-label="Selected hero preview">
<div class="preview-top"><span><i class="live-dot"></i> <span id="play-state">LIVE PREVIEW</span></span><span id="look-index"></span><span>ORIGINAL PROCEDURAL ART</span></div>
<div class="hero" id="hero"><div class="hero-copy"><p class="hero-kicker">SindriSelect / MASTER OF THE FORGE</p><h2>The right pro<br>for the <em>job.</em></h2><p>From the heart of the mountain,<br>something extraordinary takes shape.</p><a href="#directions" class="hero-cta">Enter the forge <span>↗</span></a></div><canvas id="forge" width="960" height="810" aria-label="Animated Sindri with his hammer at the forge"></canvas><span class="hero-coordinate">N 64°08′ / THE NINE REALMS</span><span class="hero-caption">EVERY GREAT CREATION BEGINS WITH A SPARK.</span></div>
<div class="preview-bottom"><div class="selected-title"><span id="look-number"></span><div><h3 id="look-name"></h3><p id="look-note"></p></div></div><div class="look-nav"><button id="prev" aria-label="Previous direction">←</button><button id="next" aria-label="Next direction">→</button></div></div>
</section>
<div class="transport"><div><button id="pause">Pause motion</button><button id="strike">Watch a strike ↗</button><label class="speed">Pace <select id="speed" aria-label="Animation speed"><option value="0.5">Slow</option><option value="1" selected>Normal</option><option value="1.5">Fast</option></select></label></div><div><label class="copy-toggle"><input id="copy" type="checkbox" checked> Hero copy</label><button id="save">Save frame ↓</button><button id="study">Save study ↓</button></div></div>
<section id="directions" class="directions"><div class="section-heading"><div><p class="eyebrow">THE CONTACT SHEET</p><h2>Choose your alchemy.</h2></div><div class="filters" role="group" aria-label="Filter directions"><button class="active" data-filter="all">All <span>20</span></button><button data-filter="ascii">ASCII</button><button data-filter="dither">Dither</button><button data-filter="pixel">Pixel</button><button data-filter="other">Other</button><button data-filter="saved">Shortlist <span id="saved-count">0</span></button></div></div><p class="gallery-help">Select a card to see it in motion. ☆ keeps a direction on your shortlist. All thumbnails share the same frame.</p><div class="card-grid" id="cards"></div><p id="empty" hidden>No directions shortlisted yet. Use ☆ on a card to keep it here.</p></section>
<footer><span>ASCII STUDIO / SindriSelect FORGE STUDIES</span><p>Authored illustration · deterministic motion · no external assets<br>Visual prototypes, not a final character model. Arrow keys browse; Space pauses.</p><a href="/">Back to the media lab ↗</a></footer>
</main><div id="notice" role="status" aria-live="polite"></div>`;

function el<T extends HTMLElement = HTMLElement>(id: string) { return document.getElementById(id) as T; }
const canvas=el<HTMLCanvasElement>('forge');
let selected=Math.max(0,forgeLooks.findIndex(l=>l.id===location.hash.slice(1)));
let time=0, playing=!matchMedia('(prefers-reduced-motion: reduce)').matches, speed=1, last=0, lastDraw=0;
let saved = new Set<string>();
try { const data:unknown=JSON.parse(localStorage.getItem('sindri-shortlist')??'[]'); if(Array.isArray(data)) saved=new Set(data.filter((v):v is string=>typeof v==='string'&&forgeLooks.some(l=>l.id===v))); } catch { /* Private storage may be unavailable. */ }
let filter='all';
const cards=el('cards');
for(const [i,look] of forgeLooks.entries()) {
  const card=document.createElement('article');card.className='look-card';card.dataset.id=look.id;card.dataset.family=look.family;
  card.innerHTML=`<button class="card-select" aria-label="Preview ${look.name}" aria-pressed="false"><div class="card-image"><canvas width="384" height="324" aria-label="${look.name} thumbnail"></canvas><span class="card-num">${String(i+1).padStart(2,'0')}</span><span class="card-view">VIEW IN MOTION ↗</span></div><div class="card-info"><h3>${look.name}</h3><span>${look.family}</span></div></button><button class="star" aria-label="Shortlist ${look.name}" aria-pressed="false">☆</button><p>${look.note}</p>`;
  card.querySelector('.card-select')!.addEventListener('click',()=>{select(i);el('hero').scrollIntoView({behavior:'smooth',block:'center'});});
  card.querySelector('.star')!.addEventListener('click',()=>{ saved.has(look.id)?saved.delete(look.id):saved.add(look.id);try{localStorage.setItem('sindri-shortlist',JSON.stringify([...saved]));}catch{/* Optional storage. */} updateCards(); });
  cards.append(card);
  renderForge(card.querySelector('canvas')!,look,2.42,1.6);
}
function updateCards() {
  for(const card of cards.querySelectorAll<HTMLElement>('.look-card')) {
    const id=card.dataset.id!, family=card.dataset.family!;
    card.hidden=!(filter==='all'||(filter==='saved'?saved.has(id):filter==='other'?!['ascii','dither','pixel'].includes(family):filter===family));
    card.classList.toggle('selected',id===forgeLooks[selected].id);
    card.querySelector('.card-select')!.setAttribute('aria-pressed',String(id===forgeLooks[selected].id));
    const star=card.querySelector<HTMLButtonElement>('.star')!;star.textContent=saved.has(id)?'★':'☆';star.setAttribute('aria-pressed',String(saved.has(id)));
  }
  el('saved-count').textContent=String(saved.size); el('empty').hidden=filter!=='saved'||saved.size>0;
}
function paint(){renderForge(canvas,forgeLooks[selected],time);canvas.dataset.frame=time.toFixed(3);}
function select(index:number) {
  selected=(index+forgeLooks.length)%forgeLooks.length;
  const look=forgeLooks[selected];
  el('hero').style.setProperty('--scene-bg',look.colors[0]);
  el('hero').style.setProperty('--scene-ink',look.colors[3]);
  el('hero').style.setProperty('--scene-mid',look.colors[2]);
  el('look-name').textContent=look.name;el('look-note').textContent=look.note;
  el('look-number').textContent=String(selected+1).padStart(2,'0');el('look-index').textContent=`${String(selected+1).padStart(2,'0')} / 20 — ${look.family.toUpperCase()}`;
  history.replaceState(null,'',`#${look.id}`);updateCards();paint();
}
function setPlaying(value:boolean){playing=value;el('pause').textContent=playing?'Pause motion':'Play motion';el('play-state').textContent=playing?'LIVE PREVIEW':'PAUSED FRAME';document.querySelector('.live-dot')!.classList.toggle('paused',!playing);}
el('pause').onclick=()=>setPlaying(!playing);
el('strike').onclick=()=>{time=1.7;setPlaying(true);paint();};
el('prev').onclick=()=>select(selected-1);el('next').onclick=()=>select(selected+1);
el<HTMLSelectElement>('speed').onchange=e=>{speed=Number((e.target as HTMLSelectElement).value);};
el<HTMLInputElement>('copy').onchange=e=>{el('hero').classList.toggle('no-copy',!(e.target as HTMLInputElement).checked);};
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-filter]')) button.onclick=()=>{filter=button.dataset.filter!;document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b===button));updateCards();};
function download(url:string,name:string){const a=document.createElement('a');a.href=url;a.download=name;a.click();}
el('save').onclick=()=>{setPlaying(false);paint();download(canvas.toDataURL('image/png'),`sindri-${forgeLooks[selected].id}-${time.toFixed(2)}.png`);el('notice').textContent='Saved artwork frame (without website copy).';};
el('study').onclick=()=>{setPlaying(false);const blob=new Blob([JSON.stringify({version:1,source:'authored-sindri-forge-v1',renderer:'canvas-2d-v1',font:'ui-monospace, monospace (host-dependent)',canvas:{width:canvas.width,height:canvas.height},seed:0,time,speed,look:forgeLooks[selected]},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);download(url,`sindri-${forgeLooks[selected].id}.json`);setTimeout(()=>URL.revokeObjectURL(url),1000);};
document.addEventListener('keydown',e=>{if((e.target as HTMLElement).matches('input,select,button,a'))return;if(e.code==='Space'){e.preventDefault();setPlaying(!playing);}else if(e.key==='ArrowRight')select(selected+1);else if(e.key==='ArrowLeft')select(selected-1);});
window.addEventListener('hashchange',()=>{const i=forgeLooks.findIndex(l=>l.id===location.hash.slice(1));if(i>=0)select(i);});
function tick(now:number){const dt=last?Math.min(.06,(now-last)/1000):0;last=now;if(playing&&!document.hidden){time+=dt*speed;if(now-lastDraw>1000/24){paint();lastDraw=now;}}requestAnimationFrame(tick);}
select(selected);setPlaying(playing);requestAnimationFrame(tick);
