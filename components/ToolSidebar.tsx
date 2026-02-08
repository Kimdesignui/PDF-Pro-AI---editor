
import React from 'react';
import { TOOLS } from '../constants';
import type { Tool } from '../types';
import { Icon } from './Icon';

interface ToolSidebarProps {
    activeToolId: string;
    onSelectTool: (tool: Tool) => void;
    onGoHome: () => void;
}

export const ToolSidebar: React.FC<ToolSidebarProps> = ({ activeToolId, onSelectTool, onGoHome }) => {
    // Danh sách các công cụ hiển thị nhanh trên Sidebar
    const quickTools = ['compress', 'rotate', 'split', 'merge', 'signature', 'ocr', 'tts'];

    return (
        <aside className="w-20 bg-white border-r border-gray-200 flex flex-col items-center py-6 h-full z-20 shadow-sm relative">
            {/* Nút về trang chủ */}
            <button 
                onClick={onGoHome} 
                className="mb-6 p-3 bg-brand-50 text-brand-600 rounded-xl hover:bg-brand-100 transition-all shadow-sm hover:shadow-md group"
                title="Quay lại Trang chủ"
            >
                <Icon type="home" className="w-6 h-6 transform group-hover:scale-110 transition-transform" />
            </button>

            <div className="w-full border-b border-gray-100 mb-4"></div>

            {/* Danh sách công cụ */}
            <div className="flex-1 flex flex-col gap-3 w-full px-2 overflow-y-auto no-scrollbar scroll-smooth">
                {TOOLS.filter(t => quickTools.includes(t.id)).map(tool => {
                    const isActive = activeToolId === tool.id;
                    return (
                        <button
                            key={tool.id}
                            onClick={() => onSelectTool(tool)}
                            className={`
                                relative p-3 rounded-xl transition-all duration-200 flex flex-col items-center justify-center gap-1 group
                                ${isActive 
                                    ? `bg-${tool.color}-50 text-${tool.color}-600 shadow-inner ring-1 ring-${tool.color}-200` 
                                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                }
                            `}
                        >
                            <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
                                {React.cloneElement(tool.icon, { className: 'w-6 h-6' })}
                            </div>
                            
                            {/* Tooltip hiển thị tên công cụ khi hover */}
                            <div className="absolute left-full ml-4 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-all duration-200 z-50 shadow-lg translate-x-[-10px] group-hover:translate-x-0">
                                {tool.name}
                                {/* Mũi tên tooltip */}
                                <div className="absolute top-1/2 left-0 -ml-1 -mt-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="mt-auto w-full px-2 flex flex-col gap-2 pt-4 border-t border-gray-100">
                 <button className="p-3 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl flex justify-center transition-colors" title="Tài liệu của tôi">
                    <Icon type="file" className="w-6 h-6" />
                </button>
                <button className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl flex justify-center transition-colors" title="Cài đặt">
                    <Icon type="settings" className="w-6 h-6" />
                </button>
            </div>
        </aside>
    );
};
