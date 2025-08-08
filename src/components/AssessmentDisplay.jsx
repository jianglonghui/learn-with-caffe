import React, { memo } from 'react';
import { Target, User, TrendingUp, BookOpen, ArrowRight, Loader2 } from 'lucide-react';
import { useAppContext, useAPI } from '../context/AppContext';
import { useNavigation } from '../hooks/useNavigation';
import StorageManager from '../services/StorageManager';
import LoadingSpinner from './common/LoadingSpinner';
import ErrorMessage from './common/ErrorMessage';

const AssessmentDisplay = memo(() => {
  const { state, dispatch } = useAppContext();
  const api = useAPI();
  const { navigateTo, currentParams } = useNavigation();

  // 调试：验证StorageManager导入
  React.useEffect(() => {
    console.log('AssessmentDisplay - StorageManager:', StorageManager);
    console.log('AssessmentDisplay - updateLearningRecord:', typeof StorageManager?.updateLearningRecord);
  }, []);

  const handleGenerateOutline = async () => {
    try {
      const outline = await api.generateOutline(state.learningAssessment, state.confirmedTopic);
      dispatch({ type: 'SET_OUTLINE', outline });
      const learningId = currentParams.learningId || state.currentLearningId;

      // 保存大纲数据
      if (learningId) {
        console.log('准备更新学习记录:', learningId, 'StorageManager:', typeof StorageManager);
        const updateResult = StorageManager.updateLearningRecord(learningId, {
          stage: 'outline_generated',
          outline: outline
        });
        console.log('更新结果:', updateResult);
      }

      navigateTo.outline(learningId);
    } catch (error) {
      console.error('生成学习大纲失败:', error);
      console.error('错误详情:', error.stack);
    }
  };

  if (!state.learningAssessment) {
    return <LoadingSpinner />;
  }

  const isLoading = state.loadingStates.generateOutline;

  // 解析评估数据
  const assessment = typeof state.learningAssessment === 'string'
    ? { summary: state.learningAssessment }
    : state.learningAssessment;

  const {
    summary,
    strengths = [],
    weaknesses = [],
    recommendations = [],
    learningStyle,
    difficulty,
    timeEstimate
  } = assessment;

  return (
    <div className="px-6 py-12">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <div className="text-center mb-12">
          <Target className="w-8 h-8 text-black mx-auto mb-6" />
          <h2 className="text-2xl font-semibold text-black mb-4">学习能力评估报告</h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            基于你的测试表现，AI为你生成了详细的学习能力分析
          </p>
        </div>

        {/* 评估概要 */}
        {summary && (
          <div className="border border-gray-200 rounded-xl p-8 mb-8">
            <h3 className="text-lg font-semibold text-black mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              综合评估
            </h3>
            <div
              className="text-gray-700 leading-relaxed prose max-w-none"
              dangerouslySetInnerHTML={{ __html: summary }}
            />
          </div>
        )}

        {/* 评估详情网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* 优势分析 */}
          {strengths.length > 0 && (
            <div className="border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-black mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                学习优势
              </h3>
              <ul className="space-y-3">
                {strengths.map((strength, index) => (
                  <li key={index} className="flex items-start">
                    <div className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 需要改进 */}
          {weaknesses.length > 0 && (
            <div className="border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-black mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2 text-orange-600" />
                改进方向
              </h3>
              <ul className="space-y-3">
                {weaknesses.map((weakness, index) => (
                  <li key={index} className="flex items-start">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mt-2 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">{weakness}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 学习建议 */}
        {recommendations.length > 0 && (
          <div className="border border-gray-200 rounded-xl p-8 mb-8">
            <h3 className="text-lg font-semibold text-black mb-6 flex items-center">
              <BookOpen className="w-5 h-5 mr-2" />
              个性化学习建议
            </h3>
            <div className="space-y-4">
              {recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start">
                  <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs font-medium mr-4 mt-0.5 flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-gray-700 leading-relaxed">{recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 学习参数 */}
        {(learningStyle || difficulty || timeEstimate) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {learningStyle && (
              <div className="border border-gray-200 rounded-xl p-6 text-center">
                <div className="text-2xl font-bold text-black mb-2">
                  {learningStyle}
                </div>
                <div className="text-gray-600 text-sm">学习风格</div>
              </div>
            )}

            {difficulty && (
              <div className="border border-gray-200 rounded-xl p-6 text-center">
                <div className="text-2xl font-bold text-black mb-2">
                  {difficulty}
                </div>
                <div className="text-gray-600 text-sm">建议难度</div>
              </div>
            )}

            {timeEstimate && (
              <div className="border border-gray-200 rounded-xl p-6 text-center">
                <div className="text-2xl font-bold text-black mb-2">
                  {timeEstimate}
                </div>
                <div className="text-gray-600 text-sm">预计学习时长</div>
              </div>
            )}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleGenerateOutline}
            disabled={isLoading}
            className="bg-black text-white py-4 px-8 rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                生成学习大纲中...
              </>
            ) : (
              <>
                生成个性化学习大纲
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </button>

          <button
            onClick={() => {
              const learningId = currentParams.learningId || state.currentLearningId;
              navigateTo.results(learningId);
            }}
            className="bg-gray-100 text-gray-900 py-4 px-8 rounded-xl font-medium hover:bg-gray-200 transition-colors duration-200 border border-gray-200"
          >
            返回测试结果
          </button>
        </div>

        {/* 错误信息 */}
        {state.errors.generateOutline && (
          <div className="mt-6">
            <ErrorMessage message={state.errors.generateOutline} />
          </div>
        )}
      </div>
    </div>
  );
});

AssessmentDisplay.displayName = 'AssessmentDisplay';

export default AssessmentDisplay;