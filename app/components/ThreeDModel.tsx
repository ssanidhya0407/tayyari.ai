'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { motion } from 'framer-motion';
import { Maximize2, Minimize2, RotateCcw } from 'lucide-react';

interface ThreeDModelProps {
  modelType: 'cube' | 'sphere' | 'molecule' | 'dna' | 'pyramid';
  title?: string;
  description?: string;
}

export default function ThreeDModel({ modelType, title, description }: ThreeDModelProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [isRotating, setIsRotating] = useState(true);
  
  useEffect(() => {
    if (!mountRef.current) return;
    
    // Set up scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x121212);
    
    // Set up camera
    const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
    camera.position.z = 5;
    
    // Set up renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    const mountNode = mountRef.current;
    mountNode.appendChild(renderer.domElement);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Add controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // Create geometry based on model type
    let mesh: THREE.Mesh;
    
    switch(modelType) {
      case 'sphere':
        const sphereGeometry = new THREE.SphereGeometry(2, 32, 32);
        const sphereMaterial = new THREE.MeshPhongMaterial({ 
          color: 0x3b82f6,
          shininess: 100,
          specular: 0x111111
        });
        mesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
        break;
        
      case 'molecule':
        // Create a simple molecule-like structure
        const group = new THREE.Group();
        
        // Central atom
        const centerSphere = new THREE.SphereGeometry(0.8, 32, 32);
        const centerMaterial = new THREE.MeshPhongMaterial({ color: 0x3b82f6 });
        const centerMesh = new THREE.Mesh(centerSphere, centerMaterial);
        group.add(centerMesh);
        
        // Outer atoms
        const positions = [
          [2, 0, 0],
          [-2, 0, 0],
          [0, 2, 0],
          [0, -2, 0],
          [0, 0, 2],
        ];
        
        positions.forEach((pos, i) => {
          const atomGeometry = new THREE.SphereGeometry(0.5, 16, 16);
          const atomMaterial = new THREE.MeshPhongMaterial({ 
            color: i % 2 === 0 ? 0xff5500 : 0x00ff55 
          });
          const atom = new THREE.Mesh(atomGeometry, atomMaterial);
          atom.position.set(pos[0], pos[1], pos[2]);
          
          // Add bond (cylinder)
          const direction = new THREE.Vector3(pos[0], pos[1], pos[2]);
          const bondGeometry = new THREE.CylinderGeometry(0.1, 0.1, direction.length(), 8);
          const bondMaterial = new THREE.MeshPhongMaterial({ color: 0xcccccc });
          const bond = new THREE.Mesh(bondGeometry, bondMaterial);
          
          // Position bond
          bond.position.copy(direction.clone().multiplyScalar(0.5));
          bond.lookAt(new THREE.Vector3(0, 0, 0));
          bond.rotateX(Math.PI / 2);
          
          group.add(atom);
          group.add(bond);
        });
        
        mesh = group as any;
        break;
        
      case 'dna':
        // Create DNA-like double helix
        const dnaGroup = new THREE.Group();
        
        // Parameters
        const turns = 2;
        const pointsPerTurn = 20;
        const radius = 1;
        const height = 5;
        const strandRadius = 0.1;
        const nucleotideRadius = 0.2;
        
        // Create two helical strands
        for (let strand = 0; strand < 2; strand++) {
          const strandPoints: THREE.Vector3[] = [];
          const strandOffset = strand === 0 ? 0 : Math.PI;
          
          for (let i = 0; i <= turns * pointsPerTurn; i++) {
            const angle = (i / pointsPerTurn) * Math.PI * 2 + strandOffset;
            const y = (i / (turns * pointsPerTurn)) * height - height / 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            strandPoints.push(new THREE.Vector3(x, y, z));
            
            // Add nucleotides at intervals
            if (i % 4 === 0) {
              const nucleotideGeometry = new THREE.SphereGeometry(nucleotideRadius, 8, 8);
              const nucleotideMaterial = new THREE.MeshPhongMaterial({
                color: strand === 0 ? 
                  (i % 8 === 0 ? 0x3b82f6 : 0xff5500) : 
                  (i % 8 === 0 ? 0x00ff55 : 0xffcc00)
              });
              const nucleotide = new THREE.Mesh(nucleotideGeometry, nucleotideMaterial);
              nucleotide.position.set(x, y, z);
              dnaGroup.add(nucleotide);
            }
          }
          
          // Create a tube along the helix
          const strandCurve = new THREE.CatmullRomCurve3(strandPoints);
          const strandGeometry = new THREE.TubeGeometry(strandCurve, turns * pointsPerTurn, strandRadius, 8, false);
          const strandMaterial = new THREE.MeshPhongMaterial({ 
            color: strand === 0 ? 0x3b82f6 : 0xff5500,
            shininess: 100
          });
          const strandMesh = new THREE.Mesh(strandGeometry, strandMaterial);
          dnaGroup.add(strandMesh);
        }
        
        // Add connecting "rungs" between strands
        for (let i = 0; i <= turns * pointsPerTurn; i += 4) {
          const angle1 = (i / pointsPerTurn) * Math.PI * 2;
          const angle2 = angle1 + Math.PI;
          const y = (i / (turns * pointsPerTurn)) * height - height / 2;
          
          const x1 = Math.cos(angle1) * radius;
          const z1 = Math.sin(angle1) * radius;
          const x2 = Math.cos(angle2) * radius;
          const z2 = Math.sin(angle2) * radius;
          
          const point1 = new THREE.Vector3(x1, y, z1);
          const point2 = new THREE.Vector3(x2, y, z2);
          
          // Create a cylinder between the points
          const direction = new THREE.Vector3().subVectors(point2, point1);
          const rungGeometry = new THREE.CylinderGeometry(0.05, 0.05, direction.length(), 8);
          const rungMaterial = new THREE.MeshPhongMaterial({ color: 0xcccccc });
          const rung = new THREE.Mesh(rungGeometry, rungMaterial);
          
          // Position and orient the cylinder
          rung.position.copy(point1.clone().add(direction.clone().multiplyScalar(0.5)));
          rung.lookAt(point2);
          rung.rotateX(Math.PI / 2);
          
          dnaGroup.add(rung);
        }
        
        mesh = dnaGroup as any;
        break;
        
      case 'pyramid':
        const pyramidGeometry = new THREE.ConeGeometry(2, 3, 4);
        const pyramidMaterial = new THREE.MeshPhongMaterial({
          color: 0x3b82f6,
          shininess: 100,
          specular: 0x111111,
          flatShading: true
        });
        mesh = new THREE.Mesh(pyramidGeometry, pyramidMaterial);
        break;
        
      case 'cube':
      default:
        // Create a colorful cube
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        
        const materials = [
          new THREE.MeshPhongMaterial({ color: 0x3b82f6 }), // blue
          new THREE.MeshPhongMaterial({ color: 0xec4899 }), // pink
          new THREE.MeshPhongMaterial({ color: 0x10b981 }), // green
          new THREE.MeshPhongMaterial({ color: 0xf59e0b }), // yellow
          new THREE.MeshPhongMaterial({ color: 0x6366f1 }), // indigo
          new THREE.MeshPhongMaterial({ color: 0xef4444 })  // red
        ];
        
        mesh = new THREE.Mesh(geometry, materials);
        break;
    }
    
    scene.add(mesh);
    
    // Animation loop
    const autoRotate = true;
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Auto-rotate if enabled
      if (autoRotate && isRotating) {
        if (mesh instanceof THREE.Group) {
          mesh.rotation.y += 0.005;
        } else {
          mesh.rotation.x += 0.005;
          mesh.rotation.y += 0.01;
        }
      }
      
      controls.update();
      renderer.render(scene, camera);
    };
    
    animate();
    
    // Handle resize
    const handleResize = () => {
      if (!mountNode) return;
      
      camera.aspect = mountNode.clientWidth / mountNode.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountNode.clientWidth, mountNode.clientHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountNode && renderer.domElement) {
        mountNode.removeChild(renderer.domElement);
      }
    };
  }, [modelType, isRotating]);
  
  return (
    <div className="my-4">
      <div className="bg-[#1E1E1E] p-3 rounded-t-md flex justify-between items-center border border-gray-700 border-b-0">
        <h3 className="text-white font-medium">{title || '3D Interactive Model'}</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsRotating(!isRotating)}
            className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-700 transition-colors"
            title={isRotating ? 'Stop rotation' : 'Start rotation'}
          >
            <RotateCcw size={16} className={!isRotating ? 'opacity-50' : ''} />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-700 transition-colors"
            title={expanded ? 'Minimize' : 'Expand'}
          >
            {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>
      
      <motion.div
        animate={{ height: expanded ? 400 : 250 }}
        className="relative bg-black border border-gray-700 rounded-b-md overflow-hidden"
      >
        <div
          ref={mountRef}
          className="w-full h-full"
          style={{ touchAction: 'none' }}
        />
      </motion.div>
      
      {description && (
        <div className="mt-2 text-sm text-gray-300 p-3 bg-[#1E1E1E] rounded-md border border-gray-700">
          {description}
        </div>
      )}
    </div>
  );
}