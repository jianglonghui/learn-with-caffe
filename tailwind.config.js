/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      // 自定义主题以减少未使用的样式
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      }
    },
  },
  plugins: [],
  // Tailwind CSS v3.0+ 配置
  safelist: [
    // 保留动态生成的类名
    'animate-spin',
    'animate-pulse',
    'animate-bounce',
    // 基础颜色类
    'bg-red-500', 'bg-green-500', 'bg-blue-500', 'bg-yellow-500',
    'text-red-500', 'text-green-500', 'text-blue-500', 'text-gray-500',
    'border-red-500', 'border-green-500', 'border-blue-500',
    // 状态类
    'hover:bg-blue-600', 'hover:bg-red-600', 'hover:bg-green-600',
    'focus:ring-2', 'focus:ring-blue-500', 'focus:outline-none'
  ]
}