// 虚拟博主数据结构和管理系统
import { virtualBloggerStorage } from '../services/VirtualBloggerStorage';

// 博主数据结构定义
export class VirtualBlogger {
  constructor(config) {
    this.id = config.id || this.generateId();
    this.name = config.name;
    this.avatar = config.avatar || '/default-avatar.png';
    this.expertise = config.expertise;
    this.verified = config.verified || false;
    
    // 博主剧本
    this.script = {
      learningGoal: config.script.learningGoal, // 学习目标
      personality: config.script.personality,   // 性格特点
      learningPath: config.script.learningPath // 学习路径/大纲
    };
    
    // 当前学习状态
    this.currentProgress = config.currentProgress || '1.1'; // 当前学习小节，格式：模块.小节
    this.isActive = config.isActive || true; // 是否活跃
    this.lastUpdateTime = config.lastUpdateTime || new Date().toISOString();
    
    // 生成的内容历史
    this.contentHistory = config.contentHistory || [];
    
    // 创建时间
    this.createdAt = config.createdAt || new Date().toISOString();
  }
  
  generateId() {
    return 'blogger_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  }
  
  // 获取当前模块和小节
  getCurrentModuleAndSection() {
    const [module, section] = this.currentProgress.split('.');
    return { module: parseInt(module), section: parseInt(section) };
  }
  
  // 获取当前学习内容
  getCurrentLearningContent() {
    const { module, section } = this.getCurrentModuleAndSection();
    const moduleData = this.script.learningPath.modules[module - 1];
    if (moduleData && moduleData.sections[section - 1]) {
      return moduleData.sections[section - 1];
    }
    return null;
  }
  
  // 更新学习进度
  updateProgress(pass = true) {
    if (!pass) return; // 如果没通过，不更新进度
    
    const { module, section } = this.getCurrentModuleAndSection();
    const moduleData = this.script.learningPath.modules[module - 1];
    
    if (!moduleData) return;
    
    // 检查当前模块是否还有下一小节
    if (section < moduleData.sections.length) {
      this.currentProgress = `${module}.${section + 1}`;
    } else {
      // 当前模块已完成，检查是否有下一模块
      if (module < this.script.learningPath.modules.length) {
        this.currentProgress = `${module + 1}.1`;
      } else {
        // 所有学习内容已完成
        this.currentProgress = 'completed';
        this.isActive = false;
      }
    }
    
    this.lastUpdateTime = new Date().toISOString();
  }
  
  // 添加生成的内容到历史记录
  addContent(content) {
    this.contentHistory.push({
      ...content,
      createdAt: new Date().toISOString(),
      progress: this.currentProgress
    });
  }
  
  // 获取最新的内容
  getLatestContent(count = 5) {
    return this.contentHistory
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, count);
  }
}

// 学习路径模板
export const learningPathTemplates = {
  programming: {
    title: "编程基础",
    modules: [
      {
        id: 1,
        title: "编程思维入门",
        sections: [
          { id: 1, title: "什么是编程思维", content: "理解问题分解和逻辑思维" },
          { id: 2, title: "算法基础概念", content: "了解算法的基本概念和重要性" },
          { id: 3, title: "数据结构初步", content: "认识基本的数据结构" }
        ]
      },
      {
        id: 2,
        title: "编程语言基础",
        sections: [
          { id: 1, title: "变量和数据类型", content: "掌握基本的变量概念" },
          { id: 2, title: "控制结构", content: "理解条件语句和循环" },
          { id: 3, title: "函数和模块", content: "学习代码复用和模块化" }
        ]
      }
    ]
  },
  
  design: {
    title: "设计基础",
    modules: [
      {
        id: 1,
        title: "设计原理",
        sections: [
          { id: 1, title: "色彩理论", content: "理解色彩搭配和心理学" },
          { id: 2, title: "排版原则", content: "掌握版面设计的基本原则" },
          { id: 3, title: "用户体验", content: "了解以用户为中心的设计思维" }
        ]
      },
      {
        id: 2,
        title: "设计工具",
        sections: [
          { id: 1, title: "Photoshop基础", content: "掌握图像处理基本技能" },
          { id: 2, title: "Illustrator入门", content: "学习矢量图形设计" },
          { id: 3, title: "设计规范", content: "了解设计系统和规范制定" }
        ]
      }
    ]
  },
  
  marketing: {
    title: "数字营销",
    modules: [
      {
        id: 1,
        title: "营销基础",
        sections: [
          { id: 1, title: "市场分析", content: "理解目标用户和市场定位" },
          { id: 2, title: "品牌建设", content: "掌握品牌形象塑造方法" },
          { id: 3, title: "内容策略", content: "学习内容营销的核心理念" }
        ]
      },
      {
        id: 2,
        title: "数字渠道",
        sections: [
          { id: 1, title: "社交媒体营销", content: "掌握各平台特点和运营技巧" },
          { id: 2, title: "搜索引擎优化", content: "理解SEO的基本原理和方法" },
          { id: 3, title: "数据分析", content: "学习营销效果的衡量和优化" }
        ]
      }
    ]
  },

  photography: {
    title: "摄影艺术",
    modules: [
      {
        id: 1,
        title: "摄影基础",
        sections: [
          { id: 1, title: "相机操作", content: "掌握相机的基本操作和设置" },
          { id: 2, title: "构图技法", content: "学习经典构图法则和创意构图" },
          { id: 3, title: "光影控制", content: "理解自然光和人工光的运用" }
        ]
      },
      {
        id: 2,
        title: "后期处理",
        sections: [
          { id: 1, title: "RAW格式处理", content: "掌握RAW文件的处理技巧" },
          { id: 2, title: "色彩调整", content: "学习专业的色彩调整方法" }
        ]
      }
    ]
  },

  cooking: {
    title: "烹饪艺术",
    modules: [
      {
        id: 1,
        title: "基础技法",
        sections: [
          { id: 1, title: "刀工技术", content: "掌握基本的刀工切法" },
          { id: 2, title: "火候控制", content: "理解不同烹饪方法的火候要求" },
          { id: 3, title: "调味平衡", content: "学习各种调料的搭配原理" }
        ]
      },
      {
        id: 2,
        title: "菜系精通",
        sections: [
          { id: 1, title: "经典家常菜", content: "掌握常见家常菜的制作方法" },
          { id: 2, title: "地方特色菜", content: "学习各地特色菜品的精髓" }
        ]
      }
    ]
  },

  fitness: {
    title: "健身科学",
    modules: [
      {
        id: 1,
        title: "运动基础",
        sections: [
          { id: 1, title: "运动生理学", content: "了解人体运动的生理机制" },
          { id: 2, title: "基础动作", content: "掌握基本的训练动作要领" },
          { id: 3, title: "训练计划", content: "学习制定个性化训练方案" }
        ]
      },
      {
        id: 2,
        title: "营养搭配",
        sections: [
          { id: 1, title: "运动营养", content: "理解运动前后的营养需求" },
          { id: 2, title: "体重管理", content: "掌握科学的体重控制方法" }
        ]
      }
    ]
  }
};

// 性格特点模板
export const personalityTemplates = [
  {
    type: "专业严谨型",
    traits: ["注重细节", "逻辑严密", "善于分析", "实事求是"],
    communicationStyle: "理性、客观、条理清晰"
  },
  {
    type: "活泼开朗型", 
    traits: ["热情洋溢", "善于沟通", "创意丰富", "乐于分享"],
    communicationStyle: "生动有趣、易于理解、充满激情"
  },
  {
    type: "沉稳内敛型",
    traits: ["深度思考", "稳重可靠", "注重质量", "持续学习"],
    communicationStyle: "深入浅出、循序渐进、稳扎稳打"
  },
  {
    type: "创新探索型",
    traits: ["勇于尝试", "思维敏捷", "适应性强", "前瞻思维"],
    communicationStyle: "新颖独特、启发思考、紧跟趋势"
  }
];

// 虚拟博主管理器
export class VirtualBloggerManager {
  constructor() {
    this.bloggers = new Map();
    this.loadFromStorage();
  }
  
  // 从本地存储加载博主数据
  loadFromStorage() {
    try {
      const data = virtualBloggerStorage.loadBloggers();
      data.forEach(bloggerData => {
        const blogger = new VirtualBlogger(bloggerData);
        this.bloggers.set(blogger.id, blogger);
      });
      console.log(`📥 加载了 ${data.length} 个虚拟博主`);
    } catch (error) {
      console.error('加载虚拟博主数据失败:', error);
    }
  }
  
  // 保存到本地存储
  saveToStorage() {
    try {
      const data = Array.from(this.bloggers.values());
      virtualBloggerStorage.saveBloggers(data);
    } catch (error) {
      console.error('保存虚拟博主数据失败:', error);
    }
  }
  
  // 创建新博主
  async createBlogger(config) {
    const blogger = new VirtualBlogger(config);
    this.bloggers.set(blogger.id, blogger);
    this.saveToStorage();
    return blogger;
  }
  
  // 获取博主
  getBlogger(id) {
    return this.bloggers.get(id);
  }
  
  // 获取所有活跃博主
  getActiveBloggers() {
    return Array.from(this.bloggers.values()).filter(b => b.isActive);
  }
  
  // 获取所有博主
  getAllBloggers() {
    return Array.from(this.bloggers.values());
  }
  
  // 更新博主
  updateBlogger(id, updates) {
    const blogger = this.bloggers.get(id);
    if (blogger) {
      Object.assign(blogger, updates);
      this.saveToStorage();
      return blogger;
    }
    return null;
  }
  
  // 删除博主
  deleteBlogger(id) {
    const deleted = this.bloggers.delete(id);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }
  
  // 创建AI生成的新博主（强制使用AI，失败会重试）
  async createAIGeneratedBlogger() {
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // 随机选择主题和性格
        const topics = Object.keys(learningPathTemplates);
        const randomTopic = topics[Math.floor(Math.random() * topics.length)];
        const randomPersonality = personalityTemplates[Math.floor(Math.random() * personalityTemplates.length)];
        
        console.log(`🤖 AI生成博主尝试 ${attempt}/${maxRetries}，主题: ${randomTopic}，性格: ${randomPersonality.type}`);
        
        // 导入API服务
        const APIService = (await import('../services/APIService')).default;
        const apiService = APIService.getInstance();
        
        // 使用AI生成博主剧本
        const bloggerScript = await apiService.generateBloggerScript(randomTopic, randomPersonality);
        
        if (bloggerScript && bloggerScript.bloggerProfile && bloggerScript.script) {
          // 创建完整的博主配置
          const bloggerConfig = {
            ...bloggerScript.bloggerProfile,
            script: {
              ...bloggerScript.script,
              learningPath: bloggerScript.script.learningPath || learningPathTemplates[randomTopic]
            }
          };
          
          // 创建并保存博主
          const newBlogger = await this.createBlogger(bloggerConfig);
          console.log(`✨ AI成功创建新博主: ${newBlogger.name} (${newBlogger.expertise})`);
          
          return newBlogger;
        } else {
          throw new Error('AI生成的博主剧本格式不正确');
        }
      } catch (error) {
        console.error(`❌ AI生成博主尝试 ${attempt} 失败:`, error);
        
        if (attempt === maxRetries) {
          throw new Error(`经过 ${maxRetries} 次尝试，AI生成博主仍然失败: ${error.message}`);
        }
        
        // 等待一会儿再重试
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }


  // 获取需要更新的博主（根据调度策略）
  getBloggersForScheduling() {
    return this.getActiveBloggers().filter(blogger => {
      const lastUpdate = new Date(blogger.lastUpdateTime);
      const now = new Date();
      const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);
      
      // 如果博主没有任何内容历史，立即调度（首次生成）
      if (blogger.contentHistory.length === 0) {
        console.log(`📝 博主 ${blogger.name} 首次生成内容，立即调度`);
        return true;
      }
      
      // 默认调度策略：4小时更新一次（开发测试期间缩短为4小时）
      const updateInterval = 4; // 小时
      return hoursSinceUpdate >= updateInterval;
    });
  }
}

// 创建全局管理器实例
export const bloggerManager = new VirtualBloggerManager();

// 预设博主数据（用于初始化） - 专业化配置
export const defaultBloggers = [
  {
    name: "调香师小雅",
    expertise: "调香师",
    verified: true,
    script: {
      learningGoal: "深入学习香水调配艺术，掌握各种香料特性和调香技法，分享调香师的日常工作和感悟",
      personality: personalityTemplates[2], // 内敛专注型
      learningPath: {
        title: "调香艺术精进之路",
        modules: [
          {
            id: 1,
            title: "香料基础知识",
            sections: [
              { id: 1, title: "天然香料认识", content: "学习各种天然香料的特性、产地和使用方法", estimatedTime: "2天" },
              { id: 2, title: "合成香料应用", content: "掌握现代合成香料的特点和调配技巧", estimatedTime: "2天" },
              { id: 3, title: "香调分类体系", content: "理解花香、木香、东方调等香调分类", estimatedTime: "1天" }
            ]
          },
          {
            id: 2,
            title: "调香实践技法",
            sections: [
              { id: 1, title: "基础调配方法", content: "学习香水的前中后调搭配原理", estimatedTime: "3天" },
              { id: 2, title: "客户需求分析", content: "如何根据客户喜好调配个性化香水", estimatedTime: "2天" }
            ]
          }
        ]
      }
    }
  },
  {
    name: "古籍修复师老陈",
    expertise: "古籍修复师", 
    verified: true,
    script: {
      learningGoal: "传承古籍修复传统工艺，学习现代保护技术，守护文化瑰宝",
      personality: personalityTemplates[0], // 专业严谨型
      learningPath: {
        title: "古籍修复技艺传承",
        modules: [
          {
            id: 1,
            title: "古籍损伤诊断",
            sections: [
              { id: 1, title: "纸张老化机理", content: "了解古代纸张的制作工艺和老化特点", estimatedTime: "2天" },
              { id: 2, title: "虫蛀霉变处理", content: "掌握虫蛀、霉变等损伤的处理方法", estimatedTime: "3天" },
              { id: 3, title: "装帧结构分析", content: "学习不同时代的装帧方式和修复要点", estimatedTime: "2天" }
            ]
          },
          {
            id: 2,
            title: "修复工艺实践",
            sections: [
              { id: 1, title: "传统修复技法", content: "掌握托裱、补纸等传统修复工艺", estimatedTime: "4天" },
              { id: 2, title: "现代保护技术", content: "学习现代化学保护和数字化技术", estimatedTime: "3天" }
            ]
          }
        ]
      }
    }
  },
  {
    name: "退休教师李奶奶",
    expertise: "生活智慧达人",
    verified: false,
    script: {
      learningGoal: "将教学经验转化为生活智慧，分享科学知识在日常生活中的应用",
      personality: personalityTemplates[1], // 活泼开朗型
      learningPath: {
        title: "生活科学应用指南",
        modules: [
          {
            id: 1,
            title: "家庭科学实验",
            sections: [
              { id: 1, title: "物理原理应用", content: "用物理知识解决日常生活问题", estimatedTime: "2天" },
              { id: 2, title: "化学知识妙用", content: "化学原理在家庭清洁和保养中的应用", estimatedTime: "2天" },
              { id: 3, title: "生物常识分享", content: "植物养护和生物知识的生活应用", estimatedTime: "2天" }
            ]
          },
          {
            id: 2,
            title: "教育心得分享",
            sections: [
              { id: 1, title: "育儿智慧", content: "多年教学经验总结的育儿心得", estimatedTime: "2天" },
              { id: 2, title: "学习方法指导", content: "如何培养孩子的学习兴趣和习惯", estimatedTime: "2天" }
            ]
          }
        ]
      }
    }
  }
];

// 初始化默认博主（如果本地存储为空）
export const initializeDefaultBloggers = async () => {
  const activeBloggers = bloggerManager.getActiveBloggers();
  if (activeBloggers.length === 0) {
    console.log('初始化默认虚拟博主...');
    for (const config of defaultBloggers) {
      await bloggerManager.createBlogger(config);
    }
    console.log(`已创建 ${defaultBloggers.length} 个默认虚拟博主`);
  }
};