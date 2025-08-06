import React from 'react';
import { Home, User, RotateCcw, ArrowLeft } from 'lucide-react';
import { useNavigation } from '../../hooks/useNavigation';
import { useAppContext } from '../../context/AppContext';

const QuickActions = () => {
    const { navigateTo, currentRoute, currentParams } = useNavigation();
    const { state } = useAppContext();

    // 根据当前页面显示不同的快捷操作
    const getActions = () => {
        const actions = [];

        // 主页按钮 - 除了在主页外都显示
        if (!currentRoute.isHome) {
            actions.push({
                label: '主页',
                icon: <Home className="w-5 h-5" />,
                onClick: () => navigateTo.home(),
                className: 'bg-black hover:bg-gray-800 text-white'
            });
        }

        // 个人中心按钮 - 除了在个人中心外都显示
        if (!currentRoute.isProfile) {
            actions.push({
                label: '个人中心',
                icon: <User className="w-5 h-5" />,
                onClick: () => navigateTo.profile(),
                className: 'bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300'
            });
        }

        // 返回按钮 - 在某些页面显示
        if (currentRoute.isAssessment && currentParams.learningId) {
            actions.push({
                label: '返回结果',
                icon: <ArrowLeft className="w-5 h-5" />,
                onClick: () => navigateTo.results(currentParams.learningId),
                className: 'bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300'
            });
        } else if (currentRoute.isOutline && currentParams.learningId) {
            actions.push({
                label: '返回评估',
                icon: <ArrowLeft className="w-5 h-5" />,
                onClick: () => navigateTo.assessment(currentParams.learningId),
                className: 'bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300'
            });
        } else if (currentRoute.isLearning && currentParams.learningId) {
            actions.push({
                label: '返回大纲',
                icon: <ArrowLeft className="w-5 h-5" />,
                onClick: () => navigateTo.outline(currentParams.learningId),
                className: 'bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300'
            });
        }

        // 重新开始按钮 - 在学习流程的后期显示
        if (currentRoute.isResults || currentRoute.isAssessment || currentRoute.isOutline || currentRoute.isLearning) {
            actions.push({
                label: '重新开始',
                icon: <RotateCcw className="w-5 h-5" />,
                onClick: () => {
                    if (window.confirm('确定要重新开始学习吗？当前进度将会丢失。')) {
                        navigateTo.home();
                    }
                },
                className: 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
            });
        }

        return actions;
    };

    const actions = getActions();

    if (actions.length === 0) {
        return null;
    }

    return (
        <div className="fixed bottom-8 right-8 z-50">
            <div className="flex flex-col space-y-3">
                {actions.map((action, index) => (
                    <button
                        key={index}
                        onClick={action.onClick}
                        className={`
              ${action.className} 
              px-4 py-3 rounded-full shadow-lg backdrop-blur-sm
              transition-all duration-200 transform hover:scale-105 active:scale-95
              flex items-center space-x-3 text-sm font-medium
              min-w-[48px] justify-center sm:justify-start
            `}
                        title={action.label}
                    >
                        {action.icon}
                        <span className="hidden sm:inline whitespace-nowrap">{action.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default QuickActions;