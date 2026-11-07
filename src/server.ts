import { Express, Request, Response } from "express";

import { API, getMethodFromEndpoint, getUrlFromEndpoint } from "./index";

export * from "./index";

type MethodLowerCase = "get" | "post" | "put" | "delete";

export type APIBackendImplementation<T extends API> = {
    [I in keyof T]: (params: T[I]["params"], req: Request, res: Response) => Promise<T[I]["result"]>;
};

const DANGEROUS_KEYS = new Set([ "__proto__", "constructor", "prototype" ]);

function isUnexpectedRuntimeError(e: unknown): boolean {
    return (
        e instanceof TypeError ||
        e instanceof ReferenceError ||
        e instanceof SyntaxError ||
        e instanceof RangeError
    );
}

export function setAPIBackend<T extends API>(app: Express, api: APIBackendImplementation<T>): void {
    for (const endpoint of Object.keys(api)) {
        const method = getMethodFromEndpoint(endpoint).toLowerCase() as MethodLowerCase;
        const url = getUrlFromEndpoint(endpoint);

        app[method](url, async (req, res) => {
            const params = getParams(method, req);

            const log = { date: new Date().toISOString(), url, method, params };

            if (process.env.NODE_ENV === "development") {
                // eslint-disable-next-line no-console
                console.log(`${log.date}: ${method} ${url}`, params);
            }

            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const result = await api[endpoint](params as any, req, res);
                if (res.headersSent)
                    return;

                res.status(200);
                res.setHeader("Cache-Control", "no-cache");
                res.json(result ?? null);
            } catch (e: unknown) {
                const rawMessage = e && typeof e === "object" && "message" in e && typeof (e as Error).message === "string"
                    ? (e as Error).message
                    : JSON.stringify(e);
                const hasExplicitStatus = Boolean(
                    e && typeof e === "object" && "status" in e && typeof (e as { status: unknown }).status === "number",
                );
                const isRuntimeCrash = !hasExplicitStatus && isUnexpectedRuntimeError(e);
                const status = hasExplicitStatus
                    ? (e as { status: number }).status
                    : (isRuntimeCrash ? 500 : 400);

                // eslint-disable-next-line no-console
                console.error("API Error:", new Date(), url, status, rawMessage);

                if (res.headersSent)
                    return;

                const clientMessage = isRuntimeCrash && process.env.NODE_ENV === "production"
                    ? "Internal Server Error"
                    : rawMessage;

                res.status(status);
                res.json({ message: clientMessage });
            }
        });
    }
}

export class APIError extends Error {
    public status: number;

    constructor(message: string, status = 400) {
        super(message);
        this.status = status;
        Object.setPrototypeOf(this, APIError.prototype);
    }
}

function getParams(method: MethodLowerCase, req: Request): Record<string, unknown> {
    if (method === "get" || method === "delete") {
        const params: Record<string, unknown> = {};
        if (req.query && typeof req.query === "object") {
            for (const [ key, rawValue ] of Object.entries(req.query)) {
                if (DANGEROUS_KEYS.has(key))
                    continue;

                let value: unknown = rawValue;
                if (typeof rawValue === "string") {
                    try {
                        value = JSON.parse(rawValue);
                    } catch (e) {
                        // Keep raw string if not valid JSON
                    }
                }
                params[key] = value;
            }
        }
        return params;
    } else {
        if (req.body && typeof req.body === "object" && !Array.isArray(req.body)) {
            return req.body as Record<string, unknown>;
        }
        return {};
    }
}
