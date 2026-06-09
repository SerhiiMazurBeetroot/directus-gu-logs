function extractRecipientIds(rows) {
    const recipients = rows
        ?.map(row => {
        const user = row?.directus_users_id;
        if (typeof user === "string")
            return user;
        return typeof user?.id === "string" ? user.id : null;
    })
        .filter((v) => Boolean(v)) ?? [];
    return Array.from(new Set(recipients));
}
export class DirectusNotifier {
    constructor(context, extension) {
        this.context = context;
        this.extension = extension;
    }
    async getSchema() {
        return this.context.getSchema();
    }
    async notify(message, meta, options = {}) {
        const { subject = null, recipientOverride = null, collection = null, item = null } = options;
        try {
            const schema = await this.getSchema();
            const { database, services } = this.context;
            let recipients = [];
            if (recipientOverride) {
                recipients = [recipientOverride];
            }
            else {
                const globalService = new services.ItemsService("global", { database, schema });
                const globalSettings = await globalService.readSingleton({
                    fields: ["error_notice_recipient.directus_users_id.id"],
                });
                recipients = extractRecipientIds(globalSettings?.error_notice_recipient);
            }
            if (recipients.length === 0) {
                this.context.logger.warn({
                    msg: `[${this.extension}] No notification recipients defined (override or global settings)`,
                });
                return;
            }
            const notificationService = new services.NotificationsService({ schema });
            const now = new Date();
            const timestamp = new Intl.DateTimeFormat("en-US", {
                month: "2-digit",
                day: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
                timeZone: "UTC",
            }).format(now);
            const resolvedSubject = subject
                ? `${subject} - ${meta.projectName}`
                : `Directus Error Notification - ${meta.projectName}`;
            const fullMessage = [
                message,
                `<strong>Environment:</strong> ${meta.environment}`,
                `<strong>Backend URL:</strong> <a href="${meta.backendUrl}" target="_blank">${meta.backendUrl}</a>`,
                `<strong>Date/Time (UTC):</strong> ${timestamp}`,
            ].join("<br><br>");
            for (const recipient of recipients) {
                await notificationService.createOne({
                    recipient,
                    sender: recipient,
                    subject: resolvedSubject,
                    message: fullMessage,
                    collection,
                    item,
                });
            }
        }
        catch (error) {
            this.context.logger.error({ msg: "❌ Failed to send Directus notification", error });
        }
    }
}
