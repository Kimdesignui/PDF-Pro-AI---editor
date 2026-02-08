
import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './Icon';
import type { PageEditState } from '../types';

interface PdfViewerProps {
    pdfDoc: any;
    selectedPages: Set<number>;
    pageStates: PageEditState[]; // The source of truth for order and visual state
    onPageSelect: (pageNumber: number) => void;
    toggleSelectAll: () => void;
    onRotatePage: (pageNumber: number, direction: 'left' | 'right') => void;
    onDeletePage: (pageNumber: number) => void;
    onReorderPages: (newOrder: PageEditState[]) => void;
    enableVisualEdit?: boolean; 
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ 
    pdfDoc, 
    selectedPages, 
    pageStates,
    onPageSelect, 
    toggleSelectAll,
    onRotatePage,
    onDeletePage,
    onReorderPages,
    enableVisualEdit = false
}) => {
    // Map of original page index -> rendered canvas/image url
    // Since reordering changes positions, we need to look up the original page
    const [pageThumbnails, setPageThumbnails] = useState<Record<number, string>>({});
    const [draggingId, setDraggingId] = useState<string | null>(null);

    useEffect(() => {
        if (!pdfDoc) return;
        
        const renderPages = async () => {
            const thumbs: Record<number, string> = {};
            const num = pdfDoc.numPages;
            
            // Render visible pages only could be optimization, but for <50 pages simple loop is ok
            for (let i = 1; i <= num; i++) {
                try {
                    const page = await pdfDoc.getPage(i);
                    const viewport = page.getViewport({ scale: 0.4 }); // Thumbnail scale
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    
                    if (context) {
                        await page.render({ canvasContext: context, viewport }).promise;
                        thumbs[i] = canvas.toDataURL();
                    }
                } catch (e) {
                    console.error("Error rendering page " + i, e);
                }
            }
            setPageThumbnails(thumbs);
        };
        
        // Only render if we don't have them (or pdf changed)
        if (Object.keys(pageThumbnails).length === 0) {
             renderPages();
        }
    }, [pdfDoc]);

    // --- Drag & Drop Handlers ---
    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.effectAllowed = 'move';
        setDraggingId(id);
    };

    const handleDragOver = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (!draggingId || draggingId === targetId) return;

        // Perform the swap in state immediately for visual feedback
        const sourceIndex = pageStates.findIndex(p => p.id === draggingId);
        const targetIndex = pageStates.findIndex(p => p.id === targetId);

        if (sourceIndex !== -1 && targetIndex !== -1) {
            const newOrder = [...pageStates];
            const [movedItem] = newOrder.splice(sourceIndex, 1);
            newOrder.splice(targetIndex, 0, movedItem);
            onReorderPages(newOrder);
        }
    };

    const handleDragEnd = () => {
        setDraggingId(null);
    };

    return (
        <div className="flex flex-col h-full bg-gray-100/50">
            {/* Header / Toolbar for viewer */}
            <div className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
                <span className="font-bold text-gray-800 text-lg">{pageStates.filter(p => !p.isDeleted).length} Trang</span>
                
                <div className="flex items-center gap-4">
                     {enableVisualEdit && (
                         <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                            💡 Kéo thả để sắp xếp
                         </div>
                     )}
                    <button onClick={toggleSelectAll} className="text-sm font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-4 py-2 rounded-lg transition">
                        {selectedPages.size > 0 && selectedPages.size === pageStates.filter(p=>!p.isDeleted).length ? 'Bỏ chọn' : 'Chọn tất cả'}
                    </button>
                </div>
            </div>

            {/* Grid Area */}
            <div className="flex-1 overflow-y-auto p-8">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 gap-y-10">
                    {pageStates.map((state, index) => {
                        if (state.isDeleted) return null;
                        
                        // Use original page number to get the correct thumbnail
                        const thumb = pageThumbnails[state.originalPageNumber];
                        const isDragging = state.id === draggingId;

                        return (
                            <React.Fragment key={state.id}>
                                <div 
                                    className={`relative group transition-all duration-300 ${isDragging ? 'opacity-25 scale-95' : 'opacity-100'}`}
                                    draggable={enableVisualEdit}
                                    onDragStart={(e) => handleDragStart(e, state.id)}
                                    onDragOver={(e) => handleDragOver(e, state.id)}
                                    onDragEnd={handleDragEnd}
                                >
                                    {/* Page Card */}
                                    <div 
                                        onClick={() => onPageSelect(state.originalPageNumber)}
                                        className={`
                                            relative bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border-2 cursor-pointer
                                            ${selectedPages.has(state.originalPageNumber) ? 'border-brand-500 ring-2 ring-brand-100' : 'border-transparent hover:border-gray-300'}
                                        `}
                                    >
                                        {/* Image Container with Visual Rotation */}
                                        <div className="p-2 overflow-hidden rounded-lg aspect-[1/1.4] flex items-center justify-center bg-gray-50">
                                            {thumb ? (
                                                <img 
                                                    src={thumb} 
                                                    alt={`Page ${state.originalPageNumber}`} 
                                                    className="max-w-full max-h-full object-contain shadow-sm transition-transform duration-300 ease-out"
                                                    style={{ transform: `rotate(${state.rotation}deg)` }}
                                                />
                                            ) : (
                                                <div className="animate-pulse w-full h-full bg-gray-200 rounded"/>
                                            )}
                                        </div>

                                        {/* Hover Controls Overlay */}
                                        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity flex justify-center gap-3">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onRotatePage(state.originalPageNumber, 'left'); }}
                                                className="p-1.5 bg-white/90 text-gray-700 hover:text-brand-600 rounded-full shadow-sm hover:scale-110 transition"
                                                title="Xoay trái"
                                            >
                                                <Icon type="rotate-left" className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onDeletePage(state.originalPageNumber); }}
                                                className="p-1.5 bg-white/90 text-red-500 hover:text-red-600 rounded-full shadow-sm hover:scale-110 transition"
                                                title="Xóa trang"
                                            >
                                                <Icon type="trash" className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onRotatePage(state.originalPageNumber, 'right'); }}
                                                className="p-1.5 bg-white/90 text-gray-700 hover:text-brand-600 rounded-full shadow-sm hover:scale-110 transition"
                                                title="Xoay phải"
                                            >
                                                <Icon type="rotate-right" className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Page Number Badge */}
                                        <div className="absolute top-2 left-2 bg-black/60 text-white text-xs font-medium px-2 py-0.5 rounded shadow-sm backdrop-blur-sm">
                                            {state.originalPageNumber}
                                        </div>

                                        {/* Selection Checkbox */}
                                        <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 transition-all ${selectedPages.has(state.originalPageNumber) ? 'bg-brand-500 border-brand-500' : 'bg-white/80 border-gray-300'} flex items-center justify-center`}>
                                            {selectedPages.has(state.originalPageNumber) && <Icon type="check" className="w-3.5 h-3.5 text-white" />}
                                        </div>
                                    </div>

                                    {/* Visual 'Plus' button for inserting (Concept) - Only show between items if needed */}
                                    <div className="absolute top-1/2 -right-3 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                         <div className="w-6 h-6 bg-brand-500 text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition">
                                            <Icon type="plus" className="w-4 h-4" />
                                         </div>
                                    </div>
                                </div>
                            </React.Fragment>
                        );
                    })}
                    
                    {/* Add File Card (End of Grid) */}
                    <div className="border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center aspect-[1/1.4] hover:border-brand-400 hover:bg-brand-50 transition cursor-pointer group">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2 group-hover:bg-white group-hover:text-brand-600 transition">
                            <Icon type="plus" className="w-6 h-6 text-gray-400 group-hover:text-brand-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-500 group-hover:text-brand-700">Thêm trang</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
