import React, { memo } from 'react';
import { TrendingUp, ChevronUp, ChevronDown } from 'lucide-react';
import StorageManager from '../services/StorageManager';

const TopicRankingBoard = memo(({ onTopicSelect }) => {
    const [popularTopics, setPopularTopics] = React.useState([]);
    const [isExpanded, setIsExpanded] = React.useState(false);

    React.useEffect(() => {
        const topics = StorageManager.getPopularTopics(10);
        setPopularTopics(topics);
    }, []);

    const formatLastUsed = (dateString) => {
        if (!dateString) return '未知';

        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays === 0) return '今天';
            if (diffDays === 1) return '昨天';
            if (diffDays < 7) return `${diffDays}天前`;
            if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
            return date.toLocaleDateString();
        } catch (error) {
            return '未知';
        }
    };

    const displayTopics = isExpanded ? popularTopics : popularTopics.slice(0, 3);

    if (popularTopics.length === 0) {
        return (
            <div className="border border-gray-200 rounded-xl p-6">
                <div className="flex items-center mb-3">
                    <TrendingUp className="w-5 h-5 text-black mr-2" />
                    <h3 className="text-lg font-semibold text-black">热门主题排行榜</h3>
                </div>
                <p className="text-gray-600 text-sm">暂无学习记录，开始学习后这里将显示热门主题</p>
            </div>
        );
    }

    return (
        <div className="border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                    <TrendingUp className="w-5 h-5 text-black mr-2" />
                    <h3 className="text-lg font-semibold text-black">热门主题排行榜</h3>
                </div>
                {popularTopics.length > 3 && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-gray-600 hover:text-black text-sm flex items-center transition-colors"
                    >
                        {isExpanded ? (
                            <>
                                <ChevronUp className="w-4 h-4 mr-1" />
                                收起
                            </>
                        ) : (
                            <>
                                <ChevronDown className="w-4 h-4 mr-1" />
                                展开
                            </>
                        )}
                    </button>
                )}
            </div>

            <div className="space-y-3">
                {displayTopics.map((topic, index) => (
                    <div
                        key={index}
                        onClick={() => onTopicSelect && onTopicSelect(topic.topic)}
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 cursor-pointer transition-all duration-200 group"
                    >
                        <div className="flex items-center space-x-3">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                                {index + 1}
                            </div>
                            <div>
                                <div className="font-medium text-gray-900 group-hover:text-black">
                                    {topic.displayName || topic.topic}
                                </div>
                                <div className="text-xs text-gray-500">
                                    最近使用：{formatLastUsed(topic.lastUsed)}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                                {topic.count} 次
                            </div>
                            <div className="text-xs text-gray-500">
                                学习次数
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {!isExpanded && popularTopics.length > 3 && (
                <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                    <button
                        onClick={() => setIsExpanded(true)}
                        className="text-sm text-gray-600 hover:text-black transition-colors"
                    >
                        查看全部 {popularTopics.length} 个热门主题
                    </button>
                </div>
            )}
        </div>
    );
});

TopicRankingBoard.displayName = 'TopicRankingBoard';

export default TopicRankingBoard;