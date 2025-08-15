import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// loadMeshFromGlb 函数保持不变。
async function loadMeshFromGlb(file) {
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
  loader.setDRACOLoader(dracoLoader);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      loader.parse(event.target.result, '', (gltf) => {
        // 重要：确保我们有一个统一的场景来渲染
        const scene = new THREE.Scene();
        scene.add(gltf.scene);
        resolve({ mesh: gltf.scene, scene: scene }); // 返回整个场景以便于渲染
      }, (error) => reject(new Error(`Failed to parse GLB file: ${error.message}`)));
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

// --- 深度打包/解包辅助函数 ---

// GLSL代码，用于在片元着色器中将深度（float）打包到颜色（vec4）中
const PACKING_FUNCTIONS = `
  vec4 packDepth(const in float depth) {
    const vec4 bitShift = vec4(1.0, 255.0, 65025.0, 16581375.0);
    const vec4 bitMask = vec4(1.0/255.0, 1.0/255.0, 1.0/255.0, 0.0);
    vec4 res = fract(depth * bitShift);
    res -= res.xxyz * bitMask;
    return res;
  }
`;

// JavaScript代码，用于将从渲染目标读出的颜色（Uint8Array）解包回深度（float）
function unpackDepth(rgba) {
  const UnpackDownscale = 255 / 256;
  const bitShifts = [1, 1 / 255, 1 / 65025, 1 / 16581375];
  let depth = 0;
  for (let i = 0; i < 4; i++) {
    depth += (rgba[i] / 255) * bitShifts[i];
  }
  return depth / UnpackDownscale;
}

/**
 * 应用平滑处理到体素数据
 * @param {Array} voxels - 体素数组
 * @param {number} iterations - 平滑迭代次数
 * @returns {Array} - 平滑后的体素数组
 */
function applySmoothing(voxels, iterations) {
  if (iterations <= 0 || voxels.length === 0) return voxels;
  
  let currentVoxels = [...voxels];
  
  for (let iter = 0; iter < iterations; iter++) {
    const voxelMap = new Map();
    
    // 将当前体素转换为Map以便快速查找
    currentVoxels.forEach(voxel => {
      const key = `${voxel.x},${voxel.y},${voxel.z}`;
      voxelMap.set(key, voxel);
    });
    
    const newVoxels = [];
    
    // 对每个体素进行平滑处理
    currentVoxels.forEach(voxel => {
      const neighbors = [];
      
      // 检查6个相邻位置
      const directions = [
        { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
        { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }
      ];
      
      directions.forEach(dir => {
        const neighborKey = `${voxel.x + dir.x},${voxel.y + dir.y},${voxel.z + dir.z}`;
        const neighbor = voxelMap.get(neighborKey);
        if (neighbor) {
          neighbors.push(neighbor);
        }
      });
      
      // 如果邻居数量在合理范围内，保留这个体素
      if (neighbors.length >= 2 && neighbors.length <= 5) {
        newVoxels.push(voxel);
      }
      
      // 填充孤立的空隙
      directions.forEach(dir => {
        const neighborKey = `${voxel.x + dir.x},${voxel.y + dir.y},${voxel.z + dir.z}`;
        if (!voxelMap.has(neighborKey)) {
          // 检查这个位置周围是否有足够的体素
          let neighborCount = 0;
          directions.forEach(checkDir => {
            const checkKey = `${voxel.x + dir.x + checkDir.x},${voxel.y + dir.y + checkDir.y},${voxel.z + dir.z + checkDir.z}`;
            if (voxelMap.has(checkKey)) {
              neighborCount++;
            }
          });
          
          // 如果周围有足够的体素，填充这个位置
          if (neighborCount >= 3) {
            const newVoxel = {
              x: voxel.x + dir.x,
              y: voxel.y + dir.y,
              z: voxel.z + dir.z,
              color: voxel.color
            };
            newVoxels.push(newVoxel);
          }
        }
      });
    });
    
    // 去重
    const uniqueVoxels = [];
    const seen = new Set();
    newVoxels.forEach(voxel => {
      const key = `${voxel.x},${voxel.y},${voxel.z}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueVoxels.push(voxel);
      }
    });
    
    currentVoxels = uniqueVoxels;
  }
  
  return currentVoxels;
}


/**
 * [利用渲染器中间结果的高质量体素化器]
 * @param {THREE.Object3D} mesh - 包含模型的对象（通常是gltf.scene）。
 * @param {THREE.Scene} scene - 包含该mesh的完整场景。
 * @param {THREE.WebGLRenderer} renderer - 应用的主渲染器。
 * @param {number} resolution - 沿最长轴的体素数量。
 * @returns {Array<Object>} - 仅包含表面体素的数据数组 [{ x, y, z, color }]。
 */

function voxelizeWithRenderer(mesh, scene, renderer, resolution) {
    mesh.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(mesh);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const voxelSize = maxDim / resolution;
  
    const rtResolution = resolution * 2;
    const renderTarget = new THREE.WebGLRenderTarget(rtResolution, rtResolution);
    const depthRenderTarget = new THREE.WebGLRenderTarget(rtResolution, rtResolution, {
        format: THREE.RGBAFormat, // 必须是RGBA来打包float
        type: THREE.UnsignedByteType,
    });
  
    const camera = new THREE.OrthographicCamera();
    const depthMaterial = new THREE.ShaderMaterial({
            vertexShader: `
              varying vec4 vProjTexCoord;
              void main() {
                vProjTexCoord = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                gl_Position = vProjTexCoord;
              }
            `,
            fragmentShader: `
              ${PACKING_FUNCTIONS}
              varying vec4 vProjTexCoord;
              void main() {
                float depth = vProjTexCoord.z / vProjTexCoord.w;
                // depth的范围是[near, far]，我们把它归一化到[0,1]
                float normalizedDepth = (depth - gl_DepthRange.near) / (gl_DepthRange.far - gl_DepthRange.near);
                gl_FragColor = packDepth(normalizedDepth);
              }
            `,
          });
  
    const voxelMap = new Map();
    const originalBackground = scene.background;
    scene.background = null;
  
    // --- 关键修正 #1: 手动替换材质 ---
    const originalMaterials = new Map();
    const setDepthMaterial = () => {
      mesh.traverse(child => {
        if (child.isMesh) {
          originalMaterials.set(child, child.material);
          child.material = depthMaterial;
        }
      });
    };
    const restoreOriginalMaterials = () => {
      mesh.traverse(child => {
        if (child.isMesh && originalMaterials.has(child)) {
          child.material = originalMaterials.get(child);
        }
      });
    };
  
    const views = [
            // X轴
            { dir: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 1, 0), name: 'pos-x' },
            { dir: new THREE.Vector3(-1, 0, 0), up: new THREE.Vector3(0, 1, 0), name: 'neg-x' },
            // Y轴
            { dir: new THREE.Vector3(0, 1, 0), up: new THREE.Vector3(0, 0, -1), name: 'pos-y' },
            { dir: new THREE.Vector3(0, -1, 0), up: new THREE.Vector3(0, 0, 1), name: 'neg-y' },
            // Z轴
            { dir: new THREE.Vector3(0, 0, 1), up: new THREE.Vector3(0, 1, 0), name: 'pos-z' },
            { dir: new THREE.Vector3(0, 0, -1), up: new THREE.Vector3(0, 1, 0), name: 'neg-z' },
          ];
  
    console.log(`[Renderer Voxelizer] Starting 6-view rendering...`);
  
    for (const view of views) {
      console.log(`[Renderer Voxelizer] Rendering view: ${view.name}`);
  
      // 配置相机 (与之前相同)
      const center = box.getCenter(new THREE.Vector3());
      const cameraWidth = view.dir.y !== 0 ? size.x : size.z;
      const cameraHeight = view.dir.x !== 0 ? size.z : size.y;
      camera.left = -cameraWidth / 2;
      camera.right = cameraWidth / 2;
      camera.top = cameraHeight / 2;
      camera.bottom = -cameraHeight / 2;
      camera.near = 0.1;
      camera.far = maxDim * 2;
      camera.position.copy(center).add(view.dir.clone().multiplyScalar(maxDim));
      camera.up.copy(view.up);
      camera.lookAt(center);
      camera.updateMatrixWorld();
      camera.updateProjectionMatrix();
  
      // 1. 渲染颜色
      renderer.setRenderTarget(renderTarget);
      renderer.clear();
      renderer.render(scene, camera);
      const colorBuffer = new Uint8Array(rtResolution * rtResolution * 4);
      renderer.readRenderTargetPixels(renderTarget, 0, 0, rtResolution, rtResolution, colorBuffer);
  
      // 2. 渲染深度 (使用手动材质替换)
      setDepthMaterial();
      renderer.setRenderTarget(depthRenderTarget);
      renderer.clear();
      renderer.render(scene, camera);
      const depthColorBuffer = new Uint8Array(rtResolution * rtResolution * 4);
      renderer.readRenderTargetPixels(depthRenderTarget, 0, 0, rtResolution, rtResolution, depthColorBuffer);
      restoreOriginalMaterials();
  
      // --- 关键修正 #2: 更稳定的坐标重建逻辑 ---
      const halfWidth = cameraWidth / 2;
      const halfHeight = cameraHeight / 2;
      const rightVec = new THREE.Vector3().crossVectors(view.up, view.dir).normalize();
      const upVec = new THREE.Vector3().copy(view.up);
      
      for (let y = 0; y < rtResolution; y++) {
        for (let x = 0; x < rtResolution; x++) {
          const i = (y * rtResolution + x) * 4;
          if (colorBuffer[i + 3] === 0) continue;
  
          const normalizedDepth = unpackDepth(depthColorBuffer.slice(i, i + 4));
          const worldDepth = camera.near + normalizedDepth * (camera.far - camera.near);
  
          // 从相机原点开始
          const point = new THREE.Vector3().copy(camera.position);
          
          // 减去深度，沿着视线方向向后移动
          point.addScaledVector(view.dir, -worldDepth);
          
          // 根据像素位置，在相机的平面上移动
          const xOffset = ((x / (rtResolution - 1)) - 0.5) * cameraWidth;
          const yOffset = ((y / (rtResolution - 1)) - 0.5) * cameraHeight;
          
          point.addScaledVector(rightVec, xOffset);
          point.addScaledVector(upVec, yOffset);
          
          // 量化为体素坐标
          const relativePoint = point.sub(box.min);
          const vx = Math.floor(relativePoint.x / voxelSize);
          const vy = Math.floor(relativePoint.y / voxelSize);
          const vz = Math.floor(relativePoint.z / voxelSize);
          const key = `${vx},${vy},${vz}`;
  
          if (!voxelMap.has(key)) {
              const color = new THREE.Color(
                  colorBuffer[i] / 255,
                  colorBuffer[i + 1] / 255,
                  colorBuffer[i + 2] / 255
              );
              voxelMap.set(key, color);
          }
        }
      }
    }
    
    // 清理和格式化 (与之前相同)
    scene.background = originalBackground;
    renderTarget.dispose();
    depthRenderTarget.dispose();
    depthMaterial.dispose();

    const finalVoxels = Array.from(voxelMap.entries()).map(([key, color]) => {
        // 将 "x,y,z" 格式的键解析回数字坐标
        const [x, y, z] = key.split(',').map(Number);
        return { x, y, z, color };
    });

    // 如果没有生成任何体素，则提前返回
    if (finalVoxels.length === 0) {
        console.warn("[Renderer Voxelizer] No voxels were generated.");
        return [];
    }

    // 中心化逻辑
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

    console.log(`[Renderer Voxelizer] Voxelization complete. Generated ${centeredVoxels.length} surface voxels.`);
    return centeredVoxels;
  }

/**
 * 主处理函数
 * @param {File} file - 用户选择的.glb文件
 * @param {THREE.WebGLRenderer} renderer - 应用的主渲染器实例
 * @param {Object} options - 配置项
 * @param {number} options.resolution - 体素化分辨率
 * @param {number} options.smoothingIterations - 平滑迭代次数
 */
export async function processGlbToVoxels(file, renderer, options = {}) {
  const resolution = options.resolution || 64; // 建议使用稍高的默认值
  const smoothingIterations = options.smoothingIterations || 0; // 平滑迭代次数

  if (!file || !file.name.toLowerCase().endsWith('.glb')) {
    throw new Error('Please select a valid .glb file.');
  }
  if (!renderer) {
    throw new Error('A THREE.WebGLRenderer instance must be provided.');
  }

  try {
    const { mesh, scene } = await loadMeshFromGlb(file);
    // 调用新的、基于渲染器的体素化函数
    let finalVoxels = voxelizeWithRenderer(mesh, scene, renderer, resolution);
    
    // 应用平滑处理（如果指定了迭代次数）
    if (smoothingIterations > 0) {
      console.log(`[GLB Processor] Applying ${smoothingIterations} smoothing iterations...`);
      finalVoxels = applySmoothing(finalVoxels, smoothingIterations);
    }
    
    return finalVoxels;
  } catch (error) {
    console.error('[GLB Processor] Error:', error);
    throw error;
  }
}