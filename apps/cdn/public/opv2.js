try {
  (function () {
    console.log('OpenPreview script starting execution');

    // Main OpenPreview object
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
      menuPopover: null,
      addCommentPopover: null,
      allowedDomains: ['https://openpreview.dev'], // Add allowed domains
      //#endregion
      isPreviewDomain: function (origin) {
        const allowedDomain = this.allowedDomains.find(domain => {
          const regex = new RegExp(`^https://[\\w-]+\\.${domain.replace(/^https:\/\//, '')}$`);
          return regex.test(origin);
        });
        return !!allowedDomain;
      },
      isCurrentPathAllowed: function (path) {
        const currentPath = window.location.pathname;
        return currentPath === path;
      },
      //#region Init Func
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

        const initializeComponents = () => {
          this.createToolbar();
          this.createCommentForm();
          this.createCommentsList();
          this.loadTestData();
          this.updateEyeIcon(); // Move this here, after toolbar creation
        };

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initializeComponents);
        } else {
          initializeComponents();
        }

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
      //#endregion

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
          // { icon: 'drag', title: 'Drag' },
        ]);

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
            '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2 2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',
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

          const submitBtn = this.commentForm.querySelector('button');
          submitBtn.addEventListener('click', () => this.addComment());

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

      showCommentForm: function () {
        const viewportWidth = Math.max(
          document.documentElement.clientWidth || 0,
          window.innerWidth || 0,
        );
        const viewportHeight = Math.max(
          document.documentElement.clientHeight || 0,
          window.innerHeight || 0,
        );

        const x = viewportWidth / 2;
        const y = viewportHeight / 2;

        this.commentForm.style.display = 'block';
        this.commentForm.style.left = `${x}px`;
        this.commentForm.style.top = `${y}px`;
        this.commentForm.dataset.x = x.toString();
        this.commentForm.dataset.y = y.toString();
      },

      hideCommentForm: function () {
        this.commentForm.style.display = 'none';
      },

      addComment: function () {
        const textarea = this.commentForm.querySelector('textarea');
        const commentText = textarea.value.trim();
        if (!commentText) return;
      
        const targetElement = this.getTargetElement();
        if (!targetElement) {
          console.error('Unable to find target element for comment');
          return;
        }
      
        const { selector, x, y } = this.calculateRelativePosition(targetElement, 
          parseFloat(this.commentForm.dataset.x), 
          parseFloat(this.commentForm.dataset.y)
        );
      
        const comment = {
          id: Date.now().toString(),
          content: commentText,
          selector: selector,
          x: x,
          y: y,
          url: window.location.href,
          user: {
            name: 'John Doe',
            avatar: 'https://i.pravatar.cc/150?img=8',
          },
          timestamp: new Date().toISOString(),
          replies: [],
          color: '#1DA1F2', // Default color
        };
      
        console.log('Comment object to be sent to server:', comment);
      
        this.comments.push(comment);
        this.renderComment(comment);
        this.hideCommentForm();
        textarea.value = '';
        this.updateCommentsList();
        this.showNotification('Comment added successfully!');
      },

      calculateRelativePosition: function (element, x, y) {
        const rect = element.getBoundingClientRect();
        const xPercent = ((x - rect.left) / rect.width);
        const yPercent = ((y - rect.top) / rect.height);
      
        return {
          selector: this.getUniqueSelector(element),
          x: xPercent,
          y: yPercent
        };
      },

      getUniqueSelector: function (element) {
        if (element.id) {
          return `#${element.id}`;
        }
        if (element.className) {
          const classes = element.className
            .split(' ')
            .filter(c => c.trim() !== '');
          if (classes.length > 0) {
            return `.${classes.join('.')}`;
          }
        }

        const tag = element.tagName.toLowerCase();
        if (tag === 'body' || tag === 'html') {
          return tag;
        }

        const parent = element.parentNode;
        const siblings = parent.children;
        const index = Array.from(siblings).indexOf(element) + 1;

        return `${this.getUniqueSelector(parent)} > ${tag}:nth-child(${index})`;
      },

      getTargetElement: function () {
        const x = parseFloat(this.commentForm.dataset.x);
        const y = parseFloat(this.commentForm.dataset.y);
        return document.elementFromPoint(x, y);
      },

      renderComment: function (comment) {
        console.log('Rendering comment:', comment);
        let targetElement = this.findTargetElement(comment.selector);
        const webPath = window.location.pathname;
        const commentPath = new URL(comment.url).pathname;

        console.log(
          'commentPath',
          commentPath,
          'webPath',
          webPath,
          'isEqual',
          commentPath === webPath,
        );

        if (webPath !== commentPath) {
          console.log('Comment path matches current page');
          return null;
        }
        if (!targetElement) {
          console.warn('Target element not found for comment:', comment);
          targetElement = document.body; // Fallback to body if element not found
        }

        const updatePosition = () => {
          const rect = targetElement.getBoundingClientRect();
          const x = rect.left + (rect.width * comment.xPercent) / 100;
          const y = rect.top + (rect.height * comment.yPercent) / 100;

          marker.style.left = `${x}px`;
          marker.style.top = `${y}px`;

          if (detailsBox) {
            detailsBox.style.left = `${x + 40}px`;
            detailsBox.style.top = `${y}px`;
          }
        };

        const marker = document.createElement('div');
        marker.classList.add('opv-comment-marker');
        marker.dataset.commentId = comment.id;
        marker.style.cssText = `
          position: fixed;
          width: 32px;
          height: 32px;
          background-color: ${comment.color || '#1DA1F2'};
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

        marker.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';

        marker.style.cssText += `
          @media (max-width: 768px) {
            width: 24px;
            height: 24px;
            font-size: 12px;
          }
        `;

        const detailsBox = document.createElement('div');
        detailsBox.classList.add('opv-comment-details');
        detailsBox.dataset.commentId = comment.id;
        detailsBox.style.cssText = `
          position: fixed;
          width: 300px;
          background-color: white;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          z-index: 2147483644;
          display: none;
          max-height: 400px;
          overflow-y: auto;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        `;

        detailsBox.style.cssText += `
          @media (max-width: 768px) {
            width: 90%;
            max-width: 300px;
            left: 50% !important;
            transform: translateX(-50%);
            max-height: 80vh;
          }
        `;

        // Add comment content
        const commentContent = document.createElement('div');
        commentContent.innerHTML = `
          <div style="display: flex; align-items: center; margin-bottom: 10px;">
            <img src="${comment.user.avatar}" alt="${comment.user.name}" style="width: 40px; height: 40px; border-radius: 50%; margin-right: 10px;">
            <div>
              <div style="font-weight: bold;">${comment.user.name}</div>
              <div style="font-size: 0.8em; color: #666;">${new Date(comment.timestamp).toLocaleString()}</div>
            </div>
          </div>
          <div class="comment-content" style="margin-bottom: 15px;">${comment.content}</div>
        `;
        detailsBox.appendChild(commentContent);

        // Add replies
        if (comment.replies && comment.replies.length > 0) {
          const repliesContainer = document.createElement('div');
          repliesContainer.style.cssText = `
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #eee;
          `;
          comment.replies.forEach(reply => {
            const replyElement = document.createElement('div');
            replyElement.style.marginBottom = '10px';
            replyElement.innerHTML = `
              <div style="display: flex; align-items: center; margin-bottom: 5px;">
                <img src="${reply.user.avatar}" alt="${reply.user.name}" style="width: 30px; height: 30px; border-radius: 50%; margin-right: 10px;">
                <div>
                  <div style="font-weight: bold;">${reply.user.name}</div>
                  <div style="font-size: 0.8em; color: #666;">${new Date(reply.timestamp).toLocaleString()}</div>
                </div>
              </div>
              <div style="margin-left: 40px;">${reply.content}</div>
            `;
            repliesContainer.appendChild(replyElement);
          });
          detailsBox.appendChild(repliesContainer);
        }

        // Add reply form
        const replyForm = document.createElement('div');
        replyForm.classList.add('reply-form');
        replyForm.style.cssText = `
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid #eee;
        `;
        replyForm.innerHTML = `
          <textarea style="width: 100%; height: 60px; margin-bottom: 10px; padding: 5px; border: 1px solid #e1e4e8; border-radius: 4px;"></textarea>
          <button style="padding: 5px 10px; background-color: #1DA1F2; color: white; border: none; border-radius: 4px; cursor: pointer;">Reply</button>
        `;
        replyForm.querySelector('button').addEventListener('click', () => {
          const replyContent = replyForm.querySelector('textarea').value.trim();
          if (replyContent) {
            this.addReply(comment.id, replyContent);
            replyForm.querySelector('textarea').value = '';
          }
        });
        detailsBox.appendChild(replyForm);

        // Add color picker
        const colorPicker = document.createElement('input');
        colorPicker.type = 'color';
        colorPicker.value = comment.color || '#1DA1F2';
        colorPicker.style.marginTop = '10px';
        colorPicker.addEventListener('change', e => {
          const newColor = e.target.value;
          comment.color = newColor;
          marker.style.backgroundColor = newColor;
          this.updateCommentsList();
        });
        detailsBox.appendChild(colorPicker);

        document.body.appendChild(marker);
        document.body.appendChild(detailsBox);

        updatePosition();

        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition);

        // Update position periodically to handle dynamic content changes
        setInterval(updatePosition, 1000);

        this.makeCommentDraggable(marker, detailsBox, comment, updatePosition);
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

      makeCommentDraggable: function (
        marker,
        detailsBox,
        comment,
        updatePosition,
      ) {
        let isDragging = false;
        let startX, startY;
        let moveThreshold = 5; // pixels
        let hasMovedBeyondThreshold = false;
        let clickStartTime;

        const onMove = e => {
          const clientX = e.clientX || (e.touches && e.touches[0].clientX);
          const clientY = e.clientY || (e.touches && e.touches[0].clientY);

          if (!isDragging) return;

          const dx = clientX - startX;
          const dy = clientY - startY;

          if (!hasMovedBeyondThreshold) {
            if (Math.abs(dx) > moveThreshold || Math.abs(dy) > moveThreshold) {
              hasMovedBeyondThreshold = true;
            } else {
              return;
            }
          }

          const targetElement = document.querySelector(comment.selector);
          const rect = targetElement.getBoundingClientRect();

          comment.xPercent = ((clientX - rect.left) / rect.width) * 100;
          comment.yPercent = ((clientY - rect.top) / rect.height) * 100;

          updatePosition();

          startX = clientX;
          startY = clientY;
        };

        const onEnd = e => {
          const endTime = new Date().getTime();
          const clickDuration = endTime - clickStartTime;

          if (!hasMovedBeyondThreshold && clickDuration < 200) {
            // If it hasn't moved beyond the threshold and the click duration is short, treat it as a click
            this.showCommentDetails(comment.id);
          }

          isDragging = false;
          hasMovedBeyondThreshold = false;
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('touchmove', onMove);
          document.removeEventListener('mouseup', onEnd);
          document.removeEventListener('touchend', onEnd);
          marker.style.cursor = 'pointer';
        };

        const onStart = e => {
          e.preventDefault(); // Prevent text selection and default touch behaviors
          isDragging = true;
          hasMovedBeyondThreshold = false;
          clickStartTime = new Date().getTime();
          startX = e.clientX || (e.touches && e.touches[0].clientX);
          startY = e.clientY || (e.touches && e.touches[0].clientY);
          marker.style.cursor = 'grabbing';
          document.addEventListener('mousemove', onMove);
          document.addEventListener('touchmove', onMove, { passive: false });
          document.addEventListener('mouseup', onEnd);
          document.addEventListener('touchend', onEnd);
        };

        marker.addEventListener('mousedown', onStart);
        marker.addEventListener('touchstart', onStart);

        // Add a separate click event listener
        marker.addEventListener('click', e => {
          if (!hasMovedBeyondThreshold) {
            this.showCommentDetails(comment.id);
          }
        });
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
            `.opv-comment-marker[data-comment-id="${comment.id}"]`,
          );
          if (marker) {
            marker.scrollIntoView({ behavior: 'smooth', block: 'center' });
            this.showCommentDetails(comment.id);
          }
        });

        const userInfo = document.createElement('div');
        userInfo.style.cssText = `
          display: flex;
          align-items: center;
          margin-bottom: 8px;
        `;

        const avatar = document.createElement('img');
        avatar.src = comment.user.avatar;
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
        timestamp.textContent = new Date(comment.timestamp).toLocaleString();
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
        avatar.src = reply.user.avatar;
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
        timestamp.textContent = new Date(reply.timestamp).toLocaleString();
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
            const replyElement = document.createElement('div');
            replyElement.style.marginBottom = '10px';
            replyElement.innerHTML = `
              <div style="display: flex; align-items: center; margin-bottom: 5px;">
                <img src="${reply.user.avatar}" alt="${reply.user.name}" style="width: 30px; height: 30px; border-radius: 50%; margin-right: 10px;">
                <div>
                  <div style="font-weight: bold;">${reply.user.name}</div>
                  <div style="font-size: 0.8em; color: #666;">${new Date(reply.timestamp).toLocaleString()}</div>
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
          this.showNotification(
            `Comment ${comment.resolved ? 'resolved' : 'unresolved'}`,
          );
        }
      },

      updateCommentMarker: function (comment) {
        const marker = document.querySelector(
          `.opv-comment-marker[data-comment-id="${comment.id}"]`,
        );
        if (marker) {
          marker.style.backgroundColor = comment.resolved
            ? '#4CAF50'
            : '#1e3a8a';
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
          { label: 'Logout', type: 'button' },
        ]);
      },

      toggleMenu: function () {
        if (!this.menuPopover) {
          this.createMenuPopover();
        }
        console.log('Showing menu ', this.menuPopover, this.menuPopover.style.display);
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

      showInviteDialog: function () {
        console.log('Showing invite dialog');
        // Implement invite functionality
      },

      // Add this new method
      loadTestData: async function () {
      
        
        this.comments = [
          {
            id: '1',
            content:
              'This is a test comment. It demonstrates how comments look in the system.',
            selector: 'body',
            xPercent: 10,
            yPercent: 10,
            url: 'https://12.openpreview.dev/test',
            user: {
              name: 'Alice Johnson',
              avatar: 'https://i.pravatar.cc/150?img=1',
            },
            timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            replies: [
              {
                id: '1-1',
                content: 'This is a reply to the test comment.',
                user: {
                  name: 'Bob Smith',
                  avatar: 'https://i.pravatar.cc/150?img=2',
                },
                timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
              },
            ],
            resolved: false,
          },
          {
            id: '2',
            content:
              "Here's another comment to show multiple comments on the page.",
            selector: 'body',
            xPercent: 30,
            yPercent: 20,
            url: 'https://12.openpreview.dev',
            user: {
              name: 'Charlie Brown',
              avatar: 'https://i.pravatar.cc/150?img=3',
            },
            timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
            replies: [],
            resolved: false,
          },
        ];

        console.log('Rendering test comments');
        const allowedComments = this.comments.filter(comment => 
        {
          const commentUrl = new URL(comment.url);
          console.log(commentUrl.origin, commentUrl.pathname);
          return this.isPreviewDomain(commentUrl.origin) && this.isCurrentPathAllowed(commentUrl.pathname)
        }
        );
        allowedComments.forEach(comment => {
          this.renderComment(comment);
        });

        this.updateCommentsList();
      },

      findTargetElement: function (selector) {
        if (!selector) {
          console.warn('No selector provided for findTargetElement');
          return document.body; // Fallback to body if no selector is provided
        }

        // Try to find the element with the exact selector
        let element = document.querySelector(selector);
        if (element) return element;

        // If not found, try a more lenient approach
        const selectorParts = selector.split(' > ');
        let currentSelector = '';
        for (let i = selectorParts.length - 1; i >= 0; i--) {
          currentSelector =
            selectorParts[i] + (currentSelector ? ' > ' + currentSelector : '');
          element = document.querySelector(currentSelector);
          if (element) return element;
        }

        // If still not found, try finding by tag name or similar class
        const lastPart = selectorParts[selectorParts.length - 1];
        const tagMatch = lastPart.match(/^([a-z]+)/);
        if (tagMatch) {
          const elements = document.getElementsByTagName(tagMatch[1]);
          if (elements.length > 0) return elements[0];
        }

        const classMatch = lastPart.match(/\.([^:]+)/);
        if (classMatch) {
          const className = classMatch[1].replace(/\./g, ' ');
          const elements = document.getElementsByClassName(className);
          if (elements.length > 0) return elements[0];
        }

        console.warn('No matching element found for selector:', selector);
        return document.body; // Fallback to body if no matching element is found
      },

      updateCommentPosition: function (
        marker,
        detailsBox,
        comment,
        targetElement,
      ) {
        const rect = targetElement.getBoundingClientRect();
        const x = rect.left + (rect.width * comment.xPercent) / 100;
        const y = rect.top + (rect.height * comment.yPercent) / 100;

        marker.style.left = `${x}px`;
        marker.style.top = `${y}px`;

        detailsBox.style.left = `${x + 40}px`;
        detailsBox.style.top = `${y}px`;
      },

      // Add this new method
      startAddingComment: function () {
        console.log('Starting to add a comment');
        if (this.addCommentPopover) {
          this.addCommentPopover.remove();
        }
        this.addCommentPopover = this.createPopover('Add Comment', [
          { label: 'Click on the page to place your comment', type: 'message' },
        ]);
        this.addCommentPopover.style.display = 'block';
        this.positionPopover(this.addCommentPopover);

        this.isSelectingCommentLocation = true;
        document.body.style.cursor = 'crosshair';

        // Remove any existing click event listener
        document.removeEventListener('click', this.handleCommentPlacement);

        // Add the click event listener
        document.addEventListener('click', this.handleCommentPlacement);

        console.log('Comment placement listener added');
      },

      // Add this new method
      handleCommentPlacement: function (e) {
        console.log('handleCommentPlacement called', e);
        if (!this.isSelectingCommentLocation) {
          console.log('Not selecting comment location, returning');
          return;
        }

        // Prevent the click event from being triggered on the toolbar
        if (e.target.closest('#opv-toolbar')) {
          console.log('Click on toolbar, ignoring');
          return;
        }

        e.preventDefault();
        e.stopPropagation();
        this.isSelectingCommentLocation = false;
        document.body.style.cursor = 'default';
        document.removeEventListener('click', this.handleCommentPlacement);

        if (this.addCommentPopover) {
          this.addCommentPopover.remove();
          this.addCommentPopover = null;
        }

        const x = e.clientX;
        const y = e.clientY;

        console.log('Comment placement coordinates:', x, y);

        // Ensure x and y are numbers
        if (
          typeof x === 'number' &&
          typeof y === 'number' &&
          !isNaN(x) &&
          !isNaN(y)
        ) {
          this.showCommentForm(x, y);
        } else {
          console.error('Invalid coordinates for comment placement', x, y);
        }
      },

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

        const { selector, xPercent, yPercent } = this.calculateRelativePosition(
          targetElement,
          x,
          y,
        );

        const tempComment = {
          id: 'temp-' + Date.now(),
          content: '',
          selector: selector,
          xPercent: xPercent,
          yPercent: yPercent,
          url: window.location.href,
          user: {
            name: 'John Doe',
            avatar: 'https://i.pravatar.cc/150?img=8',
          },
          timestamp: new Date().toISOString(),
          replies: [],
          color: '#1DA1F2',
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
                id: Date.now().toString(),
                content: commentText,
              };

              this.comments.push(newComment);
              this.renderComment(newComment);
              this.updateCommentsList();
              this.showNotification('Comment added successfully!');
            }
          });

          commentForm.appendChild(textarea);
          commentForm.appendChild(submitBtn);
          detailsBox.appendChild(commentForm);

          detailsBox.style.display = 'block';
          textarea.focus();
        }
      },

      calculateRelativePosition: function (element, x, y) {
        const rect = element.getBoundingClientRect();
        const xPercent = ((x - rect.left) / rect.width) * 100;
        const yPercent = ((y - rect.top) / rect.height) * 100;

        return {
          selector: this.getUniqueSelector(element),
          xPercent: xPercent,
          yPercent: yPercent,
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
      //#endregion
    };

    //#region Init OPV
    // Initialize OpenPreview immediately
    console.log('Initializing OpenPreview');
    OpenPreview.init({
      clientId: window.opvClientId, // We'll set this in the HTML
    });

    // Expose OpenPreview to the global scope if needed
    window.OpenPreview = OpenPreview;
    //#endregion

    console.log('OpenPreview script finished execution');
  })();
} catch (error) {
  console.error('Error in OpenPreview script:', error);
}

