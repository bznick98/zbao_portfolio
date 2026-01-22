import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const MAX_GAZE_OFFSET = 0.28;
const GAZE_DEPTH = 0.85;

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

    const eyeGeometry = new THREE.SphereGeometry(1, 48, 48);
    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0xfdfdfd,
      roughness: 0.6,
      metalness: 0.1,
    });
    const eyeball = new THREE.Mesh(eyeGeometry, eyeMaterial);
    scene.add(eyeball);

    const irisGroup = new THREE.Group();

    const irisGeometry = new THREE.SphereGeometry(0.35, 32, 32);
    const irisMaterial = new THREE.MeshStandardMaterial({
      color: 0x2c5d7a,
      roughness: 0.4,
      metalness: 0.2,
    });
    const iris = new THREE.Mesh(irisGeometry, irisMaterial);

    const pupilGeometry = new THREE.SphereGeometry(0.18, 32, 32);
    const pupilMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.2,
      metalness: 0.1,
    });
    const pupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    pupil.position.z = 0.32;

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
      irisGeometry.dispose();
      irisMaterial.dispose();
      pupilGeometry.dispose();
      pupilMaterial.dispose();
      eyeGeometry.dispose();
      eyeMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={wrapperRef} className={className}>
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
};
