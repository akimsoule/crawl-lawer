import { PDFDocument } from 'pdf-lib';

export interface OCRSpaceResult {
  ParsedResults?: Array<{
    ParsedText: string;
    ErrorMessage?: string;
    ErrorDetails?: string;
    FileParseExitCode: number;
  }>;
  OCRExitCode: number;
  IsErroredOnProcessing: boolean;
  ErrorMessage?: string[];
  ErrorDetails?: string;
}

export interface OCROptions {
  apiKey: string;
  language?: string; // 'eng', 'fre', 'spa', etc.
  isOverlayRequired?: boolean;
  detectOrientation?: boolean;
  scale?: boolean;
  isTable?: boolean;
  OCREngine?: 1 | 2 | 3; // Engine 1, 2 ou 3
}

/**
 * Envoie un buffer PDF à OCR.space et retourne le texte extrait.
 */
export async function extractTextFromPDFBuffer(
  pdfBuffer: Buffer,
  options: OCROptions
): Promise<{ text: string; meta: { provider: 'ocr.space'; engine: number } }>
{
  const base64PDF = pdfBuffer.toString('base64');

  const formData = new FormData();
  formData.append('base64Image', `data:application/pdf;base64,${base64PDF}`);
  formData.append('language', options.language || 'fre');
  formData.append('isOverlayRequired', String(options.isOverlayRequired ?? false));
  formData.append('detectOrientation', String(options.detectOrientation ?? true));
  formData.append('scale', String(options.scale ?? true));
  formData.append('isTable', String(options.isTable ?? false));
  formData.append('OCREngine', String(options.OCREngine ?? 2));

  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: {
      apikey: options.apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`OCR HTTP ${response.status}`);
  }

  const result = (await response.json()) as OCRSpaceResult;
  if (result.IsErroredOnProcessing) {
    throw new Error(`Erreur OCR: ${result.ErrorMessage?.join(', ') ?? result.ErrorDetails ?? 'inconnue'}`);
  }

  const text = result.ParsedResults?.[0]?.ParsedText ?? '';
  return { text, meta: { provider: 'ocr.space', engine: Number(options.OCREngine ?? 2) } };
}

/**
 * Version "smart": si le PDF dépasse la limite (par défaut 1024 KB),
 * on découpe page par page et on OCRise chaque page, puis on concatène.
 */
export async function extractTextFromPDFBufferSmart(
  pdfBuffer: Buffer,
  options: OCROptions,
  maxKB = 1024,
  maxPagesPerReq = 3
): Promise<{ text: string; meta: { provider: 'ocr.space'; engine: number } }>
{
  const limitBytes = maxKB * 1024;

  // Toujours charger pour connaître le nombre de pages
  const srcDoc = await PDFDocument.load(pdfBuffer);
  const pageCount = srcDoc.getPageCount();

  // Cas simple: petit et <= max pages autorisées
  if (pdfBuffer.byteLength <= limitBytes && pageCount <= maxPagesPerReq) {
    return extractTextFromPDFBuffer(pdfBuffer, options);
  }

  let fullText = '';

  // Helper: OCR d'un sous-PDF construit avec un ensemble de pages
  const ocrPages = async (pageIndexes: number[]) => {
    const out = await PDFDocument.create();
    const pages = await out.copyPages(srcDoc, pageIndexes);
    for (const p of pages) out.addPage(p);
    const chunk = await out.save();
    const chunkBuf = Buffer.from(chunk);

    if (chunkBuf.byteLength > limitBytes) {
      // Si le paquet dépasse la taille, tomber en per-page
      for (const pi of pageIndexes) {
        const single = await PDFDocument.create();
        const [p] = await single.copyPages(srcDoc, [pi]);
        single.addPage(p);
        const singleBuf = Buffer.from(await single.save());
        if (singleBuf.byteLength > limitBytes) {
          // Même une page dépasse → on tente quand même, sinon note d'échec
          try {
            const { text } = await extractTextFromPDFBuffer(singleBuf, options);
            fullText += (fullText ? '\n\n' : '') + text;
          } catch {
            fullText += (fullText ? '\n\n' : '') + `[OCR échec page ${pi + 1} (> ${maxKB} KB)]`;
          }
        } else {
          const { text } = await extractTextFromPDFBuffer(singleBuf, options);
          fullText += (fullText ? '\n\n' : '') + text;
        }
      }
    } else {
      const { text } = await extractTextFromPDFBuffer(chunkBuf, options);
      fullText += (fullText ? '\n\n' : '') + text;
    }
  };

  // Traiter par paquets de maxPagesPerReq
  for (let i = 0; i < pageCount; i += maxPagesPerReq) {
    const idxs = Array.from({ length: Math.min(maxPagesPerReq, pageCount - i) }, (_, k) => i + k);
    await ocrPages(idxs);
  }

  return { text: fullText, meta: { provider: 'ocr.space', engine: Number(options.OCREngine ?? 2) } };
}

function isQuotaLikeError(err: unknown): boolean {
  const msg = String((err as any)?.message ?? err ?? '').toLowerCase();
  return (
    msg.includes('quota') ||
    msg.includes('credit') ||
    msg.includes('too many requests') ||
    msg.includes('429') ||
    msg.includes('rate limit') ||
    msg.includes('maximum ocr requests')
  );
}

export async function extractTextFromPDFBufferSmartWithKeys(
  pdfBuffer: Buffer,
  apiKeys: string[],
  baseOptions: Omit<OCROptions, 'apiKey'>,
  maxKB = 1024,
  maxPagesPerReq = 3
): Promise<{ text: string; meta: { provider: 'ocr.space'; engine: number } }>
{
  let lastErr: any;
  for (const key of apiKeys) {
    try {
      return await extractTextFromPDFBufferSmart(pdfBuffer, { ...baseOptions, apiKey: key }, maxKB, maxPagesPerReq);
    } catch (e) {
      lastErr = e;
      if (isQuotaLikeError(e)) {
        // Essayer la clé suivante
        continue;
      }
      // Erreur non liée au quota → remonter immédiatement
      throw e;
    }
  }
  // Toutes les clés épuisées
  throw lastErr ?? new Error('OCR failure: no API keys succeeded');
}
