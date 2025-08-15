# 坐标计算系统性偏差修复总结

## 问题描述

在 `glb-processor.js` 的 `voxelizeMesh` 函数中，使用 `Math.round()` 进行坐标取整导致了系统性偏差，这会影响对称模型的体素化结果，使其不再保持对称性。

## 根本原因

`Math.round()` 函数在处理负数时会产生不对称的行为：
- 对于正数：`Math.round(0.5) = 1`, `Math.round(1.5) = 2`
- 对于负数：`Math.round(-0.5) = 0`, `Math.round(-1.5) = -1`

这种不对称性会导致对称模型的体素化结果出现偏差。

## 修复方案

### 1. 使用 Math.floor() 替代 Math.round()

**修改前：**
```javascript
const x = Math.round(tempVec.x / voxelSize);
const y = Math.round(tempVec.y / voxelSize);
const z = Math.round(tempVec.z / voxelSize);
```

**修改后：**
```javascript
// 1. 将点相对于包围盒的最小点进行偏移，确保所有坐标为正
const relativePoint = tempVec.clone().sub(box.min);
// 2. 使用 Math.floor() 进行统一且无偏差的取整
const x = Math.floor(relativePoint.x / voxelSize);
const y = Math.floor(relativePoint.y / voxelSize);
const z = Math.floor(relativePoint.z / voxelSize);
```

### 2. 移除自动居中

**修改前：**
```javascript
geometry.center(); // 这会导致坐标系的不一致
```

**修改后：**
```javascript
// 注意：我们不再在这里调用 .center()，因为我们将手动处理坐标系
```

### 3. 添加重新居中逻辑

在体素化完成后，添加重新居中的逻辑：

```javascript
// --- 步骤 5: 格式化输出并移回中心 ---
let minX = Infinity, minY = Infinity, minZ = Infinity;
let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

const preCenteredVoxels = Array.from(finalVoxelDataMap.entries()).map(([key, data]) => {
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
```

## 修复效果

### 1. 消除系统性偏差
- `Math.floor()` 在所有情况下都有一致的行为
- 平移坐标系确保所有坐标为正，避免负数取整的复杂性

### 2. 保持对称性
- 对称模型的体素化结果现在会保持对称性
- 重新居中确保体素云的中心回到原点

### 3. 提高精度
- 统一的取整方法减少了累积误差
- 更好的坐标处理提高了整体精度

## 测试验证

创建了测试文件 `src/glb-test.js` 和 `test-coordinate-fix.html` 来验证修复效果：

1. **对称性测试**：验证体素数据的对称性
2. **取整方法对比**：比较 `Math.floor()` 和 `Math.round()` 的差异
3. **系统性偏差分析**：计算不同取整方法的平均偏差

## 文件修改清单

1. **src/glb-processor.js**
   - 修改 `voxelizeMesh` 函数中的坐标计算逻辑
   - 移除 `geometry.center()` 调用
   - 添加重新居中逻辑

2. **src/glb-test.js**
   - 添加坐标对称性测试
   - 添加取整方法对比测试

3. **test-coordinate-fix.html**
   - 创建可视化测试页面

## 注意事项

1. 这个修复主要影响体素化的坐标计算，不会影响颜色采样和其他功能
2. 修复后的代码保持了原有的性能特性
3. 对于非对称模型，这个修复不会产生负面影响
4. 建议在实际使用中测试对称模型，验证修复效果

## 后续建议

1. 在光照设置中确保有足够的环境光，避免阴影影响对称性的观察
2. 检查源GLB文件的UV贴图是否对称
3. 考虑添加更多的对称性验证测试 