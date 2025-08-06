import React, { memo } from 'react';
import { AlertCircle } from 'lucide-react';

const ErrorMessage = memo(({ message, onRetry }) => (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-700 text-sm flex-1">{message}</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="ml-3 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                >
                    重试
                </button>
            )}
        </div>
    </div>
));

export default ErrorMessage;