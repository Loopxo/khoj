// Khoj Chrome Extension Popup Script

class KhojExtension {
  constructor() {
    this.apiUrl = 'http://localhost:4000'; // Will be configurable
    this.apiKey = null;
    this.currentTab = null;
    this.init();
  }

  async init() {
    await this.loadSettings();
    await this.getCurrentTab();
    await this.checkConnection();
    this.bindEvents();
    this.updateUI();
  }

  async loadSettings() {
    const settings = await chrome.storage.sync.get(['apiUrl', 'apiKey']);
    this.apiUrl = settings.apiUrl || 'http://localhost:4000';
    this.apiKey = settings.apiKey;
  }

  async getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTab = tab;
    
    if (tab) {
      document.getElementById('current-url').textContent = tab.url;
      document.getElementById('current-title').textContent = tab.title;
    }
  }

  async checkConnection() {
    const statusEl = document.getElementById('status');
    const statusText = document.getElementById('status-text');
    
    try {
      if (!this.apiKey) {
        throw new Error('API key not configured');
      }

      const response = await fetch(`${this.apiUrl}/health`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (response.ok) {
        statusEl.className = 'status connected';
        statusText.textContent = 'Connected to Khoj API';
      } else {
        throw new Error('API connection failed');
      }
    } catch (error) {
      statusEl.className = 'status disconnected';
      statusText.textContent = this.apiKey ? 'Connection failed' : 'Not configured';
    }
  }

  bindEvents() {
    // Quick actions
    document.getElementById('quick-scrape').addEventListener('click', () => this.quickScrape());
    document.getElementById('selector-mode').addEventListener('click', () => this.toggleSelectorMode());
    document.getElementById('view-scrapers').addEventListener('click', () => this.showScrapers());
    document.getElementById('open-dashboard').addEventListener('click', () => this.openDashboard());

    // Form actions
    document.getElementById('create-scraper').addEventListener('click', () => this.createScraper());
    document.getElementById('cancel-create').addEventListener('click', () => this.hideCreateForm());
    document.getElementById('back-to-main').addEventListener('click', () => this.showMainView());

    // Footer links
    document.getElementById('settings').addEventListener('click', () => this.openSettings());
    document.getElementById('help').addEventListener('click', () => this.openHelp());
    document.getElementById('dashboard-link').addEventListener('click', () => this.openDashboard());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'K') {
        e.preventDefault();
        this.quickScrape();
      }
    });
  }

  updateUI() {
    // Update UI based on connection status and current page
    const isConnected = document.getElementById('status').classList.contains('connected');
    const quickScrapeBtn = document.getElementById('quick-scrape');
    const selectorBtn = document.getElementById('selector-mode');
    
    if (!isConnected) {
      quickScrapeBtn.style.opacity = '0.5';
      selectorBtn.style.opacity = '0.5';
    }

    // Disable certain actions for non-http(s) pages
    if (this.currentTab && !this.currentTab.url.startsWith('http')) {
      quickScrapeBtn.style.opacity = '0.5';
      selectorBtn.style.opacity = '0.5';
    }
  }

  async quickScrape() {
    if (!this.canScrapeCurrentPage()) {
      this.showNotification('Cannot scrape this page', 'error');
      return;
    }

    this.showLoading(true);

    try {
      // Send message to content script to capture page data
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'quickScrape'
      });

      if (response && response.success) {
        // Create a quick scraper
        const scraperData = {
          name: `Quick Scrape - ${new Date().toLocaleDateString()}`,
          url: tab.url,
          prompt: 'Extract the main content, titles, and key information from this page',
          engineHint: 'auto'
        };

        const createResponse = await this.apiCall('/v1/scrapers', 'POST', scraperData);
        
        if (createResponse.ok) {
          const result = await createResponse.json();
          
          // Run the scraper immediately
          const runResponse = await this.apiCall(`/v1/scrapers/${result.scraperId}/run`, 'POST', {});
          
          if (runResponse.ok) {
            this.showNotification('Quick scrape started successfully!', 'success');
            setTimeout(() => this.openDashboard(), 1500);
          } else {
            throw new Error('Failed to run scraper');
          }
        } else {
          throw new Error('Failed to create scraper');
        }
      } else {
        throw new Error('Failed to capture page data');
      }
    } catch (error) {
      console.error('Quick scrape failed:', error);
      this.showNotification(`Quick scrape failed: ${error.message}`, 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async toggleSelectorMode() {
    if (!this.canScrapeCurrentPage()) {
      this.showNotification('Cannot use selector mode on this page', 'error');
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'toggleSelectorMode'
      });

      if (response && response.success) {
        this.showNotification('Selector mode activated. Click elements to select them!', 'success');
        window.close(); // Close popup to let user interact with page
      } else {
        throw new Error('Failed to activate selector mode');
      }
    } catch (error) {
      console.error('Selector mode failed:', error);
      this.showNotification('Failed to activate selector mode', 'error');
    }
  }

  async showScrapers() {
    this.showLoading(true);
    
    try {
      const response = await this.apiCall('/v1/scrapers');
      
      if (response.ok) {
        const scrapers = await response.json();
        this.renderScrapers(scrapers);
        this.showScrapersView();
      } else {
        throw new Error('Failed to load scrapers');
      }
    } catch (error) {
      console.error('Failed to load scrapers:', error);
      this.showNotification('Failed to load scrapers', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  renderScrapers(scrapers) {
    const listEl = document.getElementById('scrapers-list');
    
    if (scrapers.length === 0) {
      listEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #64748b;">No scrapers found. Create your first scraper!</div>';
      return;
    }

    listEl.innerHTML = scrapers.map(scraper => `
      <div class="scraper-item" data-id="${scraper.id}">
        <div class="scraper-name">${scraper.name}</div>
        <div class="scraper-url">${scraper.url}</div>
      </div>
    `).join('');

    // Add click handlers
    listEl.querySelectorAll('.scraper-item').forEach(item => {
      item.addEventListener('click', () => {
        const scraperId = item.dataset.id;
        this.runScraper(scraperId);
      });
    });
  }

  async runScraper(scraperId) {
    this.showLoading(true);
    
    try {
      const response = await this.apiCall(`/v1/scrapers/${scraperId}/run`, 'POST', {});
      
      if (response.ok) {
        this.showNotification('Scraper started successfully!', 'success');
        setTimeout(() => this.openDashboard(), 1500);
      } else {
        throw new Error('Failed to run scraper');
      }
    } catch (error) {
      console.error('Failed to run scraper:', error);
      this.showNotification('Failed to run scraper', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async createScraper() {
    const name = document.getElementById('scraper-name').value.trim();
    const prompt = document.getElementById('scraper-prompt').value.trim();

    if (!name || !prompt) {
      this.showNotification('Please fill in all fields', 'error');
      return;
    }

    if (!this.currentTab || !this.currentTab.url.startsWith('http')) {
      this.showNotification('Please navigate to a valid web page', 'error');
      return;
    }

    this.showLoading(true);

    try {
      const scraperData = {
        name,
        url: this.currentTab.url,
        prompt,
        engineHint: 'auto'
      };

      const response = await this.apiCall('/v1/scrapers', 'POST', scraperData);
      
      if (response.ok) {
        const result = await response.json();
        this.showNotification('Scraper created successfully!', 'success');
        this.hideCreateForm();
        
        // Optionally run the scraper immediately
        setTimeout(() => {
          if (confirm('Would you like to run this scraper now?')) {
            this.runScraper(result.scraperId);
          }
        }, 500);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create scraper');
      }
    } catch (error) {
      console.error('Failed to create scraper:', error);
      this.showNotification(`Failed to create scraper: ${error.message}`, 'error');
    } finally {
      this.showLoading(false);
    }
  }

  // UI State Management
  showMainView() {
    document.getElementById('create-form').classList.add('hidden');
    document.getElementById('scrapers-section').classList.add('hidden');
  }

  showCreateForm() {
    document.getElementById('create-form').classList.remove('hidden');
    document.getElementById('scrapers-section').classList.add('hidden');
    document.getElementById('scraper-name').focus();
  }

  hideCreateForm() {
    document.getElementById('create-form').classList.add('hidden');
    // Clear form
    document.getElementById('scraper-name').value = '';
    document.getElementById('scraper-prompt').value = '';
  }

  showScrapersView() {
    document.getElementById('create-form').classList.add('hidden');
    document.getElementById('scrapers-section').classList.remove('hidden');
  }

  showLoading(show) {
    const loadingEl = document.getElementById('loading');
    if (show) {
      loadingEl.classList.add('active');
    } else {
      loadingEl.classList.remove('active');
    }
  }

  // Utility Methods
  async apiCall(endpoint, method = 'GET', data = null) {
    const url = `${this.apiUrl}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    return fetch(url, options);
  }

  canScrapeCurrentPage() {
    return this.currentTab && 
           this.currentTab.url.startsWith('http') && 
           !this.currentTab.url.includes('chrome://') &&
           !this.currentTab.url.includes('chrome-extension://');
  }

  showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);

    // Hide and remove notification
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
  }

  openDashboard() {
    const dashboardUrl = this.apiUrl.replace(/:\d+/, ':3000'); // Assume frontend on port 3000
    chrome.tabs.create({ url: dashboardUrl });
  }

  openSettings() {
    chrome.runtime.openOptionsPage();
  }

  openHelp() {
    chrome.tabs.create({ url: 'https://docs.khoj.dev/extension' });
  }
}

// Initialize extension when popup loads
document.addEventListener('DOMContentLoaded', () => {
  new KhojExtension();

  // Add create scraper button functionality
  document.getElementById('quick-scrape').addEventListener('dblclick', () => {
    document.getElementById('create-form').classList.remove('hidden');
    document.getElementById('scraper-name').value = `Scraper for ${document.getElementById('current-title').textContent}`;
    document.getElementById('scraper-prompt').focus();
  });
});