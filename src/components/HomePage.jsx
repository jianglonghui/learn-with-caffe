import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, RefreshCw, Loader, Megaphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import contentStorage from '../services/ContentStorage';
import RecommendedUsers from './RecommendedUsers';
import CheerLeaderboard from './CheerLeaderboard';
import { getRandomAvatar } from '../utils/avatarUtils';
import { dynamicFeedPostsManager } from '../data/dynamicFeedPosts';
import { useVirtualBloggers } from '../hooks/useVirtualBloggers';
import { bloggerScheduler } from '../services/BloggerScheduler';
import { bloggerManager } from '../data/virtualBloggers';

const HomePage = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [pullDistance, setPullDistance] = useState(0);
    const [startY, setStartY] = useState(0);
    const [isPulling, setIsPulling] = useState(false);
    const [showRecommendations, setShowRecommendations] = useState(false);
    
    const navigate = useNavigate();
    const containerRef = useRef(null);
    const scrollRef = useRef(null);
    
    // 使用虚拟博主系统
    const { isInitialized, isLoading: systemLoading, error: systemError } = useVirtualBloggers();

    // 获取初始数据 - 完全依赖虚拟博主系统
    const getInitialPosts = () => {
        // 优先从虚拟博主Feed系统获取动态推文
        const dynamicPosts = dynamicFeedPostsManager.getAllPosts({ limit: 10, includeGenerated: true });
        if (dynamicPosts.length > 0) {
            console.log(`📱 从虚拟博主系统获取到 ${dynamicPosts.length} 条推文`);
            return dynamicPosts;
        }
        
        // 如果没有动态推文且虚拟博主系统未初始化，返回提示
        return [
            {
                id: 'system-init',
                expertName: '系统助手',
                expertAvatar: getRandomAvatar(),
                expertise: '系统管理',
                verified: true,
                content: '🚀 虚拟博主系统正在初始化中，即将为您呈现AI博主的精彩内容！请稍候片刻...',
                image: '⚡',
                likes: 0,
                comments: 0,
                shares: 0,
                bookmarks: 0,
                timestamp: '刚刚',
                topic: '系统提示',
                type: 'system'
            }
        ];
    };


    // Fresh Content: 100% AI生成全新博主 + 调度所有博主生成内容
    const generateFreshContent = async () => {
        if (!isInitialized) {
            console.log('⏳ 虚拟博主系统尚未初始化');
            return;
        }
        
        try {
            setError(null);
            console.log('🎯 Fresh Content 启动：AI生成全新博主...');
            
            // 1. 必定创建一个全新的AI生成博主
            console.log('🤖 开始AI生成全新博主...');
            let newBlogger = null;
            try {
                newBlogger = await bloggerManager.createAIGeneratedBlogger();
                console.log(`🎉 AI成功创建新博主: ${newBlogger.name} (${newBlogger.expertise})`);
            } catch (error) {
                console.error('❌ AI生成博主失败:', error);
                setError(`AI生成博主失败: ${error.message}`);
                return; // 如果AI生成失败，直接返回
            }
            
            // 2. 强制调度所有活跃博主（包括新创建的博主）
            console.log('📝 调度所有博主生成内容（包括新博主）...');
            await bloggerScheduler.scheduleAll();
            
            // 获取新生成的推文
            const newBloggerPosts = await dynamicFeedPostsManager.updatePostsFromBloggers();
            
            if (newBloggerPosts.length > 0) {
                const newPosts = newBloggerPosts.map(post => ({
                    ...post,
                    expertAvatar: post.expertAvatar || getRandomAvatar(),
                    likes: post.likes || Math.floor(Math.random() * 500) + 50,
                    comments: post.comments || Math.floor(Math.random() * 100) + 5,
                    shares: post.shares || Math.floor(Math.random() * 50) + 2,
                    bookmarks: post.bookmarks || Math.floor(Math.random() * 200) + 10
                }));
                
                // 保存推文（对于虚拟博主推文，不需要创建额外用户）
                newPosts.forEach(post => {
                    if (!post.bloggerId) {
                        // 只为非虚拟博主推文创建用户
                        contentStorage.addUserFromPost(post);
                    }
                });
                contentStorage.savePosts(newPosts, false); // 不追加，替换现有内容
                
                // 替换现有推文
                setPosts(newPosts);
                console.log(`✨ Fresh Content 完成！新博主"${newBlogger?.name}"已加入，生成了 ${newPosts.length} 条新推文`);
            } else {
                console.log('📝 暂时没有生成新内容');
            }
            
        } catch (error) {
            console.error('生成新内容失败:', error);
            setError('生成新内容失败，请稍后重试');
        }
    };

    // 加载更多现有博主内容 (Load More) - 只加载现有内容，不生成新内容
    const loadMoreContent = async () => {
        if (!isInitialized || isLoadingMore) {
            console.log(isLoadingMore ? '⏳ 正在加载更多内容...' : '⏳ 虚拟博主系统尚未初始化');
            return;
        }
        
        try {
            setIsLoadingMore(true);
            setError(null);
            console.log('📚 加载更多博主内容...');
            
            // 从现有内容中获取更多推文，排除已显示的
            const currentPostIds = posts.map(post => post.id);
            const moreBloggerPosts = dynamicFeedPostsManager.getMorePosts(5, currentPostIds);
            
            if (moreBloggerPosts.length > 0) {
                const newPosts = moreBloggerPosts.map(post => ({
                    ...post,
                    expertAvatar: post.expertAvatar || getRandomAvatar(),
                    likes: post.likes || Math.floor(Math.random() * 500) + 50,
                    comments: post.comments || Math.floor(Math.random() * 100) + 5,
                    shares: post.shares || Math.floor(Math.random() * 50) + 2,
                    bookmarks: post.bookmarks || Math.floor(Math.random() * 200) + 10
                }));
                
                // 保存推文（对于虚拟博主推文，不需要创建额外用户）
                newPosts.forEach(post => {
                    if (!post.bloggerId) {
                        // 只为非虚拟博主推文创建用户
                        contentStorage.addUserFromPost(post);
                    }
                });
                contentStorage.savePosts(newPosts, true); // 追加到现有内容
                
                // 追加到现有推文，确保不重复
                setPosts(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const uniqueNewPosts = newPosts.filter(post => !existingIds.has(post.id));
                    console.log(`📝 添加了 ${uniqueNewPosts.length} 条新推文，过滤了 ${newPosts.length - uniqueNewPosts.length} 条重复`);
                    return [...prev, ...uniqueNewPosts];
                });
                console.log(`📖 加载了 ${newPosts.length} 条更多推文`);
            } else {
                console.log('📝 没有更多现有内容可加载');
                setError('没有更多内容了，请使用 Fresh Content 生成新内容');
            }
            
        } catch (error) {
            console.error('加载更多内容失败:', error);
            setError('加载更多内容失败，请稍后重试');
        } finally {
            setIsLoadingMore(false);
        }
    };

    // 初始加载
    useEffect(() => {
        const initLoad = async () => {
            setIsLoading(true);
            const initialPosts = getInitialPosts();
            setPosts(initialPosts);
            
            // 调试：打印当前存储的所有用户
            const userData = contentStorage.exportData();
            console.log('当前存储的用户:', Object.keys(userData.users));
            console.log('所有用户数据:', userData.users);
            
            // 如果系统已初始化且没有足够的内容，加载更多博主内容
            if (isInitialized && initialPosts.length < 5) {
                await loadMoreContent();
            }
            
            // 检查是否显示推荐（用户关注数少于5个时显示）
            const following = contentStorage.getFollowing();
            setShowRecommendations(following.length < 5);
            
            setIsLoading(false);
        };
        
        // 只有在虚拟博主系统不在加载时才执行初始化
        if (!systemLoading) {
            initLoad();
        }
    }, [isInitialized, systemLoading]); // 依赖虚拟博主系统状态

    // 当虚拟博主系统初始化完成后，刷新推文数据
    useEffect(() => {
        if (isInitialized && !systemLoading) {
            const refreshPosts = () => {
                console.log('🔄 虚拟博主系统已初始化，刷新推文数据...');
                const newPosts = getInitialPosts();
                if (newPosts.length > 0 && newPosts[0].id !== 'system-init') {
                    setPosts(newPosts);
                    console.log(`✅ 已刷新 ${newPosts.length} 条推文`);
                }
            };
            
            // 延迟一下确保所有数据都已生成
            setTimeout(refreshPosts, 2000);
        }
    }, [isInitialized, systemLoading]);

    // 处理触摸开始
    const handleTouchStart = (e) => {
        if (scrollRef.current?.scrollTop === 0) {
            setStartY(e.touches[0].clientY);
            setIsPulling(true);
        }
    };

    // 处理触摸移动
    const handleTouchMove = (e) => {
        if (!isPulling) return;
        
        const currentY = e.touches[0].clientY;
        const distance = currentY - startY;
        
        if (distance > 0 && distance < 150) {
            setPullDistance(distance);
            if (distance > 80 && !isRefreshing) {
                // 触发震动反馈（如果支持）
                if (navigator.vibrate) {
                    navigator.vibrate(10);
                }
            }
        }
    };

    // 处理触摸结束
    const handleTouchEnd = async () => {
        if (pullDistance > 80 && !isRefreshing) {
            setIsRefreshing(true);
            setPullDistance(0);
            
            // 执行刷新 - 生成新内容
            await generateFreshContent();
            
            setIsRefreshing(false);
        }
        
        setPullDistance(0);
        setIsPulling(false);
    };

    // 处理滚动加载更多
    const handleScroll = useCallback(() => {
        if (!scrollRef.current) return;
        
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        
        if (scrollHeight - scrollTop <= clientHeight + 100 && !isLoadingMore && !isRefreshing) {
            loadMore();
        }
    }, [isLoadingMore, isRefreshing]);

    // 加载更多内容
    const loadMore = async () => {
        // loadMoreContent 已经有自己的loading状态管理，直接调用即可
        await loadMoreContent();
    };

    // 手动刷新按钮
    const handleManualRefresh = async () => {
        setIsRefreshing(true);
        await generateFreshContent();
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
        
        // 打call相关状态
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
            // 触发打call动画
            setIsAnimating(true);
            setTimeout(() => setIsAnimating(false), 300);
            
            // 增加打call次数
            const newCount = contentStorage.cheerForUser(userId, post.expertName);
            setCheerCount(newCount);
            
            // 触发振动反馈（如果支持）
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
            console.log('点击非虚拟博主用户:', post.expertName, '生成ID:', userId);
            
            // 检查用户是否存在
            const user = contentStorage.getUser(userId);
            console.log('用户数据:', user);
            
            if (!user) {
                console.log('用户不存在，从post创建用户');
                contentStorage.addUserFromPost(post);
            }
            
            navigate(`/user/${userId}`);
        };
        
        return (
            <article className="bg-white border border-gray-100 p-8 mb-8 hover:border-gray-200 transition-all duration-200">
                {/* 极简用户信息 */}
                <header className="flex items-start justify-between mb-6">
                    <div 
                        className="flex items-center space-x-4 cursor-pointer group"
                        onClick={handleUserClick}
                    >
                        <img
                            src={post.expertAvatar}
                            alt={post.expertName}
                            className="w-12 h-12 rounded-full object-cover"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                            }}
                        />
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-3xl" style={{display: 'none'}}>
                            😊
                        </div>
                        <div>
                            <div className="flex items-center space-x-2">
                                <h3 className="text-lg font-bold text-gray-900 group-hover:text-gray-700 transition-colors">{post.expertName}</h3>
                                {post.verified && <span className="text-blue-500 text-sm">✓</span>}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{post.expertise}</p>
                        </div>
                    </div>
                    <div className="text-xs text-gray-400">{post.timestamp}</div>
                </header>

                {/* 极简内容展示 */}
                <div className="mb-8">
                    <p className="text-gray-800 leading-relaxed text-lg mb-4">{post.content}</p>
                    {post.image && (
                        <div className="text-center text-8xl my-8 opacity-90">
                            {post.image}
                        </div>
                    )}
                </div>

                {/* 极简主题标签 */}
                <div className="mb-6">
                    <span className="inline-block px-3 py-1 text-xs font-medium text-gray-600 bg-gray-50 rounded-full">
                        #{post.topic}
                    </span>
                </div>

                {/* 极简互动按钮 */}
                <footer className="flex items-center justify-between pt-6 border-t border-gray-50">
                    <button 
                        onClick={handleLike}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-full transition-all duration-200 ${
                            liked ? 'text-red-500 bg-red-50' : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
                        }`}
                    >
                        <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
                        <span className="text-sm font-medium">{localStats.likes}</span>
                    </button>
                    
                    <button className="flex items-center space-x-2 px-3 py-2 rounded-full text-gray-500 hover:text-blue-500 hover:bg-blue-50 transition-all duration-200">
                        <MessageCircle size={16} />
                        <span className="text-sm font-medium">{localStats.comments}</span>
                    </button>
                    
                    <button className="flex items-center space-x-2 px-3 py-2 rounded-full text-gray-500 hover:text-green-500 hover:bg-green-50 transition-all duration-200">
                        <Share2 size={16} />
                        <span className="text-sm font-medium">{localStats.shares}</span>
                    </button>
                    
                    <button 
                        onClick={handleCheer}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-full transition-all duration-200 transform ${
                            isAnimating ? 'scale-110' : 'scale-100'
                        } ${
                            cheerCount > 0 ? 'text-purple-500 bg-purple-50' : 'text-gray-500 hover:text-purple-500 hover:bg-purple-50'
                        }`}
                    >
                        <Megaphone 
                            size={16} 
                            className={`${isAnimating ? 'animate-pulse' : ''}`}
                            fill={cheerCount > 0 ? 'currentColor' : 'none'} 
                        />
                        <span className="text-sm font-medium">{cheerCount > 0 ? cheerCount : 'Call'}</span>
                    </button>
                    
                    <button 
                        onClick={handleBookmark}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-full transition-all duration-200 ${
                            bookmarked ? 'text-amber-500 bg-amber-50' : 'text-gray-500 hover:text-amber-500 hover:bg-amber-50'
                        }`}
                    >
                        <Bookmark size={16} fill={bookmarked ? 'currentColor' : 'none'} />
                        <span className="text-sm font-medium">{localStats.bookmarks}</span>
                    </button>
                </footer>
            </article>
        );
    };

    return (
        <div className="min-h-screen bg-white" ref={containerRef}>
            {/* 极简顶部搜索栏 */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-6 py-6">
                    <form onSubmit={handleSearch} className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search for knowledge..."
                            className="w-full pl-12 pr-4 py-4 rounded-full border-2 border-gray-200 focus:border-gray-900 focus:ring-4 focus:ring-gray-900/10 outline-none transition-all duration-200 text-lg"
                        />
                    </form>
                </div>
            </header>

            {/* 下拉刷新指示器 - 极简设计 */}
            {pullDistance > 0 && (
                <div 
                    className="absolute top-20 left-0 right-0 flex justify-center transition-all duration-200 z-20"
                    style={{ 
                        transform: `translateY(${Math.min(pullDistance, 100)}px)`,
                        opacity: Math.min(pullDistance / 80, 1)
                    }}
                >
                    <div className={`p-3 rounded-full transition-all duration-200 ${pullDistance > 80 ? 'bg-gray-900' : 'bg-gray-300'}`}>
                        <RefreshCw 
                            size={20} 
                            className={`text-white ${isRefreshing ? 'animate-spin' : ''}`}
                        />
                    </div>
                </div>
            )}

            {/* 主内容区域 */}
            <main 
                ref={scrollRef}
                className="max-w-3xl mx-auto px-6 py-12 overflow-y-auto"
                style={{ height: 'calc(100vh - 100px)' }}
                onScroll={handleScroll}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* 极简欢迎区域 */}
                <section className="mb-16 text-center">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                        Knowledge 
                        <span className="relative inline-block mx-2">
                            <span className="relative z-10 font-hand text-4xl md:text-5xl italic">feed</span>
                            <svg 
                                className="absolute -bottom-1 left-0 w-full" 
                                height="8" 
                                viewBox="0 0 120 8"
                            >
                                <path 
                                    d="M4 4 Q60 1 116 4" 
                                    stroke="#FFD93D" 
                                    strokeWidth="3" 
                                    fill="none"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </span>
                    </h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Discover unique insights from professionals and everyday experts
                    </p>
                    <button 
                        onClick={handleManualRefresh}
                        disabled={isRefreshing}
                        className="mt-6 px-6 py-3 bg-gray-900 text-white rounded-full font-medium hover:bg-gray-800 transition-all duration-200 flex items-center space-x-2 mx-auto disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                        <span>Fresh content</span>
                    </button>
                </section>

                {/* 错误提示 - 极简样式 */}
                {(error || systemError) && (
                    <div className="bg-red-50 border border-red-100 text-red-700 px-6 py-4 rounded-lg mb-8 text-center">
                        {error || systemError}
                    </div>
                )}

                {/* 加载中状态 - 极简设计 */}
                {(isLoading || systemLoading) && posts.length === 0 ? (
                    <div className="text-center py-20">
                        <Loader className="animate-spin h-8 w-8 text-gray-900 mx-auto mb-4" />
                        <p className="text-gray-600">
                            {systemLoading ? 'Initializing virtual blogger system...' : 'Loading amazing content...'}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* 打Call排行榜 */}
                        <CheerLeaderboard />
                        
                        {/* 推荐用户组件 */}
                        {showRecommendations && (
                            <RecommendedUsers 
                                onClose={() => setShowRecommendations(false)}
                            />
                        )}
                        
                        {/* 知识动态流 */}
                        <div>
                            {posts.map((post, index) => (
                                <div key={post.id}>
                                    <PostCard post={post} />
                                    {/* 在第3个帖子后插入推荐（如果用户关注了一些人但不多） */}
                                    {index === 2 && !showRecommendations && contentStorage.getFollowing().length > 0 && contentStorage.getFollowing().length < 10 && (
                                        <RecommendedUsers />
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* 加载更多 - 极简样式 */}
                        {isLoadingMore ? (
                            <div className="text-center py-12">
                                <Loader className="animate-spin h-6 w-6 text-gray-900 mx-auto mb-3" />
                                <p className="text-gray-500">Loading more...</p>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <button 
                                    onClick={loadMore}
                                    className="px-8 py-3 border-2 border-gray-200 text-gray-700 rounded-full font-medium hover:border-gray-900 hover:text-gray-900 transition-all duration-200"
                                >
                                    Load more
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* 自定义字体 */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap');
                
                .font-hand {
                    font-family: 'Permanent Marker', cursive;
                }
            `}</style>
        </div>
    );
};

export default HomePage;