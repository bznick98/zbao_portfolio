import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

type PoeOutcome = 'positive' | 'negative' | 'laughing';

const OUTCOME_COPY: Record<PoeOutcome, { title: string; description: string }> = {
  positive: {
    title: '聖筊 (yes)',
    description: '聖筊 (yes)',
  },
  negative: {
    title: '陰筊 (no)',
    description: '陰筊 (no)',
  },
  laughing: {
    title: '笑筊 (not sure)',
    description: '笑筊 (not sure)',
  },
};

const THROW_DURATION = 1.4;
const SWIPE_THRESHOLD = 120;

export const Poe: React.FC = () => {
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const blocksRef = useRef<THREE.Mesh[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const dragStartRef = useRef<number | null>(null);
  const [outcome, setOutcome] = useState<PoeOutcome | null>(null);
  const [isThrowing, setIsThrowing] = useState(false);

  const initialRotations = useMemo(
    () => [
      { x: -0.4, y: -0.2, z: 0.1 },
      { x: -0.35, y: 0.25, z: -0.15 },
    ],
    []
  );

  useEffect(() => {
    const wrapper = canvasWrapperRef.current;
    if (!wrapper) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 6, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;
    wrapper.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight('#ffffff', 0.9);
    const directional = new THREE.DirectionalLight('#ffffff', 1);
    directional.position.set(3, 6, 6);
    scene.add(ambient, directional);

    const material = new THREE.MeshPhysicalMaterial({
      color: '#b21f2d',
      roughness: 0.3,
      metalness: 0.05,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2,
    });

    const blockShape = new THREE.Shape();
    blockShape.absarc(0, 0, 1.35, Math.PI * 0.1, Math.PI * 1.9, false);
    const innerHole = new THREE.Path();
    innerHole.absarc(0.1, 0.1, 0.85, Math.PI * 0.1, Math.PI * 1.9, true);
    blockShape.holes.push(innerHole);

    const blockGeometry = new THREE.ExtrudeGeometry(blockShape, {
      depth: 0.45,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.08,
      bevelSegments: 3,
    });
    blockGeometry.center();

    const leftBlock = new THREE.Mesh(blockGeometry, material);
    leftBlock.position.set(-1.7, 0, 0);
    leftBlock.rotation.set(
      initialRotations[0].x,
      initialRotations[0].y,
      initialRotations[0].z
    );

    const rightBlock = new THREE.Mesh(blockGeometry, material);
    rightBlock.position.set(1.7, 0, 0);
    rightBlock.rotation.set(
      initialRotations[1].x,
      initialRotations[1].y,
      initialRotations[1].z
    );

    blocksRef.current = [leftBlock, rightBlock];
    scene.add(leftBlock, rightBlock);

    const resize = () => {
      if (!wrapper || !rendererRef.current || !cameraRef.current) return;
      const width = wrapper.clientWidth;
      const height = wrapper.clientHeight;
      rendererRef.current.setSize(width, height);
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
    };

    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      renderer.dispose();
      blockGeometry.dispose();
      material.dispose();
      wrapper.removeChild(renderer.domElement);
    };
  }, [initialRotations]);

  const setBlocks = (flatUpStates: boolean[]) => {
    blocksRef.current.forEach((block, index) => {
      const isFlatUp = flatUpStates[index];
      const tilt = isFlatUp ? -0.1 : Math.PI - 0.1;
      block.rotation.x = tilt;
      block.rotation.y = (index === 0 ? -0.3 : 0.3) + Math.random() * 0.3;
      block.rotation.z = (index === 0 ? 0.1 : -0.1) + Math.random() * 0.2;
    });
  };

  const triggerThrow = () => {
    if (isThrowing || blocksRef.current.length === 0) return;
    setIsThrowing(true);
    setOutcome(null);

    const results = blocksRef.current.map(() => Math.random() > 0.5);

    blocksRef.current.forEach((block, index) => {
      const flatUp = results[index];
      const targetRotation = flatUp ? 0 : Math.PI;
      const timeline = gsap.timeline();
      timeline
        .to(block.rotation, {
          x: targetRotation + Math.PI * 2,
          y: Math.random() * Math.PI * 2,
          z: Math.random() * Math.PI * 2,
          duration: THROW_DURATION,
          ease: 'power3.out',
        })
        .to(
          block.position,
          {
            y: 2.2,
            z: 0.6,
            duration: THROW_DURATION * 0.45,
            ease: 'power2.out',
            yoyo: true,
            repeat: 1,
          },
          0
        )
        .to(
          block.position,
          {
            x: index === 0 ? -1.8 : 1.8,
            duration: THROW_DURATION,
            ease: 'power2.inOut',
          },
          0
        );
    });

    window.setTimeout(() => {
      setBlocks(results);
      const [leftFlat, rightFlat] = results;
      if (leftFlat && rightFlat) {
        setOutcome('negative');
      } else if (!leftFlat && !rightFlat) {
        setOutcome('laughing');
      } else {
        setOutcome('positive');
      }
      setIsThrowing(false);
    }, THROW_DURATION * 1000);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragStartRef.current = event.clientX;
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current === null || isThrowing) return;
    const delta = Math.abs(event.clientX - dragStartRef.current);
    if (delta > SWIPE_THRESHOLD) {
      dragStartRef.current = null;
      triggerThrow();
    }
  };

  const handlePointerUp = () => {
    dragStartRef.current = null;
  };

  return (
    <div className="w-full px-6 md:px-12 pt-32 pb-24 min-h-screen bg-[#faf9f6]">
      <div className="max-w-[1200px] mx-auto flex flex-col items-center gap-10">
        <h1 className="text-5xl md:text-7xl font-semibold text-black tracking-[0.3em]">掷筊</h1>

        <div
          ref={canvasWrapperRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="h-[340px] md:h-[440px] w-full cursor-grab active:cursor-grabbing"
        />

        <div className="flex flex-col items-center gap-4">
          {outcome ? (
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-semibold text-black">
                {OUTCOME_COPY[outcome].title}
              </p>
              <p className="mt-2 text-base md:text-lg text-black/60">
                {OUTCOME_COPY[outcome].description}
              </p>
            </div>
          ) : (
            <p className="text-lg text-black/40">—</p>
          )}

          <button
            type="button"
            onClick={triggerThrow}
            disabled={isThrowing}
            className="rounded-full border border-black bg-black px-8 py-3 text-sm uppercase tracking-[0.4em] text-white transition hover:bg-transparent hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isThrowing ? '掷…' : '掷 (throw)'}
          </button>
        </div>
      </div>
    </div>
  );
};
