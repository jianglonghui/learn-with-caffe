import React, { memo } from 'react';
import { Target } from 'lucide-react';

const KnowledgePointsModule = memo(({ knowledgePoints, onDragStart }) => {
  const handleDragStart = (e, point) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({
      type: 'knowledgePoint',
      data: point
    }));
    onDragStart?.(point, 'knowledgePoint');
  };

  const groupedPoints = knowledgePoints.reduce((groups, point) => {
    const category = point.category || '基础知识';
    if (!groups[category]) groups[category] = [];
    groups[category].push(point);
    return groups;
  }, {});

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
        <Target className="w-6 h-6 mr-2 text-green-600" />
        🎯 必学必会知识点
      </h2>

      <div className="flex-1 overflow-y-auto pr-2">
        {Object.entries(groupedPoints).map(([category, pointList]) => (
          <div key={category} className="mb-6">
            <h3 className="text-lg font-medium text-green-800 mb-3">{category}</h3>
            <div className="space-y-3">
              {pointList.map((point) => (
                <div
                  key={point.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, point)}
                  className="bg-white rounded-lg p-4 border-2 border-green-200 hover:border-green-400 cursor-move transition-all duration-200 hover:shadow-md group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 group-hover:text-green-700">
                        {point.title}
                      </h4>
                      <p className="text-gray-600 mt-1 text-sm">{point.definition}</p>
                    </div>
                    <span className="text-green-400 text-xs ml-2">📋</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

KnowledgePointsModule.displayName = 'KnowledgePointsModule';

export default KnowledgePointsModule; 