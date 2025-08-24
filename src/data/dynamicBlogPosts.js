// 动态博客文章管理 - 集成虚拟博主生成的内容
import { blogPosts as staticBlogPosts } from './blogPosts';
import { bloggerManager } from './virtualBloggers';
import { virtualBloggerStorage } from '../services/VirtualBloggerStorage';

// 动态博客文章管理器
export class DynamicBlogPostsManager {
  constructor() {
    this.staticPosts = staticBlogPosts;
    this.dynamicPosts = [];
    this.loadDynamicPosts();
  }

  // 从存储加载动态生成的文章
  loadDynamicPosts() {
    try {
      this.dynamicPosts = virtualBloggerStorage.loadBlogPosts();
      console.log(`📚 加载了 ${this.dynamicPosts.length} 篇动态博客文章`);
    } catch (error) {
      console.error('加载动态博客文章失败:', error);
      this.dynamicPosts = [];
    }
  }

  // 保存动态文章
  saveDynamicPosts() {
    try {
      virtualBloggerStorage.saveBlogPosts(this.dynamicPosts);
    } catch (error) {
      console.error('保存动态博客文章失败:', error);
    }
  }

  // 从博主内容生成博客文章
  generateBlogPostsFromBloggers() {
    const allBloggers = bloggerManager.getAllBloggers();
    const newPosts = [];

    allBloggers.forEach(blogger => {
      const recentContent = blogger.getLatestContent(5); // 获取最近5条内容
      
      recentContent.forEach(content => {
        if (content.longArticle && content.longArticle.title) {
          const blogPost = this.convertContentToBlogPost(blogger, content);
          if (blogPost) {
            newPosts.push(blogPost);
          }
        }
      });
    });

    if (newPosts.length > 0) {
      // 添加到动态文章列表
      this.dynamicPosts = [...newPosts, ...this.dynamicPosts];
      
      // 去重和排序
      this.deduplicateAndSort();
      
      // 保存到存储
      this.saveDynamicPosts();
      
      console.log(`✨ 从博主内容生成了 ${newPosts.length} 篇新文章`);
    }

    return newPosts;
  }

  // 将博主内容转换为博客文章格式
  convertContentToBlogPost(blogger, content) {
    try {
      if (!content.longArticle || !content.longArticle.title) {
        return null;
      }

      const article = content.longArticle;
      const postId = this.generatePostId(blogger.id, content.createdAt);

      return {
        id: postId,
        title: article.title,
        preview: article.summary || this.extractPreviewFromContent(article.content),
        category: article.category || this.inferCategory(blogger.expertise),
        author: blogger.name,
        authorExpertise: blogger.expertise,
        authorVerified: blogger.verified,
        date: this.formatDate(content.createdAt),
        readTime: article.readTime || '8分钟',
        tags: article.tags || this.generateTags(blogger, content),
        content: article.content,
        bloggerProgress: content.progress,
        originalContentId: content.id,
        bloggerId: blogger.id,
        isGenerated: true, // 标记为AI生成的内容
        generationMetadata: {
          sectionInfo: content.sectionInfo,
          passed: content.passed,
          mood: content.shortPost?.mood
        }
      };
    } catch (error) {
      console.error('转换博主内容为博客文章失败:', error);
      return null;
    }
  }

  // 生成文章ID
  generatePostId(bloggerId, timestamp) {
    const date = new Date(timestamp);
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    return `${bloggerId}-${dateStr}-${Math.random().toString(36).substr(2, 6)}`;
  }

  // 从内容中提取预览
  extractPreviewFromContent(content) {
    if (!content) return '';
    
    // 移除markdown标记，提取前150字符作为预览
    const plainText = content
      .replace(/#{1,6}\s+/g, '') // 移除标题
      .replace(/\*\*(.*?)\*\*/g, '$1') // 移除粗体
      .replace(/\*(.*?)\*/g, '$1') // 移除斜体
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // 移除链接
      .replace(/\n+/g, ' ') // 换行变空格
      .trim();

    return plainText.length > 150 ? plainText.substr(0, 150) + '...' : plainText;
  }

  // 推断文章分类
  inferCategory(expertise) {
    const categoryMap = {
      '人工智能': 'AI基础',
      '机器学习': 'AI基础', 
      '深度学习': 'AI基础',
      '前端': '前端开发',
      '后端': '后端开发',
      'UI': '设计',
      'UX': '设计',
      '设计': '设计',
      '营销': '营销推广',
      '产品': '产品管理',
      '数据': '数据分析'
    };

    for (const [key, category] of Object.entries(categoryMap)) {
      if (expertise.includes(key)) {
        return category;
      }
    }

    return '技术分享'; // 默认分类
  }

  // 生成标签
  generateTags(blogger, content) {
    const tags = [];
    
    // 基于专业领域的标签
    if (blogger.expertise.includes('AI') || blogger.expertise.includes('人工智能')) {
      tags.push('AI', '机器学习');
    }
    if (blogger.expertise.includes('设计')) {
      tags.push('设计', '用户体验');
    }
    if (blogger.expertise.includes('前端')) {
      tags.push('前端', '开发');
    }
    if (blogger.expertise.includes('营销')) {
      tags.push('营销', '推广');
    }

    // 基于学习内容的标签
    if (content.sectionInfo && content.sectionInfo.title) {
      const title = content.sectionInfo.title;
      if (title.includes('基础')) tags.push('基础');
      if (title.includes('进阶')) tags.push('进阶');
      if (title.includes('实践')) tags.push('实践');
    }

    // 基于博主性格的标签
    if (blogger.script && blogger.script.personality) {
      if (blogger.script.personality.type.includes('创新')) {
        tags.push('创新思维');
      }
    }

    return tags.length > 0 ? tags : ['学习笔记', '技术分享'];
  }

  // 格式化日期
  formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toISOString().split('T')[0];
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

    // 按日期排序
    uniquePosts.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 限制数量
    this.dynamicPosts = uniquePosts.slice(0, 100);
  }

  // 获取所有文章（静态 + 动态）
  getAllPosts(options = {}) {
    const { 
      limit = 20, 
      category = null, 
      includeGenerated = true,
      includeStatic = true 
    } = options;

    let allPosts = [];

    // 添加静态文章
    if (includeStatic) {
      allPosts = [...allPosts, ...this.staticPosts.map(post => ({
        ...post,
        isGenerated: false
      }))];
    }

    // 添加动态生成的文章
    if (includeGenerated) {
      allPosts = [...allPosts, ...this.dynamicPosts];
    }

    // 按分类筛选
    if (category && category !== '全部') {
      allPosts = allPosts.filter(post => post.category === category);
    }

    // 按日期排序
    allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 限制数量
    return limit > 0 ? allPosts.slice(0, limit) : allPosts;
  }

  // 根据ID获取文章
  getPostById(postId) {
    // 先从动态文章中查找
    const dynamicPost = this.dynamicPosts.find(post => post.id === postId);
    if (dynamicPost) {
      return dynamicPost;
    }

    // 再从静态文章中查找
    const staticPost = this.staticPosts.find(post => post.id === postId);
    if (staticPost) {
      return {
        ...staticPost,
        isGenerated: false
      };
    }

    return null;
  }

  // 获取分类列表
  getAllCategories() {
    const staticCategories = [...new Set(this.staticPosts.map(post => post.category))];
    const dynamicCategories = [...new Set(this.dynamicPosts.map(post => post.category))];
    const allCategories = [...new Set([...staticCategories, ...dynamicCategories])];
    
    return ['全部', ...allCategories];
  }

  // 搜索文章
  searchPosts(query, options = {}) {
    const { includeGenerated = true, includeStatic = true, limit = 20 } = options;
    
    if (!query || query.trim() === '') {
      return this.getAllPosts({ limit, includeGenerated, includeStatic });
    }

    const searchTerm = query.toLowerCase().trim();
    const allPosts = this.getAllPosts({ includeGenerated, includeStatic, limit: 0 });

    const matchingPosts = allPosts.filter(post => {
      return post.title.toLowerCase().includes(searchTerm) ||
             post.preview.toLowerCase().includes(searchTerm) ||
             post.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
             post.author.toLowerCase().includes(searchTerm);
    });

    return limit > 0 ? matchingPosts.slice(0, limit) : matchingPosts;
  }

  // 获取博主的文章
  getBloggerPosts(bloggerId, limit = 10) {
    return this.dynamicPosts
      .filter(post => post.bloggerId === bloggerId)
      .slice(0, limit);
  }

  // 更新文章（定期从博主内容同步）
  async updatePostsFromBloggers() {
    console.log('🔄 开始从博主内容更新文章...');
    
    const newPosts = this.generateBlogPostsFromBloggers();
    
    if (newPosts.length > 0) {
      console.log(`✨ 更新完成，新增 ${newPosts.length} 篇文章`);
      return newPosts;
    } else {
      console.log('📝 没有新的博主内容需要转换为文章');
      return [];
    }
  }

  // 获取统计信息
  getStats() {
    const totalStatic = this.staticPosts.length;
    const totalDynamic = this.dynamicPosts.length;
    const activeBloggers = bloggerManager.getActiveBloggers().length;
    
    return {
      totalPosts: totalStatic + totalDynamic,
      staticPosts: totalStatic,
      dynamicPosts: totalDynamic,
      activeBloggers: activeBloggers,
      categories: this.getAllCategories().length - 1, // 减去"全部"
      lastUpdate: new Date().toISOString()
    };
  }
}

// 创建全局管理器实例
export const dynamicBlogPostsManager = new DynamicBlogPostsManager();

// 初始化动态博客系统
export const initializeDynamicBlogPosts = async () => {
  console.log('📚 初始化动态博客文章系统...');
  
  // 从博主内容生成初始文章
  await dynamicBlogPostsManager.updatePostsFromBloggers();
  
  // 设置定期更新（每30分钟检查一次）
  setInterval(() => {
    dynamicBlogPostsManager.updatePostsFromBloggers();
  }, 30 * 60 * 1000);
  
  const stats = dynamicBlogPostsManager.getStats();
  console.log(`📊 博客系统初始化完成: ${stats.totalPosts} 篇文章 (${stats.staticPosts} 静态 + ${stats.dynamicPosts} 动态)`);
  
  return dynamicBlogPostsManager;
};