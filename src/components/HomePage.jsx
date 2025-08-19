import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, RefreshCw, Loader, Megaphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import APIService from '../services/APIService';
import contentStorage from '../services/ContentStorage';
import RecommendedUsers from './RecommendedUsers';
import CheerLeaderboard from './CheerLeaderboard';
import { getRandomAvatar } from '../utils/avatarUtils';

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
    const apiService = APIService.getInstance();
    const containerRef = useRef(null);
    const scrollRef = useRef(null);

    // 获取初始数据
    const getInitialPosts = () => {
        const savedPosts = contentStorage.getPosts(10);
        if (savedPosts.length > 0) {
            return savedPosts;
        }
        
        // 如果没有保存的数据，返回默认内容
        return [
            {
                id: 'static-1',
                expertName: '调香师小雅',
                expertAvatar: getRandomAvatar(),
                expertise: '调香师',
                verified: true,
                content: '今天有位老奶奶想要"初恋的味道"。我调了橙花、白茶和一点麝香，她闻了之后眼眶红了，说就是60年前那个夏天的味道。这就是调香师最幸福的时刻。',
                image: '💐',
                likes: 856,
                comments: 123,
                shares: 67,
                bookmarks: 234,
                timestamp: '1小时前',
                topic: '职业故事',
                type: 'experience'
            },
            {
                id: 'static-2',
                expertName: '退休教师李奶奶',
                expertAvatar: getRandomAvatar(),
                expertise: '生活达人',
                verified: false,
                content: '孙子的乐高掉沙发缝里了，用化学课教的"热胀冷缩"原理，冰块敷在沙发腿上，缝隙变大了一点点，终于把乐高钩出来了！70岁还能用上30年前的知识，开心！',
                image: '🧊',
                likes: 1234,
                comments: 89,
                shares: 156,
                bookmarks: 445,
                timestamp: '3小时前',
                topic: '生活智慧',
                type: 'achievement'
            },
            {
                id: 'static-3',
                expertName: '古籍修复师老陈',
                expertAvatar: getRandomAvatar(),
                expertise: '古籍修复师',
                verified: true,
                content: '今天修复一本明代医书，书页薄如蝉翼。用传统的"金镶玉"技法，把日本纸浆调成跟原纸一样的颜色，一点点补齐虫蛀的洞。6个小时修了3页，但想到后人还能读到这些智慧，值了。',
                image: null,
                likes: 567,
                comments: 78,
                shares: 234,
                bookmarks: 890,
                timestamp: '5小时前',
                topic: '传统工艺',
                type: 'experience'
            }
        ];
    };

    // 生成随机互动数据
    const generateRandomStats = () => ({
        likes: Math.floor(Math.random() * 500) + 50,
        comments: Math.floor(Math.random() * 100) + 5,
        shares: Math.floor(Math.random() * 50) + 2,
        bookmarks: Math.floor(Math.random() * 200) + 10
    });

    // 加载AI生成的内容
    const loadAIContent = async (append = false) => {
        try {
            setError(null);
            const topics = [
                '物理', '化学', '生物', '历史', '地理', '数学', '计算机', 
                '心理学', '经济学', '艺术', '音乐', '手工艺', '烹饪', 
                '园艺', '摄影', '天文', '考古', '语言学', '哲学',
                '职业故事', '生活技巧', '传统工艺', '小众知识'
            ];
            const randomTopics = topics.sort(() => 0.5 - Math.random()).slice(0, 5);
            
            const result = await apiService.generateKnowledgeFeed(randomTopics, 5);
            
            if (result && result.posts) {
                const newPosts = result.posts.map(post => ({
                    ...post,
                    id: `ai-${Date.now()}-${Math.random()}`,
                    expertAvatar: getRandomAvatar(), // 为AI生成的帖子分配随机头像
                    ...generateRandomStats()
                }));

                // 为AI生成的用户添加到用户数据库
                newPosts.forEach(post => {
                    contentStorage.addUserFromPost(post);
                });

                // 保存到持久化存储
                const savedPosts = contentStorage.savePosts(newPosts, append);
                
                if (append) {
                    setPosts(prev => [...prev, ...newPosts]);
                } else {
                    setPosts(prev => [...newPosts, ...prev]);
                }
            }
        } catch (error) {
            console.error('生成内容失败:', error);
            setError('加载内容失败，请稍后重试');
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
            
            // 如果没有足够的内容，生成一些
            if (initialPosts.length < 5) {
                await loadAIContent(true);
            }
            
            // 检查是否显示推荐（用户关注数少于5个时显示）
            const following = contentStorage.getFollowing();
            setShowRecommendations(following.length < 5);
            
            setIsLoading(false);
        };
        initLoad();
    }, []);

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
            
            // 执行刷新
            await loadAIContent(false);
            
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
        if (isLoadingMore) return;
        
        setIsLoadingMore(true);
        await loadAIContent(true);
        setIsLoadingMore(false);
    };

    // 手动刷新按钮
    const handleManualRefresh = async () => {
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
            const userId = contentStorage.generateUserIdFromName(post.expertName);
            console.log('点击用户:', post.expertName, '生成ID:', userId);
            
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
                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-700 px-6 py-4 rounded-lg mb-8 text-center">
                        {error}
                    </div>
                )}

                {/* 加载中状态 - 极简设计 */}
                {isLoading && posts.length === 0 ? (
                    <div className="text-center py-20">
                        <Loader className="animate-spin h-8 w-8 text-gray-900 mx-auto mb-4" />
                        <p className="text-gray-600">Loading amazing content...</p>
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
            <style jsx>{`
                @import url('https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap');
                
                .font-hand {
                    font-family: 'Permanent Marker', cursive;
                }
            `}</style>
        </div>
    );
};

export default HomePage;