try {
  (function () {
    console.log('OpenPreview script starting execution');

    // Main OpenPreview object
    const OpenPreview = {
      clientId: null,
      apiUrl: 'http://localhost:3003', // Replace with your actual API URL (use HTTPS in production)
      token: null,
      toolbar: null,
      comments: [],

      init: function (config) {
        console.log('OpenPreview initializing...'); // Debug log
        this.clientId = config.clientId;
        this.createToolbar();
        this.loadComments();
        this.setupEventListeners();
      },

      createToolbar: function () {
        console.log('Creating toolbar...'); // Debug log
        this.toolbar = document.createElement('div');
        this.toolbar.id = 'opv-toolbar';
        this.toolbar.style.cssText = `
          position: fixed !important;
          bottom: 20px !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          height: 36px !important;
          background-color: rgba(56, 67, 106, 0.1) !important;
          border-radius: 18px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 10px !important;
          font-family: Arial, sans-serif !important;
          z-index: 2147483647 !important;
          box-shadow: 0 2px 10px rgba(56, 67, 106, 0.1) !important;
          backdrop-filter: blur(5px) !important;
          transition: background-color 0.3s ease !important;
        `;

        // Load Font Awesome
        const fontAwesome = document.createElement('link');
        fontAwesome.rel = 'stylesheet';
        fontAwesome.href =
          'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css';
        document.head.appendChild(fontAwesome);

        const addCommentBtn = this.createButton(
          'fas fa-comment',
          'Add Comment',
        );
        const loginBtn = this.createButton('fas fa-sign-in-alt', 'Login');

        this.toolbar.appendChild(addCommentBtn);
        this.toolbar.appendChild(loginBtn);

        // Ensure the toolbar is added after the DOM is fully loaded
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => {
            document.body.appendChild(this.toolbar);
            console.log('Toolbar added to body'); // Debug log
          });
        } else {
          document.body.appendChild(this.toolbar);
          console.log('Toolbar added to body'); // Debug log
        }

        this.makeDraggable(this.toolbar);

        // Add hover effect to the toolbar
        this.toolbar.addEventListener('mouseenter', () => {
          this.toolbar.style.backgroundColor =
            'rgba(56, 67, 106, 0.2) !important';
        });
        this.toolbar.addEventListener('mouseleave', () => {
          this.toolbar.style.backgroundColor =
            'rgba(56, 67, 106, 0.1) !important';
        });
      },

      createButton: function (iconClass, title) {
        const btn = document.createElement('button');
        btn.innerHTML = `<i class="${iconClass}"></i>`;
        btn.title = title;
        btn.style.cssText = `
          padding: 8px !important;
          margin: 0 5px !important;
          border: none !important;
          background-color: transparent !important;
          color: #38436a !important;
          cursor: pointer !important;
          font-size: 14px !important;
          border-radius: 50% !important;
          width: 30px !important;
          height: 30px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          transition: background-color 0.3s ease, color 0.3s ease !important;
          opacity: 0.7 !important;
        `;
        btn.addEventListener('mouseover', () => {
          btn.style.backgroundColor = 'rgba(56, 67, 106, 0.1) !important';
          btn.style.opacity = '1 !important';
        });
        btn.addEventListener('mouseout', () => {
          btn.style.backgroundColor = 'transparent !important';
          btn.style.opacity = '0.7 !important';
        });
        return btn;
      },

      makeDraggable: function (element) {
        let pos1 = 0,
          pos2 = 0,
          pos3 = 0,
          pos4 = 0;
        element.style.cursor = 'move';
        element.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
          e = e || window.event;
          e.preventDefault();
          pos3 = e.clientX;
          pos4 = e.clientY;
          document.onmouseup = closeDragElement;
          document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
          e = e || window.event;
          e.preventDefault();
          pos1 = pos3 - e.clientX;
          pos2 = pos4 - e.clientY;
          pos3 = e.clientX;
          pos4 = e.clientY;
          element.style.top = element.offsetTop - pos2 + 'px';
          element.style.left = element.offsetLeft - pos1 + 'px';
          element.style.bottom = 'auto';
          element.style.transform = 'none';
        }

        function closeDragElement() {
          document.onmouseup = null;
          document.onmousemove = null;
        }
      },

      setupEventListeners: function () {
        const addCommentBtn = this.toolbar.querySelector('button:first-child');
        const loginBtn = this.toolbar.querySelector('button:last-child');

        addCommentBtn.addEventListener('click', () => this.addComment());
        loginBtn.addEventListener('click', () => this.login());

        document.addEventListener('click', e => {
          if (e.target.classList.contains('opv-comment-marker')) {
            this.showCommentDetails(e.target.dataset.commentId);
          }
        });
      },

      addComment: function () {
        if (!this.token) {
          alert('Please login to add a comment');
          return;
        }

        const commentText = prompt('Enter your comment:');
        if (!commentText) return;

        const x = Math.random() * window.innerWidth;
        const y = Math.random() * window.innerHeight;

        this.saveComment(commentText, x, y);
      },

      saveComment: function (text, x, y) {
        fetch(`${this.apiUrl}/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.token}`,
            'X-Project-ID': this.clientId,
            'X-Domain': window.location.hostname,
          },
          body: JSON.stringify({
            text,
            x,
            y,
            url: window.location.href,
          }),
        })
          .then(response => response.json())
          .then(comment => {
            this.comments.push(comment);
            this.renderComment(comment);
          })
          .catch(error => console.error('Error saving comment:', error));
      },

      renderComment: function (comment) {
        const marker = document.createElement('div');
        marker.classList.add('opv-comment-marker');
        marker.dataset.commentId = comment.id;
        marker.style.cssText = `
          position: absolute;
          left: ${comment.x_percent}px;
          top: ${comment.y_percent}px;
          width: 20px;
          height: 20px;
          background-color: #007bff;
          border-radius: 50%;
          cursor: pointer;
        `;
        document.body.appendChild(marker);
      },

      showCommentDetails: function (commentId) {
        const comment = this.comments.find(c => c.id === commentId);
        if (comment) {
          alert(`Comment: ${comment.content}`);
        }
      },

      loadComments: function () {
        fetch(
          `${this.apiUrl}/comments?url=${encodeURIComponent(window.location.href)}`,
          {
            headers: {
              Authorization: `Bearer ${this.token}`,
              'X-Project-ID': this.clientId,
              'X-Domain': window.location.hostname,
            },
          },
        )
          .then(response => response.json())
          .then(comments => {
            this.comments = comments;
            comments.forEach(comment => this.renderComment(comment));
          })
          .catch(error => console.error('Error loading comments:', error));
      },

      login: function () {
        fetch(`${this.apiUrl}/auth/login/init`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            projectId: this.clientId,
            redirectUrl: window.location.href,
          }),
        })
          .then(response => response.json())
          .then(data => {
            const loginWindow = window.open(
              data.loginUrl,
              'OpenPreview Login',
              'width=600,height=600',
            );
            window.addEventListener('message', event => {
              if (event.origin !== this.apiUrl) return;
              if (event.data.type === 'LOGIN_SUCCESS') {
                loginWindow.close();
                this.verifyLogin(event.data.authCode);
              }
            });
          })
          .catch(error => console.error('Error initiating login:', error));
      },

      verifyLogin: function (authCode) {
        fetch(`${this.apiUrl}/auth/login/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ authCode }),
        })
          .then(response => response.json())
          .then(data => {
            this.token = data.token;
            alert('Login successful!');
            this.loadComments();
          })
          .catch(error => console.error('Error verifying login:', error));
      },
    };

    // Initialize OpenPreview immediately
    console.log('Initializing OpenPreview');
    OpenPreview.init({
      clientId: window.opvProjectId, // We'll set this in the HTML
    });

    // Expose OpenPreview to the global scope if needed
    window.OpenPreview = OpenPreview;

    console.log('OpenPreview script finished execution');
  })();
} catch (error) {
  console.error('Error in OpenPreview script:', error);
}
