// Khoj Chrome Extension Content Script

class KhojContentScript {
  constructor() {
    this.selectorMode = false;
    this.selectedElements = new Set();
    this.overlay = null;
    this.init();
  }

  init() {
    this.createOverlay();
    this.bindMessageListener();
    this.bindKeyboardShortcuts();
  }

  createOverlay() {
    // Create overlay for element selection
    this.overlay = document.createElement('div');
    this.overlay.id = 'khoj-selector-overlay';
    this.overlay.innerHTML = `
      <div class="khoj-overlay-header">
        <div class="khoj-overlay-title">🔍 Khoj Element Selector</div>
        <div class="khoj-overlay-actions">
          <button id="khoj-clear-selection">Clear</button>
          <button id="khoj-create-scraper">Create Scraper</button>
          <button id="khoj-close-selector">Close</button>
        </div>
      </div>
      <div class="khoj-overlay-info">
        <div>Selected: <span id="khoj-selected-count">0</span> elements</div>
        <div>Click elements to select them for scraping</div>
      </div>
    `;

    // Add overlay styles
    const style = document.createElement('style');
    style.textContent = `
      #khoj-selector-overlay {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 320px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        display: none;
        border: 2px solid #3b82f6;
      }

      .khoj-overlay-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px;
        border-radius: 10px 10px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .khoj-overlay-title {
        font-weight: 600;
        font-size: 16px;
      }

      .khoj-overlay-actions {
        display: flex;
        gap: 8px;
      }

      .khoj-overlay-actions button {
        padding: 6px 12px;
        border: 1px solid rgba(255, 255, 255, 0.3);
        background: rgba(255, 255, 255, 0.2);
        color: white;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
      }

      .khoj-overlay-actions button:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      .khoj-overlay-info {
        padding: 16px;
        color: #374151;
        line-height: 1.6;
      }

      .khoj-selected-element {
        outline: 3px solid #3b82f6 !important;
        outline-offset: 2px;
        background: rgba(59, 130, 246, 0.1) !important;
        cursor: pointer !important;
      }

      .khoj-hovering-element {
        outline: 2px dashed #10b981 !important;
        outline-offset: 1px;
        cursor: crosshair !important;
      }

      .khoj-element-badge {
        position: absolute;
        background: #3b82f6;
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        z-index: 1000000;
        pointer-events: none;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(this.overlay);

    // Bind overlay events
    document.getElementById('khoj-clear-selection').addEventListener('click', () => this.clearSelection());
    document.getElementById('khoj-create-scraper').addEventListener('click', () => this.createScraperFromSelection());
    document.getElementById('khoj-close-selector').addEventListener('click', () => this.toggleSelectorMode());
  }

  bindMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.action) {
        case 'quickScrape':
          this.performQuickScrape().then(sendResponse);
          return true; // Will respond asynchronously

        case 'toggleSelectorMode':
          this.toggleSelectorMode();
          sendResponse({ success: true });
          break;

        case 'getPageData':
          sendResponse(this.getPageData());
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    });
  }

  bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Alt + S to toggle selector mode
      if (e.altKey && e.key === 's') {
        e.preventDefault();
        this.toggleSelectorMode();
      }

      // Escape to exit selector mode
      if (e.key === 'Escape' && this.selectorMode) {
        e.preventDefault();
        this.toggleSelectorMode();
      }
    });
  }

  toggleSelectorMode() {
    this.selectorMode = !this.selectorMode;

    if (this.selectorMode) {
      this.enterSelectorMode();
    } else {
      this.exitSelectorMode();
    }
  }

  enterSelectorMode() {
    this.overlay.style.display = 'block';
    document.body.style.cursor = 'crosshair';
    
    // Add event listeners for element selection
    document.addEventListener('click', this.handleElementClick, true);
    document.addEventListener('mouseover', this.handleElementHover, true);
    document.addEventListener('mouseout', this.handleElementOut, true);

    this.showNotification('Element selector mode activated. Click elements to select them.', 'info');
  }

  exitSelectorMode() {
    this.overlay.style.display = 'none';
    document.body.style.cursor = '';
    
    // Remove event listeners
    document.removeEventListener('click', this.handleElementClick, true);
    document.removeEventListener('mouseover', this.handleElementHover, true);
    document.removeEventListener('mouseout', this.handleElementOut, true);

    // Clear visual indicators
    this.clearSelection();
    this.clearHoverEffect();
  }

  handleElementClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const element = e.target;
    
    if (element.closest('#khoj-selector-overlay')) {
      return; // Don't select our own overlay
    }

    if (this.selectedElements.has(element)) {
      // Deselect element
      this.selectedElements.delete(element);
      element.classList.remove('khoj-selected-element');
      this.removeBadge(element);
    } else {
      // Select element
      this.selectedElements.add(element);
      element.classList.add('khoj-selected-element');
      this.addBadge(element, this.selectedElements.size);
    }

    this.updateSelectionCount();
  };

  handleElementHover = (e) => {
    const element = e.target;
    
    if (element.closest('#khoj-selector-overlay') || this.selectedElements.has(element)) {
      return;
    }

    element.classList.add('khoj-hovering-element');
  };

  handleElementOut = (e) => {
    const element = e.target;
    element.classList.remove('khoj-hovering-element');
  };

  addBadge(element, number) {
    const badge = document.createElement('div');
    badge.className = 'khoj-element-badge';
    badge.textContent = number;
    badge.style.left = '0px';
    badge.style.top = '-24px';
    
    // Position badge relative to element
    const rect = element.getBoundingClientRect();
    badge.style.position = 'fixed';
    badge.style.left = rect.left + 'px';
    badge.style.top = (rect.top - 24) + 'px';
    
    document.body.appendChild(badge);
    element._khojBadge = badge;
  }

  removeBadge(element) {
    if (element._khojBadge) {
      document.body.removeChild(element._khojBadge);
      delete element._khojBadge;
    }
  }

  clearSelection() {
    this.selectedElements.forEach(element => {
      element.classList.remove('khoj-selected-element');
      this.removeBadge(element);
    });
    this.selectedElements.clear();
    this.updateSelectionCount();
  }

  clearHoverEffect() {
    document.querySelectorAll('.khoj-hovering-element').forEach(element => {
      element.classList.remove('khoj-hovering-element');
    });
  }

  updateSelectionCount() {
    const countEl = document.getElementById('khoj-selected-count');
    if (countEl) {
      countEl.textContent = this.selectedElements.size;
    }
  }

  async createScraperFromSelection() {
    if (this.selectedElements.size === 0) {
      this.showNotification('Please select at least one element first.', 'error');
      return;
    }

    // Generate selectors for selected elements
    const selectors = this.generateSelectorsFromElements();
    
    // Create a descriptive prompt based on selected elements
    const prompt = this.generatePromptFromElements();

    // Send data to extension popup or background script
    chrome.runtime.sendMessage({
      action: 'createScraperFromSelection',
      data: {
        url: window.location.href,
        title: document.title,
        selectors,
        prompt,
        selectedCount: this.selectedElements.size
      }
    });

    this.showNotification(`Creating scraper with ${this.selectedElements.size} selected elements...`, 'success');
    this.toggleSelectorMode();
  }

  generateSelectorsFromElements() {
    const selectors = {
      container: 'body',
      fields: {}
    };

    let fieldIndex = 1;
    this.selectedElements.forEach(element => {
      const selector = this.generateCSSSelector(element);
      const fieldName = this.guessFieldName(element, fieldIndex);
      selectors.fields[fieldName] = selector;
      fieldIndex++;
    });

    return selectors;
  }

  generateCSSSelector(element) {
    // Generate a unique CSS selector for the element
    const path = [];
    let current = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      if (current.id) {
        selector += '#' + current.id;
        path.unshift(selector);
        break; // ID is unique, we can stop here
      }

      if (current.className) {
        const classes = current.className.split(' ').filter(c => c.trim());
        if (classes.length > 0) {
          selector += '.' + classes.join('.');
        }
      }

      // Add nth-child if needed for uniqueness
      const siblings = Array.from(current.parentNode?.children || [])
        .filter(sibling => sibling.tagName === current.tagName);
      
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }

      path.unshift(selector);
      current = current.parentNode;
    }

    return path.join(' > ');
  }

  guessFieldName(element, index) {
    // Try to guess a meaningful field name based on element content/attributes
    const text = element.textContent?.trim() || '';
    const tagName = element.tagName.toLowerCase();
    
    // Check for common patterns
    if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3') {
      return 'title';
    }
    
    if (element.classList.contains('price') || text.includes('$') || text.includes('€')) {
      return 'price';
    }
    
    if (element.classList.contains('description') || tagName === 'p') {
      return 'description';
    }
    
    if (element.classList.contains('author') || element.classList.contains('by')) {
      return 'author';
    }
    
    if (element.classList.contains('date') || element.classList.contains('time')) {
      return 'date';
    }

    // Fallback to generic field name
    return `field${index}`;
  }

  generatePromptFromElements() {
    const elementTypes = Array.from(this.selectedElements).map(el => {
      const tagName = el.tagName.toLowerCase();
      const text = el.textContent?.trim().substring(0, 50) || '';
      return `${tagName}: "${text}"`;
    });

    return `Extract the following elements from this page: ${elementTypes.join(', ')}`;
  }

  async performQuickScrape() {
    // Capture page data for quick scraping
    const pageData = this.getPageData();
    
    // Try to identify main content areas automatically
    const contentSelectors = this.identifyContentAreas();
    
    return {
      success: true,
      data: {
        ...pageData,
        suggestedSelectors: contentSelectors
      }
    };
  }

  getPageData() {
    return {
      url: window.location.href,
      title: document.title,
      domain: window.location.hostname,
      html: document.documentElement.outerHTML,
      textContent: document.body.textContent?.trim(),
      meta: this.extractMetadata(),
      links: Array.from(document.querySelectorAll('a')).map(a => ({
        href: a.href,
        text: a.textContent?.trim()
      })).slice(0, 20), // Limit to first 20 links
      images: Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src,
        alt: img.alt
      })).slice(0, 10) // Limit to first 10 images
    };
  }

  extractMetadata() {
    const meta = {};
    
    // Extract common meta tags
    document.querySelectorAll('meta').forEach(tag => {
      const name = tag.getAttribute('name') || tag.getAttribute('property');
      const content = tag.getAttribute('content');
      
      if (name && content) {
        meta[name] = content;
      }
    });

    return meta;
  }

  identifyContentAreas() {
    // Automatically identify common content patterns
    const selectors = {
      container: 'body',
      fields: {}
    };

    // Look for common patterns
    const titleSelectors = ['h1', 'h2', '.title', '.headline', 'article h1'];
    const contentSelectors = ['article', '.content', '.post-content', 'main', '.description'];
    const priceSelectors = ['.price', '[class*="price"]', '[data-price]'];
    const authorSelectors = ['.author', '.by', '[class*="author"]'];

    // Find the best selector for each type
    titleSelectors.forEach(sel => {
      const el = document.querySelector(sel);
      if (el && !selectors.fields.title) {
        selectors.fields.title = sel;
      }
    });

    contentSelectors.forEach(sel => {
      const el = document.querySelector(sel);
      if (el && !selectors.fields.content) {
        selectors.fields.content = sel;
      }
    });

    priceSelectors.forEach(sel => {
      const el = document.querySelector(sel);
      if (el && !selectors.fields.price) {
        selectors.fields.price = sel;
      }
    });

    authorSelectors.forEach(sel => {
      const el = document.querySelector(sel);
      if (el && !selectors.fields.author) {
        selectors.fields.author = sel;
      }
    });

    return selectors;
  }

  showNotification(message, type = 'info') {
    // Create a temporary notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 1000000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Remove notification after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }
}

// Initialize content script
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new KhojContentScript());
} else {
  new KhojContentScript();
}