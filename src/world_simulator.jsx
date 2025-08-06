import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import PhysicsEngine from './physics-engine';
import { generateVoxelsFromPrompt } from './ai-generator';
import {
  TOOLS,
  COLORS,
  CanvasHistory,
  sketchToVoxels,
  createVoxelObject,
  generateItemThumbnail,
  draw as drawUtil,
  drawShape as drawShapeUtil,
  getMousePos as getMousePosUtil,
  clearCanvas as clearCanvasUtil,
  clearPreview as clearPreviewUtil
} from './editor-utils';



// 3D场景管理器
class SceneManager {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.physicsEngine = new PhysicsEngine();
    this.voxelObjects = [];

    // 控制状态
    this.isRotating = false;
    this.isDragging = false;
    this.dragObject = null;
    this.dragPlane = new THREE.Plane();
    this.dragOffset = new THREE.Vector3();

    // 鼠标跟踪
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.mouseDownX = 0;
    this.mouseDownY = 0;

    // 选中状态
    this.selectedObject = null;
    this.selectionBox = null;
    this.onObjectSelected = null;

    // 摄像机控制
    this.cameraTarget = { x: 0, y: 0 };
    this.cameraRadius = 15;

    // 放置模式
    this.placementMode = false;
    this.placementObject = null;
    this.placementCallback = null;

    // 动画循环控制
    this.animationId = null;
    this.isAnimating = false;

    this.init();
    this.setupScene();
    this.setupControls();
    this.startAnimation();
  }

  init() {
    console.log('SceneManager: 初始化渲染器');

    // 如果已有渲染器，先清理
    if (this.renderer) {
      this.renderer.dispose();
    }

    // 检查容器尺寸
    if (this.container.clientWidth === 0 || this.container.clientHeight === 0) {
      console.log('SceneManager: 容器尺寸为0，等待容器显示');
      // 强制设置容器尺寸
      this.container.style.width = '100%';
      this.container.style.height = '400px';
      // 等待容器显示后再初始化
      setTimeout(() => this.init(), 100);
      return;
    }

    console.log('SceneManager: 容器尺寸:', this.container.clientWidth, 'x', this.container.clientHeight);

    try {
      // 创建新的渲染器
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: false
      });

      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
      this.renderer.setClearColor(0x87CEEB);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      // 清除容器中的旧元素
      while (this.container.firstChild) {
        this.container.removeChild(this.container.firstChild);
      }

      this.container.appendChild(this.renderer.domElement);

      // 设置初始摄像机位置
      this.cameraTarget = { x: Math.PI / 4, y: Math.PI / 6 }; // 45度水平角，30度垂直角
      this.updateCamera();
      console.log('SceneManager: 初始化完成，摄像机位置:', this.camera.position);

      // 立即渲染一次确保画面显示
      this.forceRender();
    } catch (error) {
      console.error('SceneManager: 初始化失败:', error);
      // 如果初始化失败，尝试重试
      setTimeout(() => this.init(), 200);
    }
  }

  setupScene() {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // 定向光
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    // 地面
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.ground.userData.isGround = true;
    this.scene.add(this.ground);

    // 网格辅助线
    const gridHelper = new THREE.GridHelper(20, 20);
    this.scene.add(gridHelper);
  }

  setupControls() {
    const canvas = this.renderer.domElement;

    // 绑定事件处理器，保存引用以便后续移除
    this.boundMouseDown = this.onMouseDown.bind(this);
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);
    this.boundWheel = this.onWheel.bind(this);

    // 鼠标事件
    canvas.addEventListener('mousedown', this.boundMouseDown);
    canvas.addEventListener('mousemove', this.boundMouseMove);
    canvas.addEventListener('mouseup', this.boundMouseUp);
    canvas.addEventListener('wheel', this.boundWheel);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  onMouseDown(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // 记录鼠标按下位置
    this.mouseDownX = event.clientX;
    this.mouseDownY = event.clientY;
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;

    if (this.placementMode) {
      // 放置模式
      this.handlePlacement();
      return;
    }

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    let clickedVoxelObject = null;
    for (let intersect of intersects) {
      let obj = intersect.object;
      while (obj.parent && !obj.userData.isVoxelObject) {
        obj = obj.parent;
      }
      if (obj.userData.isVoxelObject) {
        clickedVoxelObject = obj;
        break;
      }
    }

    if (event.button === 0) { // 左键
      if (clickedVoxelObject) {
        // 选中物体
        this.selectObject(clickedVoxelObject);

        // 开始拖拽物体
        this.isDragging = true;
        this.dragObject = clickedVoxelObject;
        this.physicsEngine.setDragging(clickedVoxelObject, true);

        // 计算拖拽平面和偏移
        const intersect = intersects.find(i => {
          let obj = i.object;
          while (obj.parent && !obj.userData.isVoxelObject) {
            obj = obj.parent;
          }
          return obj === clickedVoxelObject;
        });

        if (intersect) {
          this.dragPlane.setFromNormalAndCoplanarPoint(
            this.camera.getWorldDirection(new THREE.Vector3()).negate(),
            intersect.point
          );
          this.dragOffset.subVectors(clickedVoxelObject.position, intersect.point);
        }
      } else {
        // 取消选中
        this.selectObject(null);
        // 开始旋转视角
        this.isRotating = true;
      }
    }
  }

  onMouseMove(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.placementMode && this.placementObject) {
      // 更新放置预览位置
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObject(this.ground);
      if (intersects.length > 0) {
        this.placementObject.position.copy(intersects[0].point);
        this.placementObject.position.y += 0.5;
      }
    } else if (this.isDragging && this.dragObject) {
      // 拖拽物体
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersectPoint = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);
      this.dragObject.position.addVectors(intersectPoint, this.dragOffset);
      this.dragObject.position.y = Math.max(0.5, this.dragObject.position.y);
    } else if (this.isRotating) {
      // 旋转摄像机 - 使用更可靠的鼠标位置跟踪
      const deltaX = event.clientX - this.lastMouseX;
      const deltaY = event.clientY - this.lastMouseY;

      console.log('SceneManager: 旋转摄像机', { deltaX, deltaY, isRotating: this.isRotating });

      this.cameraTarget.x += deltaX * 0.01;
      this.cameraTarget.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.cameraTarget.y - deltaY * 0.01));

      this.updateCamera();
    }

    // 更新鼠标位置
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  }

  onMouseUp(event) {
    if (this.isDragging && this.dragObject) {
      this.physicsEngine.setDragging(this.dragObject, false);
      this.isDragging = false;
      this.dragObject = null;
    }

    this.isRotating = false;
  }

  onWheel(event) {
    this.cameraRadius += event.deltaY * 0.01;
    this.cameraRadius = Math.max(5, Math.min(50, this.cameraRadius));
    this.updateCamera();
  }

  // 选中物体
  selectObject(object) {
    // 移除之前的选中边框
    if (this.selectionBox) {
      this.scene.remove(this.selectionBox);
      this.selectionBox = null;
    }

    this.selectedObject = object;

    if (object) {
      // 创建选中边框
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      const geometry = new THREE.BoxGeometry(size.x + 0.2, size.y + 0.2, size.z + 0.2);
      const edges = new THREE.EdgesGeometry(geometry);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0xff0000,
        linewidth: 3,
        transparent: true,
        opacity: 0.8
      });

      this.selectionBox = new THREE.LineSegments(edges, lineMaterial);
      this.selectionBox.position.copy(center);
      this.scene.add(this.selectionBox);

      // 通知外部组件有物体被选中
      if (this.onObjectSelected) {
        this.onObjectSelected(object);
      }
    } else {
      // 通知外部组件取消选中
      if (this.onObjectSelected) {
        this.onObjectSelected(null);
      }
    }
  }

  // 删除选中的物体
  deleteSelectedObject() {
    if (this.selectedObject) {
      // 从场景中移除
      this.scene.remove(this.selectedObject);

      // 从物理引擎中移除
      this.physicsEngine.removeObject(this.selectedObject);

      // 从voxelObjects数组中移除
      const index = this.voxelObjects.indexOf(this.selectedObject);
      if (index > -1) {
        this.voxelObjects.splice(index, 1);
      }

      // 移除选中边框
      if (this.selectionBox) {
        this.scene.remove(this.selectionBox);
        this.selectionBox = null;
      }

      this.selectedObject = null;

      // 通知外部组件
      if (this.onObjectSelected) {
        this.onObjectSelected(null);
      }
    }
  }

  // 设置选中回调
  setObjectSelectedCallback(callback) {
    this.onObjectSelected = callback;
  }

  updateCamera() {
    const x = this.cameraRadius * Math.cos(this.cameraTarget.y) * Math.cos(this.cameraTarget.x);
    const y = this.cameraRadius * Math.sin(this.cameraTarget.y);
    const z = this.cameraRadius * Math.cos(this.cameraTarget.y) * Math.sin(this.cameraTarget.x);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  // 进入放置模式
  enterPlacementMode(voxels, mass, restitution, scale, callback) {
    this.placementMode = true;
    this.placementCallback = callback;

    // 创建预览物体
    this.placementObject = createVoxelObject(voxels, mass, restitution, scale);
    this.placementObject.material = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7
    });

    // 给所有子物体设置透明材质
    this.placementObject.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        child.material.transparent = true;
        child.material.opacity = 0.7;
      }
    });

    this.scene.add(this.placementObject);
  }

  // 处理放置
  handlePlacement() {
    if (this.placementObject && this.placementCallback) {
      const position = this.placementObject.position.clone();
      const voxels = this.placementObject.userData.originalVoxels;
      const mass = this.placementObject.userData.mass;
      const restitution = this.placementObject.userData.restitution;
      const scale = this.placementObject.scale.x;

      // 移除预览物体
      this.scene.remove(this.placementObject);

      // 创建真实物体
      const realObject = createVoxelObject(voxels, mass, restitution, scale);
      realObject.position.copy(position);

      this.scene.add(realObject);
      this.physicsEngine.addObject(realObject);
      this.voxelObjects.push(realObject);

      // 退出放置模式
      this.placementMode = false;
      this.placementObject = null;

      if (this.placementCallback) {
        this.placementCallback(realObject); // 传递创建的物体
        this.placementCallback = null;
      }
    }
  }

  // 取消放置
  cancelPlacement() {
    if (this.placementObject) {
      this.scene.remove(this.placementObject);
      this.placementObject = null;
    }
    this.placementMode = false;
    this.placementCallback = null;
  }

  clearObjects() {
    this.voxelObjects.forEach(obj => {
      this.scene.remove(obj);
    });
    this.voxelObjects = [];
    this.physicsEngine.clear();

    // 清除选中状态
    this.selectObject(null);
  }

  startAnimation() {
    if (!this.isAnimating) {
      this.isAnimating = true;
      this.animate();
    }
  }

  stopAnimation() {
    this.isAnimating = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  forceRender() {
    if (this.renderer && this.scene && this.camera) {
      try {
        // 检查渲染器状态
        if (!this.renderer.domElement || !this.renderer.domElement.parentNode) {
          console.error('SceneManager: 渲染器DOM元素丢失');
          return;
        }

        // 检查容器尺寸和可见性
        if (this.container.clientWidth === 0 || this.container.clientHeight === 0) {
          console.log('SceneManager: 容器尺寸为0，强制设置尺寸');
          this.container.style.width = '100%';
          this.container.style.height = '400px';
          // 重新设置渲染器尺寸
          this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        }

        // 检查容器是否可见
        const containerStyle = window.getComputedStyle(this.container);
        if (containerStyle.display === 'none' || containerStyle.visibility === 'hidden') {
          console.log('SceneManager: 容器不可见，跳过渲染');
          return;
        }

        // 检查渲染器尺寸是否与容器匹配
        if (this.renderer.domElement.width !== this.container.clientWidth ||
          this.renderer.domElement.height !== this.container.clientHeight) {
          console.log('SceneManager: 渲染器尺寸不匹配，重新设置尺寸');
          this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        }

        this.renderer.render(this.scene, this.camera);
      } catch (error) {
        console.error('SceneManager: 强制渲染失败:', error);
      }
    }
  }

  animate() {
    if (!this.isAnimating) return;

    this.animationId = requestAnimationFrame(() => this.animate());

    try {
      // 检查渲染器状态
      if (!this.renderer || !this.scene || !this.camera) {
        console.error('SceneManager: 渲染组件缺失，停止动画');
        this.stopAnimation();
        return;
      }

      // 检查容器尺寸和可见性
      if (this.container.clientWidth === 0 || this.container.clientHeight === 0) {
        // 容器尺寸为0，强制设置尺寸
        this.container.style.width = '100%';
        this.container.style.height = '400px';
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
      }

      // 检查容器是否可见
      const containerStyle = window.getComputedStyle(this.container);
      if (containerStyle.display === 'none' || containerStyle.visibility === 'hidden') {
        // 容器不可见，跳过渲染但继续动画循环
        return;
      }

      // 检查渲染器尺寸是否与容器匹配
      if (this.renderer.domElement.width !== this.container.clientWidth ||
        this.renderer.domElement.height !== this.container.clientHeight) {
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
      }

      // 更新物理引擎
      this.physicsEngine.update(0.016);

      // 同步选中边框位置
      if (this.selectedObject && this.selectionBox) {
        const box = new THREE.Box3().setFromObject(this.selectedObject);
        const center = box.getCenter(new THREE.Vector3());
        this.selectionBox.position.copy(center);
      }

      // 确保渲染器状态正确
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    } catch (error) {
      console.error('SceneManager: 动画循环错误:', error);
      // 如果出现错误，停止动画循环
      this.stopAnimation();
    }
  }

  resize() {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  dispose() {
    console.log('SceneManager: 开始清理资源');

    // 停止动画循环
    this.stopAnimation();

    // 清理物理引擎
    if (this.physicsEngine) {
      this.physicsEngine.clear();
    }

    // 清理场景中的所有物体
    this.clearObjects();

    // 移除事件监听器
    if (this.renderer && this.renderer.domElement) {
      const canvas = this.renderer.domElement;
      if (this.boundMouseDown) canvas.removeEventListener('mousedown', this.boundMouseDown);
      if (this.boundMouseMove) canvas.removeEventListener('mousemove', this.boundMouseMove);
      if (this.boundMouseUp) canvas.removeEventListener('mouseup', this.boundMouseUp);
      if (this.boundWheel) canvas.removeEventListener('wheel', this.boundWheel);
    }

    // 清理渲染器
    if (this.renderer) {
      if (this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      this.renderer.dispose();
    }

    // 清理场景
    if (this.scene) {
      this.scene.clear();
    }

    // 重置状态
    this.isRotating = false;
    this.isDragging = false;
    this.dragObject = null;
    this.selectedObject = null;
    this.selectionBox = null;
    this.onObjectSelected = null;
    this.placementMode = false;
    this.placementObject = null;
    this.placementCallback = null;

    console.log('SceneManager: 资源清理完成');
  }
}

// 背包物品组件
const BackpackItem = ({ item, onPlace }) => {
  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-2 hover:border-blue-400 transition-colors cursor-pointer"
      onClick={() => onPlace(item)}>
      <img
        src={item.thumbnail}
        alt={`Item ${item.id}`}
        className="w-16 h-16 object-contain mb-2"
      />
      <div className="text-xs text-center">
        <div className="font-medium">物品 #{item.id}</div>
        <div className="text-gray-500">{item.mass}kg</div>
        <div className="text-gray-500">弹性{item.restitution}</div>
        <div className="text-gray-500">{item.voxels.length}方块</div>
      </div>
    </div>
  );
};

// 背包组件
const Backpack = ({ items, onPlaceItem, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="absolute top-24 right-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4 max-w-xs z-20">
      <h3 className="text-lg font-bold mb-3 text-center">🎒 背包</h3>
      {items.length === 0 ? (
        <div className="text-gray-500 text-center py-8">
          背包空空如也<br />
          画些图形来创建物品吧！
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
          {items.map(item => (
            <BackpackItem
              key={item.id}
              item={item}
              onPlace={onPlaceItem}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// 删除按钮组件
const DeleteButton = ({ isVisible, onDelete, position }) => {
  if (!isVisible) return null;

  return (
    <div
      className="absolute bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center cursor-pointer shadow-lg transition-colors z-10"
      style={{
        left: position.x - 16,
        top: position.y - 16,
        pointerEvents: 'auto'
      }}
      onClick={onDelete}
      title="删除物体"
    >
      ✕
    </div>
  );
};

// 放置控制面板
const PlacementPanel = ({ isVisible, scale, onScaleChange, onConfirm, onCancel }) => {
  if (!isVisible) return null;

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-bold mb-3 text-center">📐 放置物品</h3>
      <div className="flex items-center gap-4 mb-4">
        <label className="text-sm font-medium">缩放倍数:</label>
        <input
          type="range"
          min="0.5"
          max="3"
          step="0.1"
          value={scale}
          onChange={(e) => onScaleChange(parseFloat(e.target.value))}
          className="flex-1"
        />
        <span className="text-sm font-medium w-10">{scale}x</span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          取消
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          确认放置
        </button>
      </div>
      <div className="text-xs text-gray-600 mt-2 text-center">
        移动鼠标选择位置 | 点击确认放置
      </div>
    </div>
  );
};

// 主编辑器组件
const VoxelWorldEditor = ({ apiService }) => {
  const canvasRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const sceneContainerRef = useRef(null);
  const sceneManagerRef = useRef(null);
  const historyRef = useRef(null);

  const [tool, setTool] = useState(TOOLS.BRUSH);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentMass, setCurrentMass] = useState(1);
  const [currentRestitution, setCurrentRestitution] = useState(0.5); // 弹性系数
  const [fillMode, setFillMode] = useState('fill');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // 界面显示模式
  const [viewMode, setViewMode] = useState('both'); // 'both', 'editor', '3d'

  // 背包和放置相关状态
  const [backpackItems, setBackpackItems] = useState([]);
  const [showBackpack, setShowBackpack] = useState(true);
  const [placementMode, setPlacementMode] = useState(false);
  const [placementScale, setPlacementScale] = useState(1);
  const [nextItemId, setNextItemId] = useState(1);

  // 选中和删除相关状态
  const [selectedObject, setSelectedObject] = useState(null);
  const [deleteButtonPosition, setDeleteButtonPosition] = useState({ x: 0, y: 0 });
  const [sceneObjectCount, setSceneObjectCount] = useState(0);

  const [startPos, setStartPos] = useState(null);

  // AI生成器相关的状态
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  // 初始化3D场景和历史记录
  useEffect(() => {
    console.log('VoxelWorldEditor: 初始化3D场景');

    if (sceneContainerRef.current && !sceneManagerRef.current) {
      console.log('VoxelWorldEditor: 创建SceneManager');
      sceneManagerRef.current = new SceneManager(sceneContainerRef.current);

      // 设置选中物体回调
      sceneManagerRef.current.setObjectSelectedCallback((object) => {
        console.log('VoxelWorldEditor: 物体选中状态改变', object);
        setSelectedObject(object);
        if (object) {
          // 计算删除按钮位置
          updateDeleteButtonPosition(object);
        }
      });
    }

    if (canvasRef.current && !historyRef.current) {
      console.log('VoxelWorldEditor: 创建CanvasHistory');
      historyRef.current = new CanvasHistory(canvasRef.current);
      clearCanvas();
      historyRef.current.saveState();
      updateHistoryButtons();
    }

    return () => {
      console.log('VoxelWorldEditor: 清理资源');
      // 注意：不要在这里销毁SceneManager，让它保持状态
      // 只有在组件完全卸载时才清理
    };
  }, []);

  // 组件卸载时的清理
  useEffect(() => {
    return () => {
      console.log('VoxelWorldEditor: 组件卸载，清理所有资源');
      if (sceneManagerRef.current) {
        sceneManagerRef.current.dispose();
        sceneManagerRef.current = null;
      }
    };
  }, []);

  // 监听viewMode变化，确保3D场景正确初始化
  useEffect(() => {
    // 延迟执行以确保DOM尺寸更新完成
    setTimeout(() => {
      if (sceneManagerRef.current) {
        console.log('VoxelWorldEditor: 视图模式改变，调整3D场景尺寸');
        sceneManagerRef.current.resize();

        // 如果动画停止了，可以尝试重启
        if (!sceneManagerRef.current.isAnimating) {
          sceneManagerRef.current.startAnimation();
        }

        // 强制渲染一帧以确保立即更新
        sceneManagerRef.current.forceRender();
      }
    }, 100); // 延迟100ms可能有助于等待CSS过渡完成

  }, [viewMode]);

  // 确保绘图画布在模式切换时保持状态
  useEffect(() => {
    if ((viewMode === 'both' || viewMode === 'editor') && canvasRef.current && historyRef.current) {
      // 确保画布状态正确
      updateHistoryButtons();
    }
  }, [viewMode]);

  // 同步背包物品到3D场景
  useEffect(() => {
    if (sceneManagerRef.current && viewMode === '3d') {
      // 确保3D场景中的物体数量与背包物品同步
      const currentObjectCount = sceneManagerRef.current.voxelObjects.length;
      setSceneObjectCount(currentObjectCount);
    }
  }, [backpackItems.length, viewMode]);

  // 处理窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      if (sceneManagerRef.current) {
        sceneManagerRef.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 定期更新删除按钮位置
  useEffect(() => {
    if (!selectedObject) return;

    const updateInterval = setInterval(() => {
      if (selectedObject && sceneManagerRef.current) {
        updateDeleteButtonPosition(selectedObject);
      }
    }, 100); // 每100ms更新一次位置

    return () => clearInterval(updateInterval);
  }, [selectedObject]);

  // 更新删除按钮位置
  const updateDeleteButtonPosition = (object) => {
    if (!sceneManagerRef.current || !object) return;

    // 获取物体的屏幕坐标
    const vector = new THREE.Vector3();
    object.getWorldPosition(vector);

    // 将3D坐标转换为屏幕坐标
    vector.project(sceneManagerRef.current.camera);

    const container = sceneContainerRef.current;
    const rect = container.getBoundingClientRect();
    const x = (vector.x * 0.5 + 0.5) * rect.width;
    const y = (vector.y * -0.5 + 0.5) * rect.height;

    setDeleteButtonPosition({ x, y });
  };

  // 删除选中的物体
  const handleDeleteObject = () => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.deleteSelectedObject();
      setSceneObjectCount(prev => Math.max(0, prev - 1));
    }
    setSelectedObject(null);
  };

  // 更新历史按钮状态
  const updateHistoryButtons = () => {
    if (historyRef.current) {
      setCanUndo(historyRef.current.canUndo());
      setCanRedo(historyRef.current.canRedo());
    }
  };

  // 清空画布
  const clearCanvas = () => {
    clearCanvasUtil(canvasRef.current);
  };

  // 获取正确的鼠标位置
  const getMousePos = (e) => {
    return getMousePosUtil(e, canvasRef.current);
  };

  // 绘制函数
  const draw = (ctx, x, y) => {
    drawUtil(ctx, x, y, tool, color, brushSize);
  };

  // 绘制几何图形
  const drawShape = (ctx, startX, startY, endX, endY, isPreview = false) => {
    drawShapeUtil(ctx, startX, startY, endX, endY, tool, color, brushSize, fillMode, isPreview);
  };

  // 清除预览
  const clearPreview = () => {
    clearPreviewUtil(previewCanvasRef.current);
  };

  // 鼠标事件处理
  const handleMouseDown = (e) => {
    const pos = getMousePos(e);
    setIsDrawing(true);
    setStartPos(pos);

    if (tool === TOOLS.BRUSH || tool === TOOLS.ERASER) {
      const ctx = canvasRef.current.getContext('2d');
      draw(ctx, pos.x, pos.y);
    }
  };

  const handleMouseMove = (e) => {
    const pos = getMousePos(e);

    if (isDrawing) {
      const ctx = canvasRef.current.getContext('2d');

      if (tool === TOOLS.BRUSH || tool === TOOLS.ERASER) {
        draw(ctx, pos.x, pos.y);
      } else if (startPos && (tool === TOOLS.RECTANGLE || tool === TOOLS.CIRCLE || tool === TOOLS.LINE)) {
        clearPreview();
        const previewCtx = previewCanvasRef.current.getContext('2d');
        drawShape(previewCtx, startPos.x, startPos.y, pos.x, pos.y, true);
      }
    }
  };

  const handleMouseUp = (e) => {
    if (!isDrawing || !startPos) return;

    const pos = getMousePos(e);
    const ctx = canvasRef.current.getContext('2d');

    if (tool === TOOLS.RECTANGLE || tool === TOOLS.CIRCLE || tool === TOOLS.LINE) {
      drawShape(ctx, startPos.x, startPos.y, pos.x, pos.y, false);
      clearPreview();
    }

    setIsDrawing(false);
    setStartPos(null);

    if (historyRef.current) {
      historyRef.current.saveState();
      updateHistoryButtons();
    }
  };

  // Undo/Redo 功能
  const handleUndo = () => {
    if (historyRef.current && historyRef.current.undo()) {
      updateHistoryButtons();
    }
  };

  const handleRedo = () => {
    if (historyRef.current && historyRef.current.redo()) {
      updateHistoryButtons();
    }
  };

  // 通用的"加入背包"函数
  const addItemToBackpack = (voxels) => {
    if (!voxels || voxels.length === 0) {
      alert("无法创建空物品！");
      return;
    }
    const thumbnail = generateItemThumbnail(voxels);
    const newItem = { id: nextItemId, voxels, mass: currentMass, restitution: currentRestitution, thumbnail };
    setBackpackItems(prev => [...prev, newItem]);
    setNextItemId(prev => prev + 1);
  };

  // AI生成按钮的事件处理器
  const handleAiGenerate = async () => {
    setIsAiLoading(true);
    setAiError(null);
    try {
      if (!apiService) {
        throw new Error('API服务未初始化');
      }

      const voxels = await generateVoxelsFromPrompt(aiPrompt, apiService.request.bind(apiService));
      if (voxels && voxels.length > 0) {
        addItemToBackpack(voxels);
        setIsAiModalOpen(false);
      } else {
        setAiError("AI未能生成有效的物体。");
      }
    } catch (error) {
      setAiError(error.message || "发生未知错误。");
    } finally {
      setIsAiLoading(false);
    }
  };

  // 创建物品到背包
  const createItemToBackpack = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const voxels = sketchToVoxels(imageData.data, canvas.width, canvas.height);

    if (voxels.length > 0) {
      addItemToBackpack(voxels);
      clearCanvas();
      clearPreview();

      if (historyRef.current) {
        historyRef.current.saveState();
        updateHistoryButtons();
      }
    }
  };

  // 放置物品到场景
  const handlePlaceItem = (item) => {
    if (sceneManagerRef.current && !placementMode) {
      setPlacementMode(true);
      setPlacementScale(1);

      sceneManagerRef.current.enterPlacementMode(
        item.voxels,
        item.mass,
        item.restitution,
        placementScale,
        (createdObject) => {
          setPlacementMode(false);
          if (createdObject) {
            setSceneObjectCount(prev => prev + 1);
          }
        }
      );
    }
  };

  // 添加预设物体
  const addPresetObject = (type) => {
    let voxels = [];
    let color = new THREE.Color(Math.random(), Math.random(), Math.random());

    switch (type) {
      case 'cube':
        // 创建3x3x3的立方体
        for (let x = -1; x <= 1; x++) {
          for (let y = -1; y <= 1; y++) {
            for (let z = -1; z <= 1; z++) {
              voxels.push({ x, y, z, color });
            }
          }
        }
        break;

      case 'sphere':
        // 创建球形
        for (let x = -2; x <= 2; x++) {
          for (let y = -2; y <= 2; y++) {
            for (let z = -2; z <= 2; z++) {
              const distance = Math.sqrt(x * x + y * y + z * z);
              if (distance <= 2) {
                voxels.push({ x, y, z, color });
              }
            }
          }
        }
        break;

      case 'pyramid':
        // 创建金字塔
        for (let y = 0; y < 4; y++) {
          const size = 3 - y;
          for (let x = -size; x <= size; x++) {
            for (let z = -size; z <= size; z++) {
              voxels.push({ x, y: -y, z, color });
            }
          }
        }
        break;

      case 'cross':
        // 创建十字形
        // 垂直部分
        for (let y = -2; y <= 2; y++) {
          voxels.push({ x: 0, y, z: 0, color });
        }
        // 水平部分
        for (let x = -2; x <= 2; x++) {
          voxels.push({ x, y: 0, z: 0, color });
        }
        // 深度部分
        for (let z = -2; z <= 2; z++) {
          voxels.push({ x: 0, y: 0, z, color });
        }
        break;

      default:
        // 默认创建单个体素
        voxels.push({ x: 0, y: 0, z: 0, color });
        break;
    }

    if (voxels.length > 0 && sceneManagerRef.current) {
      // 随机生成物理属性
      const mass = 0.5 + Math.random() * 2; // 0.5-2.5kg
      const restitution = Math.random() * 0.8 + 0.2; // 0.2-1.0

      // 直接添加到3D场景
      const object = createVoxelObject(voxels, mass, restitution, 1);
      object.position.set(
        (Math.random() - 0.5) * 8,
        5 + Math.random() * 5,
        (Math.random() - 0.5) * 8
      );

      sceneManagerRef.current.scene.add(object);
      sceneManagerRef.current.physicsEngine.addObject(object);
      sceneManagerRef.current.voxelObjects.push(object);
      setSceneObjectCount(prev => prev + 1);
    }
  };

  // 更新放置缩放
  const handleScaleChange = (newScale) => {
    setPlacementScale(newScale);
    if (sceneManagerRef.current && sceneManagerRef.current.placementObject) {
      sceneManagerRef.current.placementObject.scale.set(newScale, newScale, newScale);
      // 更新弹性参数
      sceneManagerRef.current.placementObject.userData.restitution =
        sceneManagerRef.current.placementObject.userData.restitution || 0.5;
    }
  };

  // 确认放置
  const handleConfirmPlacement = () => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.handlePlacement();
    }
  };

  // 取消放置
  const handleCancelPlacement = () => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.cancelPlacement();
    }
    setPlacementMode(false);
  };

  // 清空画布并保存历史
  const handleClearCanvas = () => {
    clearCanvas();
    clearPreview();
    if (historyRef.current) {
      historyRef.current.saveState();
      updateHistoryButtons();
    }
  };

  // 清空3D场景
  const clear3DScene = () => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.clearObjects();
    }
    setSelectedObject(null);
    setSceneObjectCount(0);
  };

  // 手动重置所有内容
  const resetAllContent = () => {
    if (window.confirm('确定要重置所有内容吗？这将清空绘图、3D场景和背包中的所有物品。')) {
      console.log('VoxelWorldEditor: 用户手动重置所有内容');

      // 清空绘图
      if (canvasRef.current) {
        clearCanvas();
        if (historyRef.current) {
          historyRef.current.clear();
          updateHistoryButtons();
        }
      }

      // 清空3D场景
      clear3DScene();

      // 清空背包
      setBackpackItems([]);
      setNextItemId(1);

      // 重置绘图状态
      setTool(TOOLS.BRUSH);
      setColor('#000000');
      setBrushSize(3);
      setCurrentMass(1);
      setCurrentRestitution(0.5);
      setFillMode('fill');

      console.log('VoxelWorldEditor: 所有内容已重置');
    }
  };

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          handleRedo();
        }
      } else if (e.key === 'Escape' && placementMode) {
        handleCancelPlacement();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [placementMode, handleUndo, handleRedo]);

  // 模式切换时的状态保持
  const handleViewModeChange = (newMode) => {
    console.log('VoxelWorldEditor: 切换模式到', newMode);

    // 在切换前保存当前状态
    if (viewMode === '3d' && sceneManagerRef.current) {
      // 保存3D场景状态
      console.log('VoxelWorldEditor: 保存3D场景状态');
    }

    if ((viewMode === 'both' || viewMode === 'editor') && canvasRef.current) {
      // 保存绘图状态
      console.log('VoxelWorldEditor: 保存绘图状态');
    }

    setViewMode(newMode);

    // 如果切换到3D模式，确保场景正确初始化
    if (newMode === '3d') {
      setTimeout(() => {
        if (sceneContainerRef.current && (!sceneManagerRef.current || !sceneManagerRef.current.renderer)) {
          console.log('VoxelWorldEditor: 切换到3D模式，确保场景初始化');
          recoverSceneManager();
        }
      }, 100);
    }
  };

  // 错误恢复机制
  const recoverSceneManager = () => {
    console.log('VoxelWorldEditor: 尝试恢复SceneManager');

    if (sceneContainerRef.current) {
      // 清理旧的SceneManager
      if (sceneManagerRef.current) {
        sceneManagerRef.current.dispose();
        sceneManagerRef.current = null;
      }

      // 创建新的SceneManager
      try {
        sceneManagerRef.current = new SceneManager(sceneContainerRef.current);

        // 设置选中物体回调
        sceneManagerRef.current.setObjectSelectedCallback((object) => {
          console.log('VoxelWorldEditor: 物体选中状态改变', object);
          setSelectedObject(object);
          if (object) {
            updateDeleteButtonPosition(object);
          }
        });

        console.log('VoxelWorldEditor: SceneManager恢复成功');
        return true;
      } catch (error) {
        console.error('VoxelWorldEditor: SceneManager恢复失败:', error);
        return false;
      }
    }
    return false;
  };

  // AI生成器模态框组件
  const AiGeneratorModal = ({ isOpen, onClose, onGenerate }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
          <h3 className="text-xl font-bold mb-4">✨ AI 自然语言生成</h3>
          <p className="text-gray-600 mb-4 text-sm">
            输入你想要创造的物体，例如 "a red car" 或 "a tall tree"。
          </p>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded mb-4"
            rows="3"
            placeholder="例如: a car"
            disabled={isAiLoading}
          />
          {aiError && <p className="text-red-500 text-sm mb-4">{aiError}</p>}
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              disabled={isAiLoading}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              取消
            </button>
            <button
              onClick={onGenerate}
              disabled={isAiLoading || !aiPrompt.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
            >
              {isAiLoading ? '生成中...' : '生成'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* 顶部控制栏 */}
      <div className="bg-white shadow-sm p-3 border-b">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">🎨 方块世界编辑器</h1>

          <div className="flex items-center gap-4">
            {/* 视图切换按钮 */}
            <div className="flex gap-2">
              <button
                onClick={() => handleViewModeChange('both')}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${viewMode === 'both'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
              >
                📱 分屏模式
              </button>
              <button
                onClick={() => handleViewModeChange('editor')}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${viewMode === 'editor'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
              >
                �� 绘图模式
              </button>
              <button
                onClick={() => handleViewModeChange('3d')}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${viewMode === '3d'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
              >
                🌍 3D模式
              </button>
            </div>

            {/* 重置按钮 */}
            <button
              onClick={resetAllContent}
              className="px-4 py-2 bg-red-500 text-white rounded text-sm font-medium hover:bg-red-600 transition-colors"
              title="重置所有内容"
            >
              🔄 重置全部
            </button>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧绘图区域 */}
        {
          <
            div className={`p-4 transition-all duration-300 ${viewMode === 'both' ? 'w-1/2' : viewMode === 'editor' ? 'w-full' : 'w-0'
              }`}
            style={{ display: viewMode === '3d' ? 'none' : 'block' }}
          >
            <div className="bg-white rounded-lg shadow-lg p-4 h-full overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4 text-center">🎨 草图编辑器</h2>

              {/* 工具栏 */}
              <div className="mb-4">
                {/* 撤销重做按钮 */}
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={handleUndo}
                    disabled={!canUndo}
                    className={`px-3 py-2 rounded text-sm font-medium transition-colors ${canUndo
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    title="撤销 (Ctrl+Z)"
                  >
                    ↶ 撤销
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={!canRedo}
                    className={`px-3 py-2 rounded text-sm font-medium transition-colors ${canRedo
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    title="重做 (Ctrl+Y)"
                  >
                    ↷ 重做
                  </button>
                </div>

                {/* 工具选择 */}
                <div className="flex gap-2 mb-3 flex-wrap">
                  {Object.entries(TOOLS).map(([key, value]) => (
                    <button
                      key={key}
                      className={`px-3 py-2 rounded text-sm font-medium transition-colors ${tool === value
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                        }`}
                      onClick={() => setTool(value)}
                    >
                      {key === 'BRUSH' && '🖌️'}
                      {key === 'ERASER' && '🧹'}
                      {key === 'RECTANGLE' && '⬜'}
                      {key === 'CIRCLE' && '⭕'}
                      {key === 'LINE' && '📏'}
                      {key}
                    </button>
                  ))}
                </div>

                {/* 填充模式（仅几何图形） */}
                {(tool === TOOLS.RECTANGLE || tool === TOOLS.CIRCLE) && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium mb-2">🎯 填充模式:</label>
                    <div className="flex gap-2">
                      <button
                        className={`px-3 py-1 rounded text-sm ${fillMode === 'fill'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 hover:bg-gray-300'
                          }`}
                        onClick={() => setFillMode('fill')}
                      >
                        🔴 实心
                      </button>
                      <button
                        className={`px-3 py-1 rounded text-sm ${fillMode === 'stroke'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 hover:bg-gray-300'
                          }`}
                        onClick={() => setFillMode('stroke')}
                      >
                        ⭕ 空心
                      </button>
                    </div>
                  </div>
                )}

                {/* 颜色选择 */}
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-2">🎨 颜色选择:</label>
                  <div className="flex gap-1">
                    {COLORS.map(c => (
                      <button
                        key={c}
                        className={`w-8 h-8 rounded border-2 transition-transform hover:scale-110 ${color === c ? 'border-gray-800 shadow-lg' : 'border-gray-300'
                          }`}
                        style={{ backgroundColor: c }}
                        onClick={() => setColor(c)}
                        title={c}
                      />
                    ))}
                  </div>
                </div>

                {/* 画笔大小 */}
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-2">🖌️ 画笔大小: {brushSize}px</label>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* 物理属性设置 */}
                <div className="bg-gray-50 p-3 rounded mb-4">
                  <h4 className="font-medium mb-2">⚙️ 物理属性</h4>

                  {/* 物体质量 */}
                  <div className="mb-3">
                    <label className="block text-sm font-medium mb-2">⚖️ 质量: {currentMass}kg</label>
                    <input
                      type="range"
                      min="0.1"
                      max="10"
                      step="0.1"
                      value={currentMass}
                      onChange={(e) => setCurrentMass(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  {/* 弹性系数 */}
                  <div className="mb-2">
                    <label className="block text-sm font-medium mb-2">🏀 弹性: {currentRestitution}</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={currentRestitution}
                      onChange={(e) => setCurrentRestitution(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>无弹性</span>
                      <span>超级弹性</span>
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-2">
                  <button
                    onClick={handleClearCanvas}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors font-medium"
                  >
                    🗑️ 清空画布
                  </button>
                  <button
                    onClick={createItemToBackpack}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors font-medium"
                  >
                    🎒 加入背包
                  </button>
                  {/* 新增：AI生成按钮 */}
                  <button
                    onClick={() => {
                      setIsAiModalOpen(true);
                      setAiError(null);
                      setAiPrompt('');
                    }}
                    className="flex-1 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 font-medium"
                    title="使用自然语言生成物体"
                  >
                    ✨ AI生成
                  </button>
                </div>
              </div>

              {/* 画布容器 */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 relative">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={300}
                  className="border border-gray-300 cursor-crosshair bg-white rounded shadow-inner w-full absolute top-2 left-2"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={() => {
                    setIsDrawing(false);
                    clearPreview();
                  }}
                />
                <canvas
                  ref={previewCanvasRef}
                  width={400}
                  height={300}
                  className="border border-gray-300 cursor-crosshair bg-transparent rounded w-full absolute top-2 left-2 pointer-events-none"
                />
              </div>
            </div>
          </div>
        }

        {/* 右侧3D视图 */}
        <div
          className={`p-4 relative transition-all duration-300 ${viewMode === 'both' ? 'w-1/2' : viewMode === '3d' ? 'w-full' : 'w-0'
            }`}
          style={{ display: viewMode === 'editor' ? 'none' : 'block' }}
        >
          <div className="bg-white rounded-lg shadow-lg p-4 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">🌍 3D虚拟空间</h2>
              <div className="flex gap-2">
                {viewMode === '3d' && (
                  <button
                    onClick={() => handleViewModeChange('editor')}
                    className="px-3 py-1 rounded text-sm font-medium bg-green-500 text-white hover:bg-green-600 transition-colors"
                  >
                    🎨 去绘图
                  </button>
                )}
                <button
                  onClick={() => setShowBackpack(!showBackpack)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${showBackpack ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                >
                  🎒 背包
                </button>
              </div>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded">
              <div className="flex justify-between items-center text-sm">
                <span>📦 背包物品: <strong>{backpackItems.length}</strong> 个</span>
                <div className="flex gap-2 mr-36">
                  <button
                    onClick={recoverSceneManager}
                    className="px-3 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600 transition-colors"
                    title="恢复3D场景"
                  >
                    🔄 恢复场景
                  </button>
                  <button
                    onClick={clear3DScene}
                    className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
                  >
                    🗑️ 清空场景
                  </button>
                </div>
              </div>
              <div className="text-xs text-gray-600 mt-1">
                🖱️ 左键拖拽物体或旋转视角 | 🎡 滚轮缩放视角 | ✕ 点击物体显示删除按钮
              </div>
            </div>

            {/* 3D模式下的快捷工具栏 */}
            {viewMode === '3d' && (
              <div className="mb-4 p-3 bg-blue-50 rounded">
                <div className="flex flex-wrap gap-2 mb-2">
                  <button
                    onClick={() => addPresetObject('cube')}
                    className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                  >
                    🧊 添加方块
                  </button>
                  <button
                    onClick={() => addPresetObject('sphere')}
                    className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors"
                  >
                    🏀 添加球体
                  </button>
                  <button
                    onClick={() => addPresetObject('pyramid')}
                    className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 transition-colors"
                  >
                    🔺 添加三角
                  </button>
                  <button
                    onClick={() => addPresetObject('cross')}
                    className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
                  >
                    ➕ 添加十字
                  </button>
                </div>
                <div className="text-xs text-gray-600">
                  💡 快速添加预设物体，也可以切换到绘图模式创建自定义物体
                </div>
              </div>
            )}

            {/* 3D渲染容器 */}
            <div
              ref={sceneContainerRef}
              className="flex-1 border border-gray-300 rounded bg-sky-100 min-h-96 relative"
              style={{ minHeight: '400px' }}
            >
              {/* 删除按钮 */}
              <DeleteButton
                isVisible={!!selectedObject && !placementMode}
                onDelete={handleDeleteObject}
                position={deleteButtonPosition}
              />

              {/* 空场景提示 */}
              {viewMode === '3d' && backpackItems.length === 0 && sceneObjectCount === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 text-center shadow-lg max-w-sm">
                    <div className="text-4xl mb-4">🎨</div>
                    <h3 className="text-lg font-bold mb-2">欢迎来到3D世界！</h3>
                    <p className="text-gray-600 text-sm mb-4">
                      你可以：<br />
                      • 使用上方快捷按钮添加预设物体<br />
                      • 点击"去绘图"创建自定义物体<br />
                      • 拖拽鼠标旋转视角查看场景
                    </p>
                    <div className="text-xs text-gray-500">
                      试试添加一些物体感受物理效果吧！
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 text-center">
              <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                💡 <strong>提示:</strong> {viewMode === '3d' ? '使用快捷按钮添加预设物体，或切换到绘图模式创建自定义物体。' : '在绘图区画图后点击"加入背包"，然后从背包中选择物品放入3D空间。'}设置不同的质量和弹性可以创造有趣的物理效果！
              </div>
            </div>
          </div>

          {/* 背包界面 */}
          <Backpack
            items={backpackItems}
            onPlaceItem={handlePlaceItem}
            isVisible={showBackpack && viewMode === '3d'}
          />

          {/* 放置控制面板 */}
          <PlacementPanel
            isVisible={placementMode}
            scale={placementScale}
            onScaleChange={handleScaleChange}
            onConfirm={handleConfirmPlacement}
            onCancel={handleCancelPlacement}
          />
        </div>

      </div>

      {/* 新增：渲染AI模态框 */}
      <AiGeneratorModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onGenerate={handleAiGenerate}
      />
    </div>
  );
};

export default VoxelWorldEditor;