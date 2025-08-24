// 虚拟博主系统的React Hook
import { useState, useEffect, useCallback } from 'react';
import { bloggerManager, initializeDefaultBloggers } from '../data/virtualBloggers';
import { bloggerScheduler, initializeBloggerScheduler } from '../services/BloggerScheduler';
import { dynamicBlogPostsManager, initializeDynamicBlogPosts } from '../data/dynamicBlogPosts';
import { initializeStorage } from '../services/VirtualBloggerStorage';
import { initializeDynamicFeedPosts } from '../data/dynamicFeedPosts';

export const useVirtualBloggers = () => {
  const [bloggers, setBloggers] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 加载博主数据
  const loadBloggers = useCallback(() => {
    try {
      const allBloggers = bloggerManager.getAllBloggers();
      setBloggers(allBloggers);
      setError(null);
    } catch (err) {
      console.error('加载博主数据失败:', err);
      setError(err.message);
    }
  }, []);

  // 初始化虚拟博主系统
  const initializeSystem = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('🚀 初始化虚拟博主系统...');

      // 1. 初始化存储服务
      initializeStorage();

      // 2. 初始化默认博主（如果没有的话）
      await initializeDefaultBloggers();

      // 3. 初始化调度器
      initializeBloggerScheduler();

      // 4. 初始化动态博客系统
      await initializeDynamicBlogPosts();

      // 5. 初始化动态Feed推文系统
      await initializeDynamicFeedPosts();

      // 6. 加载博主数据
      loadBloggers();

      setIsInitialized(true);
      console.log('✅ 虚拟博主系统初始化完成');
    } catch (err) {
      console.error('❌ 虚拟博主系统初始化失败:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [loadBloggers]);

  // 组件挂载时初始化
  useEffect(() => {
    if (!isInitialized) {
      initializeSystem();
    }
  }, [isInitialized]); // 移除 initializeSystem 依赖避免重复初始化

  // 返回系统状态和操作方法
  return {
    // 状态
    bloggers,
    isInitialized,
    isLoading,
    error,

    // 统计信息
    stats: {
      total: bloggers.length,
      active: bloggers.filter(b => b.isActive).length,
      completed: bloggers.filter(b => !b.isActive).length,
      schedulerStats: bloggerScheduler.getSchedulingStats(),
      blogStats: dynamicBlogPostsManager.getStats()
    },

    // 操作方法
    refreshBloggers: loadBloggers,
    reinitialize: initializeSystem
  };
};

export default useVirtualBloggers;