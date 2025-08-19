import React, { memo } from 'react';
import { User, BookOpen, Clock, Target, Edit, Trash2, Eye, Play, Calendar, Users, Heart } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useNavigation } from '../hooks/useNavigation';
import StorageManager from '../services/StorageManager';
import contentStorage from '../services/ContentStorage';
import { useNavigate } from 'react-router-dom';

const PersonalCenter = memo(() => {
  const { state, dispatch } = useAppContext();
  const { navigateTo } = useNavigation();
  const navigate = useNavigate();
  const [learningHistory, setLearningHistory] = React.useState([]);
  const [editingId, setEditingId] = React.useState(null);
  const [editingName, setEditingName] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('history');
  const [followingUsers, setFollowingUsers] = React.useState([]);
  const [likedPosts, setLikedPosts] = React.useState([]);
  const [bookmarkedPosts, setBookmarkedPosts] = React.useState([]);

  // 加载所有数据
  React.useEffect(() => {
    // 学习历史
    const history = StorageManager.getLearningHistory();
    setLearningHistory(history);
    
    // 关注的用户
    const following = contentStorage.getFollowing();
    const users = following.map(userId => contentStorage.getUser(userId)).filter(Boolean);
    setFollowingUsers(users);
    
    // 加载点赞和收藏的内容（这里简化处理，实际可以根据需要获取完整帖子信息）
    const liked = contentStorage.exportData().likes;
    const bookmarked = contentStorage.exportData().bookmarks;
    setLikedPosts(liked);
    setBookmarkedPosts(bookmarked);
  }, []);

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN');
    } catch (error) {
      return '未知时间';
    }
  };

  const getStageDisplayName = (stage) => {
    const stageMap = {
      'topic_confirmed': '主题确认',
      'story_completed': '故事完成',
      'quiz_completed': '测试完成',
      'assessment_completed': '评估完成',
      'outline_generated': '大纲生成',
      'learning_started': '学习中'
    };
    return stageMap[stage] || stage;
  };

  const handleViewResults = (record) => {
    // 恢复测试状态
    dispatch({ type: 'SET_CONFIRMED_TOPIC', topic: record.originalTopic });
    dispatch({ type: 'SET_CURRENT_LEARNING_ID', learningId: record.id });

    if (record.testResults && record.testResults.questions) {
      dispatch({ type: 'SET_QUESTIONS', questions: record.testResults.questions });
      // 恢复答案
      const answers = {};
      record.testResults.questions.forEach(q => {
        if (record.testResults.answers && record.testResults.answers[q.id]) {
          answers[q.id] = record.testResults.answers[q.id];
        }
      });
      Object.keys(answers).forEach(questionId => {
        dispatch({ type: 'SET_ANSWER', questionId, answer: answers[questionId] });
      });
    }

    navigateTo.results(record.id);
  };

  const handleContinueLearning = (record) => {
    // 恢复学习状态
    dispatch({ type: 'SET_CONFIRMED_TOPIC', topic: record.originalTopic });
    dispatch({ type: 'SET_CURRENT_LEARNING_ID', learningId: record.id });

    if (record.stage === 'topic_confirmed') {
      navigateTo.story(record.id);
    } else if (record.stage === 'assessment_completed') {
      if (record.testResults) {
        dispatch({ type: 'SET_QUESTIONS', questions: record.testResults.questions || [] });
        // 恢复答案
        const answers = {};
        record.testResults.questions?.forEach(q => {
          if (record.testResults.answers && record.testResults.answers[q.id]) {
            answers[q.id] = record.testResults.answers[q.id];
          }
        });
        Object.keys(answers).forEach(questionId => {
          dispatch({ type: 'SET_ANSWER', questionId, answer: answers[questionId] });
        });
      }
      navigateTo.results(record.id);
    } else if (record.stage === 'outline_generated') {
      if (record.outline) {
        dispatch({ type: 'SET_OUTLINE', outline: record.outline });
      }
      navigateTo.outline(record.id);
    }
  };

  const handleEditName = (record) => {
    setEditingId(record.id);
    setEditingName(record.displayName || record.originalTopic);
  };

  const handleSaveEdit = (record) => {
    const newName = editingName.trim();
    if (newName && newName !== record.displayName) {
      StorageManager.updateLearningRecordDisplayName(record.id, newName);
      setLearningHistory(prev => 
        prev.map(item => 
          item.id === record.id 
            ? { ...item, displayName: newName }
            : item
        )
      );
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleDeleteRecord = (record) => {
    if (window.confirm(`确定要删除学习记录 "${record.displayName || record.originalTopic}" 吗？`)) {
      StorageManager.deleteLearningRecord(record.id);
      setLearningHistory(prev => prev.filter(item => item.id !== record.id));
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('确定要清除所有学习历史吗？此操作不可撤销。')) {
      StorageManager.clearLearningHistory();
      setLearningHistory([]);
    }
  };

  const handleUnfollow = (userId) => {
    if (window.confirm('确定要取消关注吗？')) {
      contentStorage.unfollowUser(userId);
      setFollowingUsers(prev => prev.filter(user => user.id !== userId));
    }
  };

  const handleUserClick = (userId) => {
    navigate(`/user/${userId}`);
  };

  // 计算统计数据
  const totalSessions = learningHistory.length;
  const completedSessions = learningHistory.filter(record => 
    record.stage === 'outline_generated' || record.stage === 'learning_started'
  ).length;
  const totalTopics = new Set(learningHistory.map(record => record.originalTopic)).size;

  return (
    <div className="px-6 py-12">
      <div className="max-w-5xl mx-auto">
        {/* 头部 */}
        <div className="text-center mb-12">
          <User className="w-8 h-8 text-black mx-auto mb-6" />
          <h2 className="text-2xl font-semibold text-black mb-4">个人中心</h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            管理你的学习记录、关注和收藏
          </p>
        </div>

        {/* 标签导航 */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              学习历史
            </button>
            <button
              onClick={() => setActiveTab('following')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'following'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              我的关注 ({followingUsers.length})
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'favorites'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              收藏内容 ({bookmarkedPosts.length})
            </button>
          </div>
        </div>

        {/* 顶部操作 */}
        {activeTab === 'history' && (
          <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
            <h3 className="text-xl font-semibold text-black mb-4 sm:mb-0">学习历史</h3>
            <div className="flex space-x-3">
              {learningHistory.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors text-sm border border-red-200"
                >
                  清除历史
                </button>
              )}
              <button
                onClick={() => navigate('/')}
                className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                返回主页
              </button>
            </div>
          </div>
        )}

        {/* 内容区域 */}
        {activeTab === 'history' && (
          <>
            {/* 统计信息 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="border border-gray-200 rounded-xl p-6 text-center">
                <BookOpen className="w-6 h-6 text-black mx-auto mb-3" />
                <div className="text-2xl font-bold text-black mb-2">{totalSessions}</div>
                <div className="text-gray-600 text-sm">学习会话</div>
              </div>

              <div className="border border-gray-200 rounded-xl p-6 text-center">
                <Target className="w-6 h-6 text-black mx-auto mb-3" />
                <div className="text-2xl font-bold text-black mb-2">{completedSessions}</div>
                <div className="text-gray-600 text-sm">已完成</div>
              </div>

              <div className="border border-gray-200 rounded-xl p-6 text-center">
                <Clock className="w-6 h-6 text-black mx-auto mb-3" />
                <div className="text-2xl font-bold text-black mb-2">{totalTopics}</div>
                <div className="text-gray-600 text-sm">学习主题</div>
              </div>
            </div>

            {/* 学习记录列表 */}
            {learningHistory.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">还没有学习记录</h3>
                <p className="text-gray-500 mb-6">开始你的第一次学习吧！</p>
                <button
                  onClick={() => navigate('/')}
                  className="bg-black text-white py-3 px-6 rounded-xl font-medium hover:bg-gray-800 transition-colors duration-200"
                >
                  开始学习
                </button>
              </div>
            ) : (
          <div className="space-y-4">
            {learningHistory.map((record) => (
              <div key={record.id} className="border border-gray-200 rounded-xl p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-3">
                      {editingId === record.id ? (
                        <div className="flex items-center space-x-2 flex-1">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(record);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEdit(record)}
                            className="px-3 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <>
                          <h4 className="text-lg font-semibold text-black flex-1">
                            {record.displayName || record.originalTopic}
                          </h4>
                          <button
                            onClick={() => handleEditName(record)}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {formatDate(record.createdAt)}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                        {getStageDisplayName(record.stage)}
                      </span>
                    </div>

                    {record.lastActivity && (
                      <p className="text-sm text-gray-600 mb-4">
                        最后活动: {formatDate(record.lastActivity)}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {record.testResults && (
                      <button
                        onClick={() => handleViewResults(record)}
                        className="p-2 text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                        title="查看测试结果"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => handleContinueLearning(record)}
                      className="p-2 text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                      title="继续学习"
                    >
                      <Play className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteRecord(record)}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      title="删除记录"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
              </div>
            )}
          </>
        )}

        {/* 关注列表 */}
        {activeTab === 'following' && (
          <div>
            {followingUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">还没有关注任何人</h3>
                <p className="text-gray-500 mb-6">去发现一些有趣的分享者吧！</p>
                <button
                  onClick={() => navigate('/')}
                  className="bg-black text-white py-3 px-6 rounded-xl font-medium hover:bg-gray-800 transition-colors duration-200"
                >
                  去发现
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {followingUsers.map((user) => (
                  <div key={user.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 mr-3 rounded-full overflow-hidden flex-shrink-0">
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-2xl" style={{display: 'none'}}>
                          😊
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-black flex items-center">
                          {user.name}
                          {user.verified && <span className="text-blue-500 ml-1">✓</span>}
                        </h4>
                        <p className="text-sm text-gray-600">{user.expertise}</p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-4 line-clamp-2">{user.bio}</p>
                    
                    <div className="flex justify-between items-center text-xs text-gray-500 mb-4">
                      <span>{user.followers?.toLocaleString()} 关注者</span>
                      <span>{user.postsCount} 推文</span>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleUserClick(user.id)}
                        className="flex-1 bg-black text-white py-2 px-4 rounded-lg text-sm hover:bg-gray-800 transition-colors"
                      >
                        查看主页
                      </button>
                      <button
                        onClick={() => handleUnfollow(user.id)}
                        className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors text-sm border border-red-200"
                      >
                        取消关注
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 收藏内容 */}
        {activeTab === 'favorites' && (
          <div>
            {bookmarkedPosts.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">还没有收藏任何内容</h3>
                <p className="text-gray-500 mb-6">收藏你喜欢的知识分享吧！</p>
                <button
                  onClick={() => navigate('/')}
                  className="bg-black text-white py-3 px-6 rounded-xl font-medium hover:bg-gray-800 transition-colors duration-200"
                >
                  去探索
                </button>
              </div>
            ) : (
              <div className="text-center py-12">
                <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">收藏功能开发中</h3>
                <p className="text-gray-500 mb-6">敬请期待更完善的收藏管理功能！</p>
                <div className="text-sm text-gray-600">
                  当前收藏数量: {bookmarkedPosts.length}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

PersonalCenter.displayName = 'PersonalCenter';

export default PersonalCenter;