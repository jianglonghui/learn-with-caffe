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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 mb-6 overflow-hidden">
            {/* 头部 */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-50">
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-full flex items-center justify-center">
                        <Trophy className="text-yellow-600" size={16} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 text-lg">今日打Call榜</h3>
                        <span className="text-xs text-gray-500">
                            今日共 {todayStats.todayTotal} 次打call
                        </span>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                        每日0点重置
                    </div>
                </div>
            </div>

            {/* 颁奖台 */}
            <div className="px-6 py-8 bg-gradient-to-b from-gray-50 to-white">
                <div className="flex items-end justify-center space-x-4">
                    {podiumData.map((podium, index) => (
                        <div 
                            key={podium.position} 
                            className="flex flex-col items-center"
                            style={{ order: index === 1 ? 0 : index + 1 }}
                        >
                            {/* 用户信息 */}
                            {podium.user ? (
                                <div 
                                    className="mb-3 cursor-pointer transform hover:scale-105 transition-all duration-300 group"
                                    onClick={() => handleUserClick(podium.user.userId)}
                                >
                                    {/* 头像容器 */}
                                    <div className="relative">
                                        <div className={`
                                            ${podium.position === 1 ? 'w-16 h-16 text-3xl' : 
                                              podium.position === 2 ? 'w-14 h-14 text-2xl' : 'w-12 h-12 text-xl'}
                                            rounded-full bg-gradient-to-r ${
                                                podium.position === 1 ? 'from-yellow-100 to-orange-100 border-4 border-yellow-300' :
                                                podium.position === 2 ? 'from-gray-100 to-slate-100 border-3 border-gray-300' :
                                                'from-orange-100 to-red-100 border-2 border-orange-300'
                                            } 
                                            flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow
                                        `}>
                                            {podium.user.avatar}
                                        </div>
                                        
                                        {/* 排名徽章 */}
                                        <div className={`
                                            absolute -top-2 -right-2 ${
                                                podium.position === 1 ? 'w-8 h-8' : 'w-6 h-6'
                                            } rounded-full ${
                                                podium.position === 1 ? 'bg-yellow-500' :
                                                podium.position === 2 ? 'bg-gray-400' : 'bg-orange-400'
                                            } flex items-center justify-center shadow-md
                                        `}>
                                            {React.cloneElement(podium.icon, {
                                                size: podium.position === 1 ? 18 : 14,
                                                className: "text-white"
                                            })}
                                        </div>
                                    </div>
                                    
                                    {/* 用户信息 */}
                                    <div className="text-center mt-2">
                                        <div className={`text-sm font-semibold ${podium.textColor} truncate max-w-20`}>
                                            {podium.user.name}
                                        </div>
                                        <div className={`text-xs ${podium.textColor} font-bold bg-white px-2 py-1 rounded-full mt-1 border`}>
                                            {podium.user.count} 次
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-3 flex flex-col items-center opacity-50">
                                    <div className={`
                                        ${podium.position === 1 ? 'w-16 h-16 text-3xl' : 
                                          podium.position === 2 ? 'w-14 h-14 text-2xl' : 'w-12 h-12 text-xl'}
                                        rounded-full bg-gray-100 border-2 border-gray-200
                                        flex items-center justify-center
                                    `}>
                                        👤
                                    </div>
                                    <div className="text-center mt-2">
                                        <div className="text-xs text-gray-400">暂无</div>
                                        <div className="text-xs text-gray-400 bg-white px-2 py-1 rounded-full mt-1 border">
                                            0 次
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 简化的台阶指示器 */}
                            <div className={`
                                w-20 h-2 rounded-full mt-2 ${
                                    podium.position === 1 ? 'bg-gradient-to-r from-yellow-400 to-orange-400' :
                                    podium.position === 2 ? 'bg-gradient-to-r from-gray-300 to-gray-400' :
                                    'bg-gradient-to-r from-orange-300 to-red-400'
                                }
                            `} />
                        </div>
                    ))}
                </div>
            </div>

            {/* 统计信息 */}
            {todayStats.todayTotal > 0 && (
                <div className="px-6 pb-6">
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
                        <div className="flex items-center justify-center space-x-6 text-sm">
                            <div className="flex items-center space-x-2 text-blue-700">
                                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                    <Star className="w-3 h-3 text-white" />
                                </div>
                                <span className="font-medium">今日 {todayStats.todayTotal} 次</span>
                            </div>
                            <div className="w-px h-4 bg-gray-300"></div>
                            <div className="flex items-center space-x-2 text-purple-700">
                                <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                                    <Trophy className="w-3 h-3 text-white" />
                                </div>
                                <span className="font-medium">{leaderboard.length} 位上榜</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 空状态 */}
            {leaderboard.length === 0 && (
                <div className="text-center py-12 px-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Trophy className="w-8 h-8 text-yellow-600" />
                    </div>
                    <p className="text-gray-600 text-base font-medium mb-2">今日还没有人获得打call</p>
                    <p className="text-gray-400 text-sm">快去为你喜欢的博主打call，让他们上榜吧！</p>
                </div>
            )}
        </div>
    );
};

export default CheerLeaderboard;