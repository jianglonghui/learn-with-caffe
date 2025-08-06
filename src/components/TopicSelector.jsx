import React, { memo } from 'react';
import { BookOpen, Brain, Loader2 } from 'lucide-react';
import { useAppContext, useAPI } from '../context/AppContext';
import { useNavigation } from '../hooks/useNavigation';
import StorageManager from '../services/StorageManager';
import ErrorMessage from './common/ErrorMessage';
import TopicRankingBoard from './TopicRankingBoard';

const TopicSelector = memo(() => {
    const { state, dispatch } = useAppContext();
    const api = useAPI();
    const { navigateTo } = useNavigation();

    const predefinedTopics = [
        'JavaScript基础', 'Python编程', 'React开发', 'HTML/CSS', 'Node.js', 'Vue.js',
        '数据结构与算法', 'MySQL数据库', 'Git版本控制', 'Linux系统', '网络安全', '人工智能',
        '区块链技术', '机器学习', '数据分析', '产品设计', '项目管理', '英语学习', '数学基础', '物理学'
    ];

    const handleStartQuiz = async () => {
        const topic = state.selectedTopic || state.customTopic;
        if (!topic.trim()) return;

        // 记录主题使用统计
        StorageManager.recordTopicUsage(topic.trim());

        try {
            const result = await api.confirmTopic(topic.trim());

            if (result.needsConfirmation && result.options) {
                dispatch({ type: 'SET_TOPIC_OPTIONS', options: result.options });
                navigateTo.confirm(topic);
            } else {
                const confirmedTopic = result.confirmedTopic || topic;
                dispatch({ type: 'SET_CONFIRMED_TOPIC', topic: confirmedTopic });

                // 创建学习记录
                const learningId = StorageManager.addLearningRecord({
                    topic: confirmedTopic,
                    stage: 'topic_confirmed'
                });
                dispatch({ type: 'SET_CURRENT_LEARNING_ID', learningId });

                navigateTo.story(learningId);

                const storyResult = await api.generateStory(confirmedTopic);
                dispatch({ type: 'SET_STORY_CONTENT', content: storyResult });
            }
        } catch (error) {
            console.error('启动测试失败:', error);
        }
    };

    const handleTopicFromRanking = (topic) => {
        dispatch({ type: 'SET_TOPIC', topic });
    };

    const isLoading = state.loadingStates.confirmTopic || state.loadingStates.generateStory;

    return (
        <div className="px-6 py-12">
            <div className="max-w-4xl mx-auto">
                {/* 头部 */}
                <div className="text-center mb-16">
                    <div className="flex items-center justify-center mb-6">
                        <Brain className="w-8 h-8 text-black mr-3" />
                        <h1 className="text-3xl font-semibold text-black">AI个性化学习系统</h1>
                    </div>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
                        选择一个主题，AI将评估你的学习能力并制定个性化学习大纲
                    </p>
                </div>

                {/* 主要内容区域 */}
                <div className="space-y-12">
                    {/* 快速选择主题 */}
                    <div>
                        <h2 className="text-xl font-semibold text-black mb-6 flex items-center">
                            <BookOpen className="w-5 h-5 mr-2 text-black" />
                            快速选择主题
                        </h2>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {predefinedTopics.map((topic, index) => (
                                <button
                                    key={index}
                                    onClick={() => dispatch({ type: 'SET_TOPIC', topic })}
                                    className={`p-4 rounded-xl border transition-all duration-200 text-sm font-medium text-left ${state.selectedTopic === topic
                                        ? 'border-black bg-black text-white'
                                        : 'border-gray-200 hover:border-black hover:bg-gray-50 text-gray-900'
                                        }`}
                                >
                                    {topic}
                                </button>
                            ))}
                        </div>

                        {/* 热门主题排行榜 */}
                        <div className="mb-6">
                            <TopicRankingBoard onTopicSelect={handleTopicFromRanking} />
                        </div>

                        {/* 自定义主题输入 */}
                        <div>
                            <h3 className="text-lg font-semibold text-black mb-4">自定义主题</h3>
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    value={state.customTopic}
                                    onChange={(e) => dispatch({ type: 'SET_CUSTOM_TOPIC', topic: e.target.value })}
                                    placeholder="输入你想学习的主题，例如：Adobe Photoshop基础操作"
                                    className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-colors duration-200 text-gray-900 placeholder-gray-500"
                                    maxLength={200}
                                />

                                <button
                                    onClick={handleStartQuiz}
                                    disabled={(!state.selectedTopic && !state.customTopic.trim()) || isLoading}
                                    className="w-full bg-black text-white py-4 px-6 rounded-xl font-medium hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            正在处理...
                                        </>
                                    ) : (
                                        '开始学习评估'
                                    )}
                                </button>
                            </div>
                        </div>

                        {state.errors.confirmTopic && (
                            <div className="mt-6">
                                <ErrorMessage
                                    message={state.errors.confirmTopic}
                                    onRetry={handleStartQuiz}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

export default TopicSelector;