import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, UserCheck, MoreHorizontal, MapPin, Calendar, Link2, Verified, BookOpen, Clock, Tag, ChevronRight, Heart, MessageCircle, Bookmark, Bell, RefreshCw } from 'lucide-react';
import APIService from '../services/APIService';
import contentStorage from '../services/ContentStorage';
import { bloggerManager } from '../data/virtualBloggers';
import { dynamicFeedPostsManager } from '../data/dynamicFeedPosts';
import { dynamicBlogPostsManager } from '../data/dynamicBlogPosts';
import { useVirtualBloggers } from '../hooks/useVirtualBloggers';

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
    const [isVirtualBlogger, setIsVirtualBlogger] = useState(false);
    const [bloggerData, setBloggerData] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    
    const apiService = APIService.getInstance();
    const { isInitialized } = useVirtualBloggers();
    
    // 使用 useRef 创建绝对的单次执行锁，不受 React Strict Mode 影响
    const initializationLockRef = useRef({});
    const blogGenerationLockRef = useRef({});
    const postGenerationLockRef = useRef({});

    // 检查是否为虚拟博主
    const checkIfVirtualBlogger = useCallback(() => {
        if (!isInitialized) return false;
        
        // 根据userId查找对应的虚拟博主
        const blogger = bloggerManager.getAllBloggers().find(b => {
            // 尝试匹配用户ID或生成用户ID
            const generatedUserId = contentStorage.generateUserIdFromName(b.name);
            return b.id === userId || generatedUserId === userId;
        });
        
        if (blogger) {
            console.log(`🤖 发现虚拟博主: ${blogger.name}`);
            setBloggerData(blogger);
            setIsVirtualBlogger(true);
            return true;
        }
        
        setIsVirtualBlogger(false);
        setBloggerData(null);
        return false;
    }, [userId, isInitialized]);

    // 辅助函数：为推文选择emoji
    const getEmojiForPost = (shortPost) => {
        const moodEmojis = {
            'excited': '🚀', 'happy': '😊', 'thoughtful': '🤔',
            'focused': '🔍', 'creative': '💡', 'accomplished': '🎉',
            'curious': '🧐', 'inspired': '✨'
        };
        return moodEmojis[shortPost.mood] || '📝';
    };

    // 辅助函数：格式化时间戳  
    const formatTimestamp = (timestamp) => {
        const now = new Date();
        const postTime = new Date(timestamp);
        const diffMs = now - postTime;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return '刚刚';
        if (diffMins < 60) return `${diffMins}分钟前`;
        if (diffHours < 24) return `${diffHours}小时前`;
        if (diffDays < 7) return `${diffDays}天前`;
        
        return postTime.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    };

    // 从虚拟博主获取推文
    const getVirtualBloggerPosts = useCallback((blogger) => {
        console.log(`📱 获取虚拟博主推文: ${blogger.name}，内容历史: ${blogger.contentHistory.length} 条`);
        
        // 直接从博主的contentHistory获取推文数据
        const posts = blogger.contentHistory
            .filter(content => content.shortPost && content.shortPost.content)
            .map(content => ({
                id: `${blogger.id}-post-${content.createdAt}`,
                expertName: blogger.name,
                expertAvatar: blogger.avatar || '/default-avatar.png',
                expertise: blogger.expertise,
                verified: blogger.verified,
                content: content.shortPost.content,
                image: getEmojiForPost(content.shortPost),
                timestamp: formatTimestamp(content.createdAt),
                topic: content.sectionInfo?.title || '学习心得',
                type: 'knowledge',
                mood: content.shortPost.mood || 'neutral',
                likes: Math.floor(Math.random() * 2000) + 100,
                comments: Math.floor(Math.random() * 200) + 10,
                shares: Math.floor(Math.random() * 100) + 5,
                bookmarks: Math.floor(Math.random() * 500) + 20,
                progress: content.progress,
                sectionInfo: content.sectionInfo,
                passed: content.passed
            }))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10);
            
        console.log(`✅ 处理后的推文数量: ${posts.length}`);
        return posts;
    }, []);

    // 从虚拟博主获取博客文章
    const getVirtualBloggerArticles = useCallback((blogger) => {
        console.log(`📚 获取虚拟博主文章: ${blogger.name}，内容历史: ${blogger.contentHistory.length} 条`);
        
        // 直接从博主的contentHistory获取文章数据
        const articles = blogger.contentHistory
            .filter(content => content.longArticle && content.longArticle.title)
            .map(content => ({
                id: `${blogger.id}-article-${content.createdAt}`,
                title: content.longArticle.title,
                preview: content.longArticle.summary || content.longArticle.content?.substring(0, 150) + '...',
                content: content.longArticle.content,
                category: content.longArticle.category || '学习心得',
                readTime: content.longArticle.readTime || '5分钟',
                tags: content.longArticle.tags || ['学习', content.sectionInfo?.title].filter(Boolean),
                author: blogger.name,
                date: formatTimestamp(content.createdAt),
                progress: content.progress,
                sectionInfo: content.sectionInfo,
                passed: content.passed
            }))
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10);
            
        console.log(`✅ 处理后的文章数量: ${articles.length}`);
        return articles;
    }, []);

    // 生成用户的博客文章
    const generateUserBlogPosts = useCallback(async (user) => {
        // 如果是虚拟博主，直接从虚拟博主系统获取内容
        if (isVirtualBlogger && bloggerData) {
            console.log(`🤖 从虚拟博主系统获取博客文章: ${bloggerData.name}`);
            return getVirtualBloggerArticles(bloggerData);
        }
        
        // 非虚拟博主情况下，不再生成新内容，直接返回空数组
        console.log(`⚠️ 非虚拟博主用户 ${user.name}，跳过博客文章生成`);
        return [];
    }, [isVirtualBlogger, bloggerData, getVirtualBloggerArticles]);

    // 生成用户的推文
    const generateUserPosts = useCallback(async (user) => {
        // 如果是虚拟博主，直接从虚拟博主系统获取推文
        if (isVirtualBlogger && bloggerData) {
            console.log(`🤖 从虚拟博主系统获取推文: ${bloggerData.name}`);
            return getVirtualBloggerPosts(bloggerData);
        }
        
        // 非虚拟博主情况下，不再生成新内容，直接返回空数组
        console.log(`⚠️ 非虚拟博主用户 ${user.name}，跳过推文生成`);
        return [];
    }, [isVirtualBlogger, bloggerData, getVirtualBloggerPosts]);

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
            
            // 内部函数定义 - 检查是否为虚拟博主
            const checkVBlogger = () => {
                console.log(`🔍 检查虚拟博主: ${userId}, 系统初始化状态: ${isInitialized}`);
                
                if (!isInitialized) {
                    console.log(`⏳ 虚拟博主系统尚未初始化，跳过检查`);
                    return { isVirtual: false, blogger: null };
                }
                
                // 根据userId查找对应的虚拟博主
                const allBloggers = bloggerManager.getAllBloggers();
                console.log(`🔍 搜索 ${allBloggers.length} 个博主中的匹配项`);
                
                const blogger = allBloggers.find(b => {
                    // 尝试匹配用户ID或生成用户ID
                    const generatedUserId = contentStorage.generateUserIdFromName(b.name);
                    console.log(`🔍 检查博主 ${b.name} (ID: ${b.id}, 生成ID: ${generatedUserId}) vs 目标 ${userId}`);
                    return b.id === userId || generatedUserId === userId;
                });
                
                if (blogger) {
                    console.log(`🤖 发现虚拟博主: ${blogger.name} (ID: ${blogger.id})`);
                    setBloggerData(blogger);
                    setIsVirtualBlogger(true);
                    return { isVirtual: true, blogger };
                }
                
                console.log(`❌ 未找到匹配的虚拟博主: ${userId}`);
                setIsVirtualBlogger(false);
                setBloggerData(null);
                return { isVirtual: false, blogger: null };
            };
            
            // 检查是否为虚拟博主
            const { isVirtual, blogger } = checkVBlogger();
            
            // 从存储获取用户数据
            const user = contentStorage.getUser(userId);
            if (user) {
                setUserData(user);
                
                // 检查是否已关注
                setIsFollowing(contentStorage.isFollowing(userId));
                
                // 获取用户推文
                let posts = contentStorage.getUserPosts(userId, 10);
                
                // 如果是虚拟博主，直接从虚拟博主系统获取推文
                if (isVirtual && blogger) {
                    console.log('🤖 从虚拟博主系统获取推文');
                    const feedPosts = dynamicFeedPostsManager.getBloggerPosts(blogger.id, 10);
                    posts = feedPosts.map(post => ({
                        ...post,
                        expertAvatar: post.expertAvatar || blogger.avatar,
                        likes: post.likes || Math.floor(Math.random() * 2000) + 100,
                        comments: post.comments || Math.floor(Math.random() * 200) + 10,
                        shares: post.shares || Math.floor(Math.random() * 100) + 5,
                        bookmarks: post.bookmarks || Math.floor(Math.random() * 500) + 20
                    }));
                } else if (posts.length === 0) {
                    console.log('本地没有推文，开始生成...');
                    posts = await generateUserPosts(user);
                }
                
                setUserPosts(posts);
                
                // 获取用户博客文章
                let blogs = contentStorage.getUserBlogPosts(userId);
                
                // 如果是虚拟博主，从虚拟博主系统获取文章
                if (isVirtual && blogger) {
                    console.log('🤖 从虚拟博主系统获取博客文章');
                    blogs = dynamicBlogPostsManager.getBloggerPosts(blogger.id, 10);
                }
                
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
    }, [userId, hasInitialized, isInitializing, isInitialized]); // 移除函数依赖，避免重新渲染

    // 当虚拟博主系统初始化完成后，检查是否需要重新加载虚拟博主数据
    useEffect(() => {
        if (isInitialized && userId.startsWith('blogger_') && !bloggerData) {
            console.log(`🔄 虚拟博主系统已初始化，检查博主: ${userId}`);
            
            // 立即检查虚拟博主
            const allBloggers = bloggerManager.getAllBloggers();
            console.log(`🔍 搜索 ${allBloggers.length} 个博主中的匹配项`);
            
            const blogger = allBloggers.find(b => {
                const generatedUserId = contentStorage.generateUserIdFromName(b.name);
                console.log(`🔍 检查博主 ${b.name} (ID: ${b.id}, 生成ID: ${generatedUserId}) vs 目标 ${userId}`);
                return b.id === userId || generatedUserId === userId;
            });
            
            if (blogger) {
                console.log(`🎉 发现虚拟博主: ${blogger.name} (ID: ${blogger.id})`);
                setBloggerData(blogger);
                setIsVirtualBlogger(true);
                
                // 直接从虚拟博主的内容历史获取数据
                const contentHistory = blogger.contentHistory || [];
                console.log(`📚 博主内容历史: ${contentHistory.length} 条记录`);
                
                // 提取推文数据
                const feedPosts = contentHistory
                    .filter(content => content.shortPost && content.shortPost.content)
                    .map((content, index) => ({
                        id: `${blogger.id}-post-${content.createdAt}`,
                        content: content.shortPost.content,
                        expertName: blogger.name,
                        expertise: blogger.expertise,
                        verified: blogger.verified,
                        expertAvatar: blogger.avatar,
                        timestamp: formatTimestamp(content.createdAt),
                        topic: content.sectionInfo?.title || '学习心得',
                        likes: Math.floor(Math.random() * 2000) + 100,
                        comments: Math.floor(Math.random() * 200) + 10,
                        shares: Math.floor(Math.random() * 100) + 5,
                        bookmarks: Math.floor(Math.random() * 500) + 20,
                        mood: content.shortPost.mood || 'neutral'
                    }))
                    .slice(0, 10);
                
                // 提取长文数据
                const blogPosts = contentHistory
                    .filter(content => content.longArticle && content.longArticle.title)
                    .map((content, index) => ({
                        id: `${blogger.id}-blog-${content.createdAt}`,
                        title: content.longArticle.title,
                        preview: content.longArticle.content.substring(0, 200) + '...',
                        content: content.longArticle.content,
                        date: content.createdAt,
                        readTime: Math.ceil(content.longArticle.content.length / 200) + ' min read',
                        category: content.sectionInfo?.title || blogger.expertise,
                        tags: content.longArticle.tags || [blogger.expertise],
                        likes: Math.floor(Math.random() * 1000) + 50,
                        comments: Math.floor(Math.random() * 100) + 5,
                        views: Math.floor(Math.random() * 5000) + 200
                    }))
                    .slice(0, 10);
                
                console.log(`📱 为虚拟博主 ${blogger.name} 加载了 ${feedPosts.length} 条推文, ${blogPosts.length} 篇文章`);
                
                setUserPosts(feedPosts);
                setBlogPosts(blogPosts);
                
            } else {
                console.log(`❌ 未找到匹配的虚拟博主: ${userId}`);
            }
        }
    }, [isInitialized, userId, bloggerData]);

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

    // 处理追更请求（手动触发博主内容生成）
    const handleUpdateRequest = async () => {
        if (!isVirtualBlogger || !bloggerData || isUpdating) {
            return;
        }

        setIsUpdating(true);
        console.log(`🔔 用户手动触发博主更新: ${bloggerData.name}`);

        try {
            // 导入博主调度器
            const { bloggerScheduler } = await import('../services/BloggerScheduler');
            
            // 手动触发该博主的内容生成
            const result = await bloggerScheduler.scheduleBlogger(bloggerData.id);
            
            if (result.success) {
                console.log('✅ 博主内容更新成功');
                
                // 刷新页面数据
                setTimeout(() => {
                    // 重新获取博主推文
                    const updatedPosts = getVirtualBloggerPosts(bloggerData);
                    setUserPosts(updatedPosts);
                    
                    // 重新获取博主文章
                    const updatedArticles = getVirtualBloggerArticles(bloggerData);
                    setBlogPosts(updatedArticles);
                    
                    console.log('📱 页面数据已刷新');
                }, 1000);
            } else {
                console.error('博主内容更新失败:', result.error);
            }
        } catch (error) {
            console.error('追更请求处理失败:', error);
        } finally {
            setIsUpdating(false);
        }
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

    if (!userData && !bloggerData) {
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

    // 获取有效的用户数据 - 优先使用虚拟博主数据
    const effectiveUserData = isVirtualBlogger && bloggerData ? {
        name: bloggerData.name,
        avatar: bloggerData.avatar,
        expertise: bloggerData.expertise,
        verified: bloggerData.verified || true, // 虚拟博主默认认证
        bio: typeof bloggerData.script?.personality === 'string' 
            ? bloggerData.script.personality 
            : (bloggerData.script?.personality?.traits ? 
                `${bloggerData.script.personality.traits.join(', ')} - ${bloggerData.script.personality.communicationStyle || ''}` 
                : '这是一位虚拟博主，正在分享学习心得'),
        followers: Math.floor(Math.random() * 5000) + 1000, // 随机粉丝数
        following: Math.floor(Math.random() * 100) + 50,
        posts: userPosts.length,
        blogs: blogPosts.length,
        tags: ['AI学习', '虚拟博主', bloggerData.expertise], // 虚拟博主标签
        location: '虚拟世界',
        joinDate: bloggerData.createdAt ? new Date(bloggerData.createdAt).toLocaleDateString() : '最近',
        website: null,
        achievements: [] // 虚拟博主暂无成就系统
    } : userData;

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
                                <h1 className="font-bold text-xl text-gray-900">{effectiveUserData.name}</h1>
                                {effectiveUserData.verified && (
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
                                        src={effectiveUserData.avatar}
                                        alt={effectiveUserData.name}
                                        className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-xl bg-gradient-to-r from-blue-100 to-purple-100"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'flex';
                                        }}
                                    />
                                    <div className="w-32 h-32 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 flex items-center justify-center text-6xl border-4 border-white shadow-xl" style={{display: 'none'}}>
                                        😊
                                    </div>
                                    {effectiveUserData.verified && (
                                        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                                            <Verified className="text-white" size={20} />
                                        </div>
                                    )}
                                </div>
                                
                                {/* 基本信息 */}
                                <div className="flex-1 text-center sm:text-left">
                                    <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
                                        <h2 className="text-3xl font-bold text-gray-900">{effectiveUserData.name}</h2>
                                        {isVirtualBlogger && (
                                            <span className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-full border border-green-200">
                                                🤖 虚拟博主
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-lg text-gray-600 mb-2">{effectiveUserData.expertise}</p>
                                    {isVirtualBlogger && bloggerData && (
                                        <p className="text-sm text-blue-600 mb-4">
                                            学习进度: {bloggerData.currentProgress} | 
                                            目标: {bloggerData.script.learningGoal.substring(0, 50)}...
                                        </p>
                                    )}
                                    
                                    {/* 统计数据 - 横向显示 */}
                                    <div className="flex justify-center sm:justify-start space-x-8 mb-4">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-gray-900">{effectiveUserData.followers.toLocaleString()}</div>
                                            <div className="text-sm text-gray-500">关注者</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-gray-900">{effectiveUserData.following}</div>
                                            <div className="text-sm text-gray-500">关注中</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-gray-900">{effectiveUserData.posts}</div>
                                            <div className="text-sm text-gray-500">推文</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* 按钮组 */}
                            <div className="flex items-center space-x-3 mt-4 sm:mt-0">
                                {/* 关注按钮 */}
                                <button
                                    onClick={handleFollow}
                                    className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg ${
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

                                {/* 追更按钮 - 仅对虚拟博主显示 */}
                                {isVirtualBlogger && (
                                    <button
                                        onClick={handleUpdateRequest}
                                        disabled={isUpdating}
                                        className={`px-4 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg ${
                                            isUpdating
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                : 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600'
                                        }`}
                                        title="催更新内容"
                                    >
                                        <div className="flex items-center space-x-2">
                                            {isUpdating ? (
                                                <RefreshCw size={18} className="animate-spin" />
                                            ) : (
                                                <Bell size={18} />
                                            )}
                                            <span className="hidden sm:inline">
                                                {isUpdating ? '更新中' : '催更'}
                                            </span>
                                        </div>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 个人简介 */}
                        <div className="mb-6">
                            <p className="text-gray-800 text-lg leading-relaxed">{effectiveUserData.bio}</p>
                        </div>

                        {/* 标签 */}
                        <div className="flex flex-wrap gap-2 mb-6">
                            {effectiveUserData.tags || [].map(tag => (
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
                            {effectiveUserData.location && (
                                <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                        <MapPin size={16} />
                                    </div>
                                    <span>{effectiveUserData.location}</span>
                                </div>
                            )}
                            <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                    <Calendar size={16} />
                                </div>
                                <span>加入于 {effectiveUserData.joinDate}</span>
                            </div>
                            {effectiveUserData.website && (
                                <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                        <Link2 size={16} />
                                    </div>
                                    <a href={`https://${effectiveUserData.website}`} className="text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                                        {effectiveUserData.website}
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
                                            src={effectiveUserData.avatar}
                                            alt={effectiveUserData.name}
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
                                            <h3 className="font-semibold text-gray-900">{effectiveUserData.name}</h3>
                                            <p className="text-sm text-gray-500">{effectiveUserData.expertise}</p>
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
                                                            src={effectiveUserData.avatar}
                                                            alt={effectiveUserData.name}
                                                            className="w-6 h-6 rounded-full object-cover bg-gray-100"
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                                e.target.nextSibling.style.display = 'flex';
                                                            }}
                                                        />
                                                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm" style={{display: 'none'}}>
                                                            😊
                                                        </div>
                                                        <span className="text-sm text-gray-600 font-medium">{effectiveUserData.name}</span>
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
                        {effectiveUserData.achievements && effectiveUserData.achievements.length > 0 ? (
                            effectiveUserData.achievements.map((achievement, index) => (
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