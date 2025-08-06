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

        // Simple sanitization to avoid circular dependency
        const cleanTopic = topic.trim().replace(/[<>]/g, '');
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
            stage: data.stage || 'topic_confirmed', // topic_confirmed, story_completed, quiz_completed, assessment_completed, outline_generated, learning_started
            // 保存完整的页面数据
            storyContent: data.storyContent || null,
            questions: data.questions || null,
            answers: data.answers || {},
            answerTimes: data.answerTimes || {},
            currentQuestion: data.currentQuestion || 0,
            learningAssessment: data.learningAssessment || null,
            testResults: data.testResults || null,
            outline: data.outline || null,
            learningModules: data.learningModules || {},
            selectedOutlineItem: data.selectedOutlineItem || null,
            deepLearningContent: data.deepLearningContent || null,
            // 选择相关数据
            selectedTopic: data.selectedTopic || null,
            customTopic: data.customTopic || null,
            topicOptions: data.topicOptions || null,
            confirmedTopic: data.confirmedTopic || data.topic,
            metadata: {
                totalQuestions: data.totalQuestions || 0,
                correctAnswers: data.correctAnswers || 0,
                score: data.score || 0,
                lastActivity: new Date().toISOString()
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

    // 恢复学习状态数据
    restoreStateFromRecord: (learningRecord) => {
        if (!learningRecord) return {};

        return {
            // 基础数据
            confirmedTopic: learningRecord.confirmedTopic || learningRecord.originalTopic,
            selectedTopic: learningRecord.selectedTopic,
            customTopic: learningRecord.customTopic,
            topicOptions: learningRecord.topicOptions,
            currentLearningId: learningRecord.id,

            // 页面内容数据
            storyContent: learningRecord.storyContent,
            questions: learningRecord.questions,
            answers: learningRecord.answers || {},
            answerTimes: learningRecord.answerTimes || {},
            currentQuestion: learningRecord.currentQuestion || 0,

            // 评估和大纲数据
            learningAssessment: learningRecord.learningAssessment,
            learningOutline: learningRecord.outline,
            selectedOutlineItem: learningRecord.selectedOutlineItem,
            deepLearningContent: learningRecord.deepLearningContent,

            // 测试结果
            testResults: learningRecord.testResults
        };
    },

    // 更新主题显示名称
    updateTopicDisplayName: (learningId, newDisplayName) => {
        // Simple sanitization to avoid circular dependency
        const cleanName = newDisplayName ? newDisplayName.trim().replace(/[<>]/g, '') : '';
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

export default StorageManager;