import React, { memo, useState } from 'react';
import { Target, Sparkles, Loader2, RotateCcw, BookOpen } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const WorkshopModule = memo(({ concepts, knowledgePoints, topic }) => {
  const { dispatch } = useAppContext();
  const [simulatorData, setSimulatorData] = useState(null);
  const [parameters, setParameters] = useState({});
  const [currentScenario, setCurrentScenario] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showSelection, setShowSelection] = useState(true);
  const [showVoxelSimulator, setShowVoxelSimulator] = useState(false);

  // 选择概念或知识点
  const handleItemSelect = (item, type) => {
    setSelectedItems(prev => {
      const isSelected = prev.some(selected => selected.id === item.id && selected.type === type);
      if (isSelected) {
        return prev.filter(selected => !(selected.id === item.id && selected.type === type));
      } else {
        return [...prev, { ...item, type }];
      }
    });
  };

  // 生成模拟器
  const generateSimulator = async () => {
    if (selectedItems.length === 0) {
      alert('请至少选择一个概念或知识点来生成模拟器');
      return;
    }

    setIsGenerating(true);
    try {
      // 分离概念和知识点
      const selectedConcepts = selectedItems.filter(item => item.type === 'concept');
      const selectedKnowledgePoints = selectedItems.filter(item => item.type === 'knowledgePoint');

      // 模拟API响应
      const result = {
        simulator: {
          title: `${topic}模拟器`,
          description: `基于选中的概念和知识点生成的交互式模拟器`,
          type: 'interactive_simulator',
          instructions: '通过调整参数来观察不同的效果',
          parameters: [
            {
              id: 'param1',
              name: '参数1',
              type: 'slider',
              min: 0,
              max: 100,
              default: 50,
              step: 1,
              description: '第一个控制参数'
            },
            {
              id: 'param2',
              name: '参数2',
              type: 'select',
              options: ['选项A', '选项B', '选项C'],
              default: '选项A',
              description: '第二个控制参数'
            }
          ],
          visualization: {
            type: 'svg',
            width: 400,
            height: 300,
            elements: [
              {
                id: 'element1',
                type: 'shape',
                shape: 'rect',
                x: 50,
                y: 50,
                width: 100,
                height: 100,
                properties: {
                  fill: '#ff0000',
                  stroke: '#000000'
                }
              }
            ]
          },
          calculations: [
            {
              id: 'calc1',
              formula: 'result = param1 * 2 + param2',
              description: '计算公式说明'
            }
          ],
          feedback: [
            {
              condition: 'param1 > 50',
              message: '当参数1大于50时的反馈',
              type: 'success'
            }
          ]
        },
        learningObjectives: ['理解概念关系', '掌握参数影响'],
        scenarios: [
          {
            name: '场景1',
            description: '基础场景',
            parameters: {
              param1: 30,
              param2: '选项A'
            },
            expectedOutcome: '预期结果1'
          }
        ]
      };

      setSimulatorData(result);
      dispatch({ type: 'SET_WORKSHOP_SIMULATOR', simulator: result });
      setShowSelection(false);

      // 初始化参数
      const initialParams = {};
      if (result.simulator?.parameters) {
        result.simulator.parameters.forEach(param => {
          initialParams[param.id] = param.default || 0;
        });
      }
      setParameters(initialParams);
    } catch (error) {
      console.error('生成模拟器失败:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // 启动3D体素模拟器
  const startVoxelSimulator = () => {
    setShowVoxelSimulator(true);
  };

  // 返回选择界面
  const backToSelection = () => {
    setShowSelection(true);
    setShowVoxelSimulator(false);
  };

  // 更新参数
  const updateParameter = (paramId, value) => {
    setParameters(prev => ({
      ...prev,
      [paramId]: value
    }));
  };

  // 应用场景
  const applyScenario = (scenario) => {
    setCurrentScenario(scenario);
    setParameters(scenario.parameters);
  };

  // 计算模拟结果
  const calculateResults = () => {
    if (!simulatorData?.simulator?.calculations) return {};

    const results = {};
    simulatorData.simulator.calculations.forEach(calc => {
      try {
        // 简单的公式计算（使用安全的数学表达式计算器）
        const formula = calc.formula.replace(/result\s*=\s*/, '');
        const paramNames = Object.keys(parameters);
        let evalFormula = formula;

        paramNames.forEach(paramName => {
          evalFormula = evalFormula.replace(new RegExp(paramName, 'g'), parameters[paramName]);
        });

        // 使用安全的数学表达式计算器
        results[calc.id] = safeEvaluate(evalFormula, parameters);
      } catch (error) {
        console.error('计算失败:', error);
        results[calc.id] = 0;
      }
    });

    return results;
  };

  // 获取反馈信息
  const getFeedback = () => {
    if (!simulatorData?.simulator?.feedback) return [];

    return simulatorData.simulator.feedback.filter(feedback => {
      try {
        const condition = feedback.condition;
        const paramNames = Object.keys(parameters);
        let evalCondition = condition;

        paramNames.forEach(paramName => {
          evalCondition = evalCondition.replace(new RegExp(paramName, 'g'), parameters[paramName]);
        });

        // 使用安全的数学表达式计算器
        return safeEvaluate(evalCondition, parameters);
      } catch (error) {
        console.error('反馈条件评估失败:', error);
        return false;
      }
    });
  };

  // 安全的数学表达式计算器
  const safeEvaluate = (expression, context) => {
    // 移除所有可能的危险字符
    const sanitized = expression.replace(/[^0-9+\-*/().\s<>!=&|]/g, '');
    
    // 简单的数学表达式计算（仅支持基本运算）
    try {
      // 使用 Function 构造函数作为更安全的替代方案
      const func = new Function(...Object.keys(context), `return ${sanitized}`);
      return func(...Object.values(context));
    } catch (error) {
      console.error('表达式计算失败:', error);
      return 0;
    }
  };

  // 渲染参数控件
  const renderParameterControl = (param) => {
    switch (param.type) {
      case 'slider':
        return (
          <div key={param.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {param.name}
            </label>
            <input
              type="range"
              min={param.min}
              max={param.max}
              step={param.step || 1}
              value={parameters[param.id] || param.default}
              onChange={(e) => updateParameter(param.id, parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{param.min}</span>
              <span className="font-medium">{parameters[param.id] || param.default}</span>
              <span>{param.max}</span>
            </div>
            {param.description && (
              <p className="text-xs text-gray-600 mt-1">{param.description}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={param.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {param.name}
            </label>
            <select
              value={parameters[param.id] || param.default}
              onChange={(e) => updateParameter(param.id, e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {param.options.map((option, index) => (
                <option key={index} value={option}>{option}</option>
              ))}
            </select>
            {param.description && (
              <p className="text-xs text-gray-600 mt-1">{param.description}</p>
            )}
          </div>
        );

      case 'input':
        return (
          <div key={param.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {param.name}
            </label>
            <input
              type="number"
              min={param.min}
              max={param.max}
              step={param.step || 1}
              value={parameters[param.id] || param.default}
              onChange={(e) => updateParameter(param.id, parseFloat(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {param.description && (
              <p className="text-xs text-gray-600 mt-1">{param.description}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // 渲染可视化
  const renderVisualization = () => {
    if (!simulatorData?.simulator?.visualization) return null;

    const viz = simulatorData.simulator.visualization;
    const results = calculateResults();

    return (
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">模拟效果</h3>
        <div
          className="border border-gray-300 rounded-lg bg-gray-50"
          style={{ width: viz.width, height: viz.height }}
        >
          <svg width={viz.width} height={viz.height} className="w-full h-full">
            {viz.elements.map((element, index) => {
              const elementProps = {
                ...element.properties,
                ...(results[element.id] && {
                  fill: results[element.id] > 50 ? '#4ade80' : '#f87171',
                  stroke: results[element.id] > 50 ? '#22c55e' : '#ef4444'
                })
              };

              switch (element.type) {
                case 'shape':
                  if (element.shape === 'rect') {
                    return (
                      <rect
                        key={index}
                        x={element.x}
                        y={element.y}
                        width={element.width}
                        height={element.height}
                        fill={elementProps.fill}
                        stroke={elementProps.stroke}
                        strokeWidth="2"
                      />
                    );
                  } else if (element.shape === 'circle') {
                    return (
                      <circle
                        key={index}
                        cx={element.x + element.width / 2}
                        cy={element.y + element.height / 2}
                        r={Math.min(element.width, element.height) / 2}
                        fill={elementProps.fill}
                        stroke={elementProps.stroke}
                        strokeWidth="2"
                      />
                    );
                  }
                  return null;

                case 'text':
                  return (
                    <text
                      key={index}
                      x={element.x}
                      y={element.y}
                      fill={elementProps.fill || '#000000'}
                      fontSize={elementProps.fontSize || '16'}
                      fontWeight={elementProps.fontWeight || 'normal'}
                    >
                      {elementProps.text || element.text}
                    </text>
                  );

                default:
                  return null;
              }
            })}
          </svg>
        </div>
      </div>
    );
  };

  // 显示3D体素模拟器
  if (showVoxelSimulator) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
            <Target className="w-6 h-6 mr-2 text-purple-600" />
            🌍 3D体素世界模拟器
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (window.confirm('确定要重置所有内容吗？这将清空所有绘图、3D场景和背包物品。')) {
                  console.log('智慧工坊: 用户请求重置');
                }
              }}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 flex items-center"
              title="重置所有内容"
            >
              🔄 重置
            </button>
            <button
              onClick={backToSelection}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 flex items-center"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              返回选择
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 mb-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">🎨 3D绘图与物理模拟</h3>
          <p className="text-gray-600 mb-4">
            这是一个强大的3D体素世界编辑器，你可以：
          </p>
          <ul className="text-sm text-gray-600 space-y-2 mb-4">
            <li>• 🎨 在2D画布上绘制图形，自动转换为3D体素物体</li>
            <li>• 🌍 在3D空间中放置物体，观察物理效果</li>
            <li>• ⚙️ 调整物体的质量和弹性系数</li>
            <li>• 🎒 管理背包中的自定义物体</li>
            <li>• 🖱️ 拖拽、旋转、缩放3D场景</li>
          </ul>
        </div>

        <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">3D编辑器加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!simulatorData && showSelection) {
    return (
      <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
            <Sparkles className="w-6 h-6 mr-2 text-orange-600" />
            🛠️ 智慧工坊
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={generateSimulator}
              disabled={isGenerating || selectedItems.length === 0}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  生成AI模拟器 ({selectedItems.length})
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mb-6">
          <div className="text-gray-600 mb-4">
            <p className="text-lg mb-2">选择你想要理解的概念或知识点</p>
            <p className="text-sm">AI将基于你的选择创建专门的交互式模拟器，或者直接体验3D体素世界模拟器</p>
          </div>

          {/* 模拟器类型选择 */}
          <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">选择模拟器类型</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={generateSimulator}
                disabled={isGenerating || selectedItems.length === 0}
                className="p-4 text-left rounded-lg border-2 border-orange-300 bg-orange-50 hover:bg-orange-100 transition-colors duration-200"
              >
                <div className="flex items-center mb-2">
                  <Sparkles className="w-6 h-6 mr-2 text-orange-600" />
                  <span className="font-semibold text-orange-800">AI生成模拟器</span>
                </div>
                <p className="text-sm text-orange-700">
                  基于选中的概念和知识点，AI将生成专门的交互式模拟器
                </p>
              </button>

              <button
                onClick={startVoxelSimulator}
                className="p-4 text-left rounded-lg border-2 border-purple-300 bg-purple-50 hover:bg-purple-100 transition-colors duration-200"
              >
                <div className="flex items-center mb-2">
                  <Target className="w-6 h-6 mr-2 text-purple-600" />
                  <span className="font-semibold text-purple-800">3D体素世界</span>
                </div>
                <p className="text-sm text-purple-700">
                  体验3D绘图和物理模拟，创建自定义物体并观察物理效果
                </p>
              </button>
            </div>
          </div>

          {selectedItems.length > 0 && (
            <div className="mb-4 p-3 bg-orange-100 rounded-lg">
              <h3 className="font-medium text-orange-800 mb-2">已选择 ({selectedItems.length}):</h3>
              <div className="flex flex-wrap gap-2">
                {selectedItems.map((item, index) => (
                  <span key={index} className={`px-2 py-1 rounded text-sm ${item.type === 'concept' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                    {item.type === 'concept' ? item.term : item.title}
                    <button
                      onClick={() => handleItemSelect(item, item.type)}
                      className="ml-1 text-red-600 hover:text-red-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 概念选择 */}
          {concepts && concepts.length > 0 && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
                选择概念
              </h3>
              <div className="space-y-2">
                {concepts.map((concept, index) => {
                  const isSelected = selectedItems.some(item => item.id === concept.id && item.type === 'concept');
                  return (
                    <button
                      key={index}
                      onClick={() => handleItemSelect(concept, 'concept')}
                      className={`w-full p-3 text-left rounded-lg border transition-all duration-200 ${isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{concept.term}</span>
                        {isSelected && (
                          <span className="text-blue-600">✓</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 知识点选择 */}
          {knowledgePoints && knowledgePoints.length > 0 && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2 text-green-600" />
                选择知识点
              </h3>
              <div className="space-y-2">
                {knowledgePoints.map((point, index) => {
                  const isSelected = selectedItems.some(item => item.id === point.id && item.type === 'knowledgePoint');
                  return (
                    <button
                      key={index}
                      onClick={() => handleItemSelect(point, 'knowledgePoint')}
                      className={`w-full p-3 text-left rounded-lg border transition-all duration-200 ${isSelected
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{point.title}</div>
                          <div className="text-sm text-gray-600 mt-1">{point.definition}</div>
                        </div>
                        {isSelected && (
                          <span className="text-green-600">✓</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
          <Sparkles className="w-6 h-6 mr-2 text-orange-600" />
          🛠️ 智慧工坊 - {simulatorData.simulator.title}
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setSimulatorData(null);
              setShowSelection(true);
              setSelectedItems([]);
            }}
            className="px-3 py-1 text-gray-600 hover:text-gray-800"
          >
            重新选择
          </button>
          <button
            onClick={() => setSimulatorData(null)}
            className="px-3 py-1 text-gray-600 hover:text-gray-800"
          >
            重新生成
          </button>
          <button
            onClick={startVoxelSimulator}
            className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
          >
            🌍 切换到3D模拟器
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：参数控制面板 */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">参数控制</h3>
            <div className="space-y-4">
              {simulatorData.simulator.parameters.map(renderParameterControl)}
            </div>
          </div>

          {/* 场景选择 */}
          {simulatorData.scenarios && simulatorData.scenarios.length > 0 && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">预设场景</h3>
              <div className="space-y-2">
                {simulatorData.scenarios.map((scenario, index) => (
                  <button
                    key={index}
                    onClick={() => applyScenario(scenario)}
                    className={`w-full p-3 text-left rounded-lg border transition-colors duration-200 ${currentScenario?.name === scenario.name
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                      }`}
                  >
                    <h4 className="font-medium">{scenario.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{scenario.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 计算结果 */}
          {Object.keys(calculateResults()).length > 0 && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">计算结果</h3>
              <div className="space-y-2">
                {simulatorData.simulator.calculations.map((calc, index) => {
                  const result = calculateResults()[calc.id];
                  return (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{calc.description}</span>
                      <span className="font-medium text-gray-800">{result}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 反馈信息 */}
          {getFeedback().length > 0 && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">反馈提示</h3>
              <div className="space-y-2">
                {getFeedback().map((feedback, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg ${feedback.type === 'success' ? 'bg-green-100 text-green-800' :
                      feedback.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}
                  >
                    {feedback.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 右侧：可视化区域 */}
        <div className="space-y-6">
          {renderVisualization()}

          {/* 学习目标 */}
          {simulatorData.learningObjectives && simulatorData.learningObjectives.length > 0 && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">学习目标</h3>
              <ul className="space-y-2">
                {simulatorData.learningObjectives.map((objective, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-orange-500 mr-2">•</span>
                    <span className="text-gray-700">{objective}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 使用说明 */}
          {simulatorData.simulator.instructions && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">使用说明</h3>
              <p className="text-gray-700 leading-relaxed">{simulatorData.simulator.instructions}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

WorkshopModule.displayName = 'WorkshopModule';

export default WorkshopModule; 