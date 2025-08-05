import * as THREE from 'three';

// 绘图工具类型
export const TOOLS = {
  BRUSH: 'brush',
  ERASER: 'eraser',
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  LINE: 'line'
};

// 颜色预设
export const COLORS = ['#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'];

// 历史记录管理类
export class CanvasHistory {
  constructor(canvas) {
    this.canvas = canvas;
    this.history = [];
    this.currentIndex = -1;
    this.maxHistory = 50;
  }

  saveState() {
    const ctx = this.canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }
    
    this.history.push(imageData);
    this.currentIndex++;
    
    if (this.history.length > this.maxHistory) {
      this.history.shift();
      this.currentIndex--;
    }
  }

  undo() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      const ctx = this.canvas.getContext('2d');
      ctx.putImageData(this.history[this.currentIndex], 0, 0);
      return true;
    }
    return false;
  }

  redo() {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      const ctx = this.canvas.getContext('2d');
      ctx.putImageData(this.history[this.currentIndex], 0, 0);
      return true;
    }
    return false;
  }

  canUndo() {
    return this.currentIndex > 0;
  }

  canRedo() {
    return this.currentIndex < this.history.length - 1;
  }

  clear() {
    this.history = [];
    this.currentIndex = -1;
  }
}

// 草图转方块算法
export const sketchToVoxels = (imageData, width, height) => {
  const voxels = [];
  const threshold = 128;
  const sampleRate = 4;
  
  for (let y = 0; y < height; y += sampleRate) {
    for (let x = 0; x < width; x += sampleRate) {
      const index = (y * width + x) * 4;
      const r = imageData[index];
      const g = imageData[index + 1];
      const b = imageData[index + 2];
      const a = imageData[index + 3];
      
      const gray = (r + g + b) / 3;
      
      if (a > 0 && gray < threshold) {
        voxels.push({
          x: (x / sampleRate) - Math.floor(width / sampleRate / 2),
          y: Math.floor(height / sampleRate / 2) - (y / sampleRate),
          z: 0,
          color: new THREE.Color(r/255, g/255, b/255)
        });
      }
    }
  }
  
  const extrudedVoxels = [];
  voxels.forEach(voxel => {
    for (let z = 0; z < 2; z++) {
      extrudedVoxels.push({
        ...voxel,
        z: z
      });
    }
  });
  
  return extrudedVoxels;
};

// 创建方块对象的函数
export const createVoxelObject = (voxels, mass, restitution, scale = 1) => {
  const group = new THREE.Group();
  group.userData.mass = mass;
  group.userData.restitution = restitution;
  group.userData.originalVoxels = voxels;
  group.userData.isVoxelObject = true;
  
  const geometry = new THREE.BoxGeometry(0.45, 0.45, 0.45);
  
  voxels.forEach(voxel => {
    const material = new THREE.MeshLambertMaterial({ color: voxel.color });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(voxel.x * 0.5 * scale, voxel.y * 0.5 * scale, voxel.z * 0.5 * scale);
    group.add(cube);
  });
  
  group.scale.set(scale, scale, scale);
  
  return group;
};

// 生成物品缩略图
export const generateItemThumbnail = (voxels) => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, 64, 64);
  
  if (voxels.length > 0) {
    // 计算边界
    let minX = voxels[0].x, maxX = voxels[0].x;
    let minY = voxels[0].y, maxY = voxels[0].y;
    
    voxels.forEach(voxel => {
      minX = Math.min(minX, voxel.x);
      maxX = Math.max(maxX, voxel.x);
      minY = Math.min(minY, voxel.y);
      maxY = Math.max(maxY, voxel.y);
    });
    
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    const scale = Math.min(48 / width, 48 / height);
    
    voxels.forEach(voxel => {
      if (voxel.z === 0) { // 只显示前面的方块
        const x = ((voxel.x - minX) * scale) + (64 - width * scale) / 2;
        const y = ((maxY - voxel.y) * scale) + (64 - height * scale) / 2;
        
        ctx.fillStyle = `rgb(${Math.floor(voxel.color.r * 255)}, ${Math.floor(voxel.color.g * 255)}, ${Math.floor(voxel.color.b * 255)})`;
        ctx.fillRect(x, y, scale, scale);
      }
    });
  }
  
  return canvas.toDataURL();
};

// 绘图工具函数
export const draw = (ctx, x, y, tool, color, brushSize) => {
  ctx.globalCompositeOperation = tool === TOOLS.ERASER ? 'destination-out' : 'source-over';
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, brushSize, 0, 2 * Math.PI);
  ctx.fill();
};

// 绘制几何图形
export const drawShape = (ctx, startX, startY, endX, endY, tool, color, brushSize, fillMode, isPreview = false) => {
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = isPreview ? 'rgba(0,0,0,0.5)' : color;
  ctx.fillStyle = isPreview ? 'rgba(0,0,0,0.1)' : color;
  ctx.lineWidth = brushSize;
  ctx.setLineDash(isPreview ? [5, 5] : []);
  
  ctx.beginPath();
  
  switch (tool) {
    case TOOLS.RECTANGLE:
      const width = endX - startX;
      const height = endY - startY;
      ctx.rect(startX, startY, width, height);
      if (fillMode === 'fill' || isPreview) {
        ctx.fill();
      } else {
        ctx.stroke();
      }
      break;
      
    case TOOLS.CIRCLE:
      const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
      ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
      if (fillMode === 'fill' || isPreview) {
        ctx.fill();
      } else {
        ctx.stroke();
      }
      break;
      
    case TOOLS.LINE:
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      break;
      
    default:
      break;
  }
  
  ctx.setLineDash([]);
};

// 获取鼠标位置
export const getMousePos = (e, canvas) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
};

// 清空画布
export const clearCanvas = (canvas) => {
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
};

// 清除预览
export const clearPreview = (previewCanvas) => {
  if (previewCanvas) {
    const ctx = previewCanvas.getContext('2d');
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  }
}; 