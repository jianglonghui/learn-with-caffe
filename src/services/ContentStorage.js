// 内容持久化存储服务
class ContentStorage {
    constructor() {
        this.POSTS_KEY = 'knowledge_posts';
        this.USER_POSTS_KEY = 'user_posts';
        this.USERS_KEY = 'users_data';
        this.FOLLOWING_KEY = 'following_list';
        this.LIKES_KEY = 'liked_posts';
        this.BOOKMARKS_KEY = 'bookmarked_posts';
        this.initializeStorage();
    }

    initializeStorage() {
        // 初始化存储结构
        if (!localStorage.getItem(this.POSTS_KEY)) {
            localStorage.setItem(this.POSTS_KEY, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.USER_POSTS_KEY)) {
            localStorage.setItem(this.USER_POSTS_KEY, JSON.stringify({}));
        }
        if (!localStorage.getItem(this.USERS_KEY)) {
            localStorage.setItem(this.USERS_KEY, JSON.stringify(this.getDefaultUsers()));
        }
        if (!localStorage.getItem(this.FOLLOWING_KEY)) {
            localStorage.setItem(this.FOLLOWING_KEY, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.LIKES_KEY)) {
            localStorage.setItem(this.LIKES_KEY, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.BOOKMARKS_KEY)) {
            localStorage.setItem(this.BOOKMARKS_KEY, JSON.stringify([]));
        }
        
        // 修复损坏的用户数据
        this.fixBrokenUserData();
    }

    getDefaultUsers() {
        return {
            'xiaoyu': {
                id: 'xiaoyu',
                name: '调香师小雅',
                avatar: '🌸',
                expertise: '调香师',
                verified: true,
                bio: '独立调香师｜芳疗师认证｜用香味记录生活的美好瞬间。相信每个人都有属于自己的味道，帮助过500+客人找到专属香氛。',
                location: '杭州',
                joinDate: '2020年3月',
                website: 'xiaoyuperfume.com',
                followers: 12842,
                following: 328,
                postsCount: 156,
                tags: ['调香', '芳疗', '香水', '精油', '手作'],
                achievements: [
                    '🏆 2023年度创意调香师',
                    '📚 《寻香记》专栏作者',
                    '🎓 IFA国际芳疗师认证'
                ]
            },
            'laochen': {
                id: 'laochen',
                name: '古籍修复师老陈',
                avatar: '📜',
                expertise: '古籍修复师',
                verified: true,
                bio: '国家图书馆古籍修复中心｜30年修书匠人｜让时光倒流，让智慧传承。修复过宋元明清古籍2000余册。',
                location: '北京',
                joinDate: '2019年8月',
                website: null,
                followers: 8956,
                following: 156,
                postsCount: 89,
                tags: ['古籍修复', '传统工艺', '文物保护', '手工艺'],
                achievements: [
                    '🏆 国家级非遗传承人',
                    '📚 《古籍修复技艺》作者',
                    '🎓 故宫博物院特聘专家'
                ]
            },
            'linainai': {
                id: 'linainai',
                name: '退休教师李奶奶',
                avatar: '👵',
                expertise: '生活达人',
                verified: false,
                bio: '退休中学化学老师｜三个孙子的奶奶｜用知识让生活更有趣。分享我的生活小智慧，希望能帮到大家。',
                location: '上海',
                joinDate: '2021年6月',
                website: null,
                followers: 23567,
                following: 89,
                postsCount: 234,
                tags: ['生活技巧', '科学小实验', '育儿', '化学'],
                achievements: [
                    '🌟 月度最受欢迎分享者',
                    '❤️ 温暖社区贡献者',
                    '📚 生活智慧达人'
                ]
            }
        };
    }

    // 保存主页推文
    savePosts(posts, append = false) {
        const existingPosts = this.getPosts();
        let newPosts;
        
        if (append) {
            // 去重：检查是否有相同内容的推文
            const existingContents = new Set(existingPosts.map(p => p.content));
            const uniqueNewPosts = posts.filter(p => !existingContents.has(p.content));
            newPosts = [...existingPosts, ...uniqueNewPosts];
        } else {
            newPosts = [...posts, ...existingPosts];
        }
        
        // 限制总数量为500条
        if (newPosts.length > 500) {
            newPosts = newPosts.slice(0, 500);
        }
        
        localStorage.setItem(this.POSTS_KEY, JSON.stringify(newPosts));
        return newPosts;
    }

    // 获取主页推文
    getPosts(limit = 50, offset = 0) {
        const posts = JSON.parse(localStorage.getItem(this.POSTS_KEY) || '[]');
        return posts.slice(offset, offset + limit);
    }

    // 保存用户推文
    saveUserPosts(userId, posts, append = false) {
        const userPosts = JSON.parse(localStorage.getItem(this.USER_POSTS_KEY) || '{}');
        
        if (!userPosts[userId]) {
            userPosts[userId] = [];
        }
        
        if (append) {
            // 去重
            const existingContents = new Set(userPosts[userId].map(p => p.content));
            const uniqueNewPosts = posts.filter(p => !existingContents.has(p.content));
            userPosts[userId] = [...userPosts[userId], ...uniqueNewPosts];
        } else {
            userPosts[userId] = [...posts, ...(userPosts[userId] || [])];
        }
        
        // 每个用户限制200条
        if (userPosts[userId].length > 200) {
            userPosts[userId] = userPosts[userId].slice(0, 200);
        }
        
        localStorage.setItem(this.USER_POSTS_KEY, JSON.stringify(userPosts));
        return userPosts[userId];
    }

    // 获取用户推文
    getUserPosts(userId, limit = 20, offset = 0) {
        const userPosts = JSON.parse(localStorage.getItem(this.USER_POSTS_KEY) || '{}');
        const posts = userPosts[userId] || [];
        return posts.slice(offset, offset + limit);
    }

    // 获取用户信息
    getUser(userId) {
        const users = JSON.parse(localStorage.getItem(this.USERS_KEY) || '{}');
        return users[userId];
    }

    // 更新用户信息
    updateUser(userId, updates) {
        const users = JSON.parse(localStorage.getItem(this.USERS_KEY) || '{}');
        if (users[userId]) {
            users[userId] = { ...users[userId], ...updates };
            localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
        }
        return users[userId];
    }

    // 添加新用户（从AI生成的内容中提取）
    addUserFromPost(post) {
        const users = JSON.parse(localStorage.getItem(this.USERS_KEY) || '{}');
        const userId = this.generateUserIdFromName(post.expertName);
        
        if (!users[userId]) {
            users[userId] = {
                id: userId,
                name: post.expertName,
                avatar: post.expertAvatar,
                expertise: post.expertise,
                verified: post.verified || false,
                bio: `${post.expertise}｜分享专业知识和生活感悟`,
                location: '中国',
                joinDate: new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' }),
                website: null,
                followers: Math.floor(Math.random() * 10000) + 100,
                following: Math.floor(Math.random() * 500) + 10,
                postsCount: 1,
                tags: [post.topic],
                achievements: []
            };
            localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
        }
        
        return users[userId];
    }

    // 生成用户ID (公共方法)
    generateUserIdFromName(name) {
        const userIdMap = {
            '调香师小雅': 'xiaoyu',
            '古籍修复师老陈': 'laochen',
            '退休教师李奶奶': 'linainai'
        };
        
        if (userIdMap[name]) {
            return userIdMap[name];
        }
        
        // 对于其他用户名，使用哈希或简单编码
        // 提取职业和关键词
        let id = '';
        
        // 常见职业映射
        const professionMap = {
            '教授': 'prof',
            '博士': 'dr',
            '老师': 'teacher',
            '专家': 'expert',
            '师傅': 'master',
            '达人': 'expert',
            '大师': 'master'
        };
        
        // 学科映射
        const subjectMap = {
            '心理学': 'psychology',
            '物理': 'physics',
            '化学': 'chemistry',
            '生物': 'biology',
            '数学': 'math',
            '历史': 'history',
            '地理': 'geography',
            '语言': 'language',
            '文学': 'literature',
            '艺术': 'art',
            '音乐': 'music',
            '体育': 'sports',
            '医学': 'medicine',
            '工程': 'engineering',
            '计算机': 'computer',
            '经济': 'economics',
            '法律': 'law',
            '哲学': 'philosophy'
        };
        
        // 寻找学科
        for (const [chinese, english] of Object.entries(subjectMap)) {
            if (name.includes(chinese)) {
                id += english + '_';
                break;
            }
        }
        
        // 寻找职业
        for (const [chinese, english] of Object.entries(professionMap)) {
            if (name.includes(chinese)) {
                id += english;
                break;
            }
        }
        
        // 如果没有匹配到，使用简单的数字ID
        if (!id) {
            id = 'user_' + Math.abs(this.simpleHash(name));
        }
        
        return id;
    }
    
    // 简单哈希函数
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return hash;
    }
    
    // 分析用户关注偏好
    analyzeUserPreferences() {
        const following = this.getFollowing();
        const preferences = {
            subjects: {},
            professions: {},
            contentTypes: {},
            verificationPreference: 0,
            totalFollowing: following.length
        };

        following.forEach(userId => {
            const user = this.getUser(userId);
            if (user) {
                // 分析专业领域偏好
                if (user.tags) {
                    user.tags.forEach(tag => {
                        preferences.subjects[tag] = (preferences.subjects[tag] || 0) + 1;
                    });
                }

                // 分析职业偏好
                const expertise = user.expertise || '';
                const professionKeywords = ['教授', '博士', '专家', '老师', '师傅', '达人', '大师', '工程师', '设计师', '医生', '律师'];
                professionKeywords.forEach(keyword => {
                    if (expertise.includes(keyword)) {
                        preferences.professions[keyword] = (preferences.professions[keyword] || 0) + 1;
                    }
                });

                // 认证偏好
                if (user.verified) {
                    preferences.verificationPreference += 1;
                }
            }
        });

        // 计算百分比
        preferences.verificationRate = preferences.totalFollowing > 0 ? 
            preferences.verificationPreference / preferences.totalFollowing : 0;

        return preferences;
    }

    // 生成推荐用户
    generateRecommendationPrompt() {
        const preferences = this.analyzeUserPreferences();
        
        if (preferences.totalFollowing === 0) {
            // 如果用户没有关注任何人，返回多样化推荐
            return {
                subjects: ['心理学', '物理', '化学', '历史', '艺术', '音乐', '烹饪', '健身'],
                professions: ['教授', '专家', '老师', '达人'],
                verificationRate: 0.6,
                diversityLevel: 'high'
            };
        }

        // 获取最喜欢的学科（前3个）
        const topSubjects = Object.entries(preferences.subjects)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([subject]) => subject);

        // 获取最喜欢的职业类型
        const topProfessions = Object.entries(preferences.professions)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 2)
            .map(([profession]) => profession);

        // 添加相关领域推荐
        const relatedSubjects = this.getRelatedSubjects(topSubjects);
        const allSubjects = [...new Set([...topSubjects, ...relatedSubjects])];

        return {
            subjects: allSubjects,
            professions: topProfessions.length > 0 ? topProfessions : ['专家', '老师'],
            verificationRate: preferences.verificationRate,
            diversityLevel: preferences.totalFollowing < 3 ? 'high' : 'medium',
            userPreferences: preferences
        };
    }

    // 获取相关学科
    getRelatedSubjects(subjects) {
        const relatedMap = {
            '物理': ['数学', '天文', '工程'],
            '化学': ['生物', '医学', '材料科学'],
            '生物': ['医学', '化学', '心理学'],
            '数学': ['物理', '计算机', '经济学'],
            '心理学': ['教育', '社会学', '哲学'],
            '历史': ['文学', '考古', '政治'],
            '艺术': ['设计', '音乐', '摄影'],
            '音乐': ['艺术', '文学', '心理学'],
            '烹饪': ['营养', '化学', '文化'],
            '计算机': ['数学', '工程', '逻辑学'],
            '医学': ['生物', '化学', '心理学'],
            '文学': ['历史', '哲学', '语言学'],
            '经济学': ['数学', '心理学', '政治学']
        };

        const related = [];
        subjects.forEach(subject => {
            if (relatedMap[subject]) {
                related.push(...relatedMap[subject]);
            }
        });

        return [...new Set(related)].slice(0, 3);
    }

    // 修复损坏的用户数据
    fixBrokenUserData() {
        const users = JSON.parse(localStorage.getItem(this.USERS_KEY) || '{}');
        const userPosts = JSON.parse(localStorage.getItem(this.USER_POSTS_KEY) || '{}');
        const posts = JSON.parse(localStorage.getItem(this.POSTS_KEY) || '[]');
        
        // 如果存在空字符串用户ID，需要修复
        if (users['']) {
            const brokenUser = users[''];
            const correctId = this.generateUserIdFromName(brokenUser.name);
            
            console.log(`修复用户: ${brokenUser.name}, 原ID: "", 新ID: ${correctId}`);
            
            // 移动用户数据
            users[correctId] = { ...brokenUser, id: correctId };
            delete users[''];
            
            // 移动用户推文
            if (userPosts['']) {
                userPosts[correctId] = userPosts[''];
                delete userPosts[''];
            }
            
            // 更新主页推文中的专家信息
            const updatedPosts = posts.map(post => {
                if (post.expertName === brokenUser.name) {
                    return { ...post, id: post.id || `${correctId}-${Date.now()}-${Math.random()}` };
                }
                return post;
            });
            
            // 保存修复后的数据
            localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
            localStorage.setItem(this.USER_POSTS_KEY, JSON.stringify(userPosts));
            localStorage.setItem(this.POSTS_KEY, JSON.stringify(updatedPosts));
            
            console.log('用户数据修复完成');
        }
    }

    // 关注管理
    followUser(userId) {
        const following = JSON.parse(localStorage.getItem(this.FOLLOWING_KEY) || '[]');
        if (!following.includes(userId)) {
            following.push(userId);
            localStorage.setItem(this.FOLLOWING_KEY, JSON.stringify(following));
            
            // 更新用户的关注者数
            const user = this.getUser(userId);
            if (user) {
                this.updateUser(userId, { followers: user.followers + 1 });
            }
        }
        return following;
    }

    unfollowUser(userId) {
        let following = JSON.parse(localStorage.getItem(this.FOLLOWING_KEY) || '[]');
        following = following.filter(id => id !== userId);
        localStorage.setItem(this.FOLLOWING_KEY, JSON.stringify(following));
        
        // 更新用户的关注者数
        const user = this.getUser(userId);
        if (user) {
            this.updateUser(userId, { followers: Math.max(0, user.followers - 1) });
        }
        
        return following;
    }

    getFollowing() {
        return JSON.parse(localStorage.getItem(this.FOLLOWING_KEY) || '[]');
    }

    isFollowing(userId) {
        const following = this.getFollowing();
        return following.includes(userId);
    }

    // 点赞管理
    likePost(postId) {
        const likes = JSON.parse(localStorage.getItem(this.LIKES_KEY) || '[]');
        if (!likes.includes(postId)) {
            likes.push(postId);
            localStorage.setItem(this.LIKES_KEY, JSON.stringify(likes));
        }
        return likes;
    }

    unlikePost(postId) {
        let likes = JSON.parse(localStorage.getItem(this.LIKES_KEY) || '[]');
        likes = likes.filter(id => id !== postId);
        localStorage.setItem(this.LIKES_KEY, JSON.stringify(likes));
        return likes;
    }

    isLiked(postId) {
        const likes = JSON.parse(localStorage.getItem(this.LIKES_KEY) || '[]');
        return likes.includes(postId);
    }

    // 收藏管理
    bookmarkPost(postId) {
        const bookmarks = JSON.parse(localStorage.getItem(this.BOOKMARKS_KEY) || '[]');
        if (!bookmarks.includes(postId)) {
            bookmarks.push(postId);
            localStorage.setItem(this.BOOKMARKS_KEY, JSON.stringify(bookmarks));
        }
        return bookmarks;
    }

    unbookmarkPost(postId) {
        let bookmarks = JSON.parse(localStorage.getItem(this.BOOKMARKS_KEY) || '[]');
        bookmarks = bookmarks.filter(id => id !== postId);
        localStorage.setItem(this.BOOKMARKS_KEY, JSON.stringify(bookmarks));
        return bookmarks;
    }

    isBookmarked(postId) {
        const bookmarks = JSON.parse(localStorage.getItem(this.BOOKMARKS_KEY) || '[]');
        return bookmarks.includes(postId);
    }

    // 清除所有数据（用于调试）
    clearAll() {
        localStorage.removeItem(this.POSTS_KEY);
        localStorage.removeItem(this.USER_POSTS_KEY);
        localStorage.removeItem(this.USERS_KEY);
        localStorage.removeItem(this.FOLLOWING_KEY);
        localStorage.removeItem(this.LIKES_KEY);
        localStorage.removeItem(this.BOOKMARKS_KEY);
        this.initializeStorage();
    }

    // 导出数据（用于备份）
    exportData() {
        return {
            posts: JSON.parse(localStorage.getItem(this.POSTS_KEY) || '[]'),
            userPosts: JSON.parse(localStorage.getItem(this.USER_POSTS_KEY) || '{}'),
            users: JSON.parse(localStorage.getItem(this.USERS_KEY) || '{}'),
            following: JSON.parse(localStorage.getItem(this.FOLLOWING_KEY) || '[]'),
            likes: JSON.parse(localStorage.getItem(this.LIKES_KEY) || '[]'),
            bookmarks: JSON.parse(localStorage.getItem(this.BOOKMARKS_KEY) || '[]')
        };
    }

    // 导入数据（用于恢复）
    importData(data) {
        if (data.posts) localStorage.setItem(this.POSTS_KEY, JSON.stringify(data.posts));
        if (data.userPosts) localStorage.setItem(this.USER_POSTS_KEY, JSON.stringify(data.userPosts));
        if (data.users) localStorage.setItem(this.USERS_KEY, JSON.stringify(data.users));
        if (data.following) localStorage.setItem(this.FOLLOWING_KEY, JSON.stringify(data.following));
        if (data.likes) localStorage.setItem(this.LIKES_KEY, JSON.stringify(data.likes));
        if (data.bookmarks) localStorage.setItem(this.BOOKMARKS_KEY, JSON.stringify(data.bookmarks));
    }
}

// 单例模式
const contentStorage = new ContentStorage();
export default contentStorage;