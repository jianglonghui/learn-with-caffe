// function voxelizeWithRenderer(mesh, scene, renderer, resolution) {
//   mesh.updateWorldMatrix(true, true);
//   const box = new THREE.Box3().setFromObject(mesh);
//   const size = box.getSize(new THREE.Vector3());
//   const maxDim = Math.max(size.x, size.y, size.z);
//   const voxelSize = maxDim / resolution;

//   // --- 步骤 1: 设置渲染环境 ---

//   // 渲染目标的尺寸，可以比分辨率高一些以获得更精确的采样
//   const rtResolution = resolution * 2; 
//   const renderTarget = new THREE.WebGLRenderTarget(rtResolution, rtResolution, {
//     format: THREE.RGBAFormat,
//     type: THREE.UnsignedByteType,
//   });

//   const camera = new THREE.OrthographicCamera();
//   const depthMaterial = new THREE.ShaderMaterial({
//     vertexShader: `
//       varying vec4 vProjTexCoord;
//       void main() {
//         vProjTexCoord = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
//         gl_Position = vProjTexCoord;
//       }
//     `,
//     fragmentShader: `
//       ${PACKING_FUNCTIONS}
//       varying vec4 vProjTexCoord;
//       void main() {
//         float depth = vProjTexCoord.z / vProjTexCoord.w;
//         // depth的范围是[near, far]，我们把它归一化到[0,1]
//         float normalizedDepth = (depth - gl_DepthRange.near) / (gl_DepthRange.far - gl_DepthRange.near);
//         gl_FragColor = packDepth(normalizedDepth);
//       }
//     `,
//   });

//   const voxelMap = new Map();
//   const originalBackground = scene.background;
//   scene.background = null; // 渲染到目标时需要透明背景

//   // --- 步骤 2: 定义六个渲染视角 ---
//   const views = [
//     // X轴
//     { dir: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 1, 0), name: 'pos-x' },
//     { dir: new THREE.Vector3(-1, 0, 0), up: new THREE.Vector3(0, 1, 0), name: 'neg-x' },
//     // Y轴
//     { dir: new THREE.Vector3(0, 1, 0), up: new THREE.Vector3(0, 0, -1), name: 'pos-y' },
//     { dir: new THREE.Vector3(0, -1, 0), up: new THREE.Vector3(0, 0, 1), name: 'neg-y' },
//     // Z轴
//     { dir: new THREE.Vector3(0, 0, 1), up: new THREE.Vector3(0, 1, 0), name: 'pos-z' },
//     { dir: new THREE.Vector3(0, 0, -1), up: new THREE.Vector3(0, 1, 0), name: 'neg-z' },
//   ];

//   // --- 步骤 3: 循环渲染并重建体素 ---
//   console.log(`[Renderer Voxelizer] Starting 6-view rendering...`);

//   for (const view of views) {
//     console.log(`[Renderer Voxelizer] Rendering view: ${view.name}`);

//     // 配置相机
//     const dominantAxis = Object.keys(size).find(axis => Math.abs(view.dir[axis]) > 0.9);
//     const otherAxes = Object.keys(size).filter(axis => axis !== dominantAxis);
    
//     camera.left = -size[otherAxes[0]] / 2;
//     camera.right = size[otherAxes[0]] / 2;
//     camera.top = size[otherAxes[1]] / 2;
//     camera.bottom = -size[otherAxes[1]] / 2;
//     camera.near = 0.1;
//     camera.far = maxDim * 2;
    
//     camera.position.copy(box.getCenter(new THREE.Vector3())).add(view.dir.clone().multiplyScalar(maxDim));
//     camera.up.copy(view.up);
//     camera.lookAt(box.getCenter(new THREE.Vector3()));
//     camera.updateProjectionMatrix();

//     // 1. 渲染颜色
//     renderer.setRenderTarget(renderTarget);
//     renderer.clear();
//     renderer.render(scene, camera);
//     const colorBuffer = new Uint8Array(rtResolution * rtResolution * 4);
//     renderer.readRenderTargetPixels(renderTarget, 0, 0, rtResolution, rtResolution, colorBuffer);

//     // 2. 渲染深度
//     const originalOverrideMaterial = scene.overrideMaterial;
//     scene.overrideMaterial = depthMaterial;
//     renderer.render(scene, camera);
//     const depthColorBuffer = new Uint8Array(rtResolution * rtResolution * 4);
//     renderer.readRenderTargetPixels(renderTarget, 0, 0, rtResolution, rtResolution, depthColorBuffer);
//     scene.overrideMaterial = originalOverrideMaterial;


//     // 3. 重建
//     const unprojectVector = new THREE.Vector3();
//     for (let y = 0; y < rtResolution; y++) {
//       for (let x = 0; x < rtResolution; x++) {
//         const i = (y * rtResolution + x) * 4;
        
//         // 如果是背景（透明），则跳过
//         if (colorBuffer[i + 3] === 0) continue;

//         const depth = unpackDepth(depthColorBuffer.slice(i, i + 4));

//         // 将2D像素坐标+深度，反投影回3D世界坐标
//         unprojectVector.set(
//           (x / rtResolution) * 2 - 1,
//           (y / rtResolution) * 2 - 1,
//           depth * 2 - 1
//         ).unproject(camera);

//         // 量化为体素坐标
//         const relativePoint = unprojectVector.clone().sub(box.min);
//         const vx = Math.floor(relativePoint.x / voxelSize);
//         const vy = Math.floor(relativePoint.y / voxelSize);
//         const vz = Math.floor(relativePoint.z / voxelSize);
//         const key = `${vx},${vy},${vz}`;

//         // 只添加新的体素，避免重复
//         if (!voxelMap.has(key)) {
//           const color = new THREE.Color(
//             colorBuffer[i] / 255,
//             colorBuffer[i + 1] / 255,
//             colorBuffer[i + 2] / 255
//           );
//           voxelMap.set(key, color);
//         }
//       }
//     }
//   }
  
//   // --- 步骤 4: 格式化输出并清理 ---
//   scene.background = originalBackground;
//   renderTarget.dispose();
//   depthMaterial.dispose();
  
//   const finalVoxels = Array.from(voxelMap.entries()).map(([key, color]) => {
//       const [x, y, z] = key.split(',').map(Number);
//       return { x, y, z, color };
//   });

//   // 中心化逻辑
//   let minX = Infinity, minY = Infinity, minZ = Infinity;
//   let maxX = -Infinity, maxY = -Infinity, maxZ = -1/0;
//   finalVoxels.forEach(v => {
//       minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
//       minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
//       minZ = Math.min(minZ, v.z); maxZ = Math.max(maxZ, v.z);
//   });
  
//   const centerX = Math.floor(minX + (maxX - minX) / 2);
//   const centerY = Math.floor(minY + (maxY - minY) / 2);
//   const centerZ = Math.floor(minZ + (maxZ - minZ) / 2);
  
//   const centeredVoxels = finalVoxels.map(v => ({
//     ...v,
//     x: v.x - centerX,
//     y: v.y - centerY,
//     z: v.z - centerZ,
//   }));
  
//   console.log(`[Renderer Voxelizer] Voxelization complete. Generated ${centeredVoxels.length} surface voxels.`);
//   return centeredVoxels;
// }