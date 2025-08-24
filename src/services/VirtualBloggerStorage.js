// 虚拟博主本地存储服务
export class VirtualBloggerStorage {
  constructor() {
    this.storageKeys = {
      bloggers: 'virtualBloggers',
      bloggerContent: 'virtualBloggerContent',
      bloggerPosts: 'virtualBloggerPosts',
      schedulerState: 'bloggerSchedulerState',
      settings: 'virtualBloggerSettings'
    };
  }

  // ==================== 博主数据存储 ====================
  
  // 保存博主列表
  saveBloggers(bloggers) {
    try {
      const data = Array.isArray(bloggers) ? bloggers : Array.from(bloggers.values());
      localStorage.setItem(this.storageKeys.bloggers, JSON.stringify(data));
      console.log(`✅ 已保存 ${data.length} 个虚拟博主到本地存储`);
      return true;
    } catch (error) {
      console.error('❌ 保存博主数据失败:', error);
      return false;
    }
  }

  // 加载博主列表
  loadBloggers() {
    try {
      const stored = localStorage.getItem(this.storageKeys.bloggers);
      if (!stored) {
        console.log('📭 本地存储中没有博主数据');
        return [];
      }
      
      const data = JSON.parse(stored);
      console.log(`📥 从本地存储加载了 ${data.length} 个虚拟博主`);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('❌ 加载博主数据失败:', error);
      return [];
    }
  }

  // 保存单个博主
  saveBlogger(blogger) {
    try {
      const bloggers = this.loadBloggers();
      const existingIndex = bloggers.findIndex(b => b.id === blogger.id);
      
      if (existingIndex >= 0) {
        bloggers[existingIndex] = blogger;
      } else {
        bloggers.push(blogger);
      }
      
      return this.saveBloggers(bloggers);
    } catch (error) {
      console.error('❌ 保存单个博主失败:', error);
      return false;
    }
  }

  // 删除博主
  deleteBlogger(bloggerId) {
    try {
      const bloggers = this.loadBloggers();
      const filteredBloggers = bloggers.filter(b => b.id !== bloggerId);
      
      if (filteredBloggers.length < bloggers.length) {
        this.saveBloggers(filteredBloggers);
        // 同时删除相关内容
        this.deleteBloggerContent(bloggerId);
        console.log(`🗑️ 已删除博主 ${bloggerId} 及其相关内容`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ 删除博主失败:', error);
      return false;
    }
  }

  // ==================== 博主内容存储 ====================

  // 保存博主生成的内容
  saveBloggerContent(bloggerId, content) {
    try {
      const allContent = this.loadAllBloggerContent();
      
      if (!allContent[bloggerId]) {
        allContent[bloggerId] = [];
      }
      
      // 添加新内容到开头（最新的在前）
      allContent[bloggerId].unshift({
        ...content,
        id: this.generateContentId(),
        savedAt: new Date().toISOString()
      });
      
      // 限制每个博主最多保存100条内容
      if (allContent[bloggerId].length > 100) {
        allContent[bloggerId] = allContent[bloggerId].slice(0, 100);
      }
      
      localStorage.setItem(this.storageKeys.bloggerContent, JSON.stringify(allContent));
      console.log(`📝 已保存博主 ${bloggerId} 的新内容`);
      return true;
    } catch (error) {
      console.error('❌ 保存博主内容失败:', error);
      return false;
    }
  }

  // 加载所有博主内容
  loadAllBloggerContent() {
    try {
      const stored = localStorage.getItem(this.storageKeys.bloggerContent);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('❌ 加载博主内容失败:', error);
      return {};
    }
  }

  // 加载指定博主的内容
  loadBloggerContent(bloggerId, limit = 20) {
    try {
      const allContent = this.loadAllBloggerContent();
      const bloggerContent = allContent[bloggerId] || [];
      
      return limit > 0 ? bloggerContent.slice(0, limit) : bloggerContent;
    } catch (error) {
      console.error(`❌ 加载博主 ${bloggerId} 内容失败:`, error);
      return [];
    }
  }

  // 删除博主内容
  deleteBloggerContent(bloggerId) {
    try {
      const allContent = this.loadAllBloggerContent();
      delete allContent[bloggerId];
      localStorage.setItem(this.storageKeys.bloggerContent, JSON.stringify(allContent));
      return true;
    } catch (error) {
      console.error(`❌ 删除博主 ${bloggerId} 内容失败:`, error);
      return false;
    }
  }

  // ==================== 博客文章存储 ====================

  // 保存博客文章（用于展示层）
  saveBlogPosts(posts) {
    try {
      const existingPosts = this.loadBlogPosts();
      const allPosts = [...posts, ...existingPosts];
      
      // 按时间排序并去重
      const uniquePosts = allPosts.reduce((acc, post) => {
        const existingPost = acc.find(p => p.id === post.id);
        if (!existingPost) {
          acc.push(post);
        }
        return acc;
      }, []);
      
      uniquePosts.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // 限制最多保存200篇文章
      const limitedPosts = uniquePosts.slice(0, 200);
      
      localStorage.setItem(this.storageKeys.bloggerPosts, JSON.stringify(limitedPosts));
      console.log(`📚 已保存 ${limitedPosts.length} 篇博客文章`);
      return true;
    } catch (error) {
      console.error('❌ 保存博客文章失败:', error);
      return false;
    }
  }

  // 加载博客文章
  loadBlogPosts() {
    try {
      const stored = localStorage.getItem(this.storageKeys.bloggerPosts);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('❌ 加载博客文章失败:', error);
      return [];
    }
  }

  // ==================== 调度器状态存储 ====================

  // 保存调度器状态
  saveSchedulerState(state) {
    try {
      localStorage.setItem(this.storageKeys.schedulerState, JSON.stringify({
        ...state,
        updatedAt: new Date().toISOString()
      }));
      return true;
    } catch (error) {
      console.error('❌ 保存调度器状态失败:', error);
      return false;
    }
  }

  // 加载调度器状态
  loadSchedulerState() {
    try {
      const stored = localStorage.getItem(this.storageKeys.schedulerState);
      return stored ? JSON.parse(stored) : {
        lastScheduleTime: null,
        scheduleCount: 0,
        autoSchedulingEnabled: true
      };
    } catch (error) {
      console.error('❌ 加载调度器状态失败:', error);
      return {};
    }
  }

  // ==================== 设置存储 ====================

  // 保存设置
  saveSettings(settings) {
    try {
      const currentSettings = this.loadSettings();
      const newSettings = {
        ...currentSettings,
        ...settings,
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem(this.storageKeys.settings, JSON.stringify(newSettings));
      console.log('⚙️ 设置已保存');
      return true;
    } catch (error) {
      console.error('❌ 保存设置失败:', error);
      return false;
    }
  }

  // 加载设置
  loadSettings() {
    try {
      const stored = localStorage.getItem(this.storageKeys.settings);
      return stored ? JSON.parse(stored) : this.getDefaultSettings();
    } catch (error) {
      console.error('❌ 加载设置失败:', error);
      return this.getDefaultSettings();
    }
  }

  // 获取默认设置
  getDefaultSettings() {
    return {
      autoSchedulingEnabled: true,
      schedulingInterval: 24, // 小时
      maxBloggers: 10,
      maxContentPerBlogger: 100,
      enableNotifications: true,
      theme: 'light',
      language: 'zh-CN',
      createdAt: new Date().toISOString()
    };
  }

  // ==================== 工具方法 ====================

  // 生成内容ID
  generateContentId() {
    return 'content_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // 清理存储（删除过期数据）
  cleanupStorage() {
    try {
      const settings = this.loadSettings();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // 保留30天内的数据

      // 清理博主内容
      const allContent = this.loadAllBloggerContent();
      let cleanedContent = {};
      let deletedCount = 0;

      Object.keys(allContent).forEach(bloggerId => {
        cleanedContent[bloggerId] = allContent[bloggerId].filter(content => {
          const contentDate = new Date(content.createdAt || content.savedAt);
          const shouldKeep = contentDate > cutoffDate;
          if (!shouldKeep) deletedCount++;
          return shouldKeep;
        });
      });

      if (deletedCount > 0) {
        localStorage.setItem(this.storageKeys.bloggerContent, JSON.stringify(cleanedContent));
        console.log(`🧹 清理完成，删除了 ${deletedCount} 条过期内容`);
      }

      return true;
    } catch (error) {
      console.error('❌ 清理存储失败:', error);
      return false;
    }
  }

  // 获取存储使用情况
  getStorageUsage() {
    try {
      let totalSize = 0;
      const usage = {};

      Object.values(this.storageKeys).forEach(key => {
        const data = localStorage.getItem(key);
        const size = data ? new Blob([data]).size : 0;
        usage[key] = {
          size: size,
          sizeFormatted: this.formatBytes(size)
        };
        totalSize += size;
      });

      return {
        total: totalSize,
        totalFormatted: this.formatBytes(totalSize),
        breakdown: usage,
        percentage: (totalSize / (5 * 1024 * 1024) * 100).toFixed(2) // 假设5MB限制
      };
    } catch (error) {
      console.error('❌ 获取存储使用情况失败:', error);
      return null;
    }
  }

  // 格式化字节大小
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // 导出数据
  exportData() {
    try {
      const data = {
        bloggers: this.loadBloggers(),
        content: this.loadAllBloggerContent(),
        posts: this.loadBlogPosts(),
        schedulerState: this.loadSchedulerState(),
        settings: this.loadSettings(),
        exportedAt: new Date().toISOString(),
        version: '1.0'
      };

      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('❌ 导出数据失败:', error);
      return null;
    }
  }

  // 导入数据
  importData(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.version && data.bloggers) {
        // 验证数据格式
        if (Array.isArray(data.bloggers)) {
          this.saveBloggers(data.bloggers);
        }
        
        if (data.content) {
          localStorage.setItem(this.storageKeys.bloggerContent, JSON.stringify(data.content));
        }
        
        if (data.posts && Array.isArray(data.posts)) {
          localStorage.setItem(this.storageKeys.bloggerPosts, JSON.stringify(data.posts));
        }
        
        if (data.settings) {
          this.saveSettings(data.settings);
        }

        console.log('✅ 数据导入成功');
        return true;
      } else {
        throw new Error('数据格式不正确');
      }
    } catch (error) {
      console.error('❌ 导入数据失败:', error);
      return false;
    }
  }

  // 重置所有数据
  resetAll() {
    try {
      Object.values(this.storageKeys).forEach(key => {
        localStorage.removeItem(key);
      });
      console.log('🔄 所有虚拟博主数据已重置');
      return true;
    } catch (error) {
      console.error('❌ 重置数据失败:', error);
      return false;
    }
  }
}

// 创建全局存储实例
export const virtualBloggerStorage = new VirtualBloggerStorage();

// 初始化存储服务
export const initializeStorage = () => {
  // 执行存储清理
  virtualBloggerStorage.cleanupStorage();
  
  // 输出存储使用情况
  const usage = virtualBloggerStorage.getStorageUsage();
  if (usage) {
    console.log(`💾 虚拟博主存储使用情况: ${usage.totalFormatted} (${usage.percentage}%)`);
  }
  
  console.log('💾 虚拟博主存储服务已初始化');
};