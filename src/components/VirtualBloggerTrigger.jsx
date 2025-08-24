// 虚拟博主催更按钮组件
import React, { useState } from 'react';
import { RefreshCw, Zap, Clock } from 'lucide-react';
import { bloggerScheduler } from '../services/BloggerScheduler';
import { bloggerManager } from '../data/virtualBloggers';
import { dynamicBlogPostsManager } from '../data/dynamicBlogPosts';

const VirtualBloggerTrigger = () => {
  const [isTriggering, setIsTriggering] = useState(false);
  const [lastTriggerResult, setLastTriggerResult] = useState(null);
  
  // 获取博主统计信息
  const stats = bloggerScheduler.getSchedulingStats();
  const activeBloggers = bloggerManager.getActiveBloggers();

  // 手动触发博主更新
  const handleTriggerUpdate = async () => {
    if (isTriggering) return;
    
    setIsTriggering(true);
    setLastTriggerResult(null);

    try {
      console.log('🎯 手动触发博主内容更新...');
      
      // 获取需要更新的博主
      const bloggersToUpdate = bloggerManager.getBloggersForScheduling();
      
      if (bloggersToUpdate.length === 0) {
        setLastTriggerResult({
          success: true,
          message: '所有博主内容都是最新的，暂无需要更新的内容',
          updatedCount: 0
        });
        return;
      }

      // 执行调度更新
      const results = await Promise.all(
        bloggersToUpdate.slice(0, 3).map(blogger => // 限制同时更新3个博主
          bloggerScheduler.triggerBloggerUpdate(blogger.id)
        )
      );

      const successCount = results.filter(r => r.success).length;
      
      // 更新博客文章
      setTimeout(async () => {
        const newPosts = await dynamicBlogPostsManager.updatePostsFromBloggers();
        console.log(`📝 从博主内容生成了 ${newPosts.length} 篇新文章`);
      }, 1000);

      setLastTriggerResult({
        success: true,
        message: `成功更新了 ${successCount}/${results.length} 个博主的内容`,
        updatedCount: successCount,
        details: results
      });

    } catch (error) {
      console.error('❌ 催更失败:', error);
      setLastTriggerResult({
        success: false,
        message: `更新失败: ${error.message}`,
        updatedCount: 0
      });
    } finally {
      setIsTriggering(false);
    }
  };

  // 强制调度所有博主
  const handleForceScheduleAll = async () => {
    if (isTriggering) return;
    
    setIsTriggering(true);
    
    try {
      console.log('🚀 强制调度所有活跃博主...');
      await bloggerScheduler.scheduleAll();
      
      // 更新博客文章
      setTimeout(async () => {
        await dynamicBlogPostsManager.updatePostsFromBloggers();
      }, 2000);
      
      setLastTriggerResult({
        success: true,
        message: '已强制调度所有活跃博主',
        updatedCount: activeBloggers.length
      });
      
    } catch (error) {
      console.error('❌ 强制调度失败:', error);
      setLastTriggerResult({
        success: false,
        message: `调度失败: ${error.message}`,
        updatedCount: 0
      });
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* 催更按钮 */}
      <div className="flex flex-col items-end gap-3">
        {/* 统计信息悬浮卡片 */}
        <div className="bg-white rounded-lg shadow-lg p-4 text-sm border max-w-xs">
          <div className="font-semibold text-gray-800 mb-2">📊 博主状态</div>
          <div className="space-y-1 text-gray-600">
            <div>活跃博主: {stats.active} 个</div>
            <div>等待更新: {stats.pendingUpdate} 个</div>
            <div>自动调度: {stats.autoSchedulingEnabled ? '✅ 已启用' : '❌ 已禁用'}</div>
            {stats.isScheduling && (
              <div className="text-blue-600 font-medium">🔄 调度中...</div>
            )}
          </div>
        </div>

        {/* 操作按钮组 */}
        <div className="flex flex-col gap-2">
          {/* 催更按钮 */}
          <button
            onClick={handleTriggerUpdate}
            disabled={isTriggering}
            className={`
              flex items-center gap-2 px-4 py-3 rounded-full shadow-lg font-medium text-white transition-all duration-200
              ${isTriggering 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 hover:shadow-xl transform hover:scale-105'
              }
            `}
          >
            {isTriggering ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Zap className="w-5 h-5" />
            )}
            <span>{isTriggering ? '更新中...' : '催更博主'}</span>
          </button>

          {/* 强制调度按钮 */}
          <button
            onClick={handleForceScheduleAll}
            disabled={isTriggering}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-full shadow-md font-medium text-sm transition-all duration-200
              ${isTriggering 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-orange-500 text-white hover:bg-orange-600 hover:shadow-lg'
              }
            `}
          >
            <Clock className="w-4 h-4" />
            <span>全部调度</span>
          </button>
        </div>

        {/* 结果提示 */}
        {lastTriggerResult && (
          <div className={`
            max-w-sm p-3 rounded-lg shadow-lg text-sm border-l-4 animate-fade-in
            ${lastTriggerResult.success 
              ? 'bg-green-50 border-green-500 text-green-800' 
              : 'bg-red-50 border-red-500 text-red-800'
            }
          `}>
            <div className="font-medium mb-1">
              {lastTriggerResult.success ? '✅ 更新成功' : '❌ 更新失败'}
            </div>
            <div>{lastTriggerResult.message}</div>
            {lastTriggerResult.success && lastTriggerResult.updatedCount > 0 && (
              <div className="text-xs mt-2 text-green-600">
                新内容将在几秒后出现在博客列表中
              </div>
            )}
          </div>
        )}
      </div>

      {/* CSS 动画 */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default VirtualBloggerTrigger;