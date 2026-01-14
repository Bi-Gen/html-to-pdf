# HTML to PDF Converter

A modern, open-source web application that converts any webpage to PDF format. Built with Next.js and Puppeteer for high-quality, accurate PDF generation.

![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Puppeteer](https://img.shields.io/badge/Puppeteer-24.0-green?style=flat-square&logo=puppeteer)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

## Features

- **Single & Batch Conversion**: Convert one URL to PDF or multiple URLs at once (up to 10)
- **ZIP Download**: Multiple PDFs are automatically packaged into a ZIP file
- **Lazy Loading Support**: Automatically scrolls pages to capture lazy-loaded content
- **Customizable Options**:
  - Page format (A4, Letter, Legal)
  - Orientation (Portrait, Landscape)
  - Scale (0.5x - 2x)
  - Background printing toggle
- **Security**: Blocks localhost and private IP addresses to prevent SSRF attacks
- **Modern UI**: Clean, responsive dark theme interface

## Demo

Try it live at: [https://html-to-pdf.bi-gen.it](https://html-to-pdf.bi-gen.it)

## Quick Start

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/Bi-Gen/html-to-pdf.git
cd html-to-pdf

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## API Usage

### POST /api/convert

Convert one or more URLs to PDF.

**Request Body:**
```json
{
  "urls": ["https://example.com", "https://another-site.com"],
  "options": {
    "format": "A4",
    "orientation": "portrait",
    "printBackground": true,
    "scale": 1
  }
}
```

**Options:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `format` | string | `"A4"` | Page format: `A4`, `Letter`, `Legal` |
| `orientation` | string | `"portrait"` | Page orientation: `portrait`, `landscape` |
| `printBackground` | boolean | `true` | Include background colors and images |
| `scale` | number | `1` | Page scale (0.1 - 2) |
| `timeout` | number | `60000` | Navigation timeout in milliseconds |

**Response:**
- Single URL: Returns PDF file directly (`application/pdf`)
- Multiple URLs: Returns ZIP file (`application/zip`)

### Example with cURL

```bash
# Single URL
curl -X POST http://localhost:3000/api/convert \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://example.com"]}' \
  --output page.pdf

# Multiple URLs
curl -X POST http://localhost:3000/api/convert \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://example.com", "https://google.com"]}' \
  --output pages.zip
```

## Project Structure

```
html-to-pdf/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── convert/
│   │   │       └── route.ts    # API endpoint
│   │   ├── page.tsx            # Main UI
│   │   ├── layout.tsx          # Root layout
│   │   └── globals.css         # Global styles
│   └── lib/
│       ├── pdf-generator.ts    # Puppeteer PDF logic
│       └── zip-creator.ts      # ZIP file creation
├── public/                     # Static assets
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind CSS config
└── package.json
```

## Technical Details

### How It Works

1. **Browser Management**: Uses a singleton Puppeteer browser instance with automatic reconnection
2. **Page Loading**: Waits for `networkidle0` and scrolls to trigger lazy-loaded content
3. **Image Handling**: Waits for all images to load before PDF generation
4. **Resource Optimization**: Blocks fonts and media files for faster loading
5. **Error Handling**: Provides user-friendly error messages in Italian

### Security Measures

- Blocks localhost, private IPs (10.x, 192.168.x, 172.16-31.x, 169.254.x)
- Only allows HTTP/HTTPS protocols
- URL validation before processing
- Request timeout limits

## Deployment

### Docker (Recommended)

```dockerfile
FROM node:20-slim

# Install Chromium dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

EXPOSE 3000
CMD ["npm", "start"]
```

### PM2 (VPS)

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start npm --name "html-to-pdf" -- start

# Save PM2 configuration
pm2 save
pm2 startup
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**BI-Gen**
- Website: [bi-gen.it](https://bi-gen.it)
- GitHub: [@Bi-Gen](https://github.com/Bi-Gen)

---

Made with love by [BI-Gen](https://bi-gen.it)
