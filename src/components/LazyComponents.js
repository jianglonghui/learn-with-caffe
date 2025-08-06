import { lazy } from 'react';

// 懒加载大型组件以提升初始加载性能
export const VoxelWorldEditor = lazy(() =>
    import('../world_simulator').then(module => ({
        default: module.default
    }))
);

// 可以添加更多懒加载组件
export const PhysicsEngine = lazy(() =>
    import('../physics-engine').then(module => ({
        default: module.default
    }))
);