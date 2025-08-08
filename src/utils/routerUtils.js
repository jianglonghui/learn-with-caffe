// 路由工具函数
export const ROUTES = {
    HOME: '/',
    CONFIRM: '/confirm',
    STORY: '/story',
    QUIZ: '/quiz',
    RESULTS: '/results',
    ASSESSMENT: '/assessment',
    OUTLINE: '/outline',
    LEARNING: '/learning',
    PROFILE: '/profile'
};

// 生成带参数的路由路径
export const generatePath = {
    confirm: (topic) => `${ROUTES.CONFIRM}/${encodeURIComponent(topic)}`,
    story: (learningId) => `${ROUTES.STORY}/${learningId}`,
    quiz: (learningId) => `${ROUTES.QUIZ}/${learningId}`,
    quizGenerating: (learningId) => `${ROUTES.QUIZ}/${learningId}/generating`,
    results: (learningId) => `${ROUTES.RESULTS}/${learningId}`,
    assessment: (learningId) => `${ROUTES.ASSESSMENT}/${learningId}`,
    outline: (learningId) => `${ROUTES.OUTLINE}/${learningId}`,
    learning: (learningId, moduleId) => `${ROUTES.LEARNING}/${learningId}/${moduleId}`
};

// 从URL中提取参数
export const extractParams = {
    topic: (pathname) => {
        const match = pathname.match(/^\/confirm\/(.+)$/);
        return match ? decodeURIComponent(match[1]) : null;
    },
    learningId: (pathname) => {
        const match = pathname.match(/^\/(story|quiz|results|assessment|outline|learning)\/([^/]+)/);
        return match ? match[2] : null;
    },
    moduleId: (pathname) => {
        const match = pathname.match(/^\/learning\/[^/]+\/(.+)$/);
        return match ? match[1] : null;
    }
};

// 判断当前是否在特定路由
export const isCurrentRoute = {
    home: (pathname) => pathname === '/',
    confirm: (pathname) => pathname.startsWith('/confirm/'),
    story: (pathname) => pathname.startsWith('/story/'),
    quiz: (pathname) => pathname.startsWith('/quiz/'),
    results: (pathname) => pathname.startsWith('/results/'),
    assessment: (pathname) => pathname.startsWith('/assessment/'),
    outline: (pathname) => pathname.startsWith('/outline/'),
    learning: (pathname) => pathname.startsWith('/learning/'),
    profile: (pathname) => pathname === '/profile'
};