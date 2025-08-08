import React, { memo } from 'react';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { useAppContext, useAPI } from '../context/AppContext';
import { useNavigation } from '../hooks/useNavigation';
import StorageManager from '../services/StorageManager';
import LoadingSpinner from './common/LoadingSpinner';
import ErrorMessage from './common/ErrorMessage';

const StoryDisplay = memo(() => {
    const { state, dispatch } = useAppContext();
    const api = useAPI();
    const { navigateTo, currentParams } = useNavigation();

    const handleStartLearning = async () => {
        const learningId = currentParams.learningId || state.currentLearningId;

        // 保存故事阶段的数据
        if (learningId) {
            StorageManager.updateLearningRecord(learningId, {
                stage: 'story_completed',
                storyContent: state.storyContent,
                confirmedTopic: state.confirmedTopic
            });
        }

        navigateTo.quiz(learningId);

        try {
            const result = await api.generateQuestions(state.confirmedTopic);
            if (result.questions && Array.isArray(result.questions)) {
                dispatch({ type: 'SET_QUESTIONS', questions: result.questions });

                // 保存生成的问题
                if (learningId) {
                    StorageManager.updateLearningRecord(learningId, {
                        questions: result.questions,
                        stage: 'quiz_ready'
                    });
                }
            }
        } catch (error) {
            console.error('生成问题失败:', error);
        }
    };

    if (!state.storyContent) {
        return <LoadingSpinner />;
    }

    const isLoading = state.loadingStates.generateQuestions;

    return (
        <div className="px-6 py-12">
            <div className="max-w-3xl mx-auto">
                {/* 头部 */}
                <div className="text-center mb-12">
                    <Sparkles className="w-8 h-8 text-black mx-auto mb-6" />
                    <h2 className="text-2xl font-semibold text-black mb-4">学习故事</h2>
                    <p className="text-gray-600 text-lg leading-relaxed">
                        在开始评估之前，让我们通过一个小故事来了解这个主题
                    </p>
                </div>

                {/* 故事内容 */}
                <div className="prose prose-lg max-w-none mb-12">
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-8">
                        <div className="text-gray-800 leading-relaxed space-y-4">
                            {typeof state.storyContent === 'string' ? (
                                <div dangerouslySetInnerHTML={{ __html: state.storyContent }} />
                            ) : state.storyContent?.content ? (
                                <div dangerouslySetInnerHTML={{ __html: state.storyContent.content }} />
                            ) : state.storyContent?.story ? (
                                <div dangerouslySetInnerHTML={{ __html: state.storyContent.story }} />
                            ) : (
                                <div>
                                    <p className="text-red-600 text-sm mb-2">调试信息 - API返回的数据结构：</p>
                                    <div className="whitespace-pre-wrap text-xs bg-gray-100 p-3 rounded border">
                                        {JSON.stringify(state.storyContent, null, 2)}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 开始按钮 */}
                <div className="text-center">
                    <button
                        onClick={handleStartLearning}
                        disabled={isLoading}
                        className="bg-black text-white py-4 px-8 rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center mx-auto"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                准备测试中...
                            </>
                        ) : (
                            <>
                                开始能力测试
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </>
                        )}
                    </button>
                </div>

                {/* 错误信息 */}
                {state.errors.generateQuestions && (
                    <div className="mt-6">
                        <ErrorMessage message={state.errors.generateQuestions} />
                    </div>
                )}
            </div>
        </div>
    );
});

StoryDisplay.displayName = 'StoryDisplay';

export default StoryDisplay;