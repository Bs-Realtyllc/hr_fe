'use client';

import { useEffect, useRef } from 'react';

type Piece = {
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
    vx: number;
    vy: number;
    rot: number;
    vrot: number;
    flip: number;
    vflip: number;
};

type ConfettiProps = {
    /** How long new ribbons keep falling (ms). After this, the rest fall off screen. */
    duration?: number;
    /** Number of pieces on screen at once. */
    count?: number;
    colors?: string[];
};

const DEFAULT_COLORS = ['#0B5CFF', '#38BDF8', '#22C55E', '#EF4444', '#FACC15', '#F472B6'];

function createPiece(width: number, height: number, colors: string[], spreadAbove: boolean): Piece {
    const isRibbon = Math.random() < 0.55; // long thin strips vs. small squares
    return {
        x: Math.random() * width,
        y: spreadAbove ? -Math.random() * height : -20 - Math.random() * 60,
        w: isRibbon ? 3 + Math.random() * 2 : 8 + Math.random() * 6,
        h: isRibbon ? 14 + Math.random() * 10 : 8 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 0.6,
        vy: 1.5 + Math.random() * 2,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.08,
        flip: Math.random() * Math.PI * 2,
        vflip: 0.03 + Math.random() * 0.07,
    };
}

export default function ConfettiAnimation({ duration = 4000, count = 150, colors = DEFAULT_COLORS }: ConfettiProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        // Respect users who turned off animations in their OS settings
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        let width = 0;
        let height = 0;

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        window.addEventListener('resize', resize);

        let pieces = Array.from({ length: count }, () => createPiece(width, height, colors, true));
        const start = performance.now();
        let frame = 0;

        const tick = (now: number) => {
            const stillSpawning = now - start < duration;
            ctx.clearRect(0, 0, width, height);

            pieces = pieces.flatMap((p) => {
                p.flip += p.vflip;
                p.rot += p.vrot;
                p.y += p.vy;
                p.x += p.vx + Math.sin(p.flip) * 0.6; // gentle side-to-side sway

                if (p.y - p.h > height) {
                    // Recycle to the top while the effect is running, otherwise drop it
                    return stillSpawning ? [createPiece(width, height, colors, false)] : [];
                }

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.scale(1, Math.cos(p.flip)); // fakes the 3D "flipping paper" look
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();
                return [p];
            });

            if (pieces.length > 0) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('resize', resize);
        };
    }, [duration, count, colors]);

    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50 }}
        />
    );
}