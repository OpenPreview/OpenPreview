'use strict';
(() => {
  console.log('OpenPreview script starting execution');

  // Main OpenPreview object
  const OpenPreview = {
    // ...different fucntions
    init: function (config) {
      console.log('OpenPreview initializing...', config.projectId);
      this.projectId = config.projectId;

      // Bind only the methods that exist and we need
      this.handleKeyboardShortcuts = this.handleKeyboardShortcuts.bind(this);
      this.handleKeyRemove = this.handleKeyRemove.bind(this);
      this.startAddingComment = this.startAddingComment.bind(this);
      this.showCommentForm = this.showCommentForm.bind(this);

      // Add keyboard shortcut listener early
      document.addEventListener('keydown', this.handleKeyboardShortcuts);
      document.addEventListener('keyup', this.handleKeyRemove);

      const weborigin = window.location.origin;
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
      if (this.activeConnection)
        setInterval(() => {
          this.ws.send(
            JSON.stringify({
              type: 'ping',
              projectId: this.projectId,
              url: window.location.href,
            }),
          );
        }, [500]);

      window.addEventListener('resize', this.handleResize.bind(this));
    },
  }(a => {
    console.log(window);
    // Process the command queue
    const initCommand = (window.opv.q || []).find(cmd => cmd[0] === 'init');
    if (initCommand) OpenPreview.init(initCommand[1]);

    (window.opv.q || []).forEach(([method, ...args]) => {
      if (typeof OpenPreview[method] === 'function') {
        OpenPreview[method](...args);
      }
    });

    // Redefine `window.opv` to dynamically call methods on OpenPreview
    window.opv = (method, ...args) => {
      if (typeof OpenPreview[method] === 'function') {
        OpenPreview[method](...args);
      } else {
        console.warn(`OpenPreview: ${method} is not a function`);
      }
    };

    // Assign `OpenPreview` to `window` for global access
    window.OpenPreview = OpenPreview;
  })(window);
  console.log('OpenPreview script finished execution');
})();
