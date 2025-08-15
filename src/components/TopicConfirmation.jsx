import React, { memo, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';
import { useAppContext, useAPI } from '../context/AppContext';
import { useNavigation } from '../hooks/useNavigation';
import StorageManager from '../services/StorageManager';
import ErrorMessage from './common/ErrorMessage';

const TopicConfirmation = memo(() => {
    const { state, dispatch } = useAppContext();
    const api = useAPI();
    const { navigateTo, currentParams } = useNavigation();

    // 从URL参数获取主题
    const topicFromUrl = decodeURIComponent(currentParams.topic || '');

    // 当组件加载时，如果有URL参数的主题，则清空旧状态并设置新主题
    useEffect(() => {
        if (topicFromUrl) {
            // 清空旧的主题状态，确保使用URL中的新主题
            dispatch({ type: 'SET_TOPIC', topic: '' });
            dispatch({ type: 'SET_CUSTOM_TOPIC', topic: topicFromUrl });
            
            // 自动生成主题确认选项
            api.confirmTopic(topicFromUrl).then(result => {
                if (result && result.options) {
                    dispatch({ type: 'SET_TOPIC_OPTIONS', options: result.options });
                }
            }).catch(error => {
                console.error('生成主题选项失败:', error);
            });
        }
    }, [topicFromUrl, dispatch]);

    // 获取当前显示的主题
    const currentTopic = state.selectedTopic || state.customTopic || topicFromUrl;

    const handleTopicConfirm = async (option) => {
        dispatch({ type: 'SET_CONFIRMED_TOPIC', topic: option.title });

        // 创建学习记录
        const learningId = StorageManager.addLearningRecord({
            topic: option.title,
            stage: 'topic_confirmed'
        });
        dispatch({ type: 'SET_CURRENT_LEARNING_ID', learningId });

        navigateTo.story(learningId);

        try {
            const result = await api.generateStory(option.title);
            dispatch({ type: 'SET_STORY_CONTENT', content: result });
        } catch (error) {
            console.error('生成故事失败:', error);
        }
    };

    return (
        <div className="px-6 py-12">
            <div className="max-w-3xl mx-auto">
                {/* 头部 */}
                <div className="text-center mb-12">
                    <HelpCircle className="w-8 h-8 text-black mx-auto mb-6" />
                    <h2 className="text-2xl font-semibold text-black mb-4">确认学习主题</h2>
                    <p className="text-gray-600 text-lg leading-relaxed">
                        "{currentTopic}" 可能有多种含义，请选择你想要学习的具体内容：
                    </p>
                </div>

                {/* 选项列表 */}
                <div className="space-y-4 mb-8">
                    {state.loadingStates.confirmTopic ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
                            <p className="text-gray-600">正在生成学习选项...</p>
                        </div>
                    ) : state.topicOptions.length > 0 ? (
                        state.topicOptions.map((option) => (
                            <button
                                key={option.id}
                                onClick={() => handleTopicConfirm(option)}
                                disabled={state.loadingStates.generateStory}
                                className="w-full p-6 text-left border border-gray-200 rounded-xl hover:border-black hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                <h3 className="text-lg font-semibold text-black mb-2 group-hover:text-black">
                                    {option.title}
                                </h3>
                                <p className="text-gray-600 leading-relaxed">
                                    {option.description}
                                </p>
                            </button>
                        ))
                    ) : currentTopic ? (
                        <div className="text-center py-8">
                            <p className="text-gray-600 mb-4">暂时无法生成该主题的学习选项</p>
                            <button
                                onClick={() => {
                                    // 直接使用输入的主题创建一个默认选项
                                    const defaultOption = {
                                        id: 'default',
                                        title: currentTopic,
                                        description: `学习关于"${currentTopic}"的基础知识和核心概念`
                                    };
                                    handleTopicConfirm(defaultOption);
                                }}
                                className="bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors"
                            >
                                直接学习：{currentTopic}
                            </button>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-gray-600">请先选择一个主题</p>
                        </div>
                    )}
                </div>

                {/* 返回按钮 */}
                <button
                    onClick={() => navigateTo.home()}
                    className="w-full bg-gray-100 text-gray-900 py-4 px-6 rounded-xl font-medium hover:bg-gray-200 transition-colors duration-200 border border-gray-200"
                >
                    重新选择主题
                </button>

                {/* 错误信息 */}
                {state.errors.generateStory && (
                    <div className="mt-6">
                        <ErrorMessage message={state.errors.generateStory} />
                    </div>
                )}
            </div>
        </div>
    );
});

TopicConfirmation.displayName = 'TopicConfirmation';

export default TopicConfirmation;