import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

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

const SWIPE_THRESHOLD = 120;
const GRAVITY = new THREE.Vector3(0, -14, 0);
const RESTITUTION = 0.6;
const FRICTION = 0.84;
const SETTLE_SPEED = 0.4;
const SETTLE_TIME_MS = 500;

export const Poe: React.FC = () => {
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const blocksRef = useRef<THREE.Mesh[]>([]);
  const physicsRef = useRef<
    { velocity: THREE.Vector3; angularVelocity: THREE.Vector3; radius: number }[]
  >([]);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const settleStartRef = useRef<number | null>(null);
  const isThrowingRef = useRef(false);
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

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 5.2, 9.2);
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

    const curve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(-1.1, 0, 0),
        new THREE.Vector3(-0.5, 0.15, 0.1),
        new THREE.Vector3(0.4, 0.25, 0.2),
        new THREE.Vector3(1.1, 0.15, 0.1),
      ],
      false
    );
    const blockGeometry = new THREE.TubeGeometry(curve, 40, 0.35, 18, false);
    blockGeometry.center();
    blockGeometry.computeBoundingSphere();
    const radius = blockGeometry.boundingSphere?.radius ?? 1.2;

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
    physicsRef.current = [
      {
        velocity: new THREE.Vector3(),
        angularVelocity: new THREE.Vector3(),
        radius,
      },
      {
        velocity: new THREE.Vector3(),
        angularVelocity: new THREE.Vector3(),
        radius,
      },
    ];
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

    const animate = (time: number) => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
      const lastFrame = lastFrameRef.current ?? time;
      const delta = Math.min(0.033, (time - lastFrame) / 1000);
      lastFrameRef.current = time;
      if (isThrowingRef.current) {
        stepPhysics(delta);
      }
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate(performance.now());

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      renderer.dispose();
      blockGeometry.dispose();
      material.dispose();
      wrapper.removeChild(renderer.domElement);
    };
  }, [initialRotations]);

  useEffect(() => {
    isThrowingRef.current = isThrowing;
  }, [isThrowing]);

  const setBlocks = (flatUpStates: boolean[]) => {
    blocksRef.current.forEach((block, index) => {
      const isFlatUp = flatUpStates[index];
      const tilt = isFlatUp ? -0.12 : Math.PI - 0.12;
      block.rotation.x = tilt;
      block.rotation.y = (index === 0 ? -0.3 : 0.3) + Math.random() * 0.3;
      block.rotation.z = (index === 0 ? 0.1 : -0.1) + Math.random() * 0.2;
    });
  };

  const resolveBlockCollision = (indexA: number, indexB: number) => {
    const blocks = blocksRef.current;
    const physics = physicsRef.current;
    const blockA = blocks[indexA];
    const blockB = blocks[indexB];
    if (!blockA || !blockB) return;
    const stateA = physics[indexA];
    const stateB = physics[indexB];
    const delta = new THREE.Vector3().subVectors(blockB.position, blockA.position);
    const distance = delta.length();
    const minDistance = stateA.radius + stateB.radius;
    if (distance >= minDistance || distance === 0) return;
    const normal = delta.normalize();
    const overlap = minDistance - distance;
    blockA.position.addScaledVector(normal, -overlap * 0.5);
    blockB.position.addScaledVector(normal, overlap * 0.5);

    const relativeVelocity = new THREE.Vector3().subVectors(stateB.velocity, stateA.velocity);
    const separatingSpeed = relativeVelocity.dot(normal);
    if (separatingSpeed > 0) return;
    const impulse = -(1 + RESTITUTION) * separatingSpeed * 0.5;
    stateA.velocity.addScaledVector(normal, -impulse);
    stateB.velocity.addScaledVector(normal, impulse);
  };

  const stepPhysics = (delta: number) => {
    const floorY = -0.9;
    const blocks = blocksRef.current;
    const physics = physicsRef.current;
    const isSettled = blocks.every((block, index) => {
      const state = physics[index];
      state.velocity.addScaledVector(GRAVITY, delta);
      block.position.addScaledVector(state.velocity, delta);

      block.rotation.x += state.angularVelocity.x * delta;
      block.rotation.y += state.angularVelocity.y * delta;
      block.rotation.z += state.angularVelocity.z * delta;

      if (block.position.y - state.radius < floorY) {
        block.position.y = floorY + state.radius;
        state.velocity.y = Math.abs(state.velocity.y) * RESTITUTION;
        state.velocity.x *= FRICTION;
        state.velocity.z *= FRICTION;
        state.angularVelocity.multiplyScalar(0.9);
      }

      state.velocity.multiplyScalar(0.995);
      state.angularVelocity.multiplyScalar(0.985);

      return (
        state.velocity.length() < SETTLE_SPEED &&
        state.angularVelocity.length() < SETTLE_SPEED
      );
    });

    if (blocks.length === 2) {
      resolveBlockCollision(0, 1);
    }

    const now = performance.now();
    if (isSettled) {
      if (!settleStartRef.current) {
        settleStartRef.current = now;
      } else if (now - settleStartRef.current > SETTLE_TIME_MS) {
        settleStartRef.current = null;
        finalizeOutcome();
      }
    } else {
      settleStartRef.current = null;
    }
  };

  const finalizeOutcome = () => {
    const flatUpStates = blocksRef.current.map((block) => {
      const flatNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(block.quaternion);
      return flatNormal.y > 0;
    });
    setBlocks(flatUpStates);
    const [leftFlat, rightFlat] = flatUpStates;
    if (leftFlat && rightFlat) {
      setOutcome('negative');
    } else if (!leftFlat && !rightFlat) {
      setOutcome('laughing');
    } else {
      setOutcome('positive');
    }
    setIsThrowing(false);
  };

  const triggerThrow = () => {
    if (isThrowing || blocksRef.current.length === 0) return;
    setIsThrowing(true);
    setOutcome(null);
    settleStartRef.current = null;

    blocksRef.current.forEach((block, index) => {
      block.position.set(index === 0 ? -1.7 : 1.7, 0.2, 0);
      block.rotation.set(
        initialRotations[index].x,
        initialRotations[index].y,
        initialRotations[index].z
      );
    });

    physicsRef.current.forEach((state, index) => {
      state.velocity.set(
        (Math.random() - 0.5) * 3.2,
        8 + Math.random() * 3,
        (Math.random() - 0.5) * 2.4
      );
      state.angularVelocity.set(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8
      );
      if (index === 0) {
        state.velocity.x -= 1.2;
      } else {
        state.velocity.x += 1.2;
      }
    });
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
    <div className="h-screen w-full overflow-hidden bg-[#faf9f6]">
      <div className="mx-auto flex h-full max-w-[1200px] flex-col items-center justify-center gap-10 px-6 md:px-12">
        <h1 className="w-full text-left text-4xl md:text-6xl font-semibold text-black tracking-[0.35em]">
          Poe
        </h1>

        <div
          ref={canvasWrapperRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="h-[320px] md:h-[420px] w-full cursor-grab active:cursor-grabbing"
        />

        <div className="flex flex-col items-center gap-4">
          {outcome ? (
            <p className="text-3xl md:text-4xl font-semibold text-black">
              {OUTCOME_COPY[outcome].title}
            </p>
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
