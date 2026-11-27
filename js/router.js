/**
 * Hash Router for BNS Mapper with View Transitions API & Scroll Preservation
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

  handleRouting() {
    let hash = window.location.hash || '#/';
    if (!hash.startsWith('#/')) {
      hash = '#/';
    }

    const [pathWithHash, queryString] = hash.split('?');
    const queryParams = new URLSearchParams(queryString || '');

    // Save scroll position for previous route
    if (this.currentRoute && this.currentRoute.path) {
      this.scrollPositions.set(this.currentRoute.path, window.scrollY);
    }

    // Determine navigation direction (forward vs back)
    let isBack = false;
    if (this.historyStack.length >= 2 && this.historyStack[this.historyStack.length - 2] === pathWithHash) {
      isBack = true;
      this.historyStack.pop(); // Pop current
    } else {
      isBack = false;
      // Prevent consecutive duplicates
      if (this.historyStack[this.historyStack.length - 1] !== pathWithHash) {
        this.historyStack.push(pathWithHash);
      }
    }

    // Keep history stack reasonable
    if (this.historyStack.length > 30) {
      this.historyStack.shift();
    }

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
          params,
          queryParams: Object.fromEntries(queryParams.entries())
        };

        const renderRoute = () => {
          this.currentRoute = nextRoute;
          route.handler(params, nextRoute.queryParams);
          this.afterNavigation(pathWithHash, isBack);
        };

        const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (document.startViewTransition && !prefersReducedMotion) {
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

  afterNavigation(activeHash, isBack) {
    this.updateActiveNavLinks(activeHash);

    // Scroll restoration: restore scroll if back navigation, else reset to top
    if (isBack && this.scrollPositions.has(activeHash)) {
      const savedY = this.scrollPositions.get(activeHash) || 0;
      requestAnimationFrame(() => {
        window.scrollTo({ top: savedY, behavior: 'instant' in window ? 'instant' : 'auto' });
      });
    } else {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
