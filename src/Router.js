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
        return this.route(fragment, () => this.navigate(path, true), false);
    }

    //
    // Document manager
    //

    /**
     * Loads a document
     * @param {String} uri The path to the document to load
     * @param {Node} target The node to load the document's body into
     */
    async loadPage(uri, target = document.body) {
        const html = await fetch(uri).then(res => res.text());
        const newdoc = new DOMParser().parseFromString(html, 'text/html');

        // merge heads
        document.head.append(...newdoc.head.childNodes);

        // change target/body
        target.innerHTML = "";
        target.append(...newdoc.body.childNodes);
        target.querySelectorAll("script").forEach(Cicero.replaceAndRunScript);
    }
    static replaceAndRunScript(oldScript) {
        const newScript = document.createElement('script');
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
    navigate(fragment, init) {
        const path = this.formatPath(fragment).pathname;

        if (fragment == undefined) throw new Error("why?");

        if (this.currentPath() == path && !init) return false;

        for (const route of this.routes) {
            const params = this.match(route.fragment, path);
            if (params) {
                route.callback(params, path);
                if (route.sethash) this.navigateTo(fragment);
                return this;
            }
        }

        return true;
    }

    /**
     * Sets the hash to the new fragment relative to the current one, then reloads the page
     * @param {String} fragment the path to navigate to
     */
    navigateTo(fragment) {
        const path = this.formatPath(fragment).pathname;

        if (path == this.currentPath()) return false;

        const here = sessionStorage.ciceronow++ + 1
        history.pushState({ ciceronow: here }, null, "#" + path);
        this.onState();

        return true;
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
        return window.location.hash.slice(1);
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

    onState() {
        const past = !!+sessionStorage.ciceropast;
        const here = +history.state?.ciceronow;
        const now = +sessionStorage.ciceronow;

        const ispast = here < now;
        sessionStorage.ciceropast = +ispast;

        this.navigate(this.currentPath(), ispast || (past && here == now));
    }

    start() {
        if (!("ciceronow" in sessionStorage)) sessionStorage.ciceronow = 0;
        if (!("ciceropast" in sessionStorage)) sessionStorage.ciceropast = 0;

        this.navigate(this.currentPath(), true);

        // Capture clicks on <a> links and use the router's route if available
        document.addEventListener('click', (e) => {
            if (e.target.tagName === 'A' && e.target.getAttribute('href')) {
                const a = e.target
                const href = a.getAttribute('href');

                if ( // don't touch external links, etc
                    a.getAttribute("download")
                    || a.getAttribute("target")
                    || a.getAttribute("rel") == "external"
                    || new URL(href, location).origin !== location.origin
                    || new URL(href, location).hash
                ) return;

                e.preventDefault();

                sessionStorage.ciceropast = 0;
                this.navigate(href);
            }
        });

        // Listen for state changes
        window.addEventListener('popstate', e => this.onState(e));
        window.addEventListener('pushstate', e => this.onState(e));

        return this;
    };
};

export { Router };
export default Router;