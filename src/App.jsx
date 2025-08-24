import React from 'react';
import AppRouter from './router/AppRouter';
import { useVirtualBloggers } from './hooks/useVirtualBloggers';

// 在开发环境中加载测试工具
if (process.env.NODE_ENV === 'development') {
  import('./utils/testBloggerSystem');
}

const App = () => {
    // 初始化虚拟博主系统
    const { isInitialized, isLoading, error } = useVirtualBloggers();
    
    // 显示加载状态
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">正在初始化虚拟博主系统...</p>
                </div>
            </div>
        );
    }
    
    // 显示错误状态
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center max-w-md">
                    <div className="text-red-500 text-6xl mb-4">❌</div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">系统初始化失败</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                        重新加载
                    </button>
                </div>
            </div>
        );
    }
    
    return <AppRouter />;
};

export default App;