// components/orb.tsx
"use client";
import React, { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import useVapi from "@/hooks/use-vapi";

const Orb: React.FC = () => {
  const { volumeLevel, isSessionActive, toggleCall } = useVapi();
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const ballRef = useRef<THREE.Mesh | null>(null);
  const originalPositionsRef = useRef<Float32Array | null>(null);
  const noiseRef = useRef(require('simplex-noise').createNoise3D());
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

  const initViz = useCallback(() => {
    if (!mountRef.current || rendererRef.current) {
        // console.log("[Orb] initViz: Called but no mount point or renderer already exists.");
        return;
    }
    const currentMount = mountRef.current;
    const { clientWidth, clientHeight } = currentMount;

    if (clientWidth === 0 || clientHeight === 0) {
      console.warn("[Orb] initViz: Mount point has zero dimensions on initViz call. This specific call to initViz will bail.");
      return; 
    }
    console.log(`[Orb] initViz: Initializing with dimensions ${clientWidth}x${clientHeight}`);

    const scene = new THREE.Scene();
    scene.background = null;
    const group = new THREE.Group();
    const camera = new THREE.PerspectiveCamera(45, clientWidth / clientHeight, 0.5, 100);
    camera.position.set(0, 0, 100); camera.lookAt(scene.position); scene.add(camera);
    sceneRef.current = scene; groupRef.current = group; cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: false });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
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
  }, []); // initViz is stable

  const handleResize = useCallback(() => {
    if (!mountRef.current) return; // No mount point, do nothing

    const { clientWidth, clientHeight } = mountRef.current;

    if (clientWidth === 0 || clientHeight === 0) {
        // console.log("[Orb] handleResize: Zero dimensions, skipping resize/init.");
        return;
    }

    if (!rendererRef.current) { // If renderer isn't setup yet, AND we have dimensions, try to init
        // console.log("[Orb] handleResize: Renderer not ready, attempting initViz.");
        initViz(); // initViz will check dimensions again
    } else if (cameraRef.current && rendererRef.current) { // If already initialized, just resize
        // console.log(`[Orb] handleResize: Resizing existing canvas to: ${clientWidth}x${clientHeight}`);
        cameraRef.current.aspect = clientWidth / clientHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(clientWidth, clientHeight);
    }
  }, [initViz]); // initViz is a stable dependency

  useEffect(() => {
    // This effect handles initial setup and attaching/detaching resize listener
    // console.log("[Orb] Mount/update useEffect for init and resize listener.");
    
    // Attempt to initialize or resize on mount/update
    // The timeout gives the browser a moment to calculate layout, especially in an iframe
    const mountTimer = setTimeout(() => {
        if (mountRef.current) {
            handleResize(); // This will call initViz if needed and dimensions are ready
        }
    }, 50); // Small delay

    window.addEventListener("resize", handleResize);
    
    return () => {
      clearTimeout(mountTimer);
      window.removeEventListener("resize", handleResize);
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      rendererRef.current?.dispose();
      rendererRef.current = null; sceneRef.current = null; cameraRef.current = null;
      groupRef.current = null; ballRef.current = null; originalPositionsRef.current = null;
      // console.log("[Orb] Cleaned up viz on unmount.");
    };
  }, [handleResize, initViz]); // initViz and handleResize are stable callbacks

  useEffect(() => { // Morphing effect
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