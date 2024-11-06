(function (window, document) {
  'use strict';
  console.log('OpenPreview script starting execution');

  // Main OpenPreview object
  const OpenPreview = {
    //#region Vars
    projectId: null,
    isInitialized: false,
    windowUrl: null,
    maxRetries: 10,
    activeConnection: false,
    isConnected: false,
    comments: [],
    keysPressed: new Set(),
    toolbar: null,
    commentForm: null,
    commentsList: null,
    isSelectingCommentLocation: false,
    commentsVisible: true,
    settingsPopover: null,
    addCommentPopover: null,
    allowedDomains: [], // Add allowed domains
    token: null,
    ws: null,
    user: null,
    isToolbarExpanded: false,
    hasActiveInteraction: false,
    //#endregion
    fetchAllowedDomains: async function () {
      const token = this.token || this.getCookie('opv_token');

      if (!token && window.location.origin.includes('http://localhost:')) {
        return;
      }

      try {
        const res = await fetch(`https://api.openpreview.dev/allowed-domains`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Project-ID': this.projectId,
            'X-Domain': window.location.origin,
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            this.allowedDomains = data.map(domain => domain.domain);
            console.log('Allowed domains populated:', this.allowedDomains);
          } else {
            console.warn('Unexpected response format:', data);
          }
        } else {
          console.error('Failed to fetch allowed domains:', res.status);
        }
      } catch (error) {
        console.error('Error fetching allowed domains:', error);
      }
    },
    isPreviewDomain: function (origin) {
      const strippedOrigin = origin
        .replace(/^(https?:\/\/)/, '')
        .replace(/\/$/, ''); // Remove protocol and trailing slash
      const allowedDomain = this.allowedDomains.find(domain => {
        const strippedDomain = domain
          .replace(/^(https?:\/\/)/, '')
          .replace(/\/$/, ''); // Remove protocol and trailing slash
        const regex = new RegExp(`^[\\w-]+\\.${strippedDomain}$`);
        return regex.test(strippedOrigin);
      });
      return !!allowedDomain;
    },
    handleKeyboardShortcuts: function (e) {
      // Don't trigger shortcuts when typing in input/textarea
      this.keysPressed.add(e.key.toLowerCase());
      if (e.target.matches('input, textarea') || this.keysPressed.size > 1)
        return;

      switch (e.key.toLowerCase()) {
        case 'c':
          e.preventDefault(); // Prevent default 'c' behavior
          console.log('C key pressed, starting comment'); // Debug log
          this.startAddingComment();
          break;
        case 'escape':
          // Cancel current action
          if (this.isSelectingCommentLocation) {
            this.cancelAddingComment();
          }
          // Close any open popovers/menus
          if (this.settingsPopover?.style.display === 'block') {
            this.settingsPopover.style.display = 'none';
          }
          if (this.menuPopover?.style.display === 'block') {
            this.menuPopover.style.display = 'none';
          }
          if (this.commentsList?.style.display === 'block') {
            this.toggleCommentsList();
          }
          // Close any open comment details
          document.querySelectorAll('.opv-comment-details').forEach(detail => {
            detail.style.display = 'none';
          });
          break;
      }
    },
    handleKeyRemove: function (e) {
      this.keysPressed.delete(e.key.toLowerCase());
    },
    //#region Init Func
    init: function (config) {
      this.windowUrl = window.location.href.split(/[?#]/)[0];
      if (config && config.projectId) {
        this.projectId = config.projectId;
      } else {
        console.warn(
          'OpenPreview: initOpenPreview called without a project ID',
        );
      }

      if (this.isInitialized) {
        console.log('OpenPreview already initialized', config);

        // Ensure user validation and proper toolbar rendering
        this.token = this.getCookie('opv_token');
        this.verifyToken().then(isValid => {
          if (isValid) {
            console.log('Token verified successfully');
            this.token = this.getCookie('opv_token');
            this.updateLoginState(); // Update toolbar based on logged-in state
            this.loadComments(); // Load comments if authenticated
            this.initializeComponents();
            // Do not close or reinitialize WebSocket if already connected
            if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
              this.initWebSocket();
            }
          } else {
            console.log('Token verification failed or no token found');
            this.token = null;
            this.updateLoginState(); // Update toolbar to show login button
          }
        });

        return;
      }

      console.log('OpenPreview initializing...', config.projectId);
      this.projectId = config.projectId;

      // Set the token from cookie if available
      this.token = this.getCookie('opv_token');

      // Bind only the methods that exist and we need
      this.handleKeyboardShortcuts = this.handleKeyboardShortcuts.bind(this);
      this.handleKeyRemove = this.handleKeyRemove.bind(this);
      this.startAddingComment = this.startAddingComment.bind(this);
      this.showCommentForm = this.showCommentForm.bind(this);
      this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
      this.handlePageNavigation = this.handlePageNavigation.bind(this);

      // Add keyboard shortcut listener early
      document.addEventListener('keydown', this.handleKeyboardShortcuts);
      document.addEventListener('keyup', this.handleKeyRemove);

      // Handle visibility changes
      document.addEventListener(
        'visibilitychange',
        this.handleVisibilityChange,
      );
      window.addEventListener('popstate', this.handleVisibilityChange);
      // Handle page navigation
      window.addEventListener('popstate', this.handlePageNavigation);
      // Handle page unload to properly close the WebSocket
      window.addEventListener('beforeunload', () => {
        if (this.ws) {
          console.log('Closing WebSocket connection due to page unload');
          this.ws.close();
        }
      });

      if (new URL(location.href).searchParams.get('opv_user_id') && !this.token) {
        const sP = new URLSearchParams(new URL(location.href).search)
        sP.delete('opv_user_id')
        this.createToolbar(); 
      } else if (!this.token) return

      // Verify the token first
      this.verifyToken().then(isValid => {
        if (isValid) {
          console.log('Token verified successfully');
          this.token = this.getCookie('opv_token');

          // Fetch allowed domains after token is verified
          this.fetchAllowedDomains().then(() => {
            const weborigin = window.location.origin;
            const isAllowed = this.isPreviewDomain(weborigin);
            console.log(isAllowed, this.allowedDomains);
            if (!isAllowed) {
              console.log('Origin not allowed');
              return;
            }
            console.log('Origin allowed');

            // Initialize components after verifying token and allowed domain
            this.initializeComponents();

            // Load comments and initialize WebSocket
            this.loadComments();
            this.initWebSocket();

            // Set up event listeners
            this.setupEventListeners();
          });
        } else {
          console.log('Token verification failed or no token found');
          this.token = null;
          this.createToolbar(); // Create toolbar with login button if not logged in
        }
      });

      this.isInitialized = true;
      console.log('OpenPreview initialized with project ID:', this.projectId);
    },

    setProjectId: function (projectId) {
      this.projectId = projectId;
      if (!this.isInitialized && this.projectId) {
        this.init({ projectId: this.projectId });
      }
    },
    initializeComponents: function () {
      this.toolbar = null;
      this.createToolbar();
      this.createCommentForm();
      this.createCommentsList();
      this.updateEyeIcon();
      this.updateLoginState();
    },
    //#endregion

     login: async function () {
      const width = 500;
      const height = 600;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const loginWindow = window.open(
        'https://app.openpreview.dev/auth/login',
        'OpenPreview Login',
        `width=${width},height=${height},left=${left},top=${top}`,
      );

      return new Promise((resolve, reject) => {
        const handleMessage = event => {
          if (event.origin !== 'https://app.openpreview.dev') return;

          if (event.data.type === 'LOGIN_SUCCESS') {
            this.token = event.data.token;
            this.user = event.data.user;
            this.setCookie('opv_token', this.token, 7); // Save for 7 days
            this.onLoginSuccess();
            loginWindow.close();
            window.removeEventListener('message', handleMessage);
            resolve(event.data);
          }
        };

        window.addEventListener('message', handleMessage);

        loginWindow.onclose = () => {
          window.removeEventListener('message', handleMessage);
          reject(new Error('Login window closed'));
        };
      });
    },

    onLoginSuccess: function () {
      console.log('Login successful');
      this.showNotification({
        message: 'Logged in successfully!',
      });
      // Update UI or perform actions after successful login
      this.updateLoginState();
      this.initWebSocket();
      this.loadComments();
    },

    updateLoginState: function () {
      if (this.token) {
        // User is logged in, show all toolbar buttons
        this.toolbar.innerHTML = ''; // Clear existing content
        const leftGroup = this.createToolbarGroup([
          { icon: 'chat', title: 'Comments' },
          { icon: 'inbox', title: 'Inbox' },
        ]);
        const rightGroup = this.createToolbarGroup([
          { icon: 'eye', title: 'Preview' },
          { icon: 'settings', title: 'Settings' },
        ]);
        const status = this.statusSymbol(this.isConnected);
        this.toolbar.appendChild(leftGroup);
        this.toolbar.appendChild(rightGroup);
        this.toolbar.appendChild(status);
      } else {
        // User is not logged in, show only login button
        this.toolbar.innerHTML = ''; // Clear existing content
        this.loginButton = this.createLoginButton();
        this.toolbar.appendChild(this.loginButton);
      }
    },

    logout: function () {
      this.token = null;
      // Remove the token cookie
      this.setCookie('opv_token', '', -1); // Expire the cookie
      this.showNotification({
        message: 'Logged out successfully!',
      });
      this.updateLoginState();
      this.comments = []; // Clear comments
      this.renderComments(); // Re-render (clear) comments
    },

    // Add this new helper function to set cookies
    setCookie: function (name, value, days) {
      let expires = '';
      if (days) {
        const date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        expires = '; expires=' + date.toUTCString();
      }
      document.cookie = name + '=' + (value || '') + expires + '; path=/';
    },

    // Add this new helper function to get cookies
    getCookie: function (name) {
      const nameEQ = name + '=';
      const ca = document.cookie.split(';');
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
      }
      return null;
    },

    loadComments: async function () {
      console.log('Loading comments...');
      const token = this.token || this.getCookie('opv_token');

      if (!token) {
        console.log('No token available, please log in');
        return;
      }

      try {
        const res = await fetch(`https://api.openpreview.dev/comments`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Project-ID': this.projectId,
            'X-Domain': this.windowUrl.split(/[?#]/)[0],
          },
        });

        if (!res.ok) {
          if (res.status === 401) {
            this.showNotification({
              message: 'Session expired. Please log in again.',
            });
            this.logout();
            return;
          }
          throw new Error('Failed to fetch comments');
        }

        const comments = await res.json();
        this.comments = comments;

        this.renderComments();
      } catch (error) {
        console.error('Error loading comments:', error);
        this.showNotification({
          message: 'Failed to load comments. Please try again.',
        });
      }
    },

    initWebSocket: function () {
      if (this.ws) {
        console.log('Closing existing WebSocket connection');
        this.ws.close();
      }
      const token = this.token || this.getCookie('opv_token');
      this.ws = new WebSocket(`wss://api.openpreview.dev?token=${token}`);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.ws.send(
          JSON.stringify({
            type: 'join',
            projectId: this.projectId,
            url: this.windowUrl,
          }),
        );
        this.activeConnection = true;
        this.isConnected = true;
        this.updateConnectionStatus(true);
      };

      this.ws.onmessage = event => {
        const data = JSON.parse(event.data);
        if (data.type === 'newComment') {
          console.log('Received new comment:', data.comment);
          this.comments.push(data.comment);
          this.renderComment(data.comment);
          this.updateCommentsList();
        } else if (data.type === 'updateComment') {
          this.comments = this.comments.map(val => {
            if (val.id === data.comment.id) {
              console.log(val, data.comment);
              return data.comment;
            }
            return val;
          });
          this.renderComments();
        } else if (data.type === 'error') {
          console.error('WebSocket error:', data.message);
          this.showNotification({
            message: data.message,
            variant: 'destructive',
          });
        } else if (data.type === 'ping') {
          if (data.status) {
            this.isConnected = true;
            this.updateConnectionStatus(true);
          }
        }
      };

      this.ws.onerror = error => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.activeConnection = false;
        this.isConnected = false;

        // Set ws to null to avoid creating multiple WebSocket instances
        this.ws = null;
        this.updateConnectionStatus(false);
        if (!this.user) return 
        // Only reconnect if there's no active WebSocket
        if (this.maxRetries > 0 && !this.ws) {
          setTimeout(() => {
            this.initWebSocket();
          }, 1000);
          this.maxRetries--;
        } else if (this.maxRetries === 0) {
          this.showNotification({
            message:
              'There was an error connecting to websocket. Please close out of the website and reopen. If the problem continues, contact support.',
            variant: 'destructive',
            persist: true,
          });
          this.maxRetries = undefined;
        }
      };
    },

    updateConnectionStatus: function (connected) {
      const status = document.getElementById('opv-toolbar-status');
      if (status) {
        status.style.backgroundColor = connected ? '#66ff00' : '#FF0000';
      }
    },
    // New method to handle page navigation
    handlePageNavigation: function () {
      if (this.ws) {
        console.log('Closing WebSocket connection due to page navigation');
        this.ws.close();
      }
    },
    // New method to handle visibility changes and page navigation
    handleVisibilityChange: function () {
      if (document.visibilityState === 'visible') {
        // If page becomes visible and WebSocket is not connected, reconnect.
        if (!this.isConnected && !this.ws) {
          console.log('Page is visible, reconnecting WebSocket...');
          this.initWebSocket();
        }
      } else if (document.visibilityState === 'hidden') {
        // If page becomes hidden, close the WebSocket.
        if (this.ws) {
          console.log('Closing WebSocket connection due to visibility change');
          this.ws.close();
          this.ws = null;
        }
      }
    },

    verifyToken: async function () {
      const token = this.token || this.getCookie('opv_token');

      if (!token) {
        console.log('No token found');
        return false;
      }

      try {
        const response = await fetch(
          'https://api.openpreview.dev/auth/verify',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          if (response.status === 401) {
            // Token is invalid or expired, clear it and return false
            this.token = null;
            this.setCookie('opv_token', '', -1);
            return false;
          }
          throw new Error('Token verification failed');
        }

        const data = await response.json();
        if (data.valid) {
          this.user = data.user;
          return true;
        } else {
          return false;
        }
      } catch (error) {
        console.error('Error verifying token:', error);
        return false;
      }
    },

    renderComments: function () {
      console.log('Rendering all comments:', this.comments);
      // Clear existing comment markers and details
      document
        .querySelectorAll('.opv-comment-marker, .opv-comment-details')
        .forEach(el => el.remove());

      this.comments.forEach(comment => {
        console.log('Rendering comment:', comment);
        this.renderComment(comment);
      });
      this.updateCommentsList();
    },

    updateCommentPosition: function (
      marker,
      detailsBox,
      comment,
      targetElement,
    ) {
      if (!marker || !targetElement) return;

      const rect = targetElement.getBoundingClientRect();
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;

      // Calculate absolute position based on percentages
      const x = rect.left + scrollX + rect.width * comment.x_percent;
      const y = rect.top + scrollY + rect.height * comment.y_percent;

      // Update marker position
      marker.style.position = 'absolute';
      marker.style.left = `${x}px`;
      marker.style.top = `${y}px`;

      // Update details box position if it exists
      if (detailsBox) {
        detailsBox.style.position = 'absolute';
        this.positionDetailsBox(marker, detailsBox);
      }
    },

    positionDetailsBox: function (marker, detailsBox) {
      const markerRect = marker.getBoundingClientRect();
      const detailsRect = detailsBox.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;

      // Horizontal positioning
      let leftPosition;
      if (viewportWidth - markerRect.right >= detailsRect.width + 10) {
        // Position to the right if there's enough space
        leftPosition = markerRect.right + scrollX + 10;
      } else if (markerRect.left >= detailsRect.width + 10) {
        // Position to the left if there's not enough space on the right
        leftPosition = markerRect.left + scrollX - detailsRect.width - 10;
      } else {
        // Center horizontally if no space on sides
        leftPosition = scrollX + (viewportWidth - detailsRect.width) / 2;
      }

      // Vertical positioning
      let topPosition = markerRect.top + scrollY; // Align top of details box with top of marker

      // Ensure the details box doesn't go off-screen vertically
      if (topPosition + detailsRect.height > scrollY + viewportHeight) {
        // If it goes off the bottom, align the bottom of the details box with the bottom of the viewport
        topPosition = scrollY + viewportHeight - detailsRect.height - 10;
      }

      // Apply the calculated position
      detailsBox.style.left = `${leftPosition}px`;
      detailsBox.style.top = `${topPosition}px`;
    },

    createReplyForm: function (commentId) {
      const replyForm = document.createElement('div');
      replyForm.classList.add('reply-form');
      replyForm.style.cssText = `
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid #eee;
        `;

      const textarea = document.createElement('textarea');
      textarea.style.cssText = `
          width: 100%;
          height: 60px;
          margin-bottom: 8px;
          padding: 8px;
          border: 1px solid #E1E8ED;
          border-radius: 8px;
          font-size: 14px;
          resize: none;
        `;

      const submitBtn = document.createElement('button');
      submitBtn.textContent = 'Reply';
      submitBtn.style.cssText = `
          background-color: #1DA1F2;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 9999px;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
        `;

      submitBtn.addEventListener('click', () => {
        const replyContent = textarea.value.trim();
        if (replyContent) {
          this.addReply(commentId, replyContent);
          textarea.value = '';
        }
      });

      replyForm.appendChild(textarea);
      replyForm.appendChild(submitBtn);

      return replyForm;
    },

    addReply: function (commentId, replyContent) {
      const comment = this.comments.find(c => c.id === commentId);
      if (comment) {
        const reply = {
          id: Date.now().toString(), // Temporary ID, should be replaced by server-generated ID
          content: replyContent,
          user: this.user, // Assuming we have a this.user object with current user info
          created_at: new Date().toISOString(),
        };

        // Send the reply to the server
        this.ws.send(
          JSON.stringify({
            type: 'newReply',
            projectId: this.projectId,
            commentId: commentId,
            reply: reply,
            token: this.token,
          }),
        );

        // Optimistically add the reply locally
        if (!comment.replies) {
          comment.replies = [];
        }
        comment.replies.push(reply);

        this.updateCommentDetails(comment);
        this.updateCommentsList();
        this.showNotification({
          message: 'Reply added successfully!',
        });
      }
    },

    updateCommentDetails: function (comment) {
      const detailsBox = document.querySelector(
        `.opv-comment-details[data-comment-id="${comment.id}"]`,
      );
      if (detailsBox) {
        // Update replies section
        let repliesContainer = detailsBox.querySelector('.replies-container');
        if (!repliesContainer) {
          repliesContainer = document.createElement('div');
          repliesContainer.classList.add('replies-container');
          repliesContainer.style.cssText = `
              margin-top: 15px;
              padding-top: 15px;
              border-top: 1px solid #eee;
            `;
          detailsBox.insertBefore(
            repliesContainer,
            detailsBox.querySelector('.reply-form'),
          );
        }

        // Clear existing replies
        repliesContainer.innerHTML = '';

        // Add updated replies
        comment.replies.forEach(reply => {
          const replyElement = this.createReplyElement(reply);
          repliesContainer.appendChild(replyElement);
        });
      }
    },

    createReplyElement: function (reply) {
      const replyElement = document.createElement('div');
      replyElement.style.cssText = `
          margin-bottom: 10px;
          padding-left: 20px;
          border-left: 2px solid #E1E8ED;
        `;

      replyElement.innerHTML = `
          <div style="display: flex; align-items: center; margin-bottom: 5px;">
            <img src="${reply.user.avatar_url || 'https://i.pravatar.cc/150?img=8'}" alt="${reply.user.name}" style="width: 24px; height: 24px; border-radius: 50%; margin-right: 8px;">
            <div>
              <div style="font-weight: bold; font-size: 14px;">${reply.user.name}</div>
              <div style="font-size: 12px; color: #657786;">${new Date(reply.created_at).toLocaleString()}</div>
            </div>
          </div>
          <div style="font-size: 14px;">${reply.content}</div>
        `;

      return replyElement;
    },

    //#region Supporting Func
    handleResize: function () {
      // Recalculate positions of all comments
      this.comments.forEach(comment => {
        const marker = document.querySelector(
          `.opv-comment-marker[data-comment-id="${comment.id}"]`,
        );
        const detailsBox = document.querySelector(
          `.opv-comment-details[data-comment-id="${comment.id}"]`,
        );
        if (marker && detailsBox) {
          const targetElement = this.findTargetElement(comment.selector);
          if (targetElement) {
            this.updateCommentPosition(
              marker,
              detailsBox,
              comment,
              targetElement,
            );
          }
        }
      });
    },

    createToolbar: function () {
      if (this.toolbar) {
        console.log('Toolbar already created');
        return;
      }

      console.log('Creating toolbar...');
      this.toolbar = document.createElement('div');
      this.toolbar.id = 'opv-toolbar';

      const defaultHeight = '36px'; // Slightly reduced height

      this.toolbar.style.cssText = `
        position: fixed !important;
        bottom: 20px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        height: ${defaultHeight} !important;
        background-color: rgba(33, 47, 90, 0.9) !important;
        border: 2px solid rgb(33, 47, 90) !important;
        border-radius: 9999px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding-left: 2px;
        padding-right: 2px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
        z-index: 2147483646 !important;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1) !important;
        transition: all 0.3s ease !important;
      `;

      // Update media query for mobile
      this.toolbar.style.cssText += `
        @media (max-width: 768px) {
          bottom: 10px !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          width: auto !important;
          max-width: calc(100% - 20px) !important;
        }
      `;

      // Check if user is logged in
      if (this.token) {
        console.log('User is logged in, creating full toolbar');
        this.updateLoginState(); // Show full toolbar buttons if logged in
      } else {
        console.log('User is not logged in, showing login button only');
        this.loginButton = this.createLoginButton();
        this.toolbar.appendChild(this.loginButton);
      }

      document.body.appendChild(this.toolbar);
      console.log('Toolbar added to body');
    },
    statusSymbol: function (connected) {
      const symbol = document.createElement('div');
      symbol.id = 'opv-toolbar-status';
      symbol.style.cssText = `
        height: 10px;
        width: 10px;
        margin-left: 4px;
        margin-right: 4px;
        border-radius: 50%;
        background-color: ${connected ? '#66ff00' : '#FF0000'}
        `;
      return symbol;
    },
    createToolbarGroup: function (items) {
      const group = document.createElement('div');
      group.style.cssText = `
          display: flex !important;
          align-items: center !important;
        `;

      items.forEach((item, index) => {
        const button = this.createToolbarButton(item.icon, item.title);
        group.appendChild(button);

        if (index < items.length - 1) {
          const separator = this.createSeparator();
          group.appendChild(separator);
        }
      });

      return group;
    },

    createToolbarButton: function (icon, title) {
      const button = document.createElement('button');
      button.title = title;

      // Create tooltip element
      const tooltip = document.createElement('div');
      tooltip.style.cssText = `
          position: absolute;
          background-color: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-bottom: 8px;
          white-space: nowrap;
          opacity: 0;
          transition: opacity 0.2s ease;
          pointer-events: none;
          z-index: 2147483647;
        `;

      // Add keyboard shortcut to tooltip text
      let tooltipText = title;
      switch (icon) {
        case 'chat':
          tooltipText += ' (C)';
          break;
        // Add more shortcuts here as needed
      }
      tooltip.textContent = tooltipText;

      // Rest of the button styling
      button.style.cssText = `
          position: relative;
          width: 24px !important;
          height: 24px !important;
          border: none !important;
          background-color: transparent !important;
          color: white !important;
          cursor: pointer !important;
          font-size: 14px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          transition: all 0.3s ease !important;
          border-radius: 9999px !important;
          margin: 0 2px !important;
        `;

      button.innerHTML = this.getIconSVG(icon);

      // Show/hide tooltip on hover
      button.addEventListener('mouseenter', () => {
        button.style.backgroundColor = 'rgba(255, 255, 255, 0.1) !important';
        tooltip.style.opacity = '1';
      });

      button.addEventListener('mouseleave', () => {
        button.style.backgroundColor = 'transparent !important';
        tooltip.style.opacity = '0';
      });

      // Add tooltip to button
      button.appendChild(tooltip);

      // Update click event listeners for each button
      switch (icon) {
        case 'chat':
          button.addEventListener('click', () => this.startAddingComment());
          break;
        case 'inbox':
          button.addEventListener('click', () => this.toggleCommentsList());
          break;
        case 'eye':
          button.addEventListener('click', () => this.togglePreviewMode());
          break;
        case 'settings':
          button.addEventListener('click', () => this.showSettings());
          break;
        case 'drag':
          button.addEventListener('mousedown', () =>
            this.makeDraggable(this.toolbar),
          );
          break;
      }

      return button;
    },

    createSeparator: function () {
      const separator = document.createElement('div');
      separator.style.cssText = `
          width: 1px !important;
          height: 16px !important;
          background-color: rgba(255, 255, 255, 0.2) !important;
          margin: 0 2px !important;
        `;
      return separator;
    },

    getIconSVG: function (icon) {
      // You can replace these with actual SVG icons
      const icons = {
        chat: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-square"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
        inbox:
          '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-inbox"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
        eye: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>',
        settings:
          '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
        drag: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>',
      };
      return icons[icon] || '';
    },

    createButton: function (title) {
      const btn = document.createElement('button');
      btn.textContent = title;
      btn.style.cssText = `
          padding: 8px !important;
          margin: 0 5px !important;
          border: none !important;
          background-color: transparent !important;
          color: white !important;
          cursor: pointer !important;
          font-size: 14px !important;
          border-radius: 15px !important;
          transition: background-color 0.3s ease, color 0.3s ease !important;
          opacity: 0.9 !important;
        `;
      btn.addEventListener('mouseover', () => {
        btn.style.backgroundColor = 'rgba(255, 255, 255, 0.2) !important';
        btn.style.opacity = '1 !important';
      });
      btn.addEventListener('mouseout', () => {
        btn.style.backgroundColor = 'transparent !important';
        btn.style.opacity = '0.9 !important';
      });
      return btn;
    },

    createLoginButton: function () {
      const loginButton = document.createElement('button');
      loginButton.textContent = 'Login';
      loginButton.style.cssText = `
          background-color: #1DA1F2;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 9999px;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
          transition: all 0.3s ease;
          min-width: 70px; // Slightly reduced minimum width
          text-align: center;
          white-space: nowrap;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        `;

      // Add hover state for login button
      loginButton.addEventListener('mouseenter', () => {
        loginButton.style.backgroundColor = '#1991db';
        loginButton.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
      });

      loginButton.addEventListener('mouseleave', () => {
        loginButton.style.backgroundColor = '#1DA1F2';
        loginButton.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
      });

      loginButton.addEventListener('click', () => this.login());
      return loginButton;
    },

    createCommentForm: function () {
      this.commentForm = document.createElement('div');
      this.commentForm.id = 'opv-comment-form';
      this.commentForm.style.cssText = `
          position: fixed;
          background-color: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 2147483647;
          display: none;
          width: 300px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        `;

      const textarea = document.createElement('textarea');
      textarea.style.cssText = `
          width: 100%;
          height: 100px;
          margin-bottom: 10px;
          padding: 10px;
          border: 1px solid #e1e4e8;
          border-radius: 6px;
          font-size: 14px;
          resize: vertical;
        `;

      const submitBtn = document.createElement('button');
      submitBtn.textContent = 'Submit';
      submitBtn.style.cssText = `
          padding: 8px 16px;
          background-color: rgb(33, 47, 90);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background-color 0.3s ease;
        `;

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = `
          padding: 8px 16px;
          background-color: #f1f3f5;
          color: #333;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          margin-left: 10px;
          transition: background-color 0.3s ease;
        `;

      submitBtn.addEventListener('mouseover', () => {
        submitBtn.style.backgroundColor = 'rgb(45, 60, 110)';
      });
      submitBtn.addEventListener('mouseout', () => {
        submitBtn.style.backgroundColor = 'rgb(33, 47, 90)';
      });

      cancelBtn.addEventListener('mouseover', () => {
        cancelBtn.style.backgroundColor = '#e9ecef';
      });
      cancelBtn.addEventListener('mouseout', () => {
        cancelBtn.style.backgroundColor = '#f1f3f5';
      });

      this.commentForm.appendChild(textarea);
      this.commentForm.appendChild(submitBtn);
      this.commentForm.appendChild(cancelBtn);

      document.body.appendChild(this.commentForm);
    },

    makeDraggable: function (element) {
      let isDragging = false;
      let startX, startY;
      let startLeft, startBottom;

      const dragHandle = element.querySelector('button[title="Drag"]');
      if (!dragHandle) return;

      dragHandle.addEventListener('mousedown', startDragging);
      dragHandle.addEventListener('touchstart', startDragging);

      function startDragging(e) {
        e.preventDefault();
        isDragging = true;

        if (e.type === 'mousedown') {
          startX = e.clientX;
          startY = e.clientY;
        } else if (e.type === 'touchstart') {
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
        }

        startLeft = element.offsetLeft;
        startBottom = parseInt(element.style.bottom, 10) || 20; // Default to 20px if not set

        document.addEventListener('mousemove', drag);
        document.addEventListener('touchmove', drag);
        document.addEventListener('mouseup', stopDragging);
        document.addEventListener('touchend', stopDragging);
      }

      function drag(e) {
        if (!isDragging) return;

        let clientX, clientY;
        if (e.type === 'mousemove') {
          clientX = e.clientX;
          clientY = e.clientY;
        } else if (e.type === 'touchmove') {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
        }

        const deltaX = clientX - startX;
        const deltaY = startY - clientY;

        const newLeft = startLeft + deltaX;
        const newBottom = startBottom + deltaY;

        element.style.left = `${newLeft}px`;
        element.style.bottom = `${newBottom}px`;
        element.style.transform = 'none';
      }

      function stopDragging() {
        isDragging = false;
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('touchmove', drag);
        document.removeEventListener('mouseup', stopDragging);
        document.removeEventListener('touchend', stopDragging);
      }
    },

    togglePopover: function (popover) {
      console.log('Toggling popover', popover);
      if (popover.style.display === 'none' || popover.style.display === '') {
        popover.style.display = 'block';
        this.positionPopover(popover);
      } else {
        popover.style.display = 'none';
      }
      console.log('Popover display after toggle:', popover.style.display);
    },

    // Update the showSettings function to use togglePopover
    showSettings: function () {
      console.log('showSettings called');
      if (!this.settingsPopover) {
        this.createSettingsPopover();
      }
      this.togglePopover(this.settingsPopover);
    },

    // Update the toggleMenu function to use togglePopover
    toggleMenu: function () {
      if (!this.menuPopover) {
        this.createMenuPopover();
      }
      this.togglePopover(this.menuPopover);
    },
    setupEventListeners: function () {
      document.addEventListener('DOMContentLoaded', () => {
        const addCommentBtn = this.toolbar.querySelector('button');
        addCommentBtn.addEventListener('click', () => this.showCommentForm());

        const cancelBtn = this.commentForm.querySelectorAll('button')[1];
        cancelBtn.addEventListener('click', () => this.hideCommentForm());

        document.addEventListener('click', e => {
          if (e.target.closest('.opv-comment-marker')) {
            this.showCommentDetails(
              e.target.closest('.opv-comment-marker').dataset.commentId,
            );
          }
        });
      });

      document.addEventListener('click', e => {
        if (
          this.settingsPopover &&
          !this.settingsPopover.contains(e.target) &&
          !e.target.closest('button[title="Settings"]')
        ) {
          this.settingsPopover.style.display = 'none';
        }
      });
    },

    hideCommentForm: function () {
      this.commentForm.style.display = 'none';
    },

    addComment: function () {
      console.log('addComment called');
      const textarea = this.commentForm.querySelector('textarea');
      const commentText = textarea.value.trim();
      if (!commentText) return;

      const targetElement = this.getTargetElement();
      if (!targetElement) {
        console.error('Unable to find target element for comment');
        return;
      }

      const x = parseFloat(this.commentForm.dataset.x);
      const y = parseFloat(this.commentForm.dataset.y);

      const positionData = this.calculateRelativePosition(targetElement, x, y);

      const comment = {
        content: commentText,
        selector: positionData.selector,
        x_percent: positionData.x_percent,
        y_percent: positionData.y_percent,
        url: this.windowUrl,
        page_title: positionData.page_title,
        screen_width: positionData.screen_width,
        screen_height: positionData.screen_height,
        device_pixel_ratio: positionData.device_pixel_ratio,
        deployment_url: positionData.deployment_url,
        user_agent: positionData.user_agent,
        draft_mode: positionData.draft_mode,
        node_id: positionData.node_id,
      };

      console.log('Comment object to be sent to server:', comment);

      this.ws.send(
        JSON.stringify({
          type: 'newComment',
          projectId: this.projectId,
          url: this.windowUrl,
          comment: comment,
          token: this.token,
        }),
      );

      this.hideCommentForm();
      textarea.value = '';
      this.showNotification({
        message: 'Comment added successfully!',
      });
    },

    getUniqueSelector: function (element) {
      if (!element || element === document.body) {
        return 'body';
      }

      let path = [];
      let current = element;

      while (current) {
        if (current === document.body || current === document.documentElement) {
          break;
        }

        let selector = current.tagName.toLowerCase();

        // Add nth-of-type for elements with same tag siblings
        if (current.parentNode) {
          const siblings = Array.from(current.parentNode.children);
          const similarSiblings = siblings.filter(
            e => e.tagName === current.tagName,
          );
          if (similarSiblings.length > 1) {
            const index = similarSiblings.indexOf(current) + 1;
            selector += `:nth-of-type(${index})`;
          }
        }

        path.unshift(selector);
        current = current.parentNode;
      }

      path.unshift('body');
      return path.join(' > ');
    },

    findTargetElement: function (selectorString) {
      if (!selectorString) {
        console.warn('No selector provided for findTargetElement');
        return document.body;
      }

      try {
        // Try to find element using the selector directly
        const element = document.querySelector(selectorString);
        if (element) {
          return element;
        }

        console.warn('Target element not found, falling back to body');
        return document.body;
      } catch (error) {
        console.error('Error finding target element:', error);
        return document.body;
      }
    },

    calculateRelativePosition: function (element, x, y) {
      const rect = element.getBoundingClientRect();

      const x_percent = (x - rect.left) / rect.width;
      const y_percent = (y - rect.top) / rect.height;

      return {
        selector: this.getUniqueSelector(element),
        x_percent: x_percent,
        y_percent: y_percent,
        page_title: document.title,
        screen_width: Math.round(window.innerWidth),
        screen_height: Math.round(window.innerHeight),
        device_pixel_ratio: window.devicePixelRatio,
        deployment_url: window.location.host,
        user_agent: navigator.userAgent,
        draft_mode: false,
        node_id: null,
      };
    },

    getTargetElement: function () {
      const x = parseFloat(this.commentForm.dataset.x);
      const y = parseFloat(this.commentForm.dataset.y);
      return document.elementFromPoint(x, y);
    },

    showCommentDetails: function (commentId) {
      const detailsBox = document.querySelector(
        `.opv-comment-details[data-comment-id="${commentId}"]`,
      );
      const marker = document.querySelector(
        `.opv-comment-marker[data-comment-id="${commentId}"]`,
      );

      if (detailsBox && marker) {
        const isVisible = detailsBox.style.display === 'block';
        detailsBox.style.display = isVisible ? 'none' : 'block';

        if (!isVisible) {
          this.positionDetailsBox(marker, detailsBox);
        }
      }
    },

    showNotification: function ({ message, variant = 'default', persist }) {
      const notification = document.createElement('div');
      notification.textContent = message;
      const colorVariant = () => {
        switch (variant) {
          case 'destructive':
            return '#c70000';
          default:
            return '#4CAF50';
        }
      };
      console.log(message, colorVariant(), persist);

      notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          max-width: 350px;
          flex-wrap: wrap;
          background-color: ${colorVariant()};
          color: white;
          padding: 15px;
          border-radius: 5px;
          z-index: 2147483647;
          animation: fadeInOut 3s forwards;
        `;

      notification.style.cssText += `
          @media (max-width: 768px) {
            left: 10px;
            right: 10px;
            width: calc(100% - 20px);
            top: 10px;
          }
        `;

      const style = document.createElement('style');
      if (!persist)
        style.textContent = `
            @keyframes fadeInOut {
              0% { opacity: 0; }
              10% { opacity: 1; }
              90% { opacity: 1; }
              100% { opacity: 0; }
            }
          `;
      document.head.appendChild(style);

      document.body.appendChild(notification);
      if (!persist)
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 3000);
    },

    createCommentsList: function () {
      this.commentsList = document.createElement('div');
      this.commentsList.id = 'opv-comments-list';
      this.commentsList.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          width: 300px;
          max-height: 80vh;
          overflow-y: auto;
          background-color: white;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          z-index: 2147483645;
          display: none;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        `;
      document.body.appendChild(this.commentsList);
    },

    toggleCommentsList: function () {
      const isVisible = this.commentsList.style.display === 'block';
      this.commentsList.style.display = isVisible ? 'none' : 'block';
      if (!isVisible) {
        this.updateCommentsList();
        console.log('Showing comments list / inbox');
      } else {
        console.log('Hiding comments list / inbox');
      }
    },

    updateCommentsList: function () {
      this.commentsList.innerHTML = '';
      this.comments
        .filter(a => {
          const commentPath = new URL(a.url).pathname;
          const currentPath = new URL(this.windowUrl).pathname;
          return commentPath === currentPath;
        })
        .forEach(comment => {
          const commentElement = this.createCommentElement(comment);
          this.commentsList.appendChild(commentElement);
        });
    },

    createCommentElement: function (comment) {
      const commentElement = document.createElement('div');
      commentElement.style.cssText = `
          margin-bottom: 16px;
          padding: 12px;
          background-color: #f7f9fa;
          border-radius: 8px;
          cursor: pointer;
          transition: background-color 0.3s ease;
        `;
      commentElement.addEventListener('mouseover', () => {
        commentElement.style.backgroundColor = '#edf1f3';
      });
      commentElement.addEventListener('mouseout', () => {
        commentElement.style.backgroundColor = '#f7f9fa';
      });
      commentElement.addEventListener('click', () => {
        const marker = document.querySelector(
          `.opv-comment-marker[data-comment-id="${comment.id}"]`,
        );
        if (marker) {
          // Scroll to the marker
          marker.scrollIntoView({ behavior: 'smooth', block: 'center' });

          // Highlight the marker temporarily
          const originalColor = marker.style.backgroundColor;
          marker.style.backgroundColor = '#FFD700'; // Bright yellow
          setTimeout(() => {
            marker.style.backgroundColor = originalColor;
          }, 1500); // Reset after 1.5 seconds

          // Show comment details
          this.showCommentDetails(comment.id);
        }

        // Close the comments list
        this.toggleCommentsList();
      });

      const userInfo = document.createElement('div');
      userInfo.style.cssText = `
          display: flex;
          align-items: center;
          margin-bottom: 8px;
        `;

      const avatar = document.createElement('img');
      avatar.src = comment.user.avatar_url;
      avatar.style.cssText = `
          width: 24px;
          height: 24px;
          border-radius: 50%;
          margin-right: 8px;
        `;

      const userName = document.createElement('span');
      userName.textContent = comment.user.name;
      userName.style.cssText = `
          font-weight: bold;
          font-size: 14px;
        `;

      userInfo.appendChild(avatar);
      userInfo.appendChild(userName);

      const content = document.createElement('div');
      content.textContent = comment.content;
      content.style.cssText = `
          font-size: 14px;
          line-height: 1.4;
          margin-bottom: 8px;
        `;

      const timestamp = document.createElement('div');
      timestamp.textContent = new Date(comment.created_at).toLocaleString();
      timestamp.style.cssText = `
          font-size: 12px;
          color: #657786;
          margin-bottom: 8px;
        `;

      commentElement.appendChild(userInfo);
      commentElement.appendChild(content);
      commentElement.appendChild(timestamp);

      // Add replies to the comment element
      if (comment.replies && comment.replies.length > 0) {
        const repliesContainer = document.createElement('div');
        repliesContainer.style.cssText = `
            margin-left: 20px;
            border-left: 2px solid #E1E8ED;
            padding-left: 12px;
          `;

        comment.replies.forEach(reply => {
          const replyElement = this.createReplyElementForList(reply);
          repliesContainer.appendChild(replyElement);
        });

        commentElement.appendChild(repliesContainer);
      }

      return commentElement;
    },

    createReplyElement: function (reply) {
      const replyElement = document.createElement('div');
      replyElement.style.cssText = `
          margin-bottom: 16px;
          padding-left: 24px;
          position: relative;
        `;

      const threadLine = document.createElement('div');
      threadLine.style.cssText = `
          position: absolute;
          left: 20px;
          top: 0;
          bottom: 0;
          width: 2px;
          background-color: #E1E8ED;
        `;
      replyElement.appendChild(threadLine);

      const userInfo = document.createElement('div');
      userInfo.style.cssText = `
          display: flex;
          align-items: center;
          margin-bottom: 8px;
        `;

      const avatar = document.createElement('img');
      avatar.src = reply.user.avatar_url;
      avatar.style.cssText = `
          width: 32px;
          height: 32px;
          border-radius: 50%;
          margin-right: 8px;
        `;

      const userName = document.createElement('span');
      userName.textContent = reply.user.name;
      userName.style.cssText = `
          font-weight: bold;
          font-size: 14px;
        `;

      userInfo.appendChild(avatar);
      userInfo.appendChild(userName);

      const content = document.createElement('div');
      content.textContent = reply.content;
      content.style.cssText = `
          font-size: 14px;
          line-height: 1.4;
          margin-bottom: 4px;
        `;

      const timestamp = document.createElement('div');
      timestamp.textContent = new Date(reply.created_at).toLocaleString();
      timestamp.style.cssText = `
          font-size: 12px;
          color: #657786;
        `;

      replyElement.appendChild(userInfo);
      replyElement.appendChild(content);
      replyElement.appendChild(timestamp);

      return replyElement;
    },

    createReplyForm: function (commentId) {
      const replyForm = document.createElement('div');
      replyForm.style.cssText = `
          margin-top: 16px;
          border-top: 1px solid #E1E8ED;
          padding-top: 16px;
        `;

      const textarea = document.createElement('textarea');
      textarea.style.cssText = `
          width: 100%;
          height: 80px;
          margin-bottom: 8px;
          padding: 8px;
          border: 1px solid #E1E8ED;
          border-radius: 8px;
          font-size: 14px;
          resize: none;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
          transition: border 0.3s ease, box-shadow 0.3s ease;
        `;

      textarea.addEventListener('focus', () => {
        textarea.style.border = '1px solid #1DA1F2';
        textarea.style.boxShadow =
          'inset 0 1px 2px rgba(0, 0, 0, 0.05), 0 0 0 2px rgba(29, 161, 242, 0.2)';
      });

      textarea.addEventListener('blur', () => {
        textarea.style.border = '1px solid #E1E8ED';
        textarea.style.boxShadow = 'inset 0 1px 2px rgba(0, 0, 0, 0.05)';
      });

      const submitBtn = document.createElement('button');
      submitBtn.textContent = 'Reply';
      submitBtn.style.cssText = `
          background-color: #1DA1F2;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 9999px;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
          transition: background-color 0.3s ease;
        `;

      submitBtn.addEventListener('mouseover', () => {
        submitBtn.style.backgroundColor = '#1A91DA';
      });

      submitBtn.addEventListener('mouseout', () => {
        submitBtn.style.backgroundColor = '#1DA1F2';
      });

      submitBtn.addEventListener('click', () => {
        const replyContent = textarea.value.trim();
        if (replyContent) {
          this.addReply(commentId, replyContent);
          textarea.value = '';
        }
      });

      replyForm.appendChild(textarea);
      replyForm.appendChild(submitBtn);

      return replyForm;
    },

    addReply: function (commentId, replyContent) {
      const comment = this.comments.find(c => c.id === commentId);
      if (comment) {
        const reply = {
          id: Date.now().toString(),
          content: replyContent,
          user: {
            name: 'John Doe',
            avatar: 'https://i.pravatar.cc/150?img=8',
          },
          timestamp: new Date().toISOString(),
        };
        comment.replies.push(reply);
        this.updateCommentDetails(comment);
        this.updateCommentsList();
        this.showNotification({ message: 'Reply added successfully!' });
      }
    },

    updateCommentDetails: function (comment) {
      const detailsBox = document.querySelector(
        `.opv-comment-details[data-comment-id="${comment.id}"]`,
      );
      if (detailsBox) {
        // Update replies section
        let repliesContainer = detailsBox.querySelector('.replies-container');
        if (!repliesContainer) {
          repliesContainer = document.createElement('div');
          repliesContainer.classList.add('replies-container');
          repliesContainer.style.cssText = `
              margin-top: 15px;
              padding-top: 15px;
              border-top: 1px solid #eee;
            `;
          detailsBox.insertBefore(
            repliesContainer,
            detailsBox.querySelector('.reply-form'),
          );
        }

        // Clear existing replies
        repliesContainer.innerHTML = '';

        // Add updated replies
        comment.replies.forEach(reply => {
          const replyElement = document.createElement('div');
          replyElement.style.marginBottom = '10px';
          replyElement.innerHTML = `
              <div style="display: flex; align-items: center; margin-bottom: 5px;">
                <img src="${reply.user.avatar_url}" alt="${reply.user.name}" style="width: 30px; height: 30px; border-radius: 50%; margin-right: 10px;">
                <div>
                  <div style="font-weight: bold;">${reply.user.name}</div>
                  <div style="font-size: 0.8em; color: #666;">${new Date(reply.created_at).toLocaleString()}</div>
                </div>
              </div>
              <div style="margin-left: 40px;">${reply.content}</div>
            `;
          repliesContainer.appendChild(replyElement);
        });

        // Update color picker value
        const colorPicker = detailsBox.querySelector('input[type="color"]');
        if (colorPicker) {
          colorPicker.value = comment.color || '#1DA1F2';
        }
      }
    },

    toggleResolveComment: function (commentId) {
      const comment = this.comments.find(c => c.id === commentId);
      if (comment) {
        comment.resolved = !comment.resolved;
        this.updateCommentMarker(comment);
        this.updateCommentDetails(comment);
        this.updateCommentsList();
        this.showNotification({
          message: `Comment ${comment.resolved ? 'resolved' : 'unresolved'}`,
        });
      }
    },

    updateCommentMarker: function (comment) {
      const marker = document.querySelector(
        `.opv-comment-marker[data-comment-id="${comment.id}"]`,
      );
      if (marker) {
        marker.style.backgroundColor = comment.resolved ? '#4CAF50' : '#1e3a8a';
      }
    },

    createReplyElementForList: function (reply) {
      const replyElement = document.createElement('div');
      replyElement.style.cssText = `
          margin-top: 8px;
          font-size: 13px;
        `;

      const replyUserInfo = document.createElement('span');
      replyUserInfo.textContent = reply.user.name;
      replyUserInfo.style.fontWeight = 'bold';

      const replyContent = document.createElement('span');
      replyContent.textContent = `: ${reply.content}`;

      replyElement.appendChild(replyUserInfo);
      replyElement.appendChild(replyContent);

      return replyElement;
    },

    // Add these new methods to the OpenPreview object

    showInbox: function () {
      console.log('Showing inbox (comments list)');
      this.toggleCommentsList();
    },

    togglePreviewMode: function () {
      this.commentsVisible = !this.commentsVisible;
      const commentMarkers = document.querySelectorAll('.opv-comment-marker');
      const commentDetails = document.querySelectorAll('.opv-comment-details');

      commentMarkers.forEach(marker => {
        marker.style.display = this.commentsVisible ? 'flex' : 'none';
      });

      commentDetails.forEach(details => {
        details.style.display = 'none'; // Close all open comment details
      });

      console.log(`Comments visibility ${this.commentsVisible ? 'on' : 'off'}`);
      this.updateEyeIcon();
    },

    updateEyeIcon: function () {
      const eyeButton = this.toolbar.querySelector('button[title="Preview"]');
      if (eyeButton) {
        eyeButton.innerHTML = this.getIconSVG(
          this.commentsVisible ? 'eye' : 'eye-off',
        );
      }
    },

    showSettings: function () {
      console.log('showSettings called');
      if (!this.settingsPopover) {
        console.log('creating settingsPopover');
        this.createSettingsPopover();
      }
      console.log('settingsPopover created', this.settingsPopover);
      this.settingsPopover.style.display = 'block';
      this.positionPopover(this.settingsPopover);
    },

    createSettingsPopover: function () {
      this.settingsPopover = this.createPopover('Settings', [
        { label: 'Notification Sound', type: 'checkbox' },
        { label: 'Email Notifications', type: 'checkbox' },
        {
          label: 'Theme',
          type: 'select',
          options: ['Light', 'Dark', 'System'],
        },
        { label: 'My Profile', type: 'button' },
        { label: 'Help Center', type: 'button' },
        { label: 'Login', type: 'button', onClick: () => this.login() },
        { label: 'Logout', type: 'button', onClick: () => this.logout() },
      ]);
    },

    toggleMenu: function () {
      if (!this.menuPopover) {
        this.createMenuPopover();
      }
      console.log(
        'Showing menu ',
        this.menuPopover,
        this.menuPopover.style.display,
      );
      if (this.menuPopover.style.display === 'none') {
        this.menuPopover.style.display = 'block';
        this.positionPopover(this.menuPopover);
      } else {
        this.menuPopover.style.display = 'none';
      }
    },

    createMenuPopover: function () {
      this.menuPopover = this.createPopover('Menu', [
        { label: 'My Profile', type: 'button' },
        { label: 'Help Center', type: 'button' },
        { label: 'Logout', type: 'button' },
      ]);
    },

    createPopover: function (title, items) {
      const toolbarHeight = 48; // Height of the toolbar
      const cornerRadius = toolbarHeight / 2; // Calculate corner radius based on toolbar height

      const popover = document.createElement('div');
      popover.style.cssText = `
          position: fixed;
          bottom: ${toolbarHeight + 10}px; // Position above the toolbar with a small gap
          left: 50%;
          transform: translateX(-50%);
          width: 300px;
          background-color: rgb(33, 47, 90); // Solid color, matching the toolbar
          border: 1px solid rgb(33, 47, 90);
          border-radius: ${cornerRadius}px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          padding: 16px;
          display: none;
          z-index: 2147483647;
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        `;

      popover.style.cssText += `
          @media (max-width: 768px) {
            width: 90%;
            max-width: 300px;
            left: 50% !important;
            transform: translateX(-50%) !important;
          }
        `;

      const titleElement = document.createElement('h3');
      titleElement.textContent = title;
      titleElement.style.cssText = `
          margin: 0 0 16px 0;
          font-size: 18px;
          font-weight: bold;
          color: white;
        `;
      popover.appendChild(titleElement);

      items.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.style.marginBottom = '12px';

        if (item.type === 'checkbox') {
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.id = item.label.toLowerCase().replace(/\s/g, '-');
          const label = document.createElement('label');
          label.htmlFor = checkbox.id;
          label.textContent = item.label;
          label.style.color = 'white';
          label.style.marginLeft = '8px';
          itemElement.appendChild(checkbox);
          itemElement.appendChild(label);
        } else if (item.type === 'select') {
          const select = document.createElement('select');
          select.id = item.label.toLowerCase().replace(/\s/g, '-');
          select.style.cssText = `
              width: 100%;
              padding: 4px;
              background-color: rgba(255, 255, 255, 0.1);
              color: white;
              border: 1px solid rgba(255, 255, 255, 0.3);
              border-radius: 4px;
            `;
          item.options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.toLowerCase();
            optionElement.textContent = option;
            select.appendChild(optionElement);
          });
          const label = document.createElement('label');
          label.htmlFor = select.id;
          label.textContent = item.label;
          label.style.color = 'white';
          label.style.display = 'block';
          label.style.marginBottom = '4px';
          itemElement.appendChild(label);
          itemElement.appendChild(select);
        } else if (item.type === 'button') {
          const button = document.createElement('button');
          button.textContent = item.label;
          button.style.cssText = `
              width: 100%;
              padding: 8px;
              background-color: rgba(255, 255, 255, 0.1);
              color: white;
              border: 1px solid rgba(255, 255, 255, 0.3);
              border-radius: 4px;
              cursor: pointer;
              transition: background-color 0.3s ease;
            `;
          button.addEventListener('mouseover', () => {
            button.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
          });
          button.addEventListener('mouseout', () => {
            button.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          });
          if (item.onClick) {
            button.addEventListener('click', item.onClick);
          }
          itemElement.appendChild(button);
        } else if (item.type === 'message') {
          itemElement.textContent = item.label;
          itemElement.style.color = 'white';
        }

        popover.appendChild(itemElement);
      });

      document.body.appendChild(popover);
      return popover;
    },

    togglePopover: function (popover) {
      console.log('togglePopover called', popover.style.display === 'none');
      if (popover.style.display === 'none') {
        popover.style.display = 'block';
      } else {
        popover.style.display = 'none';
      }
    },

    positionPopover: function (popover) {
      const toolbarRect = this.toolbar.getBoundingClientRect();
      const popoverRect = popover.getBoundingClientRect();

      // Position the popover just above the toolbar
      popover.style.bottom = `${window.innerHeight - toolbarRect.top + 10}px`;

      // Ensure the popover doesn't go off-screen on the left or right
      const leftPosition =
        toolbarRect.left + (toolbarRect.width - popoverRect.width) / 2;
      const rightEdge = leftPosition + popoverRect.width;

      if (leftPosition < 10) {
        popover.style.left = '10px';
        popover.style.transform = 'none';
      } else if (rightEdge > window.innerWidth - 10) {
        popover.style.left = 'auto';
        popover.style.right = '10px';
        popover.style.transform = 'none';
      } else {
        popover.style.left = '50%';
        popover.style.transform = 'translateX(-50%)';
      }
    },

    // Add this new function
    cancelAddingComment: function () {
      console.log('Cancelling comment addition');
      this.isSelectingCommentLocation = false;
      document.body.style.cursor = 'default';

      if (this.addCommentPopover) {
        this.addCommentPopover.remove();
        this.addCommentPopover = null;
      }

      if (this.overlay) {
        this.overlay.remove();
        this.overlay = null;
      }
    },
    // Add this new method
    startAddingComment: function () {
      console.log('Starting to add a comment');

      // If already in comment adding mode, cancel it
      if (this.isSelectingCommentLocation) {
        this.cancelAddingComment();
        return;
      }

      if (this.addCommentPopover) {
        this.addCommentPopover.remove();
      }
      this.addCommentPopover = this.createPopover('Add Comment', [
        {
          label: 'Click anywhere to place your comment (ESC to cancel)',
          type: 'message',
        },
      ]);
      this.addCommentPopover.style.display = 'block';
      this.positionPopover(this.addCommentPopover);

      this.isSelectingCommentLocation = true;
      document.body.style.cursor = 'crosshair';

      // Create and show the overlay with pointer events enabled
      this.overlay = document.createElement('div');
      this.overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: transparent;
          z-index: 2147483646;
          cursor: crosshair;
        `;

      // Add escape key handler specifically for the overlay
      const escHandler = e => {
        if (e.key === 'Escape') {
          this.cancelAddingComment();
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);

      // Add click handler directly to overlay
      this.overlay.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();

        const x = e.clientX;
        const y = e.clientY;

        // Clean up overlay and comment placement mode
        this.cancelAddingComment();
        document.removeEventListener('keydown', escHandler);

        // Show comment form at click position
        if (
          typeof x === 'number' &&
          typeof y === 'number' &&
          !isNaN(x) &&
          !isNaN(y)
        ) {
          this.showCommentForm(x, y);
        }
      });

      // Prevent any clicks from reaching elements below
      this.overlay.addEventListener('mousedown', e => {
        e.preventDefault();
        e.stopPropagation();
      });

      document.body.appendChild(this.overlay);

      // Hide the addCommentPopover after a delay
      setTimeout(() => {
        if (this.addCommentPopover) {
          this.addCommentPopover.remove();
          this.addCommentPopover = null;
        }
      }, 2000);
    },

    // Remove the old click handler since we're handling clicks in the overlay
    handleCommentPlacement: null,

    // Modify the showCommentForm method
    showCommentForm: function (x, y) {
      console.log('Showing comment form at coordinates:', x, y);

      if (
        typeof x !== 'number' ||
        typeof y !== 'number' ||
        isNaN(x) ||
        isNaN(y)
      ) {
        console.error('Invalid coordinates for comment placement');
        return;
      }

      const targetElement = document.elementFromPoint(x, y);
      if (!targetElement) {
        console.error('Unable to find target element for comment');
        return;
      }

      const { selector, x_percent, y_percent } = this.calculateRelativePosition(
        targetElement,
        x,
        y,
      );

      const tempComment = {
        id: `temp-${crypto.randomUUID()}`, // Use UUID for consistency
        content: '',
        selector: selector,
        x_percent: x_percent,
        y_percent: y_percent,
        url: this.windowUrl,
        user: this.user || {
          name: 'Anonymous',
          avatar_url: 'https://i.pravatar.cc/150?img=8',
        },
        created_at: new Date().toISOString(),
        replies: [],
        color: '#1DA1F2',
        page_title: document.title,
        screen_width: Math.round(window.innerWidth),
        screen_height: Math.round(window.innerHeight),
        device_pixel_ratio: window.devicePixelRatio,
        deployment_url: window.location.host,
        user_agent: navigator.userAgent,
        draft_mode: true, // Mark as draft
      };

      this.renderComment(tempComment);

      const detailsBox = document.querySelector(
        `.opv-comment-details[data-comment-id="${tempComment.id}"]`,
      );
      if (detailsBox) {
        // Remove existing content
        detailsBox.innerHTML = '';

        // Create new comment form
        const commentForm = document.createElement('div');
        commentForm.classList.add('comment-form');
        commentForm.style.cssText = `
            margin-top: 15px;
            padding-top: 15px;
          `;

        const textarea = document.createElement('textarea');
        textarea.style.cssText = `
            width: 100%;
            height: 80px;
            margin-bottom: 8px;
            padding: 8px;
            border: 1px solid #E1E8ED;
            border-radius: 8px;
            font-size: 14px;
            resize: none;
            box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
            transition: border 0.3s ease, box-shadow 0.3s ease;
          `;

        textarea.addEventListener('focus', () => {
          textarea.style.border = '1px solid #1DA1F2';
          textarea.style.boxShadow =
            'inset 0 1px 2px rgba(0, 0, 0, 0.05), 0 0 0 2px rgba(29, 161, 242, 0.2)';
        });

        textarea.addEventListener('blur', () => {
          textarea.style.border = '1px solid #E1E8ED';
          textarea.style.boxShadow = 'inset 0 1px 2px rgba(0, 0, 0, 0.05)';
        });

        const submitBtn = document.createElement('button');
        submitBtn.textContent = 'Publish';
        submitBtn.style.cssText = `
            background-color: #1DA1F2;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 9999px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            transition: background-color 0.3s ease;
          `;

        submitBtn.addEventListener('mouseover', () => {
          submitBtn.style.backgroundColor = '#1A91DA';
        });

        submitBtn.addEventListener('mouseout', () => {
          submitBtn.style.backgroundColor = '#1DA1F2';
        });

        submitBtn.addEventListener('click', () => {
          const commentText = textarea.value.trim();
          if (commentText) {
            // Remove the temporary comment
            const tempMarker = document.querySelector(
              `.opv-comment-marker[data-comment-id="${tempComment.id}"]`,
            );
            if (tempMarker) {
              tempMarker.remove();
            }
            detailsBox.remove();

            // Create a new permanent comment
            const newComment = {
              ...tempComment,
              content: commentText,
              url: this.windowUrl,
              draft_mode: false, // Mark as published
            };

            console.log('New comment object to be sent to server:', newComment);
            this.ws.send(
              JSON.stringify({
                type: 'newComment',
                projectId: this.projectId,
                url: this.windowUrl,
                comment: newComment,
                token: this.token,
              }),
            );

            this.comments.push(newComment);

            // Note: We don't add the comment to this.comments or render it here
            // We'll wait for the server to confirm and send back the comment with an ID

            this.showNotification({
              message: 'Comment added successfully!',
            });
          }
        });

        commentForm.appendChild(textarea);
        commentForm.appendChild(submitBtn);
        detailsBox.appendChild(commentForm);

        detailsBox.style.display = 'block';

        // Save the current scroll position
        const scrollPosition = window.pageYOffset;

        // Focus on the textarea without scrolling
        textarea.focus({ preventScroll: true });

        // Restore the scroll position
        window.scrollTo(0, scrollPosition);
      }
    },

    // Update renderComment to use the new selector format
    renderComment: function (comment) {
      console.log('Rendering individual comment:', comment);
      let targetElement = this.findTargetElement(comment.selector);
      const webPath = window.location.pathname;
      const commentPath = new URL(comment.url).pathname;

      if (webPath !== commentPath) {
        console.log(
          'Comment path does not match current page, skipping render',
        );
        return null;
      }

      if (!targetElement) {
        console.warn('Target element not found for comment:', comment);
        return;
        // targetElement = document.body; // Fallback to body if element not found
      }

      const marker = document.createElement('div');
      marker.classList.add('opv-comment-marker');
      marker.dataset.commentId = comment.id;

      marker.style.cssText = `
          position: absolute;
          width: 32px;
          height: 32px;
          background-color: ${comment.resolved_at ? '#4CAF50' : '#1DA1F2'};
          border-radius: 20% 100% 100% 100%;
          cursor: pointer;
          z-index: 2147483647;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 16px;
          box-shadow: 0 2px 10px rgba(29, 161, 242, 0.3);
          transition: none;
          user-select: none;
        `;

      // Use user avatar if available, otherwise use initials or a default icon
      if (comment.user && comment.user.avatar_url) {
        marker.innerHTML = `
            <div style="width: 100%; height: 100%; padding: 4px;">
              <div style="background-image: url(${comment.user.avatar_url}); background-size: cover; background-position: center; background-repeat: no-repeat; width: 100%; height: 100%; border-radius: 50%;"></div>
            </div>
          `;
      } else {
        // Use initials or a default icon
        const initials =
          comment.user && comment.user.name
            ? comment.user.name.charAt(0).toUpperCase()
            : '?';
        marker.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-weight: bold;">
              ${initials}
            </div>
          `;
      }

      // Position the marker
      const rect = targetElement.getBoundingClientRect();
      const x = rect.left + comment.x_percent * rect.width;
      const y = rect.top + comment.y_percent * rect.height;

      marker.style.left = `${x + window.scrollX}px`;
      marker.style.top = `${y + window.scrollY}px`;

      document.body.appendChild(marker);

      // Create details box with new device icon feature
      const detailsBox = document.createElement('div');
      detailsBox.classList.add('opv-comment-details');
      detailsBox.dataset.commentId = comment.id;
      detailsBox.style.cssText = `
          position: absolute;
          width: 300px;
          background-color: white;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          z-index: 2147483648;
          display: none;
          max-height: 400px;
          overflow-y: auto;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        `;

      // Create header container
      const header = document.createElement('div');
      header.style.cssText = `
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        `;

      // Create user info container
      const userInfo = document.createElement('div');
      userInfo.style.cssText = `
          display: flex;
          align-items: center;
          flex: 1;
        `;

      const avatar = document.createElement('img');
      avatar.src =
        comment.user && comment.user.avatar_url ? comment.user.avatar_url : '';
      avatar.style.cssText = `
          width: 32px;
          height: 32px;
          border-radius: 50%;
          margin-right: 8px;
          ${!avatar.src ? 'display: none;' : ''}
        `;

      const userDetails = document.createElement('div');
      userDetails.innerHTML = `
          <div style="font-weight: bold;">${(comment.user && comment.user.name) || 'Anonymous'}</div>
          <div style="font-size: 12px; color: #657786;">${new Date(comment.created_at).toLocaleString()}</div>
        `;

      // Create device icon
      const deviceIcon = document.createElement('div');
      deviceIcon.style.cssText = `
          margin-left: 8px;
          color: #657786;
          display: flex;
          align-items: center;
        `;

      const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(
        comment.user_agent,
      );
      deviceIcon.innerHTML = isMobile
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
            <line x1="12" y1="18" x2="12" y2="18"/>
          </svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>`;
      deviceIcon.title = isMobile ? 'Mobile Device' : 'Desktop Device';

      // Assemble the header
      userInfo.appendChild(avatar);
      userInfo.appendChild(userDetails);
      header.appendChild(userInfo);
      header.appendChild(deviceIcon);
      detailsBox.appendChild(header);

      // Add comment content
      const content = document.createElement('div');
      content.style.cssText = `
          margin-bottom: 16px;
          font-size: 14px;
          line-height: 1.4;
          color: #1f2937;
        `;
      content.textContent = comment.content;
      detailsBox.appendChild(content);

      // Add replies container
      const repliesContainer = document.createElement('div');
      repliesContainer.classList.add('replies-container');
      if (comment.replies && comment.replies.length > 0) {
        comment.replies.forEach(reply => {
          const replyElement = this.createReplyElement(reply);
          repliesContainer.appendChild(replyElement);
        });
      }
      detailsBox.appendChild(repliesContainer);

      // Add reply form
      const replyForm = this.createReplyForm(comment.id);
      detailsBox.appendChild(replyForm);

      document.body.appendChild(detailsBox);

      // Smart positioning of the details box

      // Improved hover functionality
      let showTimeout, hideTimeout;
      const showDelay = 100; // Reduced delay for showing
      const hideDelay = 300; // Delay before hiding

      const showDetailsBox = () => {
        clearTimeout(hideTimeout);
        showTimeout = setTimeout(() => {
          const allDetails = document.querySelectorAll('.opv-comment-details');
          allDetails.forEach(detail => {
            if (detail !== detailsBox) {
              detail.style.display = 'none';
            }
          });
          detailsBox.style.display = 'block';
          this.positionDetailsBox(marker, detailsBox);
        }, showDelay);
      };

      const hideDetailsBox = () => {
        clearTimeout(showTimeout);
        hideTimeout = setTimeout(() => {
          if (!detailsBox.matches(':hover') && !isUserTyping(detailsBox)) {
            detailsBox.style.display = 'none';
          }
        }, hideDelay);
      };

      // Helper function to check if user is typing in the details box
      const isUserTyping = element => {
        const activeElement = document.activeElement;
        return (
          activeElement &&
          element.contains(activeElement) &&
          (activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA')
        );
      };

      marker.addEventListener('mouseenter', showDetailsBox);
      marker.addEventListener('mouseleave', hideDetailsBox);

      detailsBox.addEventListener('mouseenter', () => {
        clearTimeout(hideTimeout);
      });

      detailsBox.addEventListener('mouseleave', () => {
        hideTimeout = setTimeout(() => {
          if (!marker.matches(':hover') && !isUserTyping(detailsBox)) {
            detailsBox.style.display = 'none';
          }
        }, hideDelay);
      });

      // Update position on window resize
      window.addEventListener('resize', () => {
        if (detailsBox.style.display === 'block') {
          this.positionDetailsBox(marker, detailsBox);
        }
      });

      // Make the comment draggable
      this.makeCommentDraggable(marker, detailsBox, comment);

      return { marker, detailsBox };
    },

    positionDetailsBox: function (marker, detailsBox) {
      const markerRect = marker.getBoundingClientRect();
      const detailsRect = detailsBox.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;

      // Horizontal positioning
      let leftPosition;
      if (viewportWidth - markerRect.right >= detailsRect.width + 10) {
        // Position to the right if there's enough space
        leftPosition = markerRect.right + scrollX + 10;
      } else if (markerRect.left >= detailsRect.width + 10) {
        // Position to the left if there's not enough space on the right
        leftPosition = markerRect.left + scrollX - detailsRect.width - 10;
      } else {
        // Center horizontally if no space on sides
        leftPosition = scrollX + (viewportWidth - detailsRect.width) / 2;
      }

      // Vertical positioning
      let topPosition = markerRect.top + scrollY; // Align top of details box with top of marker

      // Ensure the details box doesn't go off-screen vertically
      if (topPosition + detailsRect.height > scrollY + viewportHeight) {
        // If it goes off the bottom, align the bottom of the details box with the bottom of the viewport
        topPosition = scrollY + viewportHeight - detailsRect.height - 10;
      }

      // Apply the calculated position
      detailsBox.style.left = `${leftPosition}px`;
      detailsBox.style.top = `${topPosition}px`;
    },

    // Update calculateRelativePosition to use the new selector format
    calculateRelativePosition: function (element, x, y) {
      const rect = element.getBoundingClientRect();

      // Calculate relative positions as decimals (0-1)
      const x_percent = (x - rect.left) / rect.width;
      const y_percent = (y - rect.top) / rect.height;

      return {
        selector: this.getUniqueSelector(element),
        x_percent: x_percent,
        y_percent: y_percent,
        page_title: document.title,
        screen_width: Math.round(window.innerWidth),
        screen_height: Math.round(window.innerHeight),
        device_pixel_ratio: window.devicePixelRatio,
        deployment_url: window.location.host,
        user_agent: navigator.userAgent,
        draft_mode: false,
        node_id: null,
      };
    },

    makeCommentDraggable: function (
      marker,
      detailsBox,
      comment,
      updatePosition,
    ) {
      let isDragging = false;
      let startX, startY;
      let startMarkerLeft, startMarkerTop;
      let targetElement;

      const onMouseDown = e => {
        if (e.button !== 0) return; // Only handle left mouse button
        e.preventDefault();
        e.stopPropagation();

        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;

        const markerRect = marker.getBoundingClientRect();
        startMarkerLeft = markerRect.left + window.scrollX;
        startMarkerTop = markerRect.top + window.scrollY;

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      };

      const onMouseMove = e => {
        if (!isDragging) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        const newLeft = startMarkerLeft + dx;
        const newTop = startMarkerTop + dy;

        marker.style.left = `${newLeft}px`;
        marker.style.top = `${newTop}px`;

        if (detailsBox && detailsBox.style.display === 'block') {
          detailsBox.style.left = `${newLeft + 40}px`;
          detailsBox.style.top = `${newTop}px`;
        }
      };

      const onMouseUp = e => {
        if (!isDragging) return;
        isDragging = false;

        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        // Get the element at the current position
        marker.style.display = 'none';
        targetElement = document.elementFromPoint(e.clientX, e.clientY);
        marker.style.display = 'flex';

        if (targetElement) {
          const rect = targetElement.getBoundingClientRect();
          const markerRect = marker.getBoundingClientRect();

          // Calculate new percentages
          const newXPercent =
            (markerRect.left + window.scrollX - (rect.left + window.scrollX)) /
            rect.width;
          const newYPercent =
            (markerRect.top + window.scrollY - (rect.top + window.scrollY)) /
            rect.height;

          // Update comment object
          comment.x_percent = newXPercent;
          comment.y_percent = newYPercent;
          comment.selector = this.getUniqueSelector(targetElement);

          // Update position immediately
          this.updateCommentPosition(
            marker,
            detailsBox,
            comment,
            targetElement,
          );

          // Send update to server if not a temporary comment
          if (!comment.id.toString().startsWith('temp-')) {
            this.ws.send(
              JSON.stringify({
                type: 'updateComment',
                projectId: this.projectId,
                url: this.windowUrl,
                comment: {
                  id: comment.id,
                  x_percent: newXPercent,
                  y_percent: newYPercent,
                  selector: comment.selector,
                },
                token: this.token,
              }),
            );
          }
        }
      };

      marker.addEventListener('mousedown', onMouseDown);

      // Touch support
      marker.addEventListener('touchstart', e => {
        const touch = e.touches[0];
        onMouseDown({
          preventDefault: () => e.preventDefault(),
          stopPropagation: () => e.stopPropagation(),
          clientX: touch.clientX,
          clientY: touch.clientY,
          button: 0,
        });
      });

      document.addEventListener('touchmove', e => {
        if (isDragging) {
          const touch = e.touches[0];
          onMouseMove({
            clientX: touch.clientX,
            clientY: touch.clientY,
          });
        }
      });

      document.addEventListener('touchend', e => {
        if (isDragging) {
          const touch = e.changedTouches[0];
          onMouseUp({
            clientX: touch.clientX,
            clientY: touch.clientY,
          });
        }
      });
    },
  };

  window.OpenPreview = OpenPreview;

  // Modified initialization function
  window.initOpenPreview = function (config) {
    if (config && config.projectId) {
      OpenPreview.setProjectId(config.projectId);
    } else {
      console.warn('OpenPreview: initOpenPreview called without a project ID');
    }
  };

  console.log('OpenPreview script finished execution');
})(window, document);
