import { ApiExtensionContext } from "@directus/extensions";
import type { PrimaryKey } from "@directus/types";

interface LogEntry {
	collection: string;
	date_created: string;
	extension: string;
	function_name: string;
	error: string;
}

interface RecipientLinkRow {
	directus_users_id?: string | { id?: string | null } | null;
}

function extractRecipientIds(rows: RecipientLinkRow[] | undefined): string[] {
	const recipients =
		rows
			?.map(row => {
				const user = row?.directus_users_id;
				if (typeof user === "string") return user;
				return typeof user?.id === "string" ? user.id : null;
			})
			.filter((value): value is string => Boolean(value)) ?? [];

	return Array.from(new Set(recipients));
}

export class Logs {
	protected context: ApiExtensionContext;
	protected extension: string;
	protected collectionName: string;

	constructor(context: ApiExtensionContext, extension: string, collectionName: string = "logs") {
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

	async createNotification(
		message: string,
		customSubject: string | null = null,
		recipientOverride: string | null = null,
		collection: string | null = null,
		item: string | null = null
	) {
		try {
			const schema = await this.getSchema();
			const { database, services } = this.context;
			const globalService = new services.ItemsService("global", {
				database,
				schema,
			});

			// Check for passed recipient, fallback to global settings
			let recipients: string[] = [];

			if (recipientOverride) {
				recipients = [recipientOverride];
			} else {
				const globalSettings = await globalService.readSingleton({
					fields: ["error_notice_recipient.directus_users_id.id"],
				});

				recipients = extractRecipientIds(globalSettings?.error_notice_recipient);
			}

			if (recipients.length === 0) {
				this.printLogs(this.extension, "No recipients defined (override or global settings)");
				return;
			}

			const notificationService = new services.NotificationsService({ schema });

			// Project Data
			const settings = await database.select("project_name").from("directus_settings").first();

			const projectName = settings?.project_name || "Unknown Project";
			const backendUrl = process.env.BACKEND_URL || this.context.env?.PUBLIC_URL || "Unknown URL";
			const environment = process.env.BRANCH || "dev";

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

			// Compose subject & message
			const subject = customSubject
				? `${customSubject} - ${projectName}`
				: `Directus Error Notification - ${projectName}`;

			const fullMessage = `
${message}<br><br>
<strong>Environment:</strong> ${environment}<br>
<strong>Backend URL:</strong> <a href="${backendUrl}" target="_blank">${backendUrl}</a><br>
<strong>Date/Time (UTC):</strong> ${timestamp}
`.trim();

			for (const recipient of recipients) {
				await notificationService.createOne({
					recipient,
					sender: recipient,
					subject,
					message: fullMessage,
					collection,
					item,
				});
			}
		} catch (error) {
			console.error("❌ Failed to create notification:", error);
		}
	}
}
