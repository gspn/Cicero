class Router {
    /**
     * @param {Object} [options]
     * @param {string} [options.root=""] - A base path that prefixes all routes.
     */
    constructor({ root = "" } = {}) {
        this.root = root;
        this.routes = [];
        this.redirects = [];
        this.pageLoader = null; // A custom function to load pages.
    }

    /**
     * Set a custom page-loading function. The function will be invoked in route callbacks.
     * @param {Function} loader - A function that takes parameters (for example, page key or params) and loads content.
     */
    setPageLoader(loader) {
        this.pageLoader = loader;
        return this;
    }

    /**
     * Define a route with a pattern and a callback.
     * @param {string} pattern - A URL pattern like "/pages/:key" or "/pages/:key/*rest".
     * @param {Function} callback - A function to call when the route matches. Receives (params, fullPath).
     * @param {boolean} [updateHistory=true] - (For hash routes the browser history is automatic, but you could use this flag if needed.)
     */
    route(pattern, callback, updateHistory = true) {
        this.routes.push({ pattern, callback, updateHistory });
        return this;
    }

    /**
     * Define a redirect from one pattern to a new path.
     * @param {string} fromPattern - Pattern to match the current hash.
     * @param {string} toPath - New path to redirect to (without the router root).
     */
    redirect(fromPattern, toPath) {
        this.redirects.push({ fromPattern, toPath });
        return this;
    }

    /**
     * Start the router by processing the current hash.
     */
    start() {
        this.handleRouteChange();
        // Listen to hash changes.
        window.addEventListener("hashchange", e => this.handleRouteChange(new URL(e.newURL).hash));
    }

    /**
     * Update (or create) a <base> element so that relative URLs in the loaded page resolve properly.
     * @param {string} path - The current path (from the hash) used to compute a base URL.
     */
    updateBaseHref(path) {
        let base = document.querySelector("base");
        if (!base) {
            base = document.createElement("base");
            document.head.appendChild(base);
        }
        // Compute a base URL: combine the router's root with the directory of the current path.
        let baseHref = this.root || "";
        if (path) {
            // Ensure path ends with a "/" so relative paths resolve against the directory.
            if (!path.endsWith("/")) {
                path = path.substring(0, path.lastIndexOf("/") + 1);
            }
            baseHref += path;
        }
        base.setAttribute("href", baseHref);
    }

    /**
     * Process the current hash, apply any redirects, update the <base>, and then execute the matching route.
     */
    handleRouteChange(hash) {
        // Get the hash (or default to "/")
        hash = hash?.slice(1) || location.hash.slice(1) || "/";
        console.log(hash)
        // If a router root is defined and present in the hash, remove it.
        if (this.root && hash.startsWith(this.root)) {
            hash = hash.slice(this.root.length);
        }

        // First check for redirects.
        for (const rd of this.redirects) {
            const match = this.matchPath(hash, rd.fromPattern);
            if (match) {
                const newPath = rd.toPath;
                location.hash = this.root + newPath;
                return;
            }
        }

        // Update <base> so that relative URLs in the loaded content work.
        this.updateBaseHref(hash);

        // Process routes.
        for (const route of this.routes) {
            const match = this.matchPath(hash, route.pattern);
            if (match) {
                // Execute the route callback with extracted parameters and the full path.
                route.callback(match.params, hash);
                return;
            }
        }

        // If no route matched, you can handle a 404 here.
        console.warn("No route matched: " + hash);
    }

    /**
     * Match a path against a pattern that can include named parameters (e.g., :key) and wildcards (e.g., *rest).
     * Returns an object with a "params" key if the pattern matches, or null otherwise.
     * @param {string} path - The current path (from the hash).
     * @param {string} pattern - The route pattern.
     */
    matchPath(path, pattern) {
        // improved path matching
        const routereg = new RegExp(
            `^${pattern
                .replace(/:([\w]+)/g, "(?<$1>[\\w\\-.~%()]+)")
                .replace(/\*([\w]+)/g, "(?<$1>[\\w\\-.~%()/]+)")}$`
        );

        console.log(routereg)

        const match = path.match(routereg);
        return match ? { params: match.groups || {} } : null;
    }
}

export { Router };
export default Router;