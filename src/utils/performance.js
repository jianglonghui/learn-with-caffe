// 性能优化工具函数

// 防抖函数 - 减少频繁调用
export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// 节流函数 - 限制调用频率
export const throttle = (func, limit) => {
    let inThrottle;
    return function () {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

// 懒加载图片
export const lazyLoadImage = (src, placeholder = '') => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(src);
        img.onerror = reject;
        img.src = src;
    });
};

// 内存清理辅助函数
export const cleanupResources = (resources = []) => {
    resources.forEach(resource => {
        if (resource && typeof resource.dispose === 'function') {
            resource.dispose();
        }
        if (resource && typeof resource.destroy === 'function') {
            resource.destroy();
        }
    });
};

// 检测设备性能
export const getDevicePerformance = () => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) {
        return 'low';
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';

    // 简单的性能评估
    if (renderer.includes('Intel') || renderer.includes('AMD')) {
        return 'medium';
    }

    return navigator.hardwareConcurrency > 4 ? 'high' : 'medium';
};