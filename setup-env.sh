#!/bin/bash

# API Key 环境变量设置脚本

echo "🔧 设置API Key环境变量..."

# 检查是否已存在.env.local文件
if [ -f ".env.local" ]; then
    echo "⚠️  发现已存在的 .env.local 文件"
    read -p "是否要覆盖现有文件？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ 操作已取消"
        exit 1
    fi
fi

# 复制示例文件
if [ -f "env.example" ]; then
    cp env.example .env.local
    echo "✅ 已创建 .env.local 文件"
else
    echo "❌ 未找到 env.example 文件"
    exit 1
fi

echo ""
echo "📝 请在 .env.local 文件中配置你的API key："
echo "   1. 打开 .env.local 文件"
echo "   2. 将 'your_actual_api_key_here' 替换为你的真实API key"
echo "   3. 保存文件"
echo ""
echo "🔒 安全提醒："
echo "   - .env.local 文件已被 .gitignore 忽略"
echo "   - 永远不会被提交到Git仓库"
echo "   - 请妥善保管你的API key"
echo ""
echo "🚀 配置完成后，运行 'npm start' 启动应用" 