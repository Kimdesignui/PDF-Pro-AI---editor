
import React from 'react';
import { ToolSidebar } from './ToolSidebar';
import { PdfViewer } from './PdfViewer';
import { FileUpload } from './FileUpload';
import { Icon } from './Icon';
import type { Tool, PageEditState } from '../types';

interface EditorWorkspaceProps {
    activeTool: Tool | null;
    files: File[];
    pdfDoc: any;
    selectedPages: Set<number>;
    pageStates: PageEditState[];
    onToolSelect: (tool: Tool) => void;
    onGoHome: () => void;
    onFileChange: (files: File[]) => void;
    onProcess: () => void;
    onPageSelect: (page: number) => void;
    toggleSelectAll: () => void;
    onRotatePage: (page: number, direction: 'left' | 'right') => void;
    onDeletePage: (page: number) => void;
    onReorderPages: (newOrder: PageEditState[]) => void;
}

export const EditorWorkspace: React.FC<EditorWorkspaceProps> = ({
    activeTool,
    files,
    pdfDoc,
    selectedPages,
    pageStates,
    onToolSelect,
    onGoHome,
    onFileChange,
    onProcess,
    onPageSelect,
    toggleSelectAll,
    onRotatePage,
    onDeletePage,
    onReorderPages
}) => {
    return (
        <div className="flex h-screen overflow-hidden bg-gray-50">
            {/* 1. Sidebar Component (Tách riêng) */}
            <ToolSidebar 
                activeToolId={activeTool?.id || ''} 
                onSelectTool={onToolSelect} 
                onGoHome={onGoHome}
            />

            {/* 2. Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
                {/* Header */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10 shadow-sm">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            {/* Dải màu đánh dấu công cụ đang chọn */}
                            <span className={`w-1.5 h-6 rounded-full bg-${activeTool?.color || 'brand'}-500`}></span>
                            {activeTool?.name || 'Workspace'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-3">
                        {files.length === 0 ? (
                            <div className="text-sm text-gray-400 italic flex items-center gap-2">
                                <Icon type="file" className="w-4 h-4"/> Chưa có file
                            </div>
                        ) : (
                            <>
                                <button className="hidden sm:flex items-center gap-2 text-gray-600 hover:text-brand-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition-all font-medium border border-transparent hover:border-gray-200">
                                    <Icon type="plus" className="w-5 h-5" />
                                    <span>Thêm file</span>
                                </button>
                                <button 
                                    onClick={onProcess}
                                    className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-lg shadow-brand-500/20 transition-all transform active:scale-95 hover:-translate-y-0.5"
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
                        <div className="h-full flex flex-col items-center justify-center p-8 animate-fade-in">
                             <div className="max-w-lg w-full bg-white p-10 rounded-2xl shadow-sm border border-gray-200 text-center">
                                 <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                     <Icon type="upload" className="w-8 h-8" />
                                 </div>
                                 <h3 className="text-xl font-bold mb-2 text-gray-900">Tải lên file PDF để bắt đầu</h3>
                                 <p className="text-gray-500 mb-6">Kéo thả hoặc chọn file từ máy tính của bạn</p>
                                 <FileUpload onFileChange={onFileChange} />
                             </div>
                        </div>
                    ) : (
                        <div className="h-full animate-fade-in">
                            <PdfViewer 
                                pdfDoc={pdfDoc}
                                selectedPages={selectedPages}
                                pageStates={pageStates}
                                onPageSelect={onPageSelect}
                                toggleSelectAll={toggleSelectAll}
                                onRotatePage={onRotatePage}
                                onDeletePage={onDeletePage}
                                onReorderPages={onReorderPages}
                                enableVisualEdit={true}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
