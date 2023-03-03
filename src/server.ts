import { Express, Request, Response } from "express";

import { API, getMethodFromEndpoint, getUrlFromEndpoint } from "./index";

export type APIBackendImplementation<T extends API> = {
    [I in keyof T]: (params: T[I]["params"], req: Request, res: Response) => Promise<T[I]["result"]>;
};

export function setAPIBackend<T extends API>(app: Express, api: APIBackendImplementation<T>): void {
    for (const endpoint in api) {
        const method = getMethodFromEndpoint(endpoint).toLowerCase() as "get" | "post" | "put" | "delete";
        const url = getUrlFromEndpoint(endpoint);

        app[method](url, async (req, res) => {
            let params: any = {};
            if (method === "get" || method === "delete") {
                for (let [key, value] of Object.entries(req.query)) {
                    if (typeof value === "string") {
                        try {
                            value = JSON.parse(value);
                        } catch (e) { }
                    }
                    params[key] = value;
                }
            } else {
                params = req.body;
            }

            const log = { date: new Date().toISOString(), url, method, params };

            if (process.env.NODE_ENV === "development")
                // eslint-disable-next-line no-console
                console.log(`${log.date}: ${method} ${url}`, params);

            res.type("json");
            try {
                const result = await api[endpoint](params, req, res);
                res.status(200);
                res.setHeader("Cache-Control", "no-cache");
                res.send(JSON.stringify(result || null));
            } catch (e: any) {
                const message = typeof e === "object" && e !== null && typeof e.message === "string" ? e.message : JSON.stringify(e);
                // eslint-disable-next-line no-console
                console.log("Error:", new Date(), url, message);
                res.status(400);
                res.send({ message });
            }
        });
    }
}
