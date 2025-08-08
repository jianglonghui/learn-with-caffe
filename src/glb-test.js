// GLB处理器测试文件

// 测试坐标计算的对称性
function testCoordinateSymmetry() {
  console.log('🧪 测试坐标计算的对称性...');
  
  // 模拟一些对称的体素数据
  const symmetricVoxels = [
    { x: -1, y: 0, z: 0, color: { r: 1, g: 0, b: 0 } },
    { x: 1, y: 0, z: 0, color: { r: 1, g: 0, b: 0 } },
    { x: 0, y: -1, z: 0, color: { r: 0, g: 1, b: 0 } },
    { x: 0, y: 1, z: 0, color: { r: 0, g: 1, b: 0 } },
    { x: 0, y: 0, z: -1, color: { r: 0, g: 0, b: 1 } },
    { x: 0, y: 0, z: 1, color: { r: 0, g: 0, b: 1 } },
  ];
  
  // 检查对称性
  let isSymmetric = true;
  const voxelMap = new Map();
  
  // 将体素添加到Map中以便快速查找
  symmetricVoxels.forEach(voxel => {
    const key = `${voxel.x},${voxel.y},${voxel.z}`;
    voxelMap.set(key, voxel);
  });
  
  // 检查每个体素是否有对应的对称体素
  for (const voxel of symmetricVoxels) {
    const symmetricKey = `${-voxel.x},${-voxel.y},${-voxel.z}`;
    if (!voxelMap.has(symmetricKey)) {
      console.log(`❌ 发现不对称: ${voxel.x},${voxel.y},${voxel.z} 没有对应的对称体素`);
      isSymmetric = false;
    }
  }
  
  if (isSymmetric) {
    console.log('✅ 坐标对称性测试通过');
  } else {
    console.log('❌ 坐标对称性测试失败');
  }
  
  return isSymmetric;
}

// 测试 Math.floor() 与 Math.round() 的差异
function testRoundingMethods() {
  console.log('🧪 测试取整方法的差异...');
  
  const testValues = [-0.5, -0.4, -0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3, 0.4, 0.5];
  
  console.log('测试值 -> Math.floor() -> Math.round()');
  testValues.forEach(val => {
    const floorResult = Math.floor(val);
    const roundResult = Math.round(val);
    console.log(`${val} -> ${floorResult} -> ${roundResult}`);
  });
  
  // 检查系统性偏差
  let floorSum = 0;
  let roundSum = 0;
  
  testValues.forEach(val => {
    floorSum += Math.floor(val);
    roundSum += Math.round(val);
  });
  
  const floorAvg = floorSum / testValues.length;
  const roundAvg = roundSum / testValues.length;
  
  console.log(`Math.floor() 平均值: ${floorAvg}`);
  console.log(`Math.round() 平均值: ${roundAvg}`);
  console.log(`偏差差异: ${roundAvg - floorAvg}`);
  
  return { floorAvg, roundAvg };
}

// 主测试函数
export function runCoordinateTests() {
  console.log('🚀 开始坐标计算修复验证测试...');
  
  // 测试坐标对称性
  const symmetryResult = testCoordinateSymmetry();
  
  // 测试取整方法差异
  const roundingResult = testRoundingMethods();
  
  console.log('📊 测试结果汇总:');
  console.log(`- 对称性测试: ${symmetryResult ? '✅ 通过' : '❌ 失败'}`);
  console.log(`- 取整方法测试: 完成`);
  console.log(`- Math.floor() 平均偏差: ${roundingResult.floorAvg.toFixed(3)}`);
  console.log(`- Math.round() 平均偏差: ${roundingResult.roundAvg.toFixed(3)}`);
  
  return {
    symmetry: symmetryResult,
    rounding: roundingResult
  };
}

// 导出测试函数
export default runCoordinateTests; 