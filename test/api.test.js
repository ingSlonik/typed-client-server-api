const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const {
    getMethodFromEndpoint,
    getUrlFromEndpoint,
} = require("../client/index.js");

const {
    getAPIFrontend,
    setServerUrl,
    setHeaders,
    setErrorHandler,
} = require("../client/client.js");

const {
    setAPIBackend,
    APIError,
} = require("../server/server.js");

/**
 * Helper: Creates an in-memory Express-compatible app and wires global.fetch to it
 * so full client <-> server integration can run in pure Node without network sockets.
 */
function createTestEnvironment(backendHandlers) {
    const routes = {
        get: new Map(),
        post: new Map(),
        put: new Map(),
        delete: new Map(),
    };

    const mockApp = {
        get: (path, handler) => routes.get.set(path, handler),
        post: (path, handler) => routes.post.set(path, handler),
        put: (path, handler) => routes.put.set(path, handler),
        delete: (path, handler) => routes.delete.set(path, handler),
    };

    setAPIBackend(mockApp, backendHandlers);

    const receivedRequests = [];

    global.fetch = async (urlString, options = {}) => {
        const parsedUrl = new URL(urlString, "http://localhost");
        const method = (options.method || "GET").toLowerCase();
        const handler = routes[method] && routes[method].get(parsedUrl.pathname);

        const query = Object.create(null);
        for (const [ key, value ] of parsedUrl.searchParams.entries()) {
            query[key] = value;
        }

        let body;
        if (options.body !== undefined) {
            body = JSON.parse(options.body);
        }

        const req = {
            method: method.toUpperCase(),
            url: parsedUrl.pathname + parsedUrl.search,
            headers: options.headers || {},
            query,
            body,
        };

        receivedRequests.push(req);

        if (!handler) {
            return {
                status: 404,
                json: async () => ({ message: "Route not found" }),
            };
        }

        let statusCode = 200;
        const responseHeaders = {};
        let responsePayload;
        let headersSent = false;

        const res = {
            get headersSent() {
                return headersSent;
            },
            status(code) {
                statusCode = code;
                return this;
            },
            setHeader(name, value) {
                responseHeaders[name.toLowerCase()] = value;
                return this;
            },
            json(payload) {
                headersSent = true;
                responsePayload = JSON.stringify(payload);
                return this;
            },
        };

        await handler(req, res);

        return {
            status: statusCode,
            headers: responseHeaders,
            json: async () => JSON.parse(responsePayload),
        };
    };

    return { routes, receivedRequests };
}

describe("1. Základní funkčnost: Endpoint prefixy a generování URL", () => {
    it("správně rozpozná metody GET, POST, PUT, DELETE podle prefixu", () => {
        assert.equal(getMethodFromEndpoint("getPhoto"), "GET");
        assert.equal(getMethodFromEndpoint("postPhoto"), "POST");
        assert.equal(getMethodFromEndpoint("putPhoto"), "PUT");
        assert.equal(getMethodFromEndpoint("deletePhoto"), "DELETE");
    });

    it("správně převede camelCase název endpointu na kebab-case URL", () => {
        assert.equal(getUrlFromEndpoint("getPhoto"), "/api/photo");
        assert.equal(getUrlFromEndpoint("postUserProfilePicture"), "/api/user-profile-picture");
        assert.equal(getUrlFromEndpoint("putAccountSettings"), "/api/account-settings");
        assert.equal(getUrlFromEndpoint("deleteOldSession"), "/api/old-session");
    });

    it("odmítne staré aliasy (add, update, remove) a neplatné prefixy", () => {
        assert.throws(() => getMethodFromEndpoint("addPhoto"), /Wrong definition of endpoint "addPhoto"/);
        assert.throws(() => getMethodFromEndpoint("updatePhoto"), /Wrong definition of endpoint "updatePhoto"/);
        assert.throws(() => getMethodFromEndpoint("removePhoto"), /Wrong definition of endpoint "removePhoto"/);
        assert.throws(() => getMethodFromEndpoint("fetchUsers"), /Wrong definition of endpoint "fetchUsers"/);
    });

    it("odmítne názvy, kde za prefixem nenásleduje velké písmeno nebo číslice", () => {
        assert.throws(() => getMethodFromEndpoint("get"), /Wrong definition of endpoint "get"/);
        assert.throws(() => getMethodFromEndpoint("getter"), /Wrong definition of endpoint "getter"/);
        assert.throws(() => getMethodFromEndpoint("postalCode"), /Wrong definition of endpoint "postalCode"/);
        assert.throws(() => getMethodFromEndpoint("putty"), /Wrong definition of endpoint "putty"/);
        assert.throws(() => getMethodFromEndpoint("deleted"), /Wrong definition of endpoint "deleted"/);
    });

    it("vygeneruje správnou klientskou URL přes .getUrl()", () => {
        setServerUrl("https://example.com");
        const api = getAPIFrontend();

        assert.equal(
            api.getPhoto.getUrl({ id: "abc", page: 2 }),
            "https://example.com/api/photo?id=%22abc%22&page=2",
        );
        assert.equal(
            api.postPhoto.getUrl({ title: "New" }),
            "https://example.com/api/photo",
        );
    });
});

describe("2. Základní komunikace Klient <-> Server (CRUD)", () => {
    beforeEach(() => {
        setServerUrl("http://localhost:8080");
        setHeaders({});
        setErrorHandler(null);
    });

    it("provede kompletní CRUD operace (GET, POST, PUT, DELETE)", async () => {
        const db = new Map([ [ "1", { id: "1", title: "První fotka" } ] ]);

        createTestEnvironment({
            async getPhoto({ id }) {
                if (!db.has(id)) {
                    throw new APIError("Fotka nenalezena", 404);
                }
                return db.get(id);
            },
            async postPhoto({ title }) {
                const created = { id: "2", title };
                db.set("2", created);
                return created;
            },
            async putPhoto({ id, title }) {
                db.set(id, { id, title });
                return db.get(id);
            },
            async deletePhoto({ id }) {
                db.delete(id);
            },
        });

        const api = getAPIFrontend();

        // GET
        const [ photo1, err1, status1 ] = await api.getPhoto({ id: "1" });
        assert.deepEqual(photo1, { id: "1", title: "První fotka" });
        assert.equal(err1, null);
        assert.equal(status1, 200);

        // POST
        const [ photo2, err2, status2 ] = await api.postPhoto({ title: "Druhá fotka" });
        assert.deepEqual(photo2, { id: "2", title: "Druhá fotka" });
        assert.equal(err2, null);
        assert.equal(status2, 200);

        // PUT
        const [ updated, err3, status3 ] = await api.putPhoto({ id: "2", title: "Upravená fotka" });
        assert.deepEqual(updated, { id: "2", title: "Upravená fotka" });
        assert.equal(err3, null);
        assert.equal(status3, 200);

        // DELETE
        const [ deleted, err4, status4 ] = await api.deletePhoto({ id: "2" });
        assert.equal(deleted, null);
        assert.equal(err4, null);
        assert.equal(status4, 200);

        // Ověření smazání (404)
        const [ missing, err5, status5 ] = await api.getPhoto({ id: "2" });
        assert.equal(missing, null);
        assert.equal(err5, "Fotka nenalezena");
        assert.equal(status5, 404);
    });
});

describe("3. Pokročilá funkčnost: Speciální typy dat, kódování a hlavičky", () => {
    beforeEach(() => {
        setServerUrl("http://localhost:8080");
        setHeaders({});
        setErrorHandler(null);
    });

    it("bezpečně přenese speciální znaky (&, =, %, #, diakritiku), čísla jako stringy ('123', 'null') a vynechá undefined v GET", async () => {
        let receivedParams = null;

        createTestEnvironment({
            async getSearch(params) {
                receivedParams = params;
                return { ok: true };
            },
        });

        const api = getAPIFrontend();
        const inputParams = {
            query: "100% sleva & bonus = #1 (čeština: ěščřžýáíé)",
            numericString: "123",
            actualNumber: 123,
            nullString: "null",
            actualNull: null,
            boolFalse: false,
            nested: { tags: [ "a", "b" ] },
            omitted: undefined,
        };

        const [ res, err, status ] = await api.getSearch(inputParams);
        assert.deepEqual(res, { ok: true });
        assert.equal(err, null);
        assert.equal(status, 200);

        assert.deepEqual(receivedParams, {
            query: "100% sleva & bonus = #1 (čeština: ěščřžýáíé)",
            numericString: "123",
            actualNumber: 123,
            nullString: "null",
            actualNull: null,
            boolFalse: false,
            nested: { tags: [ "a", "b" ] },
        });
        assert.equal("omitted" in receivedParams, false);
    });

    it("zachová falsy návratové hodnoty ze serveru (false, 0, prázdný string '')", async () => {
        createTestEnvironment({
            async getBooleanFalse() {
                return false;
            },
            async getZero() {
                return 0;
            },
            async getEmptyString() {
                return "";
            },
        });

        const api = getAPIFrontend();

        const [ rFalse ] = await api.getBooleanFalse({});
        assert.strictEqual(rFalse, false);

        const [ rZero ] = await api.getZero({});
        assert.strictEqual(rZero, 0);

        const [ rEmpty ] = await api.getEmptyString({});
        assert.strictEqual(rEmpty, "");
    });

    it("dynamicky vyhodnocuje setHeaders při každém volání, i když je reference na endpoint uložená předem", async () => {
        let token = "token-1";
        setHeaders(() => ({ Authorization: `Bearer ${token}` }));

        const { receivedRequests } = createTestEnvironment({
            async getProfile() {
                return { name: "Filip" };
            },
        });

        const api = getAPIFrontend();
        const cachedGetProfile = api.getProfile;

        await cachedGetProfile({});
        token = "token-2";
        await cachedGetProfile({});

        assert.equal(receivedRequests.length, 2);
        assert.equal(receivedRequests[0].headers.Authorization, "Bearer token-1");
        assert.equal(receivedRequests[1].headers.Authorization, "Bearer token-2");
    });
});

describe("4. Pokročilá funkčnost: Klientský setErrorHandler a krizové stavy", () => {
    beforeEach(() => {
        setServerUrl("http://localhost:8080");
        setHeaders({});
        setErrorHandler(null);
    });

    it("zaloguje 4xx a 5xx chyby přes setErrorHandler s plným kontextem", async () => {
        const errors = [];
        setErrorHandler(info => errors.push(info));

        createTestEnvironment({
            async postPayment() {
                throw new APIError("Nedostatek prostředků", 402);
            },
        });

        const api = getAPIFrontend();
        const [ result, error, status ] = await api.postPayment({ amount: 500 });

        assert.equal(result, null);
        assert.equal(error, "Nedostatek prostředků");
        assert.equal(status, 402);

        assert.equal(errors.length, 1);
        assert.equal(errors[0].endpoint, "postPayment");
        assert.equal(errors[0].method, "POST");
        assert.equal(errors[0].url, "http://localhost:8080/api/payment");
        assert.deepEqual(errors[0].params, { amount: 500 });
        assert.equal(errors[0].status, 402);
        assert.equal(errors[0].error, "Nedostatek prostředků");
        assert.ok(errors[0].response);
    });

    it("zaloguje výpadek sítě (503 Service Unavailable) včetně originalError", async () => {
        const errors = [];
        setErrorHandler(info => errors.push(info));

        const networkException = new Error("Failed to fetch");
        global.fetch = async () => {
            throw networkException;
        };

        const api = getAPIFrontend();
        const [ result, error, status ] = await api.getStatus({});

        assert.equal(result, null);
        assert.equal(error, "Service Unavailable");
        assert.equal(status, 503);

        assert.equal(errors.length, 1);
        assert.equal(errors[0].status, 503);
        assert.equal(errors[0].error, "Service Unavailable");
        assert.equal(errors[0].originalError, networkException);
    });

    it("zaloguje chybu parsování neplatného JSONu při statusu 200", async () => {
        const errors = [];
        setErrorHandler(info => errors.push(info));

        global.fetch = async () => ({
            status: 200,
            json: async () => {
                throw new SyntaxError("Unexpected token < in JSON at position 0");
            },
        });

        const api = getAPIFrontend();
        const [ result, error, status ] = await api.getBrokenJson({});

        assert.equal(result, null);
        assert.match(error, /Unexpected token/);
        assert.equal(status, 200);

        assert.equal(errors.length, 1);
        assert.equal(errors[0].status, 200);
        assert.ok(errors[0].originalError instanceof SyntaxError);
    });

    it("zvládne nečitelné tělo při 502 Bad Gateway a nezpůsobí pád, ani když samotný setErrorHandler vyhodí chybu", async () => {
        setErrorHandler(() => {
            throw new Error("Chyba uvnitř Sentry loggeru");
        });

        global.fetch = async () => ({
            status: 502,
            json: async () => {
                throw new SyntaxError("Bad Gateway HTML");
            },
        });

        const api = getAPIFrontend();
        const [ result, error, status ] = await api.getGateway({});

        assert.equal(result, null);
        assert.equal(error, "Server error.");
        assert.equal(status, 502);
    });
});

describe("5. Bezpečnost a odolnost serveru i Proxy", () => {
    it("chrání server před Prototype Pollution v query parametrech a prázdným req.body", async () => {
        let capturedQueryParams = null;
        let capturedPostParams = null;

        const { routes } = createTestEnvironment({
            async getItems(params) {
                capturedQueryParams = params;
                return [];
            },
            async postItem(params) {
                capturedPostParams = params;
                return { ok: true };
            },
        });

        // Simulace útoku přes __proto__ a constructor v query
        const getHandler = routes.get.get("/api/items");
        await getHandler(
            {
                query: JSON.parse("{\"__proto__\":\"{\\\"polluted\\\":true}\",\"constructor\":\"bad\",\"safe\":\"1\"}"),
            },
            {
                headersSent: false,
                status() {
                    return this;
                },
                setHeader() {
                    return this;
                },
                json() {
                    return this;
                },
            },
        );

        assert.equal(({}).polluted, undefined);
        assert.equal(Object.prototype.hasOwnProperty.call(capturedQueryParams, "__proto__"), false);
        assert.equal(Object.prototype.hasOwnProperty.call(capturedQueryParams, "constructor"), false);
        assert.equal(capturedQueryParams.safe, 1);

        // Simulace POST requestu s undefined req.body
        const postHandler = routes.post.get("/api/item");
        await postHandler(
            { body: undefined },
            {
                headersSent: false,
                status() {
                    return this;
                },
                setHeader() {
                    return this;
                },
                json() {
                    return this;
                },
            },
        );
        assert.deepEqual(capturedPostParams, {});
    });

    it("při neočekávané běhové chybě (TypeError) na serveru vrátí status 500 a v produkci skryje interní detaily", async () => {
        const prevEnv = process.env.NODE_ENV;
        try {
            process.env.NODE_ENV = "production";

            createTestEnvironment({
                async getCrash() {
                    const obj = null;
                    return obj.someProperty;
                },
            });

            const api = getAPIFrontend();
            const [ result, error, status ] = await api.getCrash({});

            assert.equal(result, null);
            assert.equal(status, 500);
            assert.equal(error, "Internal Server Error");
        } finally {
            process.env.NODE_ENV = prevEnv;
        }
    });

    it("Proxy bezpečně ignoruje přístupy na .then, .$$typeof a Symboly", async () => {
        const api = getAPIFrontend();
        assert.equal(api.$$typeof, null);
        assert.equal(api.then, null);
        assert.equal(api[Symbol.toStringTag], null);

        // Vrácení api z async funkce nesmí spadnout na kontrole .then
        const resolvedApi = await Promise.resolve(api);
        assert.equal(resolvedApi, api);
    });
});
