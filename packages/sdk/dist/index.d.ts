interface ApiConfig {
    baseUrl: string;
    defaultHeaders?: Record<string, string | Promise<string | null>>;
    maxRetries?: number;
    initialRetryDelay?: number;
}
interface FetchOptions extends RequestInit {
    retries?: number;
}
declare class Api {
    private baseUrl;
    private headers;
    private maxRetries;
    private initialRetryDelay;
    constructor(config: ApiConfig);
    private resolveHeaders;
    addHeader(key: string, value: string | Promise<string | null>): void;
    private post;
    fetch<ReqBody, ResBody>(path: string, data: ReqBody, options?: FetchOptions): Promise<ResBody | null>;
}

type TrackHandlerPayload = {
    type: 'track';
    payload: TrackPayload;
} | {
    type: 'increment';
    payload: IncrementPayload;
} | {
    type: 'decrement';
    payload: DecrementPayload;
} | {
    type: 'alias';
    payload: AliasPayload;
} | {
    type: 'identify';
    payload: IdentifyPayload;
};
type TrackPayload = {
    name: string;
    properties?: Record<string, unknown>;
    profileId?: string;
};
type TrackProperties = {
    [key: string]: unknown;
    profileId?: string;
};
type IdentifyPayload = {
    profileId: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    avatar?: string;
    properties?: Record<string, unknown>;
};
type AliasPayload = {
    profileId: string;
    alias: string;
};
type IncrementPayload = {
    profileId: string;
    property: string;
    value?: number;
};
type DecrementPayload = {
    profileId: string;
    property: string;
    value?: number;
};
type OpenPanelOptions = {
    clientId: string;
    clientSecret?: string;
    apiUrl?: string;
    sdk?: string;
    sdkVersion?: string;
    waitForProfile?: boolean;
    filter?: (payload: TrackHandlerPayload) => boolean;
    disabled?: boolean;
};
declare class OpenPanel {
    options: OpenPanelOptions;
    api: Api;
    profileId?: string;
    global?: Record<string, unknown>;
    queue: TrackHandlerPayload[];
    constructor(options: OpenPanelOptions);
    init(): void;
    ready(): void;
    send(payload: TrackHandlerPayload): Promise<unknown>;
    setGlobalProperties(properties: Record<string, unknown>): void;
    track(name: string, properties?: TrackProperties): Promise<unknown>;
    identify(payload: IdentifyPayload): Promise<unknown>;
    alias(payload: AliasPayload): Promise<unknown>;
    increment(payload: IncrementPayload): Promise<unknown>;
    decrement(payload: DecrementPayload): Promise<unknown>;
    clear(): void;
    flush(): void;
}

interface OpenpanelEventOptions {
    profileId?: string;
}
interface PostEventPayload {
    name: string;
    timestamp: string;
    profileId?: string;
    properties?: Record<string, unknown> & OpenpanelEventOptions;
}
interface UpdateProfilePayload {
    profileId: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    avatar?: string;
    properties?: Record<string, unknown>;
}
interface IncrementProfilePayload {
    profileId: string;
    property: string;
    value: number;
}
interface DecrementProfilePayload {
    profileId?: string;
    property: string;
    value: number;
}

export { type AliasPayload, type DecrementPayload, type DecrementProfilePayload, type IdentifyPayload, type IncrementPayload, type IncrementProfilePayload, OpenPanel, type OpenPanelOptions, type OpenpanelEventOptions, type PostEventPayload, type TrackHandlerPayload, type TrackPayload, type TrackProperties, type UpdateProfilePayload };
