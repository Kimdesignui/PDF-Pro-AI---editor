
import React from 'react';

export const Spinner: React.FC<{ message?: string }> = ({ message }) => (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-700 font-medium animate-pulse">{message || 'Đang xử lý...'}</p>
    </div>
);
