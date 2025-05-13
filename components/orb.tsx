// components/orb.tsx
"use client";
import React, { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import useVapi from "@/hooks/use-vapi"; // Your working custom hook

const Orb: React.FC = () => {
  const { volumeLevel, isSessionActive, toggleCall } = useVapi(); // From your working hook
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const ballRef = useRef<THREE.Mesh | null>(null);
  const originalPositionsRef = useRef<Float32Array | null>(null);
  const noiseRef = useRef(require('simplex-noise').createNoise3D()); // Ensure simplex-noise is a dependency
  const animationFrameIdRef = useRef<number | null>(null);

  const updateBallMorph = useCallback((mesh: THREE.Mesh, volume: number) => {
    if (!mesh || !mesh.geometry) return;
    const geometry = mesh.geometry as THREE.BufferGeometry;
    const positionAttribute = geometry.getAttribute("position");
    if (!positionAttribute) return;
    const noise = noiseRef.current;
    for (let i = 0; i < positionAttribute.count; i++) {
      const vertex = new THREE.Vector3(positionAttribute.getX(i), positionAttribute.getY(i), positionAttribute.getZ(i));
      const offset = 20; const amp = 2.5; const time = window.performance.now(); vertex.normalize();
      const rf = 0.00001;
      const distance = offset + volume * 4 + noise(vertex.x + time * rf * 7, vertex.y + time * rf * 8, vertex.z + time * rf * 9) * amp * volume;
      vertex.multiplyScalar(distance);
      positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    positionAttribute.needsUpdate = true;
    geometry.computeVertexNormals();
  }, []);

  const resetBallMorph = useCallback((mesh: THREE.Mesh, originalPositions: Float32Array | null) => {
    if (!originalPositions || !mesh || !mesh.geometry) return;
    const geometry = mesh.geometry as THREE.BufferGeometry;
    const positionAttribute = geometry.getAttribute("position");
    if (!positionAttribute) return;
    for (let i = 0; i < positionAttribute.count; i++) {
      positionAttribute.setXYZ(i, originalPositions[i * 3], originalPositions[i * 3 + 1], originalPositions[i * 3 + 2]);
    }
    positionAttribute.needsUpdate = true;
    geometry.computeVertexNormals();
  }, []);

  const handleResize = useCallback(() => {
    if (!cameraRef.current || !rendererRef.current || !mountRef.current) return;
    const { clientWidth, clientHeight } = mountRef.current;
    if (clientWidth > 0 && clientHeight > 0) {
      cameraRef.current.aspect = clientWidth / clientHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(clientWidth, clientHeight);
    }
  }, []);

  const initViz = useCallback(() => {
    if (!mountRef.current || rendererRef.current) return; // Avoid re-initialization
    const currentMount = mountRef.current;
    const { clientWidth, clientHeight } = currentMount;

    if (clientWidth === 0 || clientHeight === 0) {
      console.warn("[Orb] initViz: Mount point has zero dimensions. Resize listener should pick it up.");
      return; // Don't initialize if mount has no size, rely on useEffect + handleResize
    }

    const scene = new THREE.Scene();
    scene.background = null;
    const group = new THREE.Group();
    const camera = new THREE.PerspectiveCamera(45, clientWidth / clientHeight, 0.5, 100);
    camera.position.set(0, 0, 100); camera.lookAt(scene.position); scene.add(camera);
    sceneRef.current = scene; groupRef.current = group; cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: false });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(clientWidth, clientHeight);
    rendererRef.current = renderer;
    currentMount.innerHTML = ""; currentMount.appendChild(renderer.domElement);

    const icosahedronGeometry = new THREE.IcosahedronGeometry(20, 8);
    const lambertMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, wireframe: true });
    const ball = new THREE.Mesh(icosahedronGeometry, lambertMaterial);
    ball.position.set(0, 0, 0); ballRef.current = ball;
    if (ball.geometry.attributes.position) {
        originalPositionsRef.current = ball.geometry.attributes.position.array.slice() as Float32Array;
    }
    group.add(ball);
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); scene.add(ambientLight);
    const spotLight = new THREE.SpotLight(0xffffff);
    spotLight.intensity = 0.9; spotLight.position.set(-10, 40, 20); spotLight.lookAt(ball.position); spotLight.castShadow = true; scene.add(spotLight);
    scene.add(group);

    const renderLoop = () => {
      animationFrameIdRef.current = requestAnimationFrame(renderLoop);
      if (!groupRef.current || !rendererRef.current || !sceneRef.current || !cameraRef.current) return;
      groupRef.current.rotation.y += 0.005;
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };
    renderLoop();
  }, []); // No external React dependencies for initViz itself

  useEffect(() => {
    // Initialize visualization and set up resize listener
    if (mountRef.current && !rendererRef.current) { // Only init if mountRef is ready and not already initialized
        initViz();
    }
    handleResize(); // Call once after potential init to ensure correct size
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      rendererRef.current?.dispose();
      // Nullify refs on cleanup
      rendererRef.current = null; sceneRef.current = null; cameraRef.current = null;
      groupRef.current = null; ballRef.current = null; originalPositionsRef.current = null;
    };
  }, [initViz, handleResize]); // These callbacks are stable

  useEffect(() => {
    if (isSessionActive && ballRef.current && ballRef.current.geometry?.attributes.position) {
      updateBallMorph(ballRef.current, volumeLevel);
    } else if (!isSessionActive && ballRef.current && ballRef.current.geometry?.attributes.position && originalPositionsRef.current) {
      resetBallMorph(ballRef.current, originalPositionsRef.current);
    }
  }, [volumeLevel, isSessionActive, updateBallMorph, resetBallMorph]);

  const handleOrbClick = () => { toggleCall(); };

  return (
    <div ref={mountRef} id="out" onClick={handleOrbClick} className="hover:cursor-pointer" style={{ width: "100%", height: "100%", background: 'transparent', overflow: 'hidden' }}>
      {/* Canvas is dynamically added by Three.js */}
    </div>
  );
};
export default Orb;