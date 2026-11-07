# Typed Client Server API

Create REST-ish API server and client implementation without mistakes.

- One file with definition for server and client.
- IDE will tell you what is necessary implement and what it returns.
- Error before compile on client and server code.

## API definition

Define types to file for client and server in one file `api.d.ts`.
Endpoint names must start with an HTTP verb (`get`, `post`, `put`, `delete`).

```ts
import { APIDefinition, Endpoint } from "typed-client-server-api";

export type API = APIDefinition<{
    postPhoto: Endpoint<Photo, string>,
    getPhoto: Endpoint<{ id: string }, Photo>,
    putPhoto: Endpoint<Photo, void>,
    deletePhoto: Endpoint<{ id: string }, void>,
}>;
```

## Browser

```ts
import { setServerUrl, getAPIFrontend, setHeaders, setErrorHandler } from "typed-client-server-api";
import { API } from "../api.d.ts";

setServerUrl(process.env.NODE_ENV === "development" ? "http://localhost:8080" : "");

setErrorHandler(({ endpoint, url, method, status, error, originalError }) => {
    // Log 4xx, 5xx, network (503) or parsing errors to Sentry / monitoring tool
    console.error(`[API Error] ${method} ${url} (${endpoint}) -> ${status}: ${error}`, originalError);
});

export const api = getAPIFrontend<API>();

// usage
const [ photo, error, status ] = await api.postPhoto({ data });

// get url only (without triggering request)
const url = api.getPhoto.getUrl({ id: "123" });
```

### React

```js
import { setServerUrl, getUseAPIFrontend, setHeaders } from "typed-client-server-api/hooks";
import { API } from "../api.d.ts";

setServerUrl(process.env.NODE_ENV === "development" ? "http://localhost:8080" : "");

export const useApi = getUseAPIFrontend<API>();

// usage
function App() {
    const [ result, error, isLoading, status, reload ] = useApi.getPhoto({ id });
    ...
```

## Node

```js
import { setAPIBackend } from "typed-client-server-api";
import express from "express";

import { API } from "../api.d.ts";

const app = express();

app.use(express.json());

setAPIBackend<API>(app, {
    async postPhoto({ data }, req, res) {
        // check permission with `req`
        // add photo and return string
    },
    async getPhoto({ id }) {
        // return photo
    },
    // other methods
});

app.listen(PORT, () => console.log(`Server is running at http://localhost:${PORT}.`));
```
