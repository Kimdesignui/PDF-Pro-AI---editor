
import type { Position, PageEditState } from '../types';
declare const window: any;

export const mergePdfs = async (pdfBytesArray: ArrayBuffer[]): Promise<Uint8Array> => {
    const { PDFDocument } = window.PDFLib;
    const mergedPdf = await PDFDocument.create();
    for (const pdfBytes of pdfBytesArray) {
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach((page: any) => mergedPdf.addPage(page));
    }
    return await mergedPdf.save();
};

// Legacy function kept for compatibility if needed, but applyPageEdits is preferred for Rotate tool
export const rotatePages = async (pdfBytes: ArrayBuffer, pageNumbers: number[], angle: number): Promise<Uint8Array> => {
    const { PDFDocument, degrees } = window.PDFLib;
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    
    // If no specific pages selected, rotate all
    const targets = pageNumbers.length > 0 
        ? pageNumbers.map(n => n - 1).filter(n => n >= 0 && n < pages.length)
        : pages.map((_, i) => i);

    targets.forEach((idx: number) => {
        const page = pages[idx];
        const currentRotation = page.getRotation().angle;
        page.setRotation(degrees(currentRotation + angle));
    });
    return await pdfDoc.save();
};

// NEW: Handles complex visual edits (per-page rotation + deletion)
export const applyPageEdits = async (pdfBytes: ArrayBuffer, pageStates: PageEditState[]): Promise<Uint8Array> => {
    const { PDFDocument, degrees } = window.PDFLib;
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const newPdfDoc = await PDFDocument.create();
    const sourcePages = pdfDoc.getPages();

    // Copy pages one by one to respect order and deletion status
    // Note: copyPages allows copying the same page multiple times or skipping
    
    // Filter out deleted pages
    const activeStates = pageStates.filter(p => !p.isDeleted);
    
    // Get indices to copy (0-based)
    const indicesToCopy = activeStates.map(p => p.pageNumber - 1);
    
    if (indicesToCopy.length === 0) {
        throw new Error("Tất cả các trang đã bị xóa. Không thể tạo file PDF rỗng.");
    }

    const copiedPages = await newPdfDoc.copyPages(pdfDoc, indicesToCopy);

    // Apply rotation to the copied pages
    copiedPages.forEach((page: any, idx: number) => {
        const state = activeStates[idx];
        const currentRotation = page.getRotation().angle;
        // Add the visual rotation to the existing rotation
        page.setRotation(degrees(currentRotation + state.rotation));
        newPdfDoc.addPage(page);
    });

    return await newPdfDoc.save();
};

export const splitPdfByPages = async (pdfBytes: ArrayBuffer, pageNumbers: number[]): Promise<Uint8Array> => {
    const { PDFDocument } = window.PDFLib;
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const newPdfDoc = await PDFDocument.create();
    const indices = pageNumbers.map(n => n - 1).filter(n => n >= 0 && n < pdfDoc.getPageCount());
    const copiedPages = await newPdfDoc.copyPages(pdfDoc, indices);
    copiedPages.forEach((page: any) => newPdfDoc.addPage(page));
    return await newPdfDoc.save();
};

export const setPassword = async (pdfBytes: ArrayBuffer, password: string): Promise<Uint8Array> => {
    const { PDFDocument } = window.PDFLib;
    const pdfDoc = await PDFDocument.load(pdfBytes);
    // pdf-lib standard encryption
    return await pdfDoc.save({ userPassword: password, ownerPassword: password });
};

export const addSignature = async (pdfBytes: ArrayBuffer, pageNumber: number, signatureBytes: ArrayBuffer): Promise<Uint8Array> => {
    const { PDFDocument } = window.PDFLib;
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pageIndex = pageNumber - 1;
    if (pageIndex < 0 || pageIndex >= pdfDoc.getPageCount()) return new Uint8Array(pdfBytes);

    const page = pdfDoc.getPage(pageIndex);
    const signatureImage = await pdfDoc.embedPng(signatureBytes);
    const { width, height } = signatureImage.scale(0.5);
    
    page.drawImage(signatureImage, {
        x: page.getWidth() / 2 - width / 2,
        y: page.getHeight() / 2 - height / 2,
        width,
        height,
    });
    return await pdfDoc.save();
};

export const addImage = async (pdfBytes: ArrayBuffer, pageNumber: number, imageBytes: ArrayBuffer): Promise<Uint8Array> => {
    const { PDFDocument } = window.PDFLib;
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const page = pdfDoc.getPage(pageNumber - 1);
    
    let image;
    // Simple MIME check by try/catch or header could be better, but assuming valid input for now
    try {
        image = await pdfDoc.embedPng(imageBytes);
    } catch {
        image = await pdfDoc.embedJpg(imageBytes);
    }

    const { width, height } = image.scale(0.5);
    // Center image
    page.drawImage(image, {
        x: (page.getWidth() - width) / 2,
        y: (page.getHeight() - height) / 2,
        width,
        height
    });
    return await pdfDoc.save();
};

export const getPageAsImage = async (pdfDoc: any, pageNumber: number): Promise<string> => {
    const page = await pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error("Canvas context missing");
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    await page.render({ canvasContext: context, viewport }).promise;
    return canvas.toDataURL('image/jpeg', 0.8).split(',')[1]; // Return base64 body
};
