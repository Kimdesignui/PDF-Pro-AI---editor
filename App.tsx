
import React, { useState, useEffect } from 'react';
import { TOOLS } from './constants';
import type { Tool, ProcessedFile, PageEditState } from './types';
import { FileUpload } from './components/FileUpload';
import { PdfViewer } from './components/PdfViewer';
import { ToolSidebar } from './components/ToolSidebar';
import { Spinner } from './components/Spinner';
import { Icon } from './components/Icon';
import * as pdfService from './services/pdfService';
import { arrayBufferToBlob, fileToArrayBuffer } from './utils';

// Main App Component
const App: React.FC = () => {
    // --- STATE MANAGEMENT ---
    // view: 'landing' (Trang chủ) | 'editor' (Workspace) | 'success' (Kết quả) | 'files' (Quản lý file)
    const [view, setView] = useState<'landing' | 'editor' | 'success' | 'files'>('landing');
    
    // Data States
    const [activeTool, setActiveTool] = useState<Tool | null>(null);
    const [files, setFiles] = useState<File[]>([]);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [results, setResults] = useState<ProcessedFile[]>([]);
    const [currentResult, setCurrentResult] = useState<ProcessedFile | null>(null);

    // Editor States
    const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
    const [pageStates, setPageStates] = useState<PageEditState[]>([]); 
    const [isProcessing, setIsProcessing] = useState(false);
    const [loadingMsg, setLoadingMsg] = useState('');
    const [toolOptions, setToolOptions] = useState<any>({}); // Lưu tùy chọn (vd: mật khẩu, chữ ký)

    // --- INITIALIZATION ---

    useEffect(() => {
        if (pdfDoc) {
            const numPages = pdfDoc.numPages;
            const initialStates: PageEditState[] = [];
            for (let i = 1; i <= numPages; i++) {
                initialStates.push({ 
                    id: `page-${i}-${Date.now()}`, 
                    originalPageNumber: i, 
                    rotation: 0, 
                    isDeleted: false 
                });
            }
            setPageStates(initialStates);
            setSelectedPages(new Set()); 
        } else {
            setPageStates([]);
        }
    }, [pdfDoc]);

    // --- CORE HANDLERS ---

    const loadPdf = async (file: File) => {
        try {
            const buffer = await fileToArrayBuffer(file);
            const doc = await (window as any).pdfjsLib.getDocument({ data: buffer }).promise;
            setPdfDoc(doc);
        } catch (error) {
            console.error("Error loading PDF:", error);
            alert("Không thể đọc file PDF này. Vui lòng thử lại.");
        }
    };

    const handleFiles = async (uploadedFiles: File[]) => {
        const newFiles = [...files, ...uploadedFiles];
        setFiles(newFiles);
        // Load file đầu tiên để preview
        if (!pdfDoc && uploadedFiles.length > 0) {
            await loadPdf(uploadedFiles[0]);
        }
    };

    const handleToolSelect = (tool: Tool) => {
        setActiveTool(tool);
        // Chuyển ngay sang Editor Workspace
        setView('editor');
    };

    const handleGoHome = () => {
        setView('landing');
        setFiles([]);
        setPdfDoc(null);
        setActiveTool(null);
    };

    // --- EDITOR LOGIC (Instant Feedback) ---

    const handleRotatePage = (originalPageNumber: number, direction: 'left' | 'right') => {
        const delta = direction === 'left' ? -90 : 90;
        setPageStates(prev => prev.map(p => {
            if (p.originalPageNumber === originalPageNumber) {
                return { ...p, rotation: p.rotation + delta };
            }
            return p;
        }));
    };

    const handleDeletePage = (originalPageNumber: number) => {
        setPageStates(prev => prev.map(p => {
            if (p.originalPageNumber === originalPageNumber) return { ...p, isDeleted: true };
            return p;
        }));
    };

    const handleReorderPages = (newOrder: PageEditState[]) => {
        setPageStates(newOrder);
    };

    // --- PROCESSING LOGIC ---

    const handleProcess = async () => {
        if (!activeTool || files.length === 0) return;
        setIsProcessing(true);
        setLoadingMsg('Đang xử lý...');

        try {
            const buffer = await fileToArrayBuffer(files[0]);
            let output: Uint8Array | null = null;
            let resultBlob: Blob | null = null;
            let filename = `processed_${files[0].name}`;

            const activePages = pageStates.filter(p => !p.isDeleted);
            if (activePages.length === 0) throw new Error("Bạn đã xóa tất cả các trang.");

            switch (activeTool.id) {
                case 'rotate':
                case 'split':
                case 'sort': 
                    output = await pdfService.applyPageEdits(buffer, pageStates);
                    break;
                case 'merge':
                    const buffers = await Promise.all(files.map(fileToArrayBuffer));
                    output = await pdfService.mergePdfs(buffers);
                    filename = 'merged.pdf';
                    break;
                case 'compress':
                    output = await pdfService.applyPageEdits(buffer, pageStates);
                    filename = `compressed_${files[0].name}`;
                    break;
                case 'signature':
                case 'insert-image':
                    // Demo: Apply basic edits first
                    output = await pdfService.applyPageEdits(buffer, pageStates);
                    break;
                default:
                    output = await pdfService.applyPageEdits(buffer, pageStates);
            }

            if (output) resultBlob = arrayBufferToBlob(output, 'application/pdf');

            if (resultBlob) {
                const newFile: ProcessedFile = {
                    id: Date.now(),
                    name: filename,
                    operation: activeTool.name,
                    blob: resultBlob,
                    timestamp: new Date()
                };
                setResults([newFile, ...results]);
                setCurrentResult(newFile);
                setView('success');
            }
        } catch (e: any) {
            alert(e.message || "Có lỗi xảy ra");
        } finally {
            setIsProcessing(false);
            setLoadingMsg('');
        }
    };

    // --- COMPONENT: LANDING PAGE ---
    const LandingPage = () => (
        <div className="bg-white">
            {/* Navbar */}
            <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({top:0, behavior:'smooth'})}>
                            <div className="bg-brand-600 text-white p-1.5 rounded-lg"><Icon type="logo" className="w-5 h-5" /></div>
                            <span className="font-bold text-xl text-gray-900 tracking-tight">PDF Pro</span>
                        </div>
                        <div className="hidden md:flex space-x-8">
                            {['Công cụ', 'Nén', 'Chuyển đổi', 'Ghép', 'Về chúng tôi'].map(item => (
                                <a key={item} href="#tools" className="text-gray-600 hover:text-brand-600 font-medium transition">{item}</a>
                            ))}
                        </div>
                        <button onClick={() => setView('files')} className="bg-gray-100 hover:bg-gray-200 text-brand-700 px-4 py-2 rounded-full font-bold text-sm transition">
                            Tài liệu của tôi
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden bg-gradient-to-b from-brand-50 to-white hero-pattern">
                <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
                    <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
                        Công cụ PDF toàn diện <br/>
                        <span className="text-brand-600">Sức mạnh từ AI</span>
                    </h1>
                    <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-600 mb-10">
                        Xử lý mọi tác vụ PDF của bạn: Chỉnh sửa, Ký tên, OCR và hơn thế nữa. Nhanh chóng, Bảo mật và Miễn phí.
                    </p>
                    
                    {/* Quick Upload Area */}
                    <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 p-8">
                        <FileUpload onFileChange={(files) => { handleFiles(files); setView('editor'); }} />
                    </div>
                </div>
            </section>

            {/* Tools Grid */}
            <section id="tools" className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-gray-900">Mọi công cụ bạn cần</h2>
                        <p className="mt-4 text-gray-500">Chọn một tính năng để bắt đầu ngay lập tức.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {TOOLS.map(t => (
                            <div 
                                key={t.id} 
                                onClick={() => handleToolSelect(t)}
                                className="group bg-white p-6 rounded-2xl shadow-sm hover:shadow-hover border border-gray-100 hover:border-brand-200 transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
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
            <section id="pricing" className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="relative rounded-3xl bg-gradient-to-br from-brand-600 to-indigo-700 p-8 md:p-16 text-white overflow-hidden shadow-2xl">
                        {/* Decorative elements */}
                        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"></div>

                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                            <div className="flex-1 text-center md:text-left">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sm font-medium mb-6 backdrop-blur-sm">
                                    <span className="w-2 h-2 rounded-full bg-green-400"></span>
                                    Dự án cộng đồng
                                </div>
                                <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
                                    Công cụ mạnh mẽ,<br/> Chi phí <span className="text-yellow-300">0 đồng</span>
                                </h2>
                                <p className="text-lg text-blue-50 mb-6 leading-relaxed">
                                    Toàn bộ tính năng cao cấp trên nền tảng này được cung cấp hoàn toàn miễn phí. 
                                    Đây là dự án tâm huyết được thiết kế bởi <strong className="text-white border-b border-white/30 pb-0.5">Kim Tiểu Kê (UI Designer)</strong> nhằm hỗ trợ cộng đồng xử lý công việc hiệu quả hơn.
                                </p>
                                
                                <div className="flex items-start gap-4 p-4 bg-white/10 rounded-xl border border-white/10 mb-8 backdrop-blur-sm">
                                    <div className="p-2 bg-white/20 rounded-lg shrink-0">
                                        <Icon type="logo" className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="text-sm text-blue-100 text-left">
                                        <span className="font-semibold text-white block mb-1">Powered by AI</span>
                                        Hệ thống được xây dựng và tối ưu mã nguồn bởi <strong className="text-white">Google AI Studio</strong>, mang đến trải nghiệm xử lý PDF thông minh, nhanh chóng và bảo mật.
                                    </div>
                                </div>

                                <button onClick={() => window.scrollTo({top:0, behavior:'smooth'})} className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-brand-700 bg-white rounded-xl hover:bg-brand-50 transition-all transform hover:-translate-y-1 shadow-lg">
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
                    <p className="text-gray-500">&copy; 2023 PDF Pro Inc. Designed by Kim Tiểu Kê.</p>
                </div>
            </footer>
        </div>
    );

    // --- COMPONENT: EDITOR WORKSPACE ---
    const EditorWorkspace = () => (
        <div className="flex h-screen overflow-hidden bg-gray-50">
            {/* 1. Sidebar Component (Tách riêng) */}
            <ToolSidebar 
                activeToolId={activeTool?.id || ''} 
                onSelectTool={(tool) => { setActiveTool(tool); }} 
                onGoHome={handleGoHome}
            />

            {/* 2. Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10 shadow-sm">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <span className={`w-2 h-8 rounded-full bg-${activeTool?.color || 'brand'}-500`}></span>
                            {activeTool?.name || 'Workspace'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-3">
                        {files.length === 0 ? (
                            <div className="text-sm text-gray-400 italic">Chưa có file nào được chọn</div>
                        ) : (
                            <>
                                <button className="hidden sm:flex items-center gap-2 text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition font-medium border border-transparent hover:border-gray-200">
                                    <Icon type="plus" className="w-5 h-5" />
                                    <span>Thêm file</span>
                                </button>
                                <button 
                                    onClick={handleProcess}
                                    className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-brand-500/20 transition transform active:scale-95"
                                >
                                    <span>Hoàn thành</span>
                                    <Icon type="check" className="w-5 h-5" />
                                </button>
                            </>
                        )}
                    </div>
                </header>

                {/* Workspace Body */}
                <div className="flex-1 overflow-hidden relative bg-gray-100/50">
                    {files.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center p-8">
                             <div className="max-w-lg w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
                                 <h3 className="text-lg font-bold mb-4 text-center">Tải lên file PDF để bắt đầu</h3>
                                 <FileUpload onFileChange={handleFiles} />
                             </div>
                        </div>
                    ) : (
                        <PdfViewer 
                            pdfDoc={pdfDoc}
                            selectedPages={selectedPages}
                            pageStates={pageStates}
                            onPageSelect={(p) => {
                                const newSet = new Set(selectedPages);
                                if (newSet.has(p)) newSet.delete(p); else newSet.add(p);
                                setSelectedPages(newSet);
                            }}
                            toggleSelectAll={() => {
                                if (selectedPages.size === pageStates.filter(p=>!p.isDeleted).length) setSelectedPages(new Set());
                                else setSelectedPages(new Set(pageStates.filter(p=>!p.isDeleted).map(p => p.originalPageNumber)));
                            }}
                            onRotatePage={handleRotatePage}
                            onDeletePage={handleDeletePage}
                            onReorderPages={handleReorderPages}
                            enableVisualEdit={true}
                        />
                    )}
                </div>
            </div>
        </div>
    );

    // --- MAIN RENDER ---
    return (
        <div className="min-h-screen font-sans text-gray-900">
            {isProcessing && <Spinner message={loadingMsg} />}
            
            {view === 'landing' && <LandingPage />}
            {view === 'editor' && <EditorWorkspace />}
            
            {/* Result View */}
            {view === 'success' && currentResult && (
                 <div className="flex h-screen items-center justify-center bg-gray-50 p-4 animate-fade-in">
                     <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full border border-gray-100">
                         <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                             <Icon type="check" className="w-10 h-10" />
                         </div>
                         <h2 className="text-3xl font-bold mb-2 text-gray-900">Thành công!</h2>
                         <p className="text-gray-500 mb-8">File <strong>{currentResult.name}</strong> của bạn đã sẵn sàng.</p>
                         <a href={URL.createObjectURL(currentResult.blob)} download={currentResult.name} className="block w-full py-4 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition shadow-lg shadow-brand-500/30 mb-4 transform hover:-translate-y-1">
                             Tải xuống ngay
                         </a>
                         <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setView('editor')} className="py-3 text-gray-700 bg-gray-100 font-semibold hover:bg-gray-200 rounded-xl transition">
                                Chỉnh sửa tiếp
                            </button>
                            <button onClick={handleGoHome} className="py-3 text-gray-700 border border-gray-200 font-semibold hover:bg-gray-50 rounded-xl transition">
                                Trang chủ
                            </button>
                         </div>
                     </div>
                 </div>
            )}

            {/* Files List View (Basic Implementation) */}
            {view === 'files' && (
                <div className="min-h-screen bg-gray-50 p-8">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-3xl font-bold">Tài liệu đã xử lý</h2>
                            <button onClick={handleGoHome} className="text-brand-600 font-medium hover:underline">Quay lại trang chủ</button>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            {results.length === 0 ? (
                                <div className="p-12 text-center text-gray-500">Chưa có tài liệu nào.</div>
                            ) : (
                                <ul className="divide-y divide-gray-100">
                                    {results.map(r => (
                                        <li key={r.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-red-100 text-red-600 p-2 rounded-lg"><Icon type="file" className="w-5 h-5"/></div>
                                                <span className="font-medium">{r.name}</span>
                                            </div>
                                            <a href={URL.createObjectURL(r.blob)} download={r.name} className="text-brand-600 hover:text-brand-800"><Icon type="download" className="w-5 h-5"/></a>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
