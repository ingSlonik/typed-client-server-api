import { Express, Request, Response } from "express";

import { API, getMethodFromEndpoint, getUrlFromEndpoint } from "./index";

type MethodLowerCase = "get" | "post" | "put" | "delete";

export type APIBackendImplementation<T extends API> = {
    [I in keyof T]: (params: T[I]["params"], req: Request, res: Response) => Promise<T[I]["result"]>;
};

export function setAPIBackend<T extends API>(app: Express, api: APIBackendImplementation<T>): void {
    for (const endpoint in api) {
        const method = getMethodFromEndpoint(endpoint).toLowerCase() as MethodLowerCase;
        const url = getUrlFromEndpoint(endpoint);

        app[method](url, async (req, res) => {
            const params = getParams(method, req);

            const log = { date: new Date().toISOString(), url, method, params };

            if (process.env.NODE_ENV === "development")
                console.log(`${log.date}: ${method} ${url}`, params);

            try {
                const result = await api[endpoint](params, req, res);
                res.status(200);
                res.setHeader("Cache-Control", "no-cache");
                res.json(result || null);
            } catch (e: any) {
                const message = e && typeof e === "object" && typeof e.message === "string" ? e.message : JSON.stringify(e);
                const status = e && typeof e === "object" && typeof e.status === "number" ? e.status : 400;

                console.log("API Error:", new Date(), url, status, message);

                res.status(status);
                res.json({ message });
            }
        });
    }
}

export class APIError extends Error {
    public status: number;

    constructor(message: string, status = 400) {
        super(message);
        this.status = status;
    }
}

function getParams(method: MethodLowerCase, req: Request): Record<string, any> {
    if (method === "get" || method === "delete") {
        const params: Record<string, any> = {};
        for (let [key, value] of Object.entries(req.query)) {
            if (typeof value === "string") {
                try {
                    value = JSON.parse(value);
                } catch (e) { }
            }
            params[key] = value;
        }
        return params;
    } else {
        return req.body;
    }
}