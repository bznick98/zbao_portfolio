import test from 'node:test';
import assert from 'node:assert/strict';
import { createPoeGeometry, faceUp, initializePoePhysics, PoeSimulation, readFaces } from '../lib/poe-physics.ts';

await initializePoePhysics();
const seededRandom = (initial: number) => {
  let seed = initial;
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
};
const createSimulation = (seed: number) => {
  const geometry = createPoeGeometry();
  const simulation = new PoeSimulation(new Float32Array(geometry.getAttribute('position').array), seededRandom(seed));
  geometry.dispose();
  return simulation;
};

test('readings follow the actual upward faces and traditional mapping', () => {
  assert.equal(faceUp({ x: Math.SQRT1_2, y: 0, z: 0, w: Math.SQRT1_2 }), 'flat');
  assert.equal(faceUp({ x: -Math.SQRT1_2, y: 0, z: 0, w: Math.SQRT1_2 }), 'round');
  assert.equal(faceUp({ x: 0, y: 0, z: 0, w: 1 }), 'edge');
  assert.equal(readFaces(['flat', 'round']), 'yes');
  assert.equal(readFaces(['round', 'flat']), 'yes');
  assert.equal(readFaces(['round', 'round']), 'no');
  assert.equal(readFaces(['flat', 'flat']), 'again');
  assert.equal(readFaces(['edge', 'flat']), 'edge');
});

test('100 repeated casts settle on the tray with readings derived from their landed rotations', () => {
  const simulation = createSimulation(1);
  const counts = { yes: 0, no: 0, again: 0, edge: 0 };
  try {
    for (let cast = 0; cast < 100; cast++) {
      assert.equal(simulation.cast(cast % 5 / 4, cast % 3 - 1), true);
      assert.equal(simulation.cast(), false, 'A second cast cannot interrupt a throw');
      assert.equal(simulation.reading, null);
      for (let frame = 0; frame < 30; frame++) simulation.step(1 / 120);
      assert.equal(simulation.state, 'throwing', 'No reading while the blocks are airborne');
      const delta = [1 / 30, 1 / 60, 1 / 144][cast % 3];
      let elapsed = 0.25;
      while (simulation.state === 'throwing' && elapsed < 13) { simulation.step(delta); elapsed += delta; }
      assert.equal(simulation.state, 'settled', 'Cast ' + cast);
      assert.notEqual(simulation.reading, 'unsettled', 'Cast ' + cast);
      const faces = simulation.bodies.map(body => faceUp(body.rotation()));
      assert.deepEqual(simulation.faces, faces);
      assert.equal(simulation.reading, readFaces(faces));
      counts[simulation.reading as keyof typeof counts]++;
      for (const body of simulation.bodies) {
        const position = body.translation();
        assert.ok(Math.abs(position.x) < 5.4 && Math.abs(position.z) < 4.3 && position.y > 0 && position.y < 1.5);
        assert.ok(body.isSleeping());
      }
      const landed = simulation.bodies.map(body => body.rotation());
      for (let frame = 0; frame < 120; frame++) simulation.step(1 / 60);
      assert.deepEqual(simulation.bodies.map(body => body.rotation()), landed, 'Landed faces remain consistent with the reading');
    }
    assert.ok(counts.yes && counts.no && counts.again, 'All three readings are reachable');
    assert.ok(counts.edge <= 2, 'Clear face landings should be reliable');
  } finally { simulation.dispose(); }
});

test('fixed timesteps produce the same landing at 30 and 120 render frames per second', () => {
  const simulations = [createSimulation(123), createSimulation(123)];
  try {
    simulations.forEach((simulation, index) => {
      simulation.cast(0.6, 0.4);
      for (let elapsed = 0; simulation.state === 'throwing' && elapsed < 13; elapsed += 1 / [30, 120][index]) {
        simulation.step(1 / [30, 120][index]);
      }
      assert.equal(simulation.state, 'settled');
    });
    assert.deepEqual(simulations[0].faces, simulations[1].faces);
    assert.deepEqual(simulations[0].bodies.map(body => body.translation()), simulations[1].bodies.map(body => body.translation()));
  } finally { simulations.forEach(simulation => simulation.dispose()); }
});
