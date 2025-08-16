import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { generateFullArticle } from '../data/blogPosts';
import { ArrowLeft, Calendar, Clock, User, Tag, Share2, Bookmark, Heart } from 'lucide-react';
import LoadingSpinner from './common/LoadingSpinner';

const BlogArticle = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    const loadArticle = async () => {
      setLoading(true);
      try {
        // 模拟网络延迟，实际应用中可以是真实的API调用
        await new Promise(resolve => setTimeout(resolve, 1000));
        const fullArticle = await generateFullArticle(postId);
        
        if (!fullArticle) {
          navigate('/blog');
          return;
        }
        
        setArticle(fullArticle);
      } catch (error) {
        console.error('Error loading article:', error);
        navigate('/blog');
      } finally {
        setLoading(false);
      }
    };

    loadArticle();
  }, [postId, navigate]);

  const handleBack = () => {
    navigate('/blog');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.preview,
        url: window.location.href
      });
    } else {
      // 复制链接到剪贴板
      navigator.clipboard.writeText(window.location.href);
      alert('链接已复制到剪贴板');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">正在生成文章内容...</p>
        </div>
      </div>
    );
  }

  if (!article) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 返回按钮 */}
        <button
          onClick={handleBack}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>返回博客列表</span>
        </button>

        {/* 文章容器 */}
        <article className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* 文章头部 */}
          <div className="p-8 border-b border-gray-100">
            {/* 分类 */}
            <div className="mb-4">
              <span className="inline-block px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-100 rounded-full">
                {article.category}
              </span>
            </div>

            {/* 标题 */}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">
              {article.title}
            </h1>

            {/* 元信息 */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-6">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{article.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{article.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{article.readTime}</span>
              </div>
            </div>

            {/* 标签 */}
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-full"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* 文章内容 */}
          <div className="p-8">
            <div className="prose prose-lg max-w-none">
              {article.content.split('\n').map((paragraph, index) => {
                // 处理标题
                if (paragraph.startsWith('# ')) {
                  return <h1 key={index} className="text-3xl font-bold mt-8 mb-4 text-gray-800">{paragraph.slice(2)}</h1>;
                } else if (paragraph.startsWith('## ')) {
                  return <h2 key={index} className="text-2xl font-bold mt-6 mb-3 text-gray-800">{paragraph.slice(3)}</h2>;
                } else if (paragraph.startsWith('### ')) {
                  return <h3 key={index} className="text-xl font-semibold mt-4 mb-2 text-gray-800">{paragraph.slice(4)}</h3>;
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
                
                // 处理强调文本
                if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                  const text = paragraph.slice(2, -2);
                  if (text.includes('：')) {
                    const [title, content] = text.split('：');
                    return (
                      <p key={index} className="mb-2 text-gray-700">
                        <strong className="text-gray-800">{title}：</strong>
                        {content}
                      </p>
                    );
                  }
                  return <p key={index} className="mb-4 font-semibold text-gray-800">{text}</p>;
                }
                
                // 处理分隔线
                if (paragraph === '---') {
                  return <hr key={index} className="my-8 border-gray-200" />;
                }
                
                // 处理斜体（元信息）
                if (paragraph.startsWith('*') && paragraph.endsWith('*')) {
                  return (
                    <p key={index} className="text-sm text-gray-500 italic mt-8">
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
          <div className="p-8 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setLiked(!liked)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    liked 
                      ? 'bg-red-100 text-red-600' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
                  <span>{liked ? '已喜欢' : '喜欢'}</span>
                </button>
                
                <button
                  onClick={() => setBookmarked(!bookmarked)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    bookmarked 
                      ? 'bg-yellow-100 text-yellow-600' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Bookmark className={`w-5 h-5 ${bookmarked ? 'fill-current' : ''}`} />
                  <span>{bookmarked ? '已收藏' : '收藏'}</span>
                </button>
              </div>
              
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Share2 className="w-5 h-5" />
                <span>分享</span>
              </button>
            </div>
          </div>
        </article>

        {/* 推荐阅读（可选） */}
        <div className="mt-8 p-6 bg-white rounded-xl shadow-sm">
          <h3 className="text-xl font-bold text-gray-800 mb-4">推荐阅读</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-gray-600 hover:text-blue-600 cursor-pointer transition-colors">
              <span className="text-2xl text-gray-400">•</span>
              <span>更多{article.category}相关文章</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600 hover:text-blue-600 cursor-pointer transition-colors">
              <span className="text-2xl text-gray-400">•</span>
              <span>查看作者其他文章</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogArticle;