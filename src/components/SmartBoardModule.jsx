import React, { memo, useState, useEffect } from 'react';
import { Brain, Loader2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const SmartBoardModule = memo(({ boardContent }) => {
  const [boards, setBoards] = useState([]);
  const [currentBoardIndex, setCurrentBoardIndex] = useState(0);
  const [question, setQuestion] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const { state } = useAppContext();

  useEffect(() => {
    if (boardContent && boards.length === 0) {
      setBoards([{
        id: 0,
        type: 'introduction',
        content: boardContent.introduction,
        suggestions: boardContent.suggestions || []
      }]);
    }
  }, [boardContent, boards.length]);

  const handleDrop = async (e) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const contextInfo = data.type === 'concept' ? data.data.term : data.data.title;

      // 获取当前黑板内容作为上下文
      const currentBoard = boards[currentBoardIndex];
      const context = currentBoard ? currentBoard.content : '';

      // 模拟API响应
      const response = {
        answer: `这是关于"${contextInfo}"的详细解释。`,
        keyPoints: [`要点1: ${contextInfo}的重要性`, `要点2: ${contextInfo}的应用`],
        examples: [`示例1: ${contextInfo}的实际应用`, `示例2: ${contextInfo}的相关案例`],
        followUpQuestions: [`如何更好地理解${contextInfo}？`, `${contextInfo}与其他概念的关系是什么？`]
      };

      const newBoard = {
        id: boards.length,
        type: 'answer',
        question: `解释：${contextInfo}`,
        content: response.answer,
        keyPoints: response.keyPoints || [],
        examples: response.examples || [],
        followUpQuestions: response.followUpQuestions || [],
        parentBoard: currentBoardIndex
      };

      setBoards(prev => [...prev, newBoard]);
      setCurrentBoardIndex(boards.length);
    } catch (error) {
      console.error('智能黑板处理失败:', error);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) return;

    // 获取当前黑板内容作为上下文
    const currentBoard = boards[currentBoardIndex];
    const context = currentBoard ? currentBoard.content : '';

    try {
      // 模拟API响应
      const response = {
        answer: `关于"${question}"的回答：这是一个详细的解释。`,
        keyPoints: [`关键点1: 重要概念`, `关键点2: 核心要点`],
        examples: [`示例1: 实际应用`, `示例2: 相关案例`],
        followUpQuestions: [`深入问题1`, `深入问题2`]
      };

      const newBoard = {
        id: boards.length,
        type: 'answer',
        question: question,
        content: response.answer,
        keyPoints: response.keyPoints || [],
        examples: response.examples || [],
        followUpQuestions: response.followUpQuestions || [],
        parentBoard: currentBoardIndex
      };

      setBoards(prev => [...prev, newBoard]);
      setCurrentBoardIndex(boards.length);
      setQuestion('');
    } catch (error) {
      console.error('提问失败:', error);
    }
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    if (text.length > 2) {
      setSelectedText(text);
    }
  };

  const handleFollowUpQuestion = async (followUpQuestion) => {
    const currentBoard = boards[currentBoardIndex];
    const context = currentBoard ? currentBoard.content : '';

    try {
      // 模拟API响应
      const response = {
        answer: `关于"${followUpQuestion}"的回答：这是一个详细的解释。`,
        keyPoints: [`关键点1: 重要概念`, `关键点2: 核心要点`],
        examples: [`示例1: 实际应用`, `示例2: 相关案例`],
        followUpQuestions: [`深入问题1`, `深入问题2`]
      };

      const newBoard = {
        id: boards.length,
        type: 'answer',
        question: followUpQuestion,
        content: response.answer,
        keyPoints: response.keyPoints || [],
        examples: response.examples || [],
        followUpQuestions: response.followUpQuestions || [],
        parentBoard: currentBoardIndex
      };

      setBoards(prev => [...prev, newBoard]);
      setCurrentBoardIndex(boards.length);
    } catch (error) {
      console.error('追问失败:', error);
    }
  };

  const currentBoard = boards[currentBoardIndex];
  const isLoading = Object.values(state.loadingStates || {}).some(loading =>
    typeof loading === 'boolean' && loading &&
    Object.keys(state.loadingStates || {}).some(key => key.startsWith('smartBoard_'))
  );

  return (
    <div className="bg-gray-900 rounded-xl p-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold flex items-center">
          <Brain className="w-6 h-6 mr-2 text-yellow-400" />
          🧠 智能黑板
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentBoardIndex(Math.max(0, currentBoardIndex - 1))}
            disabled={currentBoardIndex === 0}
            className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50"
          >
            ←
          </button>
          <span className="text-sm text-gray-300">
            {currentBoardIndex + 1} / {boards.length}
          </span>
          <button
            onClick={() => setCurrentBoardIndex(Math.min(boards.length - 1, currentBoardIndex + 1))}
            disabled={currentBoardIndex === boards.length - 1}
            className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50"
          >
            →
          </button>
        </div>
      </div>

      <div
        className="bg-gray-800 rounded-lg p-6 min-h-96 border-2 border-dashed border-gray-600"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onMouseUp={handleTextSelection}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
            <span className="ml-2">AI思考中...</span>
          </div>
        ) : currentBoard ? (
          <div className="space-y-4">
            {currentBoard.question && (
              <div className="border-b border-gray-600 pb-2">
                <h3 className="text-lg font-semibold text-yellow-400">
                  问题：{currentBoard.question}
                </h3>
              </div>
            )}

            <div className="text-gray-100 leading-relaxed">
              {currentBoard.content}
            </div>

            {currentBoard.keyPoints?.length > 0 && (
              <div>
                <h4 className="font-semibold text-blue-400 mb-2">关键要点：</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-200">
                  {currentBoard.keyPoints.map((point, idx) => (
                    <li key={idx}>{point}</li>
                  ))}
                </ul>
              </div>
            )}

            {currentBoard.examples?.length > 0 && (
              <div>
                <h4 className="font-semibold text-green-400 mb-2">示例：</h4>
                <div className="space-y-2">
                  {currentBoard.examples.map((example, idx) => (
                    <div key={idx} className="bg-gray-700 rounded p-2 text-gray-200">
                      {example}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentBoard.followUpQuestions?.length > 0 && (
              <div>
                <h4 className="font-semibold text-purple-400 mb-2">深入思考：</h4>
                <div className="flex flex-wrap gap-2">
                  {currentBoard.followUpQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleFollowUpQuestion(q)}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-400 h-full flex items-center justify-center">
            <div>
              <p className="mb-4">拖拽概念或知识点到这里，或者直接提问</p>
              <p className="text-sm">支持划词追问 ✨</p>
            </div>
          </div>
        )}
      </div>

      {selectedText && (
        <div className="mt-4 p-3 bg-yellow-900 bg-opacity-50 rounded-lg">
          <p className="text-yellow-200 text-sm mb-2">选中文本："{selectedText}"</p>
          <button
            onClick={() => handleFollowUpQuestion(`请详细解释"${selectedText}"`)}
            className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-sm"
          >
            追问详情
          </button>
        </div>
      )}

      <div className="mt-4 flex space-x-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()}
          placeholder="在这里输入问题..."
          className="flex-1 px-3 py-2 bg-gray-700 rounded text-white placeholder-gray-400"
        />
        <button
          onClick={handleAskQuestion}
          disabled={!question.trim() || isLoading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
        >
          提问
        </button>
      </div>
    </div>
  );
});

SmartBoardModule.displayName = 'SmartBoardModule';

export default SmartBoardModule; 