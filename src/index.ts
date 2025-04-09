import { ApiExtensionContext } from "@directus/extensions";
import type { PrimaryKey } from "@directus/types";

interface LogEntry {
	collection: string;
	date_created: string;
	extension: string;
	function_name: string;
	error: string;
}

export class Logs {
	protected context: ApiExtensionContext;
	protected extension: string;
	protected collectionName: string;

	constructor(context: ApiExtensionContext, extension = "unknown", collectionName = "logs") {
		this.context = context;
		this.extension = extension;
		this.collectionName = collectionName;
	}

	private async getSchema() {
		return await this.context.getSchema();
	}

	private async createOne(data: Record<string, any>) {
		const schema = await this.getSchema();

		const itemsService = new this.context.services.ItemsService(this.collectionName, {
			database: this.context.database,
			schema,
		});

		return await itemsService.createOne(data);
	}

	async printLogs(functionName: string, error: string) {
		const data: LogEntry = {
			collection: this.collectionName,
			date_created: new Date().toISOString(),
			extension: this.extension,
			function_name: functionName,
			error,
		};

		try {
			await this.createOne(data);
			console.error(`🚀 [${this.extension}] ${functionName}:`, error);
		} catch (error) {
			console.error("❌ Failed to save logs:", error);
		}
	}

	async createActivity(action: string, collection: string, id: PrimaryKey) {
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
		} catch (error) {
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
		} catch (error) {
			console.error("❌ Failed to create notification:", error);
		}
	}
}
