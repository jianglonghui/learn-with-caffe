import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MinimalistHomePage = () => {
    const navigate = useNavigate();

    const handleGetStarted = () => {
        navigate('/modern-feed');
    };

    const handleLearnMore = () => {
        navigate('/about');
    };

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Main Content - Centered with lots of whitespace */}
            <div className="flex-1 flex items-center justify-center px-8 py-20">
                <div className="max-w-3xl w-full text-center space-y-12">
                    {/* High-five illustration */}
                    <div className="flex justify-center mb-8">
                        <div className="relative">
                            <svg 
                                width="200" 
                                height="200" 
                                viewBox="0 0 200 200" 
                                fill="none" 
                                xmlns="http://www.w3.org/2000/svg"
                                className="transform hover:scale-105 transition-transform duration-300"
                            >
                                {/* Left hand */}
                                <path 
                                    d="M40 100 Q50 70 65 65 Q70 60 75 65 L80 85 Q85 60 90 58 Q95 56 98 62 L100 82 Q105 58 110 56 Q115 54 118 60 L118 80 Q123 58 128 56 Q133 54 135 60 L130 95 L125 120 Q120 130 105 135 L75 130 Q60 125 55 115 Z" 
                                    fill="#FFD93D" 
                                    stroke="#2D3748" 
                                    strokeWidth="2.5"
                                />
                                
                                {/* Right hand */}
                                <path 
                                    d="M160 100 Q150 70 135 65 Q130 60 125 65 L120 85 Q115 60 110 58 Q105 56 102 62 L100 82 Q95 58 90 56 Q85 54 82 60 L82 80 Q77 58 72 56 Q67 54 65 60 L70 95 L75 120 Q80 130 95 135 L125 130 Q140 125 145 115 Z" 
                                    fill="#6FCF97" 
                                    stroke="#2D3748" 
                                    strokeWidth="2.5"
                                />
                                
                                {/* Impact lines */}
                                <path d="M100 40 L100 25" stroke="#FF6B6B" strokeWidth="3" strokeLinecap="round" />
                                <path d="M85 45 L75 30" stroke="#4ECDC4" strokeWidth="3" strokeLinecap="round" />
                                <path d="M115 45 L125 30" stroke="#FFE66D" strokeWidth="3" strokeLinecap="round" />
                                
                                {/* Small sparkles */}
                                <circle cx="60" cy="40" r="2" fill="#FF6B6B" />
                                <circle cx="140" cy="40" r="2" fill="#4ECDC4" />
                                <circle cx="100" cy="15" r="2" fill="#FFE66D" />
                            </svg>
                        </div>
                    </div>

                    {/* Main headline with emphasis */}
                    <div className="space-y-4">
                        <h1 className="text-5xl md:text-7xl font-bold text-gray-900 leading-tight">
                            Make an
                            <span className="relative inline-block mx-3">
                                <span className="relative z-10 font-hand text-6xl md:text-8xl italic">impact</span>
                                <svg 
                                    className="absolute -bottom-2 left-0 w-full" 
                                    height="12" 
                                    viewBox="0 0 200 12"
                                >
                                    <path 
                                        d="M5 8 Q100 3 195 8" 
                                        stroke="#FFD93D" 
                                        strokeWidth="4" 
                                        fill="none"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </span>
                            with knowledge
                        </h1>
                        
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Connect with experts, share unique insights, and learn from diverse perspectives in our knowledge community.
                        </p>
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <button
                            onClick={handleGetStarted}
                            className="group px-8 py-4 bg-gray-900 text-white rounded-full font-medium text-lg hover:bg-gray-800 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                            Get Started
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                        
                        <button
                            onClick={handleLearnMore}
                            className="px-8 py-4 bg-white text-gray-900 rounded-full font-medium text-lg border-2 border-gray-900 hover:bg-gray-50 transition-all duration-200"
                        >
                            Learn More
                        </button>
                    </div>

                    {/* Trust indicators */}
                    <div className="pt-12 flex items-center justify-center gap-8 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            <span>AI-Powered</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                            <span>Privacy First</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span>Verified Experts</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Minimal footer */}
            <footer className="py-8 text-center text-sm text-gray-400">
                <p>© 2024 Learn with Caffè. Crafted with care.</p>
            </footer>

            {/* Custom font style for "impact" word */}
            <style jsx>{`
                @import url('https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap');
                
                .font-hand {
                    font-family: 'Permanent Marker', cursive;
                }
            `}</style>
        </div>
    );
};

export default MinimalistHomePage;