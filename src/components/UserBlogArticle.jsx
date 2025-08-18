import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Tag, Share2, Bookmark, Heart } from 'lucide-react';
import LoadingSpinner from './common/LoadingSpinner';
import contentStorage from '../services/ContentStorage';
import APIService from '../services/APIService';

const UserBlogArticle = () => {
  const { userId, postId } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const apiService = APIService.getInstance();

  // 生成完整文章内容
  const generateFullArticleContent = async (blogPost, user) => {
    if (isGenerating) {
      console.log('⚠️ 文章正在生成中，跳过重复请求');
      return null;
    }
    
    setIsGenerating(true);
    console.log('🚀 开始生成文章内容:', blogPost.title);
    
    try {
      const prompt = `你是博主"${user.name}"（${user.expertise}），要写一篇对年轻人有实际帮助的个人博客文章。

【基本信息】
- 文章标题：${blogPost.title}
- 文章预览：${blogPost.preview}
- 文章分类：${blogPost.category}
- 博主身份：${user.expertise}

【核心要求】
这篇文章必须帮助年轻人解决以下三大类现实问题之一：

1. **人际关系技巧**：
   - 职场沟通和人际网络建设
   - 恋爱交友和情感管理
   - 家庭相处和代际沟通
   - 社交心理和自信建立

2. **科技产品使用**：
   - 实用软件和工具推荐
   - 手机电脑使用技巧
   - 数字生活优化方案
   - 新技术趋势解读

3. **赚钱和商业知识**：
   - 副业机会和变现方式
   - 投资理财入门指南
   - 职业规划和薪资谈判
   - 省钱技巧和消费智慧

【写作框架】
## 开篇：问题背景（100字）
- 直接说明要解决什么具体问题
- 为什么这个问题对年轻人很重要

## 核心内容：实用方法（600字）
- 提供3-5个具体可操作的建议
- 每个建议都要有实际案例或数据支撑
- 包含详细的操作步骤

## 进阶技巧：深度建议（200字）
- 给出更高级的策略或注意事项
- 分享个人实战经验

## 总结：行动指南（100字）
- 总结最重要的3个要点
- 给出具体的下一步行动建议

【写作要求】
1. 必须提供具体的数字、方法、步骤，不要空泛建议
2. 分享真实的个人经历和具体案例
3. 语言要亲切实用，避免说教口吻
4. 每个建议都要让读者能立即实践
5. 字数800-1000字，使用Markdown格式
6. 用第一人称写作，增强真实感

【严格禁止】
- 不要写抽象的理论知识
- 不要给出无法验证的建议
- 不要使用空洞的励志鸡汤
- 不要偏离实用性主题

现在请基于"${user.expertise}"的身份和经验，围绕标题"${blogPost.title}"，写一篇真正能帮助年轻人的实用文章：`;

      const result = await apiService.request(prompt, { 
        maxTokens: 2500, 
        expectJSON: false 
      });
      
      // 直接使用返回的文本作为content
      if (result && typeof result === 'string') {
        console.log('✅ 文章生成成功');
        return {
          ...blogPost,
          content: result,
          author: user.name,
          date: blogPost.date || new Date().toLocaleDateString('zh-CN')
        };
      }
    } catch (error) {
      console.error('❌ 生成文章内容失败:', error);
    } finally {
      setIsGenerating(false);
    }
    
    // 如果生成失败，返回基本内容
    setIsGenerating(false);
    return {
      ...blogPost,
      content: `# ${blogPost.title}\n\n${blogPost.preview}\n\n## 深入探讨\n\n作为一名${user.expertise}，我想和大家分享一些关于这个话题的深度思考...\n\n## 实践经验\n\n在我的工作中，我发现这个领域有很多值得探索的地方...\n\n## 总结\n\n希望这篇文章能给大家带来一些启发。如果你有任何问题，欢迎与我交流。`,
      author: user.name,
      date: blogPost.date || new Date().toLocaleDateString('zh-CN')
    };
  };

  useEffect(() => {
    const loadArticle = async () => {
      setLoading(true);
      try {
        // 获取用户信息
        const user = contentStorage.getUser(userId);
        if (!user) {
          navigate(`/user/${userId}`);
          return;
        }
        setUserData(user);

        // 获取博客文章基本信息
        const blogPost = contentStorage.getUserBlogPost(userId, postId);
        
        if (!blogPost) {
          navigate(`/user/${userId}`);
          return;
        }
        
        // 生成完整文章内容
        const fullArticle = await generateFullArticleContent(blogPost, user);
        
        if (!fullArticle) {
          navigate(`/user/${userId}`);
          return;
        }
        
        setArticle(fullArticle);
      } catch (error) {
        console.error('Error loading article:', error);
        navigate(`/user/${userId}`);
      } finally {
        setLoading(false);
      }
    };

    loadArticle();
  }, [userId, postId, navigate]);

  const handleBack = () => {
    navigate(`/user/${userId}`);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.preview,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('链接已复制到剪贴板');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">正在生成文章内容...</p>
        </div>
      </div>
    );
  }

  if (!article || !userData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* 返回按钮 */}
        <button
          onClick={handleBack}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>返回 {userData.name} 的主页</span>
        </button>

        {/* 文章容器 */}
        <article className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* 文章头部 */}
          <div className="p-6 md:p-8 border-b border-gray-100">
            {/* 分类 */}
            <div className="mb-4">
              <span className="inline-block px-3 py-1 text-sm font-semibold text-blue-600 bg-blue-100 rounded-full">
                {article.category}
              </span>
            </div>

            {/* 标题 */}
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
              {article.title}
            </h1>

            {/* 作者信息 */}
            <div className="flex items-center gap-3 mb-4">
              <div className="text-3xl">{userData.avatar}</div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800">{userData.name}</span>
                  {userData.verified && <span className="text-blue-500">✓</span>}
                </div>
                <p className="text-sm text-gray-600">{userData.expertise}</p>
              </div>
            </div>

            {/* 元信息 */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{article.date}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{article.readTime}</span>
              </div>
            </div>

            {/* 标签 */}
            {article.tags && (
              <div className="flex flex-wrap gap-2 mt-4">
                {article.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 文章内容 */}
          <div className="p-6 md:p-8">
            <div className="prose prose-base max-w-none">
              {article.content.split('\n').map((paragraph, index) => {
                // 处理标题
                if (paragraph.startsWith('# ')) {
                  return <h1 key={index} className="text-2xl font-bold mt-6 mb-4 text-gray-800">{paragraph.slice(2)}</h1>;
                } else if (paragraph.startsWith('## ')) {
                  return <h2 key={index} className="text-xl font-bold mt-5 mb-3 text-gray-800">{paragraph.slice(3)}</h2>;
                } else if (paragraph.startsWith('### ')) {
                  return <h3 key={index} className="text-lg font-semibold mt-4 mb-2 text-gray-800">{paragraph.slice(4)}</h3>;
                }
                
                // 处理强调文本
                if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                  const text = paragraph.slice(2, -2);
                  if (text.includes('：')) {
                    return (
                      <p key={index} className="mb-2 text-gray-700">
                        <strong className="text-gray-800">{text}</strong>
                      </p>
                    );
                  }
                  return <p key={index} className="mb-3 font-semibold text-gray-800">{text}</p>;
                }
                
                // 处理列表项
                if (paragraph.startsWith('- ')) {
                  return (
                    <li key={index} className="ml-6 mb-2 text-gray-700 list-disc">
                      {paragraph.slice(2)}
                    </li>
                  );
                } else if (paragraph.match(/^\d+\. /)) {
                  return (
                    <li key={index} className="ml-6 mb-2 text-gray-700 list-decimal">
                      {paragraph.replace(/^\d+\. /, '')}
                    </li>
                  );
                }
                
                // 处理分隔线
                if (paragraph === '---') {
                  return <hr key={index} className="my-6 border-gray-200" />;
                }
                
                // 处理斜体（元信息）
                if (paragraph.startsWith('*') && paragraph.endsWith('*')) {
                  return (
                    <p key={index} className="text-sm text-gray-500 italic mt-6">
                      {paragraph.slice(1, -1)}
                    </p>
                  );
                }
                
                // 普通段落
                if (paragraph.trim()) {
                  return <p key={index} className="mb-4 text-gray-700 leading-relaxed">{paragraph}</p>;
                }
                
                return null;
              })}
            </div>
          </div>

          {/* 互动栏 */}
          <div className="p-6 md:p-8 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setLiked(!liked)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                    liked 
                      ? 'bg-red-100 text-red-600' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                  <span className="text-sm">{liked ? '已喜欢' : '喜欢'}</span>
                </button>
                
                <button
                  onClick={() => setBookmarked(!bookmarked)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                    bookmarked 
                      ? 'bg-yellow-100 text-yellow-600' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
                  <span className="text-sm">{bookmarked ? '已收藏' : '收藏'}</span>
                </button>
              </div>
              
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span className="text-sm">分享</span>
              </button>
            </div>
          </div>
        </article>

        {/* 作者其他文章推荐 */}
        <div className="mt-6 p-5 bg-white rounded-xl shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-3">更多来自 {userData.name} 的文章</h3>
          <div className="space-y-2">
            <button 
              onClick={() => navigate(`/user/${userId}`)}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              查看全部文章 →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserBlogArticle;