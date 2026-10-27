import test from 'node:test';
import assert from 'node:assert/strict';
import { armPoseAt, drawForge } from '../src/sindri-scene';

// Record the scene's actual arm transforms without requiring a browser canvas.
function armTransforms(time: number): number[][] {
  const translations: number[][] = [];
  const context = new Proxy({}, {
    get: (_, key) => key === 'translate' ? (...point: number[]) => translations.push(point)
      : key === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {},
    set: () => true,
  }) as CanvasRenderingContext2D;
  drawForge(context, time);
  return translations;
}

test('hammer arm originates at the outer tunic shoulder throughout the swing', () => {
  for (const time of [0, .6, 1.2, 1.8, 2, 2.16, 2.6, 3.7]) {
    const [shoulder] = armTransforms(time);
    assert.ok(shoulder[0] >= 330 && shoulder[0] <= 350 && shoulder[1] >= 232 && shoulder[1] <= 252,
      `time ${time}: arm rooted at ${shoulder}, expected the shoulder, not the face/neck`);
  }
});

test('ready grip holds the head above the fist instead of dwelling inverted', () => {
  for (const time of [0, .2, 3.3, 3.79]) {
    const pose = armPoseAt(time);
    const headDy=13*Math.sin(pose.hammerAngle)-79*Math.cos(pose.hammerAngle);
    assert.ok(headDy < -35, `time ${time}: ready hammer head must be above the fist`);
  }
  for (let frame=0;frame<=380;frame++) {
    const pose=armPoseAt(frame/100);
    assert.ok(pose.hammerAngle>=-.8&&pose.hammerAngle<=1.2, 'no upside-down wrist roll');
  }
});

test('connected arm preserves bone lengths and a continuous outward elbow through the cycle', () => {
  let previous = armPoseAt(0);
  for (let frame = 0; frame <= 3800; frame++) {
    const pose = armPoseAt(frame / 1000);
    const { shoulder, elbow, wrist } = pose;
    assert.deepEqual(shoulder, { x: 337, y: 245 });
    assert.ok(Math.abs(Math.hypot(elbow.x-shoulder.x, elbow.y-shoulder.y)-65)<1e-8);
    assert.ok(Math.abs(Math.hypot(wrist.x-elbow.x, wrist.y-elbow.y)-67)<1e-8);
    assert.ok(elbow.x > shoulder.x, 'elbow must stay outside the torso');
    assert.ok(Math.hypot(elbow.x-previous.elbow.x,elbow.y-previous.elbow.y)<2, 'elbow must not flip');
    previous = pose;
  }
  const contact = armPoseAt(2.16);
  const faceX=contact.wrist.x+contact.hammerScale*(22*Math.cos(contact.hammerAngle)+71*Math.sin(contact.hammerAngle));
  const faceY=contact.wrist.y+contact.hammerScale*(22*Math.sin(contact.hammerAngle)-71*Math.cos(contact.hammerAngle));
  assert.ok(Math.hypot(faceX-399,faceY-315)<2, 'hammer face must meet the hot billet');
});
