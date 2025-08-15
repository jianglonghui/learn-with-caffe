import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Sparkles, RefreshCw, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import APIService from '../services/APIService';
import contentStorage from '../services/ContentStorage';

const RecommendedUsers = ({ onClose }) => {
    const [recommendedUsers, setRecommendedUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [userPreferences, setUserPreferences] = useState(null);
    const navigate = useNavigate();
    const apiService = APIService.getInstance();

    useEffect(() => {
        generateRecommendations();
    }, []);

    const generateRecommendations = async () => {
        setIsLoading(true);
        try {
            const recommendationData = contentStorage.generateRecommendationPrompt();
            setUserPreferences(recommendationData.userPreferences);
            
            console.log('用户偏好分析:', recommendationData);
            
            const result = await apiService.generateRecommendedUsers(recommendationData, 4);
            
            if (result && result.users) {
                const users = result.users.map(user => ({
                    ...user,
                    id: contentStorage.generateUserIdFromName(user.name),
                    followers: Math.floor(Math.random() * 50000) + 1000,
                    following: Math.floor(Math.random() * 1000) + 50,
                    postsCount: Math.floor(Math.random() * 500) + 10,
                    joinDate: '2024年' + (Math.floor(Math.random() * 12) + 1) + '月',
                    location: ['北京', '上海', '杭州', '深圳', '成都', '广州'][Math.floor(Math.random() * 6)]
                }));
                
                setRecommendedUsers(users);
            }
        } catch (error) {
            console.error('生成推荐失败:', error);
        }
        setIsLoading(false);
    };

    const handleFollow = (user) => {
        // 先添加用户到数据库
        contentStorage.addUserFromPost({
            expertName: user.name,
            expertAvatar: user.avatar,
            expertise: user.expertise,
            verified: user.verified
        });
        
        // 关注用户
        contentStorage.followUser(user.id);
        
        // 从推荐列表中移除
        setRecommendedUsers(prev => prev.filter(u => u.id !== user.id));
    };

    const handleUserClick = (user) => {
        // 确保用户存在于数据库中
        if (!contentStorage.getUser(user.id)) {
            contentStorage.addUserFromPost({
                expertName: user.name,
                expertAvatar: user.avatar,
                expertise: user.expertise,
                verified: user.verified
            });
        }
        navigate(`/user/${user.id}`);
    };

    if (!recommendedUsers.length && !isLoading) {
        return null;
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            {/* 头部 */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                    <Sparkles className="text-purple-500" size={20} />
                    <h3 className="font-semibold text-gray-900">为你推荐</h3>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={generateRecommendations}
                        disabled={isLoading}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                        title="刷新推荐"
                    >
                        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="关闭"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* 偏好说明 */}
            {userPreferences && userPreferences.totalFollowing > 0 && (
                <div className="bg-blue-50 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-700">
                        <Users size={14} className="inline mr-1" />
                        基于你关注的 {userPreferences.totalFollowing} 位博主的特征推荐
                        {Object.keys(userPreferences.subjects).length > 0 && (
                            <span className="ml-2">
                                • 偏好领域：{Object.keys(userPreferences.subjects).slice(0, 3).join('、')}
                            </span>
                        )}
                    </p>
                </div>
            )}

            {/* 推荐列表 */}
            {isLoading ? (
                <div className="flex justify-center py-8">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-2"></div>
                        <p className="text-sm text-gray-600">正在分析你的偏好...</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {recommendedUsers.map((user) => (
                        <div key={user.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                            {/* 头像 */}
                            <div 
                                className="text-2xl cursor-pointer"
                                onClick={() => handleUserClick(user)}
                            >
                                {user.avatar}
                            </div>
                            
                            {/* 用户信息 */}
                            <div className="flex-1 min-w-0">
                                <div 
                                    className="flex items-center space-x-1 cursor-pointer"
                                    onClick={() => handleUserClick(user)}
                                >
                                    <h4 className="font-medium text-gray-900 hover:underline">
                                        {user.name}
                                    </h4>
                                    {user.verified && <span className="text-blue-500">✓</span>}
                                </div>
                                
                                <p className="text-sm text-gray-600 mb-1">{user.expertise}</p>
                                <p className="text-sm text-gray-700 leading-relaxed mb-2 line-clamp-2">
                                    {user.bio}
                                </p>
                                
                                {/* 标签 */}
                                <div className="flex flex-wrap gap-1 mb-2">
                                    {user.tags?.slice(0, 3).map(tag => (
                                        <span 
                                            key={tag}
                                            className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
                                        >
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                                
                                {/* 推荐理由 */}
                                {user.reason && (
                                    <p className="text-xs text-purple-600 italic">
                                        💡 {user.reason}
                                    </p>
                                )}
                                
                                {/* 统计信息 */}
                                <div className="flex items-center space-x-3 text-xs text-gray-500 mt-2">
                                    <span>{user.followers?.toLocaleString()} 关注者</span>
                                    <span>{user.postsCount} 推文</span>
                                </div>
                            </div>
                            
                            {/* 关注按钮 */}
                            <button
                                onClick={() => handleFollow(user)}
                                className="flex items-center space-x-1 bg-purple-500 text-white px-3 py-1.5 rounded-full text-sm hover:bg-purple-600 transition-colors whitespace-nowrap"
                            >
                                <UserPlus size={14} />
                                <span>关注</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* 空状态 */}
            {!isLoading && recommendedUsers.length === 0 && (
                <div className="text-center py-6">
                    <Users className="text-gray-300 mx-auto mb-2" size={32} />
                    <p className="text-gray-500 text-sm">暂无推荐，稍后再试</p>
                </div>
            )}
        </div>
    );
};

export default RecommendedUsers;