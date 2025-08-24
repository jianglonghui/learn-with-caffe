// 头像管理工具

// 可用的头像列表
const AVATARS = {
  boy: [
    'fog.png',
    'panda.png', 
    'shark.png',
    'tiger.png'
  ],
  girl: [
    'bear.png',
    'cat.png',
    'rabbit.png',
    'rabbit_2.png'
  ]
};

// 获取所有头像列表
export const getAllAvatars = () => {
  const allAvatars = [];
  
  Object.keys(AVATARS).forEach(gender => {
    AVATARS[gender].forEach(filename => {
      allAvatars.push(`/avatar/${gender}/${filename}`);
    });
  });
  
  return allAvatars;
};

// 随机选择一个头像
export const getRandomAvatar = () => {
  const allAvatars = getAllAvatars();
  const randomIndex = Math.floor(Math.random() * allAvatars.length);
  return allAvatars[randomIndex];
};

// 根据性别随机选择头像
export const getRandomAvatarByGender = (gender) => {
  if (!AVATARS[gender]) {
    return getRandomAvatar();
  }
  
  const genderAvatars = AVATARS[gender];
  const randomIndex = Math.floor(Math.random() * genderAvatars.length);
  return `/avatar/${gender}/${genderAvatars[randomIndex]}`;
};

// 获取特定头像路径
export const getAvatarPath = (gender, filename) => {
  return `/avatar/${gender}/${filename}`;
};

export default {
  getAllAvatars,
  getRandomAvatar,
  getRandomAvatarByGender,
  getAvatarPath,
};