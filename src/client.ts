import { API, Result, getUrlFromEndpoint, getMethodFromEndpoint } from "./index";

export type APIFrontend<T extends API> = {
    [I in keyof T]: (params: T[I]["params"]) => Promise<Result<T[I]["result"]>>;
};

let serverUrl = "";

export * from "./index";

export function setServerUrl(url: string): void {
    serverUrl = url;
}

export function getAPIFrontend<T extends API>(): APIFrontend<T> {
    return new Proxy({}, {
        get: (_, endpoint: string) => {
            if (endpoint === "$$typeof")
                return null;

            const headers: { [key: string]: string } = { "Content-Type": "application/json" };
            const method = getMethodFromEndpoint(endpoint);
            const url = getUrlFromEndpoint(endpoint);

            return async (params: { [key: string]: unknown }) => {
                let query = "";
                if (method === "GET" || method === "DELETE") {
                    query = Object
                        .keys(params)
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        .map(key => `${key}=${decodeURIComponent((params as any)[key])}`)
                        .join("&");
                }

                const response = await fetch(
                    `${serverUrl}${url}?${query}`,
                    {
                        method,
                        headers,
                        body: method === "POST" || method === "PUT" ? JSON.stringify(params) : undefined,
                    },
                );
                if (response.status === 200) {
                    // I trust the backed
                    const json = await response.json();
                    return [ json, null, 200 ];
                } else {
                    let error = "Server error.";

                    try {
                        const json = await response.json();
                        if ("message" in json) error = json.message;
                    } catch (e) {}

                    return [ null,error, response.status ];
                }

            };
        },
    }) as APIFrontend<T>;
}
