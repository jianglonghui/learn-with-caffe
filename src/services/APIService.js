import { SecurityUtils } from './SecurityUtils';

// ==================== API服务层 ====================
class APIService {
    constructor() {
        this.baseURL = import.meta.env.REACT_APP_API_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
        this.maxRetries = 3;
        this.timeout = 30000;
        this.activeRequests = new Map(); // 用于去重的请求映射

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
        
        // 生成请求的唯一标识符（基于prompt的hash）
        const requestKey = this.generateRequestKey(sanitizedPrompt);
        
        // 检查是否有相同的请求正在进行
        if (this.activeRequests.has(requestKey)) {
            console.log(`⚠️ 检测到重复请求，等待已有请求完成: ${prompt.substring(0, 50)}...`);
            return await this.activeRequests.get(requestKey);
        }

        const requestBody = {
            model: options.model || "glm-4.5",
            max_tokens: options.maxTokens || 2000,
            messages: [{ role: "user", content: sanitizedPrompt }],
            thinking: { type: "disabled" }
        };

        console.log(`🚀 API请求开始: ${prompt.substring(0, 50)}...`);
        
        // 创建请求Promise并存储到activeRequests中
        const requestPromise = this.executeRequest(requestBody, options);
        this.activeRequests.set(requestKey, requestPromise);
        
        try {
            const result = await requestPromise;
            return result;
        } finally {
            // 请求完成后删除记录
            this.activeRequests.delete(requestKey);
        }
    }

    async executeRequest(requestBody, options) {
        let lastError;
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            console.log(`📡 API请求尝试 ${attempt}/${this.maxRetries}`);
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
                    throw new Error(`HTTP ${response.status}: ${response.status}`);
                }

                const data = await response.json();

                if (!SecurityUtils.validateApiResponse(data, ['choices'])) {
                    throw new Error('Invalid API response format');
                }

                console.log(`✅ API请求成功`);
                const content = data.choices[0]?.message?.content || '';
                
                // 检查是否期望JSON格式
                if (options.expectJSON !== false && (content.includes('{') || content.includes('['))) {
                    return this.cleanAndParseJSON(content);
                } else {
                    // 返回纯文本
                    return content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
                }

            } catch (error) {
                console.warn(`❌ API请求尝试 ${attempt} 失败:`, error.message);
                lastError = error;
                if (attempt < this.maxRetries) {
                    const waitTime = Math.pow(2, attempt) * 1000;
                    console.log(`⏳ 等待 ${waitTime}ms 后重试...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
        }
        console.error(`🚫 API请求最终失败:`, lastError);
        throw lastError;
    }

    generateRequestKey(prompt) {
        // 简单的hash函数生成唯一key
        let hash = 0;
        for (let i = 0; i < prompt.length; i++) {
            const char = prompt.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return `req_${Math.abs(hash)}`;
    }

    cleanAndParseJSON(responseText) {
        console.log('🔍 原始响应文本:', responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''));
        
        try {
            let cleanText = responseText
                .replace(/```json\s*/g, "")
                .replace(/```\s*/g, "")
                .trim();

            console.log('🧹 清理后的文本:', cleanText.substring(0, 500) + (cleanText.length > 500 ? '...' : ''));

            // 检测并处理被引号包围的JSON字符串
            if (cleanText.startsWith('"') && cleanText.endsWith('"')) {
                console.log('🔧 检测到外层引号，进行处理...');
                cleanText = cleanText.slice(1, -1);
                cleanText = cleanText
                    .replace(/\\"/g, '"')
                    .replace(/\\n/g, '\n')
                    .replace(/\\\\/g, '\\');
            }

            // 进一步清理
            cleanText = cleanText
                .replace(/[\r\n\t]/g, ' ')
                .replace(/\s+/g, ' ')
                .replace(/,(\s*[}\]])/g, '$1');

            // 修复引号问题
            cleanText = this.fixQuotesInJSON(cleanText);
            
            console.log('✅ 最终清理的JSON:', cleanText.substring(0, 500) + (cleanText.length > 500 ? '...' : ''));
            
            const result = JSON.parse(cleanText);
            console.log('🎉 JSON解析成功');
            return result;
        } catch (error) {
            console.error('❌ JSON解析失败详情:', {
                error: error.message,
                原始文本长度: responseText.length,
                原始文本: responseText.substring(0, 200)
            });
            
            // 尝试修复常见的JSON问题
            const fixedText = this.attemptJSONFix(responseText);
            if (fixedText) {
                try {
                    console.log('🔧 尝试修复后的JSON:', fixedText.substring(0, 200));
                    const result = JSON.parse(fixedText);
                    console.log('🎉 修复后解析成功');
                    return result;
                } catch (fixError) {
                    console.error('❌ 修复后仍然失败:', fixError.message);
                }
            }
            
            throw new Error(`JSON解析失败: ${error.message || '未知错误'}`);
        }
    }

    attemptJSONFix(responseText) {
        try {
            console.log('🔧 开始JSON修复...');
            
            // 移除markdown代码块标记
            let cleanText = responseText
                .replace(/```json\s*/g, '')
                .replace(/```\s*/g, '')
                .trim();
            
            // 尝试修复1：处理完整的JSON对象
            let jsonMatch = cleanText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                let jsonText = jsonMatch[0];
                console.log('🔍 找到JSON对象，长度:', jsonText.length);
                
                // 专门处理content字段中的长文本
                jsonText = this.fixLongTextInJSON(jsonText);
                
                return jsonText;
            }
            
            // 尝试修复2：寻找数组格式
            jsonMatch = cleanText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return jsonMatch[0];
            }
            
            return null;
        } catch (error) {
            console.error('JSON修复失败:', error);
            return null;
        }
    }

    fixLongTextInJSON(jsonText) {
        try {
            // 使用正则表达式找到content字段的值并修复
            const contentMatch = jsonText.match(/"content"\s*:\s*"([\s\S]*?)"\s*}/);
            if (contentMatch) {
                const originalContent = contentMatch[1];
                console.log('🔧 修复content字段，原长度:', originalContent.length);
                
                // 修复content字段中的特殊字符
                const fixedContent = originalContent
                    .replace(/\\/g, '\\\\')  // 转义反斜杠
                    .replace(/"/g, '\\"')    // 转义双引号
                    .replace(/\n/g, '\\n')   // 转义换行符
                    .replace(/\r/g, '\\r')   // 转义回车符
                    .replace(/\t/g, '\\t');  // 转义制表符
                
                // 替换原JSON中的content字段
                const fixedJSON = jsonText.replace(
                    /"content"\s*:\s*"[\s\S]*?"\s*}/,
                    `"content": "${fixedContent}"}`
                );
                
                console.log('✅ content字段修复完成');
                return fixedJSON;
            }
            
            // 如果没有找到content字段，进行通用修复
            return jsonText
                .replace(/,\s*}/g, '}')  // 移除对象末尾的逗号
                .replace(/,\s*]/g, ']')  // 移除数组末尾的逗号
                .replace(/([{,]\s*)(\w+):/g, '$1"$2":');  // 为属性名添加引号
                
        } catch (error) {
            console.error('长文本修复失败:', error);
            return jsonText;
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
        const { subjects, professions, verificationRate } = recommendationData;
        
        const prompt = `基于用户偏好，生成${count}个能提供实用生活指导的知识博主。

【推荐策略】
优先推荐以下类型的实用博主：

1. **人际关系专家（40%）**：
   - 职场导师、HR专家、心理咨询师
   - 专门解决沟通、恋爱、职场人际问题
   - 能提供具体可操作的人际技巧

2. **科技生活达人（35%）**：
   - 数码博主、软件测评师、效率专家
   - 分享实用工具和生活技巧
   - 帮助提升数字生活品质

3. **赚钱理财导师（25%）**：
   - 理财顾问、创业导师、副业专家
   - 分享具体的赚钱机会和方法
   - 提供实用的理财和职业建议

用户当前偏好：
- 关注领域：${subjects.join('、')}
- 职业类型：${professions.join('、')}
- 认证偏好：${Math.round(verificationRate * 100)}%

严格按照以下JSON格式返回：
{
  "users": [
    {
      "name": "博主名称",
      "avatar": "emoji头像", 
      "expertise": "专业身份（重点突出实用性）",
      "verified": true/false,
      "bio": "个人简介（50-80字，强调能解决什么实际问题，有什么成功案例）",
      "tags": ["实用技能", "具体领域", "解决方案"],
      "specialties": ["具体能力1", "具体能力2"],
      "reason": "推荐理由（说明这个博主能帮用户解决什么具体问题）"
    }
  ]
}

示例博主类型：
- "职场沟通导师李老师" - 专门教授面试技巧和职场人际关系
- "理财规划师小王" - 分享大学生理财和副业赚钱方法  
- "效率工具达人张同学" - 推荐各种提升学习和工作效率的软件
- "心理咨询师陈医生" - 帮助解决恋爱、友情和自信心问题

要求：
1. 每个博主都要有明确的实用价值定位
2. 简介要体现具体的成功案例或数据
3. 标签要直接说明能解决的问题
4. 推荐理由要针对用户的实际需求
5. 避免纯理论性的专家，要实战派

DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`;
        
        return this.request(prompt, { maxTokens: 3000 });
    }

    async generateKnowledgeFeed(topics = [], count = 5) {
        const topicsString = topics.length > 0 ? topics.join('、') : '人际关系、科技产品、赚钱商机';
        const prompt = `生成${count}条对年轻人真正有用的实用内容分享。重点关注以下主题：

【核心主题（必须涉及）】
1. 人际关系技巧（占40%）：职场沟通、恋爱交友、家庭相处、社交心理
2. 科技产品实用指南（占35%）：手机电脑使用技巧、软件推荐、数字生活优化
3. 赚钱和理财知识（占25%）：副业机会、投资入门、省钱技巧、职业规划

分享者类型：
- 职场导师/HR：分享职场人际和沟通技巧
- 心理咨询师：分享情感和人际关系建议  
- 数码博主：分享科技产品使用心得
- 理财顾问：分享投资理财知识
- 创业者：分享赚钱机会和商业思维
- 生活达人：分享实用生活技能

内容涵盖：${topicsString}

严格按照以下JSON格式返回：
{
  "posts": [
    {
      "id": "unique_id",
      "expertName": "分享者名称",
      "expertAvatar": "emoji图标",
      "expertise": "身份/职业",
      "verified": true/false,
      "content": "实用内容分享（120-180字，直接给出可操作的建议或技巧）",
      "image": "可选的emoji图标",
      "topic": "主题标签",
      "type": "tip/guide/opportunity/skill",
      "timestamp": "刚刚"
    }
  ]
}

内容示例：
- HR小李："面试时被问'为什么离职'？千万别说前公司坏话。正确答案：'寻求更大发展空间，这个职位正好匹配我的职业规划'。我用这套话术帮助了200+求职者成功入职。"
- 心理咨询师："内向的人如何在聚会不尴尬？试试'3个问题法'：1.你最近在忙什么？2.这个听起来很有意思，能详细说说吗？3.你觉得这个对你意味着什么？让对方多说话，你就不会冷场。"
- 数码博主王老师："iPhone拍照技巧：开启网格线，把主体放在交叉点；逆光时长按屏幕锁定曝光；拍人物用人像模式调到f2.8光圈。这三招让你拍出朋友圈最赞的照片。"
- 理财顾问："大学生赚第一桶金：1.做家教（时薪50-100）2.闲鱼倒卖（选择数码产品）3.写作投稿（公众号征稿）4.技能变现（PPT制作、PS修图）。选一个坚持3个月，月入2000+不是梦。"
- 创业导师："发现一个冷门赚钱机会：帮小区居民代收快递。投资300元买个货架，收费2元/件，一天30件就是60元。我朋友在三线城市做这个，月入6000+，关键是门槛低风险小。"

要求：
1. 内容必须实用可操作，不要空洞的鸡汤
2. 聚焦年轻人最关心的现实问题
3. 提供具体的数字、方法、步骤
4. 避免过于理想化的建议
5. 每条内容都要有实际价值

DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`;
        return this.request(prompt, { maxTokens: 4000 });
    }

    async generateUserBlogPosts(userName, expertise, context, count = 5) {
        const prompt = `你是博主"${userName}"（${expertise}），要为你的个人博客生成${count}篇文章信息。

【背景信息】
${context}

【重点方向】
无论你的专业身份是什么，都要从以下角度思考和创作实用内容：

1. **人际关系与沟通**：
   - 如何在你的专业领域建立有效的人际网络
   - 与同事、客户、上级的沟通技巧
   - 处理职场冲突和人际矛盾的实战经验
   - 如何在专业环境中展现个人魅力

2. **科技工具与效率提升**：
   - 你所在行业最实用的软件和工具推荐
   - 如何用科技手段提高工作效率
   - 数字化转型对你这个行业的影响
   - 新技术带来的机遇和挑战

3. **赚钱机会与职业发展**：
   - 你这个行业的副业机会和变现方式
   - 职业成长路径和薪资谈判技巧
   - 如何将专业技能转化为额外收入
   - 行业内的投资和理财建议

【内容要求】
- 必须提供具体可行的建议，不要空泛理论
- 分享真实的个人经历和案例
- 给出具体的数字、方法、步骤
- 内容要对年轻人的现实生活有帮助
- 每篇文章都要有实际操作价值

请严格按照以下JSON格式输出：

{
  "blogPosts": [
    {
      "id": "post1",
      "title": "实用性强、能解决具体问题的标题",
      "preview": "预览要包含具体的技巧、方法或机会，让读者立即感受到价值，100-150字",
      "category": "人际技巧/科技工具/赚钱机会/职场发展",
      "readTime": "5分钟",
      "tags": ["实用技巧", "具体标签1", "具体标签2"]
    }
  ]
}

内容示例：
- 程序员："我用这3个沟通技巧，让产品经理不再频繁改需求" （人际关系）
- 设计师："推荐5个AI工具，让你的设计效率提升300%" （科技工具）
- 会计："兼职代账如何月入5000+？我的实操经验分享" （赚钱机会）
- 老师："从月薪3000到年薪20万，我是如何转型做培训师的" （职业发展）

注意：
- 标题要直接说明能解决什么问题或获得什么收益
- 预览要包含具体的方法、数字或步骤
- 避免抽象概念，专注实用价值
- 不要包含换行符和特殊字符

现在请深入分析"${userName}""${expertise}"这个身份，生成真正有用的实战内容：`;
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

export default APIService;