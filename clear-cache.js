#!/usr/bin/env node

// 清除浏览器缓存的脚本 - 在开发环境中使用
console.log('🧹 清除浏览器缓存脚本');
console.log('');

const instructions = `
该脚本主要用于清除虚拟博主系统的所有缓存数据。

### 使用方法：

1. **在浏览器控制台中运行：**
   打开开发者工具 (F12) -> Console标签 -> 粘贴以下代码：

   \`\`\`javascript
   // 清除所有缓存
   Object.keys(localStorage).forEach(key => localStorage.removeItem(key));
   sessionStorage.clear();
   console.log('✅ 所有缓存已清除，请刷新页面');
   location.reload();
   \`\`\`

2. **清除特定模块缓存：**
   \`\`\`javascript
   // 只清除虚拟博主相关缓存
   const bloggerKeys = [
     'virtualBloggers',
     'virtualBloggerContent', 
     'virtualBloggerPosts',
     'bloggerSchedulerState',
     'virtualBloggerSettings',
     'virtualBloggerFeedPosts'
   ];
   bloggerKeys.forEach(key => localStorage.removeItem(key));
   console.log('✅ 虚拟博主缓存已清除');
   \`\`\`

3. **查看当前缓存使用情况：**
   \`\`\`javascript
   const usage = Object.keys(localStorage).reduce((acc, key) => {
     const size = new Blob([localStorage.getItem(key)]).size;
     acc[key] = (size / 1024).toFixed(2) + ' KB';
     return acc;
   }, {});
   console.table(usage);
   \`\`\`

### 需要清除缓存的情况：

- 虚拟博主系统升级后
- 数据结构发生变化时  
- 出现数据错误或冲突
- 重新开始测试时
- 系统初始化异常

### 注意事项：

⚠️  清除缓存会删除所有虚拟博主的学习进度和生成的内容
⚠️  清除后需要重新初始化博主系统
⚠️  建议在清除前先导出重要数据

清除完成后，虚拟博主系统会重新初始化并创建默认博主。
`;

console.log(instructions);

// 如果在Node.js环境中，提供一些额外的工具函数
if (typeof window === 'undefined') {
  console.log('🔧 开发工具函数：');
  console.log('');
  
  // 生成清除缓存的JavaScript代码
  const generateClearScript = () => {
    return `
// 虚拟博主系统 - 清除缓存脚本
console.log('🧹 开始清除虚拟博主系统缓存...');

// 清除localStorage
const localStorageKeys = Object.keys(localStorage);
console.log('📋 发现localStorage项:', localStorageKeys);

localStorageKeys.forEach(key => localStorage.removeItem(key));
console.log('✅ localStorage已清除');

// 清除sessionStorage  
sessionStorage.clear();
console.log('✅ sessionStorage已清除');

// 清除Service Worker缓存（如果有）
if ('caches' in window) {
  caches.keys().then(cacheNames => {
    return Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
  }).then(() => {
    console.log('✅ Service Worker缓存已清除');
  });
}

console.log('🎉 缓存清除完成！刷新页面以重新初始化系统。');

// 自动刷新页面
setTimeout(() => {
  window.location.reload();
}, 2000);
`;
  };

  console.log('**复制以下代码到浏览器控制台：**');
  console.log('```javascript');
  console.log(generateClearScript().trim());
  console.log('```');
}