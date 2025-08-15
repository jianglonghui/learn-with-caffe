import React, { memo, useState, useEffect } from 'react';
import { BookOpen, Loader2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const ConceptsModule = memo(({ concepts, onDragStart, savedConceptExplanations = {}, onConceptExplanationsUpdate }) => {
  const [expandedConcept, setExpandedConcept] = useState(null);
  const [conceptExplanations, setConceptExplanations] = useState({});
  const [isPreloading, setIsPreloading] = useState(false);
  const [loadedConceptIds, setLoadedConceptIds] = useState(new Set());
  const [initialized, setInitialized] = useState(false);
  const { state } = useAppContext();

  // 初始化已保存的解释（只执行一次）
  useEffect(() => {
    console.log('ConceptsModule初始化检查:', {
      initialized,
      savedCount: Object.keys(savedConceptExplanations).length,
      savedKeys: Object.keys(savedConceptExplanations),
      hasSavedExplanations: Object.keys(savedConceptExplanations).length > 0
    });

    if (!initialized && savedConceptExplanations && Object.keys(savedConceptExplanations).length > 0) {
      console.log('✅ 恢复已保存的概念解释:', Object.keys(savedConceptExplanations).length, '个');
      setConceptExplanations(savedConceptExplanations);
      const savedIds = new Set(Object.keys(savedConceptExplanations));
      setLoadedConceptIds(savedIds);
      setInitialized(true);
    } else if (!initialized) {
      // 延迟初始化，给父组件时间恢复保存的解释
      const timer = setTimeout(() => {
        console.log('🔄 初始化ConceptsModule（无已保存解释）');
        setInitialized(true);
      }, 100); // 等待100ms，让父组件有时间恢复数据

      return () => clearTimeout(timer);
    }
  }, [savedConceptExplanations, initialized]);

  // 预加载所有概念解释 - 添加去重和限流机制
  useEffect(() => {
    const preloadConceptExplanations = async () => {
      if (!initialized || !concepts || concepts.length === 0) return;

      // 过滤出尚未加载的概念
      const conceptsToLoad = concepts.filter(concept =>
        !loadedConceptIds.has(concept.id) &&
        !conceptExplanations[concept.id]
      );

      console.log('📋 预加载检查:', {
        totalConcepts: concepts.length,
        alreadyLoaded: loadedConceptIds.size,
        needToLoad: conceptsToLoad.length,
        conceptsToLoad: conceptsToLoad.map(c => c.term)
      });

      if (conceptsToLoad.length === 0) {
        console.log('✅ 所有概念解释已加载，跳过预加载');
        return;
      }

      setIsPreloading(true);

      // 分批处理，每批最多5个请求
      const batchSize = 5;
      const batches = [];
      for (let i = 0; i < conceptsToLoad.length; i += batchSize) {
        batches.push(conceptsToLoad.slice(i, i + batchSize));
      }

      try {
        const allResults = [];
        for (const batch of batches) {
          const batchPromises = batch.map(async (concept) => {
            try {
              // 这里需要调用API服务，暂时使用模拟数据
              const explanation = {
                explanation: `这是关于"${concept.term}"的详细解释。`,
                examples: [`示例1: ${concept.term}的应用场景1`, `示例2: ${concept.term}的应用场景2`],
                applications: `${concept.term}在实际中的应用和意义。`
              };
              return { id: concept.id, explanation, success: true };
            } catch (error) {
              console.error(`获取概念"${concept.term}"解释失败:`, error);
              return { id: concept.id, explanation: null, success: false };
            }
          });

          const batchResults = await Promise.all(batchPromises);
          allResults.push(...batchResults);

          // 批次间添加延迟，避免过于频繁的请求
          if (batches.indexOf(batch) < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        // 更新状态
        const explanationsMap = { ...conceptExplanations };
        const newLoadedIds = new Set(loadedConceptIds);

        allResults.forEach(({ id, explanation, success }) => {
          newLoadedIds.add(id);
          if (explanation && success) {
            explanationsMap[id] = explanation;
          }
        });

        setConceptExplanations(explanationsMap);
        setLoadedConceptIds(newLoadedIds);

        // 通知父组件概念解释已更新
        if (onConceptExplanationsUpdate) {
          onConceptExplanationsUpdate(explanationsMap);
        }

      } catch (error) {
        console.error('批量加载概念解释失败:', error);
      } finally {
        setIsPreloading(false);
      }
    };

    preloadConceptExplanations();
  }, [concepts, initialized, loadedConceptIds, conceptExplanations, onConceptExplanationsUpdate]);

  const handleConceptClick = (concept) => {
    if (expandedConcept === concept.id) {
      setExpandedConcept(null);
      return;
    }
    // 直接展开，不需要API请求（已预加载）
    setExpandedConcept(concept.id);
  };

  const handleDragStart = (e, concept) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({
      type: 'concept',
      data: concept
    }));
    onDragStart?.(concept, 'concept');
  };

  const groupedConcepts = concepts.reduce((groups, concept) => {
    const category = concept.category || '通用概念';
    if (!groups[category]) groups[category] = [];
    groups[category].push(concept);
    return groups;
  }, {});

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
          <BookOpen className="w-6 h-6 mr-2 text-blue-600" />
          📚 必学必会概念
        </h2>
        {isPreloading && (
          <div className="flex items-center text-blue-600">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span className="text-sm">正在加载概念解释...</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
        {Object.entries(groupedConcepts).map(([category, conceptList]) => (
          <div key={category} className="mb-6">
            <h3 className="text-lg font-medium text-blue-800 mb-3">{category}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {conceptList.map((concept) => (
                <div key={concept.id}>
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, concept)}
                    onClick={() => handleConceptClick(concept)}
                    className="bg-white rounded-lg p-3 border-2 border-blue-200 hover:border-blue-400 cursor-pointer transition-all duration-200 hover:shadow-md group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800 group-hover:text-blue-700">
                        {concept.term}
                      </span>
                      <div className="flex items-center space-x-1">
                        <span className="text-blue-400 text-xs">
                          {conceptExplanations[concept.id] ? '✅' : isPreloading ? '⏳' : '🔍'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* 解释框占满整行 */}
              {expandedConcept && conceptExplanations[expandedConcept] && (
                <div className="col-span-full mt-4">
                  <div className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
                    <div className="space-y-3 text-sm">
                      <div>
                        <strong className="text-blue-800">解释：</strong>
                        <p className="text-gray-700 mt-1">{conceptExplanations[expandedConcept].explanation}</p>
                      </div>

                      {conceptExplanations[expandedConcept].examples?.length > 0 && (
                        <div>
                          <strong className="text-blue-800">示例：</strong>
                          <ul className="text-gray-700 mt-1 list-disc list-inside">
                            {conceptExplanations[expandedConcept].examples.map((example, idx) => (
                              <li key={idx}>{example}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {conceptExplanations[expandedConcept].applications && (
                        <div>
                          <strong className="text-blue-800">应用：</strong>
                          <p className="text-gray-700 mt-1">{conceptExplanations[expandedConcept].applications}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

ConceptsModule.displayName = 'ConceptsModule';

export default ConceptsModule; 