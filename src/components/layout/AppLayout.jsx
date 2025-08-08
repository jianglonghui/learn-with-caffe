import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { useNavigation } from '../../hooks/useNavigation';
import LearningProgressIndicator from '../navigation/LearningProgressIndicator';
import QuickActions from '../navigation/QuickActions';

const AppLayout = ({ children, showNavigation = true }) => {
    const { state } = useAppContext();
    const { currentRoute, currentParams } = useNavigation();

    // 判断是否应该显示导航（排除个人中心等特殊页面）
    const shouldShowProgressIndicator = showNavigation && !currentRoute.isProfile;

    return (
        <div className="min-h-screen bg-white">
            {/* 进度指示器 - 仅在学习流程中显示 */}
            {shouldShowProgressIndicator && (
                <LearningProgressIndicator
                    learningId={currentParams.learningId || state.currentLearningId}
                />
            )}

            {/* 主要内容区域 */}
            <main className="flex-1">
                {children}
            </main>

            {/* 快捷操作按钮 */}
            <QuickActions />
        </div>
    );
};

export default AppLayout;