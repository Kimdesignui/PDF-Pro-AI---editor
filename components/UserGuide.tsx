
import React from 'react';
import { Icon } from './Icon';

interface UserGuideProps {
    onGoHome: () => void;
}

export const UserGuide: React.FC<UserGuideProps> = ({ onGoHome }) => {
    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans">
            {/* Header */}
            <header className="fixed w-full z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={onGoHome}>
                        <div className="bg-brand-600 text-white p-1.5 rounded-lg shadow-sm">
                            <Icon type="logo" className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-xl tracking-tight">PDF Pro</span>
                    </div>
                    <button onClick={onGoHome} className="text-gray-600 hover:text-brand-600 font-medium flex items-center gap-2 transition-colors">
                        <Icon type="arrow-left" className="w-4 h-4" />
                        Quay lại trang chủ
                    </button>
                </div>
            </header>

            <main className="pt-28 pb-20 max-w-4xl mx-auto px-6">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6">Hướng dẫn sử dụng</h1>
                    <p className="text-xl text-gray-500">Làm chủ công cụ PDF Pro chỉ trong vài bước đơn giản.</p>
                </div>

                <div className="space-y-16">
                    {/* Section 1: Basic Workflow */}
                    <section>
                        <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
                            <span className="bg-brand-100 text-brand-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
                            Quy trình cơ bản
                        </h2>
                        <div className="grid md:grid-cols-3 gap-8">
                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 text-brand-600">
                                    <Icon type="upload" className="w-6 h-6" />
                                </div>
                                <h3 className="font-bold text-lg mb-2">1. Chọn công cụ & Tải file</h3>
                                <p className="text-gray-600 text-sm">Chọn tính năng bạn cần (như Xoay, Ghép, Nén) từ trang chủ, sau đó tải file PDF của bạn lên.</p>
                            </div>
                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 text-brand-600">
                                    <Icon type="edit" className="w-6 h-6" />
                                </div>
                                <h3 className="font-bold text-lg mb-2">2. Chỉnh sửa</h3>
                                <p className="text-gray-600 text-sm">Sử dụng thanh công cụ bên trái để thao tác: xoay trang, xóa trang thừa, hoặc sắp xếp lại vị trí.</p>
                            </div>
                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 text-brand-600">
                                    <Icon type="download" className="w-6 h-6" />
                                </div>
                                <h3 className="font-bold text-lg mb-2">3. Xuất file</h3>
                                <p className="text-gray-600 text-sm">Nhấn nút "Hoàn thành" để hệ thống xử lý. Sau đó bạn có thể tải file về hoặc tiếp tục chỉnh sửa.</p>
                            </div>
                        </div>
                    </section>

                    {/* Section 2: AI Features */}
                    <section>
                         <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
                            <span className="bg-purple-100 text-purple-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
                            Tính năng AI nâng cao
                        </h2>
                        <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded-3xl p-8 shadow-sm">
                            <div className="grid md:grid-cols-2 gap-8 items-center">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-4">OCR & Đọc PDF</h3>
                                    <ul className="space-y-4">
                                        <li className="flex gap-3">
                                            <Icon type="ocr" className="w-6 h-6 text-purple-600 shrink-0" />
                                            <div>
                                                <span className="font-semibold block text-gray-900">Trích xuất văn bản (OCR)</span>
                                                <p className="text-sm text-gray-600">Chuyển đổi hình ảnh hoặc file PDF scan thành văn bản có thể copy được.</p>
                                            </div>
                                        </li>
                                        <li className="flex gap-3">
                                            <Icon type="tts" className="w-6 h-6 text-purple-600 shrink-0" />
                                            <div>
                                                <span className="font-semibold block text-gray-900">Đọc văn bản (Text-to-Speech)</span>
                                                <p className="text-sm text-gray-600">Nghe nội dung file PDF của bạn với giọng đọc AI tự nhiên.</p>
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-inner border border-purple-100">
                                    <p className="text-sm text-gray-500 italic mb-2">Lưu ý:</p>
                                    <p className="text-gray-700">Các tính năng AI yêu cầu sử dụng <strong>Google AI Studio API Key</strong>. Đây là dịch vụ miễn phí, bạn có thể lấy key và nhập vào ứng dụng để mở khóa sức mạnh xử lý thông minh.</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Section 3: FAQ */}
                     <section>
                        <h2 className="text-2xl font-bold mb-8">Câu hỏi thường gặp</h2>
                        <div className="space-y-4">
                            <details className="group bg-white border border-gray-200 rounded-xl overflow-hidden cursor-pointer">
                                <summary className="flex items-center justify-between p-5 font-medium text-gray-900 hover:bg-gray-50 transition-colors">
                                    File của tôi có được bảo mật không?
                                    <span className="transform group-open:rotate-180 transition-transform"><Icon type="arrow-left" className="w-4 h-4 -rotate-90"/></span>
                                </summary>
                                <div className="px-5 pb-5 text-gray-600 leading-relaxed">
                                    Tuyệt đối an toàn. Mọi thao tác xử lý file (Nén, Xoay, Ghép...) đều diễn ra trực tiếp trên trình duyệt của bạn (Client-side). File không bao giờ được tải lên máy chủ của chúng tôi.
                                </div>
                            </details>
                            <details className="group bg-white border border-gray-200 rounded-xl overflow-hidden cursor-pointer">
                                <summary className="flex items-center justify-between p-5 font-medium text-gray-900 hover:bg-gray-50 transition-colors">
                                    Giới hạn kích thước file là bao nhiêu?
                                    <span className="transform group-open:rotate-180 transition-transform"><Icon type="arrow-left" className="w-4 h-4 -rotate-90"/></span>
                                </summary>
                                <div className="px-5 pb-5 text-gray-600 leading-relaxed">
                                    Vì xử lý trên trình duyệt, chúng tôi khuyến nghị file dưới 100MB để đảm bảo hiệu suất tốt nhất. Các file quá lớn có thể gây chậm trình duyệt.
                                </div>
                            </details>
                             <details className="group bg-white border border-gray-200 rounded-xl overflow-hidden cursor-pointer">
                                <summary className="flex items-center justify-between p-5 font-medium text-gray-900 hover:bg-gray-50 transition-colors">
                                    Tôi có phải trả phí không?
                                    <span className="transform group-open:rotate-180 transition-transform"><Icon type="arrow-left" className="w-4 h-4 -rotate-90"/></span>
                                </summary>
                                <div className="px-5 pb-5 text-gray-600 leading-relaxed">
                                    Không. PDF Pro là một dự án cộng đồng hoàn toàn miễn phí.
                                </div>
                            </details>
                        </div>
                    </section>
                </div>

                <div className="mt-16 text-center">
                    <button onClick={onGoHome} className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg shadow-brand-500/30 transition-all transform hover:-translate-y-1">
                        Bắt đầu sử dụng ngay
                    </button>
                </div>
            </main>
        </div>
    );
};
