# learn-with-caffe

# AI-Powered Personalized Learning System

An AI-driven personalized learning system that generates customized learning outlines and interactive learning content based on user learning ability assessment.

## Main Features

### 1. Intelligent Assessment
- Generate personalized tests based on user-selected topics
- AI analysis of learning abilities and styles
- Generate detailed learning ability assessment reports

### 2. Personalized Learning Outline
- Develop learning paths based on assessment results
- Modular learning content organization
- Estimated learning time planning

### 3. Deep Learning Modules
- **Essential Concepts**: Core concept explanations and examples
- **Key Knowledge Points**: Important knowledge point compilation
- **Smart Blackboard**: Interactive Q&A and concept exploration
- **Smart Workshop**: Create interactive simulators based on concepts and knowledge points
- **In-Class Practice**: Instant tests with detailed analysis

### 4. Smart Workshop Feature 🆕
Smart Workshop is a newly added core feature that enables:

- **Selective Generation**: Users can select specific concepts and knowledge points to generate dedicated simulators
- **Intelligent Simulator Creation**: Create interactive simulators based on selected concepts and knowledge points
- **Parameterized Control**: Support multiple parameter control methods including sliders, selectors, input boxes, etc.
- **Real-time Visualization**: Dynamic display of simulation effects to help understand abstract concepts
- **Preset Scenarios**: Provide various learning scenarios for quick experience of different parameter combinations
- **Intelligent Feedback**: Provide real-time learning feedback based on parameter changes
- **Learning Objectives**: Clear learning goals and expected outcomes

#### Smart Workshop Example
Using badminton learning as an example:
- **Available Concepts**: Grip angle, force control, hitting timing
- **Available Knowledge Points**: Effects of different grip methods, relationship between force and ball speed, hitting trajectory analysis
- **User Selection**: Users can choose "grip angle" and "force control" concepts
- **Generated Simulator**: AI creates a dedicated grip angle and force control simulator based on the selection, where users can observe hitting effects by adjusting grip angle and force

### 5. Personal Center
- Learning history record management
- Learning progress tracking
- Popular topics leaderboard

## Technical Features

- **React + Hooks**: Modern frontend framework
- **Tailwind CSS**: Beautiful UI design
- **AI API Integration**: Intelligent content generation
- **Local Storage**: Learning progress saving
- **Responsive Design**: Multi-device access support

## Usage Instructions

1. Select a learning topic or enter a custom topic
2. Complete the AI ability assessment test
3. View personalized learning outline
4. Enter deep learning modules and experience:
   - Detailed explanations of concepts and knowledge points
   - Interactive Q&A on Smart Blackboard
   - Simulator experience in Smart Workshop
   - Instant testing in In-Class Practice

## Development Environment

```bash
npm install
npm start
```

## Build and Deployment

```bash
npm run build
```

## Featured Functionality

### Smart Workshop
Smart Workshop is the core innovative feature of the system, enhancing learning effectiveness through:

1. **Concept Visualization**: Transform abstract concepts into operable simulators
2. **Interactive Learning**: Observe effect changes by adjusting parameters
3. **Instant Feedback**: Real-time display of operation results and learning suggestions
4. **Scenario Presets**: Provide typical learning scenarios for quick concept understanding
5. **Personalized Experience**: Automatically generate relevant simulators based on learning content

This feature is particularly suitable for learning concepts that require hands-on practice to understand, such as physics experiments, programming logic, artistic creation, and other fields of study.

# AI个性化学习系统

一个基于AI的个性化学习系统，能够根据用户的学习能力评估生成定制化的学习大纲和交互式学习内容。

## 主要功能

### 1. 智能评估
- 基于用户选择的主题生成个性化测试
- AI分析学习能力和风格
- 生成详细的学习能力评估报告

### 2. 个性化学习大纲
- 根据评估结果制定学习路径
- 分模块的学习内容组织
- 预计学习时间规划

### 3. 深度学习模块
- **必学必会概念**：核心概念解释和示例
- **必学必会知识点**：重要知识点整理
- **智能黑板**：交互式问答和概念探索
- **智慧工坊**：基于概念和知识点创建可交互的模拟器
- **随堂演练**：即时测试和详细解析

### 4. 智慧工坊功能 🆕
智慧工坊是新增的核心功能，它能够：

- **选择性生成**：用户可以选择特定的概念和知识点来生成专门的模拟器
- **智能生成模拟器**：基于选中的概念和知识点创建交互式模拟器
- **参数化控制**：支持滑块、选择器、输入框等多种参数控制方式
- **实时可视化**：动态显示模拟效果，帮助理解抽象概念
- **预设场景**：提供多种学习场景，快速体验不同参数组合
- **智能反馈**：根据参数变化提供实时的学习反馈
- **学习目标**：明确的学习目标和预期效果

#### 智慧工坊示例
以羽毛球学习为例：
- **可选概念**：握拍角度、力度控制、击球时机
- **可选知识点**：不同握拍方式的效果、力度与球速关系、击球轨迹分析
- **用户选择**：用户可以选择"握拍角度"和"力度控制"两个概念
- **生成模拟器**：AI基于选择创建专门的握拍角度和力度控制模拟器，用户可以通过调整握拍角度和力度来观察击球效果

### 5. 个人中心
- 学习历史记录管理
- 学习进度跟踪
- 热门主题排行榜

## 技术特性

- **React + Hooks**：现代化的前端框架
- **Tailwind CSS**：美观的UI设计
- **AI API集成**：智能内容生成
- **本地存储**：学习进度保存
- **响应式设计**：支持多设备访问

## 使用方法

1. 选择学习主题或输入自定义主题
2. 完成AI能力评估测试
3. 查看个性化学习大纲
4. 进入深度学习模块，体验：
   - 概念和知识点的详细解释
   - 智能黑板的交互式问答
   - 智慧工坊的模拟器体验
   - 随堂演练的即时测试

## 开发环境

```bash
npm install
npm start
```

## 构建部署

```bash
npm run build
```

## 特色功能

### 智慧工坊
智慧工坊是系统的核心创新功能，它通过以下方式提升学习效果：

1. **概念可视化**：将抽象概念转化为可操作的模拟器
2. **交互式学习**：通过调整参数观察效果变化
3. **即时反馈**：实时显示操作结果和学习建议
4. **场景预设**：提供典型学习场景，快速理解概念
5. **个性化体验**：根据学习内容自动生成相关模拟器

这个功能特别适合需要实践操作来理解的概念，如物理实验、编程逻辑、艺术创作等领域的学习。
