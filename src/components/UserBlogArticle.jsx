import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, Bookmark, Share2, MoreHorizontal, UserPlus, UserCheck } from 'lucide-react';
import LoadingSpinner from './common/LoadingSpinner';
import contentStorage from '../services/ContentStorage';
import APIService from '../services/APIService';
import CommentSection from './CommentSection';

const UserBlogArticle = () => {
  const { userId, postId } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
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
        setIsFollowing(contentStorage.isFollowing(userId));

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
        // 设置随机点赞数
        setLikeCount(Math.floor(Math.random() * 1000) + 100);
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

  const handleFollow = () => {
    if (isFollowing) {
      contentStorage.unfollowUser(userId);
    } else {
      contentStorage.followUser(userId);
    }
    setIsFollowing(!isFollowing);
  };

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">正在加载文章...</p>
        </div>
      </div>
    );
  }

  if (!article || !userData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 顶部导航栏 - 极简设计 */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <Share2 className="w-5 h-5 text-gray-700" />
              </button>
              <button
                onClick={() => setBookmarked(!bookmarked)}
                className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${
                  bookmarked ? 'text-gray-900' : 'text-gray-700'
                }`}
              >
                <Bookmark className={`w-5 h-5 ${bookmarked ? 'fill-current' : ''}`} />
              </button>
              <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                <MoreHorizontal className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 文章主体 - Medium风格布局 */}
      <article className="max-w-3xl mx-auto px-4 py-10">
        {/* 文章标题 - 醒目大字号 */}
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-8">
          {article.title}
        </h1>

        {/* 文章描述/副标题 */}
        <p className="text-xl text-gray-600 leading-relaxed mb-10">
          {article.preview}
        </p>

        {/* 作者信息栏 */}
        <div className="flex items-center justify-between mb-12 pb-8 border-b border-gray-200">
          <div className="flex items-center gap-4">
            {/* 作者头像 */}
            <img
              src={userData.avatar}
              alt={userData.name}
              className="w-12 h-12 rounded-full object-cover bg-gray-100"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-2xl" style={{display: 'none'}}>
              😊
            </div>
            
            {/* 作者信息 */}
            <div>
              <div className="flex items-center gap-2">
                <h3 
                  className="text-base font-medium text-gray-900 hover:underline cursor-pointer"
                  onClick={() => navigate(`/user/${userId}`)}
                >
                  {userData.name}
                </h3>
                {userData.verified && <span className="text-blue-500 text-sm">✓</span>}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{article.readTime} · {article.date}</span>
                <span>·</span>
                <button className="text-green-600 hover:text-green-700">
                  Member-only story
                </button>
              </div>
            </div>
          </div>

          {/* 关注按钮 */}
          <button
            onClick={handleFollow}
            className={`px-4 py-2 rounded-full font-medium transition-all ${
              isFollowing
                ? 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                : 'text-white bg-gray-900 hover:bg-gray-800'
            }`}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        </div>

        {/* 文章内容 - 优化排版 */}
        <div className="prose prose-lg max-w-none">
          {article.content.split('\n').map((paragraph, index) => {
            // 处理一级标题
            if (paragraph.startsWith('# ')) {
              return (
                <h1 key={index} className="text-3xl font-bold mt-12 mb-6 text-gray-900 leading-tight">
                  {paragraph.slice(2)}
                </h1>
              );
            }
            
            // 处理二级标题
            if (paragraph.startsWith('## ')) {
              return (
                <h2 key={index} className="text-2xl font-bold mt-10 mb-4 text-gray-900 leading-tight">
                  {paragraph.slice(3)}
                </h2>
              );
            }
            
            // 处理三级标题
            if (paragraph.startsWith('### ')) {
              return (
                <h3 key={index} className="text-xl font-semibold mt-8 mb-3 text-gray-900">
                  {paragraph.slice(4)}
                </h3>
              );
            }
            
            // 处理粗体强调文本
            if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
              const text = paragraph.slice(2, -2);
              return (
                <p key={index} className="font-semibold text-gray-900 my-4">
                  {text}
                </p>
              );
            }
            
            // 处理列表项
            if (paragraph.startsWith('- ')) {
              return (
                <li key={index} className="ml-6 my-2 text-gray-800 text-lg leading-relaxed list-disc">
                  {paragraph.slice(2)}
                </li>
              );
            }
            
            if (paragraph.match(/^\d+\. /)) {
              return (
                <li key={index} className="ml-6 my-2 text-gray-800 text-lg leading-relaxed list-decimal">
                  {paragraph.replace(/^\d+\. /, '')}
                </li>
              );
            }
            
            // 处理分隔线
            if (paragraph === '---') {
              return <hr key={index} className="my-10 border-gray-200" />;
            }
            
            // 处理斜体文本
            if (paragraph.startsWith('*') && paragraph.endsWith('*') && !paragraph.startsWith('**')) {
              return (
                <p key={index} className="text-gray-600 italic my-4 text-lg leading-relaxed">
                  {paragraph.slice(1, -1)}
                </p>
              );
            }
            
            // 处理图片占位（这里可以添加实际图片）
            if (paragraph.includes('[图片]')) {
              return (
                <div key={index} className="my-10 bg-gray-100 rounded-lg h-96 flex items-center justify-center">
                  <span className="text-gray-400">图片区域</span>
                </div>
              );
            }
            
            // 普通段落 - 优化阅读体验
            if (paragraph.trim()) {
              return (
                <p key={index} className="my-6 text-gray-800 text-lg leading-relaxed">
                  {paragraph}
                </p>
              );
            }
            
            return null;
          })}
        </div>

        {/* 文章底部标签 */}
        {article.tags && article.tags.length > 0 && (
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag, index) => (
                <button
                  key={index}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </article>

      {/* 底部交互栏 - 固定悬浮 */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* 左侧交互按钮 */}
            <div className="flex items-center gap-6">
              <button
                onClick={handleLike}
                className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                <Heart 
                  className={`w-6 h-6 ${liked ? 'fill-current text-red-500' : ''}`} 
                />
                <span className="text-sm font-medium">{likeCount}</span>
              </button>
              
              <button className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors">
                <MessageCircle className="w-6 h-6" />
                <span className="text-sm font-medium">{Math.floor(Math.random() * 50) + 5}</span>
              </button>
            </div>

            {/* 右侧操作按钮 */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setBookmarked(!bookmarked)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <Bookmark 
                  className={`w-5 h-5 ${bookmarked ? 'fill-current text-gray-900' : 'text-gray-700'}`} 
                />
              </button>
              
              <button
                onClick={handleShare}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <Share2 className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 评论区 */}
      <CommentSection 
        articleId={postId} 
        authorId={userId} 
        article={article}
        userData={userData}
      />

      {/* 作者更多文章推荐 */}
      <section className="max-w-3xl mx-auto px-4 py-12">
        <div className="border-t border-gray-200 pt-12">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold text-gray-900">
              More from {userData.name}
            </h3>
            <button
              onClick={() => navigate(`/user/${userId}`)}
              className="text-green-600 hover:text-green-700 font-medium"
            >
              See all
            </button>
          </div>
          
          {/* 推荐文章卡片 */}
          <div className="grid gap-8">
            <div className="border-b border-gray-100 pb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-2 hover:underline cursor-pointer">
                探索更多精彩内容
              </h4>
              <p className="text-gray-600 line-clamp-2">
                发现更多来自{userData.name}的独特见解和专业分享...
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default UserBlogArticle;