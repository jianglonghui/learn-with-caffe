import React, { memo } from 'react';
import { Brain, BookOpen, Lightbulb, CheckSquare, ArrowLeft } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useNavigation } from '../hooks/useNavigation';
import LoadingSpinner from './common/LoadingSpinner';

const DeepLearningDisplay = memo(() => {
  const { state, dispatch } = useAppContext();
  const { navigateTo, currentParams } = useNavigation();

  if (!state.deepLearningContent) {
    return <LoadingSpinner />;
  }

  // 调试：输出深度学习内容数据结构
  console.log('DeepLearningDisplay - 原始数据:', state.deepLearningContent);
  console.log('DeepLearningDisplay - 数据类型:', typeof state.deepLearningContent);

  let content;
  if (typeof state.deepLearningContent === 'string') {
    try {
      // 尝试解析JSON字符串
      content = JSON.parse(state.deepLearningContent);
      console.log('DeepLearningDisplay - 解析后的JSON:', content);
    } catch (e) {
      console.log('DeepLearningDisplay - 不是JSON字符串，作为概述处理');
      content = { overview: state.deepLearningContent };
    }
  } else {
    content = state.deepLearningContent;
  }

  const {
    overview,
    concepts = [],
    keyPoints = [],
    examples = [],
    exercises = [],
    summary
  } = content;

  console.log('DeepLearningDisplay - 解析的字段:', {
    overview: !!overview,
    concepts: concepts.length,
    keyPoints: keyPoints.length,
    examples: examples.length,
    exercises: exercises.length,
    conceptsType: Array.isArray(concepts) ? 'array' : typeof concepts,
    firstConcept: concepts[0]
  });

  const moduleTitle = state.selectedOutlineItem?.title || '深度学习内容';

  return (
    <div className="px-6 py-12">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <div className="text-center mb-12">
          <Brain className="w-8 h-8 text-black mx-auto mb-6" />
          <h2 className="text-2xl font-semibold text-black mb-4">{moduleTitle}</h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            深入学习这个模块的核心概念和实践技能
          </p>
        </div>

        {/* 内容概述 */}
        {overview && (
          <div className="border border-gray-200 rounded-xl p-8 mb-8">
            <h3 className="text-lg font-semibold text-black mb-4 flex items-center">
              <BookOpen className="w-5 h-5 mr-2" />
              模块概述
            </h3>
            <div
              className="text-gray-700 leading-relaxed prose max-w-none"
              dangerouslySetInnerHTML={{ __html: overview }}
            />
          </div>
        )}

        {/* 调试信息 - 如果没有任何内容则显示 */}
        {!overview && concepts.length === 0 && keyPoints.length === 0 && examples.length === 0 && exercises.length === 0 && !summary && (
          <div className="border border-orange-200 rounded-xl p-8 mb-8 bg-orange-50">
            <h3 className="text-lg font-semibold text-orange-800 mb-4">调试信息 - 深度学习内容结构</h3>
            <div className="text-sm text-orange-700 mb-4">
              <p>没有解析到任何内容，原始数据结构：</p>
              <p>数据类型: {typeof state.deepLearningContent}</p>
              <p>概述: {overview ? '有' : '无'}</p>
              <p>概念数量: {concepts.length}</p>
              <p>要点数量: {keyPoints.length}</p>
              <p>示例数量: {examples.length}</p>
              <p>练习数量: {exercises.length}</p>
              <p>总结: {summary ? '有' : '无'}</p>
            </div>
            <div className="whitespace-pre-wrap text-xs bg-white p-4 rounded border text-gray-700 max-h-64 overflow-auto">
              {JSON.stringify(state.deepLearningContent, null, 2)}
            </div>
          </div>
        )}

        {/* 核心概念 */}
        {concepts.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-black mb-6 flex items-center">
              <Lightbulb className="w-5 h-5 mr-2" />
              核心概念
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {concepts.map((concept, index) => {
                // 安全处理概念数据
                let title, description, example;

                if (typeof concept === 'string') {
                  title = `概念 ${index + 1}`;
                  description = concept;
                  example = null;
                } else if (typeof concept === 'object' && concept !== null) {
                  title = concept.title || concept.term || concept.name || `概念 ${index + 1}`;
                  description = concept.description || concept.definition || concept.content || JSON.stringify(concept);
                  example = concept.example || concept.examples;
                } else {
                  title = `概念 ${index + 1}`;
                  description = String(concept);
                  example = null;
                }

                return (
                  <div key={index} className="border border-gray-200 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-black mb-3">
                      {title}
                    </h4>
                    <p className="text-gray-700 leading-relaxed">
                      {description}
                    </p>
                    {example && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          <strong>示例:</strong> {typeof example === 'string' ? example : JSON.stringify(example)}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 知识要点 */}
        {keyPoints.length > 0 && (
          <div className="border border-gray-200 rounded-xl p-8 mb-8">
            <h3 className="text-lg font-semibold text-black mb-6 flex items-center">
              <CheckSquare className="w-5 h-5 mr-2" />
              重点知识
            </h3>
            <div className="space-y-4">
              {keyPoints.map((point, index) => (
                <div key={index} className="flex items-start">
                  <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs font-medium mr-4 mt-0.5 flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    {typeof point === 'string' ? (
                      <p className="text-gray-700 leading-relaxed">{point}</p>
                    ) : (
                      <>
                        <h4 className="font-semibold text-black mb-2">{point.title}</h4>
                        <p className="text-gray-700 leading-relaxed">{point.description}</p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 实践示例 */}
        {examples.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-black mb-6">实践示例</h3>
            <div className="space-y-6">
              {examples.map((example, index) => {
                // 安全处理示例数据
                let title, description, code, explanation;

                if (typeof example === 'string') {
                  title = `示例 ${index + 1}`;
                  description = example;
                  code = null;
                  explanation = null;
                } else if (typeof example === 'object' && example !== null) {
                  title = example.title || `示例 ${index + 1}`;
                  description = example.description || example.content;
                  code = example.code;
                  explanation = example.explanation;
                } else {
                  title = `示例 ${index + 1}`;
                  description = String(example);
                  code = null;
                  explanation = null;
                }

                return (
                  <div key={index} className="border border-gray-200 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-black mb-4">
                      {title}
                    </h4>
                    {description && (
                      <p className="text-gray-700 leading-relaxed mb-4">
                        {description}
                      </p>
                    )}
                    {code && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                        <pre className="text-sm text-gray-800 overflow-x-auto">
                          <code>{typeof code === 'string' ? code : JSON.stringify(code, null, 2)}</code>
                        </pre>
                      </div>
                    )}
                    {explanation && (
                      <div className="text-sm text-gray-600 leading-relaxed">
                        <strong>说明:</strong> {explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 练习题 */}
        {exercises.length > 0 && (
          <div className="border border-gray-200 rounded-xl p-8 mb-8">
            <h3 className="text-lg font-semibold text-black mb-6">自测练习</h3>
            <div className="space-y-6">
              {exercises.map((exercise, index) => {
                // 安全处理练习数据
                let title, description, hint, solution;

                if (typeof exercise === 'string') {
                  title = `练习 ${index + 1}`;
                  description = exercise;
                  hint = null;
                  solution = null;
                } else if (typeof exercise === 'object' && exercise !== null) {
                  title = exercise.title || exercise.question || `练习 ${index + 1}`;
                  description = exercise.description || exercise.content;
                  hint = exercise.hint;
                  solution = exercise.solution || exercise.answer;
                } else {
                  title = `练习 ${index + 1}`;
                  description = String(exercise);
                  hint = null;
                  solution = null;
                }

                return (
                  <div key={index} className="border border-gray-100 rounded-lg p-6">
                    <h4 className="font-semibold text-black mb-3">
                      练习 {index + 1}: {title}
                    </h4>
                    {description && (
                      <p className="text-gray-700 mb-4">{description}</p>
                    )}
                    {hint && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                        <p className="text-sm text-yellow-800">
                          <strong>提示:</strong> {hint}
                        </p>
                      </div>
                    )}
                    {solution && (
                      <details className="mt-4">
                        <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-black">
                          查看答案
                        </summary>
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-800">{typeof solution === 'string' ? solution : JSON.stringify(solution)}</p>
                        </div>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 学习总结 */}
        {summary && (
          <div className="border border-gray-200 rounded-xl p-8 mb-8">
            <h3 className="text-lg font-semibold text-black mb-4">学习总结</h3>
            <div
              className="text-gray-700 leading-relaxed prose max-w-none"
              dangerouslySetInnerHTML={{ __html: summary }}
            />
          </div>
        )}

        {/* 导航按钮 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => {
              const learningId = currentParams.learningId || state.currentLearningId;
              navigateTo.outline(learningId);
            }}
            className="bg-gray-100 text-gray-900 py-4 px-8 rounded-xl font-medium hover:bg-gray-200 transition-colors duration-200 border border-gray-200 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            返回学习大纲
          </button>

          <button
            onClick={() => navigateTo.home()}
            className="bg-black text-white py-4 px-8 rounded-xl font-medium hover:bg-gray-800 transition-colors duration-200"
          >
            开始新主题
          </button>
        </div>
      </div>
    </div>
  );
});

DeepLearningDisplay.displayName = 'DeepLearningDisplay';

export default DeepLearningDisplay;