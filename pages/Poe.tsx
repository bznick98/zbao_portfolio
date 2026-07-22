import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';

const SWIPE_THRESHOLD = 80;
type Result = 'sacred' | 'laughing' | 'negative' | null;

const resultCopy: Record<Exclude<Result, null>, { name: string; detail: string }> = {
  sacred: { name: '聖杯 · Sacred yes', detail: 'Both crescent faces are revealed. The way is open.' },
  laughing: { name: '笑杯 · Laughing answer', detail: 'One face of each. Pause, reframe, and ask again.' },
  negative: { name: '陰杯 · Quiet no', detail: 'Both flat faces are revealed. Let this one rest for now.' },
};

export const Poe: React.FC = () => {
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const blocksRef = useRef<THREE.Mesh[]>([]);
  const worldRef = useRef<RAPIER.World | null>(null);
  const rigidBodiesRef = useRef<RAPIER.RigidBody[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const throwTimeoutRef = useRef<number | null>(null);
  const draggingRef = useRef<number | null>(null);
  const isThrowingRef = useRef(false);
  const resultRef = useRef<Result>(null);
  const settleStartRef = useRef<number | null>(null);
  const [isThrowing, setIsThrowing] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [throwCount, setThrowCount] = useState(0);
  const initialRotations = useMemo(() => [
    new THREE.Euler(-0.18, -0.22, 0.15), new THREE.Euler(-0.2, 0.28, -0.12),
  ], []);

  const setThrowing = (value: boolean) => {
    isThrowingRef.current = value;
    setIsThrowing(value);
  };

  useEffect(() => {
    const wrapper = canvasWrapperRef.current;
    if (!wrapper) return;
    let cancelled = false;
    let cleanup = () => {};

    const initScene = async () => {
      await RAPIER.init();
      if (cancelled) return;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#e7ded0');
      scene.fog = new THREE.Fog('#e7ded0', 13, 27);
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
      camera.position.set(0, 6.1, 10.7);
      camera.lookAt(0, 0, 0);
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      rendererRef.current = renderer;
      wrapper.appendChild(renderer.domElement);

      scene.add(new THREE.HemisphereLight('#fff8e9', '#7d6550', 2.3));
      const keyLight = new THREE.DirectionalLight('#fff1d4', 3.3);
      keyLight.position.set(-4, 8, 5);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(2048, 2048);
      keyLight.shadow.camera.left = -8; keyLight.shadow.camera.right = 8;
      keyLight.shadow.camera.top = 8; keyLight.shadow.camera.bottom = -8;
      keyLight.shadow.bias = -0.0004;
      scene.add(keyLight);
      const fillLight = new THREE.PointLight('#d48b5b', 14, 14, 2);
      fillLight.position.set(4, 3, 3);
      scene.add(fillLight);

      const makeWoodTexture = () => {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#8f5939'; ctx.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 1850; i += 1) {
          const y = Math.random() * 512;
          ctx.strokeStyle = `rgba(${65 + Math.random() * 55}, ${32 + Math.random() * 28}, 17, ${0.04 + Math.random() * 0.1})`;
          ctx.lineWidth = Math.random() * 1.7 + 0.35;
          ctx.beginPath(); ctx.moveTo(0, y);
          ctx.bezierCurveTo(120, y + (Math.random() - .5) * 14, 340, y + (Math.random() - .5) * 22, 512, y + (Math.random() - .5) * 9);
          ctx.stroke();
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2.4, 1.8);
        return texture;
      };
      const woodTexture = makeWoodTexture();

      const shape = new THREE.Shape();
      const r = 1.28;
      shape.absarc(0, 0.04, r, Math.PI, 0, false);
      shape.lineTo(r, -0.26); shape.lineTo(-r, -0.26); shape.closePath();
      const blockGeometry = new THREE.ExtrudeGeometry(shape, {
        depth: 0.62, bevelEnabled: true, bevelThickness: 0.075, bevelSize: 0.065, bevelSegments: 5, curveSegments: 48,
      });
      blockGeometry.center();
      blockGeometry.computeVertexNormals();
      const blockMaterial = new THREE.MeshPhysicalMaterial({
        color: '#211714', roughness: 0.3, metalness: 0.04, clearcoat: 0.18, clearcoatRoughness: 0.44,
      });
      const faceGeometry = new THREE.ShapeGeometry(shape, 48);
      const faceMaterial = new THREE.MeshPhysicalMaterial({
        color: '#a83428', roughness: 0.36, clearcoat: 0.35, clearcoatRoughness: 0.4,
      });
      const blocks = [-1.5, 1.5].map((x, index) => {
        const block = new THREE.Mesh(blockGeometry, blockMaterial);
        const face = new THREE.Mesh(faceGeometry, faceMaterial);
        face.position.z = 0.313;
        face.castShadow = true;
        block.add(face);
        block.position.set(x, 0.05, 0);
        block.rotation.copy(initialRotations[index]);
        block.castShadow = true; block.receiveShadow = true;
        scene.add(block);
        return block;
      });
      blocksRef.current = blocks;

      const table = new THREE.Mesh(
        new THREE.BoxGeometry(15, 0.36, 9, 10, 1, 8),
        new THREE.MeshStandardMaterial({ map: woodTexture, roughness: 0.56, metalness: 0.02 })
      );
      table.position.y = -0.78; table.receiveShadow = true; table.castShadow = true;
      scene.add(table);
      const edge = new THREE.Mesh(new THREE.BoxGeometry(15.22, 0.19, 0.2), new THREE.MeshStandardMaterial({ color: '#56301e', roughness: .5 }));
      edge.position.set(0, -0.69, -4.5); edge.castShadow = true; scene.add(edge);

      const backWall = new THREE.Mesh(new THREE.PlaneGeometry(28, 14), new THREE.MeshStandardMaterial({ color: '#d8cec0', roughness: 1 }));
      backWall.position.set(0, 5.5, -5.5); scene.add(backWall);

      const world = new RAPIER.World(new RAPIER.Vector3(0, -14, 0));
      worldRef.current = world;
      const tableBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.78, 0));
      world.createCollider(RAPIER.ColliderDesc.cuboid(7.5, .18, 4.5).setFriction(.82).setRestitution(.16), tableBody);
      const vertices = new Float32Array(blockGeometry.getAttribute('position').array);
      const hull = RAPIER.ColliderDesc.convexHull(vertices) ?? RAPIER.ColliderDesc.capsule(.5, .9);
      rigidBodiesRef.current = blocks.map((block) => {
        const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(block.position.x, block.position.y, block.position.z).setLinearDamping(.28).setAngularDamping(.38));
        world.createCollider(hull.setFriction(.68).setRestitution(.18), body);
        return body;
      });

      const resize = () => {
        const width = wrapper.clientWidth; const height = wrapper.clientHeight;
        renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix();
      };
      resize(); window.addEventListener('resize', resize);
      let last = performance.now();
      const animate = (now: number) => {
        const delta = Math.min(.033, (now - last) / 1000); last = now;
        world.timestep = delta; world.step();
        blocks.forEach((block, index) => {
          const body = rigidBodiesRef.current[index]; const p = body.translation(); const q = body.rotation();
          block.position.set(p.x, p.y, p.z); block.quaternion.set(q.x, q.y, q.z, q.w);
        });
        if (isThrowingRef.current && rigidBodiesRef.current.every((body) => {
          const v = body.linvel(); const a = body.angvel();
          return Math.hypot(v.x, v.y, v.z) < .12 && Math.hypot(a.x, a.y, a.z) < .18;
        })) {
          if (!settleStartRef.current) settleStartRef.current = now;
          if (now - settleStartRef.current > 450) finishThrow();
        } else settleStartRef.current = null;
        renderer.render(scene, camera); animationFrameRef.current = requestAnimationFrame(animate);
      };
      const finishThrow = () => {
        if (!isThrowingRef.current) return;
        const fronts = blocks.filter((block) => block.localToWorld(new THREE.Vector3(0, 0, 1)).y > block.position.y).length;
        const next: Result = fronts === 2 ? 'sacred' : fronts === 0 ? 'negative' : 'laughing';
        resultRef.current = next; setResult(next); setThrowing(false); settleStartRef.current = null;
      };
      animationFrameRef.current = requestAnimationFrame(animate);
      cleanup = () => {
        window.removeEventListener('resize', resize);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (throwTimeoutRef.current) window.clearTimeout(throwTimeoutRef.current);
        renderer.dispose(); blockGeometry.dispose(); faceGeometry.dispose(); blockMaterial.dispose(); faceMaterial.dispose(); woodTexture.dispose();
        if (renderer.domElement.parentElement === wrapper) wrapper.removeChild(renderer.domElement);
        worldRef.current = null; rigidBodiesRef.current = []; blocksRef.current = [];
      };
    };
    initScene();
    return () => { cancelled = true; cleanup(); };
  }, [initialRotations]);

  const triggerThrow = () => {
    if (isThrowingRef.current || !rigidBodiesRef.current.length) return;
    if (throwTimeoutRef.current) window.clearTimeout(throwTimeoutRef.current);
    resultRef.current = null; setResult(null); setThrowing(true); setThrowCount((count) => count + 1);
    rigidBodiesRef.current.forEach((body, index) => {
      const x = index === 0 ? -1.25 : 1.25;
      body.setTranslation({ x, y: .15, z: 0 }, true);
      body.setRotation(initialRotations[index], true);
      body.setLinvel({ x: (index ? 1 : -1) * (.65 + Math.random() * .55), y: 6.5 + Math.random() * 1.8, z: (Math.random() - .5) * 1.5 }, true);
      body.setAngvel({ x: (Math.random() - .5) * 10, y: (Math.random() - .5) * 8, z: (Math.random() - .5) * 9 }, true);
      body.wakeUp();
    });
    throwTimeoutRef.current = window.setTimeout(() => { if (isThrowingRef.current) setThrowing(false); }, 5500);
  };

  return (
    <div className="min-h-screen bg-[#f4efe6] px-4 py-20 text-[#211811] sm:px-8">
      <style>{`.poe-stage canvas { display:block; width:100%!important; height:100%!important; }`}</style>
      <main className="mx-auto grid min-h-[calc(100vh-10rem)] max-w-6xl items-center gap-8 lg:grid-cols-[.78fr_1.22fr] lg:gap-14">
        <section className="order-2 lg:order-1">
          <p className="mb-5 font-[Rubik] text-[10px] font-medium uppercase tracking-[.32em] text-[#7d3d25]">A small divination game · {String(throwCount).padStart(2, '0')} casts</p>
          <h1 className="max-w-md font-[Cormorant_Upright] text-6xl leading-[.82] sm:text-7xl">Ask, then<br /><em className="font-light">let it fall.</em></h1>
          <p className="mt-8 max-w-sm font-[Rubik] text-sm leading-7 text-[#5f5046]">Hold a question gently. Cast the two moon blocks and see what lands face-up.</p>
          <div className="mt-9 rounded-[1.5rem] border border-[#5e3422]/15 bg-white/50 p-5 backdrop-blur-sm">
            {result ? <><p className="font-[Rubik] text-[10px] font-semibold uppercase tracking-[.24em] text-[#9b2b22]">The answer</p><h2 className="mt-2 font-[Cormorant_Upright] text-3xl">{resultCopy[result].name}</h2><p className="mt-2 font-[Rubik] text-xs leading-5 text-[#65554a]">{resultCopy[result].detail}</p></> : <><p className="font-[Rubik] text-[10px] font-semibold uppercase tracking-[.24em] text-[#9b2b22]">Before you cast</p><p className="mt-2 font-[Cormorant_Upright] text-2xl leading-tight">Take one breath. Keep your question to yourself.</p></>}
          </div>
          <button type="button" onClick={triggerThrow} disabled={isThrowing} className="mt-7 inline-flex items-center gap-3 rounded-full bg-[#27170f] px-6 py-3.5 font-[Rubik] text-[11px] font-medium uppercase tracking-[.2em] text-white shadow-[0_12px_25px_rgba(62,31,16,.18)] transition hover:-translate-y-0.5 hover:bg-[#9b2b22] disabled:cursor-wait disabled:opacity-60">
            <span className="text-lg leading-none">{isThrowing ? '· · ·' : '✦'}</span>{isThrowing ? 'Listening' : result ? 'Cast again' : 'Cast the moon blocks'}
          </button>
        </section>
        <section className="order-1 lg:order-2">
          <div className="poe-stage relative h-[360px] overflow-hidden rounded-[2rem] border border-[#4e2919]/15 bg-[#e7ded0] shadow-[0_25px_60px_rgba(83,48,27,.18)] sm:h-[510px]" ref={canvasWrapperRef} onPointerDown={(event) => { draggingRef.current = event.clientX; }} onPointerMove={(event) => { if (draggingRef.current !== null && Math.abs(event.clientX - draggingRef.current) > SWIPE_THRESHOLD) { draggingRef.current = null; triggerThrow(); } }} onPointerUp={() => { draggingRef.current = null; }} onPointerLeave={() => { draggingRef.current = null; }}>
            <div className="pointer-events-none absolute left-5 top-5 z-10 rounded-full border border-white/50 bg-[#f8f1e5]/80 px-3 py-1.5 font-[Rubik] text-[9px] uppercase tracking-[.22em] text-[#684837]">Swipe to cast</div>
            <div className="pointer-events-none absolute bottom-5 right-5 z-10 font-[Rubik] text-[9px] uppercase tracking-[.18em] text-[#5c3a2a]/65">red · crescent / dark · flat</div>
          </div>
        </section>
      </main>
    </div>
  );
};
