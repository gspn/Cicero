import Cicero from "../lib/Cicero.js";

const runRouterTests = async () => {
    console.log("Starting Router Tests...");

    // Mock page loader
    let loadedPage = null;
    const mockPageLoader = (page, params = {}) => {
        console.log(`Mock Page Loader Called: ${page}`, params);
        loadedPage = { page, params };
    };

    // Initialize Router
    const router = new Cicero.Router({ root: "" });
    router.setPageLoader(mockPageLoader);

    // Set up routes
    router
        .redirect("", "/home")
        .route("/home", () => mockPageLoader("home"))
        .route("/pages/:key/", (params) => mockPageLoader(params.key, params))
        .route("/bobby/*glob1/*glob2", (params) => mockPageLoader("globglob", params))
        .route("/pages/:key/*rest", (params, path) => mockPageLoader("rest", { ...params, fullPath: path }))
        .start();

    /**
     * Utility function to test route navigation.
     * @param {string} hash - The hash to navigate to.
     * @param {string} expectedPage - The expected page that should be loaded.
     * @param {Object} [expectedParams={}] - Expected parameters.
     */
    const testRoute = (hash, expectedPage, expectedParams = {}) => new Promise(res => {
        console.log(`Navigating to: ${hash}`);
        location.hash = hash;
        setTimeout(() => {
            if (loadedPage && loadedPage.page === expectedPage && JSON.stringify(loadedPage.params) === JSON.stringify(expectedParams)) {
                console.log(`✅ PASS: ${hash} -> ${expectedPage}`);
            } else {
                console.error(`❌ FAIL: ${hash} -> Expected ${expectedPage}, got ${loadedPage ? loadedPage.page : "nothing"}\n`, loadedPage.params, expectedParams);
            }
            res();
        }, 100);
    });

    /**
     * Utility function to check base href updates.
     * @param {string} expectedBaseHref - The expected base href.
     */
    const testBaseHref = (expectedBaseHref) => new Promise(res => {
        setTimeout(() => {
            const base = document.querySelector("base");
            const actualHref = base ? base.getAttribute("href") : "MISSING";
            if (actualHref === expectedBaseHref) {
                console.log(`✅ PASS: Base href is correctly set to ${actualHref}`);
            } else {
                console.error(`❌ FAIL: Expected base href ${expectedBaseHref}, but got ${actualHref}`);
            }
            res();
        }, 100);
    });

    // Run tests
    await testRoute("#/home", "home");
    await testRoute("#/pages/test/", "test", { key: "test" });
    await testRoute("#/bobby/something/deep/and/yet/deeper", "globglob");
    await testRoute("#/pages/test/something/deep", "rest", { key: "test", rest: "something/deep", fullPath: "/pages/test/something/deep" });

    // Check if <base> updates correctly
    await testBaseHref("/pages/test/something/"); // After visiting #/pages/test/, the base should update

    console.log("Router Tests Completed.");
}

runRouterTests();