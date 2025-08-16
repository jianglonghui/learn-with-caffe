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
      const prompt = `你是博主"${user.name}"（${user.expertise}），要写一篇个人博客文章。

【基本信息】
- 文章标题：${blogPost.title}
- 文章预览：${blogPost.preview}
- 文章分类：${blogPost.category}
- 博主身份：${user.expertise}

【写作任务】
基于你的专业身份"${user.expertise}"，动态分析并体现以下特质来写作：

1. **专业人格塑造**：
   - 深入思考这个职业的从业者通常具有什么样的性格特点
   - 分析这类专业人士在面对行业问题时的典型态度
   - 推断他们可能有的价值观和立场

2. **写作风格适配**：
   - 根据职业特征选择合适的表达方式（学术严谨、匠人朴实、创意活泼等）
   - 平衡专业权威性与个人亲和力
   - 体现这类专业人士的语言习惯和思维模式

3. **观点深度挖掘**：
   - 从专业角度深入分析标题和预览中的核心观点
   - 结合行业现状提出独特见解和批判性思考
   - 用具体的专业经历和案例支撑观点

【写作要求】
1. 必须有鲜明的个人观点和专业立场，不要人云亦云
2. 结合具体的专业经历和真实案例
3. 对相关领域的现状要有深度思考和适度批判
4. 语言要体现专业人士的个人特色，避免官方腔调
5. 适当表达情感和态度，让读者感受到专业人士的真实想法
6. 字数800-1000字，使用Markdown格式
7. 用第一人称写作，增强真实感和亲近感

【特别提醒】
- 不要写成教科书式的知识普及文章
- 必须有强烈的个人色彩和专业洞察
- 可以质疑常见观点，提出反思和争议
- 让读者感受到一个真实的专业人士在分享他的思考

现在请深入分析"${user.expertise}"这个身份，结合标题"${blogPost.title}"，写一篇充满个性和专业深度的文章：`;

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