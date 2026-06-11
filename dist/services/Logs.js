import { SlackNotifier } from "../services/SlackNotifier";
import { DirectusNotifier } from "./DirectusNotifier";
export class Logs {
    constructor(context, extension, collectionName = "logs") {
        this.context = context;
        this.extension = extension;
        this.collectionName = collectionName;
        this.slack = new SlackNotifier(context, extension);
        this.directus = new DirectusNotifier(context, extension);
    }
    async getSchema() {
        return this.context.getSchema();
    }
    async getProjectMeta() {
        const settings = await this.context.database.select("project_name").from("directus_settings").first();
        return {
            projectName: settings?.project_name ?? "Unknown Project",
            backendUrl: process.env.BACKEND_URL ?? this.context.env?.PUBLIC_URL ?? "Unknown URL",
            environment: process.env.BRANCH ?? "dev",
            timestamp: new Intl.DateTimeFormat("en-US", {
                month: "2-digit",
                day: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
                timeZone: "UTC",
            }).format(new Date()),
        };
    }
    async createOne(data) {
        const schema = await this.getSchema();
        const itemsService = new this.context.services.ItemsService(this.collectionName, {
            database: this.context.database,
            schema,
        });
        return await itemsService.createOne(data);
    }
    /**
     * Persists an error entry to the logs collection, optionally notifying via Slack.
     */
    async logError(functionName, error, notifySlack = false) {
        const data = {
            collection: this.collectionName,
            date_created: new Date().toISOString(),
            extension: this.extension,
            function_name: functionName,
            error,
        };
        try {
            await this.createOne(data);
            this.context.logger.error({ msg: `🚀 [${this.extension}] ${functionName}:`, error });
        }
        catch (err) {
            this.context.logger.error({ msg: "❌ Failed to save log entry", error: err });
            return;
        }
        try {
            if (notifySlack) {
                const meta = await this.getProjectMeta();
                await this.slack.notify(`*Function:* ${functionName}\n*Error:* ${error}`, meta, "Extension Error");
            }
        }
        catch (err) {
            this.context.logger.error({ msg: "Slack failed", error: err });
        }
    }
    /** @deprecated Use logError() instead */
    async printLogs(functionName, error, notifySlack = false) {
        return this.logError(functionName, error, notifySlack);
    }
    async createActivity(action, collection, id) {
        try {
            const schema = await this.getSchema();
            const { services, database } = this.context;
            const accountability = services.accountability;
            const activityService = new services.ActivityService({
                schema,
                accountability,
                knex: database,
            });
            await activityService.createOne({
                action,
                user: accountability?.user ?? null,
                collection,
                ip: accountability?.ip ?? null,
                user_agent: accountability?.userAgent ?? null,
                origin: accountability?.origin ?? null,
                item: id,
            });
        }
        catch (err) {
            this.context.logger.error({ msg: "❌ Failed to create activity log", error: err });
        }
    }
    async createNotification(message, customSubject = null, recipientOverride = null, collection = null, item = null, notifySlack = true) {
        const meta = await this.getProjectMeta();
        await this.directus.notify(message, meta, {
            subject: customSubject,
            recipientOverride,
            collection,
            item,
        });
        try {
            if (notifySlack) {
                const meta = await this.getProjectMeta();
                await this.slack.notify(`*Error:* ${message}`, meta, customSubject);
            }
        }
        catch (err) {
            this.context.logger.error({ msg: "Slack failed", error: err });
        }
    }
    async notifySlack(message, customSubject = null) {
        const meta = await this.getProjectMeta();
        await this.slack.notify(message, meta, customSubject);
    }
}
