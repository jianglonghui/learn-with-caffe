import { bloggerManager } from '../data/virtualBloggers';
import APIService from './APIService';

// 博主调度系统
export class BloggerScheduler {
  constructor() {
    this.apiService = APIService.getInstance();
    this.isScheduling = false;
    this.schedulingInterval = null;
  }
  
  // 启动自动调度（每小时检查一次）
  startAutoScheduling() {
    if (this.schedulingInterval) {
      return; // 已经启动了调度
    }
    
    // 立即执行一次调度
    this.scheduleAll();
    
    // 设置定时调度（每小时执行一次）
    this.schedulingInterval = setInterval(() => {
      this.scheduleAll();
    }, 60 * 60 * 1000); // 1小时
    
    console.log('✅ 博主自动调度系统已启动');
  }
  
  // 停止自动调度
  stopAutoScheduling() {
    if (this.schedulingInterval) {
      clearInterval(this.schedulingInterval);
      this.schedulingInterval = null;
      console.log('⏹️ 博主自动调度系统已停止');
    }
  }
  
  // 调度所有符合条件的博主
  async scheduleAll() {
    if (this.isScheduling) {
      console.log('📅 调度系统正在运行中，跳过本次调度');
      return;
    }
    
    this.isScheduling = true;
    console.log('🚀 开始博主内容调度...');
    
    try {
      const bloggersToUpdate = bloggerManager.getBloggersForScheduling();
      console.log(`📝 发现 ${bloggersToUpdate.length} 个博主需要更新内容`);
      
      // 并行处理多个博主（限制并发数量避免API请求过多）
      const concurrencyLimit = 3;
      const results = await this.processBloggersInBatches(bloggersToUpdate, concurrencyLimit);
      
      const successCount = results.filter(r => r.success).length;
      console.log(`✅ 调度完成: ${successCount}/${bloggersToUpdate.length} 个博主内容更新成功`);
      
    } catch (error) {
      console.error('❌ 调度过程中出现错误:', error);
    } finally {
      this.isScheduling = false;
    }
  }
  
  // 分批处理博主，控制并发数量
  async processBloggersInBatches(bloggers, batchSize) {
    const results = [];
    
    for (let i = 0; i < bloggers.length; i += batchSize) {
      const batch = bloggers.slice(i, i + batchSize);
      const batchPromises = batch.map(blogger => this.scheduleBlogger(blogger.id));
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({ success: false, error: result.reason });
        }
      });
    }
    
    return results;
  }
  
  // 调度单个博主
  async scheduleBlogger(bloggerId) {
    try {
      console.log(`📄 开始为博主 ${bloggerId} 生成内容...`);
      
      const blogger = bloggerManager.getBlogger(bloggerId);
      if (!blogger) {
        throw new Error(`博主 ${bloggerId} 不存在`);
      }
      
      if (!blogger.isActive) {
        console.log(`⏸️ 博主 ${blogger.name} 已完成学习，跳过调度`);
        return { success: true, message: '博主已完成学习' };
      }
      
      // 获取当前学习内容
      const currentContent = blogger.getCurrentLearningContent();
      if (!currentContent) {
        throw new Error('无法获取当前学习内容');
      }
      
      // 生成学习总结（推文 + 长文）
      const generatedContent = await this.generateBloggerContent(blogger, currentContent);
      
      // 评估是否通过当前小节
      const passed = await this.evaluateLearningProgress(blogger, currentContent, generatedContent);
      
      // 更新博主进度
      blogger.updateProgress(passed);
      
      // 保存生成的内容
      blogger.addContent({
        shortPost: generatedContent.shortPost,
        longArticle: generatedContent.longArticle,
        sectionInfo: currentContent,
        passed: passed,
        generatedAt: new Date().toISOString()
      });
      
      // 保存到存储
      bloggerManager.saveToStorage();
      
      console.log(`✅ 博主 ${blogger.name} 内容生成完成，进度: ${blogger.currentProgress}`);
      
      return {
        success: true,
        bloggerId: bloggerId,
        bloggerName: blogger.name,
        newProgress: blogger.currentProgress,
        passed: passed,
        content: generatedContent
      };
      
    } catch (error) {
      console.error(`❌ 博主 ${bloggerId} 调度失败:`, error);
      return {
        success: false,
        bloggerId: bloggerId,
        error: error.message
      };
    }
  }
  
  // 生成博主内容（推文 + 长文）
  async generateBloggerContent(blogger, sectionContent) {
    const { module, section } = blogger.getCurrentModuleAndSection();
    const moduleData = blogger.script.learningPath.modules[module - 1];
    
    // 准备生成内容的上下文信息
    const context = {
      bloggerName: blogger.name,
      expertise: blogger.expertise,
      personality: blogger.script.personality,
      learningGoal: blogger.script.learningGoal,
      currentModule: moduleData.title,
      currentSection: sectionContent.title,
      sectionContent: sectionContent.content,
      progress: blogger.currentProgress
    };
    
    // 生成简短推文
    const shortPost = await this.apiService.generateBloggerShortPost(context);
    
    // 生成长文章  
    const longArticle = await this.apiService.generateBloggerLongArticle(context);
    
    return {
      shortPost,
      longArticle
    };
  }
  
  // 评估学习进度（简单的随机逻辑，实际应该基于内容质量）
  async evaluateLearningProgress(blogger, sectionContent, generatedContent) {
    try {
      // 使用AI评估生成内容的质量，判断是否通过
      const evaluation = await this.apiService.evaluateBloggerProgress({
        bloggerInfo: {
          name: blogger.name,
          expertise: blogger.expertise,
          personality: blogger.script.personality
        },
        sectionInfo: sectionContent,
        generatedContent: generatedContent,
        progress: blogger.currentProgress
      });
      
      return evaluation.pass || false;
      
    } catch (error) {
      console.error('评估学习进度失败，使用默认逻辑:', error);
      // 如果AI评估失败，使用简单的随机逻辑（80%概率通过）
      return Math.random() > 0.2;
    }
  }
  
  // 手动触发博主内容更新（催更功能）
  async triggerBloggerUpdate(bloggerId) {
    console.log(`🎯 手动触发博主 ${bloggerId} 内容更新`);
    return await this.scheduleBlogger(bloggerId);
  }
  
  // 获取调度统计信息
  getSchedulingStats() {
    const allBloggers = bloggerManager.getAllBloggers();
    const activeBloggers = bloggerManager.getActiveBloggers();
    const pendingBloggers = bloggerManager.getBloggersForScheduling();
    
    return {
      total: allBloggers.length,
      active: activeBloggers.length,
      completed: allBloggers.length - activeBloggers.length,
      pendingUpdate: pendingBloggers.length,
      isScheduling: this.isScheduling,
      autoSchedulingEnabled: !!this.schedulingInterval
    };
  }
}

// 创建全局调度器实例
export const bloggerScheduler = new BloggerScheduler();

// 调度器初始化函数
export const initializeBloggerScheduler = () => {
  // 启动自动调度
  bloggerScheduler.startAutoScheduling();
  
  // 监听页面关闭事件，停止调度
  window.addEventListener('beforeunload', () => {
    bloggerScheduler.stopAutoScheduling();
  });
  
  console.log('🎯 博主调度系统初始化完成');
};