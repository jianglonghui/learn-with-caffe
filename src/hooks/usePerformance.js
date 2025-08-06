import { useState, useEffect, useCallback } from 'react';
import { debounce, throttle, getDevicePerformance } from '../utils/performance';

// 性能监控 Hook
export const usePerformanceMonitor = () => {
    const [performanceData, setPerformanceData] = useState({
        devicePerformance: 'medium',
        memoryUsage: 0,
        renderTime: 0
    });

    useEffect(() => {
        const devicePerf = getDevicePerformance();
        setPerformanceData(prev => ({
            ...prev,
            devicePerformance: devicePerf
        }));

        // 监控内存使用（如果支持）
        if (performance.memory) {
            const updateMemory = () => {
                setPerformanceData(prev => ({
                    ...prev,
                    memoryUsage: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)
                }));
            };

            const memoryInterval = setInterval(updateMemory, 5000);
            return () => clearInterval(memoryInterval);
        }
    }, []);

    return performanceData;
};

// 防抖 Hook
export const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};

// 节流 Hook
export const useThrottle = (callback, delay) => {
    const throttledCallback = useCallback(
        throttle(callback, delay),
        [callback, delay]
    );

    return throttledCallback;
};

// 虚拟滚动 Hook
export const useVirtualScroll = (items, containerHeight, itemHeight) => {
    const [scrollTop, setScrollTop] = useState(0);

    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(startIndex + visibleCount + 1, items.length);

    const visibleItems = items.slice(startIndex, endIndex);
    const totalHeight = items.length * itemHeight;
    const offsetY = startIndex * itemHeight;

    const handleScroll = useCallback((e) => {
        setScrollTop(e.target.scrollTop);
    }, []);

    return {
        visibleItems,
        totalHeight,
        offsetY,
        handleScroll
    };
};