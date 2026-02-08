
import React from 'react';
import { TOOLS } from '../constants';
import { Icon } from './Icon';
import type { Tool } from '../types';

interface LandingPageProps {
    onToolSelect: (tool: Tool) => void;
    onViewFiles: () => void;
    onViewGuide: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onToolSelect, onViewFiles, onViewGuide }) => {
    
    // Hàm xử lý khi click vào link trên navbar
    const handleNavToolClick = (e: React.MouseEvent, toolId: string) => {
        e.preventDefault();
        const tool = TOOLS.find(t => t.id === toolId);
        if (tool) {
            onToolSelect(tool);
        }
    };

    const scrollToTools = () => {
        const toolsSection = document.getElementById('tools');
        if (toolsSection) {
            toolsSection.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="bg-white font-sans text-gray-900">
            {/* Navbar */}
            <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 transition-all">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({top:0, behavior:'smooth'})}>
                            <div className="bg-brand-600 text-white p-1.5 rounded-lg shadow-sm">
                                <Icon type="logo" className="w-5 h-5" />
                            </div>
                            <span className="font-bold text-xl text-gray-900 tracking-tight">PDF Pro</span>
                        </div>
                        <div className="hidden md:flex space-x-1">
                            <button onClick={scrollToTools} className="px-4 py-2 text-gray-600 hover:text-brand-600 font-medium rounded-lg hover:bg-brand-50 transition-colors">
                                Công cụ
                            </button>
                            <button onClick={(e) => handleNavToolClick(e, 'compress')} className="px-4 py-2 text-gray-600 hover:text-brand-600 font-medium rounded-lg hover:bg-brand-50 transition-colors">
                                Nén PDF
                            </button>
                            <button onClick={(e) => handleNavToolClick(e, 'merge')} className="px-4 py-2 text-gray-600 hover:text-brand-600 font-medium rounded-lg hover:bg-brand-50 transition-colors">
                                Ghép PDF
                            </button>
                            <button onClick={onViewGuide} className="px-4 py-2 text-gray-600 hover:text-brand-600 font-medium rounded-lg hover:bg-brand-50 transition-colors">
                                Hướng dẫn sử dụng
                            </button>
                        </div>
                        <button onClick={onViewFiles} className="bg-gray-100 hover:bg-gray-200 text-brand-700 px-5 py-2 rounded-full font-bold text-sm transition-all shadow-sm hover:shadow">
                            Tài liệu của tôi
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-gradient-to-b from-brand-50 to-white hero-pattern">
                <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
                    <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-semibold tracking-wide uppercase animate-fade-in-up">
                        Công nghệ AI Mới nhất
                    </div>
                    <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 leading-tight mb-8 tracking-tight">
                        Công cụ PDF toàn diện <br/>
                        <span className="text-brand-600">Sức mạnh từ AI</span>
                    </h1>
                    <p className="mt-4 max-w-2xl mx-auto text-xl md:text-2xl text-gray-600 mb-12 leading-relaxed font-light">
                        Xử lý mọi tác vụ PDF của bạn: Chỉnh sửa, Ký tên, OCR và hơn thế nữa. <br className="hidden md:block"/> Nhanh chóng, Bảo mật và Miễn phí.
                    </p>
                    
                    {/* Call to Action Button */}
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <button 
                            onClick={scrollToTools}
                            className="w-full sm:w-64 group relative px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white text-lg font-bold rounded-2xl shadow-xl shadow-brand-500/30 transition-all transform hover:-translate-y-1 hover:scale-105 flex justify-center items-center"
                        >
                            <span className="flex items-center gap-2">
                                Thử ngay miễn phí
                                <Icon type="arrow-left" className="w-5 h-5 rotate-180 transition-transform group-hover:translate-x-1" />
                            </span>
                        </button>
                         <button 
                            onClick={onViewGuide}
                            className="w-full sm:w-64 px-8 py-4 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 hover:border-gray-300 text-lg font-bold rounded-2xl shadow-sm transition-all transform hover:-translate-y-1 flex justify-center items-center"
                        >
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
                        <p className="mt-4 text-gray-500 text-lg">Chọn một tính năng để bắt đầu ngay lập tức.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {TOOLS.map(t => (
                            <div 
                                key={t.id} 
                                onClick={() => onToolSelect(t)}
                                className="group bg-white p-6 rounded-2xl shadow-sm hover:shadow-hover border border-gray-100 hover:border-brand-200 transition-all duration-300 cursor-pointer transform hover:-translate-y-2"
                            >
                                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-colors bg-${t.color}-50 group-hover:bg-${t.color}-100`}>
                                    <div className={`text-${t.color}-600`}>
                                        {React.cloneElement(t.icon, { className: 'w-8 h-8' })}
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-brand-700 transition-colors">{t.name}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">{t.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing / Community Project Section */}
            <section id="pricing" className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="relative rounded-3xl bg-gradient-to-br from-brand-600 to-indigo-700 p-8 md:p-16 text-white overflow-hidden shadow-2xl">
                        {/* Decorative elements */}
                        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"></div>

                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                            <div className="flex-1 text-center md:text-left">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sm font-medium mb-6 backdrop-blur-sm">
                                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                                    Dự án cộng đồng
                                </div>
                                <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
                                    Công cụ mạnh mẽ,<br/> Chi phí <span className="text-yellow-300">0 đồng</span>
                                </h2>
                                <p className="text-lg text-blue-50 mb-8 leading-relaxed">
                                    Toàn bộ tính năng cao cấp trên nền tảng này được cung cấp hoàn toàn miễn phí. 
                                    Đây là dự án tâm huyết được thiết kế bởi <strong className="text-white border-b border-white/30 pb-0.5">Kim Tiểu Kê (UI Designer)</strong> nhằm hỗ trợ cộng đồng xử lý công việc hiệu quả hơn.
                                </p>
                                
                                <div className="flex items-start gap-4 p-5 bg-white/10 rounded-xl border border-white/10 mb-8 backdrop-blur-sm hover:bg-white/20 transition-colors cursor-default">
                                    <div className="p-2 bg-white/20 rounded-lg shrink-0">
                                        <Icon type="logo" className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="text-sm text-blue-100 text-left">
                                        <span className="font-semibold text-white block mb-1">Powered by AI</span>
                                        Hệ thống được xây dựng và tối ưu mã nguồn bởi <strong className="text-white">Google AI Studio</strong>, mang đến trải nghiệm xử lý PDF thông minh, nhanh chóng và bảo mật.
                                    </div>
                                </div>

                                <button onClick={scrollToTools} className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-brand-700 bg-white rounded-xl hover:bg-brand-50 transition-all transform hover:-translate-y-1 shadow-lg">
                                    Bắt đầu ngay - Miễn phí mãi mãi
                                </button>
                            </div>
                            
                            {/* Visual Side */}
                            <div className="hidden md:flex w-1/3 justify-center items-center relative">
                                    <div className="w-64 h-64 bg-gradient-to-tr from-white/20 to-transparent rounded-full border border-white/20 flex items-center justify-center backdrop-blur-md relative">
                                    <div className="absolute inset-0 rounded-full border border-white/10 animate-[spin_10s_linear_infinite]"></div>
                                    <div className="w-2/3 h-2/3 bg-white/20 rounded-full flex items-center justify-center shadow-inner relative z-10">
                                        <Icon type="logo" className="w-24 h-24 text-white drop-shadow-lg" />
                                    </div>
                                    </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 pt-16 pb-8">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <div className="flex justify-center items-center gap-2 mb-4">
                        <Icon type="logo" className="w-6 h-6 text-brand-600" />
                        <span className="font-bold text-xl text-gray-900">PDF Pro</span>
                    </div>
                    <p className="text-gray-500">&copy; 2023 PDF Pro Inc. Designed by Kim Tiểu Kê.</p>
                </div>
            </footer>
        </div>
    );
};
