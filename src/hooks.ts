import { useState, useEffect, useMemo, useRef } from "react";

import { API, Result, UseResult } from "./index";
import { getAPIFrontend } from "./client";

export type UseAPIFrontend<T extends API> = {
    [I in keyof T]: (params: T[I]["params"]) => UseResult<T[I]["result"]>;
};

export {
    getAPIFrontend,
    setServerUrl,
    setHeaders,
    setErrorHandler,
} from "./client";
export type { ClientErrorInfo, ErrorHandler } from "./client";

export function getUseAPIFrontend<T extends API>(): UseAPIFrontend<T> {
    const api = getAPIFrontend<T>();

    return new Proxy({}, {
        get: (_, endpoint: string) => {
            if (typeof endpoint !== "string" || endpoint === "$$typeof" || endpoint === "then")
                return null;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (params: any) => {
                const [ reloadVariable, setReloadVariable ] = useState(0);
                const reload = useMemo(() => () => {
                    setReloadVariable(v => v + 1);
                }, []);

                const refMounted = useRef(false);
                useEffect(() => {
                    refMounted.current = true;
                    return () => {
                        refMounted.current = false;
                    };
                }, []);

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const [ result, setResult ] = useState<UseResult<any>>([ null, null, true, 0, reload ]);

                const refLast = useRef({});
                const serializedParams = JSON.stringify(params);

                useEffect(() => {
                    const last = refLast.current = {};
                    setResult([ null, null, true, 0, reload ]);
                    api[endpoint](params).then((res: Result<unknown>) => {
                        if (refMounted.current && last === refLast.current) {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            setResult([ res[0], res[1], false, res[2], reload ] as UseResult<any>);
                        }
                    });
                    // eslint-disable-next-line react-hooks/exhaustive-deps
                }, [ serializedParams, reloadVariable ]);

                return result;
            };
        },
    }) as UseAPIFrontend<T>;
}

