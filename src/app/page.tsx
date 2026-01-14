'use client';

import { useState, useEffect } from 'react';

const ANALYTICS_URL = 'https://dashboard.bi-gen.it';

// Track page view
function trackPageView() {
  fetch(`${ANALYTICS_URL}/api/track/pageview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project: 'html-to-pdf',
      path: window.location.pathname,
      referrer: document.referrer
    })
  }).catch(() => {});
}

interface ConvertOptions {
  format: 'A4' | 'Letter' | 'Legal';
  orientation: 'portrait' | 'landscape';
  printBackground: boolean;
  scale: number;
}

export default function Home() {
  const [urls, setUrls] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [options, setOptions] = useState<ConvertOptions>({
    format: 'A4',
    orientation: 'portrait',
    printBackground: true,
    scale: 1,
  });

  // Track page view on mount
  useEffect(() => {
    trackPageView();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const urlList = urls
      .split('\n')
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    if (urlList.length === 0) {
      setError('Inserisci almeno un URL');
      setIsLoading(false);
      return;
    }

    if (urlList.length > 10) {
      setError('Massimo 10 URL per richiesta');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urls: urlList,
          options,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Errore nella conversione');
      }

      // Get filename from header or generate one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'download';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          filename = match[1];
        }
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setIsLoading(false);
    }
  };

  const urlCount = urls
    .split('\n')
    .filter((url) => url.trim().length > 0).length;

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-4">
            HTML to PDF
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Converti qualsiasi pagina web in PDF. Inserisci uno o più URL e
            scarica i PDF singolarmente o in un file ZIP.
          </p>
        </div>

        {/* Main Card */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 md:p-8">
            <form onSubmit={handleSubmit}>
              {/* URL Input */}
              <div className="mb-6">
                <label
                  htmlFor="urls"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  URL da convertire
                  <span className="text-gray-500 ml-2">
                    (uno per riga, max 10)
                  </span>
                </label>
                <textarea
                  id="urls"
                  value={urls}
                  onChange={(e) => setUrls(e.target.value)}
                  placeholder="https://example.com&#10;https://another-site.com/page"
                  rows={5}
                  className="w-full bg-gray-900/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                />
                {urlCount > 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    {urlCount} URL inserit{urlCount === 1 ? 'o' : 'i'}
                    {urlCount > 1 && ' - verranno scaricati come ZIP'}
                  </p>
                )}
              </div>

              {/* Options Toggle */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => setShowOptions(!showOptions)}
                  className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-2 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-4 w-4 transition-transform ${
                      showOptions ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                  Opzioni avanzate
                </button>
              </div>

              {/* Options Panel */}
              {showOptions && (
                <div className="mb-6 p-4 bg-gray-900/30 rounded-xl border border-gray-700 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Format */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        Formato
                      </label>
                      <select
                        value={options.format}
                        onChange={(e) =>
                          setOptions({
                            ...options,
                            format: e.target.value as ConvertOptions['format'],
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="A4">A4</option>
                        <option value="Letter">Letter</option>
                        <option value="Legal">Legal</option>
                      </select>
                    </div>

                    {/* Orientation */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        Orientamento
                      </label>
                      <select
                        value={options.orientation}
                        onChange={(e) =>
                          setOptions({
                            ...options,
                            orientation: e.target
                              .value as ConvertOptions['orientation'],
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="portrait">Verticale</option>
                        <option value="landscape">Orizzontale</option>
                      </select>
                    </div>
                  </div>

                  {/* Scale */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Scala: {options.scale}x
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={options.scale}
                      onChange={(e) =>
                        setOptions({
                          ...options,
                          scale: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-blue-500"
                    />
                  </div>

                  {/* Print Background */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="printBackground"
                      checked={options.printBackground}
                      onChange={(e) =>
                        setOptions({
                          ...options,
                          printBackground: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                    />
                    <label
                      htmlFor="printBackground"
                      className="text-sm text-gray-400"
                    >
                      Includi sfondi e colori
                    </label>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || urlCount === 0}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Conversione in corso...
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    {urlCount > 1
                      ? `Converti e scarica ZIP (${urlCount} PDF)`
                      : 'Converti in PDF'}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Info */}
          <div className="mt-8 text-center text-gray-500 text-sm">
            <p>
              Powered by{' '}
              <a
                href="https://bi-gen.it"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                BI-Gen
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
