import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const MAX_GAZE_OFFSET = 0.28;
const GAZE_DEPTH = 0.85;

type MaterialStyle = 'standard' | 'phong' | 'toon' | 'physical';

type EyeDesign = {
  name: string;
  sclera: {
    color: number;
    roughness?: number;
    metalness?: number;
    emissive?: number;
    emissiveIntensity?: number;
    material: MaterialStyle;
  };
  iris: {
    color: number;
    roughness?: number;
    metalness?: number;
    emissive?: number;
    emissiveIntensity?: number;
    radius?: number;
    material: MaterialStyle;
  };
  pupil: {
    color: number;
    roughness?: number;
    metalness?: number;
    radius?: number;
    scale?: [number, number, number];
    offsetZ?: number;
    material: MaterialStyle;
  };
  limbalRing?: {
    color: number;
    radius?: number;
    thickness?: number;
    material: MaterialStyle;
  };
  highlight?: {
    color: number;
    size?: number;
    offset?: [number, number, number];
    intensity?: number;
  };
};

const eyeDesigns: EyeDesign[] = [
  {
    name: 'Classic Blue',
    sclera: { color: 0xfdfdfd, roughness: 0.6, metalness: 0.1, material: 'standard' },
    iris: { color: 0x2c5d7a, roughness: 0.35, metalness: 0.2, material: 'standard' },
    pupil: { color: 0x111111, roughness: 0.2, metalness: 0.1, material: 'standard' },
    limbalRing: { color: 0x0b1a24, material: 'standard' },
    highlight: { color: 0xffffff, size: 0.08, offset: [-0.12, 0.12, 0.48], intensity: 1.4 },
  },
  {
    name: 'Hazel Realism',
    sclera: { color: 0xf8f2ea, roughness: 0.7, metalness: 0.05, material: 'standard' },
    iris: { color: 0x6a5d2b, roughness: 0.45, metalness: 0.15, material: 'physical' },
    pupil: { color: 0x111111, roughness: 0.2, metalness: 0.05, material: 'standard' },
    limbalRing: { color: 0x2d2011, material: 'standard' },
    highlight: { color: 0xffffff, size: 0.06, offset: [-0.1, 0.16, 0.45], intensity: 1.1 },
  },
  {
    name: 'Emerald Gem',
    sclera: { color: 0xf7fbff, roughness: 0.5, metalness: 0.05, material: 'standard' },
    iris: { color: 0x1f8f6f, roughness: 0.25, metalness: 0.55, material: 'physical' },
    pupil: { color: 0x0d0d0d, roughness: 0.2, metalness: 0.1, material: 'standard' },
    limbalRing: { color: 0x0e3d2c, material: 'standard' },
    highlight: { color: 0xe6fffb, size: 0.07, offset: [-0.14, 0.14, 0.5], intensity: 1.5 },
  },
  {
    name: 'Amber Cat',
    sclera: { color: 0xfffbf0, roughness: 0.55, metalness: 0.05, material: 'standard' },
    iris: { color: 0xc7771c, roughness: 0.35, metalness: 0.25, material: 'standard' },
    pupil: {
      color: 0x120b08,
      roughness: 0.25,
      metalness: 0.1,
      scale: [0.45, 1.25, 0.45],
      material: 'standard',
    },
    limbalRing: { color: 0x4c2a0e, material: 'standard' },
    highlight: { color: 0xfff3d1, size: 0.05, offset: [-0.1, 0.18, 0.45], intensity: 1.2 },
  },
  {
    name: 'Neon Cyber',
    sclera: { color: 0x1a1a2f, roughness: 0.3, metalness: 0.4, material: 'physical' },
    iris: {
      color: 0x00c2ff,
      roughness: 0.2,
      metalness: 0.6,
      emissive: 0x00a2ff,
      emissiveIntensity: 0.8,
      material: 'physical',
    },
    pupil: { color: 0x020202, roughness: 0.2, metalness: 0.2, material: 'standard' },
    limbalRing: { color: 0x00f0ff, material: 'standard' },
    highlight: { color: 0x8fffff, size: 0.07, offset: [-0.14, 0.14, 0.5], intensity: 1.8 },
  },
  {
    name: 'Galaxy',
    sclera: { color: 0xeef3ff, roughness: 0.6, metalness: 0.1, material: 'standard' },
    iris: {
      color: 0x3c2b7a,
      roughness: 0.4,
      metalness: 0.3,
      emissive: 0x1d0f3d,
      emissiveIntensity: 0.4,
      material: 'standard',
    },
    pupil: { color: 0x0a0614, roughness: 0.2, metalness: 0.1, material: 'standard' },
    limbalRing: { color: 0x19112f, material: 'standard' },
    highlight: { color: 0xded5ff, size: 0.06, offset: [-0.12, 0.12, 0.45], intensity: 1.3 },
  },
  {
    name: 'Pastel Anime',
    sclera: { color: 0xffffff, roughness: 0.65, metalness: 0.05, material: 'toon' },
    iris: { color: 0x7db5ff, roughness: 0.4, metalness: 0.2, radius: 0.42, material: 'toon' },
    pupil: { color: 0x0e1c3d, roughness: 0.2, metalness: 0.1, radius: 0.16, material: 'toon' },
    limbalRing: { color: 0x2a3f7a, material: 'toon' },
    highlight: { color: 0xffffff, size: 0.1, offset: [-0.18, 0.2, 0.5], intensity: 1.6 },
  },
  {
    name: 'Ink Sketch',
    sclera: { color: 0xf7f4ee, roughness: 0.8, metalness: 0, material: 'toon' },
    iris: { color: 0x4b4b4b, roughness: 0.8, metalness: 0, material: 'toon' },
    pupil: { color: 0x101010, roughness: 0.9, metalness: 0, material: 'toon' },
    limbalRing: { color: 0x1a1a1a, material: 'toon' },
    highlight: { color: 0xffffff, size: 0.05, offset: [-0.08, 0.18, 0.45], intensity: 0.8 },
  },
  {
    name: 'Sunset Oil',
    sclera: { color: 0xfff4e8, roughness: 0.7, metalness: 0.05, material: 'phong' },
    iris: { color: 0xd26a3a, roughness: 0.5, metalness: 0.2, material: 'phong' },
    pupil: { color: 0x2b140d, roughness: 0.3, metalness: 0.1, material: 'phong' },
    limbalRing: { color: 0x6e2d16, material: 'phong' },
    highlight: { color: 0xfff0e0, size: 0.06, offset: [-0.11, 0.14, 0.45], intensity: 1.2 },
  },
  {
    name: 'Crystal Ice',
    sclera: { color: 0xf1fbff, roughness: 0.45, metalness: 0.1, material: 'physical' },
    iris: {
      color: 0x8be1ff,
      roughness: 0.15,
      metalness: 0.4,
      emissive: 0x4ccfff,
      emissiveIntensity: 0.5,
      material: 'physical',
    },
    pupil: { color: 0x09121d, roughness: 0.2, metalness: 0.1, material: 'standard' },
    limbalRing: { color: 0x155a73, material: 'standard' },
    highlight: { color: 0xffffff, size: 0.08, offset: [-0.16, 0.16, 0.5], intensity: 1.7 },
  },
];

const createMaterial = (config: {
  material: MaterialStyle;
  color: number;
  roughness?: number;
  metalness?: number;
  emissive?: number;
  emissiveIntensity?: number;
}): THREE.Material => {
  const common = {
    color: config.color,
  };
  switch (config.material) {
    case 'phong':
      return new THREE.MeshPhongMaterial({
        ...common,
        shininess: 80,
      });
    case 'toon':
      return new THREE.MeshToonMaterial(common);
    case 'physical':
      return new THREE.MeshPhysicalMaterial({
        ...common,
        roughness: config.roughness ?? 0.4,
        metalness: config.metalness ?? 0.2,
        emissive: config.emissive ? new THREE.Color(config.emissive) : undefined,
        emissiveIntensity: config.emissiveIntensity ?? 0.5,
        clearcoat: 0.6,
        clearcoatRoughness: 0.2,
      });
    case 'standard':
    default:
      return new THREE.MeshStandardMaterial({
        ...common,
        roughness: config.roughness ?? 0.5,
        metalness: config.metalness ?? 0.1,
        emissive: config.emissive ? new THREE.Color(config.emissive) : undefined,
        emissiveIntensity: config.emissiveIntensity ?? 0.3,
      });
  }
};

export const Eye: React.FC<{ className?: string }> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const pointerState = useRef({
    active: false,
    x: 0,
    y: 0,
    type: 'mouse' as string,
  });
  const gyroState = useRef({
    x: 0,
    y: 0,
    available: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) {
      return;
    }

    const selectedDesign = eyeDesigns[Math.floor(Math.random() * eyeDesigns.length)];

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio || 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 3;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(2, 2, 4);
    scene.add(keyLight);

    const disposableMaterials: THREE.Material[] = [];
    const disposableGeometries: THREE.BufferGeometry[] = [];

    const eyeGeometry = new THREE.SphereGeometry(1, 48, 48);
    const eyeMaterial = createMaterial(selectedDesign.sclera);
    disposableGeometries.push(eyeGeometry);
    disposableMaterials.push(eyeMaterial);
    const eyeball = new THREE.Mesh(eyeGeometry, eyeMaterial);
    scene.add(eyeball);

    const irisGroup = new THREE.Group();

    const irisRadius = selectedDesign.iris.radius ?? 0.35;
    const irisGeometry = new THREE.SphereGeometry(irisRadius, 32, 32);
    const irisMaterial = createMaterial(selectedDesign.iris);
    disposableGeometries.push(irisGeometry);
    disposableMaterials.push(irisMaterial);
    const iris = new THREE.Mesh(irisGeometry, irisMaterial);

    const pupilGeometry = new THREE.SphereGeometry(selectedDesign.pupil.radius ?? 0.18, 32, 32);
    const pupilMaterial = createMaterial(selectedDesign.pupil);
    disposableGeometries.push(pupilGeometry);
    disposableMaterials.push(pupilMaterial);
    const pupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    if (selectedDesign.pupil.scale) {
      pupil.scale.set(...selectedDesign.pupil.scale);
    }
    pupil.position.z = selectedDesign.pupil.offsetZ ?? 0.32;

    if (selectedDesign.limbalRing) {
      const ringRadius = selectedDesign.limbalRing.radius ?? irisRadius + 0.06;
      const ringThickness = selectedDesign.limbalRing.thickness ?? 0.04;
      const ringGeometry = new THREE.TorusGeometry(ringRadius, ringThickness, 16, 64);
      const ringMaterial = createMaterial(selectedDesign.limbalRing);
      disposableGeometries.push(ringGeometry);
      disposableMaterials.push(ringMaterial);
      const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
      ringMesh.position.z = 0.02;
      irisGroup.add(ringMesh);
    }

    if (selectedDesign.highlight) {
      const highlightGeometry = new THREE.SphereGeometry(selectedDesign.highlight.size ?? 0.06, 16, 16);
      const highlightMaterial = new THREE.MeshStandardMaterial({
        color: selectedDesign.highlight.color,
        emissive: new THREE.Color(selectedDesign.highlight.color),
        emissiveIntensity: selectedDesign.highlight.intensity ?? 1.2,
        roughness: 0.1,
        metalness: 0.1,
      });
      disposableGeometries.push(highlightGeometry);
      disposableMaterials.push(highlightMaterial);
      const highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
      const [hx, hy, hz] = selectedDesign.highlight.offset ?? [-0.12, 0.12, 0.45];
      highlightMesh.position.set(hx, hy, hz);
      irisGroup.add(highlightMesh);
    }

    irisGroup.add(iris);
    irisGroup.add(pupil);
    irisGroup.position.set(0, 0, GAZE_DEPTH);
    scene.add(irisGroup);

    const updateSize = () => {
      const { width, height } = wrapper.getBoundingClientRect();
      const size = Math.max(1, Math.min(width, height));
      renderer.setSize(size, size, false);
      camera.aspect = 1;
      camera.updateProjectionMatrix();
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(wrapper);

    const requestOrientationPermission = () => {
      if (typeof DeviceOrientationEvent === 'undefined') {
        return;
      }
      const deviceEvent = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
        requestPermission?: () => Promise<'granted' | 'denied'>;
      };
      if (typeof deviceEvent.requestPermission === 'function') {
        deviceEvent.requestPermission().catch(() => undefined);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch' && !pointerState.current.active) {
        return;
      }
      pointerState.current = {
        active: true,
        x: event.clientX,
        y: event.clientY,
        type: event.pointerType,
      };
    };

    const handlePointerDown = (event: PointerEvent) => {
      pointerState.current = {
        active: true,
        x: event.clientX,
        y: event.clientY,
        type: event.pointerType,
      };
      requestOrientationPermission();
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') {
        pointerState.current.active = false;
      }
    };

    const handlePointerCancel = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') {
        pointerState.current.active = false;
      }
    };

    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) {
        return;
      }
      pointerState.current = {
        active: true,
        x: touch.clientX,
        y: touch.clientY,
        type: 'touch',
      };
      requestOrientationPermission();
    };

    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) {
        return;
      }
      pointerState.current = {
        active: true,
        x: touch.clientX,
        y: touch.clientY,
        type: 'touch',
      };
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (event.touches.length === 0) {
        pointerState.current.active = false;
      }
    };

    const handleTouchCancel = () => {
      pointerState.current.active = false;
    };

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.gamma === null || event.beta === null) {
        return;
      }
      gyroState.current = {
        x: -event.gamma / 30,
        y: -event.beta / 45,
        available: true,
      };
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    window.addEventListener('pointercancel', handlePointerCancel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchCancel, { passive: true });
    window.addEventListener('deviceorientation', handleOrientation, { passive: true });
    window.addEventListener('deviceorientationabsolute', handleOrientation, { passive: true });

    let animationFrame = 0;
    const currentTarget = new THREE.Vector2(0, 0);
    const animate = () => {
      const target = new THREE.Vector2(0, 0);
      if (pointerState.current.active) {
        const rect = wrapper.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = pointerState.current.x - centerX;
        const dy = pointerState.current.y - centerY;
        const maxRadiusX = Math.max(1, window.innerWidth / 2);
        const maxRadiusY = Math.max(1, window.innerHeight / 2);
        target.set(
          THREE.MathUtils.clamp(dx / maxRadiusX, -1, 1),
          THREE.MathUtils.clamp(dy / maxRadiusY, -1, 1),
        );
      } else if (gyroState.current.available) {
        target.set(
          THREE.MathUtils.clamp(gyroState.current.x, -1, 1),
          THREE.MathUtils.clamp(gyroState.current.y, -1, 1),
        );
      }

      currentTarget.lerp(target, 0.12);
      irisGroup.position.set(
        currentTarget.x * MAX_GAZE_OFFSET,
        -currentTarget.y * MAX_GAZE_OFFSET,
        GAZE_DEPTH,
      );
      irisGroup.lookAt(0, 0, 2);

      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    };

    animationFrame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('deviceorientationabsolute', handleOrientation);
      disposableGeometries.forEach(geometry => geometry.dispose());
      disposableMaterials.forEach(material => material.dispose());
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={wrapperRef} className={className}>
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
};
