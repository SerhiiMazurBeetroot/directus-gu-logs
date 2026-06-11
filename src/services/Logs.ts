import type { ApiExtensionContext, LogEntry, PrimaryKey, ProjectMeta } from "../types";
import { SlackNotifier } from "../services/SlackNotifier";
import { DirectusNotifier } from "./DirectusNotifier";

export class Logs {
	protected readonly slack: SlackNotifier;
	protected readonly directus: DirectusNotifier;

	constructor(
		protected readonly context: ApiExtensionContext,
		protected readonly extension: string,
		protected readonly collectionName: string = "logs",
	) {
		this.slack = new SlackNotifier(context, extension);
		this.directus = new DirectusNotifier(context, extension);
	}

	private async getSchema() {
		return this.context.getSchema();
	}

	private async getProjectMeta(): Promise<ProjectMeta> {
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

	private async createOne(data: Record<string, any>) {
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
	async logError(functionName: string, error: string, notifySlack = false): Promise<void> {
		const data: LogEntry = {
			collection: this.collectionName,
			date_created: new Date().toISOString(),
			extension: this.extension,
			function_name: functionName,
			error,
		};

		try {
			await this.createOne(data);

			this.context.logger.error({ msg: `🚀 [${this.extension}] ${functionName}:`, error });
		} catch (err) {
			this.context.logger.error({ msg: "❌ Failed to save log entry", error: err });
			return;
		}

		try {
			if (notifySlack) {
				const meta = await this.getProjectMeta();
				await this.slack.notify(`*Function:* ${functionName}\n*Error:* ${error}`, meta, "Extension Error");
			}
		} catch (err) {
			this.context.logger.error({ msg: "Slack failed", error: err });
		}
	}

	/** @deprecated Use logError() instead */
	async printLogs(functionName: string, error: string, notifySlack = false): Promise<void> {
		return this.logError(functionName, error, notifySlack);
	}

	async createActivity(action: string, collection: string, id: PrimaryKey): Promise<void> {
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
		} catch (err) {
			this.context.logger.error({ msg: "❌ Failed to create activity log", error: err });
		}
	}

	async createNotification(
		message: string,
		customSubject: string | null = null,
		recipientOverride: string | null = null,
		collection: string | null = null,
		item: string | null = null,
		notifySlack = true,
	): Promise<void> {
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
		} catch (err) {
			this.context.logger.error({ msg: "Slack failed", error: err });
		}
	}

	async notifySlack(message: string, customSubject: string | null = null): Promise<void> {
		const meta = await this.getProjectMeta();

		await this.slack.notify(message, meta, customSubject);
	}
}
