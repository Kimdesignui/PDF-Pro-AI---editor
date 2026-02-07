
import React from 'react';
import type { Tool } from './types';
import { Icon } from './components/Icon';

export const TOOLS: Tool[] = [
  {
    id: 'rotate',
    name: 'Xoay PDF',
    icon: <Icon type="rotate" />,
    description: 'Xoay các trang PDF của bạn theo góc mong muốn.',
    color: 'amber',
  },
  {
    id: 'merge',
    name: 'Ghép PDF',
    icon: <Icon type="merge" />,
    description: 'Kết hợp nhiều tệp PDF thành một tài liệu duy nhất.',
    color: 'blue',
  },
  {
    id: 'split',
    name: 'Tách PDF',
    icon: <Icon type="split" />,
    description: 'Tách tệp PDF thành các trang riêng lẻ hoặc khoảng.',
    color: 'violet',
    subTools: [
        { id: 'split-selected', name: 'Trang đã chọn', description: 'Chỉ trích xuất các trang bạn chọn.' },
        { id: 'split-range', name: 'Theo khoảng', description: 'Ví dụ: 1-5, 8, 11-13.' },
    ]
  },
  {
    id: 'compress',
    name: 'Nén PDF',
    icon: <Icon type="compress" />,
    description: 'Giảm kích thước tệp PDF (Demo).',
    color: 'green',
  },
  {
    id: 'password',
    name: 'Bảo Mật',
    icon: <Icon type="password" />,
    description: 'Thêm mật khẩu bảo vệ cho tệp PDF.',
    color: 'slate',
  },
  {
    id: 'signature',
    name: 'Ký Tên',
    icon: <Icon type="signature" />,
    description: 'Thêm chữ ký tay vào tài liệu.',
    color: 'rose',
  },
  {
    id: 'insert-image',
    name: 'Chèn Ảnh',
    icon: <Icon type="insert-image" />,
    description: 'Chèn hình ảnh vào vị trí bất kỳ.',
    color: 'indigo',
  },
  {
    id: 'ocr',
    name: 'OCR (AI)',
    icon: <Icon type="ocr" />,
    description: 'Chuyển đổi hình ảnh thành văn bản có thể chỉnh sửa.',
    color: 'emerald',
  },
  {
    id: 'tts',
    name: 'Đọc PDF (AI)',
    icon: <Icon type="tts" />,
    description: 'Chuyển đổi văn bản thành giọng nói tự nhiên.',
    color: 'cyan',
  },
];

export const LANGUAGES = [
    { code: 'Vietnamese', name: 'Tiếng Việt' },
    { code: 'English', name: 'English' },
    { code: 'Japanese', name: 'Japanese' },
    { code: 'Korean', name: 'Korean' },
    { code: 'Chinese', name: 'Chinese' },
    { code: 'French', name: 'French' },
];
