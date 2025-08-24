// 虚拟博主系统测试工具
import { bloggerManager } from '../data/virtualBloggers';
import { bloggerScheduler } from '../services/BloggerScheduler';
import { dynamicFeedPostsManager } from '../data/dynamicFeedPosts';

export const testBloggerSystem = async () => {
  console.log('🧪 开始测试虚拟博主系统...');
  
  try {
    // 1. 测试博主管理器
    console.log('\n1️⃣ 测试博主管理器');
    const allBloggers = bloggerManager.getAllBloggers();
    const activeBloggers = bloggerManager.getActiveBloggers();
    
    console.log(`📊 总博主数: ${allBloggers.length}`);
    console.log(`✅ 活跃博主数: ${activeBloggers.length}`);
    
    if (activeBloggers.length > 0) {
      const firstBlogger = activeBloggers[0];
      console.log(`📝 示例博主: ${firstBlogger.name} (${firstBlogger.expertise})`);
      console.log(`📈 当前进度: ${firstBlogger.currentProgress}`);
      console.log(`📚 学习目标: ${firstBlogger.script.learningGoal.substring(0, 50)}...`);
    }
    
    // 2. 测试调度系统
    console.log('\n2️⃣ 测试调度系统');
    const schedulerStats = bloggerScheduler.getSchedulingStats();
    console.log(`📊 调度状态:`, schedulerStats);
    
    // 3. 测试手动触发一个博主更新
    if (activeBloggers.length > 0) {
      console.log('\n3️⃣ 测试手动触发博主更新');
      const testBlogger = activeBloggers[0];
      console.log(`🎯 触发博主更新: ${testBlogger.name}`);
      
      try {
        const result = await bloggerScheduler.triggerBloggerUpdate(testBlogger.id);
        console.log(`📝 更新结果:`, result.success ? '成功' : '失败');
        if (result.success) {
          console.log(`📊 新进度: ${result.newProgress}`);
          console.log(`✅ 是否通过: ${result.passed}`);
        }
      } catch (error) {
        console.warn(`⚠️ 手动触发失败: ${error.message}`);
      }
    }
    
    // 4. 测试Feed推文生成
    console.log('\n4️⃣ 测试Feed推文生成');
    const feedStats = dynamicFeedPostsManager.getStats();
    console.log(`📱 Feed统计:`, feedStats);
    
    const feedPosts = dynamicFeedPostsManager.getAllPosts({ limit: 5 });
    console.log(`📋 当前Feed推文数: ${feedPosts.length}`);
    
    if (feedPosts.length > 0) {
      const samplePost = feedPosts[0];
      console.log(`💬 示例推文:`);
      console.log(`   作者: ${samplePost.expertName}`);
      console.log(`   内容: ${samplePost.content?.substring(0, 100)}...`);
      console.log(`   类型: ${samplePost.isGenerated ? '虚拟博主' : '静态内容'}`);
    }
    
    // 5. 测试从博主内容更新Feed推文
    console.log('\n5️⃣ 测试Feed推文更新');
    const newFeedPosts = await dynamicFeedPostsManager.updatePostsFromBloggers();
    console.log(`🆕 新生成的Feed推文数: ${newFeedPosts.length}`);
    
    console.log('\n✅ 虚拟博主系统测试完成！');
    
    return {
      success: true,
      stats: {
        totalBloggers: allBloggers.length,
        activeBloggers: activeBloggers.length,
        schedulerStats,
        feedStats,
        currentFeedPosts: feedPosts.length,
        newFeedPosts: newFeedPosts.length
      }
    };
    
  } catch (error) {
    console.error('❌ 系统测试失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// 在浏览器控制台中运行的测试函数
window.testBloggerSystem = testBloggerSystem;

console.log('🧪 测试函数已加载，在控制台中运行 testBloggerSystem() 来测试系统');