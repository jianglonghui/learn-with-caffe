import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, UserCheck, MoreHorizontal, MapPin, Calendar, Link2, Verified, BookOpen, Clock, Tag, ChevronRight } from 'lucide-react';
import APIService from '../services/APIService';
import contentStorage from '../services/ContentStorage';

const UserProfile = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [userPosts, setUserPosts] = useState([]);
    const [blogPosts, setBlogPosts] = useState([]);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('posts');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isBlogGenerating, setIsBlogGenerating] = useState(false);
    const [hasInitialized, setHasInitialized] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const apiService = APIService.getInstance();
    
    // 使用 useRef 创建绝对的单次执行锁，不受 React Strict Mode 影响
    const initializationLockRef = useRef({});
    const blogGenerationLockRef = useRef({});
    const postGenerationLockRef = useRef({});

    // 从持久化存储获取用户数据

    // 生成用户的博客文章
    const generateUserBlogPosts = useCallback(async (user) => {
        const lockKey = `${user.id}-blog`;
        
        // 使用 useRef 锁防止重复生成
        if (blogGenerationLockRef.current[lockKey]) {
            console.log(`🛡️ useRef锁定阻止: ${user.name} 博客重复生成`);
            return [];
        }
        
        // 立即设置锁
        blogGenerationLockRef.current[lockKey] = true;
        
        if (isBlogGenerating) {
            console.log(`⚠️ 博客文章正在生成中，跳过重复请求 - ${user.name}`);
            // 清除锁，因为这次没有真正开始生成
            delete blogGenerationLockRef.current[lockKey];
            return [];
        }
        
        console.log(`🚀 开始为用户 ${user.name} 生成博客文章...`);
        setIsBlogGenerating(true);
        
        const prompts = {
            'xiaoyu': '调香师分享调香知识、香水文化、客户故事、行业见解',
            'laochen': '古籍修复师分享修复技艺、文物故事、传统工艺、文化传承',
            'linainai': '退休教师分享科学小实验、生活妙招、教育经验、育儿心得'
        };
        
        try {
            const result = await apiService.generateUserBlogPosts(
                user.name, 
                user.expertise, 
                prompts[user.id] || user.expertise, 
                5
            );
            
            if (result && result.blogPosts) {
                const newBlogPosts = result.blogPosts.map(post => ({
                    ...post,
                    id: `${user.id}-blog-${Date.now()}-${Math.random()}`,
                    author: user.name,
                    date: new Date().toLocaleDateString('zh-CN')
                }));
                
                // 保存到持久化存储
                contentStorage.saveUserBlogPosts(user.id, newBlogPosts, false);
                
                setIsBlogGenerating(false);
                // 清除锁
                delete blogGenerationLockRef.current[lockKey];
                return newBlogPosts;
            }
        } catch (error) {
            console.error('生成用户博客文章失败:', error);
        }
        
        setIsBlogGenerating(false);
        // 清除锁
        delete blogGenerationLockRef.current[lockKey];
        return [];
    }, [isBlogGenerating, apiService]);

    // 生成用户的推文
    const generateUserPosts = useCallback(async (user) => {
        const lockKey = `${user.id}-posts`;
        
        // 使用 useRef 锁防止重复生成
        if (postGenerationLockRef.current[lockKey]) {
            console.log(`🛡️ useRef锁定阻止: ${user.name} 推文重复生成`);
            return [];
        }
        
        // 立即设置锁
        postGenerationLockRef.current[lockKey] = true;
        
        if (isGenerating) {
            console.log(`⚠️ 推文正在生成中，跳过重复请求 - ${user.name}`);
            // 清除锁，因为这次没有真正开始生成
            delete postGenerationLockRef.current[lockKey];
            return [];
        }
        
        console.log(`🚀 开始为用户 ${user.name} 生成推文...`);
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
                // 清除锁
                delete postGenerationLockRef.current[lockKey];
                return newPosts;
            }
        } catch (error) {
            console.error('生成用户推文失败:', error);
        }
        
        setIsGenerating(false);
        // 清除锁
        delete postGenerationLockRef.current[lockKey];
        return [];
    }, [isGenerating, apiService]);

    // 当userId变化时重置初始化状态
    useEffect(() => {
        setHasInitialized(false);
        setIsInitializing(false);
        // 清除该用户的所有锁
        delete initializationLockRef.current[userId];
        delete blogGenerationLockRef.current[`${userId}-blog`];
        delete postGenerationLockRef.current[`${userId}-posts`];
        console.log(`🔄 重置用户 ${userId} 的初始化状态和所有锁`);
    }, [userId]);

    useEffect(() => {
        const loadUserData = async () => {
            // 使用 ref 作为绝对锁，防止 React Strict Mode 双重执行
            if (initializationLockRef.current[userId]) {
                console.log(`🛡️ useRef锁定阻止: ${userId} 重复初始化`);
                return;
            }
            
            // 立即设置锁，防止任何可能的竞态条件
            initializationLockRef.current[userId] = true;
            
            // 额外的状态检查
            if (hasInitialized || isInitializing) {
                console.log(`⚠️ 状态检查跳过: ${userId} (已初始化: ${hasInitialized}, 正在初始化: ${isInitializing})`);
                return;
            }
            
            setIsInitializing(true);
            setIsLoading(true);
            console.log(`🚀 开始加载用户数据: ${userId}`);
            
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
                    console.log('本地没有推文，开始生成...');
                    posts = await generateUserPosts(user);
                }
                
                setUserPosts(posts);
                
                // 获取用户博客文章
                let blogs = contentStorage.getUserBlogPosts(userId);
                
                // 检查是否需要重新生成更有个性的文章（临时机制）
                const needRegenerate = blogs.length > 0 && blogs[0].title && 
                    !blogs[0].title.includes('：') && 
                    !blogs[0].preview.includes('我');
                
                // 如果没有博客文章或需要重新生成，生成一些
                if (blogs.length === 0 || needRegenerate) {
                    console.log(needRegenerate ? '重新生成更有个性的文章...' : '本地没有博客文章，开始生成...');
                    blogs = await generateUserBlogPosts(user);
                }
                
                setBlogPosts(blogs);
                
                setHasInitialized(true);
                setIsInitializing(false);
            }
            
            setIsLoading(false);
            setIsInitializing(false);
            console.log(`✅ 用户数据加载完成: ${userId}`);
        };
        
        loadUserData();
    }, [userId, hasInitialized, isInitializing]);

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
                            onClick={() => setActiveTab('blogs')}
                            className={`py-3 border-b-2 font-medium transition-colors ${
                                activeTab === 'blogs'
                                    ? 'border-blue-500 text-blue-500'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            长文
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

                {activeTab === 'blogs' && (
                    <div className="space-y-4">
                        {blogPosts.length > 0 ? (
                            blogPosts.map((post) => (
                                <article
                                    key={post.id}
                                    onClick={() => navigate(`/user/${userId}/blog/${post.id}`)}
                                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
                                >
                                    <div className="mb-2">
                                        <span className="inline-block px-2 py-1 text-xs font-semibold text-blue-600 bg-blue-100 rounded">
                                            {post.category}
                                        </span>
                                    </div>
                                    
                                    <h3 className="text-lg font-bold text-gray-800 mb-2 hover:text-blue-600 transition-colors">
                                        {post.title}
                                    </h3>
                                    
                                    <p className="text-gray-600 mb-3 line-clamp-2">
                                        {post.preview}
                                    </p>
                                    
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 text-sm text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                <span>{post.readTime}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Tag className="w-3 h-3" />
                                                <span>{post.tags[0]}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center text-blue-600">
                                            <span className="text-sm">阅读全文</span>
                                            <ChevronRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </article>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p>暂无长文</p>
                            </div>
                        )}
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