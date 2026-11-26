import * as pdfjsLib from 'pdfjs-dist';

// Initialize worker in browser environment
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  } catch {
    // Fallback if URL resolution fails
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
}

export interface RenderedPlanResult {
  dataUrl: string;
  width: number;
  height: number;
  pageCount: number;
  currentPage: number;
}

/**
 * Cached PDF document instances to allow fast, non-transferring page switching
 */
const pdfDocCache = new Map<string, any>();

export function clearPdfDocCache(key?: string) {
  if (key) {
    const doc = pdfDocCache.get(key);
    if (doc) {
      try {
        doc.destroy?.();
      } catch {
        // ignore
      }
      pdfDocCache.delete(key);
    }
  } else {
    pdfDocCache.forEach(doc => {
      try {
        doc.destroy?.();
      } catch {
        // ignore
      }
    });
    pdfDocCache.clear();
  }
}

/**
 * Check if an ArrayBuffer has been detached by a Web Worker transfer
 */
export function isBufferDetached(buffer: ArrayBuffer): boolean {
  if (!buffer) return true;
  if ((buffer as any).detached === true) return true;
  if (buffer.byteLength === 0) return true;
  try {
    // Attempting to construct a 0-length Uint8Array on a detached ArrayBuffer throws TypeError
    new Uint8Array(buffer, 0, 0);
    return false;
  } catch {
    return true;
  }
}

/**
 * Render a specific page of a PDF file to a high-resolution data URL.
 * Safely clones buffers to prevent PDF.js Web Worker transfers from detaching original buffers.
 */
export async function renderPdfPage(
  fileOrBuffer: File | Blob | ArrayBuffer | Uint8Array,
  pageNum: number = 1,
  targetWidth: number = 1200,
  cacheKey?: string
): Promise<RenderedPlanResult> {
  let pdf: any = null;

  // 1. Try to retrieve existing loaded document from cache to avoid re-parsing
  if (cacheKey && pdfDocCache.has(cacheKey)) {
    try {
      pdf = pdfDocCache.get(cacheKey);
      // Verify document is still valid
      if (!pdf || pdf.destroyed) {
        pdfDocCache.delete(cacheKey);
        pdf = null;
      }
    } catch {
      pdfDocCache.delete(cacheKey);
      pdf = null;
    }
  }

  // 2. If not cached, load and parse document safely
  if (!pdf) {
    let safeBufferCopy: ArrayBuffer;

    if (fileOrBuffer instanceof File || fileOrBuffer instanceof Blob) {
      const freshBuffer = await fileOrBuffer.arrayBuffer();
      safeBufferCopy = freshBuffer.slice(0);
    } else if (fileOrBuffer instanceof ArrayBuffer) {
      if (isBufferDetached(fileOrBuffer)) {
        throw new Error('PDF document buffer is detached or invalid. Please re-upload the plan.');
      }
      // Crucial: Always slice(0) so PDF.js worker transferable transfer never detaches the caller's buffer!
      safeBufferCopy = fileOrBuffer.slice(0);
    } else if (ArrayBuffer.isView(fileOrBuffer)) {
      const view = fileOrBuffer as Uint8Array;
      if (isBufferDetached(view.buffer)) {
        throw new Error('PDF document buffer is detached or invalid. Please re-upload the plan.');
      }
      safeBufferCopy = view.slice().buffer;
    } else {
      throw new Error('Unsupported PDF data format.');
    }

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(safeBufferCopy),
      cMapUrl: 'https://unpkg.com/pdfjs-dist@4.10.38/cmaps/',
      cMapPacked: true
    });

    pdf = await loadingTask.promise;

    if (cacheKey) {
      pdfDocCache.set(cacheKey, pdf);
    }
  }

  const pageCount = pdf.numPages;
  const safePageNum = Math.min(Math.max(1, pageNum), pageCount);
  const page = await pdf.getPage(safePageNum);

  // Determine scale for crisp rendering
  const unscaledViewport = page.getViewport({ scale: 1.0 });
  const scale = targetWidth / unscaledViewport.width;
  const viewport = page.getViewport({ scale: Math.max(scale, 1.5) });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D context unavailable');
  }

  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);

  // Fill crisp white blueprint/drawing background
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const renderContext = {
    canvasContext: context,
    viewport: viewport
  };

  await page.render(renderContext as any).promise;
  const dataUrl = canvas.toDataURL('image/png', 0.95);

  return {
    dataUrl,
    width: canvas.width,
    height: canvas.height,
    pageCount,
    currentPage: safePageNum
  };
}

/**
 * Load an image file (PNG, JPG, SVG, WebP) to a data URL with measured dimensions
 */
export async function renderImageFile(file: File): Promise<RenderedPlanResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        resolve({
          dataUrl,
          width: img.naturalWidth || 1100,
          height: img.naturalHeight || 750,
          pageCount: 1,
          currentPage: 1
        });
      };
      img.onerror = () => {
        reject(new Error('Failed to load image contents'));
      };
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Process any uploaded file (PDF or image) and return a rendered plan
 */
export async function processUploadedPlanFile(
  file: File,
  pageNum: number = 1,
  cacheKey?: string
): Promise<RenderedPlanResult> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (isPdf) {
    return await renderPdfPage(file, pageNum, 1200, cacheKey);
  } else {
    return await renderImageFile(file);
  }
}
