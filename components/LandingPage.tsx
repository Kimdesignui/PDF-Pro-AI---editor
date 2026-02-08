import React from 'react';
import { TOOLS } from '../constants';
import { Icon } from './Icon';
import type { Tool } from '../types';

interface LandingPageProps {
    onToolSelect: (tool: Tool) => void;
    onViewFiles: () => void;
    onViewGuide: () => void;
}

// Bảng ánh xạ màu sắc để tránh lỗi Tailwind Purge
const colorMap: Record<string, { bg: string, bgHover: string, text: string }> = {
    amber: { bg: 'bg-amber-50', bgHover: 'group-hover:bg-amber-100', text: 'text-amber-600' },
    blue: { bg: 'bg-blue-50', bgHover: 'group-hover:bg-blue-100', text: 'text-blue-600' },
    violet: { bg: 'bg-violet-50', bgHover: 'group-hover:bg-violet-100', text: 'text-violet-600' },
    green: { bg: 'bg-green-50', bgHover: 'group-hover:bg-green-100', text: 'text-green-600' },
    slate: { bg: 'bg-slate-50', bgHover: 'group-hover:bg-slate-100', text: 'text-slate-600' },
    rose: { bg: 'bg-rose-50', bgHover: 'group-hover:bg-rose-100', text: 'text-rose-600' },
    indigo: { bg: 'bg-indigo-50', bgHover: 'group-hover:bg-indigo-100', text: 'text-indigo-600' },
    emerald: { bg: 'bg-emerald-50', bgHover: 'group-hover:bg-emerald-100', text: 'text-emerald-600' },
    cyan: { bg: 'bg-cyan-50', bgHover: 'group-hover:bg-cyan-100', text: 'text-cyan-600' },
};

export const LandingPage: React.FC<LandingPageProps> = ({ onToolSelect, onViewFiles, onViewGuide }) => {
    const scrollToTools = () => {
        document.getElementById('tools')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="bg-white font-sans text-gray-900">
            {/* Navbar */}
            <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({top:0, behavior:'smooth'})}>
                            <div className="bg-brand-600 text-white p-1.5 rounded-lg shadow-sm">
                                <Icon type="logo" className="w-5 h-5" />
                            </div>
                            <span className="font-bold text-xl text-gray-900 tracking-tight">PDF Pro</span>
                        </div>
                        <div className="hidden md:flex space-x-1">
                            <button onClick={scrollToTools} className="px-4 py-2 text-gray-600 hover:text-brand-600 font-medium rounded-lg hover:bg-brand-50 transition-colors">Công cụ</button>
                            <button onClick={onViewGuide} className="px-4 py-2 text-gray-600 hover:text-brand-600 font-medium rounded-lg hover:bg-brand-50 transition-colors">Hướng dẫn</button>
                        </div>
                        <button onClick={onViewFiles} className="bg-gray-100 hover:bg-gray-200 text-brand-700 px-5 py-2 rounded-full font-bold text-sm transition-all">
                            Tài liệu của tôi
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-gradient-to-b from-brand-50 to-white hero-pattern">
                <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
                    <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-semibold tracking-wide uppercase">
                        Công nghệ AI Mới nhất 2026
                    </div>
                    <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 leading-tight mb-8 tracking-tight">
                        Công cụ PDF toàn diện <br/>
                        <span className="text-brand-600">Sức mạnh từ AI</span>
                    </h1>
                    <p className="mt-4 max-w-2xl mx-auto text-xl md:text-2xl text-gray-600 mb-12 font-light">
                        Xử lý mọi tác vụ PDF của bạn nhanh chóng, bảo mật và miễn phí.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <button onClick={scrollToTools} className="w-full sm:w-64 px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white text-lg font-bold rounded-2xl shadow-xl transition-all transform hover:-translate-y-1 flex justify-center items-center gap-2">
                            Thử ngay miễn phí
                            <Icon type="arrow-left" className="w-5 h-5 rotate-180" />
                        </button>
                        <button onClick={onViewGuide} className="w-full sm:w-64 px-8 py-4 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-lg font-bold rounded-2xl shadow-sm transition-all transform hover:-translate-y-1 flex justify-center items-center">
                            Xem hướng dẫn
                        </button>
                    </div>
                </div>
            </section>

            {/* Tools Grid */}
            <section id="tools" className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-gray-900">Mọi công cụ bạn cần</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {TOOLS.map(t => {
                            const colors = colorMap[t.color] || colorMap.slate;
                            return (
                                <div 
                                    key={t.id} 
                                    onClick={() => onToolSelect(t)}
                                    className="group bg-white p-6 rounded-2xl shadow-sm hover:shadow-hover border border-gray-100 hover:border-brand-200 transition-all duration-300 cursor-pointer transform hover:-translate-y-2"
                                >
                                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-colors ${colors.bg} ${colors.bgHover}`}>
                                        <div className={colors.text}>
                                            {React.cloneElement(t.icon, { className: 'w-8 h-8' })}
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-brand-700 transition-colors">{t.name}</h3>
                                    <p className="text-gray-500 text-sm leading-relaxed">{t.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 pt-16 pb-8">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <p className="text-gray-500">&copy; 2026 PDF Pro AI. Designed by Kim Tiểu Kê.</p>
                </div>
            </footer>
        </div>
    );
};
