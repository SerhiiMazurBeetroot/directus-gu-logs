import type { ApiExtensionContext, PrimaryKey } from "../types";
import { SlackNotifier } from "../services/SlackNotifier";
import { DirectusNotifier } from "./DirectusNotifier";
export declare class Logs {
    protected readonly context: ApiExtensionContext;
    protected readonly extension: string;
    protected readonly collectionName: string;
    protected readonly slack: SlackNotifier;
    protected readonly directus: DirectusNotifier;
    constructor(context: ApiExtensionContext, extension: string, collectionName?: string);
    private getSchema;
    private getProjectMeta;
    private createOne;
    /**
     * Persists an error entry to the logs collection, optionally notifying via Slack.
     */
    logError(functionName: string, error: string, notifySlack?: boolean): Promise<void>;
    /** @deprecated Use logError() instead */
    printLogs(functionName: string, error: string, notifySlack?: boolean): Promise<void>;
    createActivity(action: string, collection: string, id: PrimaryKey): Promise<void>;
    createNotification(message: string, customSubject?: string | null, recipientOverride?: string | null, collection?: string | null, item?: string | null, notifySlack?: boolean): Promise<void>;
    notifySlack(message: string, customSubject?: string | null): Promise<void>;
}
