import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

const SWIPE_THRESHOLD = 120;

export const Poe: React.FC = () => {
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const blocksRef = useRef<THREE.Mesh[]>([]);
  const animationFrameRef = useRef<number | null>(null);
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
      positionAttribute.setZ(i, positionAttribute.getZ(i) + bend);
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

  const triggerThrow = () => {
    if (isThrowing || blocksRef.current.length === 0) return;
    setIsThrowing(true);
    const results = blocksRef.current.map(() => Math.random() > 0.5);

    blocksRef.current.forEach((block, index) => {
      block.position.set(index === 0 ? -1.7 : 1.7, 0.2, 0);
      block.rotation.set(
        initialRotations[index].x,
        initialRotations[index].y,
        initialRotations[index].z
      );
    });

    blocksRef.current.forEach((block, index) => {
      const drift = (index === 0 ? -1 : 1) * (0.7 + Math.random() * 0.5);
      const spin = (Math.random() * 4 + 8) * Math.PI;
      const wobble = (Math.random() - 0.5) * 1.4;
      const finalFlat = results[index];
      const finalTilt = finalFlat ? 0 : Math.PI;
      const finalYaw = (index === 0 ? -0.3 : 0.3) + Math.random() * 0.35;
      const timeline = gsap.timeline({
        onComplete: () => {
          if (index === blocksRef.current.length - 1) {
            setIsThrowing(false);
          }
        },
      });

      timeline
        .to(block.position, {
          x: block.position.x + drift,
          y: 4.8 + Math.random() * 1.2,
          z: (Math.random() - 0.5) * 0.8,
          duration: 0.55,
          ease: 'power2.out',
        })
        .to(block.position, {
          y: groundY + 0.2,
          duration: 0.6,
          ease: 'power2.in',
        })
        .to(block.position, {
          y: groundY + 1.6,
          duration: 0.24,
          ease: 'power2.out',
        })
        .to(block.position, {
          y: groundY + 0.15,
          duration: 0.32,
          ease: 'power2.in',
        })
        .to(block.position, {
          y: groundY + 0.9,
          duration: 0.2,
          ease: 'power2.out',
        })
        .to(block.position, {
          y: groundY + 0.1,
          duration: 0.26,
          ease: 'power2.in',
        })
        .to(block.position, {
          y: groundY + 0.1,
          duration: 0.2,
          ease: 'power1.out',
        });

      gsap.to(block.rotation, {
        x: block.rotation.x + spin + finalTilt,
        y: block.rotation.y + spin * 0.7 + finalYaw,
        z: block.rotation.z + spin * 0.4 + wobble,
        duration: 1.6,
        ease: 'power3.out',
      });
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
