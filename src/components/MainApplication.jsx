import React, { lazy } from 'react';
import { useAppContext } from '../context/AppContext';
import TopicSelector from './TopicSelector';
import TopicConfirmation from './TopicConfirmation';
import StoryDisplay from './StoryDisplay';
import QuizInterface from './QuizInterface';
import ResultsDisplay from './ResultsDisplay';
import AssessmentDisplay from './AssessmentDisplay';
import OutlineDisplay from './OutlineDisplay';
import DeepLearningDisplay from './DeepLearningDisplay';
import PersonalCenter from './PersonalCenter';

// Import all the page components - these will be extracted later
// For now, we'll import them from the original App.jsx file
// These components will need to be extracted in a subsequent step

const MainApplication = () => {
    const { state } = useAppContext();

    const renderCurrentStep = () => {
        // 如果显示个人中心，直接返回个人中心组件
        if (state.showPersonalCenter) {
            return <PersonalCenter />;
        }

        switch (state.currentStep) {
            case 'topic':
                return <TopicSelector />;
            case 'confirm':
                return <TopicConfirmation />;
            case 'story':
                return <StoryDisplay />;
            case 'quiz':
            case 'generating':
                return <QuizInterface />;
            case 'results':
                return <ResultsDisplay />;
            case 'assessment':
                return <AssessmentDisplay />;
            case 'outline':
                return <OutlineDisplay />;
            case 'deep-learning':
                return <DeepLearningDisplay />;
            default:
                return <TopicSelector />;
        }
    };

    return (
        <div className="app">
            {renderCurrentStep()}
        </div>
    );
};

export default MainApplication;