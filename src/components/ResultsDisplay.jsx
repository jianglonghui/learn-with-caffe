import React, { memo } from 'react';
import { CheckCircle, XCircle, Clock, Target, TrendingUp, Eye, ArrowRight, Loader2 } from 'lucide-react';
import { useAppContext, useAPI } from '../context/AppContext';
import { useNavigation } from '../hooks/useNavigation';
import StorageManager from '../services/StorageManager';
import ErrorMessage from './common/ErrorMessage';

const ResultsDisplay = memo(() => {
    const { state, dispatch } = useAppContext();
    const api = useAPI();
    const { navigateTo, currentParams } = useNavigation();

    const calculateScore = () => {
        let correct = 0;
        state.questions.forEach(q => {
            const answer = state.answers[q.id];
            if (answer?.selectedOption === q.correctAnswer) {
                correct++;
            }
        });
        return Math.round((correct / state.questions.length) * 100);
    };

    const calculateAverageTime = () => {
        const times = Object.values(state.answerTimes).filter(time => time > 0);
        if (times.length === 0) return 0;
        return Math.round(times.reduce((sum, time) => sum + time, 0) / times.length / 1000);
    };

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getScoreIcon = (score) => {
        if (score >= 80) return <CheckCircle className="w-6 h-6 text-green-600" />;
        if (score >= 60) return <Clock className="w-6 h-6 text-yellow-600" />;
        return <XCircle className="w-6 h-6 text-red-600" />;
    };

    const score = calculateScore();
    const averageTime = calculateAverageTime();
    const isLoading = state.loadingStates.generateAssessment;

    const handleGenerateAssessment = async () => {
        const performanceData = {
            topic: state.confirmedTopic,
            score: score,
            totalQuestions: state.questions.length,
            averageTime: averageTime,
            questions: state.questions.map(q => ({
                question: q.question,
                difficulty: q.difficulty,
                correct: state.answers[q.id]?.selectedOption === q.correctAnswer
            }))
        };

        try {
            const assessment = await api.generateAssessment(performanceData);
            dispatch({ type: 'SET_ASSESSMENT', assessment });
            const learningId = currentParams.learningId || state.currentLearningId;

            // 保存评估数据
            if (learningId) {
                StorageManager.updateLearningRecord(learningId, {
                    stage: 'assessment_completed',
                    learningAssessment: assessment,
                    testResults: performanceData
                });
            }

            navigateTo.assessment(learningId);
        } catch (error) {
            console.error('生成学习评估失败:', error);
        }
    };

    return (
        <div className="px-6 py-12">
            <div className="max-w-4xl mx-auto">
                {/* 头部 */}
                <div className="text-center mb-12">
                    <div className="flex items-center justify-center mb-6">
                        {getScoreIcon(score)}
                    </div>
                    <h2 className="text-2xl font-semibold text-black mb-4">测试完成！</h2>
                    <p className="text-gray-600 text-lg leading-relaxed">
                        你已经完成了关于 "{state.confirmedTopic}" 的能力测试
                    </p>
                </div>

                {/* 成绩概览 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="border border-gray-200 rounded-xl p-6 text-center">
                        <div className="flex items-center justify-center mb-3">
                            <Target className="w-6 h-6 text-black" />
                        </div>
                        <div className={`text-3xl font-bold mb-2 ${getScoreColor(score)}`}>
                            {score}%
                        </div>
                        <div className="text-gray-600 text-sm">
                            正确率
                        </div>
                    </div>

                    <div className="border border-gray-200 rounded-xl p-6 text-center">
                        <div className="flex items-center justify-center mb-3">
                            <Clock className="w-6 h-6 text-black" />
                        </div>
                        <div className="text-3xl font-bold text-black mb-2">
                            {averageTime}s
                        </div>
                        <div className="text-gray-600 text-sm">
                            平均用时
                        </div>
                    </div>

                    <div className="border border-gray-200 rounded-xl p-6 text-center">
                        <div className="flex items-center justify-center mb-3">
                            <TrendingUp className="w-6 h-6 text-black" />
                        </div>
                        <div className="text-3xl font-bold text-black mb-2">
                            {state.questions.length}
                        </div>
                        <div className="text-gray-600 text-sm">
                            题目总数
                        </div>
                    </div>
                </div>

                {/* 题目详情 */}
                <div className="mb-12">
                    <h3 className="text-xl font-semibold text-black mb-6 flex items-center">
                        <Eye className="w-5 h-5 mr-2" />
                        答题详情
                    </h3>

                    <div className="space-y-4">
                        {state.questions.map((question, index) => {
                            const answer = state.answers[question.id];
                            const isCorrect = answer?.selectedOption === question.correctAnswer;
                            const timeSpent = state.answerTimes[question.id];

                            return (
                                <div
                                    key={question.id}
                                    className="border border-gray-200 rounded-xl p-6"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center mb-2">
                                                <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-medium flex items-center justify-center mr-3">
                                                    {index + 1}
                                                </span>
                                                <span className="text-sm font-medium text-gray-600">
                                                    {question.difficulty === 'easy' ? '基础' :
                                                        question.difficulty === 'medium' ? '中等' : '进阶'}
                                                </span>
                                            </div>
                                            <h4 className="font-medium text-black mb-3">
                                                {question.question}
                                            </h4>
                                        </div>

                                        <div className="flex items-center space-x-3 ml-4">
                                            {timeSpent && (
                                                <span className="text-sm text-gray-500">
                                                    {Math.round(timeSpent / 1000)}s
                                                </span>
                                            )}
                                            {isCorrect ? (
                                                <CheckCircle className="w-5 h-5 text-green-600" />
                                            ) : (
                                                <XCircle className="w-5 h-5 text-red-600" />
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center text-sm">
                                            <span className="text-gray-600 mr-2">你的答案:</span>
                                            <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>
                                                {answer?.selectedOption || '未回答'}
                                            </span>
                                        </div>
                                        {!isCorrect && (
                                            <div className="flex items-center text-sm">
                                                <span className="text-gray-600 mr-2">正确答案:</span>
                                                <span className="text-green-600">
                                                    {question.correctAnswer}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={handleGenerateAssessment}
                        disabled={isLoading}
                        className="bg-black text-white py-4 px-8 rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                生成评估报告中...
                            </>
                        ) : (
                            <>
                                查看AI学习能力分析
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </>
                        )}
                    </button>

                    <button
                        onClick={() => navigateTo.home()}
                        className="bg-gray-100 text-gray-900 py-4 px-8 rounded-xl font-medium hover:bg-gray-200 transition-colors duration-200 border border-gray-200"
                    >
                        重新开始
                    </button>
                </div>

                {/* 错误信息 */}
                {state.errors.generateAssessment && (
                    <div className="mt-6">
                        <ErrorMessage message={state.errors.generateAssessment} />
                    </div>
                )}
            </div>
        </div>
    );
});

ResultsDisplay.displayName = 'ResultsDisplay';

export default ResultsDisplay;