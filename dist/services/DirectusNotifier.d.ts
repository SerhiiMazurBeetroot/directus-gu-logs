import type { ApiExtensionContext, ProjectMeta } from "../types";
export declare class DirectusNotifier {
    private readonly context;
    private readonly extension;
    constructor(context: ApiExtensionContext, extension: string);
    private getSchema;
    notify(message: string, meta: ProjectMeta, options?: {
        subject?: string | null;
        recipientOverride?: string | null;
        collection?: string | null;
        item?: string | null;
    }): Promise<void>;
}
