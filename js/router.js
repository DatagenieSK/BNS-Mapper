/**
 * Hash Router for BNS Mapper
 * Enables deep linking on GitHub Pages without server-side routing (#/section/302, #/chapters, #/bookmarks)
 */

export class Router {
  constructor() {
    this.routes = [];
    this.currentRoute = null;

    window.addEventListener('hashchange', () => this.handleRouting());
    window.addEventListener('load', () => this.handleRouting());
  }

  addRoute(pattern, handler) {
    // Convert pattern like '#/section/:id' to regex and param names
    const paramNames = [];
    const regexPath = pattern
      .replace(/:([a-zA-Z0-9_-]+)/g, (_, paramName) => {
        paramNames.push(paramName);
        return '([^/?]+)';
      })
      .replace(/\//g, '\\/');

    const regex = new RegExp(`^${regexPath}(?:\\?(.*))?$`);
    this.routes.push({ pattern, regex, paramNames, handler });
    return this;
  }

  navigate(path) {
    if (!path.startsWith('#')) {
      path = '#' + (path.startsWith('/') ? path : '/' + path);
    }
    window.location.hash = path;
  }

  handleRouting() {
    let hash = window.location.hash || '#/';
    if (!hash.startsWith('#/')) {
      hash = '#/';
    }

    // Split path and query
    const [pathWithHash, queryString] = hash.split('?');
    const queryParams = new URLSearchParams(queryString || '');

    let matched = false;
    for (const route of this.routes) {
      const match = pathWithHash.match(route.regex);
      if (match) {
        const params = {};
        route.paramNames.forEach((name, i) => {
          params[name] = decodeURIComponent(match[i + 1]);
        });

        this.currentRoute = {
          path: pathWithHash,
          params,
          queryParams: Object.fromEntries(queryParams.entries())
        };

        route.handler(params, this.currentRoute.queryParams);
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Default fallback to home
      this.navigate('#/');
    }

    this.updateActiveNavLinks(pathWithHash);
  }

  updateActiveNavLinks(activeHash) {
    document.querySelectorAll('[data-route-link]').forEach(el => {
      const target = el.getAttribute('href');
      if (!target) return;

      const baseTarget = target.split('?')[0];
      const baseActive = activeHash.split('?')[0];

      if (baseTarget === baseActive || (baseTarget === '#/' && (baseActive === '#/' || baseActive === '#/search'))) {
        el.classList.add('active');
        el.setAttribute('aria-current', 'page');
      } else {
        el.classList.remove('active');
        el.removeAttribute('aria-current');
      }
    });
  }
}
