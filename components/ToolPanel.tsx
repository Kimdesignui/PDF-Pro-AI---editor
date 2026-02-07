import React, { useRef, useState } from 'react';
import type { Tool } from '../types';
import { LANGUAGES } from '../constants';
import { SignaturePad, SignaturePadRef } from './SignaturePad';
import { fileToArrayBuffer } from '../utils';
import { Icon } from './Icon';

interface ToolPanelProps {
    tool: Tool;
    onApply: (options: any) => void;
    onCancel: () => void;
    isProcessing: boolean;
}

export const ToolPanel: React.FC<ToolPanelProps> = ({ tool, onApply, onCancel, isProcessing }) => {
    const [options, setOptions] = useState<any>({});
    const sigRef = useRef<SignaturePadRef>(null);

    const handleApply = () => {
        if (tool.id === 'signature') {
            const sig = sigRef.current?.getSignature();
            if (sig) {
                // Convert dataURL to blob/buffer inside the main logic, passing dataURL for now or handle here
                fetch(sig).then(r => r.arrayBuffer()).then(b => onApply({ ...options, signatureBytes: b }));
            }
        } else if (tool.id === 'insert-image') {
            if (!options.imageFile) return alert('Vui lòng chọn ảnh');
            fileToArrayBuffer(options.imageFile).then(b => onApply({ ...options, imageBytes: b }));
        } else {
            onApply(options);
        }
    };

    return (
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col shadow-xl z-20">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <span className={`text-${tool.color}-600`}>{React.cloneElement(tool.icon, { className: 'w-5 h-5' })}</span>
                    {tool.name}
                </h3>
                <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
                <p className="text-sm text-gray-500">{tool.description}</p>
                
                {tool.id === 'rotate' && (
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700">Góc xoay</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[90, 180, 270].map(deg => (
                                <button key={deg} 
                                    onClick={() => setOptions({ ...options, angle: deg })}
                                    className={`py-2 text-sm rounded border ${options.angle === deg ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                                >
                                    {deg}°
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {tool.id === 'split' && (
                    <div className="space-y-4">
                        {tool.subTools?.map(sub => (
                             <div key={sub.id} 
                                onClick={() => setOptions({ ...options, mode: sub.id })}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${options.mode === sub.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                             >
                                <div className="font-medium text-sm text-gray-900">{sub.name}</div>
                                <div className="text-xs text-gray-500 mt-1">{sub.description}</div>
                             </div>
                        ))}
                        {options.mode === 'split-range' && (
                            <input type="text" placeholder="Ví dụ: 1-3, 5, 8-10" 
                                onChange={e => setOptions({ ...options, ranges: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                            />
                        )}
                    </div>
                )}

                {tool.id === 'password' && (
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Mật khẩu</label>
                        <input type="password" 
                            onChange={e => setOptions({ ...options, password: e.target.value })}
                            className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                        />
                    </div>
                )}

                {tool.id === 'signature' && (
                    <div>
                         <label className="text-sm font-medium text-gray-700 mb-2 block">Vẽ chữ ký của bạn</label>
                         <SignaturePad ref={sigRef} />
                         <button onClick={() => sigRef.current?.clear()} className="text-xs text-red-500 mt-2 hover:underline">Xóa chữ ký</button>
                    </div>
                )}

                {tool.id === 'insert-image' && (
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Chọn hình ảnh</label>
                        <input type="file" accept="image/*"
                            onChange={e => e.target.files && setOptions({ ...options, imageFile: e.target.files[0] })}
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                    </div>
                )}

                {tool.id === 'ocr' && (
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Ngôn ngữ tài liệu</label>
                        <select onChange={e => setOptions({ ...options, lang: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                        </select>
                    </div>
                )}

                {tool.id === 'tts' && (
                    <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-800">
                        Tính năng này sẽ đọc nội dung văn bản trong PDF của bạn. Hãy đảm bảo tài liệu rõ nét.
                    </div>
                )}
            </div>

            <div className="p-5 border-t border-gray-200 bg-gray-50">
                <button 
                    onClick={handleApply} 
                    disabled={isProcessing}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 px-4 rounded-lg shadow transition-all transform active:scale-95 flex items-center justify-center gap-2"
                >
                    {isProcessing ? 'Đang xử lý...' : 'Áp Dụng'}
                    {!isProcessing && <Icon type="check" className="w-4 h-4" />}
                </button>
            </div>
        </div>
    );
};