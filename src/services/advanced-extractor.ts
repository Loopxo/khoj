import axios from 'axios';
import { load, CheerioAPI } from 'cheerio';
import { chromium, Browser, BrowserContext } from 'playwright';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { ProxyAgent } from 'proxy-agent';
import { normalize } from '../utils/text.js';
import { logger } from '../utils/logger.js';
import { createHash } from 'crypto';

puppeteer.use(StealthPlugin());

export type Engine = 'auto' | 'http' | 'playwright' | 'puppeteer' | 'stealth';
export type ProxyConfig = {
  enabled: boolean;
  rotation: boolean;
  providers: string[];
  config: Record<string, any>;
};

export type AntiBotConfig = {
  stealth: boolean;
  delays: { min: number; max: number; };
  userAgents: string[];
  cookies: Record<string, string>;
};

interface ExtractionOptions {
  engine?: Engine;
  proxyConfig?: ProxyConfig;
  antiBotConfig?: AntiBotConfig;
  screenshot?: boolean;
  timeout?: number;
  retries?: number;
}

interface ExtractionResult {
  data: any[];
  metadata: {
    itemsExtracted: number;
    executionTime: number;
    engineUsed: string;
    screenshot?: string;
    errors: number;
    retries: number;
  };
}

export class AdvancedExtractor {
  private static browserPool: Map<string, Browser> = new Map();
  private static contextPool: Map<string, BrowserContext> = new Map();
  
  static async extract(
    url: string, 
    selectors: any, 
    options: ExtractionOptions = {}
  ): Promise<ExtractionResult> {
    const startTime = Date.now();
    let retries = 0;
    const maxRetries = options.retries || 3;
    
    while (retries <= maxRetries) {
      try {
        const result = await this.performExtraction(url, selectors, options);
        const executionTime = Date.now() - startTime;
        
        return {
          ...result,
          metadata: {
            ...result.metadata,
            executionTime,
            retries
          }
        };
      } catch (error) {
        retries++;
        logger.warn(`Extraction attempt ${retries} failed:`, error);
        
        if (retries > maxRetries) {
          throw error;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
      }
    }
    
    throw new Error('Max retries exceeded');
  }
  
  private static async performExtraction(
    url: string, 
    selectors: any, 
    options: ExtractionOptions
  ): Promise<ExtractionResult> {
    const engine = options.engine || 'auto';
    let errors = 0;
    
    try {
      // Try HTTP first for speed (if auto or http)
      if (engine === 'http' || engine === 'auto') {
        const html = await this.fetchWithAxios(url, options);
        const data = this.runCheerio(load(html), selectors);
        
        if (data.length || engine === 'http') {
          return {
            data,
            metadata: {
              itemsExtracted: data.length,
              executionTime: 0, // Will be set by caller
              engineUsed: 'http',
              errors,
              retries: 0
            }
          };
        }
      }
      
      // Fallback to browser-based extraction
      return await this.extractWithBrowser(url, selectors, options);
      
    } catch (error) {
      errors++;
      logger.error('Extraction failed:', error);
      throw error;
    }
  }
  
  private static async fetchWithAxios(url: string, options: ExtractionOptions): Promise<string> {
    const config: any = {
      headers: { 
        'User-Agent': this.getRandomUserAgent(options.antiBotConfig?.userAgents) 
      },
      timeout: options.timeout || 15000,
      maxRedirects: 5
    };
    
    // Add proxy if configured
    if (options.proxyConfig?.enabled) {
      const proxy = this.getProxy(options.proxyConfig);
      if (proxy) {
        config.httpsAgent = new ProxyAgent(proxy);
        config.httpAgent = new ProxyAgent(proxy);
      }
    }
    
    // Add random delay if anti-bot config exists
    if (options.antiBotConfig?.delays) {
      const delay = this.randomDelay(options.antiBotConfig.delays);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    const { data } = await axios.get(url, config);
    return data as string;
  }
  
  private static async extractWithBrowser(
    url: string, 
    selectors: any, 
    options: ExtractionOptions
  ): Promise<ExtractionResult> {
    let browser: Browser | undefined;
    let context: BrowserContext | undefined;
    
    try {
      const engineToUse = options.engine === 'stealth' ? 'puppeteer' : 'playwright';
      
      if (engineToUse === 'puppeteer') {
        return await this.extractWithPuppeteer(url, selectors, options);
      } else {
        return await this.extractWithPlaywright(url, selectors, options);
      }
      
    } finally {
      // Cleanup handled by individual methods
    }
  }
  
  private static async extractWithPlaywright(
    url: string, 
    selectors: any, 
    options: ExtractionOptions
  ): Promise<ExtractionResult> {
    const browserKey = this.getBrowserKey(options);
    let browser = this.browserPool.get(browserKey);
    
    if (!browser) {
      browser = await chromium.launch({ 
        headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
        args: ['--no-sandbox', '--disable-dev-shm-usage']
      });
      this.browserPool.set(browserKey, browser);
    }
    
    const context = await browser.newContext({
      userAgent: this.getRandomUserAgent(options.antiBotConfig?.userAgents),
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true
    });
    
    const page = await context.newPage();
    
    try {
      // Set cookies if configured
      if (options.antiBotConfig?.cookies) {
        const cookies = Object.entries(options.antiBotConfig.cookies).map(([name, value]) => ({
          name,
          value: String(value),
          url,
          domain: new URL(url).hostname
        }));
        await context.addCookies(cookies);
      }
      
      await page.goto(url, { 
        waitUntil: 'networkidle', 
        timeout: options.timeout || 30000 
      });
      
      // Random delay for anti-bot
      if (options.antiBotConfig?.delays) {
        const delay = this.randomDelay(options.antiBotConfig.delays);
        await page.waitForTimeout(delay);
      }
      
      const html = await page.content();
      let screenshot: string | undefined;
      
      if (options.screenshot) {
        const buffer = await page.screenshot({ 
          fullPage: true, 
          type: 'png' 
        });
        screenshot = buffer.toString('base64');
      }
      
      const data = this.runCheerio(load(html), selectors);
      
      return {
        data,
        metadata: {
          itemsExtracted: data.length,
          executionTime: 0,
          engineUsed: 'playwright',
          screenshot,
          errors: 0,
          retries: 0
        }
      };
      
    } finally {
      await context.close();
    }
  }
  
  private static async extractWithPuppeteer(
    url: string, 
    selectors: any, 
    options: ExtractionOptions
  ): Promise<ExtractionResult> {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });
    
    try {
      const page = await browser.newPage();
      
      // Set user agent
      await page.setUserAgent(
        this.getRandomUserAgent(options.antiBotConfig?.userAgents)
      );
      
      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Set cookies
      if (options.antiBotConfig?.cookies) {
        const cookies = Object.entries(options.antiBotConfig.cookies).map(([name, value]) => ({
          name,
          value: String(value),
          url
        }));
        await page.setCookie(...cookies);
      }
      
      await page.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: options.timeout || 30000 
      });
      
      // Random delay
      if (options.antiBotConfig?.delays) {
        const delay = this.randomDelay(options.antiBotConfig.delays);
        await page.waitForTimeout(delay);
      }
      
      const html = await page.content();
      let screenshot: string | undefined;
      
      if (options.screenshot) {
        const buffer = await page.screenshot({ 
          fullPage: true, 
          type: 'png' 
        });
        screenshot = buffer.toString('base64');
      }
      
      const data = this.runCheerio(load(html), selectors);
      
      return {
        data,
        metadata: {
          itemsExtracted: data.length,
          executionTime: 0,
          engineUsed: 'puppeteer-stealth',
          screenshot,
          errors: 0,
          retries: 0
        }
      };
      
    } finally {
      await browser.close();
    }
  }
  
  private static runCheerio($: CheerioAPI, selectors: any) {
    const items: any[] = [];
    const containerSel = selectors.container || 'body';
    
    $(containerSel).each((_, el) => {
      const obj: Record<string, any> = {};
      const fields = selectors.fields || {};
      
      for (const [key, selector] of Object.entries(fields)) {
        const sel = selector as string;
        let value = normalize($(el).find(sel).first().text());
        
        if (!value) {
          // Try direct selector as fallback
          value = normalize($(sel).first().text());
        }
        
        // Extract additional attributes if specified
        if (sel.includes('@')) {
          const [cssSelector, attr] = sel.split('@');
          value = $(el).find(cssSelector).first().attr(attr) || value;
        }
        
        obj[key] = value;
      }
      
      // Only include items with at least one non-empty field
      if (Object.values(obj).some(v => Boolean(v))) {
        items.push(obj);
      }
    });
    
    return items;
  }
  
  private static getRandomUserAgent(userAgents?: string[]): string {
    const defaultUserAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:124.0) Gecko/20100101 Firefox/124.0'
    ];
    
    const agents = userAgents && userAgents.length ? userAgents : defaultUserAgents;
    return agents[Math.floor(Math.random() * agents.length)];
  }
  
  private static getProxy(config: ProxyConfig): string | null {
    if (!config.enabled || !config.providers.length) return null;
    
    if (config.rotation) {
      return config.providers[Math.floor(Math.random() * config.providers.length)];
    }
    
    return config.providers[0];
  }
  
  private static randomDelay(delays: { min: number; max: number }): number {
    return Math.floor(Math.random() * (delays.max - delays.min + 1)) + delays.min;
  }
  
  private static getBrowserKey(options: ExtractionOptions): string {
    return createHash('md5')
      .update(JSON.stringify({
        engine: options.engine,
        proxy: options.proxyConfig?.enabled,
        stealth: options.antiBotConfig?.stealth
      }))
      .digest('hex');
  }
  
  // Cleanup method to close browser pools
  static async cleanup() {
    for (const browser of this.browserPool.values()) {
      await browser.close();
    }
    this.browserPool.clear();
    this.contextPool.clear();
  }
}