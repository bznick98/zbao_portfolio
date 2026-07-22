import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';

const SWIPE_THRESHOLD = 80;
type Result = 'sacred' | 'laughing' | 'negative' | null;

const resultCopy: Record<Exclude<Result, null>, { name: string; detail: string }> = {
  sacred: { name: '聖杯', detail: 'Two crescent faces · yes' },
  laughing: { name: '笑杯', detail: 'One of each · wait' },
  negative: { name: '陰杯', detail: 'Two flat faces · no' },
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
  const finishThrowRef = useRef<() => void>(() => {});
  const settleStartRef = useRef<number | null>(null);
  const [isThrowing, setIsThrowing] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const initialRotation = useMemo(() => new THREE.Euler(-0.18, -0.22, 0.15), []);

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
      const block = new THREE.Mesh(blockGeometry, blockMaterial);
      const face = new THREE.Mesh(faceGeometry, faceMaterial);
      face.position.z = 0.313;
      face.castShadow = true;
      block.add(face);
      block.position.set(0, 0.05, 0);
      block.rotation.copy(initialRotation);
      block.castShadow = true; block.receiveShadow = true;
      scene.add(block);
      const blocks = [block];
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
      rigidBodiesRef.current = blocks.map((mesh) => {
        const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(mesh.position.x, mesh.position.y, mesh.position.z));
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
        rigidBodiesRef.current[0]?.setBodyType(RAPIER.RigidBodyType.Fixed, true);
        const outcomes: Exclude<Result, null>[] = ['sacred', 'laughing', 'negative'];
        setResult(outcomes[Math.floor(Math.random() * outcomes.length)]);
        setThrowing(false); settleStartRef.current = null;
      };
      finishThrowRef.current = finishThrow;
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
  }, [initialRotation]);

  const triggerThrow = () => {
    if (isThrowingRef.current || !rigidBodiesRef.current.length) return;
    if (throwTimeoutRef.current) window.clearTimeout(throwTimeoutRef.current);
    setResult(null); setThrowing(true);
    rigidBodiesRef.current.forEach((body) => {
      body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
      body.setTranslation({ x: 0, y: .15, z: 0 }, true);
      body.setRotation(initialRotation, true);
      body.setLinvel({ x: (Math.random() - .5) * 1.1, y: 7.4 + Math.random() * 1.4, z: (Math.random() - .5) * 1.5 }, true);
      body.setAngvel({ x: (Math.random() - .5) * 10, y: (Math.random() - .5) * 8, z: (Math.random() - .5) * 9 }, true);
      body.wakeUp();
    });
    throwTimeoutRef.current = window.setTimeout(() => finishThrowRef.current(), 5500);
  };

  return (
    <div className="min-h-screen bg-[#f4efe6] px-4 py-20 text-[#211811] sm:px-8">
      <style>{`.poe-stage canvas { display:block; width:100%!important; height:100%!important; }`}</style>
      <main className="mx-auto grid min-h-[calc(100vh-10rem)] max-w-6xl items-center gap-8 lg:grid-cols-[.72fr_1.28fr] lg:gap-14">
        <section className="order-2 lg:order-1">
          <div className="max-w-sm">
            {!result && <p className="font-[Cormorant_Upright] text-4xl leading-[.95] text-[#352016] sm:text-5xl">Take one breath.<br />Keep your question to yourself.</p>}
            {result && <div className="rounded-[1.5rem] border border-[#5e3422]/15 bg-white/40 p-6 backdrop-blur-sm"><p className="font-[Rubik] text-[10px] uppercase tracking-[.28em] text-[#8e4b30]">{resultCopy[result].name}</p><p className="mt-2 font-[Cormorant_Upright] text-3xl text-[#2a1810]">{resultCopy[result].detail}</p><div className="mt-6 grid grid-cols-3 gap-2 border-t border-[#5e3422]/10 pt-4 font-[Rubik] text-[9px] leading-4 text-[#715f52]"><span><b className="block text-base font-normal text-[#9d3329]">☽ ☽</b>聖杯 · yes</span><span><b className="block text-base font-normal text-[#9d3329]">☽ —</b>笑杯 · wait</span><span><b className="block text-base font-normal text-[#39241c]">— —</b>陰杯 · no</span></div></div>}
          </div>
          <button type="button" onClick={triggerThrow} disabled={isThrowing} aria-label="Cast the moon block" className="mt-8 inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#523323]/35 bg-[#27170f] text-lg text-[#f8ead8] shadow-[0_12px_25px_rgba(62,31,16,.18)] transition hover:-translate-y-0.5 hover:bg-[#9b2b22] disabled:cursor-wait disabled:opacity-60">
            {isThrowing ? '· · ·' : '✦'}
          </button>
        </section>
        <section className="order-1 lg:order-2">
          <div className="poe-stage relative h-[360px] overflow-hidden rounded-[2rem] border border-[#4e2919]/15 bg-[#e7ded0] shadow-[0_25px_60px_rgba(83,48,27,.18)] sm:h-[510px]" ref={canvasWrapperRef} onPointerDown={(event) => { draggingRef.current = event.clientX; }} onPointerMove={(event) => { if (draggingRef.current !== null && Math.abs(event.clientX - draggingRef.current) > SWIPE_THRESHOLD) { draggingRef.current = null; triggerThrow(); } }} onPointerUp={() => { draggingRef.current = null; }} onPointerLeave={() => { draggingRef.current = null; }}>
          </div>
        </section>
      </main>
    </div>
  );
};
