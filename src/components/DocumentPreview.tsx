"use client";

import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

// For compatible Next.js bundlers:
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
).toString();

// If the worker URL above fails in your Next.js setup, use this instead:
// pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

type DocumentPreviewProps = {
    file: File;
};

/* ---------------- PDF Preview ---------------- */

const PdfPreview = ({ file }: DocumentPreviewProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        let loadingTask: ReturnType<typeof pdfjsLib.getDocument> | undefined;

        const renderPdf = async () => {
            setLoading(true);
            setError(false);

            try {
                const data = await file.arrayBuffer();

                if (cancelled) return;

                loadingTask = pdfjsLib.getDocument({ data });

                const pdf = await loadingTask.promise;

                if (cancelled) return;

                // Render only the first page.
                const page = await pdf.getPage(1);

                if (cancelled) return;

                const canvas = canvasRef.current;
                const container = containerRef.current;
                const context = canvas?.getContext("2d");

                if (!canvas || !container || !context) {
                    throw new Error("PDF preview canvas is unavailable.");
                }

                const baseViewport = page.getViewport({ scale: 1 });

                const availableWidth = container.clientWidth || 300;
                const availableHeight = container.clientHeight || 180;

                // Fit the complete first page inside the preview.
                const scale = Math.min(
                    availableWidth / baseViewport.width,
                    availableHeight / baseViewport.height,
                );

                const viewport = page.getViewport({ scale });
                const pixelRatio = window.devicePixelRatio || 1;

                canvas.width = Math.floor(
                    viewport.width * pixelRatio,
                );

                canvas.height = Math.floor(
                    viewport.height * pixelRatio,
                );

                canvas.style.width = `${viewport.width}px`;
                canvas.style.height = `${viewport.height}px`;

                context.setTransform(
                    pixelRatio,
                    0,
                    0,
                    pixelRatio,
                    0,
                    0,
                );

                const renderTask = page.render({
                    canvas,
                    canvasContext: context,
                    viewport,
                });

                await renderTask.promise;

                if (!cancelled) {
                    setLoading(false);
                }
            } catch (err) {
                if (!cancelled) {
                    console.error("PDF preview failed:", err);
                    setError(true);
                    setLoading(false);
                }
            }
        };

        void renderPdf();

        return () => {
            cancelled = true;
            void loadingTask?.destroy();
        };
    }, [file]);

    return (
        <div
            ref={containerRef}
            className="relative flex h-full w-full items-center justify-center overflow-hidden bg-white"
        >
            {loading && (
                <p className="absolute z-10 text-sm text-gray-500">
                    Loading PDF preview...
                </p>
            )}

            {error ? (
                <p className="text-sm text-gray-500">
                    PDF preview unavailable.
                </p>
            ) : (
                <canvas
                    ref={canvasRef}
                    className="block max-h-full max-w-full"
                />
            )}
        </div>
    );
};

/* ---------------- DOCX and PDF Dispatcher ---------------- */

const DocumentPreview = ({ file }: DocumentPreviewProps) => {
    const [html, setHtml] = useState("");
    const [loading, setLoading] = useState(false);
    const [docxError, setDocxError] = useState(false);

    const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");

    useEffect(() => {
        if (isPdf) {
            setHtml("");
            setLoading(false);
            return;
        }

        let cancelled = false;

        const loadDocx = async () => {
            setLoading(true);
            setHtml("");
            setDocxError(false);

            try {
                const mammoth = await import("mammoth");
                const arrayBuffer = await file.arrayBuffer();

                const result = await mammoth.convertToHtml({
                    arrayBuffer,
                });

                if (!cancelled) {
                    setHtml(result.value);
                }
            } catch (err) {
                console.error("DOCX preview failed:", err);

                if (!cancelled) {
                    setHtml("");
                    setDocxError(true);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void loadDocx();

        return () => {
            cancelled = true;
        };
    }, [file, isPdf]);

    if (isPdf) {
        return <PdfPreview file={file} />;
    }

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center text-sm">
                Loading document preview...
            </div>
        );
    }

    if (!html || docxError) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2 overflow-hidden">
                <p className="text-sm">Preview unavailable</p>
                <p className="text-xs">
                    You can still replace or download the file.
                </p>
            </div>
        );
    }

    return (
        <div
            className="h-full w-full overflow-hidden p-4 text-sm text-gray-800
                [&_p]:mb-3 [&_h1]:mb-3 [&_h1]:text-xl
                [&_h2]:mb-2 [&_h2]:text-lg [&_ul]:list-disc
                [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
};

export default DocumentPreview;
