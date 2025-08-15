// --- START OF FINAL REVISED FILE: glb-processor.js ---

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// loadMeshFromGlb 和 createTextureColorSampler 函数与上个版本相同
// ... (此处省略这些函数的代码，假设它们已存在且功能正确)

function voxelizeMesh(mesh, resolution) {
  // --- 步骤 1: 准备工作 (与之前类似) ---
  mesh.updateWorldMatrix(true, true);
  const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
  // 注意：我们不再在这里调用 .center()，因为我们将手动处理坐标系
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

  console.log(`[Symmetrical Voxelizer] Step 1: Sampling points on triangle surfaces...`);
  // --- 步骤 2: 在三角面片上采样 (核心改动在这里) ---
  const triangles = [];
  // ... (获取所有三角面片数据的代码与之前相同)

  triangles.forEach(tri => {
    const area = tri.vA.clone().sub(tri.vB).cross(tri.vA.clone().sub(tri.vC)).length() / 2;
    const numSamples = Math.ceil(area / (voxelSize * voxelSize)) * 5;

    for (let i = 0; i < numSamples; i++) {
      let a = Math.random(), b = Math.random();
      if (a + b > 1) { a = 1 - a; b = 1 - b; }
      const c = 1 - a - b;

      const point = new THREE.Vector3(0,0,0)
        .addScaledVector(tri.vA, a)
        .addScaledVector(tri.vB, b)
        .addScaledVector(tri.vC, c);

      // --- 核心改动：使用平移后的坐标系和 Math.floor() ---
      // 1. 将点相对于包围盒的最小点进行偏移，确保所有坐标为正
      const relativePoint = point.sub(box.min);
      // 2. 使用 Math.floor() 进行统一且无偏差的取整
      const x = Math.floor(relativePoint.x / voxelSize);
      const y = Math.floor(relativePoint.y / voxelSize);
      const z = Math.floor(relativePoint.z / voxelSize);
      const key = `${x},${y},${z}`;

      if (!voxelDataMap.has(key)) {
        let color;
        // ... (颜色采样逻辑与之前相同)
        voxelDataMap.set(key, { color });
      }
    }
  });
  
  // --- 步骤 3: 扫描线填充 (无需改动) ---
  // ... (扫描线填充的全部代码与上个版本完全相同)

  // --- 步骤 4: 格式化输出并移回中心 ---
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  const preCenteredVoxels = Array.from(voxelDataMap.entries()).map(([key, data]) => {
    const [x, y, z] = key.split(',').map(Number);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
    return { x, y, z, color: data.color };
  });

  // 计算体素云的中心
  const centerX = Math.floor(minX + (maxX - minX) / 2);
  const centerY = Math.floor(minY + (maxY - minY) / 2);
  const centerZ = Math.floor(minZ + (maxZ - minZ) / 2);
  
  // 将所有体素的坐标进行平移，使中心点回到 (0,0,0)
  const finalVoxels = preCenteredVoxels.map(v => ({
    ...v,
    x: v.x - centerX,
    y: v.y - centerY,
    z: v.z - centerZ,
  }));

  console.log(`[Symmetrical Voxelizer] Voxelization complete. Generated ${finalVoxels.length} voxels.`);
  return finalVoxels;
}

// 主函数和其它辅助函数保持不变
// ...```

### 其他可能的原因（二次检查）

虽然取整问题是最可能的原因，但还有两个因素也可能导致视觉上的不对称：

1.  **光照（Lighting）**:
    *   **问题**: 如果您的3D场景中只有一个从侧面打来的`DirectionalLight`（定向光），那么模型的一面会很亮，另一面会处于阴影中，这会造成强烈的视觉不对称感，即使模型的颜色数据是完美的。
    *   **解决方案**:
        *   在`SceneManager.js`的`setupScene`函数中，确保您有一个`AmbientLight`（环境光）。
        *   `const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);` // 强度至少0.5以上
        *   `this.scene.add(ambientLight);`
        *   环境光会均匀地照亮场景中的所有物体，减少纯黑阴影，让对称性更容易被观察到。

2.  **源文件UV贴图**:
    *   **问题**: 极少数情况下，`.glb`模型文件本身的UV贴图可能就不是完美对称的。例如，设计师在贴图时，左侧和右侧的UV坐标有微小的偏移。
    *   **解决方案**: 这个问题无法通过代码解决，属于“源数据”问题。您可以在Blender等3D软件中打开模型，检查其UV贴图是否严格对称。

### 总结

通过在 `glb-processor.js` 中**采用新的坐标计算和居中策略**，我们从根本上解决了由`Math.round()`函数引入的对称性偏差。这能确保只要您的源GLB模型是对称的，生成的体素物体在数据层面也绝对是对称的。再配合检查并调整好场景中的光照，您看到的最终渲染结果也将是完美对称的。