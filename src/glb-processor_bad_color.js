import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import KdTree from 'kd-tree-js';

/**
 * 从GLB文件中加载网格和场景
 */
async function loadMeshFromGlb(file) {
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
  loader.setDRACOLoader(dracoLoader);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target.result) {
        return reject(new Error("File could not be read."));
      }
      loader.parse(event.target.result, '', (gltf) => {
        const scene = new THREE.Scene();
        scene.add(gltf.scene);
        gltf.scene.updateMatrixWorld(true);
        resolve({ scene: scene, mesh: gltf.scene });
      }, (error) => {
        reject(new Error(`Failed to parse GLB file: ${error.message}`));
      });
    };
    reader.onerror = (error) => reject(new Error(`File reading failed: ${error.message}`));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 优化的快速体素化算法 - 替换原始的solidVoxelize
 * 使用顶点直接生成表面体素 + 扫描线填充内部
 */
function fastVoxelize(meshObject, resolution) {
  console.log('[Fast Voxelizer] Starting optimized voxelization...');
  
  // 收集所有网格的几何体
  const allGeometries = [];
  const allMaterials = [];
  
  meshObject.traverse((child) => {
    if (child.isMesh && child.geometry) {
      // 应用世界变换到几何体
      const geometry = child.geometry.clone().applyMatrix4(child.matrixWorld);
      allGeometries.push(geometry);
      
      // 收集材质信息用于颜色
      const material = child.material;
      const color = material?.color || new THREE.Color(0xcccccc);
      allMaterials.push(color);
    }
  });

  if (allGeometries.length === 0) {
    throw new Error("No valid mesh geometries found");
  }

  // 合并所有几何体
  const mergedGeometry = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];

  allGeometries.forEach((geometry, index) => {
    geometry.center(); // 居中每个几何体
    const positionAttribute = geometry.getAttribute('position');
    const materialColor = allMaterials[index];
    
    for (let i = 0; i < positionAttribute.count; i++) {
      const vertex = new THREE.Vector3().fromBufferAttribute(positionAttribute, i);
      positions.push(vertex.x, vertex.y, vertex.z);
      colors.push(materialColor.r, materialColor.g, materialColor.b);
    }
  });

  mergedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  mergedGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  mergedGeometry.computeBoundingBox();

  const box = mergedGeometry.boundingBox;
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const voxelSize = maxDim / resolution;

  console.log(`[Fast Voxelizer] Voxel size: ${voxelSize.toFixed(4)}, Processing ${positions.length/3} vertices...`);

  const surfaceVoxels = new Set();
  const positionAttribute = mergedGeometry.getAttribute('position');
  
  // 步骤1: 从顶点生成表面体素 - O(顶点数)
  console.log('[Fast Voxelizer] Step 1: Generating surface voxels from vertices...');
  for (let i = 0; i < positionAttribute.count; i++) {
    const pt = new THREE.Vector3().fromBufferAttribute(positionAttribute, i);
    const x = Math.round(pt.x / voxelSize);
    const y = Math.round(pt.y / voxelSize);
    const z = Math.round(pt.z / voxelSize);
    surfaceVoxels.add(`${x},${y},${z}`);
  }

  console.log(`[Fast Voxelizer] Generated ${surfaceVoxels.size} surface voxels`);

  const allVoxels = new Set(surfaceVoxels);

  // 步骤2: 使用三个方向的扫描线填充内部 - 增加准确性
  console.log('[Fast Voxelizer] Step 2: Filling interior using multi-direction scanline...');
  
  // 按YZ分组进行X方向扫描
  const yzMap = {};
  surfaceVoxels.forEach(key => {
    const [x, y, z] = key.split(',').map(Number);
    const yzKey = `${y},${z}`;
    if (!yzMap[yzKey]) yzMap[yzKey] = [];
    yzMap[yzKey].push(x);
  });

  for (const yzKey in yzMap) {
    const xCoords = yzMap[yzKey].sort((a, b) => a - b);
    if (xCoords.length < 2) continue;
    
    // 填充每对表面体素之间的空隙
    for (let i = 0; i < xCoords.length - 1; i += 2) {
      for (let x = xCoords[i] + 1; x < xCoords[i + 1]; x++) {
        allVoxels.add(`${x},${yzKey}`);
      }
    }
  }

  // 按XZ分组进行Y方向扫描 - 增加准确性
  const xzMap = {};
  surfaceVoxels.forEach(key => {
    const [x, y, z] = key.split(',').map(Number);
    const xzKey = `${x},${z}`;
    if (!xzMap[xzKey]) xzMap[xzKey] = [];
    xzMap[xzKey].push(y);
  });

  for (const xzKey in xzMap) {
    const yCoords = xzMap[xzKey].sort((a, b) => a - b);
    if (yCoords.length < 2) continue;
    
    for (let i = 0; i < yCoords.length - 1; i += 2) {
      for (let y = yCoords[i] + 1; y < yCoords[i + 1]; y++) {
        allVoxels.add(`${xzKey.split(',')[0]},${y},${xzKey.split(',')[1]}`);
      }
    }
  }

  // 识别表面体素
  console.log('[Fast Voxelizer] Step 3: Identifying surface voxels...');
  const finalSurfaceVoxels = [];
  const directions = [
    {x: 1, y: 0, z: 0}, {x: -1, y: 0, z: 0},
    {x: 0, y: 1, z: 0}, {x: 0, y: -1, z: 0},
    {x: 0, y: 0, z: 1}, {x: 0, y: 0, z: -1}
  ];

  allVoxels.forEach(key => {
    const [x, y, z] = key.split(',').map(Number);
    let isSurface = false;
    
    for (const dir of directions) {
      const neighborKey = `${x + dir.x},${y + dir.y},${z + dir.z}`;
      if (!allVoxels.has(neighborKey)) {
        isSurface = true;
        break;
      }
    }
    
    if (isSurface) {
      finalSurfaceVoxels.push({ x, y, z });
    }
  });

  // 转换为最终格式
  const solidVoxels = Array.from(allVoxels).map(key => {
    const [x, y, z] = key.split(',').map(Number);
    return { x, y, z };
  });

  console.log(`[Fast Voxelizer] Complete! Generated ${solidVoxels.length} solid voxels, ${finalSurfaceVoxels.length} surface voxels`);
  
  return { 
    solidVoxels, 
    surfaceVoxels: finalSurfaceVoxels, 
    voxelSize, 
    boundingBox: box 
  };
}

/**
 * 异步的颜色探测器 - 添加进度回调
 */
async function createColorProbeAsync(scene, renderer, probeResolution, progressCallback) {
  console.log('[Color Probe] Starting async 6-view rendering...');
  
  const mesh = scene.children[0];
  const boundingBox = new THREE.Box3().setFromObject(mesh);
  const size = boundingBox.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  
  const camera = new THREE.OrthographicCamera();
  const renderTarget = new THREE.WebGLRenderTarget(probeResolution, probeResolution);
  
  // --- FIX START: 添加环境光以正确显示模型颜色 ---
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(ambientLight);
  // --- FIX END ---
  
  const originalBackground = scene.background;
  scene.background = null;

  const views = [
    { dir: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 1, 0) },
    { dir: new THREE.Vector3(-1, 0, 0), up: new THREE.Vector3(0, 1, 0) },
    { dir: new THREE.Vector3(0, 1, 0), up: new THREE.Vector3(0, 0, -1) },
    { dir: new THREE.Vector3(0, -1, 0), up: new THREE.Vector3(0, 0, 1) },
    { dir: new THREE.Vector3(0, 0, 1), up: new THREE.Vector3(0, 1, 0) },
    { dir: new THREE.Vector3(0, 0, -1), up: new THREE.Vector3(0, 1, 0) },
  ];

  const colorPoints = [];
  const pointMap = new Map();

  for (let viewIndex = 0; viewIndex < views.length; viewIndex++) {
    const view = views[viewIndex];
    
    // 设置相机
    const center = boundingBox.getCenter(new THREE.Vector3());
    const camWidth = Math.abs(view.dir.y) > 0.5 ? size.x : (Math.abs(view.dir.x) > 0.5 ? size.z : size.x);
    const camHeight = Math.abs(view.dir.y) > 0.5 ? size.z : size.y;
    
    camera.left = -camWidth / 2; camera.right = camWidth / 2;
    camera.top = camHeight / 2; camera.bottom = -camHeight / 2;
    camera.near = 0.1; camera.far = maxDim * 2;
    camera.position.copy(center).add(view.dir.clone().multiplyScalar(maxDim));
    camera.up.copy(view.up);
    camera.lookAt(center);
    camera.updateMatrixWorld(true);
    camera.updateProjectionMatrix();

    // 渲染
    renderer.setRenderTarget(renderTarget);
    renderer.clear();
    renderer.render(scene, camera);
    
    // 读取像素 - 异步处理
    const colorBuffer = new Uint8Array(probeResolution * probeResolution * 4);
    renderer.readRenderTargetPixels(renderTarget, 0, 0, probeResolution, probeResolution, colorBuffer);
    
    // 处理颜色点
    const viewPoints = [];
    for(let y = 0; y < probeResolution; y++) {
      for(let x = 0; x < probeResolution; x++) {
        const i = (y * probeResolution + x) * 4;
        if (colorBuffer[i + 3] > 0) { // 检查alpha通道
          viewPoints.push({
            screenX: x,
            screenY: y,
            color: new THREE.Color(colorBuffer[i]/255, colorBuffer[i+1]/255, colorBuffer[i+2]/255)
          });
        }
      }
    }

    // 转换到世界坐标
    viewPoints.forEach(p => {
      const point = new THREE.Vector3(
        (p.screenX / probeResolution) * 2 - 1,
        (p.screenY / probeResolution) * 2 - 1,
        -1
      ).unproject(camera);

      const key = `${point.x.toFixed(3)},${point.y.toFixed(3)},${point.z.toFixed(3)}`;
      if(!pointMap.has(key)){
        pointMap.set(key, true);
        colorPoints.push({ x: point.x, y: point.y, z: point.z, color: p.color });
      }
    });

    // 报告进度并让出控制权
    if (progressCallback) {
      progressCallback(`Color probing: ${viewIndex + 1}/6 views complete`);
    }
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  // --- FIX START: 清理场景，移除添加的光源 ---
  scene.remove(ambientLight);
  // --- FIX END ---

  renderer.setRenderTarget(null);
  scene.background = originalBackground;
  renderTarget.dispose();

  console.log(`[Color Probe] Generated ${colorPoints.length} unique colored points`);
  
  // 构建K-D树
  const distance = (a, b) => Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2);
  const tree = new KdTree(colorPoints, distance, ['x', 'y', 'z']);

  return tree;
}

/**
 * 主处理函数 - 优化版本
 */
export async function processGlbToVoxels(file, renderer, options = {}, progressCallback = null) {
  const resolution = options.resolution || 24; // 降低默认分辨率
  const probeResolution = options.probeResolution || 128; // 降低默认分辨率

  try {
    if (progressCallback) progressCallback('Loading GLB file...');
    const { scene, mesh } = await loadMeshFromGlb(file);
    
    if (progressCallback) progressCallback('Voxelizing mesh...');
    const { solidVoxels, surfaceVoxels, voxelSize, boundingBox } = fastVoxelize(mesh, resolution);
    
    if (solidVoxels.length === 0) {
      throw new Error("Fast voxelization failed. No voxels were generated.");
    }
    
    if (progressCallback) progressCallback('Creating color probe...');
    const colorProbeTree = await createColorProbeAsync(scene, renderer, probeResolution, progressCallback);
    
    if (progressCallback) progressCallback('Assigning colors to voxels...');
    const coloredVoxels = [];
    const internalColor = new THREE.Color(0x444444);
    const surfaceVoxelSet = new Set(surfaceVoxels.map(v => `${v.x},${v.y},${v.z}`));

    // 异步处理颜色分配，避免阻塞
    for (let i = 0; i < solidVoxels.length; i++) {
      const voxel = solidVoxels[i];
      let finalColor;
      const key = `${voxel.x},${voxel.y},${voxel.z}`;
      
      if (surfaceVoxelSet.has(key)) {
        const worldPos = new THREE.Vector3(
          boundingBox.min.x + (voxel.x + 0.5) * voxelSize,
          boundingBox.min.y + (voxel.y + 0.5) * voxelSize,
          boundingBox.min.z + (voxel.z + 0.5) * voxelSize
        );
        const nearest = colorProbeTree.nearest(worldPos, 1);
        finalColor = (nearest.length > 0 && nearest[0][0]) ? nearest[0][0].color : internalColor;
      } else {
        finalColor = internalColor;
      }
      
      coloredVoxels.push({ x: voxel.x, y: voxel.y, z: voxel.z, color: finalColor });
      
      // 每处理100个体素就让出控制权
      if (i % 100 === 0) {
        if (progressCallback) {
          progressCallback(`Coloring voxels: ${Math.round((i / solidVoxels.length) * 100)}%`);
        }
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    if (progressCallback) progressCallback('Centering voxel model...');
    
    // 居中处理
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    
    solidVoxels.forEach(v => {
      minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
      minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
      minZ = Math.min(minZ, v.z); maxZ = Math.max(maxZ, v.z);
    });

    const centerX = Math.floor(minX + (maxX - minX) / 2);
    const centerY = Math.floor(minY + (maxY - minY) / 2);
    const centerZ = Math.floor(minZ + (maxZ - minZ) / 2);
    
    const centeredVoxels = coloredVoxels.map(v => ({
      x: v.x - centerX,
      y: v.y - centerY,
      z: v.z - centerZ,
      color: v.color,
    }));
    
    if (progressCallback) progressCallback('Voxelization complete!');
    console.log(`[Complete] Optimized voxelization finished. Generated ${centeredVoxels.length} final voxels.`);
    
    return centeredVoxels;

  } catch (error) {
    console.error('[Optimized GLB Processor] Error:', error);
    throw error;
  }
}