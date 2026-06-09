import type { ApiExtensionContext, ProjectMeta, SlackPayload } from "../types";
export declare class SlackNotifier {
    private readonly context;
    private readonly extension;
    constructor(context: ApiExtensionContext, extension: string);
    getWebHookUrl(): Promise<any>;
    send(payload: SlackPayload): Promise<void>;
    notify(message: string, subject: string | null | undefined, meta: ProjectMeta): Promise<void>;
}
