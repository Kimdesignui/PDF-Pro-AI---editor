
import React, { useCallback, useState, useId } from 'react';
import { Icon } from './Icon';

interface FileUploadProps {
    onFileChange: (files: File[]) => void;
    multiple?: boolean;
    compact?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileChange, multiple = false, compact = false }) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const uniqueId = useId();

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const pdfFiles = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
            if (pdfFiles.length > 0) onFileChange(pdfFiles);
            else alert("Vui lòng chỉ thả tệp PDF.");
        }
    }, [onFileChange]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFileChange(Array.from(e.target.files));
            // Reset value so same file can be selected again if needed (though usually component unmounts or state changes)
            e.target.value = '';
        }
    };

    if (compact) {
        return (
            <div className="relative">
                <input type="file" onChange={handleChange} accept="application/pdf" multiple={multiple} className="hidden" id={uniqueId} />
                <label htmlFor={uniqueId} className="cursor-pointer inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 select-none">
                    <Icon type="upload" className="w-5 h-5 mr-2 text-gray-400" />
                    Thêm PDF
                </label>
            </div>
        );
    }

    return (
        <div 
            onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl transition-all duration-200 ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-gray-400'}`}
        >
            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4 pointer-events-none">
                <div className={`p-4 rounded-full mb-4 ${isDragOver ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                    <Icon type="upload" className="w-8 h-8" />
                </div>
                <p className="mb-2 text-lg font-semibold text-gray-700">Nhấn để tải lên hoặc kéo thả vào đây</p>
                <p className="text-sm text-gray-500">Hỗ trợ PDF, tối đa 100MB.</p>
            </div>
            <input 
                type="file" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                onChange={handleChange} 
                accept="application/pdf" 
                multiple={multiple} 
                title="" 
            />
        </div>
    );
};
