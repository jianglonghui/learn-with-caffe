// 动态Feed推文管理 - 集成虚拟博主的推文内容
import { bloggerManager } from './virtualBloggers';
import { virtualBloggerStorage } from '../services/VirtualBloggerStorage';

// 动态Feed推文管理器
export class DynamicFeedPostsManager {
  constructor() {
    this.dynamicPosts = [];
    this.loadDynamicPosts();
  }

  // 从存储加载动态推文
  loadDynamicPosts() {
    try {
      const stored = localStorage.getItem('virtualBloggerFeedPosts');
      this.dynamicPosts = stored ? JSON.parse(stored) : [];
      
      // 启动时进行深度去重清理
      this.deepCleanDuplicates();
      
      console.log(`📱 加载了 ${this.dynamicPosts.length} 条动态Feed推文`);
    } catch (error) {
      console.error('加载动态Feed推文失败:', error);
      this.dynamicPosts = [];
    }
  }

  // 深度清理重复推文
  deepCleanDuplicates() {
    const seen = new Set();
    const uniquePosts = [];
    
    for (const post of this.dynamicPosts) {
      // 使用多个标识符确保唯一性
      const identifiers = [
        post.id,
        `${post.bloggerId}-${post.content}`,
        post.originalContentId
      ].filter(Boolean);
      
      let isDuplicate = false;
      for (const id of identifiers) {
        if (seen.has(id)) {
          isDuplicate = true;
          break;
        }
      }
      
      if (!isDuplicate) {
        identifiers.forEach(id => seen.add(id));
        uniquePosts.push(post);
      }
    }
    
    if (uniquePosts.length < this.dynamicPosts.length) {
      console.log(`🧹 清理了 ${this.dynamicPosts.length - uniquePosts.length} 条重复推文`);
      this.dynamicPosts = uniquePosts;
      this.saveDynamicPosts();
    }
  }

  // 保存动态推文
  saveDynamicPosts() {
    try {
      localStorage.setItem('virtualBloggerFeedPosts', JSON.stringify(this.dynamicPosts));
    } catch (error) {
      console.error('保存动态Feed推文失败:', error);
    }
  }

  // 从博主内容生成Feed推文
  generateFeedPostsFromBloggers() {
    const allBloggers = bloggerManager.getAllBloggers();
    const newPosts = [];

    allBloggers.forEach(blogger => {
      const recentContent = blogger.getLatestContent(3); // 获取最近3条内容
      
      recentContent.forEach(content => {
        if (content.shortPost && content.shortPost.content) {
          const feedPost = this.convertBloggerContentToFeedPost(blogger, content);
          if (feedPost && !this.isDuplicatePost(feedPost)) {
            newPosts.push(feedPost);
          }
        }
      });
    });

    if (newPosts.length > 0) {
      // 添加到动态推文列表
      this.dynamicPosts = [...newPosts, ...this.dynamicPosts];
      
      // 去重和排序
      this.deduplicateAndSort();
      
      // 保存到存储
      this.saveDynamicPosts();
      
      console.log(`✨ 从博主内容生成了 ${newPosts.length} 条新推文`);
    }

    return newPosts;
  }

  // 将博主内容转换为Feed推文格式
  convertBloggerContentToFeedPost(blogger, content) {
    try {
      if (!content.shortPost || !content.shortPost.content) {
        return null;
      }

      const shortPost = content.shortPost;
      const postId = this.generateFeedPostId(blogger.id, content.createdAt, content.shortPost.content);

      return {
        id: postId,
        expertName: blogger.name,
        expertise: blogger.expertise,
        verified: blogger.verified,
        content: shortPost.content,
        image: this.getEmojiForContent(shortPost, blogger),
        timestamp: this.formatTimestamp(content.createdAt),
        topic: this.inferTopic(shortPost, content),
        type: this.inferPostType(shortPost),
        mood: shortPost.mood || 'neutral',
        
        // 博主相关信息
        bloggerId: blogger.id,
        bloggerProgress: content.progress,
        sectionInfo: content.sectionInfo,
        passed: content.passed,
        originalContentId: content.id,
        
        // 标记为AI生成
        isGenerated: true,
        generatedAt: content.createdAt
      };
    } catch (error) {
      console.error('转换博主内容为Feed推文失败:', error);
      return null;
    }
  }

  // 生成Feed推文ID
  generateFeedPostId(bloggerId, timestamp, content = '') {
    const date = new Date(timestamp);
    const dateTimeStr = date.toISOString().replace(/[-:.]/g, '').replace('T', '-').slice(0, -1); // 精确到毫秒
    
    // 基于内容生成简单hash
    const contentHash = this.simpleHash(content);
    const randomStr = Math.random().toString(36).substring(2, 8) + Date.now().toString(36);
    
    return `feed-${bloggerId}-${dateTimeStr}-${contentHash}-${randomStr}`;
  }

  // 简单hash函数
  simpleHash(str) {
    let hash = 0;
    if (str.length === 0) return hash.toString(36);
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 4);
  }

  // 为内容选择合适的emoji
  getEmojiForContent(shortPost, blogger) {
    // 基于心情的emoji
    const moodEmojis = {
      'excited': '🚀',
      'happy': '😊',
      'thoughtful': '🤔',
      'focused': '🔍',
      'creative': '💡',
      'accomplished': '🎉',
      'curious': '🧐',
      'inspired': '✨'
    };

    if (shortPost.mood && moodEmojis[shortPost.mood]) {
      return moodEmojis[shortPost.mood];
    }

    // 基于专业领域的emoji
    const expertiseEmojis = {
      'AI': '🤖',
      'artificial intelligence': '🤖',
      'machine learning': '🧠',
      'design': '🎨',
      'UI/UX': '📱',
      'marketing': '📈',
      'programming': '💻',
      'development': '⚡'
    };

    const expertise = blogger.expertise.toLowerCase();
    for (const [key, emoji] of Object.entries(expertiseEmojis)) {
      if (expertise.includes(key.toLowerCase())) {
        return emoji;
      }
    }

    // 基于内容关键词的emoji
    const content = shortPost.content.toLowerCase();
    if (content.includes('学习') || content.includes('掌握')) return '📚';
    if (content.includes('实践') || content.includes('应用')) return '🛠️';
    if (content.includes('思考') || content.includes('理解')) return '💭';
    if (content.includes('成功') || content.includes('完成')) return '✅';
    if (content.includes('挑战') || content.includes('困难')) return '💪';

    return '📝'; // 默认emoji
  }

  // 推断推文话题
  inferTopic(shortPost, content) {
    if (content.sectionInfo && content.sectionInfo.title) {
      return content.sectionInfo.title;
    }

    const contentText = shortPost.content.toLowerCase();
    
    if (contentText.includes('学习')) return '学习心得';
    if (contentText.includes('实践')) return '实践分享';
    if (contentText.includes('思考')) return '深度思考';
    if (contentText.includes('技巧')) return '技能提升';
    if (contentText.includes('经验')) return '经验分享';
    
    return '知识分享';
  }

  // 推断推文类型
  inferPostType(shortPost) {
    const content = shortPost.content.toLowerCase();
    
    if (content.includes('学会') || content.includes('掌握') || content.includes('完成')) {
      return 'achievement';
    }
    if (content.includes('发现') || content.includes('理解') || content.includes('领悟')) {
      return 'insight';
    }
    if (content.includes('实践') || content.includes('应用') || content.includes('尝试')) {
      return 'experience';
    }
    if (content.includes('技巧') || content.includes('方法') || content.includes('建议')) {
      return 'tip';
    }
    
    return 'knowledge';
  }

  // 格式化时间戳
  formatTimestamp(timestamp) {
    const now = new Date();
    const postTime = new Date(timestamp);
    const diffMs = now - postTime;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    
    return postTime.toLocaleDateString('zh-CN', { 
      month: 'short', 
      day: 'numeric' 
    });
  }

  // 检查重复推文
  isDuplicatePost(newPost) {
    return this.dynamicPosts.some(post => 
      post.originalContentId === newPost.originalContentId ||
      (post.bloggerId === newPost.bloggerId && 
       post.content === newPost.content)
    );
  }

  // 去重和排序
  deduplicateAndSort() {
    // 去重
    const uniquePosts = this.dynamicPosts.reduce((acc, post) => {
      const existing = acc.find(p => p.id === post.id);
      if (!existing) {
        acc.push(post);
      }
      return acc;
    }, []);

    // 按时间排序
    uniquePosts.sort((a, b) => {
      const timeA = a.generatedAt ? new Date(a.generatedAt) : new Date(0);
      const timeB = b.generatedAt ? new Date(b.generatedAt) : new Date(0);
      return timeB - timeA;
    });

    // 限制数量（保留最近100条）
    this.dynamicPosts = uniquePosts.slice(0, 100);
  }

  // 获取所有推文（仅动态）
  getAllPosts(options = {}) {
    const { 
      limit = 20, 
      includeGenerated = true 
    } = options;

    let allPosts = [];

    // 添加动态生成的推文
    if (includeGenerated) {
      allPosts = [...this.dynamicPosts];
    }

    // 按时间排序
    allPosts.sort((a, b) => {
      const timeA = a.generatedAt ? new Date(a.generatedAt) : new Date(0);
      const timeB = b.generatedAt ? new Date(b.generatedAt) : new Date(0);
      return timeB - timeA;
    });

    // 添加互动数据
    allPosts.forEach(post => {
      if (!post.likes) {
        post.likes = Math.floor(Math.random() * 500) + 50;
        post.comments = Math.floor(Math.random() * 100) + 5;
        post.shares = Math.floor(Math.random() * 50) + 2;
        post.bookmarks = Math.floor(Math.random() * 200) + 10;
      }
    });

    // 限制数量
    return limit > 0 ? allPosts.slice(0, limit) : allPosts;
  }

  // 获取博主的推文
  getBloggerPosts(bloggerId, limit = 10) {
    return this.dynamicPosts
      .filter(post => post.bloggerId === bloggerId)
      .slice(0, limit);
  }

  // 更新推文（定期从博主内容同步）
  async updatePostsFromBloggers() {
    console.log('🔄 开始从博主内容更新Feed推文...');
    
    const newPosts = this.generateFeedPostsFromBloggers();
    
    if (newPosts.length > 0) {
      console.log(`✨ 更新完成，新增 ${newPosts.length} 条推文`);
      return newPosts;
    } else {
      console.log('📝 没有新的博主内容需要转换为推文');
      return [];
    }
  }

  // 获取更多推文（从现有内容中），支持排除已显示的推文
  getMorePosts(count = 5, excludeIds = []) {
    try {
      // 获取动态推文，按时间戳排序
      const allPosts = [...this.dynamicPosts];
      
      // 过滤掉已显示的推文
      const availablePosts = allPosts.filter(post => !excludeIds.includes(post.id));
      
      // 按时间排序
      const sortedPosts = availablePosts.sort((a, b) => {
        const timeA = new Date(a.timestamp || a.generatedAt || 0);
        const timeB = new Date(b.timestamp || b.generatedAt || 0);
        return timeB - timeA; // 最新的在前
      });
      
      // 返回指定数量的推文
      const morePosts = sortedPosts.slice(0, count);
      console.log(`📚 从现有内容中获取 ${morePosts.length} 条推文 (排除了 ${excludeIds.length} 条已显示)`);
      
      return morePosts;
    } catch (error) {
      console.error('获取更多推文失败:', error);
      return [];
    }
  }
  
  // 获取统计信息
  getStats() {
    const totalDynamic = this.dynamicPosts.length;
    const activeBloggers = bloggerManager.getActiveBloggers().length;
    
    return {
      totalPosts: totalDynamic,
      dynamicPosts: totalDynamic,
      activeBloggers: activeBloggers,
      lastUpdate: new Date().toISOString()
    };
  }
}

// 创建全局管理器实例
export const dynamicFeedPostsManager = new DynamicFeedPostsManager();

// 初始化动态Feed系统
export const initializeDynamicFeedPosts = async () => {
  console.log('📱 初始化动态Feed推文系统...');
  
  // 从博主内容生成初始推文
  await dynamicFeedPostsManager.updatePostsFromBloggers();
  
  // 设置定期更新（每15分钟检查一次）
  setInterval(() => {
    dynamicFeedPostsManager.updatePostsFromBloggers();
  }, 15 * 60 * 1000);
  
  const stats = dynamicFeedPostsManager.getStats();
  console.log(`📊 Feed系统初始化完成: ${stats.totalPosts} 条动态推文`);
  
  return dynamicFeedPostsManager;
};