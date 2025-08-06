import React, { memo } from 'react';
import { HelpCircle } from 'lucide-react';
import { useAppContext, useAPI } from '../context/AppContext';
import { useNavigation } from '../hooks/useNavigation';
import StorageManager from '../services/StorageManager';
import ErrorMessage from './common/ErrorMessage';

const TopicConfirmation = memo(() => {
    const { state, dispatch } = useAppContext();
    const api = useAPI();
    const { navigateTo, currentParams } = useNavigation();

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
                        "{state.selectedTopic || state.customTopic}" 可能有多种含义，请选择你想要学习的具体内容：
                    </p>
                </div>

                {/* 选项列表 */}
                <div className="space-y-4 mb-8">
                    {state.topicOptions.map((option) => (
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
                    ))}
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