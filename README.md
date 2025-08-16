# 🔍 Khoj Advanced 

**Khoj** (खोज = search/discovery) is an advanced, AI-powered web scraping platform that automatically generates CSS selectors using LLM models and provides enterprise-grade scraping capabilities.

## 🚀 New Advanced Features

### ✨ What's New in v2.0

- **🎯 AI-Powered Selector Generation**: Automatically generates CSS selectors using OpenAI/Anthropic models
- **🔄 Real-time WebSocket Updates**: Live scraping progress and notifications
- **🌐 Advanced Chrome Extension**: One-click scraping with visual element selection
- **📊 Rich Dashboard**: React-based dashboard with analytics and data visualization
- **🛡️ Anti-Bot Protection**: Stealth mode, proxy rotation, and advanced evasion techniques
- **📤 Multi-Format Exports**: CSV, JSON, XLSX, XML, JSONL with scheduled exports
- **⚡ High Performance**: Clustered workers, browser pooling, and intelligent fallbacks
- **🔐 Enterprise Security**: JWT auth, rate limiting, webhook integration
- **📈 Analytics & Monitoring**: Comprehensive metrics, performance tracking

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Chrome Ext     │    │  React Dashboard│    │  Mobile App     │
│  (Popup + CS)   │    │  (Next.js)      │    │  (React Native) │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
         ┌─────────────────────────▼─────────────────────────┐
         │              Khoj API Gateway                     │
         │   (Fastify + WebSocket + Rate Limiting)           │
         └─────────────────────────┬─────────────────────────┘
                                   │
    ┌──────────────┬─────────────────┼─────────────────┬──────────────┐
    │              │                 │                 │              │
┌───▼───┐   ┌─────▼─────┐   ┌──────▼──────┐   ┌─────▼─────┐   ┌───▼───┐
│ Auth  │   │LLM Selector│   │   Scrape    │   │Webhook    │   │Export │
│Service│   │ Generator  │   │   Engine    │   │Service    │   │Service│
└───┬───┘   └─────┬─────┘   └──────┬──────┘   └─────┬─────┘   └───┬───┘
    │             │                │                │             │
    │   ┌─────────▼────────────────▼────────────────▼─────────────▼───┐
    │   │                Orchestrator                                 │
    │   │        (Queue Management + Job Coordination)                │
    │   └─────────────────────────┬───────────────────────────────────┘
    │                             │
    │   ┌─────────────────────────▼───────────────────────────────────┐
    │   │                  Worker Pool                                │
    │   │    ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
    │   │    │ Worker 1 │  │ Worker 2 │  │ Worker 3 │  │ Worker N │   │
    │   │    │(Browser) │  │(Browser) │  │(Browser) │  │(Browser) │   │
    │   │    └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
    │   └─────────────────────────────────────────────────────────────┘
    │
    └─────────────────────────────────────────────────────────────────┐
                                                                      │
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────▼┐
    │ PostgreSQL  │  │    Redis    │  │   Storage   │  │  Monitoring  │
    │   (Data)    │  │  (Queue)    │  │    (S3)     │  │ (Prometheus) │
    └─────────────┘  └─────────────┘  └─────────────┘  └──────────────┘
```

## 🛠️ Technology Stack

### Backend
- **Node.js + TypeScript**: Core runtime and language
- **Fastify**: High-performance web framework
- **Prisma + PostgreSQL**: Database ORM and storage
- **BullMQ + Redis**: Job queue and caching
- **WebSocket**: Real-time communication
- **Playwright + Puppeteer**: Browser automation

### Frontend
- **React 18 + TypeScript**: UI framework
- **Next.js 14**: Full-stack React framework
- **Tailwind CSS**: Utility-first styling
- **React Query**: Server state management
- **Recharts**: Data visualization
- **Socket.io**: Real-time updates

### Chrome Extension
- **Manifest V3**: Latest extension API
- **Content Scripts**: Page interaction
- **Background Service Worker**: Extension logic
- **Storage API**: Settings persistence

### DevOps & Monitoring
- **Docker**: Containerization
- **Prometheus**: Metrics collection
- **Grafana**: Metrics visualization
- **Winston**: Structured logging
- **GitHub Actions**: CI/CD pipeline

## 📦 Quick Start

### Prerequisites
```bash
node >= 18.0.0
npm >= 8.0.0
docker >= 20.0.0
docker-compose >= 2.0.0
```

### 1. Clone and Setup
```bash
git clone https://github.com/your-org/khoj-advanced.git
cd khoj-advanced

# Copy environment files
cp .env.example .env
cp frontend/.env.example frontend/.env.local

# Edit configuration
nano .env
```

### 2. Start Infrastructure
```bash
# Start PostgreSQL and Redis
docker compose up -d

# Wait for services to be ready
sleep 10
```

### 3. Backend Setup
```bash
# Install dependencies
npm install

# Run database migrations
npx prisma migrate dev --name init
npx prisma generate

# Start development server
npm run dev
```

### 4. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### 5. Chrome Extension Setup
```bash
# Load extension in Chrome
1. Open Chrome and go to chrome://extensions/
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the /extension directory
5. Configure API settings in extension popup
```

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/khoj"

# Redis
REDIS_URL="redis://localhost:6379"

# AI Models
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."

# Authentication
JWT_SECRET="your-super-secret-jwt-key"
API_RATE_LIMIT=100

# Features
ENABLE_WEBHOOKS=true
ENABLE_EXPORTS=true
ENABLE_ANALYTICS=true

# Storage
EXPORT_DIR="./exports"
UPLOAD_DIR="./uploads"

# Performance
MAX_WORKERS=4
BROWSER_POOL_SIZE=2
REQUEST_TIMEOUT=30000

# Security
CORS_ORIGINS="http://localhost:3000,chrome-extension://*"
HELMET_ENABLED=true
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

### Advanced Configuration

```typescript
// khoj.config.ts
export default {
  scraping: {
    defaultEngine: 'auto', // 'http' | 'playwright' | 'puppeteer' | 'stealth'
    retryAttempts: 3,
    timeout: 30000,
    userAgents: [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...',
      // Add more user agents
    ],
    antiBot: {
      stealth: true,
      randomDelays: { min: 1000, max: 3000 },
      proxyRotation: true
    }
  },
  
  exports: {
    maxFileSize: '100MB',
    allowedFormats: ['csv', 'json', 'xlsx', 'xml'],
    retention: 24 * 60 * 60 * 1000, // 24 hours
    concurrent: 3
  },
  
  monitoring: {
    metrics: true,
    healthchecks: true,
    alerts: {
      email: true,
      webhook: true,
      slack: true
    }
  }
};
```

## 🎯 Core Features

### 1. AI-Powered Selector Generation

```typescript
// Automatic selector generation
const selectors = await generateSelectors(
  'https://example.com/products',
  'Extract product titles, prices, and reviews'
);

// Result:
{
  container: '.product-card',
  fields: {
    title: '.product-title h3',
    price: '.price .amount',
    reviews: '.reviews .rating'
  }
}
```

### 2. Advanced Scraping Engines

```typescript
// Multiple engine support with fallbacks
const data = await extract(url, selectors, {
  engine: 'auto', // Tries HTTP first, fallback to browser
  proxyConfig: {
    enabled: true,
    rotation: true,
    providers: ['proxy1:8080', 'proxy2:8080']
  },
  antiBotConfig: {
    stealth: true,
    delays: { min: 1000, max: 3000 },
    userAgents: customUserAgents,
    cookies: sessionCookies
  },
  screenshot: true,
  retries: 3
});
```

### 3. Real-time Updates

```typescript
// WebSocket integration
const socket = io('ws://localhost:4000');

socket.on('run_started', (data) => {
  console.log(`Scraper ${data.scraperId} started`);
});

socket.on('run_progress', (data) => {
  updateProgressBar(data.progress);
});

socket.on('run_completed', (data) => {
  displayResults(data.result);
});
```

### 4. Chrome Extension Integration

```javascript
// One-click scraping from any page
chrome.action.onClicked.addListener(async (tab) => {
  const result = await chrome.tabs.sendMessage(tab.id, {
    action: 'quickScrape'
  });
  
  if (result.success) {
    // Create scraper automatically
    await createScraperFromPage(tab.url, result.data);
  }
});
```

### 5. Multi-format Exports

```typescript
// Export runs in multiple formats
const exportResult = await ExportService.exportRuns(userId, {
  format: 'xlsx',
  filters: {
    scraperId: 'scraper-123',
    dateFrom: new Date('2024-01-01'),
    status: 'SUCCESS'
  },
  fields: ['title', 'price', 'description'],
  includeMetadata: true
});
```

## 📊 Dashboard Features

### Analytics Dashboard
- **Real-time Metrics**: Live scraping statistics and performance
- **Success Rates**: Track scraper reliability over time
- **Performance Charts**: Execution time, memory usage, error rates
- **Geographic Distribution**: See where your scrapers are running

### Scraper Management
- **Visual Selector Builder**: Point-and-click selector creation
- **Version Control**: Track changes to scraper configurations
- **A/B Testing**: Compare different scraper versions
- **Scheduling**: Cron-based automation with timezone support

### Data Visualization
- **Interactive Tables**: Sort, filter, and explore scraped data
- **Export Options**: Download in multiple formats
- **Data Quality**: Monitor extraction accuracy and completeness
- **Trend Analysis**: Identify patterns in scraped content

## 🔌 Chrome Extension Features

### Visual Element Selection
- **Interactive Mode**: Click elements to select them for scraping
- **Smart Suggestions**: AI-powered element recommendations
- **Preview Mode**: See what data will be extracted
- **Bulk Selection**: Select multiple similar elements at once

### One-click Actions
- **Quick Scrape**: Instantly scrape current page
- **Save for Later**: Bookmark pages for scheduled scraping
- **Share Scrapers**: Export configurations to team members
- **Live Preview**: See results in real-time

### Browser Integration
- **Context Menus**: Right-click to scrape elements
- **Keyboard Shortcuts**: Ctrl+Shift+K for quick actions
- **Notification System**: Stay informed about scraper status
- **Offline Support**: Queue actions when disconnected

## 🛡️ Security & Anti-Bot Features

### Stealth Techniques
- **User Agent Rotation**: Randomized browser fingerprints
- **Request Timing**: Human-like browsing patterns
- **Cookie Management**: Session persistence across requests
- **Header Spoofing**: Realistic HTTP headers

### Proxy Support
- **Rotation**: Automatic IP switching
- **Geographic Distribution**: Route through different regions
- **Provider Integration**: Support for major proxy services
- **Health Monitoring**: Automatic failover for dead proxies

### Rate Limiting
- **Adaptive Throttling**: Adjust speed based on site responses
- **Concurrent Limits**: Control parallel request counts
- **Backoff Strategies**: Exponential delays on errors
- **Whitelist/Blacklist**: Domain-specific rules

## 📈 Performance Optimization

### Browser Pooling
```typescript
// Reuse browser instances for better performance
const browserPool = new BrowserPool({
  maxInstances: 4,
  idleTimeout: 300000,
  reuseConnections: true
});
```

### Intelligent Caching
```typescript
// Cache selectors and page structures
const cache = new ScrapingCache({
  ttl: 3600000, // 1 hour
  strategies: ['lru', 'ttl'],
  compression: true
});
```

### Queue Management
```typescript
// Prioritized job processing
const queue = new BullMQ('scraping', {
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: 'exponential'
  }
});
```

## 🔗 API Endpoints

### Scrapers
```bash
GET    /v1/scrapers              # List scrapers
POST   /v1/scrapers              # Create scraper
GET    /v1/scrapers/:id          # Get scraper details
PUT    /v1/scrapers/:id          # Update scraper
DELETE /v1/scrapers/:id          # Delete scraper
POST   /v1/scrapers/:id/run      # Run scraper
GET    /v1/scrapers/:id/runs     # Get run history
```

### Runs
```bash
GET    /v1/runs                  # List runs
GET    /v1/runs/:id              # Get run details
POST   /v1/runs/:id/cancel       # Cancel running job
GET    /v1/runs/:id/result       # Get extracted data
GET    /v1/runs/:id/screenshot   # Get page screenshot
```

### Exports
```bash
POST   /v1/exports               # Create export
GET    /v1/exports               # List exports
GET    /v1/exports/:id           # Download export
DELETE /v1/exports/:id           # Delete export
```

### Analytics
```bash
GET    /v1/analytics/dashboard   # Dashboard stats
GET    /v1/analytics/scrapers    # Scraper performance
GET    /v1/analytics/runs        # Run statistics
GET    /v1/analytics/trends      # Time-series data
```

### Webhooks
```bash
POST   /v1/webhooks              # Create webhook
GET    /v1/webhooks              # List webhooks
PUT    /v1/webhooks/:id          # Update webhook
DELETE /v1/webhooks/:id          # Delete webhook
POST   /v1/webhooks/:id/test     # Test webhook
```

## 🔧 Deployment

### Production Deployment

```bash
# Build all components
npm run build
cd frontend && npm run build && cd ..

# Create production Docker images
docker build -t khoj-api .
docker build -t khoj-frontend ./frontend

# Deploy with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: khoj-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: khoj-api
  template:
    metadata:
      labels:
        app: khoj-api
    spec:
      containers:
      - name: api
        image: khoj-api:latest
        ports:
        - containerPort: 4000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: khoj-secrets
              key: database-url
```

### Cloud Platforms

#### Vercel (Frontend)
```bash
cd frontend
vercel --prod
```

#### Railway (Backend)
```bash
railway login
railway init
railway up
```

#### Heroku (Full Stack)
```bash
heroku create khoj-app
heroku addons:create heroku-postgresql:hobby-dev
heroku addons:create heroku-redis:hobby-dev
git push heroku main
```

## 🧪 Testing

### Unit Tests
```bash
npm run test
npm run test:watch
npm run test:coverage
```

### Integration Tests
```bash
npm run test:integration
npm run test:e2e
```

### Load Testing
```bash
npm run test:load
```

### Chrome Extension Testing
```bash
cd extension
npm run test:extension
```

## 📚 Advanced Usage Examples

### 1. E-commerce Product Monitoring

```typescript
// Monitor product prices across multiple sites
const priceMonitor = await createScraper({
  name: 'Product Price Monitor',
  url: 'https://shop.example.com/product/{productId}',
  prompt: 'Extract product title, price, availability, and reviews',
  schedule: '0 */6 * * *', // Every 6 hours
  webhooks: [{
    url: 'https://api.example.com/price-alerts',
    events: ['run_completed'],
    filters: { priceChange: true }
  }],
  antiBotConfig: {
    stealth: true,
    proxyRotation: true
  }
});
```

### 2. News Article Aggregation

```typescript
// Aggregate news from multiple sources
const newsAggregator = await createScraper({
  name: 'Tech News Aggregator',
  url: 'https://news.example.com/tech',
  prompt: 'Extract article headlines, summaries, authors, and publication dates',
  schedule: '*/30 * * * *', // Every 30 minutes
  postProcessing: {
    deduplication: true,
    sentiment: true,
    categorization: true
  }
});
```

### 3. Real Estate Monitoring

```typescript
// Track real estate listings
const realEstateMonitor = await createScraper({
  name: 'Property Listings Monitor',
  url: 'https://realestate.example.com/search?location={city}',
  prompt: 'Extract property addresses, prices, bedrooms, bathrooms, and listing dates',
  schedule: '0 9 * * *', // Daily at 9 AM
  exports: {
    format: 'xlsx',
    frequency: 'weekly',
    recipients: ['agent@realty.com']
  }
});
```

## 🎓 Learning Resources

### Documentation
- [API Reference](https://docs.khoj.dev/api)
- [Chrome Extension Guide](https://docs.khoj.dev/extension)
- [Dashboard Manual](https://docs.khoj.dev/dashboard)
- [Best Practices](https://docs.khoj.dev/best-practices)

### Tutorials
- [Getting Started Video](https://youtube.com/khoj-tutorial)
- [Advanced Scraping Techniques](https://blog.khoj.dev/advanced-techniques)
- [Building Custom Integrations](https://blog.khoj.dev/integrations)

### Community
- [Discord Server](https://discord.gg/khoj)
- [GitHub Discussions](https://github.com/khoj/khoj/discussions)
- [Stack Overflow Tag](https://stackoverflow.com/questions/tagged/khoj)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
```bash
git clone https://github.com/khoj/khoj.git
cd khoj
npm install
npm run dev:all
```

### Pull Request Process
1. Fork the repository
2. Create your feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit pull request with detailed description

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for GPT models
- Anthropic for Claude models
- Playwright team for browser automation
- React team for the amazing frontend framework
- All our contributors and users

---

**Built with ❤️ by the Khoj team**

For support, questions, or feature requests, please [open an issue](https://github.com/khoj/khoj/issues) or join our [Discord community](https://discord.gg/khoj).