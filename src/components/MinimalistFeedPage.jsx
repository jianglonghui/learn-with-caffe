import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, RefreshCw, Loader, Megaphone, ExternalLink, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import APIService from '../services/APIService';
import contentStorage from '../services/ContentStorage';
import RecommendedUsers from './RecommendedUsers';
import CheerLeaderboard from './CheerLeaderboard';
import { getRandomAvatar } from '../utils/avatarUtils';
import { dynamicFeedPostsManager } from '../data/dynamicFeedPosts';
import { useVirtualBloggers } from '../hooks/useVirtualBloggers';

const MinimalistFeedPage = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [showRecommendations, setShowRecommendations] = useState(false);
    
    const navigate = useNavigate();
    const apiService = APIService.getInstance();
    const scrollRef = useRef(null);
    
    // 使用虚拟博主系统hook
    const { isInitialized, isLoading: systemLoading } = useVirtualBloggers();

    const getInitialPosts = () => {        
        // 系统已初始化，优先使用动态Feed系统中的推文
        const dynamicPosts = dynamicFeedPostsManager.getAllPosts({ limit: 10 });
        console.log(`📱 动态Feed系统返回了 ${dynamicPosts.length} 条推文`);
        
        if (dynamicPosts.length > 0) {
            return dynamicPosts.map(post => ({
                ...post,
                expertAvatar: post.expertAvatar || getRandomAvatar(),
                likes: post.likes || Math.floor(Math.random() * 500) + 50,
                comments: post.comments || Math.floor(Math.random() * 100) + 5,
                shares: post.shares || Math.floor(Math.random() * 50) + 2,
                bookmarks: post.bookmarks || Math.floor(Math.random() * 200) + 10
            }));
        }
        
        // 兜底使用保存的推文
        const savedPosts = contentStorage.getPosts(10);
        if (savedPosts.length > 0) {
            console.log(`📦 使用保存的推文: ${savedPosts.length} 条`);
            return savedPosts;
        }
        
        // 最后返回空数组，等待虚拟博主系统生成内容
        console.log('📝 等待虚拟博主系统生成内容');
        return [];
    };

    const loadAIContent = async (append = false) => {
        try {
            setError(null);
            
            let newPosts = [];
            
            // 如果虚拟博主系统已初始化，优先从博主系统获取推文
            if (isInitialized) {
                console.log('🤖 虚拟博主系统已初始化，尝试获取博主推文...');
                const bloggerPosts = await dynamicFeedPostsManager.updatePostsFromBloggers();
                
                if (bloggerPosts.length > 0) {
                    // 使用博主生成的推文
                    newPosts = bloggerPosts.map(post => ({
                        ...post,
                        expertAvatar: post.expertAvatar || getRandomAvatar(),
                        likes: post.likes || Math.floor(Math.random() * 500) + 50,
                        comments: post.comments || Math.floor(Math.random() * 100) + 5,
                        shares: post.shares || Math.floor(Math.random() * 50) + 2,
                        bookmarks: post.bookmarks || Math.floor(Math.random() * 200) + 10
                    }));
                    
                    console.log(`🎯 成功获取 ${newPosts.length} 条博主推文`);
                } else {
                    console.log('📝 暂无新的博主推文，使用传统AI生成');
                }
            } else {
                console.log('⏳ 虚拟博主系统尚未初始化，跳过博主推文获取');
            }
            
            // 如果没有博主推文，但系统已初始化，尝试手动触发博主更新
            if (newPosts.length === 0 && isInitialized) {
                console.log('🎯 尝试手动触发博主更新以生成新推文...');
                try {
                    // 获取活跃博主并手动触发更新
                    const { bloggerScheduler } = await import('../services/BloggerScheduler');
                    await bloggerScheduler.scheduleAll();
                    
                    // 再次尝试获取博主推文
                    const retriedBloggerPosts = await dynamicFeedPostsManager.updatePostsFromBloggers();
                    if (retriedBloggerPosts.length > 0) {
                        newPosts = retriedBloggerPosts.map(post => ({
                            ...post,
                            expertAvatar: post.expertAvatar || getRandomAvatar(),
                            likes: post.likes || Math.floor(Math.random() * 500) + 50,
                            comments: post.comments || Math.floor(Math.random() * 100) + 5,
                            shares: post.shares || Math.floor(Math.random() * 50) + 2,
                            bookmarks: post.bookmarks || Math.floor(Math.random() * 200) + 10
                        }));
                        console.log(`🎯 手动触发后获得 ${newPosts.length} 条博主推文`);
                    }
                } catch (triggerError) {
                    console.warn('手动触发博主更新失败:', triggerError);
                }
            }
            
            // 如果仍然没有推文（系统未初始化或博主暂无新内容），使用传统AI生成逻辑
            if (newPosts.length === 0) {
                console.log('🤖 使用传统AI生成推文...');
                const topics = [
                    '物理', '化学', '生物', '历史', '地理', '数学', '计算机', 
                    '心理学', '经济学', '艺术', '音乐', '手工艺', '烹饪', 
                    '园艺', '摄影', '天文', '考古', '语言学', '哲学',
                    '职业故事', '生活技巧', '传统工艺', '小众知识'
                ];
                const randomTopics = topics.sort(() => 0.5 - Math.random()).slice(0, 5);
                
                const result = await apiService.generateKnowledgeFeed(randomTopics, isInitialized ? 2 : 5);
                
                if (result && result.posts) {
                    newPosts = result.posts.map(post => ({
                        ...post,
                        id: `ai-${Date.now()}-${Math.random()}`,
                        expertAvatar: getRandomAvatar(),
                        likes: Math.floor(Math.random() * 500) + 50,
                        comments: Math.floor(Math.random() * 100) + 5,
                        shares: Math.floor(Math.random() * 50) + 2,
                        bookmarks: Math.floor(Math.random() * 200) + 10,
                        isGenerated: true,
                        generationType: 'traditional'
                    }));
                    
                    console.log(`🎲 生成了 ${newPosts.length} 条传统AI推文`);
                }
            }

            // 保存推文（对于虚拟博主推文，不需要创建额外用户）
            newPosts.forEach(post => {
                if (!post.bloggerId) {
                    // 只为非虚拟博主推文创建用户
                    contentStorage.addUserFromPost(post);
                }
            });
            contentStorage.savePosts(newPosts, append);
            
            // 更新界面
            if (append) {
                setPosts(prev => [...prev, ...newPosts]);
            } else {
                setPosts(prev => [...newPosts, ...prev]);
            }
            
        } catch (error) {
            console.error('生成内容失败:', error);
            setError('加载内容失败，请稍后重试');
        }
    };

    useEffect(() => {
        const initLoad = async () => {
            setIsLoading(true);
            const initialPosts = getInitialPosts();
            setPosts(initialPosts);
            
            // 只有在虚拟博主系统初始化完成且推文不足时才加载新内容
            if (initialPosts.length < 5 || !isInitialized) {
                console.log(`📊 当前推文数量: ${initialPosts.length}, 系统初始化状态: ${isInitialized}`);
                await loadAIContent(true);
            }
            
            const following = contentStorage.getFollowing();
            setShowRecommendations(following.length < 5);
            
            setIsLoading(false);
        };
        
        // 只有在不是系统加载中时才执行初始化
        if (!systemLoading) {
            initLoad();
        }
    }, [isInitialized, systemLoading]); // 依赖虚拟博主系统的初始化状态

    const handleScroll = useCallback(() => {
        if (!scrollRef.current) return;
        
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        
        if (scrollHeight - scrollTop <= clientHeight + 100 && !isLoadingMore && !isRefreshing) {
            loadMore();
        }
    }, [isLoadingMore, isRefreshing]);

    const loadMore = async () => {
        if (isLoadingMore) return;
        
        setIsLoadingMore(true);
        await loadAIContent(true);
        setIsLoadingMore(false);
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadAIContent(false);
        setIsRefreshing(false);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/confirm/${encodeURIComponent(searchQuery)}`);
        }
    };

    const PostCard = ({ post }) => {
        const [liked, setLiked] = useState(() => contentStorage.isLiked(post.id));
        const [bookmarked, setBookmarked] = useState(() => contentStorage.isBookmarked(post.id));
        const [localStats, setLocalStats] = useState({
            likes: post.likes || 0,
            comments: post.comments || 0,
            shares: post.shares || 0,
            bookmarks: post.bookmarks || 0
        });
        
        const userId = contentStorage.generateUserIdFromName(post.expertName);
        const [cheerCount, setCheerCount] = useState(() => contentStorage.getUserTodayCheerCount(userId));
        const [isAnimating, setIsAnimating] = useState(false);

        const handleLike = () => {
            if (liked) {
                contentStorage.unlikePost(post.id);
            } else {
                contentStorage.likePost(post.id);
            }
            
            setLiked(!liked);
            setLocalStats(prev => ({
                ...prev,
                likes: liked ? prev.likes - 1 : prev.likes + 1
            }));
        };

        const handleBookmark = () => {
            if (bookmarked) {
                contentStorage.unbookmarkPost(post.id);
            } else {
                contentStorage.bookmarkPost(post.id);
            }
            
            setBookmarked(!bookmarked);
            setLocalStats(prev => ({
                ...prev,
                bookmarks: bookmarked ? prev.bookmarks - 1 : prev.bookmarks + 1
            }));
        };

        const handleCheer = () => {
            setIsAnimating(true);
            setTimeout(() => setIsAnimating(false), 300);
            
            const newCount = contentStorage.cheerForUser(userId, post.expertName);
            setCheerCount(newCount);
            
            if (navigator.vibrate) {
                navigator.vibrate(30);
            }
        };

        const handleUserClick = () => {
            // 如果是虚拟博主的推文，直接路由到虚拟博主页面
            if (post.bloggerId) {
                console.log(`🎯 点击虚拟博主推文，路由到博主页面: ${post.bloggerId}`);
                navigate(`/user/${post.bloggerId}`);
                return;
            }
            
            // 否则按照原来的逻辑处理非虚拟博主
            const userId = contentStorage.generateUserIdFromName(post.expertName);
            
            const user = contentStorage.getUser(userId);
            if (!user) {
                console.log(`📝 创建非虚拟博主用户: ${post.expertName}`);
                contentStorage.addUserFromPost(post);
            }
            
            navigate(`/user/${userId}`);
        };
        
        return (
            <article className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 mb-6 overflow-hidden">
                {/* 用户信息区域 */}
                <header className="flex items-center justify-between p-6 pb-4">
                    <div 
                        className="flex items-center space-x-4 cursor-pointer group"
                        onClick={handleUserClick}
                    >
                        <div className="relative">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 flex items-center justify-center text-xl border-2 border-white shadow-sm">
                                {post.expertAvatar}
                            </div>
                            {post.verified && (
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs">✓</span>
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center space-x-2">
                                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                    {post.expertName}
                                </h3>
                                {post.isGenerated && (
                                    <span className="px-1 py-0.5 text-xs bg-green-100 text-green-600 rounded">
                                        {post.bloggerId ? 'Virtual' : 'AI'}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5">
                                {post.expertise}
                                {post.bloggerProgress && (
                                    <span className="ml-2 text-xs text-blue-500">
                                        Progress: {post.bloggerProgress}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-400">
                        <Clock size={14} />
                        <span>{post.timestamp}</span>
                    </div>
                </header>

                {/* 内容区域 */}
                <div className="px-6 pb-4">
                    <p className="text-gray-800 leading-relaxed text-base mb-4">
                        {post.content}
                    </p>
                    
                    {post.image && (
                        <div className="relative rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 p-8 text-center mb-4">
                            <div className="text-6xl opacity-80">
                                {post.image}
                            </div>
                        </div>
                    )}
                </div>

                {/* 话题标签 */}
                <div className="px-6 pb-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        #{post.topic}
                    </span>
                </div>

                {/* 互动区域 */}
                <footer className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-6">
                            <button 
                                onClick={handleLike}
                                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                                    liked 
                                        ? 'text-red-500 bg-red-50 border border-red-100' 
                                        : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
                                }`}
                            >
                                <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
                                <span className="text-sm font-medium">{localStats.likes}</span>
                            </button>
                            
                            <button className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-500 hover:text-blue-500 hover:bg-blue-50 transition-all duration-200">
                                <MessageCircle size={18} />
                                <span className="text-sm font-medium">{localStats.comments}</span>
                            </button>
                            
                            <button className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-500 hover:text-green-500 hover:bg-green-50 transition-all duration-200">
                                <Share2 size={18} />
                                <span className="text-sm font-medium">{localStats.shares}</span>
                            </button>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                            <button 
                                onClick={handleCheer}
                                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 transform ${
                                    isAnimating ? 'scale-105' : 'scale-100'
                                } ${
                                    cheerCount > 0 
                                        ? 'text-purple-600 bg-purple-50 border border-purple-100' 
                                        : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50'
                                }`}
                            >
                                <Megaphone 
                                    size={18} 
                                    className={`${isAnimating ? 'animate-pulse' : ''}`}
                                    fill={cheerCount > 0 ? 'currentColor' : 'none'} 
                                />
                                <span className="text-sm font-medium">{cheerCount > 0 ? cheerCount : 'Call'}</span>
                            </button>
                            
                            <button 
                                onClick={handleBookmark}
                                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                                    bookmarked 
                                        ? 'text-amber-600 bg-amber-50 border border-amber-100' 
                                        : 'text-gray-500 hover:text-amber-600 hover:bg-amber-50'
                                }`}
                            >
                                <Bookmark size={18} fill={bookmarked ? 'currentColor' : 'none'} />
                                <span className="text-sm font-medium">{localStats.bookmarks}</span>
                            </button>
                        </div>
                    </div>
                </footer>
            </article>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* 顶部导航栏 */}
            <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-2xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl font-bold text-gray-900">Knowledge Feed</h1>
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
                        </button>
                    </div>
                    
                    {/* 搜索栏 */}
                    <form onSubmit={handleSearch} className="mt-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="搜索知识、话题或专家..."
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none transition-all duration-200"
                            />
                        </div>
                    </form>
                </div>
            </header>

            {/* 主内容区域 */}
            <main 
                ref={scrollRef}
                className="max-w-2xl mx-auto px-6 py-6 overflow-y-auto"
                style={{ height: 'calc(100vh - 140px)' }}
                onScroll={handleScroll}
            >
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
                        {error}
                    </div>
                )}

                {/* 虚拟博主系统状态提示 */}
                {!systemLoading && isInitialized && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-6">
                        <div className="flex items-center gap-2">
                            <span className="text-green-500">🤖</span>
                            <span className="font-medium">虚拟博主系统已启动</span>
                        </div>
                        <p className="text-sm mt-1">推文将优先展示虚拟博主的学习心得和分享</p>
                    </div>
                )}

                {systemLoading && (
                    <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl mb-6">
                        <div className="flex items-center gap-2">
                            <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                            <span className="font-medium">正在初始化虚拟博主系统...</span>
                        </div>
                        <p className="text-sm mt-1">请稍候，系统正在创建虚拟博主并准备内容</p>
                    </div>
                )}

                {isLoading && posts.length === 0 ? (
                    <div className="text-center py-12">
                        <Loader className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-4" />
                        <p className="text-gray-600">正在加载精彩内容...</p>
                    </div>
                ) : (
                    <>
                        {/* 打Call排行榜 */}
                        <CheerLeaderboard />
                        
                        {/* 推荐用户 */}
                        {showRecommendations && (
                            <RecommendedUsers 
                                onClose={() => setShowRecommendations(false)}
                            />
                        )}
                        
                        {/* 信息流 */}
                        <div className="space-y-0">
                            {posts.map((post, index) => (
                                <div key={post.id}>
                                    <PostCard post={post} />
                                    {index === 2 && !showRecommendations && contentStorage.getFollowing().length > 0 && contentStorage.getFollowing().length < 10 && (
                                        <RecommendedUsers />
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* 加载更多 */}
                        {isLoadingMore ? (
                            <div className="text-center py-8">
                                <Loader className="animate-spin h-6 w-6 text-blue-500 mx-auto mb-3" />
                                <p className="text-gray-500">加载更多内容...</p>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <button 
                                    onClick={loadMore}
                                    className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                                >
                                    加载更多
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

export default MinimalistFeedPage;