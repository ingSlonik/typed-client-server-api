import { API, Result, getUrlFromEndpoint, getMethodFromEndpoint } from "./index";

type Headers = Record<string, string>;

export type APIFrontend<T extends API> = {
    [I in keyof T]: (params: T[I]["params"]) => Promise<Result<T[I]["result"]>>;
};

let serverUrl = "";
let getHeaders: () => Headers = () => ({});

export * from "./index";

export function setServerUrl(url: string): void {
    serverUrl = url;
}

export function setHeaders(headers: Headers | (() => Headers)): void {
    if (typeof headers === "function") {
        getHeaders = headers;
    } else {
        getHeaders = () => headers;
    }
}

export function getAPIFrontend<T extends API>(): APIFrontend<T> {
    return new Proxy({}, {
        get: (_, endpoint: string) => {
            if (endpoint === "$$typeof")
                return null;

            const headers: Headers = { "Content-Type": "application/json", ...getHeaders() };
            const method = getMethodFromEndpoint(endpoint);
            const url = getUrlFromEndpoint(endpoint);

            return async (params: { [key: string]: unknown }) => {
                let query = "";
                if (method === "GET" || method === "DELETE") {
                    query = Object
                        .entries(params)
                        // always stringify for values such as "null" or "123"
                        .map(([key, value]) => `${decodeURIComponent(key)}=${decodeURIComponent(JSON.stringify(value))}`)
                        .join("&");
                }

                let response: Response;
                try {
                    response = await fetch(
                        `${serverUrl}${url}?${query}`,
                        {
                            method,
                            headers,
                            body: method === "POST" || method === "PUT" ? JSON.stringify(params) : undefined,
                        },
                    );
                } catch (e) {
                    return [null, "Service Unavailable", 503];
                }

                if (response.status === 200) {
                    try {
                        // I trust the backed
                        const json = await response.json();
                        return [json, null, 200];
                    } catch (e) {
                        let error = "Parsing error.";
                        if (e !== null && typeof e === "object" && "message" in e && typeof e.message === "string")
                            error = e.message;
                        return [null, error, 200];
                    }
                } else {
                    let error = "Server error.";

                    try {
                        const json = await response.json();
                        if (typeof json.message === "string")
                            error = json.message;
                    } catch (e) { }

                    return [null, error, response.status];
                }

            };
        },
    }) as APIFrontend<T>;
}
