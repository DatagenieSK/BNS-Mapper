/**
 * Hash Router for BNS Mapper with View Transitions API, Query Param Synchronization & Scroll Preservation
 * Enables deep linking on GitHub Pages without server-side routing
 */

export class Router {
  constructor() {
    this.routes = [];
    this.currentRoute = null;
    this.historyStack = [];
    this.scrollPositions = new Map();
    this.isBackNavigation = false;

    window.addEventListener('hashchange', () => this.handleRouting());
    window.addEventListener('load', () => this.handleRouting());
  }

  addRoute(pattern, handler) {
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

  /**
   * Updates current route's query parameters without losing base route.
   * If replace is true, uses history.replaceState and re-runs routing.
   */
  updateQueryParams(newParams = {}, { replace = false } = {}) {
    let hash = window.location.hash || '#/';
    const [basePath, queryString] = hash.split('?');
    const params = new URLSearchParams(queryString || '');

    Object.entries(newParams).forEach(([key, val]) => {
      if (val === null || val === undefined || val === '') {
        params.delete(key);
      } else {
        params.set(key, String(val));
      }
    });

    const queryStr = params.toString();
    const newHash = queryStr ? `${basePath}?${queryStr}` : basePath;

    if (replace) {
      if (window.location.hash !== newHash) {
        history.replaceState(null, '', newHash);
        this.handleRouting();
      }
    } else {
      if (window.location.hash !== newHash) {
        window.location.hash = newHash;
      }
    }
  }

  handleRouting() {
    let hash = window.location.hash || '#/';
    if (!hash.startsWith('#/')) {
      hash = '#/';
    }

    const [pathWithHash, queryString] = hash.split('?');
    const queryParams = new URLSearchParams(queryString || '');

    // Save scroll position for previous route
    if (this.currentRoute) {
      const prevFullHash = this.currentRoute.fullHash || this.currentRoute.path;
      this.scrollPositions.set(prevFullHash, window.scrollY);
      this.scrollPositions.set(this.currentRoute.path, window.scrollY);
    }

    // Determine navigation direction (forward vs back)
    let isBack = false;
    if (this.historyStack.length >= 2 && this.historyStack[this.historyStack.length - 2] === hash) {
      isBack = true;
      this.historyStack.pop();
    } else if (this.historyStack.length >= 2 && this.historyStack[this.historyStack.length - 2] === pathWithHash) {
      isBack = true;
      this.historyStack.pop();
    } else {
      isBack = false;
      if (this.historyStack[this.historyStack.length - 1] !== hash) {
        this.historyStack.push(hash);
      }
    }

    // Keep history stack reasonable
    if (this.historyStack.length > 30) {
      this.historyStack.shift();
    }

    const isSameBasePath = Boolean(this.currentRoute && this.currentRoute.path === pathWithHash);
    const direction = isBack ? 'back' : 'forward';
    document.documentElement.dataset.transitionDirection = direction;

    let matched = false;
    for (const route of this.routes) {
      const match = pathWithHash.match(route.regex);
      if (match) {
        const params = {};
        route.paramNames.forEach((name, i) => {
          params[name] = decodeURIComponent(match[i + 1]);
        });

        const nextRoute = {
          path: pathWithHash,
          fullHash: hash,
          params,
          queryParams: Object.fromEntries(queryParams.entries())
        };

        const renderRoute = () => {
          this.currentRoute = nextRoute;
          route.handler(params, nextRoute.queryParams);
          this.afterNavigation(pathWithHash, isBack, isSameBasePath);
        };

        const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Skip view transition for pure in-page pagination updates to keep < 250ms feel
        if (document.startViewTransition && !prefersReducedMotion && !isSameBasePath) {
          document.startViewTransition(() => {
            renderRoute();
          });
        } else {
          renderRoute();
        }

        matched = true;
        break;
      }
    }

    if (!matched) {
      this.navigate('#/');
    }
  }

  afterNavigation(activeHash, isBack, isSameBasePath) {
    this.updateActiveNavLinks(activeHash);

    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Scroll restoration: restore scroll if back navigation
    if (isBack) {
      const currentHash = window.location.hash;
      const savedY = this.scrollPositions.get(currentHash) ?? this.scrollPositions.get(activeHash) ?? 0;
      requestAnimationFrame(() => {
        window.scrollTo({ top: savedY, behavior: 'instant' in window ? 'instant' : 'auto' });
      });
    } else if (!isSameBasePath) {
      // New top-level navigation: reset to top
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      });
    }

    window.dispatchEvent(new CustomEvent('route-changed', {
      detail: { path: activeHash, isBack }
    }));
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
