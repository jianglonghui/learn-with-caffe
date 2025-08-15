// --- START OF FINAL REVISED FILE: glb-processor.js ---

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// loadMeshFromGlb 和 createTextureColorSampler 函数与上个版本相同
// ... (此处省略这些函数的代码，假设它们已存在且功能正确)


/**
 * [带智能颜色传播的高精度版]
 * @param {THREE.Mesh} mesh - 要体素化的网格。
 * @param {number} resolution - 沿最长轴的体素数量。
 * @returns {Array<Object>} - 体素数据数组 [{ x, y, z, color }]。
 */
function voxelizeMesh(mesh, resolution) {
  // --- 步骤 1: 准备工作 (与之前类似) ---
  mesh.updateWorldMatrix(true, true);
  const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
  geometry.center();
  geometry.computeBoundingBox();

  const box = geometry.boundingBox;
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const voxelSize = maxDim / resolution;

  const colorSampler = createTextureColorSampler(mesh.material.map);
  const positionAttribute = geometry.getAttribute('position');
  const uvAttribute = geometry.getAttribute('uv');
  const indexAttribute = geometry.getIndex();
  
  // surfaceVoxelDataMap 只存储带颜色的物体外壳
  const surfaceVoxelDataMap = new Map();
  
  console.log(`[Smart Color Voxelizer] Step 1: Generating colored surface voxels...`);
  // --- 步骤 2: 生成高精度的带色外壳 (与之前相同) ---
  // (此处省略在三角面片上采样的代码，假设它能正确填充 surfaceVoxelDataMap)
  // ...

  // --- 步骤 3: 确定物体的完整形状 (使用扫描线，但不传播颜色) ---
  console.log(`[Smart Color Voxelizer] Step 2: Determining full object shape...`);
  const totalVoxelSet = new Set(surfaceVoxelDataMap.keys());
  const yzMap = {};
  surfaceVoxelDataMap.forEach((data, key) => {
    const [x, y, z] = key.split(',').map(Number);
    const yzKey = `${y},${z}`;
    if (!yzMap[yzKey]) yzMap[yzKey] = [];
    yzMap[yzKey].push(x);
  });

  for (const yzKey in yzMap) {
    const xCoords = yzMap[yzKey];
    if (xCoords.length < 2) continue;
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    for (let x = minX + 1; x < maxX; x++) {
      totalVoxelSet.add(`${x},${yzKey}`);
    }
  }

  // --- 步骤 4: 智能颜色传播 (核心改动) ---
  console.log(`[Smart Color Voxelizer] Step 3: Propagating color using BFS...`);
  
  // finalVoxelDataMap 将存储我们最终的结果
  const finalVoxelDataMap = new Map(surfaceVoxelDataMap);
  // queue 用于广度优先搜索，初始值为所有表面体素
  const queue = Array.from(surfaceVoxelDataMap.keys());

  const directions = [
    { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 },
  ];

  let head = 0;
  while (head < queue.length) {
    const currentKey = queue[head++];
    const [x, y, z] = currentKey.split(',').map(Number);
    const parentColor = finalVoxelDataMap.get(currentKey).color;

    for (const dir of directions) {
      const neighborKey = `${x + dir.x},${y + dir.y},${z + dir.z}`;

      // 如果邻居是物体的一部分，但尚未被着色
      if (totalVoxelSet.has(neighborKey) && !finalVoxelDataMap.has(neighborKey)) {
        // 将邻居染上与当前体素相同的颜色
        finalVoxelDataMap.set(neighborKey, { color: parentColor });
        // 将新着色的邻居加入队列，以便继续传播
        queue.push(neighborKey);
      }
    }
  }

  // --- 步骤 5: 格式化输出 (与之前相同) ---
  const finalVoxels = Array.from(finalVoxelDataMap.entries()).map(([key, data]) => {
    const [x, y, z] = key.split(',').map(Number);
    return { x, y, z, color: data.color };
  });

  console.log(`[Smart Color Voxelizer] Voxelization complete. Generated ${finalVoxels.length} voxels.`);
  return finalVoxels;
}


// 主函数 processGlbToVoxels 保持不变，它会调用新的 voxelizeMesh
export async function processGlbToVoxels(file, options = {}) {
  // ... (代码与之前版本完全相同)
}

// 确保将其他辅助函数 (loadMeshFromGlb, createTextureColorSampler, 和之前的高精度表面采样代码) 粘贴回来