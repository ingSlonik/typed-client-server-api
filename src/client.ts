import { API, Result, getUrlFromEndpoint, getMethodFromEndpoint } from "./index";

type Headers = Record<string, string>;

export type APIFrontend<T extends API> = {
    [I in keyof T]: {
        (params: T[I]["params"]): Promise<Result<T[I]["result"]>>;
        getUrl: (params: T[I]["params"]) => string;
    };
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
            if (typeof endpoint !== "string" || endpoint === "$$typeof" || endpoint === "then")
                return null;

            const method = getMethodFromEndpoint(endpoint);
            const url = getUrlFromEndpoint(endpoint);

            const buildUrl = (params: { [key: string]: unknown }) => {
                let query = "";
                if ((method === "GET" || method === "DELETE") && params && typeof params === "object") {
                    query = Object
                        .entries(params)
                        .filter(([ , value ]) => value !== undefined)
                        // always stringify for values such as "null" or "123"
                        .map(([ key, value ]) => (
                            `${encodeURIComponent(key)}=${encodeURIComponent(JSON.stringify(value))}`
                        ))
                        .join("&");
                }
                return query ? `${serverUrl}${url}?${query}` : `${serverUrl}${url}`;
            };

            const apiCall = async (params: { [key: string]: unknown }) => {
                const requestUrl = buildUrl(params);
                const headers: Headers = { "Content-Type": "application/json", ...getHeaders() };
                let response: Response;

                try {
                    response = await fetch(
                        requestUrl,
                        {
                            method,
                            headers,
                            body: method === "POST" || method === "PUT" ? JSON.stringify(params ?? {}) : undefined,
                        },
                    );
                } catch (e) {
                    return [ null, "Service Unavailable", 503 ];
                }

                if (response.status === 200) {
                    try {
                        const json = await response.json();
                        return [ json, null, 200 ];
                    } catch (e) {
                        let error = "Parsing error.";
                        if (
                            e !== null &&
                            typeof e === "object" &&
                            "message" in e &&
                            typeof (e as Error).message === "string"
                        ) {
                            error = (e as Error).message;
                        }

                        return [ null, error, 200 ];
                    }
                } else {
                    let error = "Server error.";

                    try {
                        const json = await response.json();
                        if (json && typeof json === "object" && typeof json.message === "string")
                            error = json.message;
                    } catch (e) {
                        // Ignore JSON parse errors on error responses
                    }

                    return [ null, error, response.status ];
                }
            };

            apiCall.getUrl = buildUrl;
            return apiCall;
        },
    }) as APIFrontend<T>;
}
