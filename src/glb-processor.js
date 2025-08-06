import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// loadMeshFromGlb 函数保持不变。
async function loadMeshFromGlb(file) {
  // ... (代码与之前版本完全相同)
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
  loader.setDRACOLoader(dracoLoader);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      loader.parse(event.target.result, '', (gltf) => {
        let mesh = null;
        gltf.scene.traverse((child) => {
          if (child.isMesh && !mesh) {
            mesh = child;
          }
        });
        if (mesh) {
          resolve(mesh);
        } else {
          reject(new Error('No mesh found in the GLB file.'));
        }
      }, (error) => reject(new Error(`Failed to parse GLB file: ${error.message}`)));
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}


/**
 * 辅助函数：创建一个颜色采样器。
 * 它将纹理绘制到内存中的canvas上，以便我们可以读取像素数据。
 * @param {THREE.Texture} texture - 模型的纹理贴图。
 * @returns {function(u, v): THREE.Color} - 一个函数，输入UV坐标，返回对应的颜色。
 */
function createTextureColorSampler(texture) {
  if (!texture || !texture.image) {
    // 如果没有纹理，返回一个总是提供默认颜色的函数
    const defaultColor = new THREE.Color(0xcccccc);
    return () => defaultColor;
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
    // 将[0,1]范围的UV坐标转换为图像的像素坐标
    const x = Math.floor(u * (image.width - 1));
    const y = Math.floor((1 - v) * (image.height - 1)); // V坐标通常是反的
    
    const index = (y * image.width + x) * 4;
    const r = data[index] / 255;
    const g = data[index + 1] / 255;
    const b = data[index + 2] / 255;
    
    return new THREE.Color(r, g, b);
  };
}


/**
 * [更高精度版] 通过在三角面片表面采样来体素化网格。
 * 这个版本能更好地捕捉曲面细节。
 * @param {THREE.Mesh} mesh - 要体素化的网格。
 * @param {number} resolution - 沿最长轴的体素数量。
 * @returns {Array<Object>} - 体素数据数组 [{ x, y, z, color }]。
 */
function voxelizeMesh(mesh, resolution) {
  mesh.updateWorldMatrix(true, true);
  const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
  geometry.center();
  geometry.computeBoundingBox();

  const box = geometry.boundingBox;
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const voxelSize = maxDim / resolution;

  const colorSampler = createTextureColorSampler(mesh.material.map);
  const voxelDataMap = new Map();

  const positionAttribute = geometry.getAttribute('position');
  const uvAttribute = geometry.getAttribute('uv');
  const indexAttribute = geometry.getIndex();

  console.log(`[High-Res Voxelizer] Step 1: Sampling points on triangle surfaces...`);
  // 步骤1: 获取所有三角面片的数据
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

  // 步骤2: 在每个三角面片的表面上随机采样点
  // 采样密度与三角面片面积和分辨率相关
  const samplingDensity = resolution * resolution * 2;
  const tempVec = new THREE.Vector3();
  const tempUv = new THREE.Vector2();

  triangles.forEach(tri => {
    const area = tri.vA.clone().sub(tri.vB).cross(tri.vA.clone().sub(tri.vC)).length() / 2;
    const numSamples = Math.ceil(area / (voxelSize * voxelSize)) * 5; // 动态采样密度

    for (let i = 0; i < numSamples; i++) {
      // 使用重心坐标在三角形内随机取点
      let a = Math.random();
      let b = Math.random();
      if (a + b > 1) { a = 1 - a; b = 1 - b; }
      const c = 1 - a - b;

      tempVec.set(0,0,0)
        .addScaledVector(tri.vA, a)
        .addScaledVector(tri.vB, b)
        .addScaledVector(tri.vC, c);

      const x = Math.round(tempVec.x / voxelSize);
      const y = Math.round(tempVec.y / voxelSize);
      const z = Math.round(tempVec.z / voxelSize);
      const key = `${x},${y},${z}`;

      if (!voxelDataMap.has(key)) {
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
        voxelDataMap.set(key, { color });
      }
    }
  });

  // 步骤3: 扫描线填充 (与之前相同)
  console.log(`[High-Res Voxelizer] Step 2: Filling interior...`);
  // 准备扫描线填充
  const yzMap = {};
  voxelDataMap.forEach((data, key) => {
    const [x, y, z] = key.split(',').map(Number);
    const yzKey = `${y},${z}`;
    if (!yzMap[yzKey]) yzMap[yzKey] = [];
    yzMap[yzKey].push(x);
  });
  
  // 扫描线填充并传播颜色
  for (const yzKey in yzMap) {
    const xCoords = yzMap[yzKey];
    if (xCoords.length < 2) continue;

    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);

    // 获取起始点的颜色作为填充色
    const startVoxelKey = `${minX},${yzKey}`;
    const fillColor = voxelDataMap.get(startVoxelKey)?.color || new THREE.Color(0xcccccc);

    for (let x = minX + 1; x < maxX; x++) {
      const key = `${x},${yzKey}`;
      // 只填充尚未存在的体素
      if (!voxelDataMap.has(key)) {
        voxelDataMap.set(key, { color: fillColor });
      }
    }
  }

  // 将Set转换为最终的数组格式
  const finalVoxels = Array.from(voxelDataMap.entries()).map(([key, data]) => {
    const [x, y, z] = key.split(',').map(Number);
    return { x, y, z, color: data.color };
  });

  console.log(`[High-Res Voxelizer] Voxelization complete. Generated ${finalVoxels.length} voxels.`);
  return finalVoxels;
}


/**
 * [新增] 应用平滑算法来优化体素数据。
 * 使用基于邻居数量的元胞自动机规则。
 * @param {Array<Object>} voxels - 原始体素数据数组。
 * @param {Object} options - 包含平滑参数的对象。
 * @param {number} options.iterations - 平滑处理的迭代次数。
 * @param {number} options.birthThreshold - 一个空格位拥有多少邻居时会"诞生"一个新体素。
 * @param {number} options.survivalThreshold - 一个现有体素至少需要多少邻居才能"存活"。
 * @returns {Array<Object>} - 平滑处理后的体素数据数组。
 */
function applySmoothing(voxels, options = {}) {
  const { 
    iterations = 1, 
    birthThreshold = 5, 
    survivalThreshold = 2 
  } = options;

  if (iterations === 0) return voxels;

  console.log(`[Smoother] Applying smoothing with ${iterations} iteration(s)...`);

  // 使用Set进行高效的邻居查找，使用Map保存颜色等元数据
  let voxelSet = new Set(voxels.map(v => `${v.x},${v.y},${v.z}`));
  const voxelDataMap = new Map(voxels.map(v => [`${v.x},${v.y},${v.z}`, { color: v.color }]));

  const countNeighbors = (x, y, z, currentSet) => {
    let count = 0;
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        for (let k = -1; k <= 1; k++) {
          if (i === 0 && j === 0 && k === 0) continue;
          if (currentSet.has(`${x + i},${y + j},${z + k}`)) {
            count++;
          }
        }
      }
    }
    return count;
  };

  for (let iter = 0; iter < iterations; iter++) {
    const nextVoxelSet = new Set();
    const checkedNeighbors = new Set(); // 避免对同一个空格重复计算

    // 遍历所有现有体素，决定它们是存活还是死亡，并检查它们的邻居是否诞生
    voxelSet.forEach(key => {
      const [x, y, z] = key.split(',').map(Number);
      
      // 规则1: 存活规则
      const survivalNeighbors = countNeighbors(x, y, z, voxelSet);
      if (survivalNeighbors >= survivalThreshold) {
        nextVoxelSet.add(key);
      }

      // 规则2: 诞生规则 (检查当前体素的所有邻居)
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          for (let k = -1; k <= 1; k++) {
            if (i === 0 && j === 0 && k === 0) continue;
            
            const nx = x + i, ny = y + j, nz = z + k;
            const neighborKey = `${nx},${ny},${nz}`;
            
            if (!voxelSet.has(neighborKey) && !checkedNeighbors.has(neighborKey)) {
              checkedNeighbors.add(neighborKey);
              const birthNeighbors = countNeighbors(nx, ny, nz, voxelSet);
              if (birthNeighbors >= birthThreshold) {
                nextVoxelSet.add(neighborKey);
                // 继承父体素的颜色
                voxelDataMap.set(neighborKey, voxelDataMap.get(key));
              }
            }
          }
        }
      }
    });
    voxelSet = nextVoxelSet;
  }

  // 将最终的Set转换回数组格式
  const smoothedVoxels = Array.from(voxelSet).map(key => {
    const [x, y, z] = key.split(',').map(Number);
    const data = voxelDataMap.get(key);
    return { x, y, z, color: data.color };
  });
  
  console.log(`[Smoother] Smoothing complete. Final voxel count: ${smoothedVoxels.length}`);
  return smoothedVoxels;
}

// 修改主函数，在返回结果前调用平滑函数
export async function processGlbToVoxels(file, options = {}) {
  const resolution = options.resolution || 30;
  const smoothingIterations = options.smoothingIterations || 0;

  if (!file || !file.name.toLowerCase().endsWith('.glb')) {
    throw new Error('Please select a valid .glb file.');
  }

  try {
    const mesh = await loadMeshFromGlb(file);
    // 1. 先进行体素化
    const rawVoxels = voxelizeMesh(mesh, resolution);
    // 2. 如果需要，再进行平滑处理
    const finalVoxels = applySmoothing(rawVoxels, { iterations: smoothingIterations });
    
    return finalVoxels;
  } catch (error) {
    console.error('[GLB Processor] Error:', error);
    throw error;
  }
}
