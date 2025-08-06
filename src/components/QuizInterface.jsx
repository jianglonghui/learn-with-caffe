import React, { memo } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useNavigation } from '../hooks/useNavigation';
import StorageManager from '../services/StorageManager';
import LoadingSpinner from './common/LoadingSpinner';

const QuizInterface = memo(() => {
    const { state, dispatch } = useAppContext();
    const { navigateTo, currentParams } = useNavigation();
    const [questionStartTime, setQuestionStartTime] = React.useState(Date.now());

    React.useEffect(() => {
        setQuestionStartTime(Date.now());
    }, [state.currentQuestion]);

    const saveAnswer = (selectedOption, customAnswer = '') => {
        const timeSpent = Date.now() - questionStartTime;
        const question = state.questions[state.currentQuestion];
        const learningId = currentParams.learningId || state.currentLearningId;

        dispatch({
            type: 'SET_ANSWER',
            questionId: question.id,
            answer: { selectedOption, customAnswer, timestamp: new Date().toISOString() },
            time: timeSpent
        });

        // 实时保存答题数据
        if (learningId) {
            const updatedAnswers = {
                ...state.answers,
                [question.id]: { selectedOption, customAnswer, timestamp: new Date().toISOString() }
            };
            const updatedTimes = {
                ...state.answerTimes,
                [question.id]: timeSpent
            };

            StorageManager.updateLearningRecord(learningId, {
                answers: updatedAnswers,
                answerTimes: updatedTimes,
                currentQuestion: state.currentQuestion,
                stage: 'quiz_in_progress'
            });
        }
    };

    const nextQuestion = () => {
        const learningId = currentParams.learningId || state.currentLearningId;

        if (state.currentQuestion < state.questions.length - 1) {
            dispatch({ type: 'SET_CURRENT_QUESTION', index: state.currentQuestion + 1 });
            // 保存当前进度
            if (learningId) {
                StorageManager.updateLearningRecord(learningId, {
                    currentQuestion: state.currentQuestion + 1
                });
            }
        } else {
            // 测试完成，保存完整数据
            if (learningId) {
                StorageManager.updateLearningRecord(learningId, {
                    stage: 'quiz_completed',
                    answers: state.answers,
                    answerTimes: state.answerTimes,
                    questions: state.questions
                });
            }
            navigateTo.results(learningId);
        }
    };

    const prevQuestion = () => {
        if (state.currentQuestion > 0) {
            dispatch({ type: 'SET_CURRENT_QUESTION', index: state.currentQuestion - 1 });
        }
    };

    const handleOptionSelect = (option) => {
        saveAnswer(option);
        // 短暂延迟后自动进入下一题
        setTimeout(() => {
            nextQuestion();
        }, 500);
    };

    if (!state.questions || state.questions.length === 0) {
        return <LoadingSpinner />;
    }

    const question = state.questions[state.currentQuestion];
    const currentAnswer = state.answers[question.id];
    const progress = ((state.currentQuestion + 1) / state.questions.length) * 100;

    return (
        <div className="px-6 py-12">
            <div className="max-w-3xl mx-auto">
                {/* 进度条 */}
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-600">
                            问题 {state.currentQuestion + 1} / {state.questions.length}
                        </span>
                        <span className="text-sm font-medium text-gray-600">
                            {Math.round(progress)}% 完成
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-black h-2 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* 问题内容 */}
                <div className="mb-8">
                    <div className="mb-6">
                        {question.difficulty && (
                            <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full mb-4">
                                {question.difficulty === 'easy' ? '基础' :
                                    question.difficulty === 'medium' ? '中等' : '进阶'}
                            </span>
                        )}
                        <h2 className="text-xl font-semibold text-black leading-relaxed">
                            {question.question}
                        </h2>
                    </div>

                    {/* 选项 */}
                    <div className="space-y-3">
                        {question.options?.map((option, index) => {
                            const isSelected = currentAnswer?.selectedOption === option;
                            return (
                                <button
                                    key={index}
                                    onClick={() => handleOptionSelect(option)}
                                    className={`w-full p-4 text-left border rounded-xl transition-all duration-200 ${isSelected
                                        ? 'border-black bg-black text-white'
                                        : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium">{option}</span>
                                        {isSelected && (
                                            <CheckCircle className="w-5 h-5 text-white flex-shrink-0" />
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* 自定义答案 */}
                    {question.allowCustomAnswer && (
                        <div className="mt-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                或者写下你的答案：
                            </label>
                            <textarea
                                value={currentAnswer?.customAnswer || ''}
                                onChange={(e) => {
                                    dispatch({
                                        type: 'SET_ANSWER',
                                        questionId: question.id,
                                        answer: {
                                            selectedOption: currentAnswer?.selectedOption || '',
                                            customAnswer: e.target.value,
                                            timestamp: new Date().toISOString()
                                        }
                                    });
                                }}
                                placeholder="请输入你的答案..."
                                className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-colors duration-200 resize-none"
                                rows={3}
                            />
                        </div>
                    )}
                </div>

                {/* 导航按钮 */}
                <div className="flex justify-between items-center">
                    <button
                        onClick={prevQuestion}
                        disabled={state.currentQuestion === 0}
                        className="flex items-center px-6 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                        <ChevronLeft className="w-5 h-5 mr-2" />
                        上一题
                    </button>

                    <button
                        onClick={nextQuestion}
                        disabled={!currentAnswer?.selectedOption && !currentAnswer?.customAnswer?.trim()}
                        className="flex items-center px-6 py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                        {state.currentQuestion === state.questions.length - 1 ? '完成测试' : '下一题'}
                        <ChevronRight className="w-5 h-5 ml-2" />
                    </button>
                </div>
            </div>
        </div>
    );
});

QuizInterface.displayName = 'QuizInterface';

export default QuizInterface;