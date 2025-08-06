import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { generatePath, extractParams, isCurrentRoute } from '../utils/routerUtils';

// 自定义导航Hook
export const useNavigation = () => {
    const navigate = useNavigate();
    const params = useParams();
    const location = useLocation();

    // 导航函数
    const navigateTo = {
        home: () => navigate('/'),
        confirm: (topic) => navigate(generatePath.confirm(topic)),
        story: (learningId) => navigate(generatePath.story(learningId)),
        quiz: (learningId) => navigate(generatePath.quiz(learningId)),
        quizGenerating: (learningId) => navigate(generatePath.quizGenerating(learningId)),
        results: (learningId) => navigate(generatePath.results(learningId)),
        assessment: (learningId) => navigate(generatePath.assessment(learningId)),
        outline: (learningId) => navigate(generatePath.outline(learningId)),
        learning: (learningId, moduleId) => navigate(generatePath.learning(learningId, moduleId)),
        profile: () => navigate('/profile'),
        back: () => navigate(-1),
        replace: (path) => navigate(path, { replace: true })
    };

    // 获取当前路由参数
    const currentParams = {
        topic: params.topic || extractParams.topic(location.pathname),
        learningId: params.learningId || extractParams.learningId(location.pathname),
        moduleId: params.moduleId || extractParams.moduleId(location.pathname)
    };

    // 判断当前路由
    const currentRoute = {
        isHome: isCurrentRoute.home(location.pathname),
        isConfirm: isCurrentRoute.confirm(location.pathname),
        isStory: isCurrentRoute.story(location.pathname),
        isQuiz: isCurrentRoute.quiz(location.pathname),
        isResults: isCurrentRoute.results(location.pathname),
        isAssessment: isCurrentRoute.assessment(location.pathname),
        isOutline: isCurrentRoute.outline(location.pathname),
        isLearning: isCurrentRoute.learning(location.pathname),
        isProfile: isCurrentRoute.profile(location.pathname)
    };

    return {
        navigateTo,
        currentParams,
        currentRoute,
        location,
        params
    };
};