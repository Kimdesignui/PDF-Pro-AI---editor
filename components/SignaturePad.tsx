
import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

export interface SignaturePadRef {
    clear: () => void;
    getSignature: () => string | null;
}

export const SignaturePad = forwardRef<SignaturePadRef, {}>((props, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        const getPos = (e: MouseEvent | TouchEvent) => {
            const rect = canvas.getBoundingClientRect();
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
            return { x: clientX - rect.left, y: clientY - rect.top };
        };

        const start = (e: any) => {
            e.preventDefault();
            isDrawing.current = true;
            const pos = getPos(e);
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
        };
        const move = (e: any) => {
            e.preventDefault();
            if (!isDrawing.current) return;
            const pos = getPos(e);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        };
        const end = (e: any) => {
             e.preventDefault();
            isDrawing.current = false;
        };

        canvas.addEventListener('mousedown', start);
        canvas.addEventListener('mousemove', move);
        canvas.addEventListener('mouseup', end);
        canvas.addEventListener('touchstart', start, { passive: false });
        canvas.addEventListener('touchmove', move, { passive: false });
        canvas.addEventListener('touchend', end, { passive: false });

        return () => {
            canvas.removeEventListener('mousedown', start);
            canvas.removeEventListener('mousemove', move);
            canvas.removeEventListener('mouseup', end);
            canvas.removeEventListener('touchstart', start);
            canvas.removeEventListener('touchmove', move);
            canvas.removeEventListener('touchend', end);
        };
    }, []);

    useImperativeHandle(ref, () => ({
        clear: () => {
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, 400, 200);
        },
        getSignature: () => canvasRef.current?.toDataURL() || null
    }));

    return (
        <canvas ref={canvasRef} width={400} height={200} className="w-full h-48 bg-white border border-gray-300 rounded-lg shadow-inner cursor-crosshair touch-none" />
    );
});
