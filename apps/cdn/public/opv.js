!(function (e, t) {
  'use strict';
  const n = {
    projectId: null,
    isInitialized: !1,
    windowUrl: null,
    maxRetries: 10,
    activeConnection: !1,
    isConnected: !1,
    comments: [],
    keysPressed: new Set(),
    toolbar: null,
    commentForm: null,
    commentsList: null,
    isSelectingCommentLocation: !1,
    commentsVisible: !0,
    settingsPopover: null,
    addCommentPopover: null,
    allowedDomains: [],
    token: null,
    ws: null,
    user: null,
    isToolbarExpanded: !1,
    hasActiveInteraction: !1,
    fetchAllowedDomains: async function () {
      const t = this.token || this.getCookie('opv_token');
      if (t)
        try {
          const n = await fetch('https://api.openpreview.dev/allowed-domains', {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${t}`,
              'X-Project-ID': this.projectId,
              'X-Domain': e.location.origin,
            },
          });
          if (n.ok) {
            const e = await n.json();
            Array.isArray(e) && (this.allowedDomains = e.map(e => e.domain));
          }
        } catch (e) {}
    },
    isPreviewDomain: function (e) {
      const t = e.replace(/^(https?:\/\/)/, '');
      return !!this.allowedDomains.find(e => {
        const n = e.replace(/^(https?:\/\/)/, '');
        return new RegExp(`^[\\w-]+\\.${n}$`).test(t);
      });
    },
    handleKeyboardShortcuts: function (e) {
      if (
        (this.keysPressed.add(e.key.toLowerCase()),
        !(e.target.matches('input, textarea') || this.keysPressed.size > 1))
      )
        switch (e.key.toLowerCase()) {
          case 'c':
            e.preventDefault(), this.startAddingComment();
            break;
          case 'escape':
            this.isSelectingCommentLocation && this.cancelAddingComment(),
              'block' === this.settingsPopover?.style.display &&
                (this.settingsPopover.style.display = 'none'),
              'block' === this.menuPopover?.style.display &&
                (this.menuPopover.style.display = 'none'),
              'block' === this.commentsList?.style.display &&
                this.toggleCommentsList(),
              t.querySelectorAll('.opv-comment-details').forEach(e => {
                e.style.display = 'none';
              });
        }
    },
    handleKeyRemove: function (e) {
      this.keysPressed.delete(e.key.toLowerCase());
    },
    init: function (n) {
      if (
        ((this.windowUrl = e.location.href.split(/[?#]/)[0]),
        n && n.projectId && (this.projectId = n.projectId),
        this.isInitialized)
      )
        return (
          this.loadComments(),
          void (
            (this.ws && this.ws.readyState !== WebSocket.CLOSED) ||
            this.initWebSocket()
          )
        );
      (this.projectId = n.projectId),
        (this.handleKeyboardShortcuts =
          this.handleKeyboardShortcuts.bind(this)),
        (this.handleKeyRemove = this.handleKeyRemove.bind(this)),
        (this.startAddingComment = this.startAddingComment.bind(this)),
        (this.showCommentForm = this.showCommentForm.bind(this)),
        (this.handleVisibilityChange = this.handleVisibilityChange.bind(this)),
        (this.handlePageNavigation = this.handlePageNavigation.bind(this)),
        t.addEventListener('keydown', this.handleKeyboardShortcuts),
        t.addEventListener('keyup', this.handleKeyRemove),
        t.addEventListener('visibilitychange', this.handleVisibilityChange),
        e.addEventListener('popstate', this.handleVisibilityChange),
        e.addEventListener('popstate', this.handlePageNavigation),
        e.addEventListener('beforeunload', () => {
          this.ws && this.ws.close();
        });
      const o = e.location.origin;
      if (!this.isPreviewDomain(o)) return;
      this.verifyToken().then(t => {
        t
          ? ((this.token = this.getCookie('opv_token')),
            this.fetchAllowedDomains().then(() => {
              const t = e.location.origin;
              this.isPreviewDomain(t) &&
                (this.initializeComponents(),
                this.loadComments(),
                this.initWebSocket(),
                this.setupEventListeners());
            }))
          : (this.token = null);
      }),
        this.setupEventListeners(),
        setInterval(() => {
          this.comments.forEach(e => {
            const n = t.querySelector(
                `.opv-comment-marker[data-comment-id="${e.id}"]`,
              ),
              o = t.querySelector(
                `.opv-comment-details[data-comment-id="${e.id}"]`,
              );
            if (n && o) {
              const t = this.findTargetElement(e.selector);
              t && this.updateCommentPosition(n, o, e, t);
            }
          });
        }, 5e3);
      setInterval(() => {
        this.isConnected &&
          this.ws &&
          this.ws.send(
            JSON.stringify({
              type: 'ping',
              projectId: this.projectId,
              url: this.windowUrl,
            }),
          );
      }, 1e3);
      e.addEventListener('resize', this.handleResize.bind(this)),
        (this.isInitialized = !0);
    },
    setProjectId: function (e) {
      (this.projectId = e),
        !this.isInitialized &&
          this.projectId &&
          this.init({ projectId: this.projectId });
    },
    initializeComponents: function () {
      this.createToolbar(),
        this.createCommentForm(),
        this.createCommentsList(),
        this.updateEyeIcon(),
        this.updateLoginState();
    },
    login: async function () {
      const t = e.screen.width / 2 - 250,
        n = e.screen.height / 2 - 300,
        o = e.open(
          'https://app.openpreview.dev/auth/login',
          'OpenPreview Login',
          `width=500,height=600,left=${t},top=${n}`,
        );
      return new Promise((t, n) => {
        const i = n => {
          'https://app.openpreview.dev' === n.origin &&
            'LOGIN_SUCCESS' === n.data.type &&
            ((this.token = n.data.token),
            (this.user = n.data.user),
            this.setCookie('opv_token', this.token, 7),
            this.onLoginSuccess(),
            o.close(),
            e.removeEventListener('message', i),
            t(n.data));
        };
        e.addEventListener('message', i),
          (o.onclose = () => {
            e.removeEventListener('message', i),
              n(new Error('Login window closed'));
          });
      });
    },
    onLoginSuccess: function () {
      this.showNotification({ message: 'Logged in successfully!' }),
        this.updateLoginState(),
        this.initWebSocket(),
        this.loadComments();
    },
    updateLoginState: function () {
      if (this.token) {
        this.toolbar.innerHTML = '';
        const e = this.createToolbarGroup([
            { icon: 'chat', title: 'Comments' },
            { icon: 'inbox', title: 'Inbox' },
          ]),
          t = this.createToolbarGroup([
            { icon: 'eye', title: 'Preview' },
            { icon: 'settings', title: 'Settings' },
          ]),
          n = this.statusSymbol(this.isConnected);
        this.toolbar.appendChild(e),
          this.toolbar.appendChild(t),
          this.toolbar.appendChild(n);
      } else
        (this.toolbar.innerHTML = ''),
          (this.loginButton = this.createLoginButton()),
          this.toolbar.appendChild(this.loginButton);
    },
    logout: function () {
      (this.token = null),
        this.setCookie('opv_token', '', -1),
        this.showNotification({ message: 'Logged out successfully!' }),
        this.updateLoginState(),
        (this.comments = []),
        this.renderComments();
    },
    setCookie: function (e, n, o) {
      let i = '';
      if (o) {
        const e = new Date();
        e.setTime(e.getTime() + 24 * o * 60 * 60 * 1e3),
          (i = '; expires=' + e.toUTCString());
      }
      t.cookie = e + '=' + (n || '') + i + '; path=/';
    },
    getCookie: function (e) {
      const n = e + '=',
        o = t.cookie.split(';');
      for (let e = 0; e < o.length; e++) {
        let t = o[e];
        for (; ' ' == t.charAt(0); ) t = t.substring(1, t.length);
        if (0 == t.indexOf(n)) return t.substring(n.length, t.length);
      }
      return null;
    },
    loadComments: async function () {
      const e = this.token || this.getCookie('opv_token');
      if (e)
        try {
          const t = await fetch('https://api.openpreview.dev/comments', {
            headers: {
              Authorization: `Bearer ${e}`,
              'X-Project-ID': this.projectId,
              'X-Domain': this.windowUrl.split(/[?#]/)[0],
            },
          });
          if (!t.ok) {
            if (401 === t.status)
              return (
                this.showNotification({
                  message: 'Session expired. Please log in again.',
                }),
                void this.logout()
              );
            throw new Error('Failed to fetch comments');
          }
          const n = await t.json();
          (this.comments = n), 0 === n.length || this.renderComments();
        } catch (e) {
          this.showNotification({
            message: 'Failed to load comments. Please try again.',
          });
        }
    },
    initWebSocket: function () {
      this.ws && this.ws.close();
      const e = this.token || this.getCookie('opv_token');
      (this.ws = new WebSocket(`wss://api.openpreview.dev?token=${e}`)),
        (this.ws.onopen = () => {
          this.ws.send(
            JSON.stringify({
              type: 'join',
              projectId: this.projectId,
              url: this.windowUrl,
            }),
          ),
            (this.activeConnection = !0),
            (this.isConnected = !0),
            this.updateConnectionStatus(!0);
        }),
        (this.ws.onmessage = e => {
          const t = JSON.parse(e.data);
          'newComment' === t.type
            ? (this.comments.push(t.comment),
              this.renderComment(t.comment),
              this.updateCommentsList())
            : 'updateComment' === t.type
              ? ((this.comments = this.comments.map(e =>
                  e.id === t.comment.id ? t.comment : e,
                )),
                this.renderComments())
              : 'error' === t.type
                ? this.showNotification({
                    message: t.message,
                    variant: 'destructive',
                  })
                : 'ping' === t.type &&
                  t.status &&
                  ((this.isConnected = !0), this.updateConnectionStatus(!0));
        }),
        (this.ws.onerror = e => {}),
        (this.ws.onclose = () => {
          (this.activeConnection = !1),
            (this.isConnected = !1),
            (this.ws = null),
            this.updateConnectionStatus(!1),
            this.maxRetries > 0 && !this.ws
              ? (setTimeout(() => {
                  this.initWebSocket();
                }, 1e3),
                this.maxRetries--)
              : 0 === this.maxRetries &&
                (this.showNotification({
                  message:
                    'There was an error connecting to websocket. Please close out of the website and reopen. If the problem continues, contact support.',
                  variant: 'destructive',
                  persist: !0,
                }),
                (this.maxRetries = void 0));
        });
    },
    updateConnectionStatus: function (e) {
      const n = t.getElementById('opv-toolbar-status');
      n && (n.style.backgroundColor = e ? '#66ff00' : '#FF0000');
    },
    handlePageNavigation: function () {
      this.ws && this.ws.close();
    },
    handleVisibilityChange: function () {
      'visible' === t.visibilityState
        ? this.isConnected || this.ws || this.initWebSocket()
        : 'hidden' === t.visibilityState &&
          this.ws &&
          (this.ws.close(), (this.ws = null));
    },
    verifyToken: async function () {
      const e = this.token || this.getCookie('opv_token');
      if (!e) return !1;
      try {
        const t = await fetch('https://api.openpreview.dev/auth/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${e}`,
          },
        });
        if (!t.ok) {
          if (401 === t.status)
            return (this.token = null), this.setCookie('opv_token', '', -1), !1;
          throw new Error('Token verification failed');
        }
        const n = await t.json();
        return !!n.valid && ((this.user = n.user), !0);
      } catch (e) {
        return !1;
      }
    },
    renderComments: function () {
      t
        .querySelectorAll('.opv-comment-marker, .opv-comment-details')
        .forEach(e => e.remove()),
        this.comments.forEach(e => {
          this.renderComment(e);
        }),
        this.updateCommentsList();
    },
    updateCommentPosition: function (n, o, i, s) {
      if (!n || !s) return;
      const r = s.getBoundingClientRect(),
        a = e.pageXOffset || t.documentElement.scrollLeft,
        l = e.pageYOffset || t.documentElement.scrollTop,
        c = r.left + a + r.width * i.x_percent,
        d = r.top + l + r.height * i.y_percent;
      (n.style.position = 'absolute'),
        (n.style.left = `${c}px`),
        (n.style.top = `${d}px`),
        o && ((o.style.position = 'absolute'), this.positionDetailsBox(n, o));
    },
    positionDetailsBox: function (n, o) {
      const i = n.getBoundingClientRect(),
        s = o.getBoundingClientRect(),
        r = e.innerWidth,
        a = e.innerHeight,
        l = e.pageXOffset || t.documentElement.scrollLeft,
        c = e.pageYOffset || t.documentElement.scrollTop;
      let d;
      d =
        r - i.right >= s.width + 10
          ? i.right + l + 10
          : i.left >= s.width + 10
            ? i.left + l - s.width - 10
            : l + (r - s.width) / 2;
      let p = i.top + c;
      p + s.height > c + a && (p = c + a - s.height - 10),
        (o.style.left = `${d}px`),
        (o.style.top = `${p}px`);
    },
    createReplyForm: function (e) {
      const n = t.createElement('div');
      n.classList.add('reply-form'),
        (n.style.cssText =
          '\n          margin-top: 15px;\n          padding-top: 15px;\n          border-top: 1px solid #eee;\n        ');
      const o = t.createElement('textarea');
      o.style.cssText =
        '\n          width: 100%;\n          height: 60px;\n          margin-bottom: 8px;\n          padding: 8px;\n          border: 1px solid #E1E8ED;\n          border-radius: 8px;\n          font-size: 14px;\n          resize: none;\n        ';
      const i = t.createElement('button');
      return (
        (i.textContent = 'Reply'),
        (i.style.cssText =
          '\n          background-color: #1DA1F2;\n          color: white;\n          border: none;\n          padding: 6px 12px;\n          border-radius: 9999px;\n          cursor: pointer;\n          font-size: 14px;\n          font-weight: bold;\n        '),
        i.addEventListener('click', () => {
          const t = o.value.trim();
          t && (this.addReply(e, t), (o.value = ''));
        }),
        n.appendChild(o),
        n.appendChild(i),
        n
      );
    },
    addReply: function (e, t) {
      const n = this.comments.find(t => t.id === e);
      if (n) {
        const o = {
          id: Date.now().toString(),
          content: t,
          user: this.user,
          created_at: new Date().toISOString(),
        };
        this.ws.send(
          JSON.stringify({
            type: 'newReply',
            projectId: this.projectId,
            commentId: e,
            reply: o,
            token: this.token,
          }),
        ),
          n.replies || (n.replies = []),
          n.replies.push(o),
          this.updateCommentDetails(n),
          this.updateCommentsList(),
          this.showNotification({ message: 'Reply added successfully!' });
      }
    },
    updateCommentDetails: function (e) {
      const n = t.querySelector(
        `.opv-comment-details[data-comment-id="${e.id}"]`,
      );
      if (n) {
        let o = n.querySelector('.replies-container');
        o ||
          ((o = t.createElement('div')),
          o.classList.add('replies-container'),
          (o.style.cssText =
            '\n              margin-top: 15px;\n              padding-top: 15px;\n              border-top: 1px solid #eee;\n            '),
          n.insertBefore(o, n.querySelector('.reply-form'))),
          (o.innerHTML = ''),
          e.replies.forEach(e => {
            const t = this.createReplyElement(e);
            o.appendChild(t);
          });
      }
    },
    createReplyElement: function (e) {
      const n = t.createElement('div');
      return (
        (n.style.cssText =
          '\n          margin-bottom: 10px;\n          padding-left: 20px;\n          border-left: 2px solid #E1E8ED;\n        '),
        (n.innerHTML = `\n          <div style="display: flex; align-items: center; margin-bottom: 5px;">\n            <img src="${e.user.avatar_url || 'https://i.pravatar.cc/150?img=8'}" alt="${e.user.name}" style="width: 24px; height: 24px; border-radius: 50%; margin-right: 8px;">\n            <div>\n              <div style="font-weight: bold; font-size: 14px;">${e.user.name}</div>\n              <div style="font-size: 12px; color: #657786;">${new Date(e.created_at).toLocaleString()}</div>\n            </div>\n          </div>\n          <div style="font-size: 14px;">${e.content}</div>\n        `),
        n
      );
    },
    handleResize: function () {
      this.comments.forEach(e => {
        const n = t.querySelector(
            `.opv-comment-marker[data-comment-id="${e.id}"]`,
          ),
          o = t.querySelector(
            `.opv-comment-details[data-comment-id="${e.id}"]`,
          );
        if (n && o) {
          const t = this.findTargetElement(e.selector);
          t && this.updateCommentPosition(n, o, e, t);
        }
      });
    },
    createToolbar: function () {
      (this.toolbar = t.createElement('div')),
        (this.toolbar.id = 'opv-toolbar');
      (this.toolbar.style.cssText =
        '\n          position: fixed !important;\n          bottom: 20px !important;\n          left: 50% !important;\n          transform: translateX(-50%) !important;\n          height: 36px !important;\n          background-color: rgba(33, 47, 90, 0.9) !important;\n          border: 2px solid rgb(33, 47, 90) !important;\n          border-radius: 9999px !important;\n          display: flex !important;\n          align-items: center !important;\n          justify-content: center !important;\n          padding-left: 2px;\n          padding-right: 2px;\n          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;\n          z-index: 2147483646 !important;\n          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1) !important;\n          transition: all 0.3s ease !important;\n        '),
        (this.toolbar.style.cssText +=
          '\n          @media (max-width: 768px) {\n            bottom: 10px !important;\n            left: 50% !important;\n            transform: translateX(-50%) !important;\n            width: auto !important;\n            max-width: calc(100% - 20px) !important;\n          }\n        '),
        (this.loginButton = this.createLoginButton()),
        this.toolbar.appendChild(this.loginButton),
        t.body.appendChild(this.toolbar);
    },
    statusSymbol: function (e) {
      const n = t.createElement('div');
      return (
        (n.id = 'opv-toolbar-status'),
        (n.style.cssText = `\n        height: 10px;\n        width: 10px;\n        margin-left: 4px;\n        margin-right: 4px;\n        border-radius: 50%;\n        background-color: ${e ? '#66ff00' : '#FF0000'}\n        `),
        n
      );
    },
    createToolbarGroup: function (e) {
      const n = t.createElement('div');
      return (
        (n.style.cssText =
          '\n          display: flex !important;\n          align-items: center !important;\n        '),
        e.forEach((t, o) => {
          const i = this.createToolbarButton(t.icon, t.title);
          if ((n.appendChild(i), o < e.length - 1)) {
            const e = this.createSeparator();
            n.appendChild(e);
          }
        }),
        n
      );
    },
    createToolbarButton: function (e, n) {
      const o = t.createElement('button');
      o.title = n;
      const i = t.createElement('div');
      i.style.cssText =
        '\n          position: absolute;\n          background-color: rgba(0, 0, 0, 0.8);\n          color: white;\n          padding: 4px 8px;\n          border-radius: 4px;\n          font-size: 12px;\n          bottom: 100%;\n          left: 50%;\n          transform: translateX(-50%);\n          margin-bottom: 8px;\n          white-space: nowrap;\n          opacity: 0;\n          transition: opacity 0.2s ease;\n          pointer-events: none;\n          z-index: 2147483647;\n        ';
      let s = n;
      if ('chat' === e) s += ' (C)';
      switch (
        ((i.textContent = s),
        (o.style.cssText =
          '\n          position: relative;\n          width: 24px !important;\n          height: 24px !important;\n          border: none !important;\n          background-color: transparent !important;\n          color: white !important;\n          cursor: pointer !important;\n          font-size: 14px !important;\n          display: flex !important;\n          align-items: center !important;\n          justify-content: center !important;\n          transition: all 0.3s ease !important;\n          border-radius: 9999px !important;\n          margin: 0 2px !important;\n        '),
        (o.innerHTML = this.getIconSVG(e)),
        o.addEventListener('mouseenter', () => {
          (o.style.backgroundColor = 'rgba(255, 255, 255, 0.1) !important'),
            (i.style.opacity = '1');
        }),
        o.addEventListener('mouseleave', () => {
          (o.style.backgroundColor = 'transparent !important'),
            (i.style.opacity = '0');
        }),
        o.appendChild(i),
        e)
      ) {
        case 'chat':
          o.addEventListener('click', () => this.startAddingComment());
          break;
        case 'inbox':
          o.addEventListener('click', () => this.toggleCommentsList());
          break;
        case 'eye':
          o.addEventListener('click', () => this.togglePreviewMode());
          break;
        case 'settings':
          o.addEventListener('click', () => this.showSettings());
          break;
        case 'drag':
          o.addEventListener('mousedown', () =>
            this.makeDraggable(this.toolbar),
          );
      }
      return o;
    },
    createSeparator: function () {
      const e = t.createElement('div');
      return (
        (e.style.cssText =
          '\n          width: 1px !important;\n          height: 16px !important;\n          background-color: rgba(255, 255, 255, 0.2) !important;\n          margin: 0 2px !important;\n        '),
        e
      );
    },
    getIconSVG: function (e) {
      return (
        {
          chat: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-square"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
          inbox:
            '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-inbox"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
          eye: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>',
          settings:
            '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
          drag: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>',
        }[e] || ''
      );
    },
    createButton: function (e) {
      const n = t.createElement('button');
      return (
        (n.textContent = e),
        (n.style.cssText =
          '\n          padding: 8px !important;\n          margin: 0 5px !important;\n          border: none !important;\n          background-color: transparent !important;\n          color: white !important;\n          cursor: pointer !important;\n          font-size: 14px !important;\n          border-radius: 15px !important;\n          transition: background-color 0.3s ease, color 0.3s ease !important;\n          opacity: 0.9 !important;\n        '),
        n.addEventListener('mouseover', () => {
          (n.style.backgroundColor = 'rgba(255, 255, 255, 0.2) !important'),
            (n.style.opacity = '1 !important');
        }),
        n.addEventListener('mouseout', () => {
          (n.style.backgroundColor = 'transparent !important'),
            (n.style.opacity = '0.9 !important');
        }),
        n
      );
    },
    createLoginButton: function () {
      const e = t.createElement('button');
      return (
        (e.textContent = 'Login'),
        (e.style.cssText =
          '\n          background-color: #1DA1F2;\n          color: white;\n          border: none;\n          padding: 6px 12px;\n          border-radius: 9999px;\n          cursor: pointer;\n          font-size: 14px;\n          font-weight: bold;\n          transition: all 0.3s ease;\n          min-width: 70px; // Slightly reduced minimum width\n          text-align: center;\n          white-space: nowrap;\n          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);\n        '),
        e.addEventListener('mouseenter', () => {
          (e.style.backgroundColor = '#1991db'),
            (e.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)');
        }),
        e.addEventListener('mouseleave', () => {
          (e.style.backgroundColor = '#1DA1F2'),
            (e.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)');
        }),
        e.addEventListener('click', () => this.login()),
        e
      );
    },
    createCommentForm: function () {
      (this.commentForm = t.createElement('div')),
        (this.commentForm.id = 'opv-comment-form'),
        (this.commentForm.style.cssText =
          '\n          position: fixed;\n          background-color: white;\n          padding: 20px;\n          border-radius: 12px;\n          box-shadow: 0 4px 12px rgba(0,0,0,0.15);\n          z-index: 2147483647;\n          display: none;\n          width: 300px;\n          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;\n        ');
      const e = t.createElement('textarea');
      e.style.cssText =
        '\n          width: 100%;\n          height: 100px;\n          margin-bottom: 10px;\n          padding: 10px;\n          border: 1px solid #e1e4e8;\n          border-radius: 6px;\n          font-size: 14px;\n          resize: vertical;\n        ';
      const n = t.createElement('button');
      (n.textContent = 'Submit'),
        (n.style.cssText =
          '\n          padding: 8px 16px;\n          background-color: rgb(33, 47, 90);\n          color: white;\n          border: none;\n          border-radius: 6px;\n          cursor: pointer;\n          font-size: 14px;\n          font-weight: 500;\n          transition: background-color 0.3s ease;\n        ');
      const o = t.createElement('button');
      (o.textContent = 'Cancel'),
        (o.style.cssText =
          '\n          padding: 8px 16px;\n          background-color: #f1f3f5;\n          color: #333;\n          border: none;\n          border-radius: 6px;\n          cursor: pointer;\n          font-size: 14px;\n          font-weight: 500;\n          margin-left: 10px;\n          transition: background-color 0.3s ease;\n        '),
        n.addEventListener('mouseover', () => {
          n.style.backgroundColor = 'rgb(45, 60, 110)';
        }),
        n.addEventListener('mouseout', () => {
          n.style.backgroundColor = 'rgb(33, 47, 90)';
        }),
        o.addEventListener('mouseover', () => {
          o.style.backgroundColor = '#e9ecef';
        }),
        o.addEventListener('mouseout', () => {
          o.style.backgroundColor = '#f1f3f5';
        }),
        this.commentForm.appendChild(e),
        this.commentForm.appendChild(n),
        this.commentForm.appendChild(o),
        t.body.appendChild(this.commentForm);
    },
    makeDraggable: function (e) {
      let n,
        o,
        i,
        s,
        r = !1;
      const a = e.querySelector('button[title="Drag"]');
      function l(a) {
        a.preventDefault(),
          (r = !0),
          'mousedown' === a.type
            ? ((n = a.clientX), (o = a.clientY))
            : 'touchstart' === a.type &&
              ((n = a.touches[0].clientX), (o = a.touches[0].clientY)),
          (i = e.offsetLeft),
          (s = parseInt(e.style.bottom, 10) || 20),
          t.addEventListener('mousemove', c),
          t.addEventListener('touchmove', c),
          t.addEventListener('mouseup', d),
          t.addEventListener('touchend', d);
      }
      function c(t) {
        if (!r) return;
        let a, l;
        'mousemove' === t.type
          ? ((a = t.clientX), (l = t.clientY))
          : 'touchmove' === t.type &&
            ((a = t.touches[0].clientX), (l = t.touches[0].clientY));
        const c = i + (a - n),
          d = s + (o - l);
        (e.style.left = `${c}px`),
          (e.style.bottom = `${d}px`),
          (e.style.transform = 'none');
      }
      function d() {
        (r = !1),
          t.removeEventListener('mousemove', c),
          t.removeEventListener('touchmove', c),
          t.removeEventListener('mouseup', d),
          t.removeEventListener('touchend', d);
      }
      a &&
        (a.addEventListener('mousedown', l),
        a.addEventListener('touchstart', l));
    },
    togglePopover: function (e) {
      'none' === e.style.display || '' === e.style.display
        ? ((e.style.display = 'block'), this.positionPopover(e))
        : (e.style.display = 'none');
    },
    showSettings: function () {
      this.settingsPopover || this.createSettingsPopover(),
        this.togglePopover(this.settingsPopover);
    },
    toggleMenu: function () {
      this.menuPopover || this.createMenuPopover(),
        this.togglePopover(this.menuPopover);
    },
    setupEventListeners: function () {
      t.addEventListener('DOMContentLoaded', () => {
        this.toolbar
          .querySelector('button')
          .addEventListener('click', () => this.showCommentForm());
        this.commentForm
          .querySelectorAll('button')[1]
          .addEventListener('click', () => this.hideCommentForm()),
          t.addEventListener('click', e => {
            e.target.closest('.opv-comment-marker') &&
              this.showCommentDetails(
                e.target.closest('.opv-comment-marker').dataset.commentId,
              );
          });
      }),
        t.addEventListener('click', e => {
          !this.settingsPopover ||
            this.settingsPopover.contains(e.target) ||
            e.target.closest('button[title="Settings"]') ||
            (this.settingsPopover.style.display = 'none');
        });
    },
    hideCommentForm: function () {
      this.commentForm.style.display = 'none';
    },
    addComment: function () {
      const e = this.commentForm.querySelector('textarea'),
        t = e.value.trim();
      if (!t) return;
      const n = this.getTargetElement();
      if (!n) return;
      const o = parseFloat(this.commentForm.dataset.x),
        i = parseFloat(this.commentForm.dataset.y),
        s = this.calculateRelativePosition(n, o, i),
        r = {
          content: t,
          selector: s.selector,
          x_percent: s.x_percent,
          y_percent: s.y_percent,
          url: this.windowUrl,
          page_title: s.page_title,
          screen_width: s.screen_width,
          screen_height: s.screen_height,
          device_pixel_ratio: s.device_pixel_ratio,
          deployment_url: s.deployment_url,
          user_agent: s.user_agent,
          draft_mode: s.draft_mode,
          node_id: s.node_id,
        };
      this.ws.send(
        JSON.stringify({
          type: 'newComment',
          projectId: this.projectId,
          url: this.windowUrl,
          comment: r,
          token: this.token,
        }),
      ),
        this.hideCommentForm(),
        (e.value = ''),
        this.showNotification({ message: 'Comment added successfully!' });
    },
    getUniqueSelector: function (e) {
      if (!e || e === t.body) return 'body';
      let n = [],
        o = e;
      for (; o && o !== t.body && o !== t.documentElement; ) {
        let e = o.tagName.toLowerCase();
        if (o.parentNode) {
          const t = Array.from(o.parentNode.children).filter(
            e => e.tagName === o.tagName,
          );
          if (t.length > 1) {
            e += `:nth-of-type(${t.indexOf(o) + 1})`;
          }
        }
        n.unshift(e), (o = o.parentNode);
      }
      return n.unshift('body'), n.join(' > ');
    },
    findTargetElement: function (e) {
      if (!e) return t.body;
      try {
        const n = t.querySelector(e);
        return n || t.body;
      } catch (e) {
        return t.body;
      }
    },
    calculateRelativePosition: function (n, o, i) {
      const s = n.getBoundingClientRect(),
        r = (o - s.left) / s.width,
        a = (i - s.top) / s.height;
      return {
        selector: this.getUniqueSelector(n),
        x_percent: r,
        y_percent: a,
        page_title: t.title,
        screen_width: Math.round(e.innerWidth),
        screen_height: Math.round(e.innerHeight),
        device_pixel_ratio: e.devicePixelRatio,
        deployment_url: e.location.host,
        user_agent: navigator.userAgent,
        draft_mode: !1,
        node_id: null,
      };
    },
    getTargetElement: function () {
      const e = parseFloat(this.commentForm.dataset.x),
        n = parseFloat(this.commentForm.dataset.y);
      return t.elementFromPoint(e, n);
    },
    showCommentDetails: function (e) {
      const n = t.querySelector(`.opv-comment-details[data-comment-id="${e}"]`),
        o = t.querySelector(`.opv-comment-marker[data-comment-id="${e}"]`);
      if (n && o) {
        const e = 'block' === n.style.display;
        (n.style.display = e ? 'none' : 'block'),
          e || this.positionDetailsBox(o, n);
      }
    },
    showNotification: function ({
      message: e,
      variant: n = 'default',
      persist: o,
    }) {
      const i = t.createElement('div');
      i.textContent = e;
      (i.style.cssText = `\n          position: fixed;\n          top: 20px;\n          right: 20px;\n          max-width: 350px;\n          flex-wrap: wrap;\n          background-color: ${'destructive' === n ? '#c70000' : '#4CAF50'};\n          color: white;\n          padding: 15px;\n          border-radius: 5px;\n          z-index: 2147483647;\n          animation: fadeInOut 3s forwards;\n        `),
        (i.style.cssText +=
          '\n          @media (max-width: 768px) {\n            left: 10px;\n            right: 10px;\n            width: calc(100% - 20px);\n            top: 10px;\n          }\n        ');
      const s = t.createElement('style');
      o ||
        (s.textContent =
          '\n            @keyframes fadeInOut {\n              0% { opacity: 0; }\n              10% { opacity: 1; }\n              90% { opacity: 1; }\n              100% { opacity: 0; }\n            }\n          '),
        t.head.appendChild(s),
        t.body.appendChild(i),
        o ||
          setTimeout(() => {
            t.body.removeChild(i);
          }, 3e3);
    },
    createCommentsList: function () {
      (this.commentsList = t.createElement('div')),
        (this.commentsList.id = 'opv-comments-list'),
        (this.commentsList.style.cssText =
          '\n          position: fixed;\n          top: 20px;\n          right: 20px;\n          width: 300px;\n          max-height: 80vh;\n          overflow-y: auto;\n          background-color: white;\n          border-radius: 12px;\n          padding: 16px;\n          box-shadow: 0 4px 12px rgba(0,0,0,0.1);\n          z-index: 2147483645;\n          display: none;\n          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;\n        '),
        t.body.appendChild(this.commentsList);
    },
    toggleCommentsList: function () {
      const e = 'block' === this.commentsList.style.display;
      (this.commentsList.style.display = e ? 'none' : 'block'),
        e || this.updateCommentsList();
    },
    updateCommentsList: function () {
      (this.commentsList.innerHTML = ''),
        this.comments
          .filter(
            e => new URL(e.url).pathname === new URL(this.windowUrl).pathname,
          )
          .forEach(e => {
            const t = this.createCommentElement(e);
            this.commentsList.appendChild(t);
          });
    },
    createCommentElement: function (e) {
      const n = t.createElement('div');
      (n.style.cssText =
        '\n          margin-bottom: 16px;\n          padding: 12px;\n          background-color: #f7f9fa;\n          border-radius: 8px;\n          cursor: pointer;\n          transition: background-color 0.3s ease;\n        '),
        n.addEventListener('mouseover', () => {
          n.style.backgroundColor = '#edf1f3';
        }),
        n.addEventListener('mouseout', () => {
          n.style.backgroundColor = '#f7f9fa';
        }),
        n.addEventListener('click', () => {
          const n = t.querySelector(
            `.opv-comment-marker[data-comment-id="${e.id}"]`,
          );
          if (n) {
            n.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const t = n.style.backgroundColor;
            (n.style.backgroundColor = '#FFD700'),
              setTimeout(() => {
                n.style.backgroundColor = t;
              }, 1500),
              this.showCommentDetails(e.id);
          }
          this.toggleCommentsList();
        });
      const o = t.createElement('div');
      o.style.cssText =
        '\n          display: flex;\n          align-items: center;\n          margin-bottom: 8px;\n        ';
      const i = t.createElement('img');
      (i.src = e.user.avatar_url),
        (i.style.cssText =
          '\n          width: 24px;\n          height: 24px;\n          border-radius: 50%;\n          margin-right: 8px;\n        ');
      const s = t.createElement('span');
      (s.textContent = e.user.name),
        (s.style.cssText =
          '\n          font-weight: bold;\n          font-size: 14px;\n        '),
        o.appendChild(i),
        o.appendChild(s);
      const r = t.createElement('div');
      (r.textContent = e.content),
        (r.style.cssText =
          '\n          font-size: 14px;\n          line-height: 1.4;\n          margin-bottom: 8px;\n        ');
      const a = t.createElement('div');
      if (
        ((a.textContent = new Date(e.created_at).toLocaleString()),
        (a.style.cssText =
          '\n          font-size: 12px;\n          color: #657786;\n          margin-bottom: 8px;\n        '),
        n.appendChild(o),
        n.appendChild(r),
        n.appendChild(a),
        e.replies && e.replies.length > 0)
      ) {
        const o = t.createElement('div');
        (o.style.cssText =
          '\n            margin-left: 20px;\n            border-left: 2px solid #E1E8ED;\n            padding-left: 12px;\n          '),
          e.replies.forEach(e => {
            const t = this.createReplyElementForList(e);
            o.appendChild(t);
          }),
          n.appendChild(o);
      }
      return n;
    },
    createReplyElement: function (e) {
      const n = t.createElement('div');
      n.style.cssText =
        '\n          margin-bottom: 16px;\n          padding-left: 24px;\n          position: relative;\n        ';
      const o = t.createElement('div');
      (o.style.cssText =
        '\n          position: absolute;\n          left: 20px;\n          top: 0;\n          bottom: 0;\n          width: 2px;\n          background-color: #E1E8ED;\n        '),
        n.appendChild(o);
      const i = t.createElement('div');
      i.style.cssText =
        '\n          display: flex;\n          align-items: center;\n          margin-bottom: 8px;\n        ';
      const s = t.createElement('img');
      (s.src = e.user.avatar_url),
        (s.style.cssText =
          '\n          width: 32px;\n          height: 32px;\n          border-radius: 50%;\n          margin-right: 8px;\n        ');
      const r = t.createElement('span');
      (r.textContent = e.user.name),
        (r.style.cssText =
          '\n          font-weight: bold;\n          font-size: 14px;\n        '),
        i.appendChild(s),
        i.appendChild(r);
      const a = t.createElement('div');
      (a.textContent = e.content),
        (a.style.cssText =
          '\n          font-size: 14px;\n          line-height: 1.4;\n          margin-bottom: 4px;\n        ');
      const l = t.createElement('div');
      return (
        (l.textContent = new Date(e.created_at).toLocaleString()),
        (l.style.cssText =
          '\n          font-size: 12px;\n          color: #657786;\n        '),
        n.appendChild(i),
        n.appendChild(a),
        n.appendChild(l),
        n
      );
    },
    createReplyForm: function (e) {
      const n = t.createElement('div');
      n.style.cssText =
        '\n          margin-top: 16px;\n          border-top: 1px solid #E1E8ED;\n          padding-top: 16px;\n        ';
      const o = t.createElement('textarea');
      (o.style.cssText =
        '\n          width: 100%;\n          height: 80px;\n          margin-bottom: 8px;\n          padding: 8px;\n          border: 1px solid #E1E8ED;\n          border-radius: 8px;\n          font-size: 14px;\n          resize: none;\n          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);\n          transition: border 0.3s ease, box-shadow 0.3s ease;\n        '),
        o.addEventListener('focus', () => {
          (o.style.border = '1px solid #1DA1F2'),
            (o.style.boxShadow =
              'inset 0 1px 2px rgba(0, 0, 0, 0.05), 0 0 0 2px rgba(29, 161, 242, 0.2)');
        }),
        o.addEventListener('blur', () => {
          (o.style.border = '1px solid #E1E8ED'),
            (o.style.boxShadow = 'inset 0 1px 2px rgba(0, 0, 0, 0.05)');
        });
      const i = t.createElement('button');
      return (
        (i.textContent = 'Reply'),
        (i.style.cssText =
          '\n          background-color: #1DA1F2;\n          color: white;\n          border: none;\n          padding: 8px 16px;\n          border-radius: 9999px;\n          cursor: pointer;\n          font-size: 14px;\n          font-weight: bold;\n          transition: background-color 0.3s ease;\n        '),
        i.addEventListener('mouseover', () => {
          i.style.backgroundColor = '#1A91DA';
        }),
        i.addEventListener('mouseout', () => {
          i.style.backgroundColor = '#1DA1F2';
        }),
        i.addEventListener('click', () => {
          const t = o.value.trim();
          t && (this.addReply(e, t), (o.value = ''));
        }),
        n.appendChild(o),
        n.appendChild(i),
        n
      );
    },
    addReply: function (e, t) {
      const n = this.comments.find(t => t.id === e);
      if (n) {
        const e = {
          id: Date.now().toString(),
          content: t,
          user: { name: 'John Doe', avatar: 'https://i.pravatar.cc/150?img=8' },
          timestamp: new Date().toISOString(),
        };
        n.replies.push(e),
          this.updateCommentDetails(n),
          this.updateCommentsList(),
          this.showNotification({ message: 'Reply added successfully!' });
      }
    },
    updateCommentDetails: function (e) {
      const n = t.querySelector(
        `.opv-comment-details[data-comment-id="${e.id}"]`,
      );
      if (n) {
        let o = n.querySelector('.replies-container');
        o ||
          ((o = t.createElement('div')),
          o.classList.add('replies-container'),
          (o.style.cssText =
            '\n              margin-top: 15px;\n              padding-top: 15px;\n              border-top: 1px solid #eee;\n            '),
          n.insertBefore(o, n.querySelector('.reply-form'))),
          (o.innerHTML = ''),
          e.replies.forEach(e => {
            const n = t.createElement('div');
            (n.style.marginBottom = '10px'),
              (n.innerHTML = `\n              <div style="display: flex; align-items: center; margin-bottom: 5px;">\n                <img src="${e.user.avatar_url}" alt="${e.user.name}" style="width: 30px; height: 30px; border-radius: 50%; margin-right: 10px;">\n                <div>\n                  <div style="font-weight: bold;">${e.user.name}</div>\n                  <div style="font-size: 0.8em; color: #666;">${new Date(e.created_at).toLocaleString()}</div>\n                </div>\n              </div>\n              <div style="margin-left: 40px;">${e.content}</div>\n            `),
              o.appendChild(n);
          });
        const i = n.querySelector('input[type="color"]');
        i && (i.value = e.color || '#1DA1F2');
      }
    },
    toggleResolveComment: function (e) {
      const t = this.comments.find(t => t.id === e);
      t &&
        ((t.resolved = !t.resolved),
        this.updateCommentMarker(t),
        this.updateCommentDetails(t),
        this.updateCommentsList(),
        this.showNotification({
          message: 'Comment ' + (t.resolved ? 'resolved' : 'unresolved'),
        }));
    },
    updateCommentMarker: function (e) {
      const n = t.querySelector(
        `.opv-comment-marker[data-comment-id="${e.id}"]`,
      );
      n && (n.style.backgroundColor = e.resolved ? '#4CAF50' : '#1e3a8a');
    },
    createReplyElementForList: function (e) {
      const n = t.createElement('div');
      n.style.cssText =
        '\n          margin-top: 8px;\n          font-size: 13px;\n        ';
      const o = t.createElement('span');
      (o.textContent = e.user.name), (o.style.fontWeight = 'bold');
      const i = t.createElement('span');
      return (
        (i.textContent = `: ${e.content}`),
        n.appendChild(o),
        n.appendChild(i),
        n
      );
    },
    showInbox: function () {
      this.toggleCommentsList();
    },
    togglePreviewMode: function () {
      this.commentsVisible = !this.commentsVisible;
      const e = t.querySelectorAll('.opv-comment-marker'),
        n = t.querySelectorAll('.opv-comment-details');
      e.forEach(e => {
        e.style.display = this.commentsVisible ? 'flex' : 'none';
      }),
        n.forEach(e => {
          e.style.display = 'none';
        }),
        this.updateEyeIcon();
    },
    updateEyeIcon: function () {
      const e = this.toolbar.querySelector('button[title="Preview"]');
      e &&
        (e.innerHTML = this.getIconSVG(
          this.commentsVisible ? 'eye' : 'eye-off',
        ));
    },
    showSettings: function () {
      this.settingsPopover || this.createSettingsPopover(),
        (this.settingsPopover.style.display = 'block'),
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
      this.menuPopover || this.createMenuPopover(),
        'none' === this.menuPopover.style.display
          ? ((this.menuPopover.style.display = 'block'),
            this.positionPopover(this.menuPopover))
          : (this.menuPopover.style.display = 'none');
    },
    createMenuPopover: function () {
      this.menuPopover = this.createPopover('Menu', [
        { label: 'My Profile', type: 'button' },
        { label: 'Help Center', type: 'button' },
        { label: 'Logout', type: 'button' },
      ]);
    },
    createPopover: function (e, n) {
      const o = t.createElement('div');
      (o.style.cssText =
        '\n          position: fixed;\n          bottom: 58px; // Position above the toolbar with a small gap\n          left: 50%;\n          transform: translateX(-50%);\n          width: 300px;\n          background-color: rgb(33, 47, 90); // Solid color, matching the toolbar\n          border: 1px solid rgb(33, 47, 90);\n          border-radius: 24px;\n          box-shadow: 0 2px 10px rgba(0,0,0,0.1);\n          padding: 16px;\n          display: none;\n          z-index: 2147483647;\n          color: white;\n          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;\n        '),
        (o.style.cssText +=
          '\n          @media (max-width: 768px) {\n            width: 90%;\n            max-width: 300px;\n            left: 50% !important;\n            transform: translateX(-50%) !important;\n          }\n        ');
      const i = t.createElement('h3');
      return (
        (i.textContent = e),
        (i.style.cssText =
          '\n          margin: 0 0 16px 0;\n          font-size: 18px;\n          font-weight: bold;\n          color: white;\n        '),
        o.appendChild(i),
        n.forEach(e => {
          const n = t.createElement('div');
          if (((n.style.marginBottom = '12px'), 'checkbox' === e.type)) {
            const o = t.createElement('input');
            (o.type = 'checkbox'),
              (o.id = e.label.toLowerCase().replace(/\s/g, '-'));
            const i = t.createElement('label');
            (i.htmlFor = o.id),
              (i.textContent = e.label),
              (i.style.color = 'white'),
              (i.style.marginLeft = '8px'),
              n.appendChild(o),
              n.appendChild(i);
          } else if ('select' === e.type) {
            const o = t.createElement('select');
            (o.id = e.label.toLowerCase().replace(/\s/g, '-')),
              (o.style.cssText =
                '\n              width: 100%;\n              padding: 4px;\n              background-color: rgba(255, 255, 255, 0.1);\n              color: white;\n              border: 1px solid rgba(255, 255, 255, 0.3);\n              border-radius: 4px;\n            '),
              e.options.forEach(e => {
                const n = t.createElement('option');
                (n.value = e.toLowerCase()),
                  (n.textContent = e),
                  o.appendChild(n);
              });
            const i = t.createElement('label');
            (i.htmlFor = o.id),
              (i.textContent = e.label),
              (i.style.color = 'white'),
              (i.style.display = 'block'),
              (i.style.marginBottom = '4px'),
              n.appendChild(i),
              n.appendChild(o);
          } else if ('button' === e.type) {
            const o = t.createElement('button');
            (o.textContent = e.label),
              (o.style.cssText =
                '\n              width: 100%;\n              padding: 8px;\n              background-color: rgba(255, 255, 255, 0.1);\n              color: white;\n              border: 1px solid rgba(255, 255, 255, 0.3);\n              border-radius: 4px;\n              cursor: pointer;\n              transition: background-color 0.3s ease;\n            '),
              o.addEventListener('mouseover', () => {
                o.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
              }),
              o.addEventListener('mouseout', () => {
                o.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }),
              e.onClick && o.addEventListener('click', e.onClick),
              n.appendChild(o);
          } else
            'message' === e.type &&
              ((n.textContent = e.label), (n.style.color = 'white'));
          o.appendChild(n);
        }),
        t.body.appendChild(o),
        o
      );
    },
    togglePopover: function (e) {
      'none' === e.style.display
        ? (e.style.display = 'block')
        : (e.style.display = 'none');
    },
    positionPopover: function (t) {
      const n = this.toolbar.getBoundingClientRect(),
        o = t.getBoundingClientRect();
      t.style.bottom = e.innerHeight - n.top + 10 + 'px';
      const i = n.left + (n.width - o.width) / 2,
        s = i + o.width;
      i < 10
        ? ((t.style.left = '10px'), (t.style.transform = 'none'))
        : s > e.innerWidth - 10
          ? ((t.style.left = 'auto'),
            (t.style.right = '10px'),
            (t.style.transform = 'none'))
          : ((t.style.left = '50%'), (t.style.transform = 'translateX(-50%)'));
    },
    cancelAddingComment: function () {
      (this.isSelectingCommentLocation = !1),
        (t.body.style.cursor = 'default'),
        this.addCommentPopover &&
          (this.addCommentPopover.remove(), (this.addCommentPopover = null)),
        this.overlay && (this.overlay.remove(), (this.overlay = null));
    },
    startAddingComment: function () {
      if (this.isSelectingCommentLocation)
        return void this.cancelAddingComment();
      this.addCommentPopover && this.addCommentPopover.remove(),
        (this.addCommentPopover = this.createPopover('Add Comment', [
          {
            label: 'Click anywhere to place your comment (ESC to cancel)',
            type: 'message',
          },
        ])),
        (this.addCommentPopover.style.display = 'block'),
        this.positionPopover(this.addCommentPopover),
        (this.isSelectingCommentLocation = !0),
        (t.body.style.cursor = 'crosshair'),
        (this.overlay = t.createElement('div')),
        (this.overlay.style.cssText =
          '\n          position: fixed;\n          top: 0;\n          left: 0;\n          width: 100%;\n          height: 100%;\n          background-color: transparent;\n          z-index: 2147483646;\n          cursor: crosshair;\n        ');
      const e = n => {
        'Escape' === n.key &&
          (this.cancelAddingComment(), t.removeEventListener('keydown', e));
      };
      t.addEventListener('keydown', e),
        this.overlay.addEventListener('click', n => {
          n.preventDefault(), n.stopPropagation();
          const o = n.clientX,
            i = n.clientY;
          this.cancelAddingComment(),
            t.removeEventListener('keydown', e),
            'number' != typeof o ||
              'number' != typeof i ||
              isNaN(o) ||
              isNaN(i) ||
              this.showCommentForm(o, i);
        }),
        this.overlay.addEventListener('mousedown', e => {
          e.preventDefault(), e.stopPropagation();
        }),
        t.body.appendChild(this.overlay),
        setTimeout(() => {
          this.addCommentPopover &&
            (this.addCommentPopover.remove(), (this.addCommentPopover = null));
        }, 2e3);
    },
    handleCommentPlacement: null,
    showCommentForm: function (n, o) {
      if ('number' != typeof n || 'number' != typeof o || isNaN(n) || isNaN(o))
        return;
      const i = t.elementFromPoint(n, o);
      if (!i) return;
      const {
          selector: s,
          x_percent: r,
          y_percent: a,
        } = this.calculateRelativePosition(i, n, o),
        l = {
          id: `temp-${crypto.randomUUID()}`,
          content: '',
          selector: s,
          x_percent: r,
          y_percent: a,
          url: this.windowUrl,
          user: this.user || {
            name: 'Anonymous',
            avatar_url: 'https://i.pravatar.cc/150?img=8',
          },
          created_at: new Date().toISOString(),
          replies: [],
          color: '#1DA1F2',
          page_title: t.title,
          screen_width: Math.round(e.innerWidth),
          screen_height: Math.round(e.innerHeight),
          device_pixel_ratio: e.devicePixelRatio,
          deployment_url: e.location.host,
          user_agent: navigator.userAgent,
          draft_mode: !0,
        };
      this.renderComment(l);
      const c = t.querySelector(
        `.opv-comment-details[data-comment-id="${l.id}"]`,
      );
      if (c) {
        c.innerHTML = '';
        const n = t.createElement('div');
        n.classList.add('comment-form'),
          (n.style.cssText =
            '\n            margin-top: 15px;\n            padding-top: 15px;\n          ');
        const o = t.createElement('textarea');
        (o.style.cssText =
          '\n            width: 100%;\n            height: 80px;\n            margin-bottom: 8px;\n            padding: 8px;\n            border: 1px solid #E1E8ED;\n            border-radius: 8px;\n            font-size: 14px;\n            resize: none;\n            box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);\n            transition: border 0.3s ease, box-shadow 0.3s ease;\n          '),
          o.addEventListener('focus', () => {
            (o.style.border = '1px solid #1DA1F2'),
              (o.style.boxShadow =
                'inset 0 1px 2px rgba(0, 0, 0, 0.05), 0 0 0 2px rgba(29, 161, 242, 0.2)');
          }),
          o.addEventListener('blur', () => {
            (o.style.border = '1px solid #E1E8ED'),
              (o.style.boxShadow = 'inset 0 1px 2px rgba(0, 0, 0, 0.05)');
          });
        const i = t.createElement('button');
        (i.textContent = 'Publish'),
          (i.style.cssText =
            '\n            background-color: #1DA1F2;\n            color: white;\n            border: none;\n            padding: 8px 16px;\n            border-radius: 9999px;\n            cursor: pointer;\n            font-size: 14px;\n            font-weight: bold;\n            transition: background-color 0.3s ease;\n          '),
          i.addEventListener('mouseover', () => {
            i.style.backgroundColor = '#1A91DA';
          }),
          i.addEventListener('mouseout', () => {
            i.style.backgroundColor = '#1DA1F2';
          }),
          i.addEventListener('click', () => {
            const e = o.value.trim();
            if (e) {
              const n = t.querySelector(
                `.opv-comment-marker[data-comment-id="${l.id}"]`,
              );
              n && n.remove(), c.remove();
              const o = {
                ...l,
                content: e,
                url: this.windowUrl,
                draft_mode: !1,
              };
              this.ws.send(
                JSON.stringify({
                  type: 'newComment',
                  projectId: this.projectId,
                  url: this.windowUrl,
                  comment: o,
                  token: this.token,
                }),
              ),
                this.comments.push(o),
                this.showNotification({
                  message: 'Comment added successfully!',
                });
            }
          }),
          n.appendChild(o),
          n.appendChild(i),
          c.appendChild(n),
          (c.style.display = 'block');
        const s = e.pageYOffset;
        o.focus({ preventScroll: !0 }), e.scrollTo(0, s);
      }
    },
    findTargetElement: function (e) {
      if (!e) return t.body;
      try {
        const n = t.querySelector(e);
        return n || void 0;
      } catch (e) {
        return;
      }
    },
    renderComment: function (n) {
      let o = this.findTargetElement(n.selector);
      if (e.location.pathname !== new URL(n.url).pathname) return null;
      if (!o) return;
      const i = t.createElement('div');
      if (
        (i.classList.add('opv-comment-marker'),
        (i.dataset.commentId = n.id),
        (i.style.cssText = `\n          position: absolute;\n          width: 32px;\n          height: 32px;\n          background-color: ${n.resolved_at ? '#4CAF50' : '#1DA1F2'};\n          border-radius: 20% 100% 100% 100%;\n          cursor: pointer;\n          z-index: 2147483647;\n          display: flex;\n          align-items: center;\n          justify-content: center;\n          color: white;\n          font-size: 16px;\n          box-shadow: 0 2px 10px rgba(29, 161, 242, 0.3);\n          transition: none;\n          user-select: none;\n        `),
        n.user && n.user.avatar_url)
      )
        i.innerHTML = `\n            <div style="width: 100%; height: 100%; padding: 4px;">\n              <div style="background-image: url(${n.user.avatar_url}); background-size: cover; background-position: center; background-repeat: no-repeat; width: 100%; height: 100%; border-radius: 50%;"></div>\n            </div>\n          `;
      else {
        const e =
          n.user && n.user.name ? n.user.name.charAt(0).toUpperCase() : '?';
        i.innerHTML = `\n            <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-weight: bold;">\n              ${e}\n            </div>\n          `;
      }
      const s = o.getBoundingClientRect(),
        r = s.left + n.x_percent * s.width,
        a = s.top + n.y_percent * s.height;
      (i.style.left = `${r + e.scrollX}px`),
        (i.style.top = `${a + e.scrollY}px`),
        t.body.appendChild(i);
      const l = t.createElement('div');
      l.classList.add('opv-comment-details'),
        (l.dataset.commentId = n.id),
        (l.style.cssText =
          '\n          position: absolute;\n          width: 300px;\n          background-color: white;\n          border-radius: 12px;\n          padding: 16px;\n          box-shadow: 0 4px 12px rgba(0,0,0,0.1);\n          z-index: 2147483648;\n          display: none;\n          max-height: 400px;\n          overflow-y: auto;\n          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;\n        ');
      const c = t.createElement('div');
      c.style.cssText =
        '\n          display: flex;\n          justify-content: space-between;\n          align-items: flex-start;\n          margin-bottom: 12px;\n        ';
      const d = t.createElement('div');
      d.style.cssText =
        '\n          display: flex;\n          align-items: center;\n          flex: 1;\n        ';
      const p = t.createElement('img');
      (p.src = n.user && n.user.avatar_url ? n.user.avatar_url : ''),
        (p.style.cssText = `\n          width: 32px;\n          height: 32px;\n          border-radius: 50%;\n          margin-right: 8px;\n          ${p.src ? '' : 'display: none;'}\n        `);
      const m = t.createElement('div');
      m.innerHTML = `\n          <div style="font-weight: bold;">${(n.user && n.user.name) || 'Anonymous'}</div>\n          <div style="font-size: 12px; color: #657786;">${new Date(n.created_at).toLocaleString()}</div>\n        `;
      const h = t.createElement('div');
      h.style.cssText =
        '\n          margin-left: 8px;\n          color: #657786;\n          display: flex;\n          align-items: center;\n        ';
      const u = /Mobile|Android|iPhone|iPad|iPod/i.test(n.user_agent);
      (h.innerHTML = u
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>\n            <line x1="12" y1="18" x2="12" y2="18"/>\n          </svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>\n            <line x1="8" y1="21" x2="16" y2="21"/>\n            <line x1="12" y1="17" x2="12" y2="21"/>\n          </svg>'),
        (h.title = u ? 'Mobile Device' : 'Desktop Device'),
        d.appendChild(p),
        d.appendChild(m),
        c.appendChild(d),
        c.appendChild(h),
        l.appendChild(c);
      const g = t.createElement('div');
      (g.style.cssText =
        '\n          margin-bottom: 16px;\n          font-size: 14px;\n          line-height: 1.4;\n          color: #1f2937;\n        '),
        (g.textContent = n.content),
        l.appendChild(g);
      const y = t.createElement('div');
      y.classList.add('replies-container'),
        n.replies &&
          n.replies.length > 0 &&
          n.replies.forEach(e => {
            const t = this.createReplyElement(e);
            y.appendChild(t);
          }),
        l.appendChild(y);
      const x = this.createReplyForm(n.id);
      let v, f;
      l.appendChild(x), t.body.appendChild(l);
      const b = e => {
        const n = t.activeElement;
        return (
          n &&
          e.contains(n) &&
          ('INPUT' === n.tagName || 'TEXTAREA' === n.tagName)
        );
      };
      return (
        i.addEventListener('mouseenter', () => {
          clearTimeout(f),
            (v = setTimeout(() => {
              t.querySelectorAll('.opv-comment-details').forEach(e => {
                e !== l && (e.style.display = 'none');
              }),
                (l.style.display = 'block'),
                this.positionDetailsBox(i, l);
            }, 100));
        }),
        i.addEventListener('mouseleave', () => {
          clearTimeout(v),
            (f = setTimeout(() => {
              l.matches(':hover') || b(l) || (l.style.display = 'none');
            }, 300));
        }),
        l.addEventListener('mouseenter', () => {
          clearTimeout(f);
        }),
        l.addEventListener('mouseleave', () => {
          f = setTimeout(() => {
            i.matches(':hover') || b(l) || (l.style.display = 'none');
          }, 300);
        }),
        e.addEventListener('resize', () => {
          'block' === l.style.display && this.positionDetailsBox(i, l);
        }),
        this.makeCommentDraggable(i, l, n),
        { marker: i, detailsBox: l }
      );
    },
    positionDetailsBox: function (n, o) {
      const i = n.getBoundingClientRect(),
        s = o.getBoundingClientRect(),
        r = e.innerWidth,
        a = e.innerHeight,
        l = e.pageXOffset || t.documentElement.scrollLeft,
        c = e.pageYOffset || t.documentElement.scrollTop;
      let d;
      d =
        r - i.right >= s.width + 10
          ? i.right + l + 10
          : i.left >= s.width + 10
            ? i.left + l - s.width - 10
            : l + (r - s.width) / 2;
      let p = i.top + c;
      p + s.height > c + a && (p = c + a - s.height - 10),
        (o.style.left = `${d}px`),
        (o.style.top = `${p}px`);
    },
    calculateRelativePosition: function (n, o, i) {
      const s = n.getBoundingClientRect(),
        r = (o - s.left) / s.width,
        a = (i - s.top) / s.height;
      return {
        selector: this.getUniqueSelector(n),
        x_percent: r,
        y_percent: a,
        page_title: t.title,
        screen_width: Math.round(e.innerWidth),
        screen_height: Math.round(e.innerHeight),
        device_pixel_ratio: e.devicePixelRatio,
        deployment_url: e.location.host,
        user_agent: navigator.userAgent,
        draft_mode: !1,
        node_id: null,
      };
    },
    makeCommentDraggable: function (n, o, i, s) {
      let r,
        a,
        l,
        c,
        d,
        p = !1;
      const m = o => {
          if (0 !== o.button) return;
          o.preventDefault(),
            o.stopPropagation(),
            (p = !0),
            (r = o.clientX),
            (a = o.clientY);
          const i = n.getBoundingClientRect();
          (l = i.left + e.scrollX),
            (c = i.top + e.scrollY),
            t.addEventListener('mousemove', h),
            t.addEventListener('mouseup', u);
        },
        h = e => {
          if (!p) return;
          const t = e.clientX - r,
            i = e.clientY - a,
            s = l + t,
            d = c + i;
          (n.style.left = `${s}px`),
            (n.style.top = `${d}px`),
            o &&
              'block' === o.style.display &&
              ((o.style.left = `${s + 40}px`), (o.style.top = `${d}px`));
        },
        u = s => {
          if (
            p &&
            ((p = !1),
            t.removeEventListener('mousemove', h),
            t.removeEventListener('mouseup', u),
            (n.style.display = 'none'),
            (d = t.elementFromPoint(s.clientX, s.clientY)),
            (n.style.display = 'flex'),
            d)
          ) {
            const t = d.getBoundingClientRect(),
              s = n.getBoundingClientRect(),
              r = (s.left + e.scrollX - (t.left + e.scrollX)) / t.width,
              a = (s.top + e.scrollY - (t.top + e.scrollY)) / t.height;
            (i.x_percent = r),
              (i.y_percent = a),
              (i.selector = this.getUniqueSelector(d)),
              this.updateCommentPosition(n, o, i, d),
              i.id.toString().startsWith('temp-') ||
                this.ws.send(
                  JSON.stringify({
                    type: 'updateComment',
                    projectId: this.projectId,
                    url: this.windowUrl,
                    comment: {
                      id: i.id,
                      x_percent: r,
                      y_percent: a,
                      selector: i.selector,
                    },
                    token: this.token,
                  }),
                );
          }
        };
      n.addEventListener('mousedown', m),
        n.addEventListener('touchstart', e => {
          const t = e.touches[0];
          m({
            preventDefault: () => e.preventDefault(),
            stopPropagation: () => e.stopPropagation(),
            clientX: t.clientX,
            clientY: t.clientY,
            button: 0,
          });
        }),
        t.addEventListener('touchmove', e => {
          if (p) {
            const t = e.touches[0];
            h({ clientX: t.clientX, clientY: t.clientY });
          }
        }),
        t.addEventListener('touchend', e => {
          if (p) {
            const t = e.changedTouches[0];
            u({ clientX: t.clientX, clientY: t.clientY });
          }
        });
    },
  };
  (e.OpenPreview = n),
    (e.initOpenPreview = function (e) {
      e && e.projectId && n.setProjectId(e.projectId);
    });
})(window, document);
