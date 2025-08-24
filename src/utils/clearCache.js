// 清除缓存工具函数
export const clearAllCache = () => {
  try {
    console.log('🧹 开始清除所有缓存数据...');
    
    // 获取所有localStorage的键
    const allKeys = Object.keys(localStorage);
    console.log(`📋 发现 ${allKeys.length} 个localStorage键:`, allKeys);
    
    // 清除所有localStorage数据
    let clearedCount = 0;
    allKeys.forEach(key => {
      localStorage.removeItem(key);
      clearedCount++;
    });
    
    console.log(`✅ 已清除 ${clearedCount} 个localStorage项`);
    
    // 清除sessionStorage
    const sessionKeys = Object.keys(sessionStorage);
    sessionStorage.clear();
    console.log(`✅ 已清除 ${sessionKeys.length} 个sessionStorage项`);
    
    // 清除浏览器缓存（如果可能）
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            console.log(`🗑️ 清除缓存: ${cacheName}`);
            return caches.delete(cacheName);
          })
        );
      }).then(() => {
        console.log('✅ 浏览器缓存清除完成');
      }).catch(error => {
        console.warn('⚠️ 清除浏览器缓存时出错:', error);
      });
    }
    
    // 清除IndexedDB（如果有的话）
    if ('indexedDB' in window) {
      try {
        // 尝试删除可能存在的数据库
        const dbNames = ['virtualBloggers', 'contentStorage', 'appData'];
        dbNames.forEach(dbName => {
          const deleteRequest = indexedDB.deleteDatabase(dbName);
          deleteRequest.onsuccess = () => {
            console.log(`✅ 已删除IndexedDB数据库: ${dbName}`);
          };
          deleteRequest.onerror = () => {
            console.log(`ℹ️ IndexedDB数据库 ${dbName} 不存在或已删除`);
          };
        });
      } catch (error) {
        console.warn('⚠️ 清除IndexedDB时出错:', error);
      }
    }
    
    console.log('🎉 缓存清除完成！请刷新页面查看效果。');
    
    return {
      success: true,
      message: `已清除 ${clearedCount + sessionKeys.length} 个存储项`,
      clearedItems: {
        localStorage: clearedCount,
        sessionStorage: sessionKeys.length
      }
    };
    
  } catch (error) {
    console.error('❌ 清除缓存失败:', error);
    return {
      success: false,
      message: `清除缓存失败: ${error.message}`,
      error: error
    };
  }
};

// 清除特定模块的缓存
export const clearModuleCache = (module) => {
  try {
    const moduleKeys = {
      'virtualBloggers': [
        'virtualBloggers',
        'virtualBloggerContent', 
        'virtualBloggerPosts',
        'bloggerSchedulerState',
        'virtualBloggerSettings',
        'virtualBloggerFeedPosts'
      ],
      'contentStorage': [
        'knowledgeFeedPosts',
        'knowledgeFeedUsers',
        'userFollowing',
        'likedPosts',
        'bookmarkedPosts',
        'cheerCounts',
        'dailyCheerCounts'
      ],
      'userProfiles': [
        'userBlogPosts',
        'recommendedUsers',
        'userProfiles'
      ]
    };
    
    const keysToRemove = moduleKeys[module] || [];
    if (keysToRemove.length === 0) {
      console.warn(`⚠️ 未知模块: ${module}`);
      return { success: false, message: `未知模块: ${module}` };
    }
    
    console.log(`🧹 清除模块 ${module} 的缓存...`);
    
    let clearedCount = 0;
    keysToRemove.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        clearedCount++;
        console.log(`✅ 已清除: ${key}`);
      }
    });
    
    console.log(`🎉 模块 ${module} 缓存清除完成，清除了 ${clearedCount} 个项目`);
    
    return {
      success: true,
      message: `已清除模块 ${module} 的 ${clearedCount} 个缓存项`,
      clearedCount
    };
    
  } catch (error) {
    console.error(`❌ 清除模块 ${module} 缓存失败:`, error);
    return {
      success: false,
      message: `清除模块缓存失败: ${error.message}`,
      error: error
    };
  }
};

// 获取缓存使用情况
export const getCacheUsage = () => {
  try {
    const usage = {
      localStorage: {
        count: 0,
        items: {},
        totalSize: 0
      },
      sessionStorage: {
        count: 0,
        items: {},
        totalSize: 0
      }
    };
    
    // 分析localStorage
    Object.keys(localStorage).forEach(key => {
      const value = localStorage.getItem(key);
      const size = new Blob([value]).size;
      usage.localStorage.items[key] = {
        size,
        sizeFormatted: formatBytes(size)
      };
      usage.localStorage.totalSize += size;
      usage.localStorage.count++;
    });
    
    // 分析sessionStorage
    Object.keys(sessionStorage).forEach(key => {
      const value = sessionStorage.getItem(key);
      const size = new Blob([value]).size;
      usage.sessionStorage.items[key] = {
        size,
        sizeFormatted: formatBytes(size)
      };
      usage.sessionStorage.totalSize += size;
      usage.sessionStorage.count++;
    });
    
    // 格式化总大小
    usage.localStorage.totalSizeFormatted = formatBytes(usage.localStorage.totalSize);
    usage.sessionStorage.totalSizeFormatted = formatBytes(usage.sessionStorage.totalSize);
    
    const totalSize = usage.localStorage.totalSize + usage.sessionStorage.totalSize;
    usage.totalSize = totalSize;
    usage.totalSizeFormatted = formatBytes(totalSize);
    
    return usage;
  } catch (error) {
    console.error('❌ 获取缓存使用情况失败:', error);
    return null;
  }
};

// 格式化字节大小
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// 导出所有缓存数据
export const exportCacheData = () => {
  try {
    const data = {
      localStorage: {},
      sessionStorage: {},
      exportTime: new Date().toISOString(),
      version: '1.0'
    };
    
    // 导出localStorage
    Object.keys(localStorage).forEach(key => {
      try {
        data.localStorage[key] = localStorage.getItem(key);
      } catch (error) {
        console.warn(`跳过导出localStorage项 ${key}:`, error);
      }
    });
    
    // 导出sessionStorage
    Object.keys(sessionStorage).forEach(key => {
      try {
        data.sessionStorage[key] = sessionStorage.getItem(key);
      } catch (error) {
        console.warn(`跳过导出sessionStorage项 ${key}:`, error);
      }
    });
    
    const jsonString = JSON.stringify(data, null, 2);
    console.log('📤 缓存数据导出完成');
    
    return jsonString;
  } catch (error) {
    console.error('❌ 导出缓存数据失败:', error);
    return null;
  }
};

// 导入缓存数据
export const importCacheData = (jsonString) => {
  try {
    const data = JSON.parse(jsonString);
    
    if (!data.version || !data.localStorage) {
      throw new Error('数据格式不正确');
    }
    
    let importedCount = 0;
    
    // 导入localStorage
    Object.keys(data.localStorage).forEach(key => {
      try {
        localStorage.setItem(key, data.localStorage[key]);
        importedCount++;
      } catch (error) {
        console.warn(`跳过导入localStorage项 ${key}:`, error);
      }
    });
    
    // 导入sessionStorage（可选）
    if (data.sessionStorage) {
      Object.keys(data.sessionStorage).forEach(key => {
        try {
          sessionStorage.setItem(key, data.sessionStorage[key]);
          importedCount++;
        } catch (error) {
          console.warn(`跳过导入sessionStorage项 ${key}:`, error);
        }
      });
    }
    
    console.log(`📥 缓存数据导入完成，导入了 ${importedCount} 个项目`);
    
    return {
      success: true,
      message: `导入了 ${importedCount} 个缓存项`,
      importedCount
    };
    
  } catch (error) {
    console.error('❌ 导入缓存数据失败:', error);
    return {
      success: false,
      message: `导入失败: ${error.message}`,
      error: error
    };
  }
};