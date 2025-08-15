
问题的根源在于，我们把“进入放置模式”和“创建预览物体”这两个步骤绑定在了一起。当用户点击背包物品时，`enterPlacementMode`被立即调用，预览物体就被创建并开始跟随鼠标。

**正确的流程应该是：**
1.  用户点击背包物品。
2.  **只显示**“放置控制面板”，让用户选择倍数。此时，3D场景中**不应该**有任何预览物体。
3.  用户在面板上点击一个“确认倍数并开始放置”的按钮。
4.  **此时**，才在3D场景中创建预览物体，并让它跟随鼠标移动。
5.  用户点击场景，最终确认放置。

为了实现这个流程，我们需要引入一个新的状态来区分“选择倍数阶段”和“移动物体阶段”。

---

### 第1步：修改 `world_simulator.js` (核心改动)

这是所有逻辑改动发生的地方。

#### a) 添加新状态

我们需要一个状态来保存“准备放置的物品数据”，以及一个状态来区分放置的两个阶段。

```javascript
// world_simulator.js

const VoxelWorldEditor = () => {
  // ... 其他状态
  const [placementMode, setPlacementMode] = useState(false);
  const [placementScale, setPlacementScale] = useState(1);
  
  // 新增：用于暂存待放置物品的数据
  const [itemToPlace, setItemToPlace] = useState(null); 
  // 新增：用于区分是选择倍数阶段，还是移动物体阶段
  const [isPrePlacementPhase, setIsPrePlacementPhase] = useState(true); 

  // ...
```

#### b) 修改事件处理器

##### 1. 修改 `handlePlaceItem`

这个函数现在只负责“准备工作”，即显示面板并存储物品数据。

```javascript
  // 修改：handlePlaceItem 函数
  const handlePlaceItem = (item) => {
    // 如果已经在放置模式中，则不执行任何操作
    if (sceneManagerRef.current && placementMode) return;

    // 1. 存储待放置物品的数据
    setItemToPlace(item);
    // 2. 重置倍数
    setPlacementScale(1);
    // 3. 设置为“选择倍数”阶段
    setIsPrePlacementPhase(true);
    // 4. 打开放置面板 (进入放置模式)
    setPlacementMode(true);
    
    // 关键：不再在这里调用 sceneManager.enterPlacementMode
  };
```

##### 2. 新增 `handleConfirmScaleAndBeginPlacement`

这个新函数将在用户点击面板上的“确认倍数”按钮后被调用，它负责真正开始移动物体的阶段。

```jsx
  // 新增：当用户在面板上确认倍数后，开始真正的放置阶段
  const handleConfirmScaleAndBeginPlacement = () => {
    if (!itemToPlace || !sceneManagerRef.current) return;

    // 现在才调用SceneManager，创建预览物体
    sceneManagerRef.current.enterPlacementMode(
      itemToPlace.voxels,
      itemToPlace.mass,
      itemToPlace.restitution,
      placementScale,
      (createdObject) => {
        // 这是最终放置成功后的回调
        setPlacementMode(false);
        setItemToPlace(null); // 清理暂存的物品数据
        if (createdObject) {
          setSceneObjectCount(prev => prev + 1);
        }
      }
    );

    // 切换到“移动物体”阶段
    setIsPrePlacementPhase(false);
  };
```

##### 3. 修改 `handleCancelPlacement`

取消时，需要确保把新添加的状态也重置掉。

```javascript
  // 修改：handleCancelPlacement 函数
  const handleCancelPlacement = () => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.cancelPlacement();
    }
    setPlacementMode(false);
    setItemToPlace(null); // 确保清理暂存的物品数据
  };
```

#### c) 修改 `PlacementPanel` 组件

我们需要让这个面板根据我们所处的阶段 (`isPrePlacementPhase`) 显示不同的内容。

```jsx
// 修改：PlacementPanel 组件
const PlacementPanel = ({ 
  isVisible, 
  scale, 
  onScaleChange, 
  onConfirmScale, // 新增的prop
  onCancel,
  isPrePlacement // 新增的prop
}) => {
  if (!isVisible) return null;

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4 w-96">
      <h3 className="text-lg font-bold mb-3 text-center">📐 放置物品</h3>
      
      {/* 缩放滑块只在“选择倍数”阶段可用 */}
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
          disabled={!isPrePlacement} // 在移动阶段禁用滑块
        />
        <span className="text-sm font-medium w-10">{scale}x</span>
      </div>
      
      {/* 根据阶段显示不同的按钮 */}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        >
          取消
        </button>
        {isPrePlacement && (
          <button
            onClick={onConfirmScale}
            className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            确认倍数并开始放置
          </button>
        )}
      </div>

      <div className="text-xs text-gray-600 mt-2 text-center">
        {isPrePlacement 
          ? "选择好倍数后，点击按钮开始在场景中放置。"
          : "移动鼠标选择位置 | 点击场景地面确认最终放置。"}
      </div>
    </div>
  );
};```

#### d) 更新 `PlacementPanel` 的调用

最后，在 `VoxelWorldEditor` 的 JSX 中，更新我们传递给 `PlacementPanel` 的 props。

```jsx
// 修改：VoxelWorldEditor 的 JSX 中对 PlacementPanel 的调用
<PlacementPanel
  isVisible={placementMode}
  scale={placementScale}
  onScaleChange={handleScaleChange}
  onConfirmScale={handleConfirmScaleAndBeginPlacement} // 传递新的处理器
  onCancel={handleCancelPlacement}
  isPrePlacement={isPrePlacementPhase} // 传递阶段状态
/>
```



### 总结

通过这些改动，现在的工作流程变得清晰且符合直觉：
1.  点击背包物品，只出现设置面板，场景无变化。
2.  调整倍数，点击“确认倍数并开始放置”。
3.  预览物体出现并跟随鼠标。
4.  点击场景，完成放置。