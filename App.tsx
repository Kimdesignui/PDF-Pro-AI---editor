
import React, { useState, useEffect } from 'react';
import type { Tool, ProcessedFile, PageEditState } from './types';
import { Spinner } from './components/Spinner';
import { Icon } from './components/Icon';
import * as pdfService from './services/pdfService';
import { arrayBufferToBlob, fileToArrayBuffer } from './utils';

// Import Components
import { LandingPage } from './components/LandingPage';
import { EditorWorkspace } from './components/EditorWorkspace';
import { UserGuide } from './components/UserGuide';

const App: React.FC = () => {
    // --- STATE MANAGEMENT ---
    // Added 'guide' to the view union type
    const [view, setView] = useState<'landing' | 'editor' | 'success' | 'files' | 'guide'>('landing');
    
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
        if (!pdfDoc && uploadedFiles.length > 0) {
            await loadPdf(uploadedFiles[0]);
        }
    };

    const handleToolSelect = (tool: Tool) => {
        setActiveTool(tool);
        setView('editor');
    };

    const handleGoHome = () => {
        setView('landing');
        setFiles([]);
        setPdfDoc(null);
        setActiveTool(null);
    };

    // --- FILES MANAGEMENT HANDLERS ---
    const handleDeleteResult = (id: number) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa file này?')) {
            setResults(prev => prev.filter(r => r.id !== id));
        }
    };

    const handleClearAllResults = () => {
        if (results.length === 0) return;
        if (window.confirm('Hành động này sẽ xóa toàn bộ lịch sử xử lý file của bạn. Bạn có chắc chắn không?')) {
            setResults([]);
        }
    };

    const handleViewResult = (result: ProcessedFile) => {
        const url = URL.createObjectURL(result.blob);
        window.open(url, '_blank');
    };

    const handleEditResult = async (result: ProcessedFile) => {
         try {
            // Convert Blob back to File
            const file = new File([result.blob], result.name, { type: 'application/pdf' });
            
            // Reset Workspace State
            setFiles([file]);
            setPageStates([]);
            setSelectedPages(new Set());
            setActiveTool(null); // User selects tool inside workspace
            
            setIsProcessing(true);
            setLoadingMsg('Đang tải file vào trình chỉnh sửa...');
            
            await loadPdf(file);
            
            setIsProcessing(false);
            setLoadingMsg('');
            setView('editor');
        } catch (e) {
            console.error(e);
            setIsProcessing(false);
            alert("Không thể tải lại file này vào trình chỉnh sửa.");
        }
    };

    // --- EDITOR LOGIC ---
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

    const handlePageSelect = (p: number) => {
        const newSet = new Set(selectedPages);
        if (newSet.has(p)) newSet.delete(p); else newSet.add(p);
        setSelectedPages(newSet);
    };

    const toggleSelectAll = () => {
        const activePages = pageStates.filter(p => !p.isDeleted);
        if (selectedPages.size === activePages.length) setSelectedPages(new Set());
        else setSelectedPages(new Set(activePages.map(p => p.originalPageNumber)));
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

    // --- RENDER ---
    return (
        <div className="min-h-screen font-sans text-gray-900 bg-gray-50">
            {isProcessing && <Spinner message={loadingMsg} />}
            
            {view === 'landing' && (
                <LandingPage 
                    onToolSelect={handleToolSelect} 
                    onFileChange={(files) => { handleFiles(files); setView('editor'); }}
                    onViewFiles={() => setView('files')}
                    onViewGuide={() => setView('guide')}
                />
            )}

            {view === 'guide' && (
                <UserGuide onGoHome={handleGoHome} />
            )}
            
            {view === 'editor' && (
                <EditorWorkspace 
                    activeTool={activeTool}
                    files={files}
                    pdfDoc={pdfDoc}
                    selectedPages={selectedPages}
                    pageStates={pageStates}
                    onToolSelect={setActiveTool}
                    onGoHome={handleGoHome}
                    onFileChange={handleFiles}
                    onProcess={handleProcess}
                    onPageSelect={handlePageSelect}
                    toggleSelectAll={toggleSelectAll}
                    onRotatePage={handleRotatePage}
                    onDeletePage={handleDeletePage}
                    onReorderPages={handleReorderPages}
                />
            )}
            
            {view === 'success' && currentResult && (
                 <div className="fixed inset-0 flex items-center justify-center bg-gray-50/90 backdrop-blur-sm p-4 z-50 animate-fade-in">
                     <div className="bg-white p-10 rounded-3xl shadow-2xl text-center max-w-md w-full border border-gray-100 transform transition-all scale-100">
                         <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                             <Icon type="check" className="w-10 h-10" />
                         </div>
                         <h2 className="text-3xl font-extrabold mb-2 text-gray-900">Thành công!</h2>
                         <p className="text-gray-500 mb-8">File <strong>{currentResult.name}</strong> của bạn đã sẵn sàng.</p>
                         
                         <a href={URL.createObjectURL(currentResult.blob)} download={currentResult.name} className="flex items-center justify-center w-full py-4 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/30 mb-4 transform hover:-translate-y-1">
                             <Icon type="download" className="w-5 h-5 mr-2" /> Tải xuống ngay
                         </a>
                         
                         <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setView('editor')} className="py-3 text-gray-700 bg-gray-100 font-semibold hover:bg-gray-200 rounded-xl transition-colors">
                                Chỉnh sửa tiếp
                            </button>
                            <button onClick={handleGoHome} className="py-3 text-gray-700 border border-gray-200 font-semibold hover:bg-gray-50 rounded-xl transition-colors">
                                Trang chủ
                            </button>
                         </div>
                     </div>
                 </div>
            )}

            {view === 'files' && (
                <div className="min-h-screen bg-gray-50 p-6 md:p-12">
                    <div className="max-w-6xl mx-auto">
                        {/* Header */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                            <div>
                                <h2 className="text-3xl font-bold text-gray-900">Tài liệu đã xử lý</h2>
                                <p className="text-gray-500 mt-1">Quản lý các tập tin PDF bạn đã chỉnh sửa gần đây.</p>
                            </div>
                            <div className="flex gap-3">
                                {results.length > 0 && (
                                    <button 
                                        onClick={handleClearAllResults} 
                                        className="flex items-center px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm"
                                    >
                                        <Icon type="trash" className="w-4 h-4 mr-2" /> Xóa toàn bộ
                                    </button>
                                )}
                                <button onClick={handleGoHome} className="flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm">
                                    <Icon type="arrow-left" className="w-4 h-4 mr-2" /> Quay lại trang chủ
                                </button>
                            </div>
                        </div>

                        {/* File List */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            {results.length === 0 ? (
                                <div className="p-20 text-center flex flex-col items-center justify-center text-gray-400">
                                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                        <Icon type="file" className="w-10 h-10 opacity-30" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-1">Chưa có tài liệu nào</h3>
                                    <p className="text-sm">Các file bạn xử lý sẽ xuất hiện tại đây.</p>
                                    <button onClick={handleGoHome} className="mt-6 text-brand-600 hover:text-brand-800 font-medium text-sm">
                                        Bắt đầu ngay
                                    </button>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {results.map(r => (
                                        <div key={r.id} className="p-5 flex flex-col sm:flex-row justify-between items-center hover:bg-gray-50 transition-colors gap-4">
                                            
                                            {/* File Info */}
                                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                                <div className="bg-brand-50 text-brand-600 p-3 rounded-xl shrink-0">
                                                    <Icon type="file" className="w-6 h-6"/>
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="font-semibold text-gray-900 block truncate max-w-xs sm:max-w-md">{r.name}</span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs font-medium text-brand-700 bg-brand-100 px-2 py-0.5 rounded-md">{r.operation}</span>
                                                        <span className="text-xs text-gray-400">• {r.timestamp.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                                <button 
                                                    onClick={() => handleViewResult(r)}
                                                    className="p-2 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors tooltip-trigger" 
                                                    title="Xem trước"
                                                >
                                                    <Icon type="eye" className="w-5 h-5"/>
                                                </button>
                                                
                                                <button 
                                                    onClick={() => handleEditResult(r)}
                                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                                                    title="Sửa lại"
                                                >
                                                    <Icon type="edit" className="w-5 h-5"/>
                                                </button>

                                                <a 
                                                    href={URL.createObjectURL(r.blob)} 
                                                    download={r.name} 
                                                    className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                    title="Tải xuống"
                                                >
                                                    <Icon type="download" className="w-5 h-5"/>
                                                </a>

                                                <div className="w-px h-6 bg-gray-200 mx-1"></div>

                                                <button 
                                                    onClick={() => handleDeleteResult(r.id)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Xóa"
                                                >
                                                    <Icon type="trash" className="w-5 h-5"/>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
