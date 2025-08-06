import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import ErrorBoundary from '../components/ErrorBoundary';
import LoadingSpinner from '../components/common/LoadingSpinner';
import AppLayout from '../components/layout/AppLayout';

// 导入所有页面组件
import TopicSelector from '../components/TopicSelector';
import TopicConfirmation from '../components/TopicConfirmation';
import StoryDisplay from '../components/StoryDisplay';
import QuizInterface from '../components/QuizInterface';
import ResultsDisplay from '../components/ResultsDisplay';
import AssessmentDisplay from '../components/AssessmentDisplay';
import OutlineDisplay from '../components/OutlineDisplay';
import DeepLearningDisplay from '../components/DeepLearningDisplay';
import PersonalCenter from '../components/PersonalCenter';

const AppRouter = () => {
    return (
        <ErrorBoundary>
            <AppProvider>
                <Router>
                    <Suspense fallback={<LoadingSpinner />}>
                        <AppLayout>
                            <Routes>
                                {/* 主页 - 主题选择 */}
                                <Route path="/" element={<TopicSelector />} />

                                {/* 主题确认 */}
                                <Route path="/confirm/:topic" element={<TopicConfirmation />} />

                                {/* 学习故事 */}
                                <Route path="/story/:learningId" element={<StoryDisplay />} />

                                {/* 能力测试 */}
                                <Route path="/quiz/:learningId" element={<QuizInterface />} />
                                <Route path="/quiz/:learningId/generating" element={<QuizInterface />} />

                                {/* 测试结果 */}
                                <Route path="/results/:learningId" element={<ResultsDisplay />} />

                                {/* 能力评估 */}
                                <Route path="/assessment/:learningId" element={<AssessmentDisplay />} />

                                {/* 学习大纲 */}
                                <Route path="/outline/:learningId" element={<OutlineDisplay />} />

                                {/* 深度学习模块 */}
                                <Route path="/learning/:learningId/:moduleId" element={<DeepLearningDisplay />} />

                                {/* 个人中心 */}
                                <Route path="/profile" element={<PersonalCenter />} />

                                {/* 重定向无效路径到主页 */}
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </AppLayout>
                    </Suspense>
                </Router>
            </AppProvider>
        </ErrorBoundary>
    );
};

export default AppRouter;