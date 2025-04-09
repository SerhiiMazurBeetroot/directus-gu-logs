import { ApiExtensionContext } from "@directus/extensions";
import type { PrimaryKey } from "@directus/types";
export declare class Logs {
    protected context: ApiExtensionContext;
    protected collectionName: string;
    protected extension: string;
    constructor(context: ApiExtensionContext, collectionName?: string, extension?: string);
    private getSchema;
    private createOne;
    printLogs(functionName: string, error: string): Promise<void>;
    createActivity(action: "create" | "update" | "delete" | undefined, collection: string, id: PrimaryKey, comment?: string): Promise<void>;
    createNotification(message?: string): Promise<void>;
}
