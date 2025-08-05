import { generateVoxelsFromPrompt } from './ai-generator';

// 模拟API请求函数
const mockRequest = async (prompt, options) => {
  console.log('Mock API Request:', { prompt, options });
  
  // 模拟AI响应
  return JSON.stringify({
    name: "测试物体",
    voxels: [
      { x: 0, y: 0, z: 0, color: "#ff0000" },
      { x: 1, y: 0, z: 0, color: "#ff0000" },
      { x: 0, y: 1, z: 0, color: "#00ff00" },
      { x: 1, y: 1, z: 0, color: "#0000ff" }
    ]
  });
};

// 测试函数
async function testAiGenerator() {
  try {
    console.log('开始测试AI生成器...');
    
    const voxels = await generateVoxelsFromPrompt('a red car', mockRequest);
    
    console.log('生成的体素:', voxels);
    console.log('体素数量:', voxels.length);
    
    if (voxels && voxels.length > 0) {
      console.log('✅ AI生成器测试成功！');
      return true;
    } else {
      console.log('❌ AI生成器测试失败：没有生成体素');
      return false;
    }
  } catch (error) {
    console.error('❌ AI生成器测试失败:', error);
    return false;
  }
}

// 如果直接运行此文件，执行测试
if (typeof window !== 'undefined') {
  // 在浏览器环境中
  window.testAiGenerator = testAiGenerator;
  console.log('AI生成器测试函数已加载，可以在控制台中运行 testAiGenerator() 进行测试');
}

export { testAiGenerator }; 