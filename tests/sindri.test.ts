import test from 'node:test';
import assert from 'node:assert/strict';
import { forgeLooks, quantize, strikeAt } from '../src/sindri-presets';

test('forge collection has exactly twenty reproducible unique directions and seven treatments', () => {
  assert.equal(forgeLooks.length,20);
  assert.equal(new Set(forgeLooks.map(l=>l.id)).size,20);
  assert.equal(new Set(forgeLooks.map(l=>l.family)).size,7);
  for(const look of forgeLooks){
    assert.match(look.id,/^[a-z]+(?:-[a-z]+)*$/);
    assert.equal(look.colors.length,4);
    for(const color of look.colors) assert.match(color,/^#[0-9a-f]{6}$/i);
    assert.ok(look.cell>=2&&look.cell<=9);
    assert.ok(look.note.length>30);
  }
});
test('quantization is bounded and deterministic',()=>{
  for(let y=0;y<8;y++)for(let x=0;x<8;x++)for(const v of [-1,0,.1,.5,.9,1,2]){
    const q=quantize(v,x,y,true);assert.ok(q>=0&&q<=3);assert.equal(q,quantize(v,x,y,true));
  }
  assert.equal(quantize(0,0,0,false),0);assert.equal(quantize(1,0,0,false),3);
});
test('hammer lifts, falls to contact, and emits one decaying impact per cycle',()=>{
  assert.ok(Math.abs(strikeAt(1.8).swing+.65)<1e-8);
  assert.ok(Math.abs(strikeAt(2.16).swing-1.6)<1e-8);
  assert.equal(strikeAt(2).impact,0);
  assert.ok(strikeAt(2.17).impact>.9);
  assert.ok(strikeAt(2.6).impact<.1);
  for(const t of [.2,1.1,2.4,3.7])assert.ok(Math.abs(strikeAt(t).swing-strikeAt(t+3.8).swing)<1e-9);
});
