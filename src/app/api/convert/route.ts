import { NextRequest, NextResponse } from 'next/server';
import { convertUrlToPdf, convertMultipleUrlsToPdf, ConvertOptions } from '@/lib/pdf-generator';
import { createZipFromPdfs } from '@/lib/zip-creator';

export const maxDuration = 60; // 60 seconds timeout
export const dynamic = 'force-dynamic';

interface RequestBody {
  urls: string[];
  options?: ConvertOptions;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { urls, options = {} } = body;

    // Validation
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: 'Inserisci almeno un URL' },
        { status: 400 }
      );
    }

    // Limit number of URLs
    if (urls.length > 10) {
      return NextResponse.json(
        { error: 'Massimo 10 URL per richiesta' },
        { status: 400 }
      );
    }

    // Clean and validate URLs
    const cleanUrls = urls
      .map((url) => url.trim())
      .filter((url) => url.length > 0)
      .map((url) => {
        // Add https:// if missing
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          return `https://${url}`;
        }
        return url;
      });

    if (cleanUrls.length === 0) {
      return NextResponse.json(
        { error: 'Nessun URL valido fornito' },
        { status: 400 }
      );
    }

    // Single URL - return PDF directly
    if (cleanUrls.length === 1) {
      const result = await convertUrlToPdf(cleanUrls[0], options);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Errore nella conversione' },
          { status: 500 }
        );
      }

      return new NextResponse(new Uint8Array(result.buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${result.filename}"`,
          'Content-Length': result.buffer.length.toString(),
        },
      });
    }

    // Multiple URLs - return ZIP
    const results = await convertMultipleUrlsToPdf(cleanUrls, options);

    // Filter successful conversions
    const successfulResults = results.filter((r) => r.success);

    if (successfulResults.length === 0) {
      return NextResponse.json(
        {
          error: 'Nessuna conversione riuscita',
          details: results.map((r) => ({
            url: r.url,
            error: r.error,
          })),
        },
        { status: 500 }
      );
    }

    // Create ZIP
    const zipBuffer = await createZipFromPdfs(
      successfulResults.map((r) => ({
        filename: r.filename,
        buffer: r.buffer,
      }))
    );

    const timestamp = Date.now();
    const zipFilename = `pdf-export-${timestamp}.zip`;

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFilename}"`,
        'Content-Length': zipBuffer.length.toString(),
        'X-Conversion-Results': JSON.stringify({
          total: cleanUrls.length,
          success: successfulResults.length,
          failed: results.filter((r) => !r.success).length,
        }),
      },
    });
  } catch (error) {
    console.error('Conversion error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
