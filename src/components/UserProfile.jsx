import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, UserCheck, MoreHorizontal, MapPin, Calendar, Link2, Verified, BookOpen, Clock, Tag, ChevronRight, Heart, MessageCircle, Bookmark } from 'lucide-react';
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
            {/* 顶部导航栏 - 现代化设计 */}
            <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 rounded-xl hover:bg-gray-100 transition-all duration-200"
                            >
                                <ArrowLeft size={20} className="text-gray-600" />
                            </button>
                            <div className="flex items-center space-x-3">
                                <h1 className="font-bold text-xl text-gray-900">{userData.name}</h1>
                                {userData.verified && (
                                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                        <Verified className="text-white" size={14} />
                                    </div>
                                )}
                            </div>
                        </div>
                        <button className="p-2 rounded-xl hover:bg-gray-100 transition-all duration-200">
                            <MoreHorizontal size={20} className="text-gray-600" />
                        </button>
                    </div>
                </div>
            </div>

            {/* 用户信息区 - 现代化卡片设计 */}
            <div className="max-w-4xl mx-auto px-6 py-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* 背景装饰 */}
                    <div className="h-32 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-100/30 to-purple-100/30"></div>
                    </div>
                    
                    <div className="px-8 py-6 -mt-16 relative">
                        {/* 头像和基本信息 */}
                        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between mb-6">
                            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                                {/* 头像 */}
                                <div className="relative">
                                    <img
                                        src={userData.avatar}
                                        alt={userData.name}
                                        className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-xl bg-gradient-to-r from-blue-100 to-purple-100"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'flex';
                                        }}
                                    />
                                    <div className="w-32 h-32 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 flex items-center justify-center text-6xl border-4 border-white shadow-xl" style={{display: 'none'}}>
                                        😊
                                    </div>
                                    {userData.verified && (
                                        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                                            <Verified className="text-white" size={20} />
                                        </div>
                                    )}
                                </div>
                                
                                {/* 基本信息 */}
                                <div className="flex-1 text-center sm:text-left">
                                    <h2 className="text-3xl font-bold text-gray-900 mb-2">{userData.name}</h2>
                                    <p className="text-lg text-gray-600 mb-4">{userData.expertise}</p>
                                    
                                    {/* 统计数据 - 横向显示 */}
                                    <div className="flex justify-center sm:justify-start space-x-8 mb-4">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-gray-900">{userData.followers.toLocaleString()}</div>
                                            <div className="text-sm text-gray-500">关注者</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-gray-900">{userData.following}</div>
                                            <div className="text-sm text-gray-500">关注中</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-gray-900">{userData.posts}</div>
                                            <div className="text-sm text-gray-500">推文</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* 关注按钮 */}
                            <button
                                onClick={handleFollow}
                                className={`mt-4 sm:mt-0 px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg ${
                                    isFollowing
                                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600'
                                }`}
                            >
                                {isFollowing ? (
                                    <div className="flex items-center space-x-2">
                                        <UserCheck size={20} />
                                        <span>已关注</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center space-x-2">
                                        <UserPlus size={20} />
                                        <span>关注</span>
                                    </div>
                                )}
                            </button>
                        </div>

                        {/* 个人简介 */}
                        <div className="mb-6">
                            <p className="text-gray-800 text-lg leading-relaxed">{userData.bio}</p>
                        </div>

                        {/* 标签 */}
                        <div className="flex flex-wrap gap-2 mb-6">
                            {userData.tags.map(tag => (
                                <span
                                    key={tag}
                                    className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium border border-blue-100 hover:bg-blue-100 transition-colors cursor-pointer"
                                >
                                    #{tag}
                                </span>
                            ))}
                        </div>

                        {/* 附加信息 */}
                        <div className="flex flex-wrap gap-6 text-gray-600">
                            {userData.location && (
                                <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                        <MapPin size={16} />
                                    </div>
                                    <span>{userData.location}</span>
                                </div>
                            )}
                            <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                    <Calendar size={16} />
                                </div>
                                <span>加入于 {userData.joinDate}</span>
                            </div>
                            {userData.website && (
                                <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                        <Link2 size={16} />
                                    </div>
                                    <a href={`https://${userData.website}`} className="text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                                        {userData.website}
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 标签页 - 现代化设计 */}
            <div className="max-w-4xl mx-auto px-6 mb-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="flex">
                        <button
                            onClick={() => setActiveTab('posts')}
                            className={`flex-1 py-4 px-6 font-semibold transition-all duration-200 ${
                                activeTab === 'posts'
                                    ? 'bg-blue-500 text-white'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                        >
                            推文
                        </button>
                        <button
                            onClick={() => setActiveTab('blogs')}
                            className={`flex-1 py-4 px-6 font-semibold transition-all duration-200 ${
                                activeTab === 'blogs'
                                    ? 'bg-blue-500 text-white'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                        >
                            长文
                        </button>
                        <button
                            onClick={() => setActiveTab('achievements')}
                            className={`flex-1 py-4 px-6 font-semibold transition-all duration-200 ${
                                activeTab === 'achievements'
                                    ? 'bg-blue-500 text-white'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                        >
                            成就
                        </button>
                    </div>
                </div>
            </div>

            {/* 内容区 - 现代化布局 */}
            <div className="max-w-4xl mx-auto px-6">
                {activeTab === 'posts' && (
                    <div className="space-y-6">
                        {userPosts.map(post => (
                            <article key={post.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 overflow-hidden">
                                {/* 帖子头部 */}
                                <div className="p-6 pb-4">
                                    <div className="flex items-center space-x-4 mb-4">
                                        <img
                                            src={userData.avatar}
                                            alt={userData.name}
                                            className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm bg-gradient-to-r from-blue-100 to-purple-100"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                            }}
                                        />
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 flex items-center justify-center text-xl border-2 border-white shadow-sm" style={{display: 'none'}}>
                                            😊
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900">{userData.name}</h3>
                                            <p className="text-sm text-gray-500">{userData.expertise}</p>
                                        </div>
                                        <span className="text-sm text-gray-400">{post.timestamp}</span>
                                    </div>
                                    
                                    {/* 帖子内容 */}
                                    <p className="text-gray-800 text-lg leading-relaxed mb-4">{post.content}</p>
                                    
                                    {/* 帖子图片 */}
                                    {post.image && (
                                        <div className="rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 p-8 text-center mb-4">
                                            <div className="text-6xl opacity-80">{post.image}</div>
                                        </div>
                                    )}
                                </div>
                                
                                {/* 互动区域 */}
                                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-6">
                                            <div className="flex items-center space-x-2 text-gray-500">
                                                <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                                                    <span className="text-red-500">❤️</span>
                                                </div>
                                                <span className="font-medium">{post.likes}</span>
                                            </div>
                                            <div className="flex items-center space-x-2 text-gray-500">
                                                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                                                    <span className="text-blue-500">💬</span>
                                                </div>
                                                <span className="font-medium">{post.comments}</span>
                                            </div>
                                            <div className="flex items-center space-x-2 text-gray-500">
                                                <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
                                                    <span className="text-green-500">🔄</span>
                                                </div>
                                                <span className="font-medium">{post.shares}</span>
                                            </div>
                                        </div>
                                        
                                        {/* 话题标签 */}
                                        {post.topic && (
                                            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-100">
                                                #{post.topic}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </article>
                        ))}
                        <div className="text-center py-8">
                            <button 
                                onClick={loadMorePosts}
                                disabled={isGenerating}
                                className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isGenerating ? (
                                    <div className="flex items-center space-x-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-200 border-t-blue-600"></div>
                                        <span>生成中...</span>
                                    </div>
                                ) : (
                                    '加载更多推文'
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'blogs' && (
                    <div className="bg-white">
                        {blogPosts.length > 0 ? (
                            <div className="divide-y divide-gray-100">
                                {blogPosts.map((post, index) => (
                                    <article
                                        key={post.id}
                                        onClick={() => navigate(`/user/${userId}/blog/${post.id}`)}
                                        className="p-8 hover:bg-gray-50 transition-colors duration-200 cursor-pointer group"
                                    >
                                        <div className="flex gap-8">
                                            {/* 左侧：主要内容 */}
                                            <div className="flex-1 min-w-0">
                                                {/* 作者信息和分类 */}
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <img
                                                            src={userData.avatar}
                                                            alt={userData.name}
                                                            className="w-6 h-6 rounded-full object-cover bg-gray-100"
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                                e.target.nextSibling.style.display = 'flex';
                                                            }}
                                                        />
                                                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm" style={{display: 'none'}}>
                                                            😊
                                                        </div>
                                                        <span className="text-sm text-gray-600 font-medium">{userData.name}</span>
                                                    </div>
                                                    <span className="text-gray-300">•</span>
                                                    <span className="text-sm text-gray-500">{post.category}</span>
                                                </div>
                                                
                                                {/* 文章标题 - 大号粗体黑字 */}
                                                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-gray-700 transition-colors leading-tight">
                                                    {post.title}
                                                </h3>
                                                
                                                {/* 文章摘要 - 小一号灰色字体 */}
                                                <p className="text-gray-600 mb-4 leading-relaxed line-clamp-2">
                                                    {post.preview}
                                                </p>
                                                
                                                {/* 交互区 - 小图标 + 数字 */}
                                                <div className="flex items-center gap-6 text-sm text-gray-500">
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="w-4 h-4" />
                                                        <span>{post.readTime}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Heart className="w-4 h-4" />
                                                        <span>{Math.floor(Math.random() * 500) + 50}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <MessageCircle className="w-4 h-4" />
                                                        <span>{Math.floor(Math.random() * 50) + 5}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Bookmark className="w-4 h-4" />
                                                        <span>{Math.floor(Math.random() * 100) + 10}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* 右侧：缩略图作为视觉锚点 */}
                                            <div className="w-32 h-24 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center group-hover:from-blue-50 group-hover:to-purple-50 transition-colors duration-200">
                                                {post.tags && post.tags[0] && (
                                                    <div className="text-center">
                                                        <div className="text-2xl opacity-60 mb-1">
                                                            {post.tags[0] === '调香知识' ? '🌸' : 
                                                             post.tags[0] === '古籍修复' ? '📜' : 
                                                             post.tags[0] === '生活技巧' ? '💡' : 
                                                             post.tags[0] === '职场' ? '💼' : 
                                                             post.tags[0] === '技术' ? '💻' : '📖'}
                                                        </div>
                                                        <div className="text-xs text-gray-500 px-2 py-1 bg-white/50 rounded">
                                                            {post.tags[0]}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <BookOpen className="w-8 h-8 text-gray-400" />
                                </div>
                                <p className="text-gray-600 text-lg mb-2">暂无长文</p>
                                <p className="text-gray-400">作者还未发布任何长文内容</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'achievements' && (
                    <div className="space-y-4">
                        {userData.achievements && userData.achievements.length > 0 ? (
                            userData.achievements.map((achievement, index) => (
                                <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300">
                                    <div className="flex items-start space-x-4">
                                        <div className="w-12 h-12 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-full flex items-center justify-center">
                                            <span className="text-2xl">🏆</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-gray-800 text-lg leading-relaxed">{achievement}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-16">
                                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-4xl text-gray-400">🏆</span>
                                </div>
                                <p className="text-gray-500 text-lg mb-2">暂无成就</p>
                                <p className="text-gray-400 text-sm">作者的精彩成就正在路上</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserProfile;