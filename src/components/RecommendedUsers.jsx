import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Sparkles, RefreshCw, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import APIService from '../services/APIService';
import contentStorage from '../services/ContentStorage';
import { getRandomAvatar } from '../utils/avatarUtils';
import { bloggerManager } from '../data/virtualBloggers';
import { useVirtualBloggers } from '../hooks/useVirtualBloggers';

const RecommendedUsers = ({ onClose }) => {
    const [recommendedUsers, setRecommendedUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [userPreferences, setUserPreferences] = useState(null);
    const [isFromCache, setIsFromCache] = useState(false);
    const navigate = useNavigate();
    const apiService = APIService.getInstance();
    const { isInitialized } = useVirtualBloggers();

    useEffect(() => {
        loadRecommendations();
    }, [isInitialized]);

    const loadRecommendations = async () => {
        setIsLoading(true);
        try {
            if (!isInitialized) {
                console.log('⏳ 虚拟博主系统尚未初始化，等待...');
                setIsLoading(false);
                return;
            }

            // 获取所有虚拟博主
            const allBloggers = bloggerManager.getAllBloggers();
            const following = contentStorage.getFollowing();
            
            // 过滤掉已关注的博主，随机选择4个推荐
            const unFollowedBloggers = allBloggers.filter(blogger => 
                !following.includes(blogger.id)
            );
            
            const shuffled = [...unFollowedBloggers].sort(() => 0.5 - Math.random());
            const selectedBloggers = shuffled.slice(0, 4);
            
            // 转换为推荐用户格式
            const recommendedUsersList = selectedBloggers.map(blogger => ({
                id: blogger.id,
                name: blogger.name,
                avatar: blogger.avatar,
                expertise: blogger.expertise,
                verified: blogger.verified || true,
                bio: typeof blogger.script?.personality === 'string' 
                    ? blogger.script.personality.substring(0, 100) + '...'
                    : '虚拟博主，正在分享学习心得',
                followers: Math.floor(Math.random() * 5000) + 1000,
                following: Math.floor(Math.random() * 100) + 50,
                postsCount: blogger.contentHistory?.length || 0,
                joinDate: blogger.createdAt ? new Date(blogger.createdAt).toLocaleDateString('zh-CN') : '最近',
                progress: blogger.currentProgress || '1.1',
                isVirtualBlogger: true
            }));
            
            setRecommendedUsers(recommendedUsersList);
            console.log(`📝 推荐了 ${recommendedUsersList.length} 个虚拟博主`);
            
        } catch (error) {
            console.error('加载推荐失败:', error);
        }
        setIsLoading(false);
    };

    const refreshRecommendations = async () => {
        console.log('🔄 刷新虚拟博主推荐');
        await loadRecommendations();
    };

    const handleFollow = (user) => {
        if (user.isVirtualBlogger) {
            // 对于虚拟博主，直接关注，不需要添加到contentStorage
            console.log(`👤 关注虚拟博主: ${user.name} (${user.id})`);
            contentStorage.followUser(user.id);
        } else {
            // 对于其他用户，保持原有逻辑
            contentStorage.addUserFromPost({
                expertName: user.name,
                expertAvatar: user.avatar,
                expertise: user.expertise,
                verified: user.verified
            });
            contentStorage.followUser(user.id);
        }
        
        // 从推荐列表中移除
        setRecommendedUsers(prev => prev.filter(u => u.id !== user.id));
    };

    const handleUserClick = (user) => {
        if (user.isVirtualBlogger) {
            // 虚拟博主直接跳转
            console.log(`🎯 点击虚拟博主: ${user.name} (${user.id})`);
            navigate(`/user/${user.id}`);
        } else {
            // 其他用户保持原有逻辑
            if (!contentStorage.getUser(user.id)) {
                contentStorage.addUserFromPost({
                    expertName: user.name,
                    expertAvatar: user.avatar,
                    expertise: user.expertise,
                    verified: user.verified
                });
            }
            navigate(`/user/${user.id}`);
        }
    };

    if (!recommendedUsers.length && !isLoading) {
        return null;
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 mb-6 overflow-hidden">
            {/* 头部 */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-50">
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                        <Sparkles className="text-purple-600" size={16} />
                    </div>
                    <h3 className="font-semibold text-gray-900 text-lg">为你推荐</h3>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => refreshRecommendations()}
                        disabled={isLoading}
                        className="p-2 text-gray-400 hover:text-purple-600 disabled:opacity-50 rounded-lg hover:bg-purple-50 transition-all duration-200"
                        title="刷新推荐"
                    >
                        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-all duration-200"
                            title="关闭"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* 偏好说明和缓存状态 */}
            {userPreferences && userPreferences.totalFollowing > 0 && (
                <div className="mx-6 mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                    <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Users size={12} className="text-white" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-gray-700 leading-relaxed">
                                基于你关注的 <span className="font-medium text-blue-700">{userPreferences.totalFollowing} 位博主</span> 的特征推荐
                            </p>
                            {Object.keys(userPreferences.subjects).length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                    <span className="text-xs text-gray-600">偏好领域：</span>
                                    {Object.keys(userPreferences.subjects).slice(0, 3).map(subject => (
                                        <span key={subject} className="text-xs bg-white text-gray-700 px-2 py-0.5 rounded-full border border-gray-200">
                                            {subject}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {isFromCache && (
                                <div className="mt-2">
                                    <span className="inline-flex items-center text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                        <span className="mr-1">💾</span>
                                        缓存数据
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 推荐列表 */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-2 border-purple-200 border-t-purple-600 mx-auto mb-3"></div>
                        <p className="text-sm text-gray-600">正在分析你的偏好...</p>
                    </div>
                </div>
            ) : (
                <div className="px-6 pb-6 space-y-1">
                    {recommendedUsers.map((user) => (
                        <div key={user.id} className="group p-4 rounded-xl hover:bg-gray-50 transition-all duration-200 border border-transparent hover:border-gray-100">
                            <div className="flex items-start space-x-4">
                                {/* 头像 */}
                                <div 
                                    className="cursor-pointer group-hover:scale-105 transition-transform"
                                    onClick={() => handleUserClick(user)}
                                >
                                    <div className="relative">
                                        <img
                                            src={user.avatar}
                                            alt={user.name}
                                            className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                            }}
                                        />
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 flex items-center justify-center text-xl border-2 border-white shadow-sm" style={{display: 'none'}}>
                                            😊
                                        </div>
                                        {user.verified && (
                                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                                <span className="text-white text-xs">✓</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                {/* 用户信息 */}
                                <div className="flex-1 min-w-0">
                                    <div 
                                        className="cursor-pointer"
                                        onClick={() => handleUserClick(user)}
                                    >
                                        <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                            {user.name}
                                        </h4>
                                        <p className="text-sm text-gray-500 mt-0.5">{user.expertise}</p>
                                    </div>
                                    
                                    <p className="text-sm text-gray-700 leading-relaxed mt-2 line-clamp-2">
                                        {user.bio}
                                    </p>
                                    
                                    {/* 标签 */}
                                    <div className="flex flex-wrap gap-1.5 mt-3">
                                        {user.tags?.slice(0, 3).map(tag => (
                                            <span 
                                                key={tag}
                                                className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-100"
                                            >
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                    
                                    {/* 推荐理由 */}
                                    {user.reason && (
                                        <div className="mt-3 p-2 bg-purple-50 rounded-lg border-l-2 border-purple-200">
                                            <p className="text-xs text-purple-700 italic">
                                                💡 {user.reason}
                                            </p>
                                        </div>
                                    )}
                                    
                                    {/* 统计信息 */}
                                    <div className="flex items-center space-x-4 text-xs text-gray-500 mt-3">
                                        <span className="flex items-center">
                                            <span className="font-medium text-gray-700">{user.followers?.toLocaleString()}</span>
                                            <span className="ml-1">关注者</span>
                                        </span>
                                        <span className="flex items-center">
                                            <span className="font-medium text-gray-700">{user.postsCount}</span>
                                            <span className="ml-1">帖子</span>
                                        </span>
                                    </div>
                                </div>
                                
                                {/* 关注按钮 */}
                                <button
                                    onClick={() => handleFollow(user)}
                                    className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:from-purple-600 hover:to-blue-600 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                                >
                                    <UserPlus size={14} />
                                    <span>关注</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 空状态 */}
            {!isLoading && recommendedUsers.length === 0 && (
                <div className="text-center py-12 px-6">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="text-gray-400" size={28} />
                    </div>
                    <p className="text-gray-500 text-sm mb-2">暂无推荐用户</p>
                    <p className="text-gray-400 text-xs">稍后会根据你的活动为你推荐感兴趣的专家</p>
                </div>
            )}
        </div>
    );
};

export default RecommendedUsers;