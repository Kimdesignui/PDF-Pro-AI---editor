
import React, { useState, useCallback } from 'react';
import { TOOLS } from './constants';
import type { Tool, ProcessedFile } from './types';
import { FileUpload } from './components/FileUpload';
import { PdfViewer } from './components/PdfViewer';
import { ToolPanel } from './components/ToolPanel';
import { Spinner } from './components/Spinner';
import { Icon } from './components/Icon';
import * as pdfService from './services/pdfService';
import * as geminiService from './services/geminiService';
import { arrayBufferToBlob, fileToArrayBuffer, decode, decodeAudioData } from './utils';

// Main App Component
const App: React.FC = () => {
    // State
    const [view, setView] = useState<'home' | 'workspace' | 'result'>('home');
    const [activeTool, setActiveTool] = useState<Tool | null>(null);
    const [files, setFiles] = useState<File[]>([]);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);
    const [results, setResults] = useState<ProcessedFile[]>([]);
    const [loadingMsg, setLoadingMsg] = useState('');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Handlers
    const loadPdf = async (file: File) => {
        try {
            const buffer = await fileToArrayBuffer(file);
            const doc = await (window as any).pdfjsLib.getDocument({ data: buffer }).promise;
            setPdfDoc(doc);
        } catch (error) {
            console.error("Error loading PDF:", error);
            alert("Không thể đọc file PDF này.");
        }
    };

    const handleToolSelect = (tool: Tool) => {
        setActiveTool(tool);
        
        // If we have files, check if we need to load the doc (in case it wasn't loaded)
        // and switch to workspace.
        if (files.length > 0) {
            if (!pdfDoc) {
                // Try to load the first file
                loadPdf(files[0]);
            }
            setView('workspace');
        } else {
            setView('home'); // Stay home, show upload (or logic could be to scroll to hero)
            // But if clicked from grid, user expects to start. 
            // Since we are on home, we just set activeTool. 
            // If they upload now, it goes to workspace.
            // Let's scroll to hero if no files
             window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleFiles = async (uploadedFiles: File[]) => {
        const newFiles = [...files, ...uploadedFiles];
        setFiles(newFiles);
        
        // Always try to load the first file for preview if not yet loaded
        if (!pdfDoc && uploadedFiles.length > 0) {
            await loadPdf(uploadedFiles[0]);
        }
        
        // If a tool is already active, go to workspace immediately
        if (activeTool) {
            setView('workspace');
        }
    };

    const handleRemoveFile = (index: number) => {
        const newFiles = files.filter((_, i) => i !== index);
        setFiles(newFiles);
        if (newFiles.length === 0) {
            setPdfDoc(null);
            // If in workspace, maybe go back to home?
            if (view === 'workspace' && activeTool?.id !== 'merge') { 
                setView('home');
            }
        } else if (index === 0 && newFiles.length > 0) {
            // If removed first file, load next one as preview
            loadPdf(newFiles[0]);
        }
    };

    const handleApplyTool = async (options: any) => {
        if (!activeTool || files.length === 0) return;
        setIsProcessing(true);
        setLoadingMsg('Đang xử lý...');

        try {
            const buffer = await fileToArrayBuffer(files[0]);
            let output: Uint8Array | null = null;
            let resultBlob: Blob | null = null;
            let filename = `processed_${files[0].name}`;

            // Resolve target pages: if specific pages selected, use them. If not, implies ALL pages for tools like Rotate
            const targetPages = selectedPages.size > 0 ? Array.from(selectedPages) : [];

            switch (activeTool.id) {
                case 'rotate':
                    output = await pdfService.rotatePages(buffer, targetPages, options.angle || 90);
                    break;
                case 'split':
                    if (options.mode === 'split-selected') {
                        if (targetPages.length === 0) throw new Error("Vui lòng chọn trang để tách.");
                        output = await pdfService.splitPdfByPages(buffer, targetPages);
                    } else if (options.mode === 'split-range') {
                         const ranges = options.ranges.split(',').map((r: string) => r.trim());
                         const pages = new Set<number>();
                         ranges.forEach((r: string) => {
                            if(r.includes('-')) {
                                const [s, e] = r.split('-').map(Number);
                                for(let i=s; i<=e; i++) pages.add(i);
                            } else pages.add(Number(r));
                         });
                         output = await pdfService.splitPdfByPages(buffer, Array.from(pages));
                    }
                    break;
                case 'merge':
                    const buffers = await Promise.all(files.map(fileToArrayBuffer));
                    output = await pdfService.mergePdfs(buffers);
                    filename = 'merged.pdf';
                    break;
                case 'password':
                    if (!options.password) throw new Error("Nhập mật khẩu");
                    output = await pdfService.setPassword(buffer, options.password);
                    break;
                case 'signature':
                    if (targetPages.length !== 1) throw new Error("Vui lòng chọn 1 trang để ký");
                    output = await pdfService.addSignature(buffer, targetPages[0], options.signatureBytes);
                    break;
                case 'insert-image':
                    if (targetPages.length !== 1) throw new Error("Vui lòng chọn 1 trang để chèn ảnh");
                    output = await pdfService.addImage(buffer, targetPages[0], options.imageBytes);
                    break;
                case 'ocr':
                    if (targetPages.length === 0) throw new Error("Chọn trang để OCR");
                    let text = '';
                    for (const p of targetPages) {
                        setLoadingMsg(`Đang đọc trang ${p}...`);
                        const img = await pdfService.getPageAsImage(pdfDoc, p);
                        text += `--- Trang ${p} ---\n` + await geminiService.performOcr(img, options.lang || 'Vietnamese') + '\n\n';
                    }
                    resultBlob = new Blob([text], { type: 'text/plain' });
                    filename = 'ocr_result.txt';
                    break;
                case 'tts':
                    if (targetPages.length === 0) throw new Error("Chọn trang để đọc");
                    let rawText = '';
                    for (const p of targetPages) {
                        setLoadingMsg(`Đang trích xuất văn bản trang ${p}...`);
                        const img = await pdfService.getPageAsImage(pdfDoc, p);
                        rawText += await geminiService.performOcr(img, 'Vietnamese') + ' ';
                    }
                    setLoadingMsg('Đang tạo giọng nói AI...');
                    const audioBase64 = await geminiService.generateSpeech(rawText);
                    const audioBytes = decode(audioBase64);
                    resultBlob = arrayBufferToBlob(audioBytes, 'audio/mp3');
                    const ctx = new AudioContext({ sampleRate: 24000 });
                    const audioBuf = await decodeAudioData(audioBytes, ctx, 24000, 1);
                    const source = ctx.createBufferSource();
                    source.buffer = audioBuf;
                    source.connect(ctx.destination);
                    source.start();
                    filename = 'speech.wav';
                    break;
                default:
                    throw new Error("Công cụ chưa được hỗ trợ.");
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
                setView('result');
            }

        } catch (e: any) {
            alert(e.message || "Có lỗi xảy ra");
        } finally {
            setIsProcessing(false);
            setLoadingMsg('');
        }
    };

    // Render Helpers
    const togglePage = (p: number) => {
        const newSet = new Set(selectedPages);
        if (newSet.has(p)) newSet.delete(p);
        else newSet.add(p);
        setSelectedPages(newSet);
    };

    // --- LANDING PAGE PARTS ---

    const LandingHeader = () => (
        <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 transition-all duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={() => setView('home')}>
                        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center mr-2">
                            <Icon type="logo" className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-xl text-gray-900 tracking-tight">PDF Pro</span>
                    </div>
                    <div className="hidden md:flex space-x-8 items-center">
                        {['Công cụ', 'Nén', 'Chuyển đổi', 'Ghép', 'Ký tên'].map(item => (
                            <a key={item} href="#tools" className="text-gray-600 hover:text-brand-600 font-medium transition">{item}</a>
                        ))}
                    </div>
                    <div className="hidden md:flex items-center space-x-4">
                        <button className="text-gray-900 hover:text-brand-600 font-medium">Đăng nhập</button>
                        <a href="#tools" className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-lg font-semibold transition shadow-lg shadow-brand-500/30">
                            Dùng ngay
                        </a>
                    </div>
                    <div className="md:hidden flex items-center">
                        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gray-600 hover:text-gray-900 focus:outline-none">
                           <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
                        </button>
                    </div>
                </div>
            </div>
            {mobileMenuOpen && (
                <div className="md:hidden bg-white border-t border-gray-100 p-4 space-y-2 shadow-lg">
                    <a href="#tools" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-brand-600 hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}>Công cụ</a>
                    <div className="border-t border-gray-100 my-2"></div>
                    <button className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-900 hover:bg-gray-50">Đăng nhập</button>
                    <a href="#tools" className="block w-full text-center px-3 py-3 mt-2 rounded-lg text-base font-medium bg-brand-600 text-white" onClick={() => setMobileMenuOpen(false)}>
                        Dùng ngay
                    </a>
                </div>
            )}
        </nav>
    );

    const WorkspaceHeader = () => (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('home')}>
                    <div className="bg-brand-600 text-white p-1.5 rounded-lg"><Icon type="logo" className="w-6 h-6" /></div>
                    <span className="font-bold text-xl tracking-tight text-gray-900">PDF Pro</span>
                </div>
                {activeTool && (
                    <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full text-sm font-medium">
                        <span className={`text-${activeTool.color}-600`}>{activeTool.name}</span>
                    </div>
                )}
                <button onClick={() => setView('result')} className="text-gray-600 hover:text-gray-900 font-medium text-sm">Lịch sử ({results.length})</button>
            </div>
        </header>
    );

    return (
        <div className="min-h-screen flex flex-col font-sans">
            {isProcessing && <Spinner message={loadingMsg} />}
            
            {view === 'home' ? <LandingHeader /> : <WorkspaceHeader />}

            <main className="flex-1 flex flex-col">
                {view === 'home' && (
                    <div className="flex-1 bg-white">
                        {/* HERO SECTION */}
                        <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden bg-gradient-to-b from-brand-50 to-white hero-pattern">
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                                <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
                                    Chúng tôi làm giúp việc xử lý PDF <br/>
                                    <span className="text-brand-600">trở nên dễ dàng hơn.</span>
                                </h1>
                                <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-600 mb-10">
                                    Hơn 20 công cụ để chuyển đổi, nén và chỉnh sửa tệp PDF miễn phí. Hãy thử ngay hôm nay để nâng cao hiệu suất công việc của bạn.
                                </p>

                                {/* File Upload Area as Hero Image/Action */}
                                <div className="relative max-w-4xl mx-auto rounded-2xl shadow-2xl overflow-hidden border border-gray-200 bg-white mb-16">
                                    <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                    </div>
                                    <div className="p-8 md:p-12 bg-white min-h-[300px] flex flex-col justify-center">
                                        {files.length === 0 ? (
                                            <>
                                                <FileUpload onFileChange={handleFiles} />
                                                <div className="mt-4 text-center">
                                                     <p className="text-gray-500">hoặc</p>
                                                     <button className="mt-2 text-brand-600 font-semibold hover:underline">Chọn file từ Dropbox / Google Drive</button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center">
                                                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <Icon type="check" className="w-8 h-8" />
                                                </div>
                                                <h3 className="text-xl font-bold text-gray-900 mb-2">{files.length} Tệp đã sẵn sàng!</h3>
                                                <p className="text-gray-500 mb-6">Vui lòng chọn một công cụ bên dưới để tiếp tục.</p>
                                                <div className="flex justify-center gap-3">
                                                     <button onClick={() => { setFiles([]); setPdfDoc(null); }} className="px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100">Xóa & Chọn lại</button>
                                                     <a href="#tools" className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium">Chọn công cụ ▼</a>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* TOOLS GRID SECTION */}
                        <section id="tools" className="py-20 bg-white">
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                <div className="text-center mb-12">
                                    <h2 className="text-3xl font-bold text-gray-900">Các công cụ PDF phổ biến nhất</h2>
                                    <p className="mt-4 text-gray-600">Giúp bạn giải quyết mọi vấn đề với tệp PDF chỉ trong vài cú click.</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                    {TOOLS.map(t => (
                                        <div key={t.id} onClick={() => handleToolSelect(t)} className="group p-6 bg-white border border-gray-100 rounded-xl shadow-soft hover:shadow-hover hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                                            <div className={`w-12 h-12 mb-4 rounded-lg flex items-center justify-center bg-${t.color}-50`}>
                                                <div className={`text-${t.color}-600`}>
                                                    {React.cloneElement(t.icon, { className: 'w-8 h-8' })}
                                                </div>
                                            </div>
                                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-brand-600">{t.name}</h3>
                                            <p className="mt-2 text-sm text-gray-500 line-clamp-2">{t.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* FEATURES SECTION */}
                        <section className="py-20 bg-gray-50 overflow-hidden">
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
                                {/* Feature 1 */}
                                <div className="flex flex-col md:flex-row items-center gap-12">
                                    <div className="w-full md:w-1/2">
                                        <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-100 transform -rotate-2 hover:rotate-0 transition duration-500">
                                            <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center h-64">
                                                <div className="text-gray-400 font-medium flex flex-col items-center">
                                                    <Icon type="split-page" className="w-12 h-12 mb-2" />
                                                    <span>Giao diện chỉnh sửa trực quan</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-full md:w-1/2">
                                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Làm việc trực tiếp trên file</h2>
                                        <p className="text-lg text-gray-600 leading-relaxed mb-6">
                                            Không cần tải phần mềm nặng nề. Chỉnh sửa văn bản, thêm hình ảnh, đánh dấu highlight trực tiếp trên trình duyệt của bạn với tốc độ cực nhanh.
                                        </p>
                                        <ul className="space-y-3">
                                            <li className="flex items-center text-gray-700">
                                                <Icon type="check" className="w-5 h-5 text-green-500 mr-3" /> Giao diện trực quan, dễ sử dụng
                                            </li>
                                            <li className="flex items-center text-gray-700">
                                                <Icon type="check" className="w-5 h-5 text-green-500 mr-3" /> Tự động lưu thay đổi
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                                {/* Feature 2 */}
                                <div className="flex flex-col md:flex-row-reverse items-center gap-12">
                                    <div className="w-full md:w-1/2">
                                        <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-100 transform rotate-2 hover:rotate-0 transition duration-500">
                                            <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center h-64">
                                                <div className="text-gray-400 font-medium flex flex-col items-center">
                                                    <Icon type="signature" className="w-12 h-12 mb-2" />
                                                    <span>Chữ ký điện tử & Bảo mật</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-full md:w-1/2">
                                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Chữ ký điện tử dễ dàng</h2>
                                        <p className="text-lg text-gray-600 leading-relaxed mb-6">
                                            Ký tên vào hợp đồng và biểu mẫu trong vài giây. Gửi yêu cầu chữ ký cho đối tác và theo dõi trạng thái văn bản theo thời gian thực.
                                        </p>
                                        <a href="#" className="text-brand-600 font-bold hover:underline inline-flex items-center">
                                            Tìm hiểu thêm về eSign <span className="ml-1">→</span>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* MOBILE APP SECTION */}
                        <section className="py-20 bg-brand-900 text-white overflow-hidden relative">
                            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-brand-600 opacity-20 blur-3xl"></div>
                            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-purple-600 opacity-20 blur-3xl"></div>
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                                <div className="flex flex-col md:flex-row items-center justify-between">
                                    <div className="w-full md:w-1/2 mb-10 md:mb-0">
                                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Làm việc mọi lúc, mọi nơi</h2>
                                        <p className="text-brand-100 text-lg mb-8 max-w-lg">
                                            Tải ứng dụng PDF Pro cho thiết bị di động để quét, chỉnh sửa và gửi tài liệu ngay cả khi bạn đang di chuyển.
                                        </p>
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <button className="flex items-center justify-center bg-white text-gray-900 px-6 py-3 rounded-xl hover:bg-gray-100 transition">
                                                <div className="text-left font-bold">Google Play</div>
                                            </button>
                                            <button className="flex items-center justify-center bg-transparent border border-gray-500 text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition">
                                                <div className="text-left font-bold">App Store</div>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="w-full md:w-1/3 flex justify-center">
                                         <div className="w-48 h-80 bg-gray-800 rounded-3xl border-4 border-gray-700 shadow-2xl overflow-hidden relative flex items-center justify-center bg-white">
                                             <div className="text-gray-900 font-bold">PDF Pro App</div>
                                         </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* PRICING */}
                        <section id="pricing" className="py-20 bg-white">
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                <div className="text-center mb-16">
                                    <h2 className="text-3xl font-bold text-gray-900">Gói cước phù hợp</h2>
                                    <p className="mt-4 text-gray-600">Lựa chọn giải pháp tốt nhất để tối ưu hóa công việc.</p>
                                </div>
                                <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-soft hover:shadow-xl transition">
                                        <h3 className="text-xl font-bold text-gray-900">Gói Pro</h3>
                                        <div className="mt-4 flex items-baseline"><span className="text-4xl font-extrabold text-gray-900">200k</span><span className="ml-1 text-gray-500">/tháng</span></div>
                                        <p className="mt-4 text-gray-500 text-sm">Dành cho cá nhân muốn làm việc hiệu quả hơn.</p>
                                        <button className="mt-8 block w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-3 px-4 rounded-xl transition">Bắt đầu dùng thử</button>
                                    </div>
                                    <div className="bg-brand-600 rounded-2xl border border-brand-500 p-8 shadow-xl transform scale-105 relative z-10 text-white">
                                        <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-bl-lg">PHỔ BIẾN NHẤT</div>
                                        <h3 className="text-xl font-bold text-white">Gói Nhóm</h3>
                                        <div className="mt-4 flex items-baseline"><span className="text-4xl font-extrabold text-white">150k</span><span className="ml-1 text-brand-200">/người/tháng</span></div>
                                        <p className="mt-4 text-brand-100 text-sm">Dành cho các đội nhóm nhỏ và doanh nghiệp.</p>
                                        <button className="mt-8 block w-full bg-white text-brand-600 font-bold py-3 px-4 rounded-xl transition shadow-lg">Liên hệ ngay</button>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* FINAL CTA */}
                        <section className="py-20 bg-brand-50">
                            <div className="max-w-4xl mx-auto px-4 text-center">
                                <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6">Bạn đã sẵn sàng để làm việc thông minh hơn?</h2>
                                <a href="#tools" className="inline-block px-10 py-4 bg-brand-600 text-white font-bold text-lg rounded-xl hover:bg-brand-700 shadow-xl shadow-brand-600/20 transition hover:-translate-y-1">
                                    Dùng ngay
                                </a>
                            </div>
                        </section>

                        {/* FOOTER */}
                        <footer className="bg-white border-t border-gray-200 pt-16 pb-8">
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
                                    <div className="col-span-2 lg:col-span-2">
                                        <div className="flex items-center mb-4">
                                            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center mr-2">
                                                 <Icon type="logo" className="w-5 h-5 text-white" />
                                            </div>
                                            <span className="font-bold text-xl text-gray-900">PDF Pro</span>
                                        </div>
                                        <p className="text-gray-500 mb-6 max-w-xs">Giải pháp PDF hàng đầu thế giới cho mọi người. Làm việc trực tuyến dễ dàng và an toàn.</p>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">Sản phẩm</h3>
                                        <ul className="space-y-3 text-gray-600"><li>Gói Pro</li><li>Gói Nhóm</li><li>Mobile App</li></ul>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">Công ty</h3>
                                        <ul className="space-y-3 text-gray-600"><li>Về chúng tôi</li><li>Blog</li><li>Liên hệ</li></ul>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">Hỗ trợ</h3>
                                        <ul className="space-y-3 text-gray-600"><li>Trợ giúp</li><li>Pháp lý</li><li>Quyền riêng tư</li></ul>
                                    </div>
                                </div>
                                <div className="border-t border-gray-200 pt-8 flex justify-between items-center">
                                    <p className="text-base text-gray-500">&copy; 2023 PDF Pro Inc. Mọi quyền được bảo lưu.</p>
                                    <span className="text-gray-500">Tiếng Việt</span>
                                </div>
                            </div>
                        </footer>
                    </div>
                )}

                {view === 'workspace' && activeTool && (
                    <div className="flex-1 flex overflow-hidden">
                        <div className="flex-1 flex flex-col bg-gray-100 overflow-hidden relative">
                             {files.length === 0 ? (
                                 <div className="flex-1 flex items-center justify-center p-6">
                                     <div className="text-center w-full max-w-md">
                                        <FileUpload onFileChange={handleFiles} multiple={activeTool.id === 'merge'} />
                                     </div>
                                 </div>
                             ) : (
                                 activeTool.id === 'merge' ? (
                                     <div className="p-8 max-w-3xl mx-auto w-full h-full overflow-y-auto">
                                         <h2 className="text-xl font-bold mb-4">Các file đã chọn để ghép</h2>
                                         <div className="space-y-2 mb-6">
                                            {files.map((f, i) => (
                                                <div key={i} className="bg-white p-3 rounded shadow-sm border flex justify-between items-center">
                                                    <span className="truncate">{f.name}</span>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-sm text-gray-500">{(f.size/1024/1024).toFixed(2)} MB</span>
                                                        <button onClick={() => handleRemoveFile(i)} className="text-gray-400 hover:text-red-500"><Icon type="trash" className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                            ))}
                                         </div>
                                         <FileUpload onFileChange={handleFiles} multiple compact />
                                     </div>
                                 ) : (
                                     <PdfViewer 
                                        pdfDoc={pdfDoc} 
                                        selectedPages={selectedPages} 
                                        onPageSelect={togglePage}
                                        toggleSelectAll={() => {
                                            if (!pdfDoc) return;
                                            if (selectedPages.size === pdfDoc.numPages) setSelectedPages(new Set());
                                            else setSelectedPages(new Set(Array.from({length: pdfDoc.numPages}, (_, i) => i + 1)));
                                        }}
                                     />
                                 )
                             )}
                        </div>
                        <ToolPanel 
                            tool={activeTool} 
                            onApply={handleApplyTool} 
                            onCancel={() => { setView('home'); setFiles([]); setPdfDoc(null); }} 
                            isProcessing={isProcessing}
                        />
                    </div>
                )}

                {view === 'result' && (
                    <div className="flex-1 bg-gray-50 p-8 overflow-y-auto">
                        <div className="max-w-4xl mx-auto">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-2xl font-bold text-gray-900">Tệp đã xử lý</h2>
                                <button onClick={() => setView('home')} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium">Quay lại trang chủ</button>
                            </div>
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                {results.length === 0 ? (
                                    <div className="p-12 text-center text-gray-500">Chưa có tệp nào được xử lý.</div>
                                ) : (
                                    <ul className="divide-y divide-gray-100">
                                        {results.map(f => (
                                            <li key={f.id} className="p-6 flex items-center justify-between hover:bg-gray-50">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-green-100 text-green-600 rounded-lg"><Icon type="file" /></div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900">{f.name}</p>
                                                        <p className="text-sm text-gray-500">{f.operation} • {f.timestamp.toLocaleTimeString()}</p>
                                                    </div>
                                                </div>
                                                <a href={URL.createObjectURL(f.blob)} download={f.name} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium">
                                                    <Icon type="download" className="w-4 h-4" /> Tải xuống
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;
