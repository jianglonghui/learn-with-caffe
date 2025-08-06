import React, { memo } from 'react';
import { FileText, Clock, Play, Star, CheckCircle } from 'lucide-react';
import { useAppContext, useAPI } from '../context/AppContext';
import { useNavigation } from '../hooks/useNavigation';
import StorageManager from '../services/StorageManager';
import LoadingSpinner from './common/LoadingSpinner';

const OutlineDisplay = memo(() => {
  const { state, dispatch } = useAppContext();
  const api = useAPI();
  const { navigateTo, currentParams } = useNavigation();
  const [learningRecord, setLearningRecord] = React.useState(null);

  // 加载学习记录
  React.useEffect(() => {
    if (state.currentLearningId) {
      const record = StorageManager.getLearningRecord(state.currentLearningId);
      setLearningRecord(record);
    }
  }, [state.currentLearningId]);

  const handleModuleStart = async (item) => {
    dispatch({ type: 'SET_SELECTED_OUTLINE_ITEM', item });

    // 检查是否已有生成的内容
    const existingContent = learningRecord?.learningModules?.[item.id];
    if (existingContent) {
      // 直接使用已生成的内容
      dispatch({ type: 'SET_DEEP_LEARNING_CONTENT', content: existingContent });
      const learningId = currentParams.learningId || state.currentLearningId;
      navigateTo.learning(learningId, item.id);
      return;
    }

    try {
      const result = await api.generateDeepLearning(item);
      dispatch({ type: 'SET_DEEP_LEARNING_CONTENT', content: result });
      const learningId = currentParams.learningId || state.currentLearningId;

      // 保存深度学习内容
      if (learningId) {
        const updatedModules = {
          ...learningRecord?.learningModules,
          [item.id]: result
        };
        StorageManager.updateLearningRecord(learningId, {
          stage: 'learning_started',
          learningModules: updatedModules,
          selectedOutlineItem: item,
          deepLearningContent: result
        });
      }

      navigateTo.learning(learningId, item.id);
    } catch (error) {
      console.error('生成学习内容失败:', error);
    }
  };

  if (!state.learningOutline) {
    return <LoadingSpinner />;
  }

  // 调试：输出大纲数据结构
  console.log('OutlineDisplay - 原始大纲数据:', state.learningOutline);
  console.log('OutlineDisplay - 数据类型:', typeof state.learningOutline);

  let modules = [];
  let description = '';
  let estimatedTime = '';
  let learningPath = '';

  if (typeof state.learningOutline === 'string') {
    try {
      // 尝试解析JSON字符串
      const parsed = JSON.parse(state.learningOutline);
      console.log('OutlineDisplay - 解析后的JSON:', parsed);

      if (parsed.outline && Array.isArray(parsed.outline)) {
        modules = parsed.outline;
        learningPath = parsed.learningPath || '';
        estimatedTime = parsed.totalEstimatedTime || '';
        description = learningPath;
      } else {
        modules = [];
        description = state.learningOutline;
      }
    } catch (e) {
      console.log('OutlineDisplay - 不是JSON字符串，作为描述处理');
      modules = [];
      description = state.learningOutline;
    }
  } else if (state.learningOutline.outline) {
    // API返回格式：{ outline: [...], learningPath: "...", totalEstimatedTime: "..." }
    modules = state.learningOutline.outline || [];
    learningPath = state.learningOutline.learningPath || '';
    estimatedTime = state.learningOutline.totalEstimatedTime || '';
    description = learningPath;
    console.log('OutlineDisplay - 使用API标准格式:', { modules, learningPath, estimatedTime });
  } else if (Array.isArray(state.learningOutline)) {
    // 直接是模块数组
    modules = state.learningOutline;
    console.log('OutlineDisplay - 直接模块数组:', modules);
  } else if (state.learningOutline.modules) {
    // 兼容旧格式：{ modules: [...], description: "..." }
    modules = state.learningOutline.modules || [];
    description = state.learningOutline.description || '';
    estimatedTime = state.learningOutline.estimatedTime || '';
    console.log('OutlineDisplay - 兼容旧格式:', { modules, description, estimatedTime });
  } else {
    // 兜底处理
    modules = [];
    description = '无法解析大纲数据';
    console.log('OutlineDisplay - 兜底处理');
  }
  console.log('OutlineDisplay - 最终提取的字段:', { modules: modules.length, description: !!description, estimatedTime });

  // 计算完成进度
  const completedModules = modules.filter(module =>
    learningRecord?.learningModules?.[module.id]
  ).length;
  const progress = modules.length > 0 ? (completedModules / modules.length) * 100 : 0;

  return (
    <div className="px-6 py-12">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <div className="text-center mb-12">
          <FileText className="w-8 h-8 text-black mx-auto mb-6" />
          <h2 className="text-2xl font-semibold text-black mb-4">个性化学习大纲</h2>
          <p className="text-gray-600 text-lg leading-relaxed max-w-2xl mx-auto">
            根据你的学习能力评估，AI为你量身定制了这个学习计划
          </p>
        </div>

        {/* 学习统计 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="border border-gray-200 rounded-xl p-6 text-center">
            <div className="text-2xl font-bold text-black mb-2">
              {modules.length}
            </div>
            <div className="text-gray-600 text-sm">学习模块</div>
          </div>

          <div className="border border-gray-200 rounded-xl p-6 text-center">
            <div className="text-2xl font-bold text-black mb-2">
              {Math.round(progress)}%
            </div>
            <div className="text-gray-600 text-sm">完成进度</div>
          </div>

          <div className="border border-gray-200 rounded-xl p-6 text-center">
            <div className="text-2xl font-bold text-black mb-2">
              {estimatedTime || '待评估'}
            </div>
            <div className="text-gray-600 text-sm">预计用时</div>
          </div>
        </div>

        {/* 大纲描述 */}
        {description && (
          <div className="border border-gray-200 rounded-xl p-8 mb-8">
            <h3 className="text-lg font-semibold text-black mb-4">学习计划概述</h3>
            <div
              className="text-gray-700 leading-relaxed prose max-w-none"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          </div>
        )}

        {/* 调试信息 - 如果模块数组为空则显示 */}
        {modules.length === 0 && (
          <div className="border border-orange-200 rounded-xl p-8 mb-8 bg-orange-50">
            <h3 className="text-lg font-semibold text-orange-800 mb-4">调试信息 - 大纲数据结构</h3>
            <div className="text-sm text-orange-700 mb-4">
              <p>模块数组为空，原始数据结构：</p>
              <p>数据类型: {typeof state.learningOutline}</p>
              <p>解析后模块数量: {modules.length}</p>
              <p>描述: {description || '无'}</p>
              <p>预计时间: {estimatedTime || '无'}</p>
            </div>
            <div className="whitespace-pre-wrap text-xs bg-white p-4 rounded border text-gray-700 max-h-64 overflow-auto">
              {JSON.stringify(state.learningOutline, null, 2)}
            </div>
          </div>
        )}

        {/* 学习模块列表 */}
        {modules.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-black mb-6">学习模块</h3>
            <div className="space-y-4">
              {modules.map((module, index) => {
                const isCompleted = learningRecord?.learningModules?.[module.id];
                const isLoading = state.loadingStates.generateDeepLearning &&
                  state.selectedOutlineItem?.id === module.id;

                return (
                  <div
                    key={module.id || index}
                    className="border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-colors duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-black text-white text-sm font-medium mr-4">
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-black">
                              {module.title || `模块 ${index + 1}`}
                            </h4>
                            <div className="flex items-center space-x-4 mt-1">
                              {module.duration && (
                                <span className="flex items-center text-sm text-gray-500">
                                  <Clock className="w-4 h-4 mr-1" />
                                  {module.duration}
                                </span>
                              )}
                              {module.difficulty && (
                                <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                                  {module.difficulty === 'easy' ? '基础' :
                                    module.difficulty === 'medium' ? '中等' : '进阶'}
                                </span>
                              )}
                              {isCompleted && (
                                <span className="flex items-center text-green-600 text-sm">
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  已完成
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {module.description && (
                          <p className="text-gray-600 leading-relaxed mb-4 ml-12">
                            {module.description}
                          </p>
                        )}

                        {module.objectives && module.objectives.length > 0 && (
                          <div className="ml-12">
                            <h5 className="text-sm font-medium text-gray-700 mb-2">学习目标:</h5>
                            <ul className="space-y-1">
                              {module.objectives.map((objective, objIndex) => (
                                <li key={objIndex} className="flex items-center text-sm text-gray-600">
                                  <Star className="w-3 h-3 mr-2 text-gray-400" />
                                  {objective}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleModuleStart(module)}
                        disabled={isLoading}
                        className="ml-6 bg-black text-white py-3 px-6 rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center"
                      >
                        {isLoading ? (
                          'Loading...'
                        ) : isCompleted ? (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            继续学习
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            开始学习
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 返回按钮 */}
        <div className="text-center">
          <button
            onClick={() => {
              const learningId = currentParams.learningId || state.currentLearningId;
              navigateTo.assessment(learningId);
            }}
            className="bg-gray-100 text-gray-900 py-4 px-8 rounded-xl font-medium hover:bg-gray-200 transition-colors duration-200 border border-gray-200"
          >
            返回评估报告
          </button>
        </div>
      </div>
    </div>
  );
});

OutlineDisplay.displayName = 'OutlineDisplay';

export default OutlineDisplay;