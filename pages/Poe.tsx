import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';

const SWIPE_THRESHOLD = 120;

export const Poe: React.FC = () => {
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const blocksRef = useRef<THREE.Mesh[]>([]);
  const worldRef = useRef<RAPIER.World | null>(null);
  const rigidBodiesRef = useRef<RAPIER.RigidBody[]>([]);
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
  const groundY = -0.7;
  const gravity = useMemo(() => ({ x: 0, y: -12, z: 0 }), []);
  const cameraTargetRef = useRef(new THREE.Vector3());

  useEffect(() => {
    const wrapper = canvasWrapperRef.current;
    if (!wrapper) return;
    let isCancelled = false;
    let cleanup = () => {};

    const initScene = async () => {
      await RAPIER.init();
      if (isCancelled) return;

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
        bevelThickness: 0.08,
        bevelSize: 0.06,
        bevelSegments: 3,
      });
      blockGeometry.center();
      const positionAttribute = blockGeometry.getAttribute('position');
      const maxX = outerRadius;
      for (let i = 0; i < positionAttribute.count; i += 1) {
        const x = positionAttribute.getX(i);
        const y = positionAttribute.getY(i);
        const bend = 0.42 * (1 - (x / maxX) ** 2);
        const flatFactor = Math.max(0, (y + 0.2) * 0.9);
        const z = positionAttribute.getZ(i);
        const bulge = z > 0 ? bend : 0;
        positionAttribute.setZ(i, z < 0 ? -0.03 : z + bulge);
        positionAttribute.setY(i, y + bend * 0.1 + flatFactor * 0.06);
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
      scene.add(leftBlock, rightBlock);

      const groundGeometry = new THREE.PlaneGeometry(20, 8);
      const woodCanvas = document.createElement('canvas');
      woodCanvas.width = 256;
      woodCanvas.height = 256;
      const woodContext = woodCanvas.getContext('2d');
      if (woodContext) {
        woodContext.fillStyle = '#d8c4a8';
        woodContext.fillRect(0, 0, woodCanvas.width, woodCanvas.height);
        woodContext.fillStyle = 'rgba(115, 82, 54, 0.35)';
        for (let i = 0; i < 12; i += 1) {
          const y = (i / 12) * woodCanvas.height;
          woodContext.fillRect(0, y, woodCanvas.width, 8);
        }
        woodContext.strokeStyle = 'rgba(90, 64, 42, 0.25)';
        for (let i = 0; i < 24; i += 1) {
          woodContext.beginPath();
          woodContext.moveTo(0, (i / 24) * woodCanvas.height);
          woodContext.bezierCurveTo(
            woodCanvas.width * 0.3,
            (i / 24) * woodCanvas.height + 6,
            woodCanvas.width * 0.7,
            (i / 24) * woodCanvas.height - 6,
            woodCanvas.width,
            (i / 24) * woodCanvas.height
          );
          woodContext.stroke();
        }
      }
      const woodTexture = new THREE.CanvasTexture(woodCanvas);
      woodTexture.wrapS = THREE.RepeatWrapping;
      woodTexture.wrapT = THREE.RepeatWrapping;
      woodTexture.repeat.set(2, 1);
      const groundMaterial = new THREE.MeshStandardMaterial({
        color: '#e0c9ad',
        roughness: 0.85,
        metalness: 0.05,
        map: woodTexture,
      });
      const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
      groundMesh.rotation.x = -Math.PI / 2;
      groundMesh.position.y = groundY;
      scene.add(groundMesh);

      const world = new RAPIER.World(new RAPIER.Vector3(gravity.x, gravity.y, gravity.z));
      worldRef.current = world;

      const groundBody = world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(0, groundY, 0)
      );
      world.createCollider(
        RAPIER.ColliderDesc.cuboid(10, 0.2, 6).setFriction(0.85).setRestitution(0.35),
        groundBody
      );

      const vertices = new Float32Array(positionAttribute.array);
      const hull = RAPIER.ColliderDesc.convexHull(vertices);
      const rigidBodies = blocksRef.current.map((block) =>
        world.createRigidBody(
          RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(block.position.x, block.position.y, block.position.z)
            .setCanSleep(true)
        )
      );
      rigidBodies.forEach((body) => {
        world.createCollider(
          (hull ?? RAPIER.ColliderDesc.capsule(0.6, 0.9))
            .setFriction(0.7)
            .setRestitution(0.4),
          body
        );
      });
      rigidBodiesRef.current = rigidBodies;

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
        updateCamera();
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animate(performance.now());

      cleanup = () => {
        window.removeEventListener('resize', resize);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        rigidBodiesRef.current = [];
        worldRef.current = null;
        renderer.dispose();
        blockGeometry.dispose();
        material.dispose();
        woodTexture.dispose();
        groundGeometry.dispose();
        groundMaterial.dispose();
        if (renderer.domElement.parentElement) {
          wrapper.removeChild(renderer.domElement);
        }
      };
    };

    initScene();
    return () => {
      isCancelled = true;
      cleanup();
    };
  }, [gravity, initialRotations]);

  const stepPhysics = (delta: number) => {
    const world = worldRef.current;
    if (!world) return;
    world.timestep = delta;
    world.step();

    blocksRef.current.forEach((block, index) => {
      const body = rigidBodiesRef.current[index];
      if (!body) return;
      const position = body.translation();
      const rotation = body.rotation();
      block.position.set(position.x, position.y, position.z);
      block.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    });

    if (isThrowing && rigidBodiesRef.current.every((body) => body.isSleeping())) {
      setIsThrowing(false);
    }
  };

  const updateCamera = () => {
    const camera = cameraRef.current;
    if (!camera) return;
    const positions = blocksRef.current.map((block) => block.position);
    if (positions.length === 0) return;
    const center = positions
      .reduce((acc, pos) => acc.add(pos), new THREE.Vector3())
      .multiplyScalar(1 / positions.length);
    const maxDistance = positions.reduce(
      (distance, pos) => Math.max(distance, pos.distanceTo(center)),
      0
    );
    const target = cameraTargetRef.current;
    target.lerp(center, 0.08);
    const height = 5.2 + maxDistance * 0.6;
    const depth = 9.2 + maxDistance * 0.8;
    camera.position.lerp(new THREE.Vector3(target.x, height, depth), 0.08);
    camera.lookAt(target.x, target.y, 0);
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

    rigidBodiesRef.current.forEach((body, index) => {
      body.setTranslation(
        { x: index === 0 ? -1.7 : 1.7, y: 0.2, z: 0 },
        true
      );
      body.setLinvel(
        {
          x: (index === 0 ? -1 : 1) * (1.2 + Math.random() * 0.6),
          y: 7.5 + Math.random() * 2,
          z: (Math.random() - 0.5) * 1.6,
        },
        true
      );
      body.setAngvel(
        {
          x: (Math.random() - 0.5) * 8,
          y: (Math.random() - 0.5) * 8,
          z: (Math.random() - 0.5) * 8,
        },
        true
      );
      body.wakeUp();
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
