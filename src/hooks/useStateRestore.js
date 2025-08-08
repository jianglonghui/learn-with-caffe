import { useAppContext } from '../context/AppContext';
import StorageManager from '../services/StorageManager';

export const useStateRestore = () => {
    const { dispatch } = useAppContext();

    // 根据learningId恢复状态
    const restoreStateByLearningId = (learningId) => {
        if (!learningId) return false;

        const learningRecord = StorageManager.getLearningRecord(learningId);
        if (!learningRecord) {
            console.warn('找不到学习记录:', learningId);
            return false;
        }

        const stateData = StorageManager.restoreStateFromRecord(learningRecord);

        // 批量更新状态
        Object.entries(stateData).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                switch (key) {
                    case 'confirmedTopic':
                        dispatch({ type: 'SET_CONFIRMED_TOPIC', topic: value });
                        break;
                    case 'selectedTopic':
                        dispatch({ type: 'SET_TOPIC', topic: value });
                        break;
                    case 'customTopic':
                        dispatch({ type: 'SET_CUSTOM_TOPIC', topic: value });
                        break;
                    case 'topicOptions':
                        dispatch({ type: 'SET_TOPIC_OPTIONS', options: value });
                        break;
                    case 'currentLearningId':
                        dispatch({ type: 'SET_CURRENT_LEARNING_ID', learningId: value });
                        break;
                    case 'storyContent':
                        dispatch({ type: 'SET_STORY_CONTENT', content: value });
                        break;
                    case 'questions':
                        dispatch({ type: 'SET_QUESTIONS', questions: value });
                        break;
                    case 'answers':
                        // 恢复所有答案和时间
                        Object.entries(value).forEach(([questionId, answer]) => {
                            const time = stateData.answerTimes?.[questionId] || 0;
                            dispatch({ type: 'SET_ANSWER', questionId, answer, time });
                        });
                        break;
                    case 'answerTimes':
                        // answerTimes通过answers case一起处理，这里跳过
                        break;
                    case 'currentQuestion':
                        dispatch({ type: 'SET_CURRENT_QUESTION', index: value });
                        break;
                    case 'learningAssessment':
                        dispatch({ type: 'SET_ASSESSMENT', assessment: value });
                        break;
                    case 'learningOutline':
                        dispatch({ type: 'SET_OUTLINE', outline: value });
                        break;
                    case 'selectedOutlineItem':
                        dispatch({ type: 'SET_SELECTED_OUTLINE_ITEM', item: value });
                        break;
                    case 'deepLearningContent':
                        dispatch({ type: 'SET_DEEP_LEARNING_CONTENT', content: value });
                        break;
                    default:
                        break;
                }
            }
        });

        console.log('状态已恢复:', learningId, {
            ...stateData,
            // 显示关键数据的摘要
            hasStoryContent: !!stateData.storyContent,
            hasQuestions: !!stateData.questions,
            answerCount: Object.keys(stateData.answers || {}).length,
            hasAssessment: !!stateData.learningAssessment,
            hasOutline: !!stateData.learningOutline
        });
        return true;
    };

    // 保存当前状态到学习记录
    const saveCurrentState = (learningId, additionalData = {}) => {
        if (!learningId) return false;

        // 这里需要从context获取当前状态
        // 由于我们在Hook中，需要通过state获取数据
        const updateData = {
            ...additionalData,
            updatedAt: new Date().toISOString()
        };

        return StorageManager.updateLearningRecord(learningId, updateData);
    };

    return {
        restoreStateByLearningId,
        saveCurrentState
    };
};