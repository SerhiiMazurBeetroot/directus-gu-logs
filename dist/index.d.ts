import { ApiExtensionContext } from "@directus/extensions";
import type { PrimaryKey } from "@directus/types";
export declare class Logs {
    protected context: ApiExtensionContext;
    protected extension: string;
    protected collectionName: string;
    constructor(context: ApiExtensionContext, extension?: string, collectionName?: string);
    private getSchema;
    private createOne;
    printLogs(functionName: string, error: string): Promise<void>;
    createActivity(action: string, collection: string, id: PrimaryKey): Promise<void>;
    createNotification(message?: string): Promise<void>;
}
