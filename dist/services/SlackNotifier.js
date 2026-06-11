export class SlackNotifier {
    constructor(context, extension) {
        this.context = context;
        this.extension = extension;
        this.configCachedAt = 0;
        this.CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    }
    getEnvironmentIcon(environment) {
        switch (environment.toLowerCase()) {
            case "main":
            case "master":
                return "🚨🔴";
            case "staging":
                return "🟠";
            case "develop":
                return "🟡";
            default:
                return "⚪";
        }
    }
    buildBlocks(title, envIcon, message, meta) {
        return [
            {
                type: "header",
                text: { type: "plain_text", text: `${envIcon} ${title}: ${this.extension}` },
            },
            {
                type: "section",
                fields: [
                    { type: "mrkdwn", text: `*Project*\n${meta.projectName}` },
                    { type: "mrkdwn", text: `*Environment*\n${meta.environment}` },
                    { type: "mrkdwn", text: `*Timestamp (UTC)*\n${meta.timestamp}` },
                    { type: "mrkdwn", text: `*Backend*\n${meta.backendUrl}` },
                ],
            },
            { type: "divider" },
            { type: "section", text: { type: "mrkdwn", text: message } },
        ];
    }
    async send(payload) {
        const config = await this.getConfig();
        if (!config) {
            this.context.logger.warn({ msg: "⚠️ Slack config not found" });
            return;
        }
        if (!Boolean(config?.slack_notifications)) {
            this.context.logger.info({ msg: "⚠️ Slack notifications are disabled" });
            return;
        }
        if (!config.slack_webhook_url) {
            this.context.logger.warn({ msg: "⚠️ Slack webhook URL is not configured" });
            return;
        }
        try {
            await fetch(config.slack_webhook_url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            this.context.logger.debug({ msg: `✅ Slack notification sent [${this.extension}]` });
        }
        catch (error) {
            this.context.logger.error({ msg: "❌ Failed to send Slack message", error });
        }
    }
    async notify(message, meta, subject = null) {
        const title = subject ?? "Directus Error Notification";
        const envIcon = this.getEnvironmentIcon(meta.environment);
        await this.send({
            text: title,
            blocks: this.buildBlocks(title, envIcon, message, meta),
        });
    }
    async getConfig() {
        const now = Date.now();
        if (this.configCache && now - this.configCachedAt < this.CONFIG_CACHE_TTL) {
            return this.configCache;
        }
        const result = await this.context.database
            .select("slack_webhook_url", "slack_notifications")
            .from("global")
            .first();
        if (result) {
            this.configCache = result;
            this.configCachedAt = now;
        }
        return result;
    }
    clearConfigCache() {
        this.configCache = undefined;
        this.configCachedAt = 0;
        this.context.logger.debug({ msg: "🔄 Slack config cache cleared" });
    }
}
