try {
  (function () {
    console.log('OpenPreview script starting execution');
    const dashboardUrl = 'http://localhost:3002'
    const apiUrl = 'http://localhost:3003'
    const OpenPreview = {
      //#region Vars
      clientId: null,
      comments: [],
      toolbar: null,
      commentForm: null,
      commentsList: null,
      isSelectingCommentLocation: false,
      commentsVisible: true,
      settingsPopover: null,
      addCommentPopover: null,
      allowedDomains: ['http://localhost:3000'], // Add allowed domains
      token: null,
      ws: null,
      //#endregion
      isPreviewDomain: function (origin) {
        // Check Localhost for Development
        if (origin.includes('localhost')) {
          return true;
        }
        const strippedOrigin = origin.replace(/^(https?:\/\/)/, '');
        const allowedDomain = this.allowedDomains.find(domain => {
          const strippedDomain = domain.replace(/^(https?:\/\/)/, '');
          const regex = new RegExp(`^[\\w-]+\\.${strippedDomain}$`);
          return regex.test(strippedOrigin);
        });
        return !!allowedDomain;
      },

      init: function (config) {
        console.log('OpenPreview initializing...');
        this.clientId = config.clientId;

        const weborigin = window.location.origin;
        console.log('weborigin', weborigin);
        const isAllowed = this.isPreviewDomain(weborigin);

        if (!isAllowed) {
          console.log('Origin not allowed');
          return;
        }
        console.log('Origin allowed');

        // Verify the token first
        this.verifyToken().then(isValid => {
          if (isValid) {
            console.log('Token verified successfully');
            this.token = this.getCookie('opv_token');
          } else {
            console.log('Token verification failed or no token found');
            this.token = null;
          }

          // Initialize components after token verification
          this.initializeComponents();

          // Load comments and initialize WebSocket
          this.loadComments();
          this.initWebSocket();
        });

        // Set up event listeners
        this.setupEventListeners();

        // Periodically update comment positions
        setInterval(() => {
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
        }, 5000); // Check every 5 seconds

        window.addEventListener('resize', this.handleResize.bind(this));

        // Bind methods to preserve 'this' context
        this.handleCommentPlacement = this.handleCommentPlacement.bind(this);
        this.startAddingComment = this.startAddingComment.bind(this);
        this.showCommentForm = this.showCommentForm.bind(this);
      },

      initializeComponents: function() {
        this.createToolbar();
        this.createCommentForm();
        this.createCommentsList();
        this.updateEyeIcon();
        this.updateLoginState();
      },
      //#endregion

      login: async function() {
        const width = 500;
        const height = 600;
        const left = (window.screen.width / 2) - (width / 2);
        const top = (window.screen.height / 2) - (height / 2);
        
        const loginWindow = window.open(
          `${dashboardUrl}/auth/login`,
          'OpenPreview Login',
          `width=${width},height=${height},left=${left},top=${top}`
        );
      
        return new Promise((resolve, reject) => {
          const handleMessage = (event) => {
            if (event.origin !== dashboardUrl) return;
      
            if (event.data.type === 'LOGIN_SUCCESS') {
              this.token = event.data.token;
              console.log(this.token)
              this.setCookie('opv_token', this.token, 1); // Save for 1 days
              this.onLoginSuccess();
              loginWindow.close();
              window.removeEventListener('message', handleMessage);
              this.initWebSocket();
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

      onLoginSuccess: function() {
        console.log('Login successful');
        this.showNotification('Logged in successfully!');
        // Update UI or perform actions after successful login
        this.updateLoginState();
        this.loadComments();
      },
    
      updateLoginState: function() {
        if (this.token) {
          this.loginButton.style.display = 'none';
          if (this.settingsPopover) {
            const logoutButton = this.settingsPopover.querySelector('button:contains("Logout")');
            if (logoutButton) logoutButton.style.display = 'block';
          }
        } else {
          this.loginButton.style.display = 'block';
          if (this.settingsPopover) {
            const logoutButton = this.settingsPopover.querySelector('button:contains("Logout")');
            if (logoutButton) logoutButton.style.display = 'none';
          }
        }
      },
    
      logout: function() {
        this.token = null;
        // Remove the token cookie
        this.setCookie('opv_token', '', -1); // Expire the cookie
        this.showNotification('Logged out successfully!');
        this.updateLoginState();
        this.comments = []; // Clear comments
        this.renderComments(); // Re-render (clear) comments
        this.togglePopover(this.settingsPopover); // Close settings popover
      },

      // Add this new helper function to set cookies
      setCookie: function(name, value, days) {
        let expires = "";
        if (days) {
          const date = new Date();
          date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
          expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "")  + expires + "; path=/";
      },

      // Add this new helper function to get cookies
      getCookie: function(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for(let i = 0; i < ca.length; i++) {
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
          const res = await fetch(`${apiUrl}/comments`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-Project-ID': this.clientId,
              'X-Domain': window.location.origin,
            }
          });

          if (!res.ok) {
            if (res.status === 401) {
              this.showNotification('Session expired. Please log in again.');
              this.logout();
              return;
            }
            throw new Error('Failed to fetch comments');
          }

          const comments = await res.json();
          console.log('Fetched comments:', comments);
          this.comments = comments;

          if (comments.length === 0) {
            console.log('No comments found for this URL');
          } else {
            this.renderComments();
          }
        } catch (error) {
          console.error('Error loading comments:', error);
          this.showNotification('Failed to load comments. Please try again.');
        }
      },

      initWebSocket: function () {
        const token = this.token || this.getCookie('opv_token');
        const wsUrl = new URL(apiUrl).host
        this.ws = new WebSocket(`ws://${wsUrl}?token=${token}`);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.ws.send(JSON.stringify({
            type: 'join',
            projectId: this.clientId,
            url: window.location.href
          }));
        };
    
        this.ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          if (data.type === 'newComment') {
            console.log('Received new comment:', data.comment);
            this.comments.push(data.comment);
            this.renderComment(data.comment);
            this.updateCommentsList();
          } else if (data.type === 'error') {
            console.error('WebSocket error:', data.message);
            this.showNotification(data.message, 'error');
          }
        };
    
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };
    
        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          // Implement reconnection logic here if needed
        };
      },

      verifyToken: async function() {
        const token = this.token || this.getCookie('opv_token');
       
        if (!token) {
          console.log('No token found');
          return false;
        }

        try {
          const response = await fetch(`${apiUrl}/auth/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
          });

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
        document.querySelectorAll('.opv-comment-marker, .opv-comment-details').forEach(el => el.remove());
        
        this.comments.forEach(comment => {
          console.log('Rendering comment:', comment);
          this.renderComment(comment);
        });
        this.updateCommentsList();
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
          this.ws.send(JSON.stringify({
            type: 'newReply',
            projectId: this.clientId,
            commentId: commentId,
            reply: reply,
            token: this.token
          }));

          // Optimistically add the reply locally
          if (!comment.replies) {
            comment.replies = [];
          }
          comment.replies.push(reply);

          this.updateCommentDetails(comment);
          this.updateCommentsList();
          this.showNotification('Reply added successfully!');
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
        console.log('Creating toolbar...');
        this.toolbar = document.createElement('div');
        this.toolbar.id = 'opv-toolbar';
        this.toolbar.style.cssText = `
          position: fixed !important;
          bottom: 20px !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          height: 48px !important;
          background-color: rgba(33, 47, 90, 0.9) !important;
          border: 1px solid rgb(33, 47, 90) !important;
          border-radius: 24px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          padding: 0 8px !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
          z-index: 2147483646 !important;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1) !important;
          transition: all 0.3s ease !important;
        `;

        this.toolbar.style.cssText += `
          @media (max-width: 768px) {
            bottom: 10px !important;
            left: 10px !important;
            right: 10px !important;
            transform: none !important;
            width: calc(100% - 20px) !important;
          }
        `;

        const leftGroup = this.createToolbarGroup([
          { icon: 'chat', title: 'Comments' },
          { icon: 'inbox', title: 'Inbox' },
        ]);

        const rightGroup = this.createToolbarGroup([
          { icon: 'eye', title: 'Preview' },
          { icon: 'settings', title: 'Settings' },
        ]);

        // Add login button
        this.loginButton = this.createLoginButton();
        rightGroup.insertBefore(this.loginButton, rightGroup.firstChild);

        this.toolbar.appendChild(leftGroup);
        this.toolbar.appendChild(rightGroup);

        document.body.appendChild(this.toolbar);
        console.log('Toolbar added to body');

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
        button.style.cssText = `
          width: 40px !important;
          height: 40px !important;
          border: none !important;
          background-color: transparent !important;
          color: white !important;
          cursor: pointer !important;
          font-size: 20px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          transition: background-color 0.3s ease !important;
          border-radius: 50% !important;
        `;
        button.innerHTML = this.getIconSVG(icon);
        button.addEventListener('mouseover', () => {
          button.style.backgroundColor = 'rgba(255, 255, 255, 0.1) !important';
        });
        button.addEventListener('mouseout', () => {
          button.style.backgroundColor = 'transparent !important';
        });

        button.style.cssText += `
          @media (max-width: 768px) {
            width: 32px !important;
            height: 32px !important;
            font-size: 16px !important;
          }
        `;

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
            button.addEventListener('mousedown', () => this.makeDraggable(this.toolbar));
            break;
        }

        return button;
      },

      createSeparator: function () {
        const separator = document.createElement('div');
        separator.style.cssText = `
          width: 1px !important;
          height: 24px !important;
          background-color: rgba(255, 255, 255, 0.2) !important;
          margin: 0 4px !important;
        `;
        return separator;
      },

      getIconSVG: function (icon) {
        // You can replace these with actual SVG icons
        const icons = {
          chat: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
          inbox:
            '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>',
          eye: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>',
          settings:
            '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2 2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1 2 2h-.09a1.65 1.65 0 0 0 1.51 1z"></path></svg>',
          drag: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>',
        };
        return icons[icon] || '';
      },
      
      createLoginButton: function() {
        const loginButton = document.createElement('button');
        loginButton.textContent = 'Login';
        loginButton.style.cssText = `
          background-color: #1DA1F2;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 9999px;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
          margin-right: 8px;
        `;
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

      makeDraggable: function(element) {
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
      
      showSettings: function () {
        console.log('showSettings called');
        if (!this.settingsPopover) {
          this.createSettingsPopover();
        }
        this.togglePopover(this.settingsPopover);
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
          if (this.settingsPopover && !this.settingsPopover.contains(e.target) && !e.target.closest('button[title="Settings"]')) {
            this.settingsPopover.style.display = 'none';
          }
        });
      },

      showCommentForm: function (x, y) {
        // Create temporary marker
        const tempMarker = document.createElement('div');
        tempMarker.classList.add('opv-temp-comment-marker');
        tempMarker.style.cssText = `
          position: fixed;
          width: 32px;
          height: 32px;
          background-color: ${this.user?.avatar_url ? 'white' : '#1DA1F2'};
          border-radius: 20% 100% 100% 100%;
          z-index: 2147483647;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 16px;
          box-shadow: 0 2px 10px rgba(29, 161, 242, 0.3);
          transform: rotate(-45deg);
          border: ${this.user?.avatar_url ? '2px solid #1DA1F2' : 'none'};
          overflow: hidden;
          left: ${x}px;
          top: ${y}px;
        `;
        
        if (this.user?.avatar_url) {
          const avatar = document.createElement('img');
          avatar.src = this.user.avatar_url;
          avatar.style.cssText = `
            width: 100%;
            height: 100%;
            object-fit: cover;
            transform: rotate(45deg);
          `;
          tempMarker.appendChild(avatar);
        } else {
          const commentIcon = document.createElement('div');
          commentIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
          commentIcon.style.transform = 'rotate(45deg)';
          tempMarker.appendChild(commentIcon);
        }
        
        document.body.appendChild(tempMarker);
      
        // Position and show comment form
        this.commentForm.style.display = 'block';
        this.commentForm.style.left = `${x + 40}px`;
        this.commentForm.style.top = `${y}px`;
        this.commentForm.dataset.x = x.toString();
        this.commentForm.dataset.y = y.toString();
      
        // Store reference to temp marker
        this.commentForm.dataset.tempMarkerId = 'opv-temp-comment-marker';
      
        // Make the comment form draggable
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;
      
        const dragStart = (e) => {
          if (e.target === this.commentForm) {
            isDragging = true;
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
          }
        };
      
        const dragEnd = () => {
          if (isDragging) {
            isDragging = false;
            initialX = currentX;
            initialY = currentY;
          }
        };
      
        const drag = (e) => {
          if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            xOffset = currentX;
            yOffset = currentY;
      
            this.commentForm.style.transform = `translate(${currentX}px, ${currentY}px)`;
          }
        };
      
        this.commentForm.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);
      
        // Add touch event support
        this.commentForm.addEventListener('touchstart', (e) => {
          const touch = e.touches[0];
          dragStart({ target: this.commentForm, clientX: touch.clientX, clientY: touch.clientY });
        });
      
        document.addEventListener('touchmove', (e) => {
          if (isDragging) {
            const touch = e.touches[0];
            drag({ preventDefault: () => {}, clientX: touch.clientX, clientY: touch.clientY });
          }
        });
      
        document.addEventListener('touchend', dragEnd);
      
        // Update the submit and cancel handlers
        const submitBtn = this.commentForm.querySelector('button');
        const cancelBtn = this.commentForm.querySelectorAll('button')[1];
      
        // Remove old event listeners if they exist
        submitBtn.replaceWith(submitBtn.cloneNode(true));
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));
      
        // Add new event listeners
        this.commentForm.querySelectorAll('button')[0].addEventListener('click', () => {
          this.addComment();
          tempMarker.remove();
          // Clean up drag event listeners
          this.commentForm.removeEventListener('mousedown', dragStart);
          document.removeEventListener('mousemove', drag);
          document.removeEventListener('mouseup', dragEnd);
          this.commentForm.removeEventListener('touchstart', dragStart);
          document.removeEventListener('touchmove', drag);
          document.removeEventListener('touchend', dragEnd);
        });
      
        this.commentForm.querySelectorAll('button')[1].addEventListener('click', () => {
          this.hideCommentForm();
          tempMarker.remove();
          // Clean up drag event listeners
          this.commentForm.removeEventListener('mousedown', dragStart);
          document.removeEventListener('mousemove', drag);
          document.removeEventListener('mouseup', dragEnd);
          this.commentForm.removeEventListener('touchstart', dragStart);
          document.removeEventListener('touchmove', drag);
          document.removeEventListener('touchend', dragEnd);
        });
      },

      hideCommentForm: function () {
        this.commentForm.style.display = 'none';
        // Remove temporary marker if it exists
        const tempMarker = document.querySelector('.opv-temp-comment-marker');
        if (tempMarker) {
          tempMarker.remove();
        }
      },

      addComment: async function () {
        console.log('Adding comment...');
        const content = this.commentForm.querySelector('textarea').value;
        if (!content.trim()) {
          console.log('Comment content is empty');
          return;
        }

        const x = parseFloat(this.commentForm.dataset.x);
        const y = parseFloat(this.commentForm.dataset.y);

        // Get the element at the clicked position
        const targetElement = document.elementFromPoint(x, y);
        if (!targetElement) {
          console.error('No target element found at position');
          return;
        }

        // Calculate relative position within the target element
        const rect = targetElement.getBoundingClientRect();
        const xPercent = ((x - rect.left) / rect.width) * 100;
        const yPercent = ((y - rect.top) / rect.height) * 100;

        const commentData = {
          content: content,
          url: window.location.href,
          x_percent: xPercent,
          y_percent: yPercent,
          selector: this.getUniqueSelector(targetElement)
        };

        try {
          const response = await fetch(`${apiUrl}/comments`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.token}`,
              'X-Project-ID': this.clientId,
              'X-Domain': window.location.origin,
            },
            body: JSON.stringify(commentData)
          });

          if (!response.ok) {
            throw new Error('Failed to add comment');
          }

          const newComment = await response.json();
          console.log('Comment added successfully:', newComment);

          // Clear the form
          this.commentForm.querySelector('textarea').value = '';
          
          // Hide the comment form and remove the temporary marker
          this.hideCommentForm();
          const tempMarker = document.querySelector('.opv-temp-comment-marker');
          if (tempMarker) tempMarker.remove();

          // Add the new comment to the local array
          this.comments.push(newComment);

          // Immediately render the new comment
          this.renderComment(newComment);

          // Update the comments list if it's visible
          if (this.commentsList && this.commentsList.style.display === 'block') {
            this.updateCommentsList();
          }

          // Show success notification
          this.showNotification('Comment added successfully!');

        } catch (error) {
          console.error('Error adding comment:', error);
          this.showNotification('Failed to add comment. Please try again.', 'error');
        }
      },
      
      renderComment: function (comment) {
        console.log('Rendering individual comment:', comment);
        let targetElement = this.findTargetElement(comment.selector);
        const webPath = window.location.pathname;
        const commentPath = new URL(comment.url).pathname;

        console.log('commentPath', commentPath, 'webPath', webPath, 'isEqual', commentPath === webPath);
        
        if (webPath !== commentPath) {
          console.log('Comment path does not match current page, skipping render');
          return null;
        }

        if (!targetElement) {
          console.warn('Target element not found for comment:', comment);
          targetElement = document.body; // Fallback to body if element not found
        }

        // Remove any existing markers for this comment
        const existingMarker = document.querySelector(`.opv-comment-marker[data-comment-id="${comment.id}"]`);
        const existingDetails = document.querySelector(`.opv-comment-details[data-comment-id="${comment.id}"]`);
        if (existingMarker) existingMarker.remove();
        if (existingDetails) existingDetails.remove();

        const marker = document.createElement('div');
        marker.classList.add('opv-comment-marker');
        marker.dataset.commentId = comment.id;
        marker.style.cssText = `
          position: fixed;
          width: 32px;
          height: 32px;
          background-color: ${this.user?.avatar_url ? 'white' : '#1DA1F2'};
          border-radius: 20% 100% 100% 100%;
          z-index: 2147483647;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 16px;
          box-shadow: 0 2px 10px rgba(29, 161, 242, 0.3);
          transform: rotate(-45deg);
          border: ${this.user?.avatar_url ? '2px solid #1DA1F2' : 'none'};
          overflow: hidden;
          cursor: pointer;
        `;

        if (comment.user?.avatar_url) {
          const avatar = document.createElement('img');
          avatar.src = comment.user.avatar_url;
          avatar.style.cssText = `
            width: 100%;
            height: 100%;
            object-fit: cover;
            transform: rotate(45deg);
          `;
          marker.appendChild(avatar);
        } else {
          const commentIcon = document.createElement('div');
          commentIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
          commentIcon.style.transform = 'rotate(45deg)';
          marker.appendChild(commentIcon);
        }

        // Rest of your existing renderComment function...
        // (Keep the positioning logic, details box creation, and event listeners)

        document.body.appendChild(marker);
        
        // Update the position immediately and set up position updates
        const updatePosition = () => {
          const rect = targetElement.getBoundingClientRect();
          const x = rect.left + (rect.width * comment.x_percent) / 100;
          const y = rect.top + (rect.height * comment.y_percent) / 100;

          marker.style.left = `${x}px`;
          marker.style.top = `${y}px`;
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition);
        
        // Update position periodically to handle dynamic content changes
        setInterval(updatePosition, 1000);

        marker.addEventListener('click', () => this.showCommentDetails(comment.id));
      },

      calculateRelativePosition: function (element, x, y) {
        const rect = element.getBoundingClientRect();
        const x_percent = ((x - rect.left) / rect.width) * 100;
        const y_percent = ((y - rect.top) / rect.height) * 100;
      
        return {
          selector: this.getUniqueSelector(element),
          x_percent: x_percent,
          y_percent: y_percent,
        };
      },

      getUniqueSelector: function (element) {
        if (element.id) {
          return `#${element.id}`;
        }

        let path = [];
        while (element.nodeType === Node.ELEMENT_NODE) {
          let selector = element.tagName.toLowerCase();
          if (element.className) {
            const classes = element.className.split(' ').filter(c => c.trim() !== '');
            if (classes.length > 0) {
              selector += '.' + classes.join('.');
            }
          }
          
          let sibling = element;
          let nth = 0;
          while (sibling) {
            if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === element.tagName) nth++;
            sibling = sibling.previousSibling;
          }
          if (nth > 1) selector += `:nth-of-type(${nth})`;

          path.unshift(selector);
          element = element.parentNode;
          
          if (element === document.body || element === document.documentElement) {
            path.unshift(element.tagName.toLowerCase());
            break;
          }
        }

        return path.join('>');
      },

      getTargetElement: function () {
        const x = parseFloat(this.commentForm.dataset.x);
        const y = parseFloat(this.commentForm.dataset.y);
        return document.elementFromPoint(x, y);
      },
      
      findTargetElement: function (selector) {
        if (!selector) {
          console.warn('No selector provided for findTargetElement');
          return document.body;
        }
      
        try {
          const { path, attributes } = JSON.parse(selector);
          let elements = document.querySelectorAll(path);
          
          if (elements.length === 1) {
            return elements[0];
          }
      
          // If multiple elements match the path, use attributes to narrow it down
          for (let element of elements) {
            if (this.matchAttributes(element, attributes)) {
              return element;
            }
          }
      
          // If no exact match, return the first element that matches the path
          return elements[0] || document.body;
        } catch (error) {
          console.error('Error parsing selector:', error);
          return document.body;
        }
      },
      
      matchAttributes: function (element, attributes) {
        for (let key in attributes) {
          if (element.getAttribute(key) !== attributes[key]) {
            return false;
          }
        }
        return true;
      },

      verifyElementAttributes: function (element, attributes) {
        for (let key in attributes) {
          if (key === 'tagName' && element.tagName.toLowerCase() !== attributes[key]) {
            return false;
          }
          if (key === 'classes') {
            const elementClasses = Array.from(element.classList).join(' ');
            if (elementClasses !== attributes[key]) {
              return false;
            }
          } else if (element.getAttribute(key) !== attributes[key]) {
            return false;
          }
        }
        return true;
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
            const markerRect = marker.getBoundingClientRect();
            detailsBox.style.left = `${markerRect.right + 10}px`;
            detailsBox.style.top = `${markerRect.top}px`;
          }
        }
      },

      makeCommentDraggable: function (marker, detailsBox, comment, updatePosition) {
        let isDragging = false;
        let startX, startY;
        let originalX, originalY;
      
        const onMouseDown = (e) => {
          e.preventDefault();
          isDragging = true;
          startX = e.clientX;
          startY = e.clientY;
          originalX = parseFloat(marker.style.left);
          originalY = parseFloat(marker.style.top);
          
          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        };
      
        const onMouseMove = (e) => {
          if (!isDragging) return;
          
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;
          
          const newX = originalX + dx;
          const newY = originalY + dy;
          
          marker.style.left = `${newX}px`;
          marker.style.top = `${newY}px`;
          
          if (detailsBox) {
            detailsBox.style.left = `${newX + 40}px`;
            detailsBox.style.top = `${newY}px`;
          }
        };
      
        const onMouseUp = () => {
          isDragging = false;
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
          
          const targetElement = document.elementFromPoint(
            parseFloat(marker.style.left),
            parseFloat(marker.style.top)
          );
          if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            const newXPercent = ((parseFloat(marker.style.left) - rect.left) / rect.width) * 100;
            const newYPercent = ((parseFloat(marker.style.top) - rect.top) / rect.height) * 100;
            
            // Update the comment object
            comment.x_percent = newXPercent;
            comment.y_percent = newYPercent;
            comment.selector = this.getUniqueSelector(targetElement);
            
            // Send the updated comment to the server via WebSocket
            this.ws.send(JSON.stringify({
              type: 'updateComment',
              projectId: this.clientId,
              url: window.location.href,
              comment: {
                id: comment.id,
                x_percent: newXPercent,
                y_percent: newYPercent,
                selector: comment.selector
              },
              token: this.token
            }));
            
            updatePosition();
          }
        };
      
        marker.addEventListener('mousedown', onMouseDown);
      
        // Add touch event support
        marker.addEventListener('touchstart', (e) => {
          const touch = e.touches[0];
          onMouseDown({ preventDefault: () => {}, clientX: touch.clientX, clientY: touch.clientY });
        });
      
        document.addEventListener('touchmove', (e) => {
          if (isDragging) {
            const touch = e.touches[0];
            onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
          }
        });
      
        document.addEventListener('touchend', onMouseUp);
      },

      showNotification: function (message) {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background-color: #4CAF50;
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
            const currentPath = new URL(window.location.href).pathname;
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
            `.opv-comment-marker[data-comment-id="${comment.id}"]`
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

      togglePreviewMode: function () {
        this.commentsVisible = !this.commentsVisible;
        const commentMarkers = document.querySelectorAll('.opv-comment-marker');
        const commentDetails = document.querySelectorAll(
          '.opv-comment-details',
        );

        commentMarkers.forEach(marker => {
          marker.style.display = this.commentsVisible ? 'flex' : 'none';
        });

        commentDetails.forEach(details => {
          details.style.display = 'none'; // Close all open comment details
        });

        console.log(
          `Comments visibility ${this.commentsVisible ? 'on' : 'off'}`,
        );
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

      positionPopover: function (popover) {
        const toolbarRect = this.toolbar.getBoundingClientRect();
        const popoverRect = popover.getBoundingClientRect();
      
        // Position the popover just above the toolbar
        popover.style.bottom = `${window.innerHeight - toolbarRect.top + 10}px`;
      
        // Ensure the popover doesn't go off-screen on the left or right
        const leftPosition = toolbarRect.left + (toolbarRect.width - popoverRect.width) / 2;
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

      updateCommentPosition: function (
        marker,
        detailsBox,
        comment,
        targetElement,
      ) {
        const rect = targetElement.getBoundingClientRect();
        const x = rect.left + (rect.width * comment.x_percent) / 100;
        const y = rect.top + (rect.height * comment.y_percent) / 100;

        marker.style.left = `${x}px`;
        marker.style.top = `${y}px`;

        detailsBox.style.left = `${x + 40}px`;
        detailsBox.style.top = `${y}px`;
      },
      
      cancelAddingComment: function () {
        console.log('Cancelling comment addition');
        this.isSelectingCommentLocation = false;
        document.body.style.cursor = 'default';
        document.removeEventListener('click', this.handleCommentPlacement);

        if (this.addCommentPopover) {
          this.addCommentPopover.remove();
          this.addCommentPopover = null;
        }
      },

      startAddingComment: function () {
        console.log('Starting to add a comment');
        
        if (this.isSelectingCommentLocation) {
          this.cancelAddingComment();
          return;
        }
      
        if (this.addCommentPopover) {
          this.addCommentPopover.remove();
        }
        
        // Create cursor follower
        const cursorFollower = document.createElement('div');
        cursorFollower.id = 'opv-cursor-follower';
        cursorFollower.style.cssText = `
          position: fixed;
          width: 32px;
          height: 32px;
          background-color: ${this.user?.avatar_url ? 'white' : '#1DA1F2'};
          border-radius: 20% 100% 100% 100%;
          z-index: 2147483647;
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 16px;
          box-shadow: 0 2px 10px rgba(29, 161, 242, 0.3);
          transform: rotate(-45deg);
          border: ${this.user?.avatar_url ? '2px solid #1DA1F2' : 'none'};
          overflow: hidden;
        `;
      
        if (this.user?.avatar_url) {
          const avatar = document.createElement('img');
          avatar.src = this.user.avatar_url;
          avatar.style.cssText = `
            width: 100%;
            height: 100%;
            object-fit: cover;
            transform: rotate(45deg);
          `;
          cursorFollower.appendChild(avatar);
        } else {
          const commentIcon = document.createElement('div');
          commentIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
          commentIcon.style.transform = 'rotate(45deg)';
          cursorFollower.appendChild(commentIcon);
        }
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'opv-placement-overlay';
        overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 2147483646;
          cursor: crosshair;
          background: transparent;
        `;
      
        document.body.appendChild(cursorFollower);
        document.body.appendChild(overlay);
        
        // Add cursor follower movement - offset to position the point at the cursor
        const updateCursorFollower = (e) => {
          cursorFollower.style.left = `${e.clientX}px`;
          cursorFollower.style.top = `${e.clientY}px`;
        };
        document.addEventListener('mousemove', updateCursorFollower);
        
        this.addCommentPopover = this.createPopover('Add Comment', [
          { label: 'Click on the page to place your comment', type: 'message' },
        ]);
        this.addCommentPopover.style.display = 'block';
        this.positionPopover(this.addCommentPopover);
      
        this.isSelectingCommentLocation = true;
        
        overlay.addEventListener('click', this.handleCommentPlacement);
        this._cursorFollowerHandler = updateCursorFollower;
      
        console.log('Comment placement listener added');
      },

      cancelAddingComment: function () {
        console.log('Cancelling comment addition');
        this.isSelectingCommentLocation = false;
        
        // Remove overlay and cursor follower
        const overlay = document.getElementById('opv-placement-overlay');
        const cursorFollower = document.getElementById('opv-cursor-follower');
        if (overlay) overlay.remove();
        if (cursorFollower) cursorFollower.remove();
      
        // Remove mousemove listener
        if (this._cursorFollowerHandler) {
          document.removeEventListener('mousemove', this._cursorFollowerHandler);
          this._cursorFollowerHandler = null;
        }
      
        if (this.addCommentPopover) {
          this.addCommentPopover.remove();
          this.addCommentPopover = null;
        }
      },

      handleCommentPlacement: function (e) {
        console.log('handleCommentPlacement called', e);
        if (!this.isSelectingCommentLocation) {
          console.log('Not selecting comment location, returning');
          return;
        }
      
        e.preventDefault();
        e.stopPropagation();
        
        const x = e.clientX;
        const y = e.clientY;
      
        console.log('Comment placement coordinates:', x, y);
      
        // Ensure x and y are numbers
        if (typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y)) {
          this.showCommentForm(x, y);
        } else {
          console.error('Invalid coordinates for comment placement', x, y);
        }
        
        this.cancelAddingComment();
      }
    }
  
    console.log('Initializing OpenPreview');
    OpenPreview.init({
      clientId: document.currentScript.getAttribute('data-client-id'),
    });

    window.OpenPreview = OpenPreview;

    console.log('OpenPreview script finished execution');
  })();
} catch (error) {
  console.error('Error in OpenPreview script:', error);
}

