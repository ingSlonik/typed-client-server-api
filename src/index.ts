export type Method = "POST" | "GET" | "PUT" | "DELETE";

export type Endpoint<Params extends { [key: string]: unknown }, Result> = {
    params: Params,
    result: Result,
};

export type API = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [endpoint: string]: Endpoint<{ [key: string]: any }, any>,
};

export type Result<T> = 
| [ result: T, error: null, status: 200 ]
| [ result: null, error: string, status: number ];

export type UseResult<T> = 
| [ result: null, error: null, isLoading: true, status: 0 ]
| [ result: T, error: null, isLoading: false, status: 200 ]
| [ result: null, error: string, isLoading: false, status: number ];

export type APIDefinition<T extends API> = T;

export const endpointTypes: Record<string, Method> = {
    add: "POST",
    get: "GET",
    update: "PUT",
    remove: "DELETE",
};

export function getMethodFromEndpoint(endpoint: string): Method {
    let method: null | Method = null;
    Object.keys(endpointTypes).forEach(start => { 
        if (endpoint.startsWith(start)) {
            method = endpointTypes[start];
        }
    });

    if (method === null) {
        throw new Error(
            `Wrong definition of endpoint "${endpoint}", it has to start with ${Object.keys(endpointTypes)}.`,
        );
    } else {
        return method;
    }
}

export function getUrlFromEndpoint(endpoint: string): string {
    let url = endpoint;
    Object.keys(endpointTypes).forEach(start => {
        if (endpoint.startsWith(start)) {
            url = endpoint.substring(start.length);
        }
    });
    return "/api/" + getKebabCase(url);
}

function getKebabCase(input: string): string {
    return input
        .split("")
        .map((char, i) => {
            if (char === char.toUpperCase()) {
                if (i === 0) {
                    return char.toLowerCase();
                } else {
                    return `-${char.toLowerCase()}`;
                }
            } else {
                return char;
            }
        })
        .join("");
}
