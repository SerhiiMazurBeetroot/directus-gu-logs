import type { ApiExtensionContext, ProjectMeta, SlackPayload } from "../types";
export declare class SlackNotifier {
    private readonly context;
    private readonly extension;
    private configCache;
    private configCachedAt;
    private readonly CONFIG_CACHE_TTL;
    constructor(context: ApiExtensionContext, extension: string);
    private getEnvironmentIcon;
    private buildBlocks;
    send(payload: SlackPayload): Promise<void>;
    notify(message: string, meta: ProjectMeta, subject?: string | null): Promise<void>;
    isEnabled(): Promise<boolean>;
    private getConfig;
    clearConfigCache(): void;
}
