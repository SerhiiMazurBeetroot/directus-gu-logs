export class Logs {
    constructor(context, collectionName = "logs", extension = "unknown") {
        this.context = context;
        this.collectionName = collectionName;
        this.extension = extension;
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
    async createNotification(message = "") {
        try {
            const schema = await this.getSchema();
            const { database, services } = this.context;
            const globalSettings = await database.select("notice_recipient").from("global").first();
            const recipient = globalSettings?.notice_recipient;
            if (!recipient) {
                this.printLogs(this.extension, "No recipient defined in global settings");
                return;
            }
            const notificationService = new services.NotificationsService({ schema });
            await notificationService.createOne({
                recipient,
                sender: recipient,
                subject: "Directus Error Notification",
                message,
                collection: null,
                item: null,
            });
        }
        catch (error) {
            console.error("❌ Failed to create notification:", error);
        }
    }
}
