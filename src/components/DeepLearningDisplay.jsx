import React, { memo, useState, useEffect } from 'react';
import { Brain, BookOpen, Loader2, CheckCircle, Play, RotateCcw } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useNavigation } from '../hooks/useNavigation';
import LoadingSpinner from './common/LoadingSpinner';
import ConceptsModule from './ConceptsModule';
import KnowledgePointsModule from './KnowledgePointsModule';
import SmartBoardModule from './SmartBoardModule';
import WorkshopModule from './WorkshopModule';
import ErrorMessage from './common/ErrorMessage';
import StorageManager from '../services/StorageManager';

const DeepLearningDisplay = memo(() => {
  const { state, dispatch } = useAppContext();
  const { navigateTo, currentParams } = useNavigation();
  const [quizAnswers, setQuizAnswers] = useState({});
  const [showResults, setShowResults] = useState({});
  const [quizQuestionDetails, setQuizQuestionDetails] = useState({});
  const [conceptExplanations, setConceptExplanations] = useState({});

  // 从已保存的记录中恢复状态
  useEffect(() => {
    if (state.currentLearningId && state.selectedOutlineItem) {
      const existingRecord = StorageManager.getLearningRecord(state.currentLearningId);
      const savedModule = existingRecord?.learningModules?.[state.selectedOutlineItem.id];

      if (savedModule) {
        // 恢复答题状态
        if (savedModule.quizAnswers) {
          setQuizAnswers(savedModule.quizAnswers);
        }
        if (savedModule.showResults) {
          setShowResults(savedModule.showResults);
        }
        if (savedModule.quizQuestionDetails) {
          setQuizQuestionDetails(savedModule.quizQuestionDetails);
        }
        if (savedModule.conceptExplanations) {
          console.log('🔄 恢复概念解释:', Object.keys(savedModule.conceptExplanations).length, '个');
          setConceptExplanations(savedModule.conceptExplanations);
        } else {
          console.log('❌ 没有找到保存的概念解释');
        }
        console.log('已恢复学习模块状态:', state.selectedOutlineItem.id);
      }
    }
  }, [state.currentLearningId, state.selectedOutlineItem]);

  // 保存学习记录（答题状态）
  useEffect(() => {
    if (state.currentLearningId && state.deepLearningContent && state.selectedOutlineItem) {
      // 获取现有的学习模块
      const existingRecord = StorageManager.getLearningRecord(state.currentLearningId);
      const existingModules = existingRecord?.learningModules || {};
      const existingModule = existingModules[state.selectedOutlineItem.id] || {};

      // 累积保存学习模块（保留概念解释，更新答题状态）
      const updatedModules = {
        ...existingModules,
        [state.selectedOutlineItem.id]: {
          ...state.deepLearningContent,
          ...existingModule, // 保留已有的概念解释等数据
          quizAnswers,
          showResults,
          quizQuestionDetails
        }
      };

      StorageManager.updateLearningRecord(state.currentLearningId, {
        stage: 'learning_modules_created',
        learningModules: updatedModules
      });

      console.log('学习模块答题状态已保存:', state.selectedOutlineItem.id);
    }
  }, [state.currentLearningId, state.deepLearningContent, state.selectedOutlineItem, quizAnswers, showResults, quizQuestionDetails]);

  // 单独保存概念解释
  useEffect(() => {
    if (state.currentLearningId && state.selectedOutlineItem && Object.keys(conceptExplanations).length > 0) {
      // 获取现有的学习模块
      const existingRecord = StorageManager.getLearningRecord(state.currentLearningId);
      const existingModules = existingRecord?.learningModules || {};
      const existingModule = existingModules[state.selectedOutlineItem.id] || {};

      // 只更新概念解释
      const updatedModules = {
        ...existingModules,
        [state.selectedOutlineItem.id]: {
          ...existingModule,
          conceptExplanations
        }
      };

      StorageManager.updateLearningRecord(state.currentLearningId, {
        stage: 'learning_modules_created',
        learningModules: updatedModules
      });

      console.log('概念解释已保存:', Object.keys(conceptExplanations).length, '个');
    }
  }, [conceptExplanations, state.currentLearningId, state.selectedOutlineItem]);

  const handleQuizAnswer = (questionIndex, selectedOption, fillAnswer = '') => {
    setQuizAnswers(prev => ({
      ...prev,
      [questionIndex]: { selectedOption, fillAnswer }
    }));
  };

  const handleShowResult = (questionIndex) => {
    setShowResults(prev => ({
      ...prev,
      [questionIndex]: true
    }));
  };

  const resetQuiz = () => {
    setQuizAnswers({});
    setShowResults({});
    setQuizQuestionDetails({});
  };

  const handleQuizDetailedExplanation = async (question, questionIndex) => {
    // 模拟API调用
    const result = {
      detailedExplanation: `这是关于"${question.question}"的详细解析。`,
      wrongOptionsAnalysis: ['错误原因1', '错误原因2', '错误原因3', '错误原因4'],
      knowledgeExtension: '知识扩展内容',
      practicalApplication: '实际应用场景'
    };
    
    setQuizQuestionDetails(prev => ({
      ...prev,
      [questionIndex]: {
        ...prev[questionIndex],
        detailedExplanation: result
      }
    }));
  };

  const handleQuizChallengeAnswer = async (question, questionIndex) => {
    // 模拟API调用
    const result = {
      reanalysis: '重新分析过程',
      finalAnswer: question.correctAnswer,
      confidence: 'high',
      reasoning: '最终推理过程',
      controversies: '可能存在的争议点',
      alternativeViews: '其他可能的观点'
    };
    
    setQuizQuestionDetails(prev => ({
      ...prev,
      [questionIndex]: {
        ...prev[questionIndex],
        challengeResult: result
      }
    }));
  };

  if (!state.deepLearningContent || !state.selectedOutlineItem) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">{state.selectedOutlineItem.title}</h1>
              <p className="text-lg text-gray-600">深度学习内容</p>
            </div>
            <button
              onClick={() => dispatch({ type: 'SET_STEP', step: 'outline' })}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              返回大纲
            </button>
          </div>

          <div className="space-y-8">
            {/* 必学必会概念和知识点 - 横向并列 */}
            {(state.deepLearningContent.concepts || state.deepLearningContent.knowledgePoints) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 必学必会概念 */}
                {state.deepLearningContent.concepts && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 h-96 overflow-hidden">
                    <ConceptsModule
                      concepts={state.deepLearningContent.concepts}
                      onDragStart={(item, type) => console.log('拖拽开始:', item, type)}
                      savedConceptExplanations={conceptExplanations}
                      onConceptExplanationsUpdate={setConceptExplanations}
                    />
                  </div>
                )}

                {/* 必学必会知识点 */}
                {state.deepLearningContent.knowledgePoints && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 h-96 overflow-hidden">
                    <KnowledgePointsModule
                      knowledgePoints={state.deepLearningContent.knowledgePoints}
                      onDragStart={(item, type) => console.log('拖拽开始:', item, type)}
                    />
                  </div>
                )}
              </div>
            )}

            {/* 智能黑板 */}
            {state.deepLearningContent.boardContent && (
              <SmartBoardModule
                boardContent={state.deepLearningContent.boardContent}
              />
            )}

            {/* 智慧工坊 */}
            {(state.deepLearningContent.concepts || state.deepLearningContent.knowledgePoints) && (
              <WorkshopModule
                concepts={state.deepLearningContent.concepts}
                knowledgePoints={state.deepLearningContent.knowledgePoints}
                topic={state.selectedOutlineItem?.title || state.confirmedTopic}
              />
            )}

            {/* 随堂演练 */}
            {state.deepLearningContent.quiz && state.deepLearningContent.quiz.length > 0 && (
              <div className="bg-red-50 rounded-xl p-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
                  <Brain className="w-6 h-6 mr-2 text-red-600" />
                  🏋️ 随堂演练
                  {Object.keys(quizAnswers).length > 0 && (
                    <button
                      onClick={resetQuiz}
                      className="ml-4 px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                    >
                      重新测试
                    </button>
                  )}
                </h2>
                <div className="space-y-6">
                  {state.deepLearningContent.quiz.map((q, index) => {
                    const userAnswer = quizAnswers[index];
                    const showResult = showResults[index];
                    const isCorrect = q.type === 'fill_blank'
                      ? userAnswer?.fillAnswer?.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim()
                      : userAnswer?.selectedOption === q.correctAnswer;

                    return (
                      <div key={index} className="bg-white bg-opacity-70 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-800 mb-3">
                          问题 {index + 1}: {q.question}
                        </h3>

                        {/* 选择题 */}
                        {(q.type === 'multiple_choice' || !q.type) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                            {q.options.map((option, optIndex) => {
                              let buttonClass = 'p-3 rounded text-sm border transition-colors duration-200 text-left';

                              if (showResult) {
                                // 显示结果状态
                                if (optIndex === q.correctAnswer) {
                                  buttonClass += ' bg-green-100 border-green-300 text-green-800';
                                } else if (optIndex === userAnswer?.selectedOption && !isCorrect) {
                                  buttonClass += ' bg-red-100 border-red-300 text-red-800';
                                } else {
                                  buttonClass += ' bg-gray-100 border-gray-200 text-gray-600';
                                }
                              } else {
                                // 选择状态
                                if (optIndex === userAnswer?.selectedOption) {
                                  buttonClass += ' bg-blue-100 border-blue-300 text-blue-800';
                                } else {
                                  buttonClass += ' bg-gray-100 border-gray-200 hover:bg-blue-50 hover:border-blue-200 cursor-pointer';
                                }
                              }

                              return (
                                <button
                                  key={optIndex}
                                  onClick={() => !showResult && handleQuizAnswer(index, optIndex)}
                                  disabled={showResult}
                                  className={buttonClass}
                                >
                                  <span className="font-medium mr-2">
                                    {String.fromCharCode(65 + optIndex)}.
                                  </span>
                                  {option}
                                  {showResult && optIndex === q.correctAnswer && (
                                    <span className="ml-2 text-green-600 font-medium">✓ 正确答案</span>
                                  )}
                                  {showResult && optIndex === userAnswer?.selectedOption && !isCorrect && (
                                    <span className="ml-2 text-red-600 font-medium">✗ 你的选择</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* 填空题 */}
                        {q.type === 'fill_blank' && (
                          <div className="mb-4">
                            <div className="mb-3">
                              <input
                                type="text"
                                value={userAnswer?.fillAnswer || ''}
                                onChange={(e) => !showResult && handleQuizAnswer(index, -1, e.target.value)}
                                placeholder="请输入答案..."
                                disabled={showResult}
                                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${showResult
                                  ? isCorrect
                                    ? 'bg-green-50 border-green-300 text-green-800'
                                    : 'bg-red-50 border-red-300 text-red-800'
                                  : 'border-gray-300'
                                  }`}
                              />
                            </div>

                            {showResult && (
                              <div className="space-y-2">
                                <div className={`p-2 rounded text-sm ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                  <strong>正确答案：</strong>{q.correctAnswer}
                                </div>
                                {userAnswer?.fillAnswer && !isCorrect && (
                                  <div className="p-2 rounded text-sm bg-gray-100 text-gray-700">
                                    <strong>你的答案：</strong>{userAnswer.fillAnswer}
                                  </div>
                                )}
                              </div>
                            )}

                            {!showResult && q.hints && q.hints.length > 0 && (
                              <div className="mt-2">
                                <details className="text-sm">
                                  <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                                    💡 查看提示
                                  </summary>
                                  <div className="mt-2 p-2 bg-blue-50 rounded text-blue-800">
                                    <ul className="list-disc list-inside space-y-1">
                                      {q.hints.map((hint, hintIndex) => (
                                        <li key={hintIndex}>{hint}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </details>
                              </div>
                            )}
                          </div>
                        )}

                        {(((q.type === 'multiple_choice' || !q.type) && userAnswer?.selectedOption !== undefined) ||
                          (q.type === 'fill_blank' && userAnswer?.fillAnswer?.trim())) && !showResult && (
                            <div className="flex justify-center mb-3">
                              <button
                                onClick={() => handleShowResult(index)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                              >
                                查看答案
                              </button>
                            </div>
                          )}

                        {showResult && (
                          <div className="space-y-3">
                            <div className={`p-3 rounded-lg border-l-4 ${isCorrect
                              ? 'bg-green-50 border-green-400'
                              : 'bg-red-50 border-red-400'
                              }`}>
                              <p className={`font-medium ${isCorrect ? 'text-green-800' : 'text-red-800'
                                }`}>
                                {isCorrect ? '🎉 回答正确！' : '❌ 回答错误'}
                              </p>
                            </div>

                            <div className="bg-blue-100 border border-blue-200 rounded-lg p-3">
                              <p className="text-sm text-blue-800">
                                <strong>基础解析：</strong> {q.explanation}
                              </p>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => handleQuizDetailedExplanation(q, index)}
                                className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
                              >
                                详细解析
                              </button>
                              <button
                                onClick={() => handleQuizChallengeAnswer(q, index)}
                                className="flex-1 px-3 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
                              >
                                质疑答案
                              </button>
                            </div>

                            {quizQuestionDetails[index]?.detailedExplanation && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <h4 className="font-semibold text-green-800 mb-2">详细解析</h4>
                                <div className="space-y-2 text-sm text-green-700">
                                  <div>
                                    <strong>详细说明:</strong>
                                    <p>{quizQuestionDetails[index].detailedExplanation.detailedExplanation}</p>
                                  </div>

                                  <div>
                                    <strong>错误选项分析:</strong>
                                    <ul className="list-disc list-inside ml-4">
                                      {quizQuestionDetails[index].detailedExplanation.wrongOptionsAnalysis.map((analysis, idx) => (
                                        <li key={idx}>{analysis}</li>
                                      ))}
                                    </ul>
                                  </div>

                                  <div>
                                    <strong>知识扩展:</strong>
                                    <p>{quizQuestionDetails[index].detailedExplanation.knowledgeExtension}</p>
                                  </div>

                                  <div>
                                    <strong>实际应用:</strong>
                                    <p>{quizQuestionDetails[index].detailedExplanation.practicalApplication}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {quizQuestionDetails[index]?.challengeResult && (
                              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                <h4 className="font-semibold text-orange-800 mb-2">质疑分析结果</h4>
                                <div className="space-y-2 text-sm text-orange-700">
                                  <div>
                                    <strong>重新分析:</strong>
                                    <p>{quizQuestionDetails[index].challengeResult.reanalysis}</p>
                                  </div>

                                  <div>
                                    <strong>AI重新思考后的答案:</strong>
                                    <p className={`font-medium ${(q.type === 'fill_blank'
                                      ? quizQuestionDetails[index].challengeResult.finalAnswer.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim()
                                      : quizQuestionDetails[index].challengeResult.finalAnswer === q.correctAnswer)
                                      ? 'text-green-600'
                                      : 'text-red-600'
                                      }`}>
                                      {q.type === 'fill_blank'
                                        ? quizQuestionDetails[index].challengeResult.finalAnswer
                                        : `${String.fromCharCode(65 + quizQuestionDetails[index].challengeResult.finalAnswer)}. ${q.options[quizQuestionDetails[index].challengeResult.finalAnswer]}`
                                      }
                                      {(q.type === 'fill_blank'
                                        ? quizQuestionDetails[index].challengeResult.finalAnswer.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim()
                                        : quizQuestionDetails[index].challengeResult.finalAnswer === q.correctAnswer)
                                        ? ' (与原答案一致)'
                                        : ' (与原答案不同!)'}
                                    </p>
                                  </div>

                                  <div>
                                    <strong>置信度:</strong>
                                    <span className={`px-2 py-1 rounded text-xs ${quizQuestionDetails[index].challengeResult.confidence === 'high' ? 'bg-green-100 text-green-700' :
                                      quizQuestionDetails[index].challengeResult.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-red-100 text-red-700'
                                      }`}>
                                      {quizQuestionDetails[index].challengeResult.confidence === 'high' ? '高' :
                                        quizQuestionDetails[index].challengeResult.confidence === 'medium' ? '中' : '低'}
                                    </span>
                                  </div>

                                  <div>
                                    <strong>推理过程:</strong>
                                    <p>{quizQuestionDetails[index].challengeResult.reasoning}</p>
                                  </div>

                                  {quizQuestionDetails[index].challengeResult.controversies && (
                                    <div>
                                      <strong>争议点:</strong>
                                      <p>{quizQuestionDetails[index].challengeResult.controversies}</p>
                                    </div>
                                  )}

                                  {quizQuestionDetails[index].challengeResult.alternativeViews && (
                                    <div>
                                      <strong>其他观点:</strong>
                                      <p>{quizQuestionDetails[index].challengeResult.alternativeViews}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {(((q.type === 'multiple_choice' || !q.type) && userAnswer?.selectedOption === undefined) ||
                          (q.type === 'fill_blank' && !userAnswer?.fillAnswer?.trim())) && (
                            <div className="text-center py-2">
                              <p className="text-sm text-gray-500">
                                {(q.type === 'multiple_choice' || !q.type) ? '请选择一个答案' : '请输入答案'}
                              </p>
                            </div>
                          )}
                      </div>
                    );
                  })}
                </div>

                {/* 整体结果统计 */}
                {Object.keys(showResults).length === state.deepLearningContent.quiz.length &&
                  Object.keys(quizAnswers).length === state.deepLearningContent.quiz.length && (
                    <div className="mt-6 bg-white bg-opacity-70 rounded-lg p-4 text-center">
                      <h3 className="font-semibold text-gray-800 mb-2">测试完成！</h3>
                      <p className="text-gray-700">
                        总分：{Object.entries(quizAnswers).filter(([index, answer]) => {
                          const q = state.deepLearningContent.quiz[parseInt(index)];
                          return q.type === 'fill_blank'
                            ? answer?.fillAnswer?.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim()
                            : answer?.selectedOption === q.correctAnswer;
                        }).length} / {state.deepLearningContent.quiz.length}
                      </p>
                    </div>
                  )}
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-center space-x-4">
            <button
              onClick={() => dispatch({ type: 'SET_STEP', step: 'outline' })}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              返回学习大纲
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              开始新主题
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

DeepLearningDisplay.displayName = 'DeepLearningDisplay';

export default DeepLearningDisplay;