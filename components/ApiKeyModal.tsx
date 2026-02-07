
import React, { useState } from 'react';
import { Icon } from './Icon';

interface ApiKeyModalProps {
    onKeySubmit: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onKeySubmit }) => {
    const [apiKey, setApiKey] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (apiKey.trim()) {
            onKeySubmit(apiKey.trim());
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-100 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border border-gray-200">
                <Icon type="logo" className="w-16 h-16 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Chào mừng đến với PDF Pro</h1>
                <p className="text-gray-600 mb-6">Để sử dụng các tính năng AI, vui lòng nhập Gemini API Key của bạn.</p>
                
                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Nhập API Key của bạn tại đây"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={!apiKey.trim()}
                        className="w-full mt-4 bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-all transform hover:scale-105 shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Bắt đầu
                    </button>
                </form>
                
                <p className="text-xs text-gray-500 mt-6">
                    Bạn có thể lấy API Key của mình từ <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">Google AI Studio</a>.
                    <br />
                    Key của bạn được lưu trữ an toàn trong trình duyệt và chỉ cho phiên này.
                </p>
            </div>
        </div>
    );
};
