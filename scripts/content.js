// Notion page detector and review button
class SachinReview {
  constructor() {
    this.button = null;
    this.modal = null;
    this.isNotionPage = this.checkIfNotionPage();
    if (this.isNotionPage) {
      this.init();
    }
  }

  checkIfNotionPage() {
    return window.location.hostname.includes('notion.so') || 
           window.location.hostname.includes('notion.site');
  }

  init() {
    // Wait for page to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.createButton());
    } else {
      this.createButton();
    }

    // Handle navigation in SPA (Notion uses client-side routing)
    this.observeNavigation();
  }

  createButton() {
    // Remove existing button if present
    if (this.button) {
      this.button.remove();
    }

    // Create button element
    this.button = document.createElement('button');
    this.button.id = 'sachin-review-button';
    this.button.textContent = "Get Sachin's review on this page";
    this.button.className = 'sachin-review-btn';
    
    // Add click handler
    this.button.addEventListener('click', () => this.handleReviewClick());
    
    // Append to body
    document.body.appendChild(this.button);
  }

  async handleReviewClick() {
    if (this.button.disabled) return;

    try {
      this.button.disabled = true;
      this.button.textContent = 'Loading pages...';
      this.button.classList.add('loading');

      // Send message to background script to fetch pages
      const response = await chrome.runtime.sendMessage({ action: 'fetchPages' });
      
      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to fetch pages');
      }

      const pages = response.data?.pages || [];

      if (!Array.isArray(pages)) {
        console.error('Pages is not an array:', pages);
        throw new Error('Invalid response format: pages should be an array');
      }

      if (pages.length === 0) {
        throw new Error('No pages found');
      }

      // Show modal with page selection
      this.showPageSelectionModal(pages);
      
      // Reset button
      this.button.textContent = "Get Sachin's review on this page";
      this.button.classList.remove('loading');
      this.button.disabled = false;
    } catch (error) {
      console.error('Error fetching pages:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Show error state
      this.button.textContent = 'Error - Try again';
      this.button.classList.remove('loading');
      this.button.classList.add('error');
      
      // Reset after 3 seconds
      setTimeout(() => {
        this.button.textContent = "Get Sachin's review on this page";
        this.button.classList.remove('error');
        this.button.disabled = false;
      }, 3000);
    }
  }

  showPageSelectionModal(pages) {
    // Remove existing modal if present
    if (this.modal) {
      this.modal.remove();
    }

    // Create modal
    this.modal = document.createElement('div');
    this.modal.id = 'sachin-review-modal';
    this.modal.className = 'sachin-review-modal';
    
    this.modal.innerHTML = `
      <div class="sachin-review-modal-content">
        <div class="sachin-review-modal-header">
          <h2>Select a page to review</h2>
          <button class="sachin-review-modal-close">&times;</button>
        </div>
        <div class="sachin-review-modal-body">
          <div class="sachin-review-pages-list" id="sachin-pages-list">
            ${pages.map((page) => `
              <div class="sachin-review-page-item" data-page-id="${page.id}">
                <div class="sachin-review-page-title">${this.escapeHtml(page.title)}</div>
                <div class="sachin-review-page-meta">
                  <span class="sachin-review-page-status">${this.escapeHtml(page.status)}</span>
                  <span class="sachin-review-page-date">${page.created}</span>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="sachin-review-modal-footer">
            <button class="sachin-review-modal-cancel">Cancel</button>
          </div>
        </div>
      </div>
    `;

    // Add event listeners
    const closeBtn = this.modal.querySelector('.sachin-review-modal-close');
    const cancelBtn = this.modal.querySelector('.sachin-review-modal-cancel');
    const pageItems = this.modal.querySelectorAll('.sachin-review-page-item');

    closeBtn.addEventListener('click', () => this.closeModal());
    cancelBtn.addEventListener('click', () => this.closeModal());
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.closeModal();
      }
    });

    // Handle page selection
    pageItems.forEach(item => {
      item.addEventListener('click', () => {
        const pageId = item.dataset.pageId;
        this.processPage(pageId);
      });
    });

    // Append to body
    document.body.appendChild(this.modal);
  }

  async processPage(pageId) {
    if (!this.modal) return;

    try {
      // Show processing state
      const modalBody = this.modal.querySelector('.sachin-review-modal-body');
      modalBody.innerHTML = `
        <div class="sachin-review-processing">
          <div class="sachin-review-spinner"></div>
          <p>Processing page and adding comments...</p>
        </div>
      `;

      // Send message to background script to process page
      const response = await chrome.runtime.sendMessage({
        action: 'processPage',
        pageId: pageId,
        options: {
          model: 'openai',
          auto_select_child: true
        }
      });

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to process page');
      }

      const result = response.data;

      // Show success state
      modalBody.innerHTML = `
        <div class="sachin-review-result">
          <div class="sachin-review-result-success">✓</div>
          <h3>Review Complete!</h3>
          <div class="sachin-review-result-stats">
            <div class="sachin-review-stat">
              <span class="sachin-review-stat-label">Violations found:</span>
              <span class="sachin-review-stat-value">${result.violations_found || 0}</span>
            </div>
            <div class="sachin-review-stat">
              <span class="sachin-review-stat-label">Comments added:</span>
              <span class="sachin-review-stat-value">${result.comments_added || 0}</span>
            </div>
            <div class="sachin-review-stat">
              <span class="sachin-review-stat-label">Block comments:</span>
              <span class="sachin-review-stat-value">${result.block_comments || 0}</span>
            </div>
            <div class="sachin-review-stat">
              <span class="sachin-review-stat-label">Page comments:</span>
              <span class="sachin-review-stat-value">${result.page_comments || 0}</span>
            </div>
          </div>
          <p class="sachin-review-result-message">${this.escapeHtml(result.message || 'Processing completed')}</p>
          <button class="sachin-review-modal-close-btn">Close</button>
        </div>
      `;

      const closeBtn = modalBody.querySelector('.sachin-review-modal-close-btn');
      closeBtn.addEventListener('click', () => this.closeModal());

    } catch (error) {
      console.error('Error processing page:', error);
      
      // Show error state
      const modalBody = this.modal.querySelector('.sachin-review-modal-body');
      modalBody.innerHTML = `
        <div class="sachin-review-result">
          <div class="sachin-review-result-error">✗</div>
          <h3>Error Processing Page</h3>
          <p class="sachin-review-result-message error">${this.escapeHtml(error.message || 'An error occurred')}</p>
          <button class="sachin-review-modal-close-btn">Close</button>
        </div>
      `;

      const closeBtn = modalBody.querySelector('.sachin-review-modal-close-btn');
      closeBtn.addEventListener('click', () => this.closeModal());
    }
  }

  closeModal() {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  observeNavigation() {
    // Notion uses client-side routing, so we need to detect URL changes
    let lastUrl = location.href;
    
    new MutationObserver(() => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        // Recreate button if still on Notion
        if (this.checkIfNotionPage()) {
          setTimeout(() => this.createButton(), 500);
        } else if (this.button) {
          this.button.remove();
          this.button = null;
        }
        // Close modal if open
        this.closeModal();
      }
    }).observe(document, { subtree: true, childList: true });
  }
}

// Initialize
if (window.location.hostname.includes('notion.so') || window.location.hostname.includes('notion.site')) {
  window.sachinReview = new SachinReview();
  console.log('Sachin Review: Initialized on Notion page');
}
