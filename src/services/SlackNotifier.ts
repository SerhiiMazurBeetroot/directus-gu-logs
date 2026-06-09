import type { ApiExtensionContext, ProjectMeta, SlackPayload } from "../types";

export class SlackNotifier {
	constructor(
		private readonly context: ApiExtensionContext,
		private readonly extension: string,
	) {}

	async getWebHookUrl() {
		const settings = await this.context.database.select("slack_webhook_url").from("global").first();

		return settings?.slack_webhook_url;
	}

	async send(payload: SlackPayload): Promise<void> {
		const webhook = await this.getWebHookUrl();

		if (!webhook) {
			this.context.logger.info({ msg: "⚠️ SLACK_WEBHOOK_URL is not configured" });
			return;
		}

		try {
			await fetch(webhook, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
		} catch (error) {
			this.context.logger.error({ msg: "❌ Failed to send Slack message", error });
		}
	}

	async notify(message: string, subject: string | null = null, meta: ProjectMeta): Promise<void> {
		const title = subject ?? "Directus Error Notification";

		await this.send({
			text: title,
			blocks: [
				{
					type: "header",
					text: { type: "plain_text", text: `🚨 ${title}` },
				},
				{
					type: "section",
					fields: [
						{ type: "mrkdwn", text: `*Project*\n${meta.projectName}` },
						{ type: "mrkdwn", text: `*Environment*\n${meta.environment}` },
						{ type: "mrkdwn", text: `*Extension*\n${this.extension}` },
						{ type: "mrkdwn", text: `*Backend*\n${meta.backendUrl}` },
					],
				},
				{ type: "divider" },
				{
					type: "section",
					text: { type: "mrkdwn", text: message },
				},
			],
		});
	}
}
