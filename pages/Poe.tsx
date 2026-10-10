import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createPoeGeometry, initializePoePhysics, PoeSimulation } from '../lib/poe-physics';
import type { PoeFace, PoeReading } from '../lib/poe-physics';

type Phase = 'loading' | 'ready' | 'charging' | 'throwing' | 'settled' | 'error';
const READINGS: Record<PoeReading, { title: string; chinese: string; detail: string }> = {
  yes: { title: 'Yes', chinese: '聖筊', detail: 'One flat. One round.' },
  no: { title: 'No', chinese: '陰筊', detail: 'Two round sides.' },
  again: { title: 'Ask again', chinese: '笑筊', detail: 'Two flat sides.' },
  edge: { title: 'Cast again', chinese: 'On an edge', detail: 'A block landed on its side.' },
  unsettled: { title: 'Cast again', chinese: 'No reading', detail: 'The blocks have not settled.' },
};

const FaceMark = ({ face }: { face: PoeFace }) => (
  <svg viewBox="0 0 36 28" className="h-7 w-9" role="img" aria-label={face + ' side'}>
    {face === 'edge' ? <rect x="15" y="4" width="6" height="21" rx="3" fill="#9f2935" /> : face === 'flat'
      ? <rect x="4" y="8" width="28" height="11" rx="3" fill="#eed2a4" stroke="#8b543c" strokeWidth="1.3" />
      : <path d="M4 21 A14 17 0 0 1 32 21 Z" fill="#9f2935" stroke="#75232b" strokeWidth="1.3" />}
  </svg>
);

export const Poe: React.FC = () => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<PoeSimulation | null>(null);
  const phaseRef = useRef<Phase>('loading');
  const chargingRef = useRef<number | null>(null);
  const gestureRef = useRef<{ x: number; y: number } | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [charge, setCharge] = useState(0);
  const [reading, setReading] = useState<PoeReading | null>(null);
  const [faces, setFaces] = useState<PoeFace[]>([]);
  const [history, setHistory] = useState<PoeReading[]>([]);

  const changePhase = (next: Phase) => { phaseRef.current = next; setPhase(next); };

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    let cancelled = false;
    let frame = 0;
    let observer: ResizeObserver | undefined;
    let renderer: THREE.WebGLRenderer | undefined;
    const resources: { dispose: () => void }[] = [];

    const setup = async () => {
      await initializePoePhysics();
      if (cancelled) return;
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      resources.push(renderer);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.35;
      wrapper.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      scene.add(new THREE.HemisphereLight('#fff6e5', '#695343', 2.5));
      const light = new THREE.DirectionalLight('#fff4de', 3.2);
      light.position.set(-4, 12, 7);
      light.castShadow = true;
      light.shadow.mapSize.set(1024, 1024);
      light.shadow.camera.left = light.shadow.camera.bottom = -8;
      light.shadow.camera.right = light.shadow.camera.top = 8;
      light.shadow.normalBias = 0.04;
      resources.push(light.shadow);
      scene.add(light);

      const geometry = createPoeGeometry();
      resources.push(geometry);
      const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.04 });
      resources.push(material);
      const meshes = [0, 1].map(() => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = mesh.receiveShadow = true;
        scene.add(mesh);
        return mesh;
      });
      const simulation = new PoeSimulation(new Float32Array(geometry.getAttribute('position').array));
      simulationRef.current = simulation;
      resources.push(simulation);

      const grain = document.createElement('canvas');
      grain.width = grain.height = 256;
      const context = grain.getContext('2d');
      if (context) {
        context.fillStyle = '#b6926e';
        context.fillRect(0, 0, 256, 256);
        for (let line = 0; line < 90; line++) {
          context.strokeStyle = line % 2 ? 'rgba(90,52,26,.13)' : 'rgba(255,236,204,.18)';
          context.beginPath();
          context.moveTo(0, line * 3);
          context.bezierCurveTo(80, line * 3 + 6, 160, line * 3 - 5, 256, line * 3);
          context.stroke();
        }
      }
      const texture = new THREE.CanvasTexture(grain);
      texture.colorSpace = THREE.SRGBColorSpace;
      resources.push(texture);
      const wood = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.75 });
      const rim = new THREE.MeshStandardMaterial({ color: '#855b43', roughness: 0.65 });
      resources.push(wood, rim);
      const addBox = (width: number, height: number, depth: number, x: number, y: number, z: number, surface: THREE.Material) => {
        const box = new THREE.BoxGeometry(width, height, depth);
        resources.push(box);
        const mesh = new THREE.Mesh(box, surface);
        mesh.position.set(x, y, z);
        mesh.receiveShadow = mesh.castShadow = true;
        scene.add(mesh);
      };
      addBox(10.4, 0.28, 8, 0, -0.14, 0, wood);
      for (const side of [-1, 1]) {
        addBox(0.24, 0.9, 8.4, side * 5.2, 0.3, 0, rim);
        addBox(10.4, 0.9, 0.24, 0, 0.3, side * 4.1, rim);
      }

      const resize = () => {
        if (!renderer || !wrapper.clientWidth || !wrapper.clientHeight) return;
        renderer.setSize(wrapper.clientWidth, wrapper.clientHeight);
        camera.aspect = wrapper.clientWidth / wrapper.clientHeight;
        const distance = Math.max(1, 1.25 / camera.aspect);
        camera.position.set(0, 10.5 * distance, 11.5 * distance);
        camera.lookAt(0, 0.25, 0);
        camera.updateProjectionMatrix();
      };
      observer = new ResizeObserver(resize);
      observer.observe(wrapper);
      resize();
      changePhase('ready');
      let lastTime = performance.now();
      let reported = false;
      let displayedCharge = 0;
      const animate = (time: number) => {
        if (cancelled || !renderer) return;
        simulation.step((time - lastTime) / 1000);
        lastTime = time;
        meshes.forEach((mesh, index) => {
          const body = simulation.bodies[index];
          const position = body.translation(), rotation = body.rotation();
          mesh.position.set(position.x, position.y, position.z);
          mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
        });
        if (chargingRef.current !== null) {
          const amount = Math.min(1, (time - chargingRef.current) / 1200);
          if (amount - displayedCharge > 0.02 || amount === 1) { displayedCharge = amount; setCharge(amount); }
        } else displayedCharge = 0;
        if (simulation.state === 'throwing') reported = false;
        if (simulation.state === 'settled' && simulation.reading && !reported) {
          reported = true;
          setReading(simulation.reading);
          setFaces([...simulation.faces]);
          setHistory(previous => [simulation.reading!, ...previous].slice(0, 3));
          changePhase('settled');
        }
        renderer.render(scene, camera);
        frame = requestAnimationFrame(animate);
      };
      frame = requestAnimationFrame(animate);
    };

    setup().catch(() => { if (!cancelled) changePhase('error'); });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      chargingRef.current = null;
      simulationRef.current = null;
      resources.reverse().forEach(resource => resource.dispose());
      renderer?.forceContextLoss();
      renderer?.domElement.remove();
    };
  }, []);

  const cast = (power = 0.4, direction = 0) => {
    if (!simulationRef.current?.cast(power, direction)) return;
    chargingRef.current = null;
    setCharge(0);
    setReading(null);
    setFaces([]);
    changePhase('throwing');
  };
  const beginCharge = () => {
    if (!['ready', 'settled'].includes(phaseRef.current)) return;
    chargingRef.current = performance.now();
    setCharge(0);
    changePhase('charging');
  };
  const releaseCharge = () => {
    if (chargingRef.current === null) return;
    cast(Math.max(0.25, Math.min(1, (performance.now() - chargingRef.current) / 1200)));
  };
  const cancelCharge = () => {
    if (chargingRef.current === null) return;
    chargingRef.current = null;
    setCharge(0);
    changePhase(reading ? 'settled' : 'ready');
  };

  const result = reading ? READINGS[reading] : null;
  const busy = phase === 'throwing' || phase === 'loading' || phase === 'error';
  return (
    <div className="min-h-[100svh] bg-[#faf9f6] px-5 pb-10 pt-24 font-rubik md:px-12 md:pt-28">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <p className="mb-3 text-[10px] uppercase tracking-[0.35em] opacity-50">Poe / 擲筊</p>
          <h1 className="font-cormorant text-5xl leading-tight md:text-6xl">Let the question land.</h1>
          <p className="mt-3 text-sm opacity-65">Ask a yes/no question. Hold to charge, release to cast — or swipe the tray.</p>
        </header>

        <div className="grid items-center gap-5 lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-10">
          <div
            ref={wrapperRef}
            className="relative aspect-[1.2] min-h-[280px] w-full touch-none cursor-grab active:cursor-grabbing sm:aspect-[1.5]"
            aria-label="Poe casting tray"
            onPointerDown={event => {
              if (busy || phaseRef.current === 'charging') return;
              gestureRef.current = { x: event.clientX, y: event.clientY };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerUp={event => {
              const start = gestureRef.current;
              gestureRef.current = null;
              if (!start) return;
              const dx = event.clientX - start.x, dy = event.clientY - start.y;
              cast(Math.max(0.3, Math.min(1, Math.hypot(dx, dy) / 160)), dx / 150);
            }}
            onPointerCancel={() => { gestureRef.current = null; }}
          />
          <div className="flex flex-col items-center text-center">
            <div className="min-h-[140px]" role="status" aria-live="polite" aria-atomic="true">
              <p className="mb-2 text-sm opacity-50">{result?.chinese || (phase === 'throwing' ? '擲筊' : 'A quiet question')}</p>
              <h2 className="font-cormorant text-5xl">
                {result?.title || (phase === 'throwing' ? 'In motion…' : phase === 'loading' ? 'Getting ready…' : phase === 'error' ? 'Tray unavailable' : 'Your turn')}
              </h2>
              <p className="mt-3 text-sm opacity-60">
                {result?.detail || (phase === 'throwing' ? 'Let both blocks come to rest.' : phase === 'error' ? 'This game needs a browser with WebGL.' : 'Take a breath. Choose your question.')}
              </p>
              {faces.length === 2 && <div className="mt-4 flex justify-center gap-3">{faces.map((face, index) => <span key={index}><FaceMark face={face} /></span>)}</div>}
            </div>
            <button
              type="button"
              disabled={busy}
              className="mt-5 touch-none select-none rounded-full border border-black/60 bg-white/90 px-8 py-4 text-xs uppercase tracking-[0.22em] text-black transition hover:bg-black hover:text-white disabled:cursor-wait disabled:opacity-40"
              onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); beginCharge(); }}
              onPointerUp={releaseCharge}
              onPointerCancel={cancelCharge}
              onBlur={cancelCharge}
              onContextMenu={event => event.preventDefault()}
              onKeyDown={event => { if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) { event.preventDefault(); beginCharge(); } }}
              onKeyUp={event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); releaseCharge(); } }}
              onClick={() => { if (['ready', 'settled'].includes(phaseRef.current)) cast(); }}
            >
              {phase === 'throwing' ? 'Casting…' : phase === 'charging' ? 'Release to cast' : 'Cast the blocks'}
            </button>
            <div className={'mt-3 h-1 w-36 overflow-hidden rounded-full bg-black/10 transition-opacity ' + (phase === 'charging' ? 'opacity-100' : 'opacity-0')} role="progressbar" aria-label="Cast strength" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(charge * 100)}>
              <div className="h-full rounded-full bg-[#9f2935]" style={{ width: (25 + charge * 75) + '%' }} />
            </div>
            <div className="mt-3 flex min-h-5 gap-3 text-[10px] uppercase tracking-wider opacity-45" aria-label="Recent readings">
              {history.map((item, index) => <span key={index}>{READINGS[item].title}</span>)}
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-3 border-t border-black/10 pt-6">
          {([
            { faces: ['flat', 'round'], reading: 'yes', label: 'One flat, one round' },
            { faces: ['round', 'round'], reading: 'no', label: 'Two round' },
            { faces: ['flat', 'flat'], reading: 'again', label: 'Two flat' },
          ] as { faces: PoeFace[]; reading: PoeReading; label: string }[]).map(item => (
            <div key={item.reading} className="text-center">
              <div className="mb-2 flex justify-center gap-1">{item.faces.map((face, index) => <span key={index}><FaceMark face={face} /></span>)}</div>
              <p className="font-cormorant text-2xl">{READINGS[item.reading].title}</p>
              <p className="mt-1 text-[10px] opacity-50">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
