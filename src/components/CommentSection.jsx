import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, MoreHorizontal, Loader } from 'lucide-react';
import APIService from '../services/APIService';
import { getRandomAvatar } from '../utils/avatarUtils';

const CommentSection = ({ articleId, authorId, article, userData }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingComments, setIsGeneratingComments] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const apiService = APIService.getInstance();

  // 生成用户头像和名字
  const generateUserProfile = () => {
    const firstNames = ['张', '李', '王', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙'];
    const lastNames = ['明', '华', '强', '伟', '芳', '娜', '敏', '静', '军', '磊', '洋', '艳'];
    
    const avatar = getRandomAvatar();
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    return {
      avatar,
      name: firstName + lastName
    };
  };

  // 生成时间戳
  const generateTimestamp = () => {
    const options = ['刚刚', '5分钟前', '15分钟前', '30分钟前', '1小时前', '2小时前', '3小时前', '5小时前', '8小时前', '12小时前', '1天前'];
    return options[Math.floor(Math.random() * options.length)];
  };

  // AI生成评论
  const generateAIComments = async (count = 3, isLoadMore = false) => {
    if (!article || isGeneratingComments) return;
    
    setIsGeneratingComments(true);
    if (isLoadMore) setIsLoadingMore(true);

    try {
      const prompt = `基于以下文章内容，生成${count}条真实、有价值的读者评论。每条评论应该：

【文章信息】
标题：${article.title}
作者：${userData.name}（${userData.expertise}）
内容摘要：${article.preview}

【评论要求】
1. 评论要与文章内容密切相关
2. 体现不同读者的观点和角度
3. 有些评论可以分享个人经历
4. 有些评论可以提出问题或建议
5. 语言自然、真实，避免过于正式
6. 长度适中（50-150字）
7. 体现读者的真实反应和思考

【评论类型分布】
- 认同赞赏类：对文章观点的认同和感谢
- 经验分享类：分享自己相关的经历
- 深度思考类：对文章内容的进一步思考
- 实用建议类：补充相关的实用建议
- 提问求教类：基于文章内容的进一步提问

请返回JSON格式：
{
  "comments": [
    {
      "content": "评论内容",
      "type": "comment_type",
      "shouldHighlight": false
    }
  ]
}

注意：
- 其中1条评论可以设置shouldHighlight为true（特别有价值的评论）
- 评论内容要体现真实读者的语气和思维方式
- 不要重复文章中已有的观点，而是要有新的角度或思考`;

      const result = await apiService.request(prompt, {
        maxTokens: 1000,
        expectJSON: true
      });

      if (result && result.comments) {
        const newComments = result.comments.map((comment, index) => {
          const userProfile = generateUserProfile();
          return {
            id: `ai-${Date.now()}-${index}`,
            userId: `user_${Date.now()}_${index}`,
            userName: userProfile.name,
            userAvatar: userProfile.avatar,
            content: comment.content,
            timestamp: generateTimestamp(),
            likes: Math.floor(Math.random() * 50) + 1,
            liked: false,
            replies: [],
            highlighted: comment.shouldHighlight || false
          };
        });

        if (isLoadMore) {
          setComments(prev => [...prev, ...newComments]);
        } else {
          setComments(newComments);
        }
      }
    } catch (error) {
      console.error('生成评论失败:', error);
      // 如果AI生成失败，使用备用评论
      if (!isLoadMore && comments.length === 0) {
        const fallbackComments = [
          {
            id: 'fallback-1',
            userId: 'user1',
            userName: '读者',
            userAvatar: '👨',
            content: '文章写得很好，学到了很多新知识！',
            timestamp: '2小时前',
            likes: 12,
            liked: false,
            replies: []
          }
        ];
        setComments(fallbackComments);
      }
    } finally {
      setIsGeneratingComments(false);
      setIsLoadingMore(false);
    }
  };

  // 初始化生成评论
  useEffect(() => {
    if (article && userData && comments.length === 0) {
      generateAIComments(3, false);
    }
  }, [article, userData]);

  // 处理发送评论
  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    
    setIsSubmitting(true);
    
    // 模拟提交延迟
    setTimeout(() => {
      const comment = {
        id: `c${Date.now()}`,
        userId: 'current',
        userName: '我',
        userAvatar: '😊',
        content: newComment,
        timestamp: '刚刚',
        likes: 0,
        liked: false,
        replies: []
      };
      
      setComments([comment, ...comments]);
      setNewComment('');
      setIsSubmitting(false);
    }, 500);
  };

  // 处理回复
  const handleSubmitReply = (commentId) => {
    if (!replyText.trim()) return;
    
    const reply = {
      id: `r${Date.now()}`,
      userId: 'current',
      userName: '我',
      userAvatar: '😊',
      content: replyText,
      timestamp: '刚刚',
      likes: 0,
      liked: false
    };
    
    setComments(comments.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          replies: [...(comment.replies || []), reply]
        };
      }
      return comment;
    }));
    
    setReplyText('');
    setReplyingTo(null);
  };

  // 处理点赞
  const handleLike = (commentId, isReply = false, parentId = null) => {
    if (isReply && parentId) {
      setComments(comments.map(comment => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replies: comment.replies.map(reply => {
              if (reply.id === commentId) {
                return {
                  ...reply,
                  liked: !reply.liked,
                  likes: reply.liked ? reply.likes - 1 : reply.likes + 1
                };
              }
              return reply;
            })
          };
        }
        return comment;
      }));
    } else {
      setComments(comments.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            liked: !comment.liked,
            likes: comment.liked ? comment.likes - 1 : comment.likes + 1
          };
        }
        return comment;
      }));
    }
  };

  // 评论组件
  const Comment = ({ comment, isReply = false, parentId = null }) => {
    return (
      <div className={`flex gap-3 ${isReply ? 'ml-12 mt-4' : ''}`}>
        {/* 头像 */}
        <div className="flex-shrink-0">
          <img
            src={comment.userAvatar}
            alt={comment.userName}
            className="w-10 h-10 rounded-full object-cover bg-gray-100"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg" style={{display: 'none'}}>
            😊
          </div>
        </div>
        
        {/* 评论内容 */}
        <div className="flex-1 min-w-0">
          {/* 用户信息 */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900 text-sm">
              {comment.userName}
            </span>
            <span className="text-gray-400 text-sm">·</span>
            <span className="text-gray-500 text-sm">{comment.timestamp}</span>
          </div>
          
          {/* 评论文本 */}
          <div className={`text-gray-800 leading-relaxed mb-3 ${
            comment.highlighted ? 'bg-yellow-50 p-3 rounded-lg border border-yellow-100' : ''
          }`}>
            {comment.content}
          </div>
          
          {/* 交互按钮 */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleLike(comment.id, isReply, parentId)}
              className={`flex items-center gap-1.5 text-sm transition-colors ${
                comment.liked ? 'text-red-500' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Heart 
                size={16} 
                className={comment.liked ? 'fill-current' : ''}
              />
              <span>{comment.likes > 0 ? comment.likes : ''}</span>
            </button>
            
            {!isReply && (
              <button
                onClick={() => setReplyingTo(comment.id)}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <MessageCircle size={16} />
                <span>Reply</span>
              </button>
            )}
            
            <button className="text-gray-400 hover:text-gray-600 transition-colors">
              <MoreHorizontal size={16} />
            </button>
          </div>
          
          {/* 回复输入框 */}
          {replyingTo === comment.id && !isReply && (
            <div className="mt-4 flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm flex-shrink-0">
                😊
              </div>
              <div className="flex-1">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 text-sm"
                  rows="2"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleSubmitReply(comment.id)}
                    className="px-4 py-1.5 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
                  >
                    Reply
                  </button>
                  <button
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyText('');
                    }}
                    className="px-4 py-1.5 text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* 回复列表 */}
          {!isReply && comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 space-y-4">
              {comment.replies.map(reply => (
                <Comment 
                  key={reply.id} 
                  comment={reply} 
                  isReply={true}
                  parentId={comment.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="border-t border-gray-200 pt-12">
        {/* 评论标题 */}
        <h3 className="text-2xl font-bold text-gray-900 mb-8">
          Responses ({comments.length})
        </h3>
        
        {/* 评论输入区 */}
        <div className="mb-12">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg">
                😊
              </div>
            </div>
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="What are your thoughts?"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 placeholder-gray-400"
                rows="3"
              />
              <div className="mt-3 flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  Share your thoughts respectfully
                </span>
                <button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isSubmitting}
                  className={`px-5 py-2 rounded-full font-medium transition-all ${
                    newComment.trim() && !isSubmitting
                      ? 'bg-gray-900 text-white hover:bg-gray-800'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? 'Posting...' : 'Respond'}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* 评论列表 */}
        <div className="space-y-8">
          {comments.map(comment => (
            <div key={comment.id} className="pb-8 border-b border-gray-100 last:border-0">
              <Comment comment={comment} />
            </div>
          ))}
        </div>
        
        {/* 加载更多 */}
        {comments.length > 0 && (
          <div className="mt-8 text-center">
            <button 
              onClick={() => generateAIComments(3, true)}
              disabled={isLoadingMore}
              className="text-gray-600 hover:text-gray-900 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
            >
              {isLoadingMore ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Loading more...</span>
                </>
              ) : (
                'Show more responses'
              )}
            </button>
          </div>
        )}

        {/* 初始加载状态 */}
        {isGeneratingComments && comments.length === 0 && (
          <div className="text-center py-12">
            <Loader className="w-8 h-8 animate-spin text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600">正在生成评论...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentSection;