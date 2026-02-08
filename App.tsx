
import React, { useState, useCallback, useEffect } from 'react';
import { TOOLS } from './constants';
import type { Tool, ProcessedFile, PageEditState } from './types';
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
    const [view, setView] = useState<'home' | 'workspace' | 'result' | 'success'>('home');
    const [activeTool, setActiveTool] = useState<Tool | null>(null);
    const [files, setFiles] = useState<File[]>([]);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
    const [pageStates, setPageStates] = useState<PageEditState[]>([]); // New: Track visual state per page
    const [isProcessing, setIsProcessing] = useState(false);
    const [results, setResults] = useState<ProcessedFile[]>([]);
    const [currentResult, setCurrentResult] = useState<ProcessedFile | null>(null);
    const [loadingMsg, setLoadingMsg] = useState('');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Initializer for Page States
    useEffect(() => {
        if (pdfDoc) {
            const numPages = pdfDoc.numPages;
            const initialStates: PageEditState[] = [];
            for (let i = 1; i <= numPages; i++) {
                initialStates.push({ pageNumber: i, rotation: 0, isDeleted: false });
            }
            setPageStates(initialStates);
            // Reset selection when loading new doc
            setSelectedPages(new Set()); 
        } else {
            setPageStates([]);
        }
    }, [pdfDoc]);

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
        
        // If we have files, check if we need to load the doc
        if (files.length > 0) {
            if (!pdfDoc) {
                loadPdf(files[0]);
            }
            setView('workspace');
        } else {
            // Workflow: Tool -> Home (but scroll up) to upload
            setView('home'); 
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
        
        // Workflow: If tool active, go to workspace immediately
        if (activeTool) {
            setView('workspace');
        }
    };

    const handleRemoveFile = (index: number) => {
        const newFiles = files.filter((_, i) => i !== index);
        setFiles(newFiles);
        if (newFiles.length === 0) {
            setPdfDoc(null);
            if (view === 'workspace' && activeTool?.id !== 'merge') { 
                setView('home');
            }
        } else if (index === 0 && newFiles.length > 0) {
            loadPdf(newFiles[0]);
        }
    };

    // --- NEW: Visual Edit Handlers ---
    
    // Xoay trang cụ thể (Instant Feedback)
    const handleRotatePage = (pageNumber: number, direction: 'left' | 'right') => {
        const delta = direction === 'left' ? -90 : 90;
        setPageStates(prev => prev.map(p => {
            if (p.pageNumber === pageNumber) {
                return { ...p, rotation: p.rotation + delta };
            }
            return p;
        }));
    };

    // Đánh dấu trang là đã xóa
    const handleDeletePage = (pageNumber: number) => {
        setPageStates(prev => prev.map(p => {
            if (p.pageNumber === pageNumber) {
                return { ...p, isDeleted: true };
            }
            return p;
        }));
        // Remove from selection if deleted
        if (selectedPages.has(pageNumber)) {
            const newSet = new Set(selectedPages);
            newSet.delete(pageNumber);
            setSelectedPages(newSet);
        }
    };

    // Handler called by ToolPanel buttons (e.g., Rotate All/Selected Left)
    const handleBulkRotate = (angle: number) => {
        setPageStates(prev => prev.map(p => {
            // Nếu có trang được chọn, chỉ xoay trang đó. Nếu không, xoay tất cả (tiện ích cho người dùng)
            const shouldRotate = selectedPages.size === 0 || selectedPages.has(p.pageNumber);
            if (shouldRotate && !p.isDeleted) {
                return { ...p, rotation: p.rotation + angle };
            }
            return p;
        }));
    };

    // --- End Visual Edit Handlers ---

    // Storage Handlers
    const handleDeleteResult = (id: number) => {
        if (window.confirm("Bạn có chắc muốn xóa tệp này không?")) {
            setResults(results.filter(r => r.id !== id));
            if (currentResult?.id === id) setCurrentResult(null);
        }
    };

    const handleRenameResult = (id: number, currentName: string) => {
        const newName = prompt("Nhập tên mới:", currentName);
        if (newName && newName.trim() !== "") {
            setResults(results.map(r => r.id === id ? { ...r, name: newName.trim() } : r));
        }
    };

    const handleContinueResult = (result: ProcessedFile) => {
        const file = new File([result.blob], result.name, { type: 'application/pdf' });
        setFiles([file]);
        loadPdf(file);
        setView('home');
        setActiveTool(null);
        setTimeout(() => {
             const toolsSection = document.getElementById('tools');
             if (toolsSection) toolsSection.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleViewResult = (result: ProcessedFile) => {
        const url = URL.createObjectURL(result.blob);
        window.open(url, '_blank');
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

            const targetPages = selectedPages.size > 0 ? Array.from(selectedPages) as number[] : [];

            switch (activeTool.id) {
                case 'rotate':
                    // NEW: Use the visual page states for processing
                    const hasChanges = pageStates.some(p => p.rotation !== 0 || p.isDeleted);
                    if (!hasChanges) throw new Error("Bạn chưa thực hiện thay đổi nào (Xoay/Xóa).");
                    
                    output = await pdfService.applyPageEdits(buffer, pageStates);
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
                        <button onClick={() => setView('result')} className="group flex items-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white px-6 py-2.5 rounded-full font-bold shadow-lg shadow-brand-500/30 transition-all transform hover:-translate-y-0.5">
                             <Icon type="file" className="w-5 h-5 text-white/90 group-hover:text-white" />
                             <span>Khám phá</span>
                             {results.length > 0 && <span className="bg-white text-brand-600 text-xs font-extrabold px-2 py-0.5 rounded-full ml-1">{results.length}</span>}
                        </button>
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
                    <button onClick={() => { setView('result'); setMobileMenuOpen(false); }} className="block w-full text-left px-3 py-2 rounded-md text-base font-bold text-brand-600 hover:bg-brand-50 flex items-center gap-2">
                        <Icon type="file" className="w-5 h-5" /> Khám phá ({results.length})
                    </button>
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
                <button onClick={() => setView('result')} className="flex items-center gap-2 bg-brand-50 text-brand-700 hover:bg-brand-100 px-4 py-2 rounded-lg font-bold transition-all border border-brand-200 shadow-sm">
                    <Icon type="file" className="w-4 h-4" />
                    <span>Khám phá</span>
                    {results.length > 0 && <span className="bg-brand-600 text-white text-xs px-1.5 py-0.5 rounded-full">{results.length}</span>}
                </button>
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
                                            Sử dụng PDF Pro trên mọi thiết bị di động để quét, chỉnh sửa và gửi tài liệu ngay cả khi bạn đang di chuyển.
                                        </p>
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <a href="#tools" className="inline-block px-8 py-3 bg-white text-brand-900 font-bold text-lg rounded-xl hover:bg-gray-100 shadow-lg transition hover:-translate-y-1">
                                                Dùng ngay
                                            </a>
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
                                                Đây là dự án tâm huyết được thiết kế bởi <strong className="text-white">Kim Tiểu Kê (UI Designer)</strong> nhằm hỗ trợ cộng đồng xử lý công việc hiệu quả hơn.
                                            </p>
                                            
                                            <div className="flex items-start gap-4 p-4 bg-white/10 rounded-xl border border-white/10 mb-8 backdrop-blur-sm">
                                                <div className="p-2 bg-white/20 rounded-lg shrink-0">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                    </svg>
                                                </div>
                                                <div className="text-sm text-blue-100 text-left">
                                                    <span className="font-semibold text-white block mb-1">Powered by AI</span>
                                                    Hệ thống được xây dựng và tối ưu mã nguồn bởi <strong className="text-white">Google AI Studio</strong>, mang đến trải nghiệm xử lý PDF thông minh, nhanh chóng và bảo mật.
                                                </div>
                                            </div>

                                            <a href="#tools" className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-brand-700 bg-white rounded-xl hover:bg-brand-50 transition-all transform hover:-translate-y-1 shadow-lg">
                                                Bắt đầu ngay - Miễn phí mãi mãi
                                            </a>
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
                                        pageStates={pageStates}
                                        onPageSelect={togglePage}
                                        toggleSelectAll={() => {
                                            if (!pdfDoc) return;
                                            if (selectedPages.size === pdfDoc.numPages) setSelectedPages(new Set());
                                            else setSelectedPages(new Set(Array.from({length: pdfDoc.numPages}, (_, i) => i + 1)));
                                        }}
                                        onRotatePage={handleRotatePage}
                                        onDeletePage={handleDeletePage}
                                        // Enable visual controls specifically for rotate tool
                                        enableVisualEdit={activeTool.id === 'rotate'}
                                     />
                                 )
                             )}
                        </div>
                        <ToolPanel 
                            tool={activeTool} 
                            onApply={activeTool.id === 'rotate' ? () => handleApplyTool({}) : handleApplyTool} 
                            onCancel={() => { setView('home'); setFiles([]); setPdfDoc(null); }} 
                            isProcessing={isProcessing}
                            // Pass bulk rotate function for the tool panel buttons
                            onBulkRotate={handleBulkRotate}
                        />
                    </div>
                )}

                {view === 'success' && currentResult && (
                    <div className="flex-1 bg-gray-50 flex flex-col items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-gray-100">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Icon type="check" className="w-10 h-10 text-green-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Thành công!</h2>
                            <p className="text-gray-600 mb-6">Tệp <span className="font-semibold text-gray-800">{currentResult.name}</span> đã được xử lý.</p>
                            
                            <div className="space-y-3">
                                <a 
                                    href={URL.createObjectURL(currentResult.blob)} 
                                    download={currentResult.name}
                                    className="block w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg shadow-brand-500/30 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2"
                                >
                                    <Icon type="download" className="w-5 h-5" /> Tải xuống ngay
                                </a>
                                
                                <div className="grid grid-cols-2 gap-3">
                                     <button 
                                        onClick={() => handleContinueResult(currentResult)}
                                        className="py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition"
                                    >
                                        Xử lý tiếp
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setView('home');
                                            setFiles([]);
                                            setPdfDoc(null);
                                            setActiveTool(null);
                                        }}
                                        className="py-3 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl transition"
                                    >
                                        Làm mới
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'result' && (
                    <div className="flex-1 bg-gray-50 p-6 md:p-10 overflow-y-auto">
                        <div className="max-w-6xl mx-auto">
                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                                <div>
                                    <h2 className="text-3xl font-bold text-gray-900">Tệp lưu trữ</h2>
                                    <p className="text-gray-500 mt-1">Quản lý các tệp đã xử lý của bạn</p>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => setView('home')} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-500/30 transition flex items-center gap-2">
                                        <Icon type="upload" className="w-5 h-5" /> Thêm tệp mới
                                    </button>
                                </div>
                            </div>
                            
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                {results.length === 0 ? (
                                    <div className="p-16 text-center flex flex-col items-center">
                                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6 text-gray-400">
                                            <Icon type="file" className="w-10 h-10" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900">Chưa có tệp nào</h3>
                                        <p className="text-gray-500 mt-2 mb-8">Hãy xử lý tệp PDF đầu tiên của bạn để thấy nó ở đây.</p>
                                        <button onClick={() => setView('home')} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold transition">
                                            Quay lại trang chủ
                                        </button>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider border-b border-gray-200">
                                                    <th className="p-5 font-semibold">Tên tệp</th>
                                                    <th className="p-5 font-semibold hidden md:table-cell">Hoạt động</th>
                                                    <th className="p-5 font-semibold hidden sm:table-cell">Thời gian</th>
                                                    <th className="p-5 font-semibold text-right">Hành động</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {results.map(f => (
                                                    <tr key={f.id} className="hover:bg-gray-50 transition group">
                                                        <td className="p-5">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
                                                                    <Icon type="file" />
                                                                </div>
                                                                <span className="font-medium text-gray-900 break-all line-clamp-2">{f.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-5 hidden md:table-cell">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                                {f.operation}
                                                            </span>
                                                        </td>
                                                        <td className="p-5 text-gray-500 text-sm hidden sm:table-cell">
                                                            {f.timestamp.toLocaleString()}
                                                        </td>
                                                        <td className="p-5">
                                                            <div className="flex justify-end items-center gap-2">
                                                                <button 
                                                                    onClick={() => handleViewResult(f)}
                                                                    title="Xem"
                                                                    className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                                                >
                                                                    <Icon type="eye" className="w-5 h-5" />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleContinueResult(f)}
                                                                    title="Chỉnh sửa tiếp"
                                                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                                >
                                                                    <Icon type="rotate" className="w-5 h-5" />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleRenameResult(f.id, f.name)}
                                                                    title="Đổi tên"
                                                                    className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                                                                >
                                                                    <Icon type="file" className="w-5 h-5" />
                                                                </button>
                                                                <a 
                                                                    href={URL.createObjectURL(f.blob)} 
                                                                    download={f.name}
                                                                    title="Tải xuống"
                                                                    className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                                                                >
                                                                    <Icon type="download" className="w-5 h-5" />
                                                                </a>
                                                                <button 
                                                                    onClick={() => handleDeleteResult(f.id)}
                                                                    title="Xóa"
                                                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                                >
                                                                    <Icon type="trash" className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
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
