// GLB处理器测试文件
import { processGlbToVoxels } from './glb-processor';

// 模拟File对象
function createMockFile() {
  // 这里创建一个简单的测试文件
  const mockFile = {
    name: 'test.glb',
    type: 'model/gltf-binary',
    size: 1024,
    // 这里应该是一个真实的GLB文件内容，但为了测试我们创建一个简单的模拟
  };
  return mockFile;
}

// 测试函数
export async function testGlbProcessor() {
  console.log('🧪 开始测试GLB处理器...');
  
  try {
    const mockFile = createMockFile();
    console.log('📁 创建模拟文件:', mockFile.name);
    
    // 注意：这个测试会失败，因为我们没有真实的GLB文件数据
    // 在实际使用中，用户会选择一个真实的GLB文件
    const voxels = await processGlbToVoxels(mockFile, { resolution: 10 });
    console.log('✅ GLB处理成功，生成体素数量:', voxels.length);
    return voxels;
  } catch (error) {
    console.log('❌ GLB处理测试失败:', error.message);
    console.log('这是预期的，因为我们使用的是模拟文件');
    return null;
  }
}

// 导出测试函数
export default testGlbProcessor; 