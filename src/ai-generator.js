import * as THREE from 'three';

/**
 * 构建用于生成体素的详细AI提示词。
 * @param {string} userPrompt - 用户输入的简单描述，例如 "一辆红色的车"。
 * @returns {string} - 一个精心设计的、将发送给AI的完整提示词。
 */
function buildVoxelGenerationPrompt(userPrompt) {
  return `
You are a creative assistant for a 3D voxel game. Your task is to generate a list of voxels based on the user's request.

User's request: "${userPrompt}"

Please generate the object and provide the output **strictly in the following JSON format**.
Do not add any explanations, introductions, or any text outside of the JSON block.

The coordinate system is:
- The origin (0,0,0) is the center of the object.
- +X is to the right.
- +Y is up.
- +Z is forward.

JSON format:
{
  "name": "A descriptive name for the object",
  "voxels": [
    { "x": 0, "y": 0, "z": 0, "color": "#RRGGBB" },
    { "x": 1, "y": 0, "z": 0, "color": "#RRGGBB" }
  ]
}

DO NOT OUTPUT ANYTHING OTHER THAN A SINGLE VALID JSON OBJECT.
`;
}

/**
 * 安全地解析AI返回的JSON字符串，并将其格式化为应用程序所需的数据结构。
 * @param {string} jsonString - 从AI API返回的原始字符串。
 * @returns {Array<Object>} - 格式化后的体素数组。
 */
function parseAndFormatApiResponse(data) {

  if (!data.voxels || !Array.isArray(data.voxels)) {
    throw new Error('AI返回的数据中缺少 "voxels" 数组。');
  }

  return data.voxels.map(v => ({
    x: v.x || 0,
    y: v.y || 0,
    z: v.z || 0,
    color: new THREE.Color(v.color || '#ffffff'),
  }));
}

/**
 * 主函数：根据自然语言提示词生成体素数据。
 * @param {string} userPrompt - 用户输入的提示词。
 * @param {function} request - 一个async函数，接收(prompt, options)并返回一个Promise<string>。
 * @returns {Promise<Array<Object>>} - 一个解析为格式化后体素数组的Promise。如果失败则抛出错误。
 */
export async function generateVoxelsFromPrompt(userPrompt, request) {
  if (!userPrompt || userPrompt.trim() === '') {
    throw new Error('提示词不能为空。');
  }
  if (typeof request !== 'function') {
    throw new Error('必须提供一个有效的request函数。');
  }

  const aiPrompt = buildVoxelGenerationPrompt(userPrompt);

  try {
    const responseString = await request(aiPrompt, { maxTokens: 4000 });
    return parseAndFormatApiResponse(responseString);
  } catch (error) {
    console.error('[AI Generator] An error occurred:', error);
    throw error;
  }
} 