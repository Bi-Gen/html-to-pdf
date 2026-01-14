import puppeteer, { Browser, Page, PDFOptions } from 'puppeteer';

export interface ConvertOptions {
  format?: 'A4' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  printBackground?: boolean;
  scale?: number;
  margins?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  timeout?: number;
}

export interface ConvertResult {
  url: string;
  filename: string;
  buffer: Buffer;
  success: boolean;
  error?: string;
  duration?: number;
}

// Browser management
let browserInstance: Browser | null = null;
let browserLaunchPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  // If browser exists and is connected, return it
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }

  // If browser is being launched, wait for it
  if (browserLaunchPromise) {
    return browserLaunchPromise;
  }

  // Launch new browser
  browserLaunchPromise = puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-sync',
      '--disable-translate',
      '--hide-scrollbars',
      '--metrics-recording-only',
      '--mute-audio',
      '--no-first-run',
      '--safebrowsing-disable-auto-update',
    ],
  });

  try {
    browserInstance = await browserLaunchPromise;

    // Handle browser disconnect
    browserInstance.on('disconnected', () => {
      browserInstance = null;
      browserLaunchPromise = null;
    });

    return browserInstance;
  } finally {
    browserLaunchPromise = null;
  }
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    try {
      await browserInstance.close();
    } catch {
      // Ignore errors on close
    }
    browserInstance = null;
    browserLaunchPromise = null;
  }
}

function urlToFilename(url: string): string {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/^www\./, '');
    const path = urlObj.pathname
      .replace(/^\/|\/$/g, '')
      .replace(/\//g, '-')
      .replace(/[^a-zA-Z0-9-]/g, '') || 'index';

    // Limit filename length
    const truncatedPath = path.substring(0, 50);
    const timestamp = Date.now();
    return `${domain}-${truncatedPath}-${timestamp}.pdf`;
  } catch {
    return `page-${Date.now()}.pdf`;
  }
}

function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Block localhost and private IPs
    const blockedPatterns = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '::1',
    ];

    const blockedPrefixes = [
      '192.168.',
      '10.',
      '172.16.',
      '172.17.',
      '172.18.',
      '172.19.',
      '172.20.',
      '172.21.',
      '172.22.',
      '172.23.',
      '172.24.',
      '172.25.',
      '172.26.',
      '172.27.',
      '172.28.',
      '172.29.',
      '172.30.',
      '172.31.',
      '169.254.',
    ];

    if (blockedPatterns.includes(hostname)) {
      return false;
    }

    if (blockedPrefixes.some(prefix => hostname.startsWith(prefix))) {
      return false;
    }

    // Only allow http and https
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

async function scrollPage(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 500;
      const maxScrolls = 50; // Prevent infinite scroll
      let scrollCount = 0;

      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        scrollCount++;

        if (totalHeight >= scrollHeight || scrollCount >= maxScrolls) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve();
        }
      }, 100);
    });
  });
}

async function waitForImages(page: Page, timeout: number = 5000): Promise<void> {
  await page.evaluate(async (timeoutMs) => {
    const images = Array.from(document.querySelectorAll('img'));
    await Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.addEventListener('load', resolve);
          img.addEventListener('error', resolve);
          setTimeout(resolve, timeoutMs);
        });
      })
    );
  }, timeout);
}

async function safePageClose(page: Page | null): Promise<void> {
  if (page) {
    try {
      await page.close();
    } catch {
      // Ignore errors on close
    }
  }
}

export async function convertUrlToPdf(
  url: string,
  options: ConvertOptions = {}
): Promise<ConvertResult> {
  const startTime = Date.now();
  const filename = urlToFilename(url);
  const timeout = options.timeout || 60000;
  let page: Page | null = null;

  // Validate URL
  if (!isValidUrl(url)) {
    return {
      url,
      filename,
      buffer: Buffer.alloc(0),
      success: false,
      error: 'URL non valido o non permesso',
      duration: Date.now() - startTime,
    };
  }

  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    // Block unnecessary resources for faster loading
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      // Block fonts and media to speed up, but keep images
      if (['media', 'font'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Set user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Set timeout
    page.setDefaultNavigationTimeout(timeout);
    page.setDefaultTimeout(timeout);

    // Navigate to URL
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: timeout,
    });

    // Wait for initial content
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));

    // Scroll to trigger lazy loading
    await scrollPage(page);

    // Wait for lazy-loaded content
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1500)));

    // Wait for all images to load
    await waitForImages(page, 5000);

    // Final wait for any remaining async content
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));

    // Configure PDF options
    const pdfOptions: PDFOptions = {
      format: options.format || 'A4',
      landscape: options.orientation === 'landscape',
      printBackground: options.printBackground ?? true,
      scale: Math.min(Math.max(options.scale || 1, 0.1), 2), // Clamp between 0.1 and 2
      margin: {
        top: options.margins?.top || '10mm',
        right: options.margins?.right || '10mm',
        bottom: options.margins?.bottom || '10mm',
        left: options.margins?.left || '10mm',
      },
    };

    // Generate PDF
    const pdfBuffer = await page.pdf(pdfOptions);

    await safePageClose(page);
    page = null;

    return {
      url,
      filename,
      buffer: Buffer.from(pdfBuffer),
      success: true,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    await safePageClose(page);

    // Provide user-friendly error messages
    let errorMessage = 'Errore sconosciuto';
    if (error instanceof Error) {
      if (error.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
        errorMessage = 'Dominio non trovato';
      } else if (error.message.includes('net::ERR_CONNECTION_REFUSED')) {
        errorMessage = 'Connessione rifiutata';
      } else if (error.message.includes('net::ERR_CONNECTION_TIMED_OUT')) {
        errorMessage = 'Timeout connessione';
      } else if (error.message.includes('Navigation timeout')) {
        errorMessage = 'Pagina troppo lenta da caricare';
      } else if (error.message.includes('net::ERR_SSL')) {
        errorMessage = 'Errore certificato SSL';
      } else {
        errorMessage = error.message;
      }
    }

    return {
      url,
      filename,
      buffer: Buffer.alloc(0),
      success: false,
      error: errorMessage,
      duration: Date.now() - startTime,
    };
  }
}

export async function convertMultipleUrlsToPdf(
  urls: string[],
  options: ConvertOptions = {},
  onProgress?: (completed: number, total: number, currentUrl: string) => void
): Promise<ConvertResult[]> {
  const results: ConvertResult[] = [];
  const total = urls.length;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];

    if (onProgress) {
      onProgress(i, total, url);
    }

    const result = await convertUrlToPdf(url, options);
    results.push(result);

    // Small delay between conversions to be gentle on resources
    if (i < urls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  if (onProgress) {
    onProgress(total, total, '');
  }

  return results;
}

// Cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    closeBrowser();
  });
  process.on('SIGINT', () => {
    closeBrowser();
    process.exit();
  });
  process.on('SIGTERM', () => {
    closeBrowser();
    process.exit();
  });
}
