import { useState, useEffect } from "react";

import { API, UseResult } from "./index";
import { getAPIFrontend } from "./client";

export type UseAPIFrontend<T extends API> = {
    [I in keyof T]: (params: T[I]["params"]) => UseResult<T[I]["result"]>;
};

export { getAPIFrontend, setServerUrl, setHeaders } from "./client";

export function getUseAPIFrontend<T extends API>(): UseAPIFrontend<T> {
    const api = getAPIFrontend<T>();

    return new Proxy({}, {
        get: (_, endpoint: string) => {

            return (params: any) => {
                const [result, setResult] = useState<UseResult<any>>([null, null, true, 0]);

                useEffect(() => {
                    api[endpoint](params).then((result: any) => setResult([result[0], result[1], false, result[2]]));
                    // eslint-disable-next-line react-hooks/exhaustive-deps
                }, [JSON.stringify(params)]);

                return result;
            };
        },
    }) as UseAPIFrontend<T>;
}
