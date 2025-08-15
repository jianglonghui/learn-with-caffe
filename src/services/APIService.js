import { SecurityUtils } from './SecurityUtils';

// ==================== API服务层 ====================
class APIService {
    constructor() {
        this.baseURL = import.meta.env.REACT_APP_API_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
        this.maxRetries = 3;
        this.timeout = 30000;

        // 验证API key配置
        if (!import.meta.env.REACT_APP_GLM_API_KEY) {
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
            thinking: { type: "disabled" }
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
                        "Authorization": `Bearer ${import.meta.env.REACT_APP_GLM_API_KEY}`
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

    async generateUserPosts(userName, expertise, context, count = 5) {
        const prompt = `为"${userName}"（${expertise}）生成${count}条个人推文。

用户背景：${context}

严格按照以下JSON格式返回：
{
  "posts": [
    {
      "id": "unique_id",
      "content": "推文内容（保持该用户的语言风格和专业特色，100-200字）",
      "image": "可选的emoji图标",
      "timestamp": "时间（如：2小时前、昨天、3天前）",
      "type": "knowledge/trivia/tip/experience/achievement"
    }
  ]
}

要求：
1. 保持用户的专业特色和个人风格
2. 内容要连贯，体现专业性
3. 时间要有变化，显示不同时期的推文
4. 内容类型要多样化

DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`;
        return this.request(prompt, { maxTokens: 3000 });
    }

    async generateRecommendedUsers(recommendationData, count = 4) {
        const { subjects, professions, verificationRate, diversityLevel, userPreferences } = recommendationData;
        
        const prompt = `基于用户的关注偏好，生成${count}个推荐的知识博主。

用户偏好分析：
- 喜欢的学科：${subjects.join('、')}
- 喜欢的职业类型：${professions.join('、')}
- 认证博主偏好：${Math.round(verificationRate * 100)}%
- 多样性需求：${diversityLevel}

要求生成相似但不重复的博主，${diversityLevel === 'high' ? '加强多样性，引入新领域' : '重点关注用户已关注的领域'}。

严格按照以下JSON格式返回：
{
  "users": [
    {
      "name": "博主名称",
      "avatar": "emoji头像",
      "expertise": "专业身份",
      "verified": true/false,
      "bio": "个人简介（50-80字，体现专业特色和个人魅力）",
      "tags": ["标签1", "标签2", "标签3"],
      "specialties": ["特长1", "特长2"],
      "reason": "推荐理由（为什么推荐给这个用户）"
    }
  ]
}

示例：
- 如果用户关注调香师和古籍修复师，可推荐茶艺师、陶艺大师等传统工艺相关博主
- 如果用户关注心理学教授，可推荐教育学专家、社会学研究员等
- 如果用户喜欢认证博主，优先推荐有认证的专家

生成的博主要有真实感和个性，避免重复现有用户。

DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`;
        
        return this.request(prompt, { maxTokens: 3000 });
    }

    async generateKnowledgeFeed(topics = [], count = 5) {
        const topicsString = topics.length > 0 ? topics.join('、') : '随机领域';
        const prompt = `生成${count}条多样化的社交分享内容。要包含以下几种类型的分享者：

1. 学术专家（占30%）：分享专业知识
2. 小众职业者（占30%）：如调香师、手语翻译、宠物行为训练师、古籍修复师、潜水教练、咖啡品鉴师等
3. 生活达人（占20%）：分享用小知识改善生活的经历
4. 普通人小成就（占20%）：分享学以致用的小故事

内容涵盖：${topicsString}

严格按照以下JSON格式返回：
{
  "posts": [
    {
      "id": "unique_id",
      "expertName": "分享者名称（如：调香师小雅、咖啡师老王、退休教师李奶奶）",
      "expertAvatar": "emoji图标",
      "expertise": "身份/职业（如：调香师、生活达人、化学爱好者）",
      "verified": true/false,
      "content": "分享内容（100-200字，要有故事性和真实感）",
      "image": "可选的emoji图标",
      "topic": "主题标签",
      "type": "knowledge/trivia/tip/experience/achievement",
      "timestamp": "刚刚"
    }
  ]
}

内容示例：
- 调香师："今天有客人想要'雨后森林'的味道。我用了雪松、苔藓和一点柠檬草，她说闻到就想起了童年在外婆家的夏天..."
- 手语翻译："你知道吗？手语中的'谢谢'在不同国家完全不同。中国是手掌从下巴向前推，而美国是..."
- 退休教师："用了物理课上的杠杆原理，终于打开了卡了3年的老抽屉！原来支点的位置这么重要..."
- 咖啡师："今天发现了个小技巧：咖啡闷蒸时画个'十'字，气体释放更均匀，做出的手冲风味提升了好多！"

要求：
1. 内容要有温度、有故事感
2. 小众职业要真实存在，描述要专业
3. 生活小成就要接地气，让人有共鸣
4. 混合不同类型，营造多元社区氛围

DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`;
        return this.request(prompt, { maxTokens: 4000 });
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

export default APIService;