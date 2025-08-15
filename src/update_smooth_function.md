原始的体素化结果就像是“像素画”的3D版本，充满了锯齿和方块感。要使其表面平滑，我们需要对生成的体素数据进行一次**“后处理”（Post-processing）**。

我们将采用一种非常有效且在视觉上令人愉悦的算法，它类似于**元胞自动机（Cellular Automata）**。其核心思想非常简单，就像社会规则一样：

1.  **物以类聚**：一个孤零零的体素块，如果它周围几乎没有邻居，那它很可能是个“噪点”，应该被**移除**。
2.  **填补空缺**：一个空的区域，如果它被大量的体素块包围，那它很可能是一个不小心留下的“空洞”，应该被**填满**。

通过多次迭代这个过程，模型就会自然地“收缩”掉毛刺，“填充”好内部，从而变得更加平滑和有机。

---

### 第1步：在 `glb-processor.js` 中添加平滑算法

我们将创建一个新的、独立的函数`applySmoothing`，它可以接收体素数据并返回平滑后的版本。

**请用以下最终版本，再次替换 `glb-processor.js` 的全部内容。** 这个版本包含了之前所有的高级功能，并新增了平滑处理。

```javascript
// --- START OF FINAL REVISED FILE: glb-processor.js ---

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// loadMeshFromGlb, createTextureColorSampler, 和 voxelizeMesh 函数与上个版本相同
// ... (此处省略这些函数的代码，假设它们已存在且功能正确)

/**
 * [新增] 应用平滑算法来优化体素数据。
 * 使用基于邻居数量的元胞自动机规则。
 * @param {Array<Object>} voxels - 原始体素数据数组。
 * @param {Object} options - 包含平滑参数的对象。
 * @param {number} options.iterations - 平滑处理的迭代次数。
 * @param {number} options.birthThreshold - 一个空格位拥有多少邻居时会“诞生”一个新体素。
 * @param {number} options.survivalThreshold - 一个现有体素至少需要多少邻居才能“存活”。
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
```

### 第2步：在 `world_simulator.js` 中添加平滑选项UI

现在我们需要让用户能够控制平滑的强度（即迭代次数）。

#### a) 添加新状态

```javascript
// VoxelWorldEditor.js

const VoxelWorldEditor = () => {
  // ... 其他状态
  const [glbResolution, setGlbResolution] = useState(40);
  // 新增
  const [glbSmoothing, setGlbSmoothing] = useState(1); // 默认平滑1次
  // ...
```

#### b) 更新 `GlbOptionsModal` 组件

在分辨率滑块下面，再添加一个平滑强度的滑块。

```jsx
// 修改：GlbOptionsModal 组件
const GlbOptionsModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">📦 GLB 导入选项</h3>
        
        {/* 分辨率滑块 (不变) */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            模型精细度 (Resolution): <span className="font-bold">{glbResolution}</span>
          </label>
          <input type="range" min="20" max="120" step="5" value={glbResolution} onChange={(e) => setGlbResolution(parseInt(e.target.value, 10))} className="w-full" />
        </div>
        
        {/* 新增：平滑强度滑块 */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            表面平滑度 (Smoothing): <span className="font-bold">{glbSmoothing}</span> 次
          </label>
          <input
            type="range"
            min="0" // 0表示不平滑
            max="5" // 超过5次效果不明显且慢
            step="1"
            value={glbSmoothing}
            onChange={(e) => setGlbSmoothing(parseInt(e.target.value, 10))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>无 (原始)</span>
            <span>高 (更圆滑)</span>
          </div>
        </div>

        {/* ... 其他部分保持不变 ... */}
      </div>
    </div>
  );
};
```

#### c) 更新 `handleConfirmGlbImport` 函数

现在我们需要把平滑迭代次数也作为选项传递给 `processGlbToVoxels`。

```javascript
// 修改：handleConfirmGlbImport 函数
const handleConfirmGlbImport = async () => {
  if (!selectedGlbFile) return;
  // ... (其他代码不变)
  try {
    // 将分辨率和平滑次数一起作为选项传入
    const voxels = await processGlbToVoxels(selectedGlbFile, { 
      resolution: glbResolution,
      smoothingIterations: glbSmoothing 
    });
    // ... (其他代码不变)
  } catch (error) {
    // ...
  } finally {
    // ...
  }
};
```

### 总结

通过以上修改，您现在获得了一个极为强大的导入流程：

1.  **高精度体素化**：`voxelizeMesh` 负责将GLB模型高保真地转换为原始体素数据。
2.  **可选的平滑处理**：`applySmoothing` 函数作为一个独立的后处理步骤，负责将“粗糙”的体素变得“圆滑”。
3.  **完全的用户控制**：在弹出的模态框中，用户现在可以像调整“相机焦距”（分辨率）和“磨皮美颜”（平滑度）一样，精确地控制最终导入模型的外观。

这个新功能不仅解决了表面的平滑问题，还通过提供可调参数，让您的编辑器在专业性和可玩性上都迈上了一个新台阶。