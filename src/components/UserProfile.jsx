import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, UserCheck, MoreHorizontal, MapPin, Calendar, Link2, Verified } from 'lucide-react';
import APIService from '../services/APIService';
import contentStorage from '../services/ContentStorage';

const UserProfile = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [userPosts, setUserPosts] = useState([]);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('posts');
    const [isGenerating, setIsGenerating] = useState(false);
    const apiService = APIService.getInstance();

    // 从持久化存储获取用户数据

    // 生成用户的推文
    const generateUserPosts = async (user) => {
        if (isGenerating) return [];
        
        setIsGenerating(true);
        
        const prompts = {
            'xiaoyu': '调香师分享调香经验、香水知识、客户故事',
            'laochen': '古籍修复师分享修复技艺、文物故事、传统工艺',
            'linainai': '退休教师分享生活妙招、科学小知识、育儿经验'
        };
        
        try {
            const result = await apiService.generateUserPosts(user.name, user.expertise, prompts[user.id] || user.expertise, 5);
            if (result && result.posts) {
                const newPosts = result.posts.map(post => ({
                    ...post,
                    id: `${user.id}-${Date.now()}-${Math.random()}`,
                    expertName: user.name,
                    expertAvatar: user.avatar,
                    expertise: user.expertise,
                    verified: user.verified,
                    likes: Math.floor(Math.random() * 2000) + 100,
                    comments: Math.floor(Math.random() * 200) + 10,
                    shares: Math.floor(Math.random() * 100) + 5,
                    bookmarks: Math.floor(Math.random() * 500) + 20
                }));
                
                // 保存到持久化存储
                contentStorage.saveUserPosts(user.id, newPosts, true);
                
                setIsGenerating(false);
                return newPosts;
            }
        } catch (error) {
            console.error('生成用户推文失败:', error);
        }
        
        setIsGenerating(false);
        return [];
    };

    useEffect(() => {
        const loadUserData = async () => {
            setIsLoading(true);
            
            // 从存储获取用户数据
            const user = contentStorage.getUser(userId);
            if (user) {
                setUserData(user);
                
                // 检查是否已关注
                setIsFollowing(contentStorage.isFollowing(userId));
                
                // 获取用户推文
                let posts = contentStorage.getUserPosts(userId, 10);
                
                // 如果没有推文，生成一些
                if (posts.length === 0) {
                    posts = await generateUserPosts(user);
                }
                
                setUserPosts(posts);
            }
            
            setIsLoading(false);
        };
        
        loadUserData();
    }, [userId]);

    const handleFollow = () => {
        if (isFollowing) {
            contentStorage.unfollowUser(userId);
        } else {
            contentStorage.followUser(userId);
        }
        
        // 更新本地状态
        setIsFollowing(!isFollowing);
        const updatedUser = contentStorage.getUser(userId);
        setUserData(updatedUser);
    };

    // 加载更多推文
    const loadMorePosts = async () => {
        if (userData && !isGenerating) {
            const newPosts = await generateUserPosts(userData);
            setUserPosts(prev => [...prev, ...newPosts]);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!userData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600 mb-4">用户不存在</p>
                    <button
                        onClick={() => navigate('/')}
                        className="text-blue-500 hover:text-blue-600"
                    >
                        返回首页
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* 顶部导航栏 */}
            <div className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 rounded-full hover:bg-gray-100"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="font-semibold text-lg">{userData.name}</h1>
                        {userData.verified && <Verified className="text-blue-500" size={18} />}
                    </div>
                    <button className="p-2 rounded-full hover:bg-gray-100">
                        <MoreHorizontal size={20} />
                    </button>
                </div>
            </div>

            {/* 用户信息区 */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-2xl mx-auto px-4 py-6">
                    {/* 头像和基本信息 */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start space-x-4">
                            <div className="text-6xl">{userData.avatar}</div>
                            <div className="flex-1">
                                <h2 className="text-xl font-bold flex items-center space-x-2">
                                    <span>{userData.name}</span>
                                    {userData.verified && <Verified className="text-blue-500" size={20} />}
                                </h2>
                                <p className="text-gray-600">{userData.expertise}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleFollow}
                            className={`px-4 py-2 rounded-full font-medium transition-colors ${
                                isFollowing
                                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                        >
                            {isFollowing ? (
                                <>
                                    <UserCheck size={18} className="inline mr-1" />
                                    已关注
                                </>
                            ) : (
                                <>
                                    <UserPlus size={18} className="inline mr-1" />
                                    关注
                                </>
                            )}
                        </button>
                    </div>

                    {/* 个人简介 */}
                    <p className="text-gray-800 mb-4 leading-relaxed">{userData.bio}</p>

                    {/* 标签 */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        {userData.tags.map(tag => (
                            <span
                                key={tag}
                                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                            >
                                #{tag}
                            </span>
                        ))}
                    </div>

                    {/* 附加信息 */}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                        {userData.location && (
                            <div className="flex items-center space-x-1">
                                <MapPin size={14} />
                                <span>{userData.location}</span>
                            </div>
                        )}
                        <div className="flex items-center space-x-1">
                            <Calendar size={14} />
                            <span>加入于 {userData.joinDate}</span>
                        </div>
                        {userData.website && (
                            <div className="flex items-center space-x-1">
                                <Link2 size={14} />
                                <a href={`https://${userData.website}`} className="text-blue-500 hover:underline">
                                    {userData.website}
                                </a>
                            </div>
                        )}
                    </div>

                    {/* 统计数据 */}
                    <div className="flex space-x-6 text-sm">
                        <div>
                            <span className="font-bold text-gray-900">{userData.followers.toLocaleString()}</span>
                            <span className="text-gray-600 ml-1">关注者</span>
                        </div>
                        <div>
                            <span className="font-bold text-gray-900">{userData.following}</span>
                            <span className="text-gray-600 ml-1">关注中</span>
                        </div>
                        <div>
                            <span className="font-bold text-gray-900">{userData.posts}</span>
                            <span className="text-gray-600 ml-1">推文</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 标签页 */}
            <div className="bg-white border-b border-gray-200 sticky top-14 z-10">
                <div className="max-w-2xl mx-auto px-4">
                    <div className="flex space-x-8">
                        <button
                            onClick={() => setActiveTab('posts')}
                            className={`py-3 border-b-2 font-medium transition-colors ${
                                activeTab === 'posts'
                                    ? 'border-blue-500 text-blue-500'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            推文
                        </button>
                        <button
                            onClick={() => setActiveTab('achievements')}
                            className={`py-3 border-b-2 font-medium transition-colors ${
                                activeTab === 'achievements'
                                    ? 'border-blue-500 text-blue-500'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            成就
                        </button>
                    </div>
                </div>
            </div>

            {/* 内容区 */}
            <div className="max-w-2xl mx-auto px-4 py-6">
                {activeTab === 'posts' && (
                    <div className="space-y-4">
                        {userPosts.map(post => (
                            <div key={post.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                <p className="text-gray-800 mb-3">{post.content}</p>
                                {post.image && (
                                    <div className="text-center text-4xl mb-3">{post.image}</div>
                                )}
                                <div className="flex items-center justify-between text-sm text-gray-600">
                                    <span>{post.timestamp}</span>
                                    <div className="flex space-x-4">
                                        <span>❤️ {post.likes}</span>
                                        <span>💬 {post.comments}</span>
                                        <span>🔄 {post.shares}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div className="text-center py-4">
                            <button 
                                onClick={loadMorePosts}
                                disabled={isGenerating}
                                className="text-blue-500 hover:text-blue-600 disabled:text-gray-400"
                            >
                                {isGenerating ? '生成中...' : '加载更多推文'}
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'achievements' && (
                    <div className="space-y-3">
                        {userData.achievements.map((achievement, index) => (
                            <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                                <p className="text-gray-800">{achievement}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserProfile;