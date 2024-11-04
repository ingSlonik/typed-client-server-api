import { useState, useEffect, useMemo, useRef } from "react";

import { API, Result, UseResult } from "./index";
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
                
                const [reloadVariable, setReloadVariable] = useState(0);
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

                const [result, setResult] = useState<UseResult<T>>([null, null, true, 0, reload]);

                const refLast = useRef({});
                useEffect(() => {
                    const last = refLast.current = {};
                    setResult([null, null, true, 0, reload]);
                    api[endpoint](params).then((result: Result<T>) => {
                        if (refMounted.current && last === refLast.current)
                            setResult([result[0] as any, result[1] as any, false, result[2], reload]);
                    });
                    // eslint-disable-next-line react-hooks/exhaustive-deps
                }, [JSON.stringify(params), reloadVariable]);

                return result;
            };
        },
    }) as UseAPIFrontend<T>;
}
