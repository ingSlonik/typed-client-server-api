export type Method = "POST" | "GET" | "PUT" | "DELETE";

export type EndpointPrefix = "get" | "post" | "put" | "delete";

type UppercaseAlphanumeric =
    | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L" | "M"
    | "N" | "O" | "P" | "Q" | "R" | "S" | "T" | "U" | "V" | "W" | "X" | "Y" | "Z"
    | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

export type ValidEndpointName = `${EndpointPrefix}${UppercaseAlphanumeric}${string}`;

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
| [ result: null, error: null, isLoading: true, status: 0, reload: () => void ]
| [ result: T, error: null, isLoading: false, status: 200, reload: () => void ]
| [ result: null, error: string, isLoading: false, status: number, reload: () => void ];

export type APIDefinition<T extends {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [K in keyof T]: K extends ValidEndpointName ? Endpoint<{ [key: string]: any }, any> : never;
}> = T;

export const endpointTypes: Record<EndpointPrefix, Method> = {
    get: "GET",
    post: "POST",
    put: "PUT",
    delete: "DELETE",
};

function matchEndpointPrefix(endpoint: string): EndpointPrefix | null {
    const prefixes = Object.keys(endpointTypes) as EndpointPrefix[];

    for (const prefix of prefixes) {
        if (endpoint.startsWith(prefix) && endpoint.length > prefix.length) {
            const nextChar = endpoint[prefix.length];
            if (nextChar === nextChar.toUpperCase()) {
                return prefix;
            }
        }
    }

    return null;
}

export function getMethodFromEndpoint(endpoint: string): Method {
    const prefix = matchEndpointPrefix(endpoint);

    if (prefix === null) {
        throw new Error(
            `Wrong definition of endpoint "${endpoint}", it has to start with ${Object.keys(endpointTypes).join(", ")}.`,
        );
    }

    return endpointTypes[prefix];
}

export function getUrlFromEndpoint(endpoint: string): string {
    const prefix = matchEndpointPrefix(endpoint);
    const url = prefix !== null ? endpoint.substring(prefix.length) : endpoint;

    return `/api/${getKebabCase(url)}`;
}

function getKebabCase(input: string): string {
    return input
        .split("")
        .map((char, i) => {
            if (char === char.toUpperCase() && char !== char.toLowerCase()) {
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

