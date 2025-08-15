import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, RefreshCw, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import APIService from '../services/APIService';
import contentStorage from '../services/ContentStorage';
import RecommendedUsers from './RecommendedUsers';

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
                expertAvatar: '🌸',
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
                expertAvatar: '👵',
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
                expertAvatar: '📜',
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4 hover:shadow-md transition-shadow">
                {/* 专家信息 */}
                <div className="flex items-center justify-between mb-3">
                    <div 
                        className="flex items-center space-x-3 cursor-pointer hover:opacity-80"
                        onClick={handleUserClick}
                    >
                        <div className="text-2xl">{post.expertAvatar}</div>
                        <div>
                            <div className="flex items-center space-x-1">
                                <h3 className="font-semibold text-gray-900 hover:underline">{post.expertName}</h3>
                                {post.verified && <span className="text-blue-500">✓</span>}
                            </div>
                            <p className="text-sm text-gray-600">{post.expertise} • {post.timestamp}</p>
                        </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                        <MoreHorizontal size={20} />
                    </button>
                </div>

                {/* 内容 */}
                <div className="mb-3">
                    <p className="text-gray-800 leading-relaxed">{post.content}</p>
                    {post.image && (
                        <div className="mt-2 text-center text-6xl">
                            {post.image}
                        </div>
                    )}
                </div>

                {/* 主题标签 */}
                <div className="mb-3 flex items-center space-x-2">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        post.type === 'knowledge' 
                            ? 'bg-blue-100 text-blue-800' 
                            : post.type === 'trivia'
                            ? 'bg-green-100 text-green-800'
                            : post.type === 'tip'
                            ? 'bg-purple-100 text-purple-800'
                            : post.type === 'experience'
                            ? 'bg-orange-100 text-orange-800'
                            : post.type === 'achievement'
                            ? 'bg-pink-100 text-pink-800'
                            : 'bg-gray-100 text-gray-800'
                    }`}>
                        #{post.topic}
                    </span>
                    {post.type === 'experience' && (
                        <span className="text-xs text-orange-600">职业分享</span>
                    )}
                    {post.type === 'achievement' && (
                        <span className="text-xs text-pink-600">生活小成就</span>
                    )}
                </div>

                {/* 互动按钮 */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <button 
                        onClick={handleLike}
                        className={`flex items-center space-x-1 transition-colors ${
                            liked ? 'text-red-500' : 'text-gray-600 hover:text-red-500'
                        }`}
                    >
                        <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
                        <span className="text-sm">{localStats.likes}</span>
                    </button>
                    <button className="flex items-center space-x-1 text-gray-600 hover:text-blue-500 transition-colors">
                        <MessageCircle size={18} />
                        <span className="text-sm">{localStats.comments}</span>
                    </button>
                    <button className="flex items-center space-x-1 text-gray-600 hover:text-green-500 transition-colors">
                        <Share2 size={18} />
                        <span className="text-sm">{localStats.shares}</span>
                    </button>
                    <button 
                        onClick={handleBookmark}
                        className={`flex items-center space-x-1 transition-colors ${
                            bookmarked ? 'text-yellow-500' : 'text-gray-600 hover:text-yellow-500'
                        }`}
                    >
                        <Bookmark size={18} fill={bookmarked ? 'currentColor' : 'none'} />
                        <span className="text-sm">{localStats.bookmarks}</span>
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50" ref={containerRef}>
            {/* 顶部搜索栏 */}
            <div className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-2xl mx-auto px-4 py-3">
                    <form onSubmit={handleSearch} className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="搜索你想学习的主题..."
                            className="w-full pl-10 pr-4 py-3 rounded-full border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </form>
                </div>
            </div>

            {/* 下拉刷新指示器 */}
            {pullDistance > 0 && (
                <div 
                    className="absolute top-16 left-0 right-0 flex justify-center transition-all duration-200 z-20"
                    style={{ 
                        transform: `translateY(${Math.min(pullDistance, 100)}px)`,
                        opacity: Math.min(pullDistance / 80, 1)
                    }}
                >
                    <div className={`p-3 rounded-full ${pullDistance > 80 ? 'bg-blue-500' : 'bg-gray-300'}`}>
                        <RefreshCw 
                            size={24} 
                            className={`text-white ${isRefreshing ? 'animate-spin' : ''}`}
                        />
                    </div>
                </div>
            )}

            {/* 主内容区域 */}
            <div 
                ref={scrollRef}
                className="max-w-2xl mx-auto px-4 py-6 overflow-y-auto"
                style={{ height: 'calc(100vh - 64px)' }}
                onScroll={handleScroll}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* 欢迎信息 */}
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white p-6 mb-6">
                    <h1 className="text-2xl font-bold mb-2">欢迎来到知识分享社区</h1>
                    <p className="text-blue-100">
                        这里有调香师、古籍修复师等小众职业者的独特见解，
                        也有用小知识解决生活难题的温暖故事。
                        每个人都是某个领域的"专家"！
                    </p>
                    <button 
                        onClick={handleManualRefresh}
                        disabled={isRefreshing}
                        className="mt-3 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                    >
                        <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                        <span>刷新内容</span>
                    </button>
                </div>

                {/* 错误提示 */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                        {error}
                    </div>
                )}

                {/* 加载中状态 */}
                {isLoading && posts.length === 0 ? (
                    <div className="text-center py-12">
                        <Loader className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-4" />
                        <p className="text-gray-600">正在加载精彩内容...</p>
                    </div>
                ) : (
                    <>
                        {/* 知识流 */}
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center justify-between">
                                <span>知识推荐流</span>
                                {isRefreshing && (
                                    <span className="text-sm text-blue-500 flex items-center">
                                        <Loader className="animate-spin h-4 w-4 mr-1" />
                                        刷新中...
                                    </span>
                                )}
                            </h2>
                            
                            {/* 推荐用户组件 */}
                            {showRecommendations && (
                                <RecommendedUsers 
                                    onClose={() => setShowRecommendations(false)}
                                />
                            )}
                            
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

                        {/* 加载更多 */}
                        {isLoadingMore ? (
                            <div className="text-center py-6">
                                <Loader className="animate-spin h-6 w-6 text-blue-500 mx-auto mb-2" />
                                <p className="text-gray-500">加载更多内容...</p>
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <button 
                                    onClick={loadMore}
                                    className="text-blue-500 hover:text-blue-600 font-medium"
                                >
                                    点击加载更多
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default HomePage;