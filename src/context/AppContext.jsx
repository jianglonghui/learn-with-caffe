import React, { createContext, useContext, useReducer, useMemo } from 'react';
import APIService from '../services/APIService';

// ==================== 状态管理 ====================
export const initialState = {
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

export function appReducer(state, action) {
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

export const AppContext = createContext(null);

// ==================== Context Provider ====================
export const AppProvider = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, initialState);
    const contextValue = useMemo(() => ({ state, dispatch }), [state]);

    return (
        <AppContext.Provider value={contextValue}>
            {children}
        </AppContext.Provider>
    );
};

// ==================== 自定义Hooks ====================
export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within AppProvider');
    }
    return context;
};

export const useAPI = () => {
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