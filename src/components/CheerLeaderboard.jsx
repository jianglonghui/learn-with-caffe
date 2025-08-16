import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Crown, Medal, Star, ChevronRight } from 'lucide-react';
import contentStorage from '../services/ContentStorage';

const CheerLeaderboard = () => {
    const [leaderboard, setLeaderboard] = useState([]);
    const [todayStats, setTodayStats] = useState({ todayTotal: 0 });
    const navigate = useNavigate();

    useEffect(() => {
        loadLeaderboard();
        // 每30秒刷新一次排行榜
        const interval = setInterval(loadLeaderboard, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadLeaderboard = () => {
        const ranking = contentStorage.getTodayCheerLeaderboard();
        const stats = contentStorage.getAllCheerStats();
        setLeaderboard(ranking);
        setTodayStats(stats);
    };

    const handleUserClick = (userId) => {
        navigate(`/user/${userId}`);
    };

    if (leaderboard.length === 0) {
        return null;
    }

    // 准备颁奖台数据，确保有3个位置
    const podiumData = [];
    
    // 第二名（左侧）
    podiumData.push({
        position: 2,
        rank: '亚军',
        icon: <Medal className="w-5 h-5 text-gray-400" />,
        height: 'h-16',
        bgColor: 'bg-gradient-to-t from-gray-100 to-gray-50',
        borderColor: 'border-gray-300',
        textColor: 'text-gray-600',
        user: leaderboard[1] || null
    });

    // 第一名（中间，最高）
    podiumData.push({
        position: 1,
        rank: '冠军',
        icon: <Crown className="w-6 h-6 text-yellow-500" />,
        height: 'h-20',
        bgColor: 'bg-gradient-to-t from-yellow-100 to-yellow-50',
        borderColor: 'border-yellow-400',
        textColor: 'text-yellow-700',
        user: leaderboard[0] || null
    });

    // 第三名（右侧）
    podiumData.push({
        position: 3,
        rank: '季军',
        icon: <Medal className="w-4 h-4 text-orange-400" />,
        height: 'h-12',
        bgColor: 'bg-gradient-to-t from-orange-100 to-orange-50',
        borderColor: 'border-orange-300',
        textColor: 'text-orange-600',
        user: leaderboard[2] || null
    });

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            {/* 头部 */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                    <Trophy className="text-yellow-500" size={20} />
                    <h3 className="font-semibold text-gray-900">今日打Call榜</h3>
                    <span className="text-sm text-gray-500">
                        ({todayStats.todayTotal} 次)
                    </span>
                </div>
                <div className="text-xs text-gray-400">
                    每日0点重置
                </div>
            </div>

            {/* 颁奖台 */}
            <div className="flex items-end justify-center space-x-2 mb-6">
                {podiumData.map((podium, index) => (
                    <div 
                        key={podium.position} 
                        className="flex flex-col items-center"
                        style={{ order: index === 1 ? 0 : index + 1 }} // 确保冠军在中间
                    >
                        {/* 用户信息 */}
                        {podium.user ? (
                            <div 
                                className="mb-2 cursor-pointer transform hover:scale-105 transition-transform"
                                onClick={() => handleUserClick(podium.user.userId)}
                            >
                                {/* 头像 */}
                                <div className="relative">
                                    <div className="text-2xl mb-1 text-center">
                                        {podium.user.avatar}
                                    </div>
                                    {/* 排名图标 */}
                                    <div className="absolute -top-1 -right-1">
                                        {podium.icon}
                                    </div>
                                </div>
                                
                                {/* 用户名 */}
                                <div className="text-center">
                                    <div className={`text-xs font-medium ${podium.textColor} truncate w-16`}>
                                        {podium.user.name}
                                    </div>
                                    <div className={`text-xs ${podium.textColor} font-bold`}>
                                        {podium.user.count} 次
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="mb-2 flex flex-col items-center">
                                <div className="text-2xl mb-1 text-gray-300">👤</div>
                                <div className="text-xs text-gray-400 text-center">
                                    <div>暂无</div>
                                    <div>0 次</div>
                                </div>
                            </div>
                        )}

                        {/* 颁奖台台阶 */}
                        <div 
                            className={`
                                w-16 ${podium.height} ${podium.bgColor} 
                                border-2 ${podium.borderColor} rounded-t-lg
                                flex items-end justify-center pb-2
                                relative overflow-hidden
                            `}
                        >
                            {/* 台阶标号 */}
                            <div className={`text-lg font-bold ${podium.textColor}`}>
                                {podium.position}
                            </div>
                            
                            {/* 装饰性渐变 */}
                            <div 
                                className={`
                                    absolute bottom-0 left-0 right-0 h-1 
                                    ${podium.position === 1 ? 'bg-yellow-400' : 
                                      podium.position === 2 ? 'bg-gray-400' : 'bg-orange-400'}
                                `}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* 统计信息 */}
            {todayStats.todayTotal > 0 && (
                <div className="text-center">
                    <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                            <Star className="w-4 h-4 text-yellow-500" />
                            <span>今日共 {todayStats.todayTotal} 次打call</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <Trophy className="w-4 h-4 text-blue-500" />
                            <span>{leaderboard.length} 位博主上榜</span>
                        </div>
                    </div>
                </div>
            )}

            {/* 空状态 */}
            {leaderboard.length === 0 && (
                <div className="text-center py-8">
                    <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm mb-2">今日还没有人获得打call</p>
                    <p className="text-gray-400 text-xs">快去为你喜欢的博主打call吧！</p>
                </div>
            )}
        </div>
    );
};

export default CheerLeaderboard;