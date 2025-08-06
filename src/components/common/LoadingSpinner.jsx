import React, { memo } from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = memo(() => (
    <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
));

export default LoadingSpinner;