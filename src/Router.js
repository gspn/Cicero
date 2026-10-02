class Router {
    /**
     * Creates a cicero router instance
     */
    constructor() {
        this.routes = [];
    }

    //
    // Route creators
    //

    /**
     * Add a route to match for
     * @param {String} fragment The path to match for
     * @param {Function} callback The callack for the route
     * @returns the router instance
     */
    route(fragment, callback, sethash = true) {
        const route = {
            fragment,
            callback,
            sethash
        };
        this.routes.push(route);
        return this;
    }

    /**
     * Add a route for a document
     * @param {String} fragment The path to match for
     * @param {String} path The path to the document to load
     * @param {String} target Target querystring for node to load document content into. Defaults to "body"
     * @deprecated
     */
    get(fragment, path, target = "body") {
        return this.route(fragment, () => this.loadPage(path, document.querySelector(target)));
    }

    /**
     * Add a route for a redirect
     * @param {String} fragment The path to match for
     * @param {String} path The path to redirect to
     */
    redirect(fragment, path) {
        return this.route(fragment, () => this.replaceHash(path), false);
    }

    //
    // Document manager
    //

    /**
     * Loads a document
     * @param {String} uri The path to the document to load
     * @param {Node} target The node to load the document's body into
     * @deprecated 
     */
    async loadPage(uri, target = document.body) {
        const html = await fetch(uri).then(res => res.text());
        const newdoc = new DOMParser().parseFromString(html, "text/html");

        // merge heads
        document.head.append(...newdoc.head.childNodes);

        // change target/body
        target.innerHTML = "";
        target.append(...newdoc.body.childNodes);
        target.querySelectorAll("script").forEach(Cicero.replaceAndRunScript);
    }
    static replaceAndRunScript(oldScript) {
        const newScript = document.createElement("script");
        const attrs = Array.from(oldScript.attributes);
        for (const { name, value } of attrs) {
            newScript[name] = value;
        }
        newScript.append(oldScript.textContent);
        oldScript.replaceWith(newScript);
    }

    //
    // Navigation and setup
    //

    /**
     * Navigate to the route defined by the current hash
     */
    navigate() {
        const path = this.currentPath();

        console.log("navigate: ", path);

        for (const route of this.routes) {
            const params = this.match(route.fragment, path);
            if (params) {
                route.callback(params, path);
                // if (route.sethash) this.navigateTo(fragment);
                return true;
            }
        }

        return false;
    }

    /**
     * Sets the hash to the new fragment relative to the current one, then reloads the page
     * @param {String} fragment the path to navigate to
     */
    navigateTo(fragment) {
        const path = this.formatPath(fragment).pathname;

        if (path == this.currentPath()) return false;

        // location.hash = path;

        const targetUrl = new URL(window.location.href);
        targetUrl.hash = path;

        // 2. Force a clean, isolated history frame via pushState.
        // This stops the browser from skipping this entry after a reload.
        window.history.pushState({ path }, null, "#" + path);

        this.navigate();

        return true;
    }

    /**
     * Replaces the current history entry instead of pushing a new one (Crucial for Redirects)
     */
    replaceHash(fragment) {
        const path = this.formatPath(fragment).pathname;
        if (path === this.currentPath()) return false;

        const url = new URL(window.location.href);
        url.hash = path;
        window.location.replace(url.href);
        return true;
    }

    handleAnchor(a) {
        const href = a.getAttribute("href");
        if (this.isExternalOrDownload(a, href)) return false;

        this.navigateTo(href);
        return true;
    }

    isExternalOrDownload(a, href) {
        return (
            a.getAttribute("download") ||
            a.getAttribute("target") ||
            a.getAttribute("rel") === "external" ||
            href.startsWitch("javascript") ||
            new URL(href, location).origin !== location.origin ||
            new URL(href, location).hash
        );
    }

    /**
     * Creates a URL resulting from navigating from the current hash path with the fragment 
     * @param {String} fragment any url path
     * @returns {URL}
     */
    formatPath(fragment) {
        return new URL(
            fragment,
            new URL(
                this.currentPath(),
                location.origin
            )
        )
    }

    /**
     * Returns the current hash value without the leading #
     * @returns {String} the current hash value, expected to be a path
     */
    currentPath() {
        const hash = window.location.hash || "#/";
        return hash.split("?")[0].replace("#", "") || "/";
    }

    match(routePath, currentPath) {
        // improved path matching
        const routereg = new RegExp(
            `^${routePath
                .replace(/:([\w]+)/g, "(?<$1>[^\\x00-\\x1f\\x7f <>#%\"{}|\\\\\\^[\\]`;/?:@&=+$,]+)")
                .replace(/\*([\w]+)/g, "(?<$1>[^\\x00-\\x1f\\x7f <>#%\"{}|\\\\\\^[\\]`;?:@&=+$,]+)")}$`
        );

        const match = currentPath.match(routereg);
        return match ? match.groups || {} : null;
    }

    start() {
        const currentPathname = this.currentPath();
        const initialUrl = new URL(window.location.href);
        initialUrl.hash = currentPathname;

        window.history.replaceState({ path: currentPathname }, "", initialUrl.href);

        window.addEventListener("popstate", () => this.navigate());

        document.readyState === "loading"
            ? window.addEventListener("DOMContentLoaded", () => this.navigate())
            : this.navigate();


        // Capture clicks on <a> links and use the router's route if available
        document.addEventListener("click", (e) => {
            const a = e.target.closest("a");
            if (!a) return;

            if (!this.handleAnchor(a)) return;

            e.preventDefault();
        });

        return this;
    };
};

export { Router };
export default Router;