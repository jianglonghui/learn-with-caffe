import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
// Configuration constants
const CONFIG = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB limit
  DEFAULT_RESOLUTION: 30,
  MAX_RESOLUTION: 200,
  SAMPLING_DENSITY: 2, // Reduced from 5
  DEFAULT_COLOR: 0xcccccc
};

function validateGlbFile(file) {
  if (!file) {
    throw new Error('No file provided');
  }
  
  if (file.size > CONFIG.MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size: ${CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }
  
  if (!file.name.toLowerCase().endsWith('.glb')) {
    throw new Error('Invalid file format. Please provide a .glb file');
  }
  
  return true;
}

/**
 * Load mesh from GLB file with better error handling
 */
async function loadMeshFromGlb(file) {
  validateGlbFile(file);
  
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
  loader.setDRACOLoader(dracoLoader);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const buffer = event.target.result;
        if (buffer.byteLength === 0) {
          throw new Error('Empty file');
        }
        
        loader.parse(buffer, '', (gltf) => {
          let mesh = null;
          let meshCount = 0;
          
          gltf.scene.traverse((child) => {
            if (child.isMesh) {
              meshCount++;
              if (!mesh) mesh = child;
            }
          });
          
          if (mesh) {
            console.log(`Found ${meshCount} mesh(es), using the first one`);
            resolve(mesh);
          } else {
            reject(new Error('No mesh found in the GLB file'));
          }
        }, (error) => {
          reject(new Error(`Failed to parse GLB file: ${error.message}`));
        });
      } catch (error) {
        reject(new Error(`File reading error: ${error.message}`));
      }
    };
    
    reader.onerror = () => reject(new Error('File reading failed'));
    reader.readAsArrayBuffer(file);
  });
}

// createTextureColorSampler 函数保持不变
/**
 * Create texture color sampler with better boundary handling
 */
function createTextureColorSampler(texture) {
  if (!texture || !texture.image) {
    const defaultColor = new THREE.Color(CONFIG.DEFAULT_COLOR);
    return () => defaultColor.clone();
  }

  const image = texture.image;
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, image.width, image.height);
  const data = imageData.data;

  return (u, v) => {
    // Clamp UV coordinates to [0, 1] and handle boundaries properly
    const clampedU = Math.max(0, Math.min(1, u));
    const clampedV = Math.max(0, Math.min(1, v));
    
    const x = Math.min(Math.floor(clampedU * image.width), image.width - 1);
    const y = Math.min(Math.floor((1 - clampedV) * image.height), image.height - 1);
    
    const index = (y * image.width + x) * 4;
    const r = data[index] / 255;
    const g = data[index + 1] / 255;
    const b = data[index + 2] / 255;
    
    return new THREE.Color(r, g, b);
  };
}

/**
 * [仅生成精确表面颜色版]
 * @param {THREE.Mesh} mesh - 要体素化的网格。
 * @param {number} resolution - 沿最长轴的体素数量。
 * @returns {Array<Object>} - 仅包含表面体素的数据数组 [{ x, y, z, color }]。
 */
function voxelizeMesh(mesh, resolution) {
  // --- 步骤 1: 准备工作 (与之前类似) ---
  mesh.updateWorldMatrix(true, true);
  const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
  geometry.computeBoundingBox();

  const box = geometry.boundingBox;
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const voxelSize = maxDim / resolution;

  const colorSampler = createTextureColorSampler(mesh.material.map);
  const positionAttribute = geometry.getAttribute('position');
  const uvAttribute = geometry.getAttribute('uv');
  const indexAttribute = geometry.getIndex();
  
  // 核心改动：Map的值是一个对象，包含一个颜色数组
  const voxelColorSamples = new Map();
  
  console.log(`[Surface Voxelizer] Step 1: Sampling surface points and collecting colors...`);
  
  // --- 步骤 2: 表面采样与颜色收集 ---
  const triangles = [];
  for (let i = 0; i < indexAttribute.count; i += 3) {
    const iA = indexAttribute.getX(i);
    const iB = indexAttribute.getX(i + 1);
    const iC = indexAttribute.getX(i + 2);

    const vA = new THREE.Vector3().fromBufferAttribute(positionAttribute, iA);
    const vB = new THREE.Vector3().fromBufferAttribute(positionAttribute, iB);
    const vC = new THREE.Vector3().fromBufferAttribute(positionAttribute, iC);
    
    const uvA = uvAttribute ? new THREE.Vector2().fromBufferAttribute(uvAttribute, iA) : null;
    const uvB = uvAttribute ? new THREE.Vector2().fromBufferAttribute(uvAttribute, iB) : null;
    const uvC = uvAttribute ? new THREE.Vector2().fromBufferAttribute(uvAttribute, iC) : null;

    triangles.push({ vA, vB, vC, uvA, uvB, uvC });
  }

  const tempVec = new THREE.Vector3();
  const tempUv = new THREE.Vector2();

  triangles.forEach(tri => {
    const area = tri.vA.clone().sub(tri.vB).cross(tri.vA.clone().sub(tri.vC)).length() / 2;
    // 动态采样密度对于表面渲染尤其重要
    const numSamples = Math.ceil(area / (voxelSize * voxelSize)) * 10; // 可以适当增加采样密度以提高精度

    for (let i = 0; i < numSamples; i++) {
      let a = Math.random();
      let b = Math.random();
      if (a + b > 1) { a = 1 - a; b = 1 - b; }
      const c = 1 - a - b;

      tempVec.set(0,0,0)
        .addScaledVector(tri.vA, a)
        .addScaledVector(tri.vB, b)
        .addScaledVector(tri.vC, c);

      const relativePoint = tempVec.clone().sub(box.min);
      const x = Math.floor(relativePoint.x / voxelSize);
      const y = Math.floor(relativePoint.y / voxelSize);
      const z = Math.floor(relativePoint.z / voxelSize);
      const key = `${x},${y},${z}`;

      let color;
      if (tri.uvA) {
          tempUv.set(0,0)
            .addScaledVector(tri.uvA, a)
            .addScaledVector(tri.uvB, b)
            .addScaledVector(tri.uvC, c);
          color = colorSampler(tempUv.x, tempUv.y);
      } else {
          color = mesh.material.color || new THREE.Color(0xcccccc);
      }

      // 如果键不存在，则初始化；然后将颜色推入数组
      if (!voxelColorSamples.has(key)) {
        voxelColorSamples.set(key, { colors: [] });
      }
      voxelColorSamples.get(key).colors.push(color);
    }
  });

  // --- 步骤 3: 计算平均色并格式化输出 ---
  console.log(`[Surface Voxelizer] Step 2: Averaging colors and formatting output...`);
  
  const finalVoxels = [];
  for (const [key, data] of voxelColorSamples.entries()) {
    const colorCount = data.colors.length;
    if (colorCount === 0) continue;

    // 计算平均色
    let r = 0, g = 0, b = 0;
    data.colors.forEach(c => {
      r += c.r;
      g += c.g;
      b += c.b;
    });
    const finalColor = new THREE.Color(r / colorCount, g / colorCount, b / colorCount);

    const [x, y, z] = key.split(',').map(Number);
    finalVoxels.push({ x, y, z, color: finalColor });
  }

  // 中心化逻辑仍然有用，让模型居中
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  finalVoxels.forEach(v => {
      minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
      minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
      minZ = Math.min(minZ, v.z); maxZ = Math.max(maxZ, v.z);
  });
  
  const centerX = Math.floor(minX + (maxX - minX) / 2);
  const centerY = Math.floor(minY + (maxY - minY) / 2);
  const centerZ = Math.floor(minZ + (maxZ - minZ) / 2);
  
  const centeredVoxels = finalVoxels.map(v => ({
    ...v,
    x: v.x - centerX,
    y: v.y - centerY,
    z: v.z - centerZ,
  }));
  
  console.log(`[Surface Voxelizer] Voxelization complete. Generated ${centeredVoxels.length} surface voxels.`);
  return centeredVoxels;
}


// 主函数的调用也变得更简单
export async function processGlbToVoxels(file, options = {}) {
  const resolution = options.resolution || 30;
  // 不再需要平滑选项
  
  if (!file || !file.name.toLowerCase().endsWith('.glb')) {
    throw new Error('Please select a valid .glb file.');
  }

  try {
    const mesh = await loadMeshFromGlb(file);
    // 直接调用新的、精简的体素化函数
    const surfaceVoxels = voxelizeMesh(mesh, resolution);
    return surfaceVoxels;
  } catch (error) {
    console.error('[GLB Processor] Error:', error);
    throw error;
  }
}