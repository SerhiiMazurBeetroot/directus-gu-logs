export class Logs {
    constructor(context, extension, collectionName = "logs") {
        this.context = context;
        this.extension = extension;
        this.collectionName = collectionName;
    }
    async getSchema() {
        return await this.context.getSchema();
    }
    async createOne(data) {
        const schema = await this.getSchema();
        const itemsService = new this.context.services.ItemsService(this.collectionName, {
            database: this.context.database,
            schema,
        });
        return await itemsService.createOne(data);
    }
    async printLogs(functionName, error) {
        const data = {
            collection: this.collectionName,
            date_created: new Date().toISOString(),
            extension: this.extension,
            function_name: functionName,
            error,
        };
        try {
            await this.createOne(data);
            console.error(`🚀 [${this.extension}] ${functionName}:`, error);
        }
        catch (error) {
            console.error("❌ Failed to save logs:", error);
        }
    }
    async createActivity(action, collection, id) {
        try {
            const schema = await this.getSchema();
            const services = this.context.services;
            const accountability = services.accountability;
            const activityService = new services.ActivityService({
                schema: schema,
                accountability: accountability,
                knex: this.context.database,
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
        catch (error) {
            console.error("❌ Failed to create activity log:", error);
        }
    }
    async createNotification(message, customSubject = null, recipientOverride = null) {
        try {
            const schema = await this.getSchema();
            const { database, services } = this.context;
            // Check for passed recipient, fallback to global settings
            let recipient = recipientOverride;
            if (!recipient) {
                const globalSettings = await database.select("notice_recipient").from("global").first();
                recipient = globalSettings?.notice_recipient;
            }
            if (!recipient) {
                this.printLogs(this.extension, "No recipient defined (override or global settings)");
                return;
            }
            const notificationService = new services.NotificationsService({ schema });
            // Project Data
            const settings = await database.select("project_name").from("directus_settings").first();
            const projectName = settings?.project_name || "Unknown Project";
            const backendUrl = process.env.BACKEND_URL || this.context.env?.PUBLIC_URL || "Unknown URL";
            const environment = process.env.BRANCH || "dev";
            const timestamp = new Date().toLocaleString("en-GB", { timeZone: "UTC" });
            // Compose subject & message
            const subject = customSubject
                ? `${customSubject} - ${projectName}`
                : `Directus Error Notification - ${projectName}`;
            const fullMessage = `
${message}

Environment: ${environment}
Backend URL: ${backendUrl}
Date/Time (UTC): ${timestamp}
		`.trim();
            await notificationService.createOne({
                recipient,
                sender: recipient,
                subject,
                message: fullMessage,
                collection: null,
                item: null,
            });
        }
        catch (error) {
            console.error("❌ Failed to create notification:", error);
        }
    }
}
