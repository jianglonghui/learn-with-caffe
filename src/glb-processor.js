import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// =============================================================================
// 1. UTILITY FUNCTIONS
// =============================================================================

async function loadMeshFromGlb(file) {
  console.log('[Loader] Starting GLB load...');
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
  loader.setDRACOLoader(dracoLoader);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target?.result) {
        return reject(new Error("File could not be read."));
      }
      loader.parse(event.target.result, '', (gltf) => {
        const scene = new THREE.Scene();
        scene.add(new THREE.AmbientLight(0xffffff, 0.8));
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
        directionalLight.position.set(0.5, 1, 1);
        scene.add(directionalLight);
        scene.add(gltf.scene);

        gltf.scene.updateMatrixWorld(true);
        console.log('[Loader] GLB parsed and scene created.');
        resolve({ scene, mesh: gltf.scene });
      }, (error) => reject(new Error(`Failed to parse GLB file: ${error.message}`)));
    };
    reader.onerror = (error) => reject(new Error(`File reading failed: ${error.message}`));
    reader.readAsArrayBuffer(file);
  });
}

// =============================================================================
// 2. SHAPE GENERATION (No changes here)
// =============================================================================

function solidVoxelize(meshObject, resolution) {
  console.log('[Shape Voxelizer] Starting solid voxelization...');
  
  const allGeometries = [];
  meshObject.traverse((child) => {
    if (child.isMesh && child.geometry) {
      allGeometries.push(child.geometry.clone().applyMatrix4(child.matrixWorld));
    }
  });

  if (allGeometries.length === 0) throw new Error("No valid mesh geometries found in GLB.");

  const mergedGeometry = new THREE.BufferGeometry();
  const positions = [];
  allGeometries.forEach(geometry => {
    const positionAttribute = geometry.getAttribute('position');
    for (let i = 0; i < positionAttribute.count; i++) {
      positions.push(...new THREE.Vector3().fromBufferAttribute(positionAttribute, i).toArray());
    }
  });
  mergedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  mergedGeometry.computeBoundingBox();

  const box = mergedGeometry.boundingBox;
  if (!box) throw new Error("Could not compute bounding box.");
  
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const voxelSize = maxDim / resolution;

  console.log(`[Shape Voxelizer] Voxel Size: ${voxelSize.toFixed(4)}`);

  const surfaceVoxels = new Set();
  const positionAttribute = mergedGeometry.getAttribute('position');
  for (let i = 0; i < positionAttribute.count; i++) {
    const pt = new THREE.Vector3().fromBufferAttribute(positionAttribute, i);
    const x = Math.round((pt.x - box.min.x) / voxelSize);
    const y = Math.round((pt.y - box.min.y) / voxelSize);
    const z = Math.round((pt.z - box.min.z) / voxelSize);
    surfaceVoxels.add(`${x},${y},${z}`);
  }

  const allVoxels = new Set(surfaceVoxels);
  const yzMap = {};
  surfaceVoxels.forEach(key => {
    const [x, y, z] = key.split(',').map(Number);
    const yzKey = `${y},${z}`;
    if (!yzMap[yzKey]) yzMap[yzKey] = [];
    yzMap[yzKey].push(x);
  });

  for (const yzKey in yzMap) {
    const xCoords = yzMap[yzKey].sort((a, b) => a - b);
    if (xCoords.length > 1) {
      for (let x = xCoords[0]; x <= xCoords[xCoords.length - 1]; x++) {
        allVoxels.add(`${x},${yzKey}`);
      }
    }
  }

  const finalSurfaceVoxels = new Set();
  const directions = [
    {x: 1, y: 0, z: 0}, {x: -1, y: 0, z: 0}, {x: 0, y: 1, z: 0},
    {x: 0, y: -1, z: 0}, {x: 0, y: 0, z: 1}, {x: 0, y: 0, z: -1}
  ];

  allVoxels.forEach(key => {
    const [x, y, z] = key.split(',').map(Number);
    for (const dir of directions) {
      const neighborKey = `${x + dir.x},${y + dir.y},${z + dir.z}`;
      if (!allVoxels.has(neighborKey)) {
        finalSurfaceVoxels.add(key);
        break;
      }
    }
  });

  console.log(`[Shape Voxelizer] Complete! Generated ${allVoxels.size} solid voxels, ${finalSurfaceVoxels.size} surface voxels.`);
  
  return { 
    solidVoxels: Array.from(allVoxels).map(key => {
        const [x, y, z] = key.split(',').map(Number);
        return { x, y, z };
    }),
    surfaceVoxelSet: finalSurfaceVoxels, 
    voxelSize, 
    boundingBox: box,
  };
}


// =============================================================================
// 3. 简化的颜色分配 (通过渲染投影)
// =============================================================================

async function getProjectionColorMap(surfaceVoxelSet, boundingBox, voxelSize, scene, renderer, progressCallback) {
    console.log('[Color Assigner] Starting simplified color assignment via projection...');
    
    const PROBE_RESOLUTION = 256;
    const voxelColorMap = new Map(); // 只返回这个颜色映射
    
    const size = boundingBox.getSize(new THREE.Vector3());
    const center = boundingBox.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    const camera = new THREE.OrthographicCamera();
    const renderTarget = new THREE.WebGLRenderTarget(PROBE_RESOLUTION, PROBE_RESOLUTION);

    const views = [
      { dir: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 1, 0) }, { dir: new THREE.Vector3(-1, 0, 0), up: new THREE.Vector3(0, 1, 0) },
      { dir: new THREE.Vector3(0, 1, 0), up: new THREE.Vector3(0, 0, -1) }, { dir: new THREE.Vector3(0, -1, 0), up: new THREE.Vector3(0, 0, 1) },
      { dir: new THREE.Vector3(0, 0, 1), up: new THREE.Vector3(0, 1, 0) }, { dir: new THREE.Vector3(0, 0, -1), up: new THREE.Vector3(0, 1, 0) },
    ];

    for (let i = 0; i < views.length; i++) {
      const view = views[i];
      if (progressCallback) progressCallback(`Projecting view ${i + 1}/6...`);
      
      const camSize = Math.max(size.x, size.y, size.z) * 1.1;
      camera.left = -camSize / 2; camera.right = camSize / 2;
      camera.top = camSize / 2; camera.bottom = camSize / 2;
      camera.near = 0.01; camera.far = maxDim * 2;

      camera.position.copy(center).add(view.dir.clone().multiplyScalar(maxDim));
      camera.up.copy(view.up);
      camera.lookAt(center);
      camera.updateMatrixWorld(true);
      camera.updateProjectionMatrix();

      renderer.setRenderTarget(renderTarget);
      renderer.render(scene, camera);
      const colorBuffer = new Uint8Array(PROBE_RESOLUTION * PROBE_RESOLUTION * 4);
      renderer.readRenderTargetPixels(renderTarget, 0, 0, PROBE_RESOLUTION, PROBE_RESOLUTION, colorBuffer);
      renderer.setRenderTarget(null);

      for (const key of surfaceVoxelSet) {
        const [vx, vy, vz] = key.split(',').map(Number);
        const worldPos = new THREE.Vector3(
          boundingBox.min.x + (vx + 0.5) * voxelSize,
          boundingBox.min.y + (vy + 0.5) * voxelSize,
          boundingBox.min.z + (vz + 0.5) * voxelSize
        );
        
        const projectedPos = worldPos.clone().project(camera);
        
        if (projectedPos.z < 1) {
            const u = projectedPos.x * 0.5 + 0.5;
            const v = projectedPos.y * 0.5 + 0.5;

            if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
                const px = Math.floor(u * PROBE_RESOLUTION);
                const py = Math.floor(v * PROBE_RESOLUTION);
                const idx = (py * PROBE_RESOLUTION + px) * 4;

                if (colorBuffer[idx+3] > 0) {
                    const color = new THREE.Color(colorBuffer[idx]/255, colorBuffer[idx+1]/255, colorBuffer[idx+2]/255);
                    voxelColorMap.set(key, color);
                }
            }
        }
      }
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    console.log(`[Color Assigner] Finished projection. Found colors for ${voxelColorMap.size} surface voxels.`);
    renderTarget.dispose();
    
    return voxelColorMap; // 只返回颜色映射表
}

// =============================================================================
// 4. 主处理函数
// =============================================================================

export async function processGlbToVoxels(file, renderer, options = {}, progressCallback = null) {
  const resolution = options.resolution || 64;

  try {
    if (progressCallback) progressCallback('Loading GLB file...');
    const { scene, mesh } = await loadMeshFromGlb(file);
    
    if (progressCallback) progressCallback('Voxelizing mesh shape...');
    const { solidVoxels, surfaceVoxelSet, voxelSize, boundingBox } = solidVoxelize(mesh, resolution);
    
    if (solidVoxels.length === 0) throw new Error("Voxelization failed.");
    
    if (progressCallback) progressCallback('Getting projection color map...');
    const colorMap = await getProjectionColorMap(surfaceVoxelSet, boundingBox, voxelSize, scene, renderer, progressCallback);
    
    if (progressCallback) progressCallback('Building final colored model...');
    
    // --- 正确的合并逻辑 ---
    const coloredVoxels = [];
    const internalColor = new THREE.Color(0x333333);
    const defaultSurfaceColor = new THREE.Color(0x808080); // 如果投影没找到颜色，使用的备用色

    for (const voxel of solidVoxels) {
        const key = `${voxel.x},${voxel.y},${voxel.z}`;
        let finalColor = internalColor; // 默认是内部颜色

        if (surfaceVoxelSet.has(key)) {
            // 如果是表面体素，就从颜色映射表里找颜色
            finalColor = colorMap.get(key) || defaultSurfaceColor;
        }

        coloredVoxels.push({ ...voxel, color: finalColor });
    }
    // --- 结束 ---

    if (progressCallback) progressCallback('Centering voxel model...');
    
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    coloredVoxels.forEach(v => {
      minX = Math.min(minX, v.x); minY = Math.min(minY, v.y); minZ = Math.min(minZ, v.z);
    });

    const centeredVoxels = coloredVoxels.map(v => ({
      ...v,
      x: v.x - minX,
      y: v.y - minY,
      z: v.z - minZ,
    }));
    
    if (progressCallback) progressCallback('Voxelization complete!');
    console.log(`[Complete] Voxelization finished. Generated ${centeredVoxels.length} final voxels.`);
    
    return centeredVoxels;

  } catch (error) {
    console.error('[GLB Processor] A critical error occurred:', error);
    if (progressCallback) progressCallback(`Error: ${error.message}`);
    throw error;
  }
}