
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

// Legacy
export const rotatePages = async (pdfBytes: ArrayBuffer, pageNumbers: number[], angle: number): Promise<Uint8Array> => {
    return applyPageEdits(pdfBytes, []); // Stub, shouldn't be used with new logic
};

// --- CORE PROCESSING FUNCTION ---
// Handles Rotation, Deletion, AND Reordering
export const applyPageEdits = async (pdfBytes: ArrayBuffer, pageStates: PageEditState[]): Promise<Uint8Array> => {
    const { PDFDocument, degrees } = window.PDFLib;
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const newPdfDoc = await PDFDocument.create();
    
    // 1. Filter out deleted pages
    // 2. The ORDER of `activeStates` determines the order of pages in the new PDF
    const activeStates = pageStates.filter(p => !p.isDeleted);
    
    // Map states to original 0-based indices for copying
    const indicesToCopy = activeStates.map(p => p.originalPageNumber - 1);
    
    if (indicesToCopy.length === 0) {
        throw new Error("Tất cả các trang đã bị xóa.");
    }

    // Copy pages. Note: copyPages can take an array of indices, potentially with duplicates or reordered.
    // However, to apply specific rotations to specific instances (if a page was duplicated), we need to be careful.
    // But here, we assume 1:1 mapping from UI state to Output.
    
    // We copy pages one by one to ensure we match the specific rotation state to the specific page copy
    // Optimization: Bulk copy might be faster but harder to map rotations if reordered arbitrarily.
    // Let's stick to bulk copy of indices then apply modifications.
    
    const copiedPages = await newPdfDoc.copyPages(pdfDoc, indicesToCopy);

    // Add pages to new doc and apply rotation
    copiedPages.forEach((page: any, idx: number) => {
        const state = activeStates[idx];
        const currentRotation = page.getRotation().angle;
        // Add cumulative rotation
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
    try {
        image = await pdfDoc.embedPng(imageBytes);
    } catch {
        image = await pdfDoc.embedJpg(imageBytes);
    }

    const { width, height } = image.scale(0.5);
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
    return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
};
