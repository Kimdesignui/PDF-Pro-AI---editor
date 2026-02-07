
import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './Icon';

interface PdfViewerProps {
    pdfDoc: any;
    selectedPages: Set<number>;
    onPageSelect: (pageNumber: number) => void;
    toggleSelectAll: () => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ pdfDoc, selectedPages, onPageSelect, toggleSelectAll }) => {
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
            <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200 px-6 py-3 flex justify-between items-center shadow-sm">
                <span className="font-semibold text-gray-700">{pages.length} Trang</span>
                <button onClick={toggleSelectAll} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                    {selectedPages.size === pages.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {pages.map((page, idx) => (
                        <PageThumbnail 
                            key={idx} 
                            page={page} 
                            pageNumber={idx + 1} 
                            isSelected={selectedPages.has(idx + 1)} 
                            onSelect={() => onPageSelect(idx + 1)} 
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

const PageThumbnail: React.FC<{ page: any, pageNumber: number, isSelected: boolean, onSelect: () => void }> = ({ page, pageNumber, isSelected, onSelect }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    useEffect(() => {
        if (!canvasRef.current) return;
        const vp = page.getViewport({ scale: 0.5 });
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = vp.width;
        canvas.height = vp.height;
        if (ctx) page.render({ canvasContext: ctx, viewport: vp });
    }, [page]);

    return (
        <div onClick={onSelect} className={`relative group cursor-pointer transition-all duration-200 transform hover:-translate-y-1 ${isSelected ? 'ring-2 ring-blue-500 shadow-lg scale-105' : 'hover:shadow-md'}`}>
            <canvas ref={canvasRef} className="w-full h-auto rounded-lg bg-white shadow-sm" />
            <div className={`absolute inset-0 rounded-lg transition-colors ${isSelected ? 'bg-blue-500/10' : 'group-hover:bg-black/5'}`} />
            <div className="absolute top-2 right-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-gray-300 text-transparent group-hover:border-gray-400'}`}>
                    <Icon type="check" className="w-4 h-4" />
                </div>
            </div>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                Trang {pageNumber}
            </div>
        </div>
    );
};
