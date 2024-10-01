(function() {
  window.opv = window.opv || function(...args) {
    (window.opv.q = window.opv.q || []).push(args);
  };

  const config = {
    apiEndpoint: 'https://api.openpreview.dev',
    clientId: '',
    domain: window.location.hostname
  };

  function init(options) {
    if (options && options.clientId) {
      config.clientId = options.clientId;
    }
  }

  function sendRequest(endpoint, method, data) {
    return fetch(`${config.apiEndpoint}${endpoint}`, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': config.clientId,
        'X-Domain': config.domain
      },
      body: JSON.stringify(data)
    }).then(response => response.json());
  }

  function logEvent(eventType, eventData) {
    sendRequest('/events', 'POST', { type: eventType, data: eventData })
      .catch(error => console.error('Error logging event:', error));
  }

  function processQueue() {
    const queue = window.opv.q || [];
    queue.forEach(args => {
      const [method, ...params] = args;
      if (method === 'init') {
        init(...params);
      } else if (typeof window.opv[method] === 'function') {
        window.opv[method](...params);
      }
    });
    window.opv.q = [];
  }

  window.opv.logEvent = logEvent;

  // Process any queued commands
  processQueue();

  // Replace the temporary opv function with the real implementation
  window.opv = function(...args) {
    const [method, ...params] = args;
    if (method === 'init') {
      init(...params);
    } else if (typeof window.opv[method] === 'function') {
      window.opv[method](...params);
    } else {
      (window.opv.q = window.opv.q || []).push(args);
    }
  };

  // Log page view on script load
  logEvent('page_view', { url: window.location.href });
})();
