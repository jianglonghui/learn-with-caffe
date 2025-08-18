import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, RefreshCw, Loader, Megaphone, ExternalLink, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import APIService from '../services/APIService';
import contentStorage from '../services/ContentStorage';
import RecommendedUsers from './RecommendedUsers';
import CheerLeaderboard from './CheerLeaderboard';

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

    const getInitialPosts = () => {
        const savedPosts = contentStorage.getPosts(10);
        if (savedPosts.length > 0) {
            return savedPosts;
        }
        
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
            }
        ];
    };

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
                    likes: Math.floor(Math.random() * 500) + 50,
                    comments: Math.floor(Math.random() * 100) + 5,
                    shares: Math.floor(Math.random() * 50) + 2,
                    bookmarks: Math.floor(Math.random() * 200) + 10
                }));

                newPosts.forEach(post => {
                    contentStorage.addUserFromPost(post);
                });

                contentStorage.savePosts(newPosts, append);
                
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

    useEffect(() => {
        const initLoad = async () => {
            setIsLoading(true);
            const initialPosts = getInitialPosts();
            setPosts(initialPosts);
            
            if (initialPosts.length < 5) {
                await loadAIContent(true);
            }
            
            const following = contentStorage.getFollowing();
            setShowRecommendations(following.length < 5);
            
            setIsLoading(false);
        };
        initLoad();
    }, []);

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
            const userId = contentStorage.generateUserIdFromName(post.expertName);
            
            const user = contentStorage.getUser(userId);
            if (!user) {
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
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5">{post.expertise}</p>
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