import express from "express";
import {
    APIDefinition,
    Endpoint,
    getAPIFrontend,
    setErrorHandler,
    ClientErrorInfo,
} from "../src/client";
import { setAPIBackend } from "../src/server";
import { getUseAPIFrontend } from "../src/hooks";

type Photo = {
    id: string,
    title: string,
};

// 1. Valid API definition using only get | post | put | delete
export type ValidAPI = APIDefinition<{
    getPhoto: Endpoint<{ id: string }, Photo>,
    postPhoto: Endpoint<{ title: string }, Photo>,
    putPhoto: Endpoint<Photo, boolean>,
    deletePhoto: Endpoint<{ id: string }, void>,
}>;

// 2. Invalid endpoint prefixes must fail at compile time
// @ts-expect-error Legacy "add" prefix is no longer allowed
export type InvalidAddAPI = APIDefinition<{ addPhoto: Endpoint<{ title: string }, Photo> }>;

// @ts-expect-error Legacy "update" prefix is no longer allowed
export type InvalidUpdateAPI = APIDefinition<{ updatePhoto: Endpoint<Photo, void> }>;

// @ts-expect-error Legacy "remove" prefix is no longer allowed
export type InvalidRemoveAPI = APIDefinition<{ removePhoto: Endpoint<{ id: string }, void> }>;

// @ts-expect-error Arbitrary prefix is not allowed
export type InvalidFetchAPI = APIDefinition<{ fetchPhoto: Endpoint<{ id: string }, Photo> }>;

// @ts-expect-error Prefix without capitalized name is not allowed
export type InvalidBareGetAPI = APIDefinition<{ get: Endpoint<{ id: string }, Photo> }>;

// @ts-expect-error Prefix followed by lowercase letter ("postalCode") is not allowed
export type InvalidLowercaseAPI = APIDefinition<{ postalCode: Endpoint<{ id: string }, Photo> }>;

// 3. Frontend client type checks
const api = getAPIFrontend<ValidAPI>();

async function testFrontendTypes(): Promise<void> {
    const [ photo, error, status ] = await api.getPhoto({ id: "123" });
    if (error === null) {
        const _id: string = photo.id;
        const _status: 200 = status;
        void _id;
        void _status;
    } else {
        const _err: string = error;
        const _status: number = status;
        void _err;
        void _status;
    }

    const url: string = api.getPhoto.getUrl({ id: "123" });
    void url;

    // @ts-expect-error Wrong parameter type (number instead of string)
    await api.getPhoto({ id: 123 });

    // @ts-expect-error Missing required parameter
    await api.postPhoto({});
}

void testFrontendTypes;

// 4. Error handler type checks
setErrorHandler((info: ClientErrorInfo) => {
    const _endpoint: string = info.endpoint;
    const _status: number = info.status;
    void _endpoint;
    void _status;
});

// 5. React hooks type checks
const useApi = getUseAPIFrontend<ValidAPI>();
function testHookTypes(): void {
    const [ photo, error, isLoading, status, reload ] = useApi.getPhoto({ id: "1" });
    if (!isLoading && error === null) {
        const _title: string = photo.title;
        const _status: 200 = status;
        void _title;
        void _status;
    }
    reload();
}
void testHookTypes;

// 6. Server implementation type checks
const app = express();
setAPIBackend<ValidAPI>(app, {
    async getPhoto({ id }) {
        return { id, title: "Test" };
    },
    async postPhoto({ title }) {
        return { id: "new", title };
    },
    async putPhoto({ id, title }) {
        return Boolean(id && title);
    },
    async deletePhoto() {
        return;
    },
});
