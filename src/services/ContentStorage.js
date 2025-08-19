// 内容持久化存储服务
import { getRandomAvatar } from '../utils/avatarUtils.js';

class ContentStorage {
    constructor() {
        this.POSTS_KEY = 'knowledge_posts';
        this.USER_POSTS_KEY = 'user_posts';
        this.USER_BLOG_POSTS_KEY = 'user_blog_posts';
        this.USERS_KEY = 'users_data';
        this.FOLLOWING_KEY = 'following_list';
        this.LIKES_KEY = 'liked_posts';
        this.BOOKMARKS_KEY = 'bookmarked_posts';
        this.RECOMMENDATIONS_KEY = 'recommendations_cache';
        this.CHEERS_KEY = 'cheers_data';
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
        if (!localStorage.getItem(this.USER_BLOG_POSTS_KEY)) {
            localStorage.setItem(this.USER_BLOG_POSTS_KEY, JSON.stringify({}));
        }
        if (!localStorage.getItem(this.RECOMMENDATIONS_KEY)) {
            localStorage.setItem(this.RECOMMENDATIONS_KEY, JSON.stringify({}));
        }
        if (!localStorage.getItem(this.CHEERS_KEY)) {
            localStorage.setItem(this.CHEERS_KEY, JSON.stringify({}));
        }
        
        // 修复损坏的用户数据
        this.fixBrokenUserData();
    }

    getDefaultUsers() {
        // 为默认用户也使用一致的ID生成逻辑
        const users = {};
        const defaultUserData = [
            {
                name: '调香师小雅',
                avatar: getRandomAvatar(),
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
            {
                name: '古籍修复师老陈',
                avatar: getRandomAvatar(),
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
            {
                name: '退休教师李奶奶',
                avatar: getRandomAvatar(),
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
        ];
        
        // 使用统一的ID生成逻辑
        defaultUserData.forEach(userData => {
            const id = this.generateUserIdFromName(userData.name);
            users[id] = {
                id,
                ...userData
            };
        });
        
        return users;
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

    // 保存用户博客文章
    saveUserBlogPosts(userId, blogPosts, append = false) {
        const userBlogPosts = JSON.parse(localStorage.getItem(this.USER_BLOG_POSTS_KEY) || '{}');
        
        if (!userBlogPosts[userId]) {
            userBlogPosts[userId] = [];
        }
        
        if (append) {
            // 去重
            const existingIds = new Set(userBlogPosts[userId].map(p => p.id));
            const uniqueNewPosts = blogPosts.filter(p => !existingIds.has(p.id));
            userBlogPosts[userId] = [...userBlogPosts[userId], ...uniqueNewPosts];
        } else {
            userBlogPosts[userId] = blogPosts;
        }
        
        // 每个用户限制50篇博客
        if (userBlogPosts[userId].length > 50) {
            userBlogPosts[userId] = userBlogPosts[userId].slice(0, 50);
        }
        
        localStorage.setItem(this.USER_BLOG_POSTS_KEY, JSON.stringify(userBlogPosts));
        return userBlogPosts[userId];
    }

    // 获取用户博客文章
    getUserBlogPosts(userId) {
        const userBlogPosts = JSON.parse(localStorage.getItem(this.USER_BLOG_POSTS_KEY) || '{}');
        return userBlogPosts[userId] || [];
    }

    // 获取单篇博客文章
    getUserBlogPost(userId, postId) {
        const blogPosts = this.getUserBlogPosts(userId);
        return blogPosts.find(post => post.id === postId);
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
                avatar: getRandomAvatar(),
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
        // 移除硬编码映射，让所有用户都使用一致的ID生成逻辑
        // 直接使用名字的hash值作为ID，确保唯一性和一致性
        const hash = Math.abs(this.simpleHash(name));
        const id = 'user_' + hash;
        
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
        let hasChanges = false;
        
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
            
            hasChanges = true;
        }
        
        // 检查并修复所有用户ID与名字的一致性
        const usersCopy = { ...users }; // 创建副本以避免在迭代时修改
        Object.entries(usersCopy).forEach(([currentId, user]) => {
            if (user.name) {
                const expectedId = this.generateUserIdFromName(user.name);
                if (currentId !== expectedId) {
                    console.log(`发现ID不一致: 用户"${user.name}" 当前ID="${currentId}" 应为="${expectedId}"`);
                    
                    // 如果目标ID不存在，迁移数据
                    if (!users[expectedId]) {
                        console.log(`迁移用户数据: ${currentId} -> ${expectedId}`);
                        users[expectedId] = { ...user, id: expectedId };
                        delete users[currentId];
                        
                        // 迁移用户推文
                        if (userPosts[currentId]) {
                            userPosts[expectedId] = userPosts[currentId];
                            delete userPosts[currentId];
                        }
                        
                        // 迁移用户博客文章
                        const userBlogPosts = JSON.parse(localStorage.getItem(this.USER_BLOG_POSTS_KEY) || '{}');
                        if (userBlogPosts[currentId]) {
                            userBlogPosts[expectedId] = userBlogPosts[currentId];
                            delete userBlogPosts[currentId];
                            localStorage.setItem(this.USER_BLOG_POSTS_KEY, JSON.stringify(userBlogPosts));
                        }
                        
                        // 更新关注列表
                        const following = JSON.parse(localStorage.getItem(this.FOLLOWING_KEY) || '[]');
                        const updatedFollowing = following.map(id => id === currentId ? expectedId : id);
                        if (JSON.stringify(following) !== JSON.stringify(updatedFollowing)) {
                            localStorage.setItem(this.FOLLOWING_KEY, JSON.stringify(updatedFollowing));
                        }
                        
                        hasChanges = true;
                    } else {
                        console.log(`目标ID ${expectedId} 已存在，保留原数据`);
                    }
                }
            }
        });
        
        // 保存修复后的数据
        if (hasChanges) {
            localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
            localStorage.setItem(this.USER_POSTS_KEY, JSON.stringify(userPosts));
            localStorage.setItem(this.POSTS_KEY, JSON.stringify(posts));
            console.log('✅ 用户数据修复完成');
        }

        // 检查是否需要更新头像 (一次性操作)
        const avatarUpdateKey = 'avatar_update_completed_v1';
        const hasUpdatedAvatars = localStorage.getItem(avatarUpdateKey);
        
        if (!hasUpdatedAvatars) {
            console.log('🎭 首次运行头像随机化更新...');
            this.updateAllAvatarsToRandom();
            // 清除推荐用户缓存，确保新生成的推荐用户使用随机头像
            this.clearRecommendationsCache();
            console.log('🗑️ 清除推荐用户缓存，确保头像更新生效');
            localStorage.setItem(avatarUpdateKey, 'true');
            console.log('✅ 头像随机化更新完成并标记');
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
            
            // 关注状态变化，清除推荐缓存
            this.clearRecommendationsCache();
            console.log('👤 关注用户后清除推荐缓存:', userId);
        }
        return following;
    }

    unfollowUser(userId) {
        let following = JSON.parse(localStorage.getItem(this.FOLLOWING_KEY) || '[]');
        const wasFollowing = following.includes(userId);
        following = following.filter(id => id !== userId);
        localStorage.setItem(this.FOLLOWING_KEY, JSON.stringify(following));
        
        // 更新用户的关注者数
        const user = this.getUser(userId);
        if (user) {
            this.updateUser(userId, { followers: Math.max(0, user.followers - 1) });
        }
        
        // 如果确实取消了关注，清除推荐缓存
        if (wasFollowing) {
            this.clearRecommendationsCache();
            console.log('👤 取消关注用户后清除推荐缓存:', userId);
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
        localStorage.removeItem(this.USER_BLOG_POSTS_KEY);
        localStorage.removeItem(this.RECOMMENDATIONS_KEY);
        localStorage.removeItem(this.CHEERS_KEY);
        this.initializeStorage();
        console.log('🗑️ 所有数据已清除并重新初始化');
    }
    
    // 清除AI生成的数据，保留默认用户
    clearGeneratedData() {
        const defaultUsers = this.getDefaultUsers();
        localStorage.setItem(this.USERS_KEY, JSON.stringify(defaultUsers));
        localStorage.removeItem(this.POSTS_KEY);
        localStorage.removeItem(this.USER_POSTS_KEY);
        localStorage.removeItem(this.USER_BLOG_POSTS_KEY);
        localStorage.removeItem(this.RECOMMENDATIONS_KEY);
        
        // 重新初始化空数据
        localStorage.setItem(this.POSTS_KEY, JSON.stringify([]));
        localStorage.setItem(this.USER_POSTS_KEY, JSON.stringify({}));
        localStorage.setItem(this.USER_BLOG_POSTS_KEY, JSON.stringify({}));
        localStorage.setItem(this.RECOMMENDATIONS_KEY, JSON.stringify({}));
        
        console.log('🧹 AI生成的数据已清除，默认用户已保留');
    }

    // 更新所有现有用户和帖子的头像为随机头像
    updateAllAvatarsToRandom() {
        console.log('🎭 开始更新所有头像为随机头像...');
        
        // 更新用户数据
        const users = JSON.parse(localStorage.getItem(this.USERS_KEY) || '{}');
        let userUpdated = false;
        Object.keys(users).forEach(userId => {
            const newAvatar = getRandomAvatar();
            if (users[userId].avatar !== newAvatar) {
                users[userId].avatar = newAvatar;
                userUpdated = true;
                console.log(`👤 更新用户 ${users[userId].name} 的头像: ${newAvatar}`);
            }
        });
        
        if (userUpdated) {
            localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
        }
        
        // 更新主页帖子
        const posts = JSON.parse(localStorage.getItem(this.POSTS_KEY) || '[]');
        let postsUpdated = false;
        posts.forEach(post => {
            if (post.expertAvatar) {
                const newAvatar = getRandomAvatar();
                if (post.expertAvatar !== newAvatar) {
                    post.expertAvatar = newAvatar;
                    postsUpdated = true;
                }
            }
        });
        
        if (postsUpdated) {
            localStorage.setItem(this.POSTS_KEY, JSON.stringify(posts));
            console.log(`📝 更新了 ${posts.length} 个主页帖子的头像`);
        }
        
        // 更新用户帖子
        const userPosts = JSON.parse(localStorage.getItem(this.USER_POSTS_KEY) || '{}');
        let userPostsUpdated = false;
        Object.keys(userPosts).forEach(userId => {
            const userPostList = userPosts[userId];
            userPostList.forEach(post => {
                if (post.expertAvatar) {
                    const newAvatar = getRandomAvatar();
                    if (post.expertAvatar !== newAvatar) {
                        post.expertAvatar = newAvatar;
                        userPostsUpdated = true;
                    }
                }
            });
        });
        
        if (userPostsUpdated) {
            localStorage.setItem(this.USER_POSTS_KEY, JSON.stringify(userPosts));
            console.log('📋 更新了用户帖子的头像');
        }
        
        console.log('✅ 所有头像更新完成！');
        return { userUpdated, postsUpdated, userPostsUpdated };
    }

    // 导出数据（用于备份）
    exportData() {
        return {
            posts: JSON.parse(localStorage.getItem(this.POSTS_KEY) || '[]'),
            userPosts: JSON.parse(localStorage.getItem(this.USER_POSTS_KEY) || '{}'),
            users: JSON.parse(localStorage.getItem(this.USERS_KEY) || '{}'),
            following: JSON.parse(localStorage.getItem(this.FOLLOWING_KEY) || '[]'),
            likes: JSON.parse(localStorage.getItem(this.LIKES_KEY) || '[]'),
            bookmarks: JSON.parse(localStorage.getItem(this.BOOKMARKS_KEY) || '[]'),
            recommendations: JSON.parse(localStorage.getItem(this.RECOMMENDATIONS_KEY) || '{}'),
            cheers: JSON.parse(localStorage.getItem(this.CHEERS_KEY) || '{}')
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
        if (data.recommendations) localStorage.setItem(this.RECOMMENDATIONS_KEY, JSON.stringify(data.recommendations));
        if (data.cheers) localStorage.setItem(this.CHEERS_KEY, JSON.stringify(data.cheers));
    }

    // ==================== 推荐缓存管理 ====================
    
    // 生成关注状态的hash值，用于检测关注变化
    generateFollowingHash() {
        const following = this.getFollowing().sort();
        return this.simpleHash(JSON.stringify(following));
    }

    // 保存推荐结果到缓存
    saveRecommendations(users, userPreferences) {
        const cache = {
            users,
            userPreferences,
            followingHash: this.generateFollowingHash(),
            timestamp: Date.now(),
            // 缓存有效期：24小时
            expiresAt: Date.now() + (24 * 60 * 60 * 1000)
        };
        
        localStorage.setItem(this.RECOMMENDATIONS_KEY, JSON.stringify(cache));
        console.log('✅ 推荐结果已缓存:', { 
            用户数量: users.length, 
            关注状态hash: cache.followingHash,
            过期时间: new Date(cache.expiresAt).toLocaleString()
        });
    }

    // 获取缓存的推荐结果
    getCachedRecommendations() {
        try {
            const cached = JSON.parse(localStorage.getItem(this.RECOMMENDATIONS_KEY) || '{}');
            
            // 检查缓存是否为空
            if (!cached.users || !cached.timestamp) {
                console.log('📭 推荐缓存为空');
                return null;
            }

            // 检查缓存是否过期
            if (Date.now() > cached.expiresAt) {
                console.log('⏰ 推荐缓存已过期，需要重新生成');
                this.clearRecommendationsCache();
                return null;
            }

            // 检查关注状态是否发生变化
            const currentHash = this.generateFollowingHash();
            if (cached.followingHash !== currentHash) {
                console.log('🔄 关注状态已变化，缓存失效:', {
                    缓存时hash: cached.followingHash,
                    当前hash: currentHash
                });
                this.clearRecommendationsCache();
                return null;
            }

            console.log('✅ 使用缓存的推荐结果:', {
                用户数量: cached.users.length,
                缓存时间: new Date(cached.timestamp).toLocaleString(),
                剩余有效期: Math.round((cached.expiresAt - Date.now()) / (1000 * 60 * 60)) + '小时'
            });
            
            return {
                users: cached.users,
                userPreferences: cached.userPreferences
            };
        } catch (error) {
            console.error('❌ 读取推荐缓存失败:', error);
            this.clearRecommendationsCache();
            return null;
        }
    }

    // 检查推荐缓存是否有效
    isRecommendationsCacheValid() {
        const cached = this.getCachedRecommendations();
        return cached !== null;
    }

    // 清除推荐缓存
    clearRecommendationsCache() {
        localStorage.setItem(this.RECOMMENDATIONS_KEY, JSON.stringify({}));
        console.log('🗑️ 推荐缓存已清除');
    }

    // 强制刷新推荐（清除缓存）
    refreshRecommendations() {
        this.clearRecommendationsCache();
        console.log('🔄 强制刷新推荐，缓存已清除');
    }

    // 手动刷新所有头像（用于调试和手动更新）
    refreshAllAvatars() {
        console.log('🔄 手动刷新所有头像...');
        // 移除已完成标记，强制重新运行
        localStorage.removeItem('avatar_update_completed_v1');
        const result = this.updateAllAvatarsToRandom();
        localStorage.setItem('avatar_update_completed_v1', 'true');
        console.log('✅ 手动头像刷新完成！请刷新页面查看效果。');
        return result;
    }
    
    // 获取缓存统计信息
    getRecommendationsCacheInfo() {
        try {
            const cached = JSON.parse(localStorage.getItem(this.RECOMMENDATIONS_KEY) || '{}');
            if (!cached.timestamp) {
                return { hasCache: false };
            }
            
            return {
                hasCache: true,
                userCount: cached.users?.length || 0,
                cacheTime: new Date(cached.timestamp).toLocaleString(),
                expiresAt: new Date(cached.expiresAt).toLocaleString(),
                isValid: Date.now() < cached.expiresAt && cached.followingHash === this.generateFollowingHash(),
                followingHash: cached.followingHash,
                currentHash: this.generateFollowingHash()
            };
        } catch {
            return { hasCache: false };
        }
    }

    // ==================== 打Call功能管理 ====================
    
    // 获取今天的日期key
    getTodayKey() {
        const today = new Date();
        return today.getFullYear() + '-' + 
               String(today.getMonth() + 1).padStart(2, '0') + '-' + 
               String(today.getDate()).padStart(2, '0');
    }

    // 为博主打call
    cheerForUser(userId, userName) {
        try {
            const todayKey = this.getTodayKey();
            const cheersData = JSON.parse(localStorage.getItem(this.CHEERS_KEY) || '{}');
            
            // 初始化今日数据结构
            if (!cheersData[todayKey]) {
                cheersData[todayKey] = {};
            }
            
            // 初始化用户数据
            if (!cheersData[todayKey][userId]) {
                cheersData[todayKey][userId] = {
                    name: userName,
                    count: 0,
                    lastCheerTime: Date.now()
                };
            }
            
            // 增加打call次数
            cheersData[todayKey][userId].count += 1;
            cheersData[todayKey][userId].lastCheerTime = Date.now();
            
            // 保存数据
            localStorage.setItem(this.CHEERS_KEY, JSON.stringify(cheersData));
            
            console.log(`🎉 为 ${userName} 打call! 今日总数: ${cheersData[todayKey][userId].count}`);
            
            return cheersData[todayKey][userId].count;
        } catch (error) {
            console.error('打call失败:', error);
            return 0;
        }
    }

    // 获取用户今日打call次数
    getUserTodayCheerCount(userId) {
        try {
            const todayKey = this.getTodayKey();
            const cheersData = JSON.parse(localStorage.getItem(this.CHEERS_KEY) || '{}');
            
            return cheersData[todayKey]?.[userId]?.count || 0;
        } catch (error) {
            console.error('获取打call次数失败:', error);
            return 0;
        }
    }

    // 获取今日打call排行榜（前3名）
    getTodayCheerLeaderboard() {
        try {
            const todayKey = this.getTodayKey();
            const cheersData = JSON.parse(localStorage.getItem(this.CHEERS_KEY) || '{}');
            const todayData = cheersData[todayKey] || {};
            
            // 转换为数组并排序
            const leaderboard = Object.entries(todayData)
                .map(([userId, data]) => ({
                    userId,
                    name: data.name,
                    count: data.count,
                    lastCheerTime: data.lastCheerTime
                }))
                .sort((a, b) => {
                    // 先按打call次数排序，如果次数相同则按最后打call时间排序
                    if (b.count !== a.count) {
                        return b.count - a.count;
                    }
                    return b.lastCheerTime - a.lastCheerTime;
                })
                .slice(0, 3); // 只取前3名

            // 补充用户头像信息
            const enrichedLeaderboard = leaderboard.map(item => {
                const user = this.getUser(item.userId);
                return {
                    ...item,
                    avatar: user?.avatar || '👤',
                    expertise: user?.expertise || '用户'
                };
            });

            console.log('🏆 今日打call排行榜:', enrichedLeaderboard);
            return enrichedLeaderboard;
        } catch (error) {
            console.error('获取排行榜失败:', error);
            return [];
        }
    }

    // 获取全部打call统计数据
    getAllCheerStats() {
        try {
            const cheersData = JSON.parse(localStorage.getItem(this.CHEERS_KEY) || '{}');
            const stats = {
                totalDays: Object.keys(cheersData).length,
                todayTotal: 0,
                topUsers: []
            };

            const todayKey = this.getTodayKey();
            const todayData = cheersData[todayKey] || {};
            
            // 计算今日总打call数
            stats.todayTotal = Object.values(todayData)
                .reduce((sum, userData) => sum + userData.count, 0);

            // 计算所有时间的用户排名
            const allTimeStats = {};
            Object.values(cheersData).forEach(dayData => {
                Object.entries(dayData).forEach(([userId, userData]) => {
                    if (!allTimeStats[userId]) {
                        allTimeStats[userId] = {
                            name: userData.name,
                            totalCount: 0
                        };
                    }
                    allTimeStats[userId].totalCount += userData.count;
                });
            });

            stats.topUsers = Object.entries(allTimeStats)
                .map(([userId, data]) => ({ userId, ...data }))
                .sort((a, b) => b.totalCount - a.totalCount)
                .slice(0, 10);

            return stats;
        } catch (error) {
            console.error('获取打call统计失败:', error);
            return { totalDays: 0, todayTotal: 0, topUsers: [] };
        }
    }

    // 清除过期的打call数据（保留最近30天）
    cleanupOldCheerData() {
        try {
            const cheersData = JSON.parse(localStorage.getItem(this.CHEERS_KEY) || '{}');
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const cutoffDate = thirtyDaysAgo.getFullYear() + '-' + 
                              String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0') + '-' + 
                              String(thirtyDaysAgo.getDate()).padStart(2, '0');

            let deletedDays = 0;
            Object.keys(cheersData).forEach(dateKey => {
                if (dateKey < cutoffDate) {
                    delete cheersData[dateKey];
                    deletedDays++;
                }
            });

            if (deletedDays > 0) {
                localStorage.setItem(this.CHEERS_KEY, JSON.stringify(cheersData));
                console.log(`🗑️ 清理了 ${deletedDays} 天的过期打call数据`);
            }
        } catch (error) {
            console.error('清理打call数据失败:', error);
        }
    }
}

// 单例模式
const contentStorage = new ContentStorage();

// 启动时清理过期数据
contentStorage.cleanupOldCheerData();

// 开发环境下，将ContentStorage实例暴露到全局window对象，方便调试
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    window.contentStorage = contentStorage;
    console.log('🔧 开发模式：contentStorage 已暴露到 window.contentStorage');
    console.log('💡 可以使用 window.contentStorage.refreshAllAvatars() 手动刷新所有头像');
}

export default contentStorage;