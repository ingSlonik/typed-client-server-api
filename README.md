# Typed Client Server API

Create REST-ish API server and client implementation without mistakes.

- One file with definition for server and client.
- IDE will tell you what is necessary implement and what it returns.
- Error before compile on client and server code.

## API definition

Define types to file for client and server in one file `api.d.ts`.

```js
import { APIDefinition, Endpoint } from "typed-client-server-api";

export type API = APIDefinition<{
    addPhoto: Endpoint<Photo, string>,
    getPhoto: Endpoint<{ id: string }, Photo>,
    updatePhoto: Endpoint<Photo, void>,
    removePhoto: Endpoint<{ id: string }, void>,
}>;
```

## Browser

```js
import { setServerUrl, getAPIFrontend } from "typed-client-server-api";
import { API } from "../api.d.ts";

setServerUrl(process.env.NODE_ENV === "development" ? "http://localhost:8080" : "");

export const api = getAPIFrontend<API>();
```

### React

```js
import { setServerUrl, getUseAPIFrontend } from "typed-client-server-api/hooks";
import { API } from "../api.d.ts";

setServerUrl(process.env.NODE_ENV === "development" ? "http://localhost:8080" : "");

export const useApi = getUseAPIFrontend<API>();
```

## Node

```js
import { setAPIBackend } from "typed-client-server-api";
import express from "express";

import { API } from "../api.d.ts";

const app = express();

setAPIBackend<API>(app, {
    addPhoto: async () => {
        // add photo and return string
    },
    getPhoto: async ({ type, color }) => {
        // return photo
    },
    // other methods
});

app.listen(PORT, () => console.log(`Server is running at http://localhost:${PORT}.`));
```
