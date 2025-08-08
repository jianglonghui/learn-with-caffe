import React from 'react';
import { useNavigation } from '../../hooks/useNavigation';
import { useStateRestore } from '../../hooks/useStateRestore';

const LearningProgressIndicator = ({ currentStep, learningId, isComplete = false }) => {
    const { navigateTo, currentRoute } = useNavigation();
    const { restoreStateByLearningId } = useStateRestore();

    const steps = [
        {
            id: 'topic',
            label: '选择主题',
            route: 'home',
            isClickable: true
        },
        {
            id: 'confirm',
            label: '确认主题',
            route: 'confirm',
            isClickable: false
        },
        {
            id: 'story',
            label: '学习故事',
            route: 'story',
            isClickable: !!learningId
        },
        {
            id: 'quiz',
            label: '能力测试',
            route: 'quiz',
            isClickable: !!learningId
        },
        {
            id: 'results',
            label: '测试结果',
            route: 'results',
            isClickable: !!learningId
        },
        {
            id: 'assessment',
            label: '能力评估',
            route: 'assessment',
            isClickable: !!learningId
        },
        {
            id: 'outline',
            label: '学习大纲',
            route: 'outline',
            isClickable: !!learningId
        },
        {
            id: 'learning',
            label: '深度学习',
            route: 'learning',
            isClickable: false
        }
    ];

    // 根据当前路由确定当前步骤
    const getCurrentStepIndex = () => {
        if (currentRoute.isHome) return 0;
        if (currentRoute.isConfirm) return 1;
        if (currentRoute.isStory) return 2;
        if (currentRoute.isQuiz) return 3;
        if (currentRoute.isResults) return 4;
        if (currentRoute.isAssessment) return 5;
        if (currentRoute.isOutline) return 6;
        if (currentRoute.isLearning) return 7;
        return 0;
    };

    const currentStepIndex = getCurrentStepIndex();

    const handleStepClick = (step, index) => {
        if (!step.isClickable || index > currentStepIndex) return;

        // 如果有learningId，先恢复对应的数据
        if (learningId && step.route !== 'home') {
            const restored = restoreStateByLearningId(learningId);
            if (!restored) {
                console.warn('无法恢复学习数据，跳转可能不完整');
            }
        }

        switch (step.route) {
            case 'home':
                navigateTo.home();
                break;
            case 'story':
                if (learningId) navigateTo.story(learningId);
                break;
            case 'quiz':
                if (learningId) navigateTo.quiz(learningId);
                break;
            case 'results':
                if (learningId) navigateTo.results(learningId);
                break;
            case 'assessment':
                if (learningId) navigateTo.assessment(learningId);
                break;
            case 'outline':
                if (learningId) navigateTo.outline(learningId);
                break;
            default:
                break;
        }
    };

    const getStepStatus = (index) => {
        if (index < currentStepIndex) return 'completed';
        if (index === currentStepIndex) return 'current';
        return 'upcoming';
    };

    return (
        <div className="bg-white border-b border-gray-100">
            <div className="max-w-5xl mx-auto px-6 py-6">
                <div className="relative">
                    {/* 背景连接线 */}
                    <div className="absolute top-4 left-6 right-6 h-0.5 bg-gray-200"></div>

                    {/* 进度连接线 */}
                    <div
                        className="absolute top-4 left-6 h-0.5 bg-black transition-all duration-500 ease-out"
                        style={{
                            width: `${(currentStepIndex / (steps.length - 1)) * 100}%`
                        }}
                    ></div>

                    {/* 步骤点 */}
                    <div className="relative flex justify-between">
                        {steps.map((step, index) => {
                            const status = getStepStatus(index);
                            const isClickable = step.isClickable && index <= currentStepIndex;

                            return (
                                <div key={step.id} className="flex flex-col items-center">
                                    <button
                                        onClick={() => handleStepClick(step, index)}
                                        disabled={!isClickable}
                                        className={`
                      w-8 h-8 rounded-full border-2 transition-all duration-300 relative z-10
                      ${status === 'completed'
                                                ? 'bg-black border-black'
                                                : status === 'current'
                                                    ? 'bg-white border-black border-4'
                                                    : 'bg-white border-gray-300'
                                            }
                      ${isClickable ? 'cursor-pointer hover:scale-110' : 'cursor-default'}
                    `}
                                    >
                                        {status === 'completed' && (
                                            <svg
                                                className="w-4 h-4 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                            >
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </button>

                                    <span className={`
                    mt-3 text-sm font-medium text-center max-w-20
                    ${status === 'current'
                                            ? 'text-black'
                                            : status === 'completed'
                                                ? 'text-gray-700'
                                                : 'text-gray-400'
                                        }
                  `}>
                                        {step.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LearningProgressIndicator;