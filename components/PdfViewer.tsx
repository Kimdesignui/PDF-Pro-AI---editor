
import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './Icon';
import type { PageEditState } from '../types';

interface PdfViewerProps {
    pdfDoc: any;
    selectedPages: Set<number>;
    pageStates: PageEditState[]; // Pass the visual state
    onPageSelect: (pageNumber: number) => void;
    toggleSelectAll: () => void;
    onRotatePage: (pageNumber: number, direction: 'left' | 'right') => void;
    onDeletePage: (pageNumber: number) => void;
    enableVisualEdit?: boolean; // Toggle to show advanced controls
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ 
    pdfDoc, 
    selectedPages, 
    pageStates,
    onPageSelect, 
    toggleSelectAll,
    onRotatePage,
    onDeletePage,
    enableVisualEdit = false
}) => {
    const [pages, setPages] = useState<any[]>([]);
    
    useEffect(() => {
        if (!pdfDoc) return;
        const load = async () => {
            const num = pdfDoc.numPages;
            const ps = [];
            for (let i = 1; i <= num; i++) ps.push(await pdfDoc.getPage(i));
            setPages(ps);
        };
        load();
    }, [pdfDoc]);

    return (
        <div className="flex flex-col h-full">
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-200 px-6 py-3 flex justify-between items-center shadow-sm">
                <span className="font-semibold text-gray-700">{pages.length} Trang</span>
                <div className="flex items-center gap-4">
                     <div className="text-xs text-gray-500 hidden sm:block">
                        {enableVisualEdit ? 'Nhấn vào nút trên thẻ để chỉnh sửa' : 'Nhấn vào thẻ để chọn'}
                     </div>
                    <button onClick={toggleSelectAll} className="text-sm text-brand-600 hover:text-brand-800 font-medium px-3 py-1.5 rounded hover:bg-brand-50 transition">
                        {selectedPages.size === pages.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-gray-100/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                    {pages.map((page, idx) => {
                        const pageNum = idx + 1;
                        const state = pageStates.find(p => p.pageNumber === pageNum);
                        
                        // Nếu trang đã bị xóa trong state, không render (hoặc có thể render placeholder)
                        if (state?.isDeleted) return null;

                        return (
                            <PageCard 
                                key={idx} 
                                page={page} 
                                pageNumber={pageNum} 
                                isSelected={selectedPages.has(pageNum)} 
                                onSelect={() => onPageSelect(pageNum)}
                                rotation={state?.rotation || 0}
                                onRotateLeft={(e) => { e.stopPropagation(); onRotatePage(pageNum, 'left'); }}
                                onRotateRight={(e) => { e.stopPropagation(); onRotatePage(pageNum, 'right'); }}
                                onDelete={(e) => { e.stopPropagation(); onDeletePage(pageNum); }}
                                onZoom={(e) => { e.stopPropagation(); alert(`Zoom preview for page ${pageNum} coming soon!`); }}
                                enableControls={enableVisualEdit}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

interface PageCardProps {
    page: any;
    pageNumber: number;
    isSelected: boolean;
    rotation: number;
    enableControls: boolean;
    onSelect: () => void;
    onRotateLeft: (e: React.MouseEvent) => void;
    onRotateRight: (e: React.MouseEvent) => void;
    onDelete: (e: React.MouseEvent) => void;
    onZoom: (e: React.MouseEvent) => void;
}

const PageCard: React.FC<PageCardProps> = ({ 
    page, pageNumber, isSelected, rotation, enableControls,
    onSelect, onRotateLeft, onRotateRight, onDelete, onZoom
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (!canvasRef.current) return;
        
        let isRendered = false;
        const render = async () => {
            const vp = page.getViewport({ scale: 0.5 });
            const canvas = canvasRef.current;
            if(!canvas) return;

            const ctx = canvas.getContext('2d');
            canvas.width = vp.width;
            canvas.height = vp.height;
            
            if (ctx) {
                try {
                    await page.render({ canvasContext: ctx, viewport: vp }).promise;
                    isRendered = true;
                } catch(e) { 
                    // Render cancelled
                }
            }
        };
        render();
        return () => { isRendered = false; }
    }, [page]);

    return (
        <div 
            onClick={onSelect} 
            className={`
                group relative flex flex-col items-center
                transition-all duration-300 ease-in-out
                ${isSelected ? 'scale-105 z-10' : 'hover:scale-[1.02] hover:z-10'}
            `}
        >
            {/* Page Number Badge (Top) */}
            <div className="mb-2 text-xs font-semibold text-gray-500 bg-white px-2 py-0.5 rounded-full shadow-sm border border-gray-200">
                Trang {pageNumber}
            </div>

            {/* Container chứa Canvas - Nơi áp dụng transform rotate */}
            <div 
                ref={containerRef}
                className={`
                    relative bg-white shadow-md rounded-lg overflow-hidden border-2 transition-all duration-300
                    ${isSelected ? 'border-brand-500 ring-2 ring-brand-200' : 'border-transparent hover:border-gray-300'}
                `}
                style={{
                    // Logic Phản hồi tức thì: Xoay bằng CSS
                    transform: `rotate(${rotation}deg)`,
                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
                }}
            >
                <canvas ref={canvasRef} className="block w-full h-auto" />
                
                {/* Selection Overlay */}
                <div className={`absolute inset-0 bg-brand-500/10 transition-opacity duration-200 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
            </div>

            {/* Controls Overlay (Nổi lên khi hover hoặc nếu đang ở chế độ chỉnh sửa) */}
            {enableControls && (
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 translate-y-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-20 flex items-center gap-1 bg-white shadow-lg border border-gray-100 rounded-full p-1.5">
                    <button onClick={onRotateLeft} className="p-1.5 text-gray-600 hover:text-brand-600 hover:bg-brand-50 rounded-full transition" title="Xoay trái">
                        <Icon type="rotate-left" className="w-4 h-4" />
                    </button>
                    <button onClick={onRotateRight} className="p-1.5 text-gray-600 hover:text-brand-600 hover:bg-brand-50 rounded-full transition" title="Xoay phải">
                        <Icon type="rotate-right" className="w-4 h-4" />
                    </button>
                    <div className="w-px h-3 bg-gray-200 mx-0.5" />
                    <button onClick={onZoom} className="p-1.5 text-gray-600 hover:text-brand-600 hover:bg-brand-50 rounded-full transition" title="Xem trước">
                        <Icon type="eye" className="w-4 h-4" />
                    </button>
                    <button onClick={onDelete} className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition" title="Xóa trang">
                        <Icon type="trash" className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Checkbox chọn */}
            <div className={`absolute top-6 right-2 z-20 transition-all duration-200 ${isSelected ? 'scale-100 opacity-100' : 'scale-90 opacity-0 group-hover:opacity-100'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border shadow-sm ${isSelected ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-300 hover:border-brand-400'}`}>
                    <Icon type="check" className="w-3.5 h-3.5" />
                </div>
            </div>
        </div>
    );
};
