import React, { createContext, useContext, useReducer, useMemo, memo } from 'react';
import { BookOpen, Brain, CheckCircle, AlertCircle, Loader2, RotateCcw, HelpCircle, Sparkles, Target, TrendingUp, FileText, Play, ChevronDown, ChevronUp } from 'lucide-react';
import VoxelWorldEditor from './world_simulator';
import { testAiGenerator } from './ai-generator.test';

// ==================== 本地存储管理 ====================
const StorageManager = {
  TOPIC_STATS_KEY: 'learning_topic_stats',
  LEARNING_HISTORY_KEY: 'learning_history',
  
  // 获取主题统计数据
  getTopicStats: () => {
    try {
      const stats = localStorage.getItem(StorageManager.TOPIC_STATS_KEY);
      return stats ? JSON.parse(stats) : {};
    } catch (error) {
      console.error('读取主题统计失败:', error);
      return {};
    }
  },
  
  // 保存主题统计数据
  saveTopicStats: (stats) => {
    try {
      localStorage.setItem(StorageManager.TOPIC_STATS_KEY, JSON.stringify(stats));
    } catch (error) {
      console.error('保存主题统计失败:', error);
    }
  },
  
  // 记录主题使用
  recordTopicUsage: (topic) => {
    if (!topic || typeof topic !== 'string') return;
    
    const cleanTopic = SecurityUtils.sanitizeInput(topic);
    if (!cleanTopic) return;
    
    const stats = StorageManager.getTopicStats();
    stats[cleanTopic] = (stats[cleanTopic] || 0) + 1;
    
    // 记录使用时间
    if (!stats._metadata) stats._metadata = {};
    if (!stats._metadata.lastUsed) stats._metadata.lastUsed = {};
    stats._metadata.lastUsed[cleanTopic] = new Date().toISOString();
    
    StorageManager.saveTopicStats(stats);
  },
  
  // 获取热门主题排行榜
  getPopularTopics: (limit = 10) => {
    const stats = StorageManager.getTopicStats();
    const topics = Object.entries(stats)
      .filter(([key]) => key !== '_metadata')
      .map(([topic, count]) => ({
        topic,
        count,
        lastUsed: stats._metadata?.lastUsed?.[topic] || null
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
    
    return topics;
  },
  
  // 清除统计数据
  clearTopicStats: () => {
    try {
      localStorage.removeItem(StorageManager.TOPIC_STATS_KEY);
    } catch (error) {
      console.error('清除主题统计失败:', error);
    }
  },

  // ==================== 学习历史管理 ====================
  
  // 获取学习历史
  getLearningHistory: () => {
    try {
      const history = localStorage.getItem(StorageManager.LEARNING_HISTORY_KEY);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('读取学习历史失败:', error);
      return [];
    }
  },
  
  // 保存学习历史
  saveLearningHistory: (history) => {
    try {
      localStorage.setItem(StorageManager.LEARNING_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('保存学习历史失败:', error);
    }
  },
  
  // 生成唯一的学习记录ID
  generateLearningId: () => {
    return `learning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },
  
  // 获取主题的显示名称（处理重复主题的序号）
  getTopicDisplayName: (baseTopic, history) => {
    const existingTopics = history.filter(item => 
      item.originalTopic === baseTopic || item.displayName.startsWith(baseTopic)
    );
    
    if (existingTopics.length === 0) {
      return baseTopic;
    }
    
    const nextNumber = existingTopics.length + 1;
    return `${baseTopic} (${nextNumber})`;
  },
  
  // 添加学习记录
  addLearningRecord: (data) => {
    console.log('创建学习记录:', data);
    const history = StorageManager.getLearningHistory();
    const learningId = StorageManager.generateLearningId();
    const displayName = StorageManager.getTopicDisplayName(data.topic, history);
    
    const record = {
      id: learningId,
      originalTopic: data.topic,
      displayName: displayName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stage: data.stage || 'topic_confirmed', // topic_confirmed, assessment_completed, outline_generated, learning_modules_created
      testResults: data.testResults || null,
      outline: data.outline || null,
      learningModules: data.learningModules || {},
      metadata: {
        totalQuestions: data.totalQuestions || 0,
        correctAnswers: data.correctAnswers || 0,
        score: data.score || 0
      }
    };
    
    history.unshift(record); // 最新的记录在前面
    StorageManager.saveLearningHistory(history);
    console.log('学习记录已创建:', learningId, record);
    return learningId;
  },
  
  // 更新学习记录
  updateLearningRecord: (learningId, updates) => {
    console.log('更新学习记录:', learningId, updates);
    const history = StorageManager.getLearningHistory();
    const recordIndex = history.findIndex(record => record.id === learningId);
    
    if (recordIndex === -1) {
      console.error('学习记录不存在:', learningId);
      return false;
    }
    
    history[recordIndex] = {
      ...history[recordIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    StorageManager.saveLearningHistory(history);
    console.log('学习记录已更新:', history[recordIndex]);
    return true;
  },
  
  // 更新主题显示名称
  updateTopicDisplayName: (learningId, newDisplayName) => {
    const cleanName = SecurityUtils.sanitizeInput(newDisplayName);
    if (!cleanName) return false;
    
    return StorageManager.updateLearningRecord(learningId, {
      displayName: cleanName
    });
  },
  
  // 删除学习记录
  deleteLearningRecord: (learningId) => {
    const history = StorageManager.getLearningHistory();
    const filteredHistory = history.filter(record => record.id !== learningId);
    StorageManager.saveLearningHistory(filteredHistory);
    return true;
  },
  
  // 获取特定学习记录
  getLearningRecord: (learningId) => {
    const history = StorageManager.getLearningHistory();
    return history.find(record => record.id === learningId) || null;
  },
  
  // 清除所有学习历史
  clearLearningHistory: () => {
    try {
      localStorage.removeItem(StorageManager.LEARNING_HISTORY_KEY);
    } catch (error) {
      console.error('清除学习历史失败:', error);
    }
  }
};

// ==================== 安全工具函数 ====================
const SecurityUtils = {
  sanitizeInput: (input) => {
    if (!input || typeof input !== 'string') return '';
    return input.trim().replace(/[<>]/g, '');
  },

  validateApiResponse: (data, requiredFields) => {
    if (!data || typeof data !== 'object') return false;
    return requiredFields.every(field => field in data);
  },

  escapeHtml: (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// ==================== API服务层 ====================
class APIService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
    this.maxRetries = 3;
    this.timeout = 30000;

    // 验证API key配置
    if (!process.env.REACT_APP_GLM_API_KEY) {
      console.error('⚠️ 警告: REACT_APP_GLM_API_KEY 环境变量未配置！');
      console.error('请创建 .env.local 文件并配置 REACT_APP_GLM_API_KEY');
      throw new Error('API key未配置，请检查环境变量设置');
    }
  }

  static getInstance() {
    if (!APIService.instance) {
      APIService.instance = new APIService();
    }
    return APIService.instance;
  }

  async request(prompt, options = {}) {
    const sanitizedPrompt = SecurityUtils.sanitizeInput(prompt);
    
    const requestBody = {
      model: options.model || "glm-4.5",
      max_tokens: options.maxTokens || 2000,
      messages: [{ role: "user", content: sanitizedPrompt }],
      thinking: {type: "disabled"}
    };

    let lastError;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(this.baseURL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.REACT_APP_GLM_API_KEY}`
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!SecurityUtils.validateApiResponse(data, ['choices'])) {
          throw new Error('Invalid API response format');
        }

        return this.cleanAndParseJSON(data.choices[0]?.message?.content || '');

      } catch (error) {
        lastError = error;
        if (attempt < this.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    throw lastError;
  }

  cleanAndParseJSON(responseText) {
    try {
      let cleanText = responseText
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim()
        .replace(/[\r\n\t]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/,(\s*[}\]])/g, '$1');


      // 🔥 添加这部分逻辑 - 检测并处理被引号包围的JSON字符串
      if (cleanText.startsWith('"') && cleanText.endsWith('"')) {
        // 移除外层引号
        cleanText = cleanText.slice(1, -1);
        // 处理转义字符
        cleanText = cleanText
          .replace(/\\"/g, '"')     // 恢复转义的引号
          .replace(/\\n/g, '\n')    // 恢复换行符
          .replace(/\\\\/g, '\\');  // 恢复反斜杠
      }
      // 🔥 添加结束
      cleanText = this.fixQuotesInJSON(cleanText);
      return JSON.parse(cleanText);
    } catch (error) {
      throw new Error(`JSON解析失败: ${error.message || '未知错误'}`);
    }
  }

  fixQuotesInJSON(jsonString) {
    try {
      let result = '';
      let inString = false;
      let i = 0;
      
      while (i < jsonString.length) {
        const char = jsonString[i];
        
        if (char === '"') {
          if (!inString) {
            inString = true;
            result += char;
          } else {
            let j = i + 1;
            while (j < jsonString.length && /\s/.test(jsonString[j])) j++;
            
            if (j >= jsonString.length || /[,:}\]]/.test(jsonString[j])) {
              inString = false;
              result += char;
            } else {
              result += '\\"';
            }
          }
        } else {
          result += char;
        }
        i++;
      }
      
      return result;
    } catch {
      return jsonString;
    }
  }

  async confirmTopic(topic) {
    const prompt = `用户想要学习"${topic}"这个主题。请确认具体学习内容，严格按照JSON格式回答：
{
  "needsConfirmation": true/false,
  "confirmedTopic": "明确的主题名称",
  "options": [{"id": 1, "title": "选项标题", "description": "详细描述"}],
  "message": "给用户的说明信息"
}
DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`;
    return this.request(prompt, { maxTokens: 1500 });
  }

  async generateStory(topic) {
    const prompt = `为"${topic}"生成学习故事，JSON格式：
{
  "story": "200-300字的引入故事",
  "hookQuestion": "引发思考的问题"
}
DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`;
    return this.request(prompt);
  }

  async generateQuestions(topic) {
    const prompt = `为"${topic}"生成5个测试问题，JSON格式：
{
  "questions": [
    {
      "id": 1,
      "question": "问题内容",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "difficulty": "easy",
      "explanation": "解析"
    }
  ]
}
DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`;
    return this.request(prompt, { maxTokens: 2500 });
  }

  async generateAssessment(performanceData) {
    const prompt = `基于测试表现分析学习能力，JSON格式：
{
  "level": "beginner",
  "learningStyle": "quick-learner", 
  "strengths": ["优势1"],
  "weaknesses": ["不足1"],
  "recommendations": ["建议1"],
  "summary": "评估总结"
}
数据：${JSON.stringify(performanceData)}
DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`;
    return this.request(prompt);
  }

  async generateOutline(assessment, topic) {
    const prompt = `制定"${topic}"的个性化学习大纲，JSON格式：
{
  "outline": [
    {
      "id": 1,
      "title": "模块标题",
      "difficulty": "beginner",
      "estimatedTime": "时间估计",
      "objectives": ["目标1"],
      "content": "内容简介",
      "prerequisites": "前置要求"
    }
  ],
  "learningPath": "学习路径建议",
  "totalEstimatedTime": "总时间"
}
评估：${JSON.stringify(assessment)}
DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`;
    return this.request(prompt, { maxTokens: 3000 });
  }

  async generateDetailedExplanation(question) {
    const prompt = `为问题提供详细解析，JSON格式：
{
  "detailedExplanation": "详细解析",
  "wrongOptionsAnalysis": ["错误原因1", "错误原因2", "错误原因3", "错误原因4"],
  "knowledgeExtension": "知识扩展",
  "practicalApplication": "实际应用"
}
问题：${JSON.stringify(question)}
DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`;
    return this.request(prompt, { maxTokens: 1500 });
  }

  async challengeQuestionAnswer(question) {
    let prompt;
    
    if (question.type === 'fill_blank') {
      // 填空题的质疑提示
      prompt = `请重新审视以下填空题，质疑当前答案是否真正正确：

问题：${question.question}
当前标准答案：${question.correctAnswer}

请严格按照以下JSON格式回答：

{
  "reanalysis": "重新分析过程",
  "finalAnswer": "${question.correctAnswer}",
  "confidence": "high",
  "reasoning": "最终推理过程",
  "controversies": "可能存在的争议点",
  "alternativeViews": "其他可能的观点"
}

DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`;
    } else {
      // 选择题的质疑提示
      prompt = `请重新审视以下问题，质疑当前答案是否真正正确：

问题：${question.question}
选项：${question.options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n')}
当前标准答案：${String.fromCharCode(65 + question.correctAnswer)}. ${question.options[question.correctAnswer]}

请严格按照以下JSON格式回答：

{
  "reanalysis": "重新分析过程",
  "finalAnswer": 0, 
  "confidence": "high",
  "reasoning": "最终推理过程",
  "controversies": "可能存在的争议点",
  "alternativeViews": "其他可能的观点"
}

DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`;
    }
    
    return this.request(prompt, { maxTokens: 1500 });
  }

  async generateDeepLearning(outlineItem) {
    const prompt = `为学习大纲中的"${outlineItem.title}"模块生成详细的学习内容。

模块信息：
- 标题：${outlineItem.title}
- 难度：${outlineItem.difficulty}
- 学习目标：${outlineItem.objectives.join(', ')}
- 内容简介：${outlineItem.content}

请生成包含四个模块的完整学习内容：必学必会概念、必学必会知识点、智能黑板内容和随堂演练。

严格按照以下JSON格式回答：

{
  "concepts": [
    {
      "id": 1,
      "term": "概念名词",
      "category": "概念分类"
    }
  ],
  "knowledgePoints": [
    {
      "id": 1,
      "title": "知识点标题",
      "definition": "简单的定义说明",
      "category": "知识点分类"
    }
  ],
  "boardContent": {
    "introduction": "智能黑板的引导内容",
    "suggestions": ["建议追问的问题1", "建议追问的问题2"]
  },
  "quiz": [
    {
      "type": "multiple_choice",
      "question": "选择题问题",
      "options": ["选项A", "选项B", "选项C", "选项D"],
      "correctAnswer": 0,
      "explanation": "答案解析"
    },
    {
      "type": "fill_blank",
      "question": "填空题：请填入正确的词语：____是编程的基础。",
      "correctAnswer": "逻辑",
      "explanation": "答案解析",
      "hints": ["提示1", "提示2"]
    }
  ]
}

DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`;
    return this.request(prompt, { maxTokens: 3500 });
  }

  async explainConcept(term, context = '') {
    const prompt = `请详细解释"${term}"这个概念。${context ? `\n\n上下文：${context}` : ''}

严格按照以下JSON格式回答：

{
  "explanation": "详细的概念解释",
  "examples": ["实例1", "实例2"],
  "relatedConcepts": ["相关概念1", "相关概念2"],
  "applications": "实际应用场景"
}

DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`;
    return this.request(prompt, { maxTokens: 2000 });
  }

  async askSmartBoard(question, context = '') {
    const prompt = `用户在智能黑板中提问："${question}"${context ? `\n\n相关内容：${context}` : ''}

请提供详细的回答。严格按照以下JSON格式回答：

{
  "answer": "详细的回答内容",
  "keyPoints": ["要点1", "要点2", "要点3"],
  "examples": ["示例1", "示例2"],
  "followUpQuestions": ["深入问题1", "深入问题2"]
}

DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`;
    return this.request(prompt, { maxTokens: 2500 });
  }

  async generateWorkshopSimulator(selectedConcepts, selectedKnowledgePoints, topic) {
    const prompt = `为"${topic}"主题创建智慧工坊模拟器，基于以下选中的概念和知识点：

选中的概念：${selectedConcepts.map(c => c.term).join(', ')}
选中的知识点：${selectedKnowledgePoints.map(k => k.title).join(', ')}

请创建一个可交互的模拟器，专门针对这些选中的概念和知识点，帮助用户通过实践理解这些特定的概念和知识点。严格按照以下JSON格式回答：

{
  "simulator": {
    "title": "模拟器标题",
    "description": "模拟器描述",
    "type": "interactive_simulator",
    "instructions": "使用说明",
    "parameters": [
      {
        "id": "param1",
        "name": "参数名称",
        "type": "slider/select/input",
        "min": 0,
        "max": 100,
        "default": 50,
        "step": 1,
        "options": ["选项1", "选项2"],
        "description": "参数说明"
      }
    ],
    "visualization": {
      "type": "canvas/svg/html",
      "width": 800,
      "height": 600,
      "elements": [
        {
          "id": "element1",
          "type": "shape/text/image",
          "x": 100,
          "y": 100,
          "width": 200,
          "height": 100,
          "properties": {
            "fill": "#ff0000",
            "stroke": "#000000",
            "text": "文本内容"
          }
        }
      ]
    },
    "calculations": [
      {
        "id": "calc1",
        "formula": "result = param1 * 2 + param2",
        "description": "计算公式说明"
      }
    ],
    "feedback": [
      {
        "condition": "param1 > 50",
        "message": "当参数1大于50时的反馈",
        "type": "success/warning/error"
      }
    ]
  },
  "learningObjectives": ["学习目标1", "学习目标2"],
  "scenarios": [
    {
      "name": "场景1",
      "description": "场景描述",
      "parameters": {
        "param1": 30,
        "param2": 70
      },
      "expectedOutcome": "预期结果"
    }
  ]
}

DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`;
    return this.request(prompt, { maxTokens: 10000 });
  }
}

// ==================== 状态管理 ====================
const initialState = {
  currentStep: 'topic',
  selectedTopic: '',
  customTopic: '',
  topicOptions: [],
  confirmedTopic: '',
  storyContent: null,
  questions: [],
  currentQuestion: 0,
  answers: {},
  answerTimes: {},
  learningAssessment: null,
  learningOutline: null,
  selectedOutlineItem: null,
  deepLearningContent: null,
  questionDetails: {},
  loadingStates: {},
  errors: {},
  currentLearningId: null, // 当前学习记录的ID
  showPersonalCenter: false, // 是否显示个人中心
  workshopSimulator: null // 智慧工坊模拟器数据
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loadingStates: { ...state.loadingStates, [action.key]: action.value }
      };
    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.key]: action.message }
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.key]: '' }
      };
    case 'SET_STEP':
      return { ...state, currentStep: action.step };
    case 'SET_TOPIC':
      return { ...state, selectedTopic: action.topic };
    case 'SET_CUSTOM_TOPIC':
      return { ...state, customTopic: action.topic, selectedTopic: '' };
    case 'SET_CONFIRMED_TOPIC':
      return { ...state, confirmedTopic: action.topic };
    case 'SET_TOPIC_OPTIONS':
      return { ...state, topicOptions: action.options };
    case 'SET_STORY_CONTENT':
      return { ...state, storyContent: action.content };
    case 'SET_QUESTIONS':
      return { 
        ...state, 
        questions: action.questions,
        currentQuestion: 0,
        answers: {},
        answerTimes: {}
      };
    case 'SET_CURRENT_QUESTION':
      return { ...state, currentQuestion: action.index };
    case 'SET_ANSWER':
      return {
        ...state,
        answers: { ...state.answers, [action.questionId]: action.answer },
        answerTimes: { ...state.answerTimes, [action.questionId]: action.time }
      };
    case 'SET_ASSESSMENT':
      return { ...state, learningAssessment: action.assessment };
    case 'SET_OUTLINE':
      return { ...state, learningOutline: action.outline };
    case 'SET_QUESTION_DETAILS':
      return {
        ...state,
        questionDetails: { ...state.questionDetails, [action.questionId]: action.details }
      };
    case 'SET_SELECTED_OUTLINE_ITEM':
      return { ...state, selectedOutlineItem: action.item };
    case 'SET_DEEP_LEARNING_CONTENT':
      return { ...state, deepLearningContent: action.content };
    case 'SET_CURRENT_LEARNING_ID':
      return { ...state, currentLearningId: action.learningId };
    case 'TOGGLE_PERSONAL_CENTER':
      return { ...state, showPersonalCenter: !state.showPersonalCenter };
    case 'SET_SHOW_PERSONAL_CENTER':
      return { ...state, showPersonalCenter: action.show };
    case 'SET_WORKSHOP_SIMULATOR':
      return { ...state, workshopSimulator: action.simulator };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

const AppContext = createContext(null);

// ==================== 自定义Hooks ====================
const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

const useAPI = () => {
  const { dispatch } = useAppContext();
  const apiService = APIService.getInstance();
  const activeRequests = React.useRef(new Map()); // 用于跟踪进行中的请求

  const executeWithLoading = async (key, operation, onSuccess, onError) => {
    // 检查是否已有相同key的请求在进行中
    if (activeRequests.current.has(key)) {
      console.log(`请求 ${key} 已在进行中，跳过重复请求`);
      return activeRequests.current.get(key);
    }

    dispatch({ type: 'SET_LOADING', key, value: true });
    dispatch({ type: 'CLEAR_ERROR', key });

    const requestPromise = (async () => {
      try {
        const result = await operation();
        onSuccess?.(result);
        return result;
      } catch (error) {
        const errorMessage = error.message || '操作失败';
        dispatch({ type: 'SET_ERROR', key, message: errorMessage });
        onError?.(error);
        throw error;
      } finally {
        dispatch({ type: 'SET_LOADING', key, value: false });
        activeRequests.current.delete(key); // 请求完成后移除
      }
    })();

    activeRequests.current.set(key, requestPromise);
    return requestPromise;
  };

  return {
    confirmTopic: (topic) => 
      executeWithLoading('confirmTopic', () => apiService.confirmTopic(topic)),
    
    generateStory: (topic) =>
      executeWithLoading('generateStory', () => apiService.generateStory(topic)),
    
    generateQuestions: (topic) =>
      executeWithLoading('generateQuestions', () => apiService.generateQuestions(topic)),
    
    generateAssessment: (data) =>
      executeWithLoading('generateAssessment', () => apiService.generateAssessment(data)),
    
    generateOutline: (assessment, topic) =>
      executeWithLoading('generateOutline', () => apiService.generateOutline(assessment, topic)),
    
    generateDetailedExplanation: (question) =>
      executeWithLoading(`explanation_${question.id || 'quiz'}`, () => apiService.generateDetailedExplanation(question)),
    
    challengeQuestionAnswer: (question) =>
      executeWithLoading(`challenge_${question.id || 'quiz'}`, () => apiService.challengeQuestionAnswer(question)),
    
    generateDeepLearning: (outlineItem) =>
      executeWithLoading(`generateDeepLearning_${outlineItem.id}`, () => apiService.generateDeepLearning(outlineItem)),
    
    explainConcept: (term, context = '') =>
      executeWithLoading(`explainConcept_${term}`, () => apiService.explainConcept(term, context)),
    
    askSmartBoard: (question, context = '') =>
      executeWithLoading(`smartBoard_${Date.now()}`, () => apiService.askSmartBoard(question, context)),
    
    generateWorkshopSimulator: (concepts, knowledgePoints, topic) =>
      executeWithLoading(`generateWorkshopSimulator_${Date.now()}`, () => apiService.generateWorkshopSimulator(concepts, knowledgePoints, topic))
  };
};

// ==================== 错误边界组件 ====================
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('应用错误:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-red-50">
          <div className="text-center p-8">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">系统出错了</h2>
            <p className="text-gray-600 mb-4">抱歉，应用遇到了一个错误</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ==================== UI组件 ====================
const LoadingSpinner = memo(() => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
  </div>
));

const ErrorMessage = memo(({ message, onRetry }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
    <div className="flex items-center">
      <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
      <p className="text-red-700 text-sm flex-1">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="ml-3 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
        >
          重试
        </button>
      )}
    </div>
  </div>
));

// ==================== 排行榜组件 ====================
const TopicRankingBoard = memo(({ onTopicSelect }) => {
  const [popularTopics, setPopularTopics] = React.useState([]);
  const [isExpanded, setIsExpanded] = React.useState(false);

  React.useEffect(() => {
    const topics = StorageManager.getPopularTopics(10);
    setPopularTopics(topics);
  }, []);

  const formatLastUsed = (dateString) => {
    if (!dateString) return '未知';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return '今天';
      if (diffDays === 1) return '昨天';
      if (diffDays < 7) return `${diffDays}天前`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
      return date.toLocaleDateString();
    } catch (error) {
      return '未知';
    }
  };

  const handleClearStats = () => {
    if (window.confirm('确定要清除所有统计数据吗？此操作不可撤销。')) {
      StorageManager.clearTopicStats();
      setPopularTopics([]);
    }
  };

  if (popularTopics.length === 0) {
    return (
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4">
        <div className="flex items-center mb-2">
          <TrendingUp className="w-5 h-5 text-purple-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-800">📈 热门主题排行榜</h3>
        </div>
        <p className="text-gray-600 text-sm">暂无学习记录，开始学习后这里将显示热门主题</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <TrendingUp className="w-5 h-5 text-purple-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-800">📈 热门主题排行榜</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-purple-600 hover:text-purple-800 text-sm flex items-center"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                收起
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                展开
              </>
            )}
          </button>
          <button
            onClick={handleClearStats}
            className="text-gray-500 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-white transition-colors"
            title="清除统计数据"
          >
            清除
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {(isExpanded ? popularTopics : popularTopics.slice(0, 5)).map((item, index) => (
          <div
            key={item.topic}
            className="flex items-center justify-between bg-white bg-opacity-70 rounded-lg p-3 hover:bg-opacity-90 transition-all cursor-pointer group"
            onClick={() => onTopicSelect?.(item.topic)}
          >
            <div className="flex items-center flex-1 min-w-0">
              <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
                index === 0 ? 'bg-yellow-400 text-yellow-900' :
                index === 1 ? 'bg-gray-300 text-gray-700' :
                index === 2 ? 'bg-orange-400 text-orange-900' :
                'bg-blue-100 text-blue-700'
              }`}>
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate group-hover:text-purple-700 transition-colors">
                  {item.topic}
                </p>
                <p className="text-xs text-gray-500">
                  最后学习: {formatLastUsed(item.lastUsed)}
                </p>
              </div>
            </div>
            <div className="flex-shrink-0 ml-3">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                {item.count}次
              </span>
            </div>
          </div>
        ))}
      </div>

      {!isExpanded && popularTopics.length > 5 && (
        <div className="mt-3 text-center">
          <button
            onClick={() => setIsExpanded(true)}
            className="text-purple-600 hover:text-purple-800 text-sm font-medium"
          >
            查看更多 ({popularTopics.length - 5} 个)
          </button>
        </div>
      )}
    </div>
  );
});

// ==================== 个人中心组件 ====================
const PersonalCenter = memo(() => {
  const { state, dispatch } = useAppContext();
  const [learningHistory, setLearningHistory] = React.useState([]);
  const [editingId, setEditingId] = React.useState(null);
  const [editingName, setEditingName] = React.useState('');

  // 加载学习历史
  React.useEffect(() => {
    const history = StorageManager.getLearningHistory();
    setLearningHistory(history);
  }, [state.currentStep]); // 当步骤变化时重新加载

  const handleEdit = (record) => {
    setEditingId(record.id);
    setEditingName(record.displayName);
  };

  const handleSaveEdit = (recordId) => {
    if (editingName.trim()) {
      StorageManager.updateTopicDisplayName(recordId, editingName.trim());
      setLearningHistory(prev => 
        prev.map(record => 
          record.id === recordId 
            ? { ...record, displayName: editingName.trim() }
            : record
        )
      );
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleDelete = (recordId) => {
    if (window.confirm('确定要删除这条学习记录吗？此操作不可撤销。')) {
      StorageManager.deleteLearningRecord(recordId);
      setLearningHistory(prev => prev.filter(record => record.id !== recordId));
    }
  };

  const handleViewAssessment = (record) => {
    // 恢复评估结果查看状态
    dispatch({ type: 'SET_CONFIRMED_TOPIC', topic: record.originalTopic });
    dispatch({ type: 'SET_CURRENT_LEARNING_ID', learningId: record.id });
    
    if (record.testResults) {
      dispatch({ type: 'SET_QUESTIONS', questions: record.testResults.questions || [] });
      // 恢复答案
      const answers = {};
      record.testResults.questions?.forEach(q => {
        if (record.testResults.answers && record.testResults.answers[q.id]) {
          answers[q.id] = record.testResults.answers[q.id];
        }
      });
      Object.keys(answers).forEach(questionId => {
        dispatch({ type: 'SET_ANSWER', questionId, answer: answers[questionId] });
      });
    }
    
    dispatch({ type: 'SET_STEP', step: 'results' });
    dispatch({ type: 'SET_SHOW_PERSONAL_CENTER', show: false });
  };

  const handleContinueLearning = (record) => {
    // 恢复学习状态
    dispatch({ type: 'SET_CONFIRMED_TOPIC', topic: record.originalTopic });
    dispatch({ type: 'SET_CURRENT_LEARNING_ID', learningId: record.id });
    
    if (record.stage === 'topic_confirmed') {
      dispatch({ type: 'SET_STEP', step: 'story' });
    } else if (record.stage === 'assessment_completed') {
      dispatch({ type: 'SET_STEP', step: 'results' });
      if (record.testResults) {
        dispatch({ type: 'SET_QUESTIONS', questions: record.testResults.questions || [] });
        // 恢复答案
        const answers = {};
        record.testResults.questions?.forEach(q => {
          if (record.testResults.answers && record.testResults.answers[q.id]) {
            answers[q.id] = record.testResults.answers[q.id];
          }
        });
        Object.keys(answers).forEach(questionId => {
          dispatch({ type: 'SET_ANSWER', questionId, answer: answers[questionId] });
        });
      }
    } else if (record.stage === 'outline_generated') {
      dispatch({ type: 'SET_STEP', step: 'outline' });
      if (record.outline) {
        dispatch({ type: 'SET_OUTLINE', outline: record.outline });
      }
      if (record.testResults) {
        dispatch({ type: 'SET_ASSESSMENT', assessment: record.testResults });
      }
    } else if (record.stage === 'learning_modules_created') {
      dispatch({ type: 'SET_STEP', step: 'outline' });
      if (record.outline) {
        dispatch({ type: 'SET_OUTLINE', outline: record.outline });
      }
      if (record.testResults) {
        dispatch({ type: 'SET_ASSESSMENT', assessment: record.testResults });
      }
      // 注意：学习模块内容会在OutlineDisplay中根据learningRecord自动恢复
    }
    
    dispatch({ type: 'SET_SHOW_PERSONAL_CENTER', show: false });
  };

  const handleClearHistory = () => {
    if (window.confirm('确定要清除所有学习历史吗？此操作不可撤销。')) {
      StorageManager.clearLearningHistory();
      setLearningHistory([]);
    }
  };

  const getStageText = (stage) => {
    switch (stage) {
      case 'topic_confirmed': return '已确认主题';
      case 'assessment_completed': return '已完成测试';
      case 'outline_generated': return '已生成大纲';
      case 'learning_modules_created': return '已创建学习模块';
      default: return '未知状态';
    }
  };

  const getStageColor = (stage) => {
    switch (stage) {
      case 'topic_confirmed': return 'bg-yellow-100 text-yellow-800';
      case 'assessment_completed': return 'bg-blue-100 text-blue-800';
      case 'outline_generated': return 'bg-green-100 text-green-800';
      case 'learning_modules_created': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return '未知时间';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <Brain className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-3xl font-bold text-gray-800">个人中心</h1>
                <p className="text-gray-600 mt-1">管理您的学习历史和进度</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {learningHistory.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors text-sm"
                >
                  清除历史
                </button>
              )}
              <button
                onClick={() => dispatch({ type: 'SET_SHOW_PERSONAL_CENTER', show: false })}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                返回主页
              </button>
            </div>
          </div>

          {/* 统计信息 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6">
              <div className="flex items-center">
                <BookOpen className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-2xl font-bold text-blue-800">{learningHistory.length}</p>
                  <p className="text-blue-600 text-sm">学习记录</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <p className="text-2xl font-bold text-green-800">
                    {learningHistory.filter(r => r.stage === 'learning_modules_created').length}
                  </p>
                  <p className="text-green-600 text-sm">完整学习</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-6">
              <div className="flex items-center">
                <Target className="w-8 h-8 text-purple-600 mr-3" />
                <div>
                  <p className="text-2xl font-bold text-purple-800">
                    {Math.round(learningHistory.reduce((sum, r) => sum + (r.metadata?.score || 0), 0) / Math.max(learningHistory.length, 1))}%
                  </p>
                  <p className="text-purple-600 text-sm">平均分数</p>
                </div>
              </div>
            </div>
          </div>

          {/* 学习历史列表 */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">学习历史</h2>
            
            {learningHistory.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">暂无学习记录</p>
                <p className="text-gray-400 text-sm mt-2">开始学习后，您的记录将显示在这里</p>
              </div>
            ) : (
              <div className="space-y-4">
                {learningHistory.map((record) => (
                  <div key={record.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-3">
                          {editingId === record.id ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="text-xl font-semibold text-gray-800 border-b-2 border-blue-500 bg-transparent focus:outline-none min-w-0 flex-1"
                                onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(record.id)}
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveEdit(record.id)}
                                className="text-green-600 hover:text-green-700 p-1"
                                title="保存"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="text-gray-500 hover:text-gray-700 p-1"
                                title="取消"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-3">
                              <h3 className="text-xl font-semibold text-gray-800">{record.displayName}</h3>
                              <button
                                onClick={() => handleEdit(record)}
                                className="text-gray-400 hover:text-blue-600 p-1"
                                title="编辑名称"
                              >
                                ✏️
                              </button>
                            </div>
                          )}
                          <span className={`ml-3 px-2 py-1 rounded-full text-xs font-medium ${getStageColor(record.stage)}`}>
                            {getStageText(record.stage)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                          <div>
                            <span className="font-medium">创建时间:</span> {formatDate(record.createdAt)}
                          </div>
                          <div>
                            <span className="font-medium">更新时间:</span> {formatDate(record.updatedAt)}
                          </div>
                          {record.metadata?.score > 0 && (
                            <div>
                              <span className="font-medium">测试分数:</span> {record.metadata.score}%
                            </div>
                          )}
                        </div>

                        {record.metadata?.totalQuestions > 0 && (
                          <div className="bg-gray-50 rounded-lg p-3 mb-4">
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">测试结果:</span> 
                              答对 {record.metadata.correctAnswers} 题，共 {record.metadata.totalQuestions} 题
                              ({record.metadata.score}%)
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        {record.testResults && (
                          <button
                            onClick={() => handleViewAssessment(record)}
                            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                            title="查看评估结果"
                          >
                            📊 评估
                          </button>
                        )}
                        <button
                          onClick={() => handleContinueLearning(record)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          继续学习
                        </button>
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors text-sm"
                          title="删除记录"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

// ==================== 业务组件 ====================
const TopicSelector = memo(() => {
  const { state, dispatch } = useAppContext();
  const api = useAPI();

  const predefinedTopics = [
    'JavaScript基础', 'Python编程', 'React开发', 'HTML/CSS', 'Node.js', 'Vue.js',
    '数据结构与算法', 'MySQL数据库', 'Git版本控制', 'Linux系统', '网络安全', '人工智能',
    '区块链技术', '机器学习', '数据分析', '产品设计', '项目管理', '英语学习', '数学基础', '物理学'
  ];

  const handleStartQuiz = async () => {
    const topic = state.selectedTopic || state.customTopic;
    if (!topic.trim()) return;

    // 记录主题使用统计
    StorageManager.recordTopicUsage(topic.trim());

    try {
      const result = await api.confirmTopic(topic.trim());
      
      if (result.needsConfirmation && result.options) {
        dispatch({ type: 'SET_TOPIC_OPTIONS', options: result.options });
        dispatch({ type: 'SET_STEP', step: 'confirm' });
      } else {
        const confirmedTopic = result.confirmedTopic || topic;
        dispatch({ type: 'SET_CONFIRMED_TOPIC', topic: confirmedTopic });
        
        // 创建学习记录
        const learningId = StorageManager.addLearningRecord({
          topic: confirmedTopic,
          stage: 'topic_confirmed'
        });
        dispatch({ type: 'SET_CURRENT_LEARNING_ID', learningId });
        
        dispatch({ type: 'SET_STEP', step: 'story' });
        
        const storyResult = await api.generateStory(confirmedTopic);
        dispatch({ type: 'SET_STORY_CONTENT', content: storyResult });
      }
    } catch (error) {
      console.error('启动测试失败:', error);
    }
  };

  const handleTopicFromRanking = (topic) => {
    dispatch({ type: 'SET_TOPIC', topic });
  };

  const isLoading = state.loadingStates.confirmTopic || state.loadingStates.generateStory;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1"></div>
            <div className="flex items-center">
              <Brain className="w-12 h-12 text-blue-600 mr-3" />
              <h1 className="text-4xl font-bold text-gray-800">AI个性化学习系统</h1>
            </div>
            <div className="flex-1 flex justify-end">
              <button
                onClick={() => dispatch({ type: 'SET_SHOW_PERSONAL_CENTER', show: true })}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm"
              >
                <Brain className="w-4 h-4 mr-2" />
                个人中心
              </button>
            </div>
          </div>
          <p className="text-lg text-gray-600">选择一个主题，AI将评估你的学习能力并制定个性化学习大纲</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
            <BookOpen className="w-6 h-6 mr-2 text-blue-600" />
            选择学习主题
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
            {predefinedTopics.map((topic, index) => (
              <button
                key={index}
                onClick={() => dispatch({ type: 'SET_TOPIC', topic })}
                className={`p-3 rounded-lg border-2 transition-all duration-200 text-sm font-medium ${
                  state.selectedTopic === topic
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>

          {/* 热门主题排行榜 */}
          <div className="mb-6">
            <TopicRankingBoard onTopicSelect={handleTopicFromRanking} />
          </div>

          <div className="border-t pt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              或者输入自定义主题：
            </label>
            <input
              type="text"
              value={state.customTopic}
              onChange={(e) => dispatch({ type: 'SET_CUSTOM_TOPIC', topic: e.target.value })}
              placeholder="例如：Adobe Photoshop基础操作"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={200}
            />
          </div>

          <button
            onClick={handleStartQuiz}
            disabled={(!state.selectedTopic && !state.customTopic.trim()) || isLoading}
            className="w-full mt-6 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                正在处理...
              </>
            ) : (
              '开始学习评估'
            )}
          </button>

          {state.errors.confirmTopic && (
            <div className="mt-4">
              <ErrorMessage 
                message={state.errors.confirmTopic}
                onRetry={handleStartQuiz}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

const TopicConfirmation = memo(() => {
  const { state, dispatch } = useAppContext();
  const api = useAPI();

  const handleTopicConfirm = async (option) => {
    dispatch({ type: 'SET_CONFIRMED_TOPIC', topic: option.title });
    
    // 创建学习记录
    const learningId = StorageManager.addLearningRecord({
      topic: option.title,
      stage: 'topic_confirmed'
    });
    dispatch({ type: 'SET_CURRENT_LEARNING_ID', learningId });
    
    dispatch({ type: 'SET_STEP', step: 'story' });
    
    try {
      const result = await api.generateStory(option.title);
      dispatch({ type: 'SET_STORY_CONTENT', content: result });
    } catch (error) {
      console.error('生成故事失败:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <HelpCircle className="w-12 h-12 text-orange-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">请确认学习主题</h2>
            <p className="text-gray-600">
              "{state.selectedTopic || state.customTopic}" 可能有多种含义，请选择你想要学习的具体内容：
            </p>
          </div>

          <div className="space-y-4">
            {state.topicOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleTopicConfirm(option)}
                disabled={state.loadingStates.generateStory}
                className="w-full p-6 text-left border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 disabled:opacity-50"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{option.title}</h3>
                <p className="text-gray-600">{option.description}</p>
              </button>
            ))}
          </div>

          <button
            onClick={() => dispatch({ type: 'RESET' })}
            className="w-full mt-6 bg-gray-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-700 transition-colors duration-200"
          >
            重新选择主题
          </button>

          {state.errors.generateStory && (
            <div className="mt-4">
              <ErrorMessage message={state.errors.generateStory} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

const StoryDisplay = memo(() => {
  const { state, dispatch } = useAppContext();
  const api = useAPI();

  const handleStartLearning = async () => {
    dispatch({ type: 'SET_STEP', step: 'generating' });
    
    try {
      const result = await api.generateQuestions(state.confirmedTopic);
      if (result.questions && Array.isArray(result.questions)) {
        dispatch({ type: 'SET_QUESTIONS', questions: result.questions });
        dispatch({ type: 'SET_STEP', step: 'quiz' });
      }
    } catch (error) {
      console.error('生成问题失败:', error);
    }
  };

  if (!state.storyContent) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <Sparkles className="w-12 h-12 text-purple-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">学习故事</h2>
            <p className="text-gray-600">让我们从一个有趣的故事开始 "{state.confirmedTopic}" 的学习之旅</p>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-8 mb-8">
            <div className="prose prose-lg max-w-none">
              <p className="text-gray-800 leading-relaxed text-lg mb-6">
                {state.storyContent.story}
              </p>
              
              {state.storyContent.hookQuestion && (
                <div className="bg-white bg-opacity-70 rounded-lg p-4 border-l-4 border-purple-500">
                  <p className="text-purple-800 font-medium text-lg">
                    🤔 {state.storyContent.hookQuestion}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={handleStartLearning}
              disabled={state.loadingStates.generateQuestions}
              className="inline-flex items-center px-8 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {state.loadingStates.generateQuestions ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  正在生成问题...
                </>
              ) : (
                <>
                  <Brain className="w-5 h-5 mr-2" />
                  开始能力评估
                </>
              )}
            </button>
          </div>

          {state.errors.generateQuestions && (
            <div className="mt-4">
              <ErrorMessage 
                message={state.errors.generateQuestions}
                onRetry={handleStartLearning}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

const QuizInterface = memo(() => {
  const { state, dispatch } = useAppContext();
  const [questionStartTime, setQuestionStartTime] = React.useState(Date.now());

  React.useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [state.currentQuestion]);

  const handleAnswer = (questionId, selectedOption, customAnswer = '') => {
    const currentTime = Date.now();
    const timeSpent = currentTime - questionStartTime;
    
    dispatch({
      type: 'SET_ANSWER',
      questionId,
      answer: { selectedOption, customAnswer, timestamp: new Date().toISOString() },
      time: timeSpent
    });
  };

  const nextQuestion = () => {
    if (state.currentQuestion < state.questions.length - 1) {
      dispatch({ type: 'SET_CURRENT_QUESTION', index: state.currentQuestion + 1 });
    } else {
      dispatch({ type: 'SET_STEP', step: 'results' });
    }
  };

  const prevQuestion = () => {
    if (state.currentQuestion > 0) {
      dispatch({ type: 'SET_CURRENT_QUESTION', index: state.currentQuestion - 1 });
    }
  };

  if (state.currentStep === 'generating') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
          <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            AI正在生成评估问题
          </h2>
          <p className="text-gray-600 mb-4">
            这可能需要几秒钟时间，请耐心等待...
          </p>
        </div>
      </div>
    );
  }

  if (state.questions.length === 0) {
    return <LoadingSpinner />;
  }

  const currentQ = state.questions[state.currentQuestion];
  const currentAnswer = state.answers[currentQ.id];

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'hard': return 'text-red-600 bg-red-100 border-red-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">
              {state.confirmedTopic} - 能力评估
            </h1>
            <div className="text-right">
              <span className="text-sm text-gray-500">
                问题 {state.currentQuestion + 1} / {state.questions.length}
              </span>
              <div className={`text-xs px-2 py-1 rounded-full mt-1 ${getDifficultyColor(currentQ.difficulty)}`}>
                {currentQ.difficulty === 'easy' ? '简单' : currentQ.difficulty === 'medium' ? '中等' : '困难'}
              </div>
            </div>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((state.currentQuestion + 1) / state.questions.length) * 100}%` }}
            ></div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              {currentQ.question}
            </h2>

            <div className="space-y-3">
              {currentQ.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(currentQ.id, index)}
                  className={`w-full p-4 text-left rounded-lg border-2 transition-all duration-200 ${
                    currentAnswer?.selectedOption === index
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <span className="font-medium mr-3">{String.fromCharCode(65 + index)}.</span>
                  {option}
                </button>
              ))}
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                其他想法或补充回答：
              </label>
              <textarea
                value={currentAnswer?.customAnswer || ''}
                onChange={(e) => handleAnswer(currentQ.id, currentAnswer?.selectedOption ?? -1, e.target.value)}
                placeholder="在这里写下你的其他想法、疑问或补充回答..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                maxLength={500}
              />
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={prevQuestion}
              disabled={state.currentQuestion === 0}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一题
            </button>
            
            <button
              onClick={nextQuestion}
              disabled={currentAnswer?.selectedOption === undefined}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {state.currentQuestion === state.questions.length - 1 ? '完成评估' : '下一题'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

const ResultsDisplay = memo(() => {
  const { state, dispatch } = useAppContext();
  const api = useAPI();

  const calculateScore = () => {
    let correct = 0;
    state.questions.forEach(q => {
      const answer = state.answers[q.id];
      if (answer && answer.selectedOption === q.correctAnswer) {
        correct++;
      }
    });
    return { correct, total: state.questions.length };
  };

  // 更新学习记录
  React.useEffect(() => {
    if (state.currentLearningId && state.questions.length > 0) {
      const score = calculateScore();
      const percentage = Math.round((score.correct / score.total) * 100);
      
      StorageManager.updateLearningRecord(state.currentLearningId, {
        stage: 'assessment_completed',
        testResults: {
          questions: state.questions,
          answers: state.answers,
          answerTimes: state.answerTimes
        },
        metadata: {
          totalQuestions: score.total,
          correctAnswers: score.correct,
          score: percentage
        }
      });
    }
  }, [state.currentLearningId, state.questions, state.answers]);

  const handleDetailedExplanation = async (question) => {
    try {
      const result = await api.generateDetailedExplanation(question);
      dispatch({
        type: 'SET_QUESTION_DETAILS',
        questionId: question.id,
        details: {
          ...state.questionDetails[question.id],
          detailedExplanation: result
        }
      });
    } catch (error) {
      console.error('生成详细解析失败:', error);
    }
  };

  const handleChallengeAnswer = async (question) => {
    try {
      const result = await api.challengeQuestionAnswer(question);
      dispatch({
        type: 'SET_QUESTION_DETAILS',
        questionId: question.id,
        details: {
          ...state.questionDetails[question.id],
          challengeResult: result
        }
      });
    } catch (error) {
      console.error('质疑分析失败:', error);
    }
  };

  const score = calculateScore();
  const percentage = Math.round((score.correct / score.total) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800 mb-2">测试完成！</h1>
            <p className="text-lg text-gray-600">
              你已完成 "{state.confirmedTopic}" 的能力测试
            </p>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-8 text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">{percentage}%</div>
            <div className="text-gray-700">
              答对了 {score.correct} 道题，共 {score.total} 道题
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-800">答题详情</h2>
            
            {state.questions.map((question, index) => {
              const answer = state.answers[question.id];
              const isCorrect = answer?.selectedOption === question.correctAnswer;
              const questionDetail = state.questionDetails[question.id];
              
              return (
                <div key={question.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start mb-4">
                    <span className="text-lg font-semibold text-gray-700 mr-3">
                      问题 {index + 1}:
                    </span>
                    <div className="flex-1">
                      <p className="text-gray-800 mb-3">{question.question}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                        {question.options.map((option, optIndex) => (
                          <div
                            key={optIndex}
                            className={`p-2 rounded text-sm ${
                              optIndex === question.correctAnswer
                                ? 'bg-green-100 border border-green-300 text-green-800'
                                : optIndex === answer?.selectedOption && !isCorrect
                                ? 'bg-red-100 border border-red-300 text-red-800'
                                : 'bg-gray-50 border border-gray-200'
                            }`}
                          >
                            <span className="font-medium mr-2">
                              {String.fromCharCode(65 + optIndex)}.
                            </span>
                            {option}
                            {optIndex === question.correctAnswer && (
                              <span className="ml-2 text-green-600">✓ 正确答案</span>
                            )}
                            {optIndex === answer?.selectedOption && !isCorrect && (
                              <span className="ml-2 text-red-600">✗ 你的选择</span>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                        <p className="text-sm text-blue-800">
                          <strong>基础解析:</strong> {question.explanation}
                        </p>
                      </div>

                      <div className="flex gap-2 mb-3">
                        <button
                          onClick={() => handleDetailedExplanation(question)}
                          disabled={state.loadingStates[`explanation_${question.id}`]}
                          className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
                        >
                          {state.loadingStates[`explanation_${question.id}`] ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              生成中...
                            </>
                          ) : (
                            '详细解析'
                          )}
                        </button>
                        <button
                          onClick={() => handleChallengeAnswer(question)}
                          disabled={state.loadingStates[`challenge_${question.id}`]}
                          className="flex-1 px-3 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
                        >
                          {state.loadingStates[`challenge_${question.id}`] ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              分析中...
                            </>
                          ) : (
                            '质疑答案'
                          )}
                        </button>
                      </div>

                      {questionDetail?.detailedExplanation && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-3">
                          <h4 className="font-semibold text-green-800 mb-2">详细解析</h4>
                          <div className="space-y-2 text-sm text-green-700">
                            <div>
                              <strong>详细说明:</strong>
                              <p>{questionDetail.detailedExplanation.detailedExplanation}</p>
                            </div>
                            
                            <div>
                              <strong>错误选项分析:</strong>
                              <ul className="list-disc list-inside ml-4">
                                {questionDetail.detailedExplanation.wrongOptionsAnalysis.map((analysis, idx) => (
                                  <li key={idx}>{analysis}</li>
                                ))}
                              </ul>
                            </div>
                            
                            <div>
                              <strong>知识扩展:</strong>
                              <p>{questionDetail.detailedExplanation.knowledgeExtension}</p>
                            </div>
                            
                            <div>
                              <strong>实际应用:</strong>
                              <p>{questionDetail.detailedExplanation.practicalApplication}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {questionDetail?.challengeResult && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-3">
                          <h4 className="font-semibold text-orange-800 mb-2">质疑分析结果</h4>
                          <div className="space-y-2 text-sm text-orange-700">
                            <div>
                              <strong>重新分析:</strong>
                              <p>{questionDetail.challengeResult.reanalysis}</p>
                            </div>
                            
                            <div>
                              <strong>AI重新思考后的答案:</strong>
                              <p className={`font-medium ${
                                questionDetail.challengeResult.finalAnswer === question.correctAnswer 
                                  ? 'text-green-600' 
                                  : 'text-red-600'
                              }`}>
                                {String.fromCharCode(65 + questionDetail.challengeResult.finalAnswer)}. {question.options[questionDetail.challengeResult.finalAnswer]}
                                {questionDetail.challengeResult.finalAnswer === question.correctAnswer 
                                  ? ' (与原答案一致)' 
                                  : ' (与原答案不同!)'}
                              </p>
                            </div>
                            
                            <div>
                              <strong>置信度:</strong>
                              <span className={`px-2 py-1 rounded text-xs ${
                                questionDetail.challengeResult.confidence === 'high' ? 'bg-green-100 text-green-700' :
                                questionDetail.challengeResult.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {questionDetail.challengeResult.confidence === 'high' ? '高' :
                                 questionDetail.challengeResult.confidence === 'medium' ? '中' : '低'}
                              </span>
                            </div>
                            
                            <div>
                              <strong>推理过程:</strong>
                              <p>{questionDetail.challengeResult.reasoning}</p>
                            </div>
                            
                            {questionDetail.challengeResult.controversies && (
                              <div>
                                <strong>争议点:</strong>
                                <p>{questionDetail.challengeResult.controversies}</p>
                              </div>
                            )}
                            
                            {questionDetail.challengeResult.alternativeViews && (
                              <div>
                                <strong>其他观点:</strong>
                                <p>{questionDetail.challengeResult.alternativeViews}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {(state.errors[`explanation_${question.id}`] || state.errors[`challenge_${question.id}`]) && (
                        <div className="mb-3">
                          {state.errors[`explanation_${question.id}`] && (
                            <ErrorMessage 
                              message={state.errors[`explanation_${question.id}`]}
                              onRetry={() => handleDetailedExplanation(question)}
                            />
                          )}
                          {state.errors[`challenge_${question.id}`] && (
                            <ErrorMessage 
                              message={state.errors[`challenge_${question.id}`]}
                              onRetry={() => handleChallengeAnswer(question)}
                            />
                          )}
                        </div>
                      )}

                      {answer?.customAnswer && (
                        <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                          <p className="text-sm text-gray-700">
                            <strong>你的补充回答:</strong> {answer.customAnswer}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 text-center space-y-4">
            <button
              onClick={async () => {
                const score = calculateScore();
                const avgTime = Object.values(state.answerTimes).reduce((sum, time) => sum + time, 0) / Object.values(state.answerTimes).length;
                const customAnswersQuality = Object.values(state.answers).filter(a => a.customAnswer && a.customAnswer.trim().length > 10).length;
                
                const performanceData = {
                  topic: state.confirmedTopic,
                  correctRate: score.correct / score.total,
                  averageTime: avgTime / 1000,
                  customAnswersCount: customAnswersQuality,
                  difficultyPerformance: state.questions.map(q => ({
                    difficulty: q.difficulty,
                    correct: state.answers[q.id]?.selectedOption === q.correctAnswer
                  }))
                };

                try {
                  const assessment = await api.generateAssessment(performanceData);
                  dispatch({ type: 'SET_ASSESSMENT', assessment });
                  dispatch({ type: 'SET_STEP', step: 'assessment' });
                } catch (error) {
                  console.error('生成学习评估失败:', error);
                }
              }}
              disabled={state.loadingStates.generateAssessment}
              className="inline-flex items-center px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {state.loadingStates.generateAssessment ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  AI正在分析你的学习能力...
                </>
              ) : (
                <>
                  <Brain className="w-5 h-5 mr-2" />
                  生成AI学习能力分析报告
                </>
              )}
            </button>

            <div>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors duration-200"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                重新开始
              </button>
            </div>

            {state.errors.generateAssessment && (
              <div className="mt-4">
                <ErrorMessage message={state.errors.generateAssessment} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

// ==================== 学习评估和大纲组件 ====================
const AssessmentDisplay = memo(() => {
  const { state, dispatch } = useAppContext();
  const api = useAPI();

  const handleGenerateOutline = async () => {
    try {
      const outline = await api.generateOutline(state.learningAssessment, state.confirmedTopic);
      dispatch({ type: 'SET_OUTLINE', outline });
      dispatch({ type: 'SET_STEP', step: 'outline' });
    } catch (error) {
      console.error('生成学习大纲失败:', error);
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'beginner': return 'text-green-600 bg-green-100';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100';
      case 'advanced': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!state.learningAssessment) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <Target className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800 mb-2">学习能力评估报告</h1>
            <p className="text-lg text-gray-600">
              基于你的测试表现，AI已完成学习能力分析
            </p>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">学习水平</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(state.learningAssessment.level)}`}>
                  {state.learningAssessment.level === 'beginner' ? '初学者' : 
                   state.learningAssessment.level === 'intermediate' ? '中级' : '高级'}
                </span>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">学习风格</h3>
                <p className="text-gray-600">
                  {state.learningAssessment.learningStyle === 'quick-learner' ? '快速学习型' :
                   state.learningAssessment.learningStyle === 'thorough-learner' ? '深度学习型' : '分析型学习'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2 text-green-600">学习优势</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  {state.learningAssessment.strengths.map((strength, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-700 mb-2 text-orange-600">改进建议</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  {state.learningAssessment.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-orange-500 mr-2">→</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 bg-white bg-opacity-70 rounded-lg">
              <p className="text-gray-700">
                <strong>评估总结：</strong> {state.learningAssessment.summary}
              </p>
            </div>
          </div>

          <div className="text-center space-y-4">
            <button
              onClick={handleGenerateOutline}
              disabled={state.loadingStates.generateOutline}
              className="inline-flex items-center px-8 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {state.loadingStates.generateOutline ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  AI正在制定个性化学习大纲...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5 mr-2" />
                  生成个性化学习大纲
                </>
              )}
            </button>

            <div>
              <button
                onClick={() => dispatch({ type: 'SET_STEP', step: 'results' })}
                className="inline-flex items-center px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors duration-200"
              >
                返回测试结果
              </button>
            </div>

            {state.errors.generateOutline && (
              <div className="mt-4">
                <ErrorMessage message={state.errors.generateOutline} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

const OutlineDisplay = memo(() => {
  const { state, dispatch } = useAppContext();
  const api = useAPI();
  const [learningRecord, setLearningRecord] = React.useState(null);

  // 加载学习记录
  React.useEffect(() => {
    if (state.currentLearningId) {
      const record = StorageManager.getLearningRecord(state.currentLearningId);
      setLearningRecord(record);
    }
  }, [state.currentLearningId]);

  // 更新学习记录
  React.useEffect(() => {
    if (state.currentLearningId && state.learningOutline) {
      StorageManager.updateLearningRecord(state.currentLearningId, {
        stage: 'outline_generated',
        outline: state.learningOutline
      });
      // 重新加载学习记录以获取最新状态
      const updatedRecord = StorageManager.getLearningRecord(state.currentLearningId);
      setLearningRecord(updatedRecord);
    }
  }, [state.currentLearningId, state.learningOutline]);

  const handleOutlineItemSelect = async (item) => {
    dispatch({ type: 'SET_SELECTED_OUTLINE_ITEM', item });
    
    // 检查是否已有生成的内容
    const existingContent = learningRecord?.learningModules?.[item.id];
    if (existingContent) {
      // 直接使用已生成的内容
      dispatch({ type: 'SET_DEEP_LEARNING_CONTENT', content: existingContent });
      dispatch({ type: 'SET_STEP', step: 'deep-learning' });
      return;
    }
    
    try {
      const result = await api.generateDeepLearning(item);
      dispatch({ type: 'SET_DEEP_LEARNING_CONTENT', content: result });
      dispatch({ type: 'SET_STEP', step: 'deep-learning' });
    } catch (error) {
      console.error('生成学习内容失败:', error);
    }
  };

  // 获取模块状态
  const getModuleStatus = (item) => {
    const hasContent = learningRecord?.learningModules?.[item.id];
    if (!hasContent) return 'not_started';
    
    // 检查是否完成了测试
    const quiz = hasContent.quiz;
    const quizAnswers = hasContent.quizAnswers; // 需要保存用户的答题记录
    
    if (quiz && quiz.length > 0) {
      // 检查是否所有题目都已完成
      if (quizAnswers && Object.keys(quizAnswers).length === quiz.length) {
        // 进一步检查每个题目是否都有答案
        const allAnswered = quiz.every((_, index) => {
          const answer = quizAnswers[index];
          return answer && (
            (answer.selectedOption !== undefined && answer.selectedOption !== null) ||
            (answer.fillAnswer && answer.fillAnswer.trim() !== '')
          );
        });
        if (allAnswered) {
          return 'completed';
        }
      }
    }
    return 'in_progress';
  };

  // 获取按钮文本和样式
  const getButtonProps = (item) => {
    const status = getModuleStatus(item);
    const isLoading = state.loadingStates[`generateDeepLearning_${item.id}`];
    
    if (isLoading) {
      return {
        text: '生成中...',
        icon: <Loader2 className="w-4 h-4 mr-2 animate-spin" />,
        className: "ml-4 inline-flex items-center px-4 py-2 bg-gray-300 text-white rounded-lg cursor-not-allowed",
        disabled: true
      };
    }
    
    switch (status) {
      case 'completed':
        return {
          text: '已完成学习',
          icon: <CheckCircle className="w-4 h-4 mr-2" />,
          className: "ml-4 inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200",
          disabled: false
        };
      case 'in_progress':
        return {
          text: '继续学习',
          icon: <Play className="w-4 h-4 mr-2" />,
          className: "ml-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200",
          disabled: false
        };
      default:
        return {
          text: '开始学习',
          icon: <Play className="w-4 h-4 mr-2" />,
          className: "ml-4 inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200",
          disabled: false
        };
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-100 border-green-200';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'advanced': return 'text-red-600 bg-red-100 border-red-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  if (!state.learningOutline) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <FileText className="w-12 h-12 text-purple-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800 mb-2">个性化学习大纲</h1>
            <p className="text-lg text-gray-600">
              基于你的能力评估，为 <span className="font-semibold text-purple-600">"{state.confirmedTopic}"</span> 定制的学习路径
            </p>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">学习路径</h3>
                <p className="text-gray-600 text-sm">{state.learningOutline.learningPath}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">预计总时长</h3>
                <p className="text-gray-600 text-sm">{state.learningOutline.totalEstimatedTime}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">学习模块</h2>
            
            {state.learningOutline.outline.map((item, index) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="text-2xl font-bold text-gray-400 mr-3">{index + 1}</span>
                      <h3 className="text-xl font-semibold text-gray-800">{item.title}</h3>
                      <span className={`ml-3 px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(item.difficulty)}`}>
                        {item.difficulty === 'beginner' ? '初级' : item.difficulty === 'intermediate' ? '中级' : '高级'}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 mb-3">{item.content}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <h4 className="font-medium text-gray-700 mb-1">学习目标</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {item.objectives.map((obj, objIndex) => (
                            <li key={objIndex} className="flex items-start">
                              <span className="text-blue-500 mr-2">•</span>
                              {obj}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-700 mb-1">预计时间</h4>
                        <p className="text-sm text-gray-600">{item.estimatedTime}</p>
                        {item.prerequisites && item.prerequisites !== 'none' && (
                          <>
                            <h4 className="font-medium text-gray-700 mb-1 mt-3">前置要求</h4>
                            <p className="text-sm text-gray-600">{item.prerequisites}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleOutlineItemSelect(item)}
                    disabled={getButtonProps(item).disabled}
                    className={getButtonProps(item).className}
                  >
                    {getButtonProps(item).icon}
                    {getButtonProps(item).text}
                  </button>
                </div>
                
                {state.errors[`generateDeepLearning_${item.id}`] && (
                  <div className="mt-3">
                    <ErrorMessage 
                      message={state.errors[`generateDeepLearning_${item.id}`]}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 text-center space-y-4">
            <button
              onClick={() => dispatch({ type: 'SET_STEP', step: 'assessment' })}
              className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors duration-200"
            >
              返回能力评估
            </button>

            <div>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors duration-200"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                重新开始
              </button>
            </div>


          </div>
        </div>
      </div>
    </div>
  );
});

// ==================== 新学习模块组件 ====================

// 必学必会概念组件
const ConceptsModule = memo(({ concepts, onDragStart, savedConceptExplanations = {}, onConceptExplanationsUpdate }) => {
  const [expandedConcept, setExpandedConcept] = React.useState(null);
  const [conceptExplanations, setConceptExplanations] = React.useState({});
  const [isPreloading, setIsPreloading] = React.useState(false);
  const [loadedConceptIds, setLoadedConceptIds] = React.useState(new Set());
  const [initialized, setInitialized] = React.useState(false);
  const api = useAPI();

  // 初始化已保存的解释（只执行一次）
  React.useEffect(() => {
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
  React.useEffect(() => {
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
              const explanation = await api.explainConcept(concept.term);
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
  }, [concepts, initialized, loadedConceptIds, conceptExplanations]);

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

// 必学必会知识点组件
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

// 智能黑板组件
const SmartBoardModule = memo(({ boardContent }) => {
  const [boards, setBoards] = React.useState([]);
  const [currentBoardIndex, setCurrentBoardIndex] = React.useState(0);
  const [question, setQuestion] = React.useState('');
  const [selectedText, setSelectedText] = React.useState('');
  const { state } = useAppContext();
  const api = useAPI();

  React.useEffect(() => {
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
      
      const response = await api.askSmartBoard(`请详细解释：${contextInfo}`, context);
      
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
      const response = await api.askSmartBoard(question, context);
      
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
      const response = await api.askSmartBoard(followUpQuestion, context);
      
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
  const isLoading = Object.values(state.loadingStates).some(loading => 
    typeof loading === 'boolean' && loading && 
    Object.keys(state.loadingStates).some(key => key.startsWith('smartBoard_'))
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

// ==================== 智慧工坊组件 ====================
const WorkshopModule = memo(({ concepts, knowledgePoints, topic }) => {
  const { dispatch } = useAppContext();
  const api = useAPI();
  const [simulatorData, setSimulatorData] = React.useState(null);
  const [parameters, setParameters] = React.useState({});
  const [currentScenario, setCurrentScenario] = React.useState(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [selectedItems, setSelectedItems] = React.useState([]);
  const [showSelection, setShowSelection] = React.useState(true);
  const [showVoxelSimulator, setShowVoxelSimulator] = React.useState(false);

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
      
      const result = await api.generateWorkshopSimulator(selectedConcepts, selectedKnowledgePoints, topic);
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
    // 不重置simulatorData，保持用户的选择
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
        // 简单的公式计算（实际应用中可能需要更复杂的表达式解析）
        const formula = calc.formula.replace(/result\s*=\s*/, '');
        const paramNames = Object.keys(parameters);
        let evalFormula = formula;
        
        paramNames.forEach(paramName => {
          evalFormula = evalFormula.replace(new RegExp(paramName, 'g'), parameters[paramName]);
        });
        
        // 使用Function构造函数替代eval，更安全
        results[calc.id] = new Function(...paramNames, `return ${evalFormula}`)(...paramNames.map(name => parameters[name]));
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
        
        // 使用Function构造函数替代eval，更安全
        return new Function(...paramNames, `return ${evalCondition}`)(...paramNames.map(name => parameters[name]));
      } catch (error) {
        console.error('反馈条件评估失败:', error);
        return false;
      }
    });
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
                  // 根据计算结果动态调整元素属性
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
                  // 这里可以添加重置逻辑，但主要的重置功能在VoxelWorldEditor内部
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
        
        <VoxelWorldEditor apiService={APIService.getInstance()} />
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
                  <span key={index} className={`px-2 py-1 rounded text-sm ${
                    item.type === 'concept' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
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
                      className={`w-full p-3 text-left rounded-lg border transition-all duration-200 ${
                        isSelected
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
                      className={`w-full p-3 text-left rounded-lg border transition-all duration-200 ${
                        isSelected
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
                    className={`w-full p-3 text-left rounded-lg border transition-colors duration-200 ${
                      currentScenario?.name === scenario.name
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
                    className={`p-3 rounded-lg ${
                      feedback.type === 'success' ? 'bg-green-100 text-green-800' :
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

// ==================== 深度学习内容组件 ====================
const DeepLearningDisplay = memo(() => {
  const { state, dispatch } = useAppContext();
  const api = useAPI();
  const [quizAnswers, setQuizAnswers] = React.useState({});
  const [showResults, setShowResults] = React.useState({});
  const [quizQuestionDetails, setQuizQuestionDetails] = React.useState({});
  const [conceptExplanations, setConceptExplanations] = React.useState({});

  // 从已保存的记录中恢复状态
  React.useEffect(() => {
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
  React.useEffect(() => {
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
  React.useEffect(() => {
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
    const result = await api.generateDetailedExplanation(question);
    setQuizQuestionDetails(prev => ({
      ...prev,
      [questionIndex]: {
        ...prev[questionIndex],
        detailedExplanation: result
      }
    }));
  };

  const handleQuizChallengeAnswer = async (question, questionIndex) => {
    const result = await api.challengeQuestionAnswer(question);
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
                                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                  showResult 
                                    ? isCorrect 
                                      ? 'bg-green-50 border-green-300 text-green-800' 
                                      : 'bg-red-50 border-red-300 text-red-800'
                                    : 'border-gray-300'
                                }`}
                              />
                            </div>
                            
                            {showResult && (
                              <div className="space-y-2">
                                <div className={`p-2 rounded text-sm ${
                                  isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
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
                            <div className={`p-3 rounded-lg border-l-4 ${
                              isCorrect 
                                ? 'bg-green-50 border-green-400' 
                                : 'bg-red-50 border-red-400'
                            }`}>
                              <p className={`font-medium ${
                                isCorrect ? 'text-green-800' : 'text-red-800'
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
                                disabled={state.loadingStates[`explanation_${q.id || 'quiz'}`]}
                                className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
                              >
                                {state.loadingStates[`explanation_${q.id || 'quiz'}`] ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                    生成中...
                                  </>
                                ) : (
                                  '详细解析'
                                )}
                              </button>
                              <button
                                onClick={() => handleQuizChallengeAnswer(q, index)}
                                disabled={state.loadingStates[`challenge_${q.id || 'quiz'}`]}
                                className="flex-1 px-3 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
                              >
                                {state.loadingStates[`challenge_${q.id || 'quiz'}`] ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                    分析中...
                                  </>
                                ) : (
                                  '质疑答案'
                                )}
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
                                    <p className={`font-medium ${
                                      (q.type === 'fill_blank' 
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
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      quizQuestionDetails[index].challengeResult.confidence === 'high' ? 'bg-green-100 text-green-700' :
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

                            {(state.errors[`explanation_${q.id || 'quiz'}`] || state.errors[`challenge_${q.id || 'quiz'}`]) && (
                              <div>
                                {state.errors[`explanation_${q.id || 'quiz'}`] && (
                                  <ErrorMessage 
                                    message={state.errors[`explanation_${q.id || 'quiz'}`]}
                                    onRetry={() => handleQuizDetailedExplanation(q, index)}
                                  />
                                )}
                                {state.errors[`challenge_${q.id || 'quiz'}`] && (
                                  <ErrorMessage 
                                    message={state.errors[`challenge_${q.id || 'quiz'}`]}
                                    onRetry={() => handleQuizChallengeAnswer(q, index)}
                                  />
                                )}
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

// ==================== 主应用组件 ====================
const App = () => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const contextValue = useMemo(() => ({ state, dispatch }), [state]);

  const renderCurrentStep = () => {
    // 如果显示个人中心，直接返回个人中心组件
    if (state.showPersonalCenter) {
      return <PersonalCenter />;
    }

    switch (state.currentStep) {
      case 'topic':
        return <TopicSelector />;
      case 'confirm':
        return <TopicConfirmation />;
      case 'story':
        return <StoryDisplay />;
      case 'quiz':
      case 'generating':
        return <QuizInterface />;
      case 'results':
        return <ResultsDisplay />;
      case 'assessment':
        return <AssessmentDisplay />;
      case 'outline':
        return <OutlineDisplay />;
      case 'deep-learning':
        return <DeepLearningDisplay />;
      default:
        return <TopicSelector />;
    }
  };

  return (
    <ErrorBoundary>
      <AppContext.Provider value={contextValue}>
        <div className="app">
          {renderCurrentStep()}
        </div>
      </AppContext.Provider>
    </ErrorBoundary>
  );
};

export default App;