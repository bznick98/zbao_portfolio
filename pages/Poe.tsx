import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

const SWIPE_THRESHOLD = 120;

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
  const dragStartRef = useRef<number | null>(null);
  const [isThrowing, setIsThrowing] = useState(false);

  const initialRotations = useMemo(
    () => [
      { x: -0.4, y: -0.2, z: 0.1 },
      { x: -0.35, y: 0.25, z: -0.15 },
    ],
    []
  );
  const groundY = -0.6;
  const gravity = useMemo(() => new THREE.Vector3(0, -12, 0), []);

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

    const outerRadius = 1.5;
    const blockShape = new THREE.Shape();
    blockShape.absarc(0, 0, outerRadius, Math.PI, 0, false);
    blockShape.lineTo(outerRadius, -0.2);
    blockShape.lineTo(-outerRadius, -0.2);
    blockShape.closePath();

    const blockGeometry = new THREE.ExtrudeGeometry(blockShape, {
      depth: 0.7,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.08,
      bevelSegments: 3,
    });
    blockGeometry.center();
    const positionAttribute = blockGeometry.getAttribute('position');
    const maxX = outerRadius;
    for (let i = 0; i < positionAttribute.count; i += 1) {
      const x = positionAttribute.getX(i);
      const y = positionAttribute.getY(i);
      const bend = 0.35 * (1 - (x / maxX) ** 2);
      const flatFactor = Math.max(0, (y + 0.2) * 0.9);
      const z = positionAttribute.getZ(i);
      const bulge = z > 0 ? bend : 0;
      positionAttribute.setZ(i, z < 0 ? -0.02 : z + bulge);
      positionAttribute.setY(i, y + bend * 0.1 + flatFactor * 0.05);
    }
    blockGeometry.computeVertexNormals();

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
    blockGeometry.computeBoundingSphere();
    const radius = blockGeometry.boundingSphere?.radius ?? 1.1;
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

    const groundGeometry = new THREE.PlaneGeometry(20, 8);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: '#e8e1d9',
      roughness: 0.9,
      metalness: 0.05,
    });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = groundY;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

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
      stepPhysics(delta);
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
      groundGeometry.dispose();
      groundMaterial.dispose();
      wrapper.removeChild(renderer.domElement);
    };
  }, [gravity, initialRotations]);

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
    const impulse = -(1.1) * separatingSpeed * 0.5;
    stateA.velocity.addScaledVector(normal, -impulse);
    stateB.velocity.addScaledVector(normal, impulse);
  };

  const stepPhysics = (delta: number) => {
    const blocks = blocksRef.current;
    const physics = physicsRef.current;
    const isSettled = blocks.every((block, index) => {
      const state = physics[index];
      state.velocity.addScaledVector(gravity, delta);
      block.position.addScaledVector(state.velocity, delta);

      block.rotation.x += state.angularVelocity.x * delta;
      block.rotation.y += state.angularVelocity.y * delta;
      block.rotation.z += state.angularVelocity.z * delta;

      const contactY = groundY + state.radius * 0.55;
      if (block.position.y - state.radius < contactY) {
        block.position.y = contactY + state.radius;
        state.velocity.y = Math.abs(state.velocity.y) * 0.55;
        state.velocity.x *= 0.82;
        state.velocity.z *= 0.82;
        state.angularVelocity.multiplyScalar(0.85);
      }

      state.velocity.multiplyScalar(0.992);
      state.angularVelocity.multiplyScalar(0.982);

      return (
        state.velocity.length() < 0.2 &&
        state.angularVelocity.length() < 0.2
      );
    });

    if (blocks.length === 2) {
      resolveBlockCollision(0, 1);
    }

    if (isSettled && isThrowing) {
      blocks.forEach((block, index) => {
        const flatUp = Math.random() > 0.5;
        const tilt = flatUp ? 0 : Math.PI;
        block.rotation.set(
          tilt,
          (index === 0 ? -0.3 : 0.3) + Math.random() * 0.2,
          (index === 0 ? 0.2 : -0.2) + Math.random() * 0.2
        );
        block.position.y = groundY + 0.2;
      });
      setIsThrowing(false);
    }
  };

  const triggerThrow = () => {
    if (isThrowing || blocksRef.current.length === 0) return;
    setIsThrowing(true);
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
        (index === 0 ? -1 : 1) * (1.2 + Math.random() * 0.6),
        7.5 + Math.random() * 2,
        (Math.random() - 0.5) * 1.6
      );
      state.angularVelocity.set(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8
      );
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
          className="h-[420px] md:h-[520px] w-full cursor-grab active:cursor-grabbing"
        />

        <div className="flex flex-col items-center gap-4">
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
