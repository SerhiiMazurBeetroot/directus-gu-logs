import type { ApiExtensionContext } from "@directus/extensions";
import type { PrimaryKey } from "@directus/types";
export interface LogEntry {
    collection: string;
    date_created: string;
    extension: string;
    function_name: string;
    error: string;
}
export interface RecipientLinkRow {
    directus_users_id?: string | {
        id?: string | null;
    } | null;
}
export interface ProjectMeta {
    projectName: string;
    backendUrl: string;
    environment: string;
    timestamp: string;
}
export interface SlackBlock {
    type: string;
    text?: {
        type: string;
        text: string;
        emoji?: boolean;
    };
    fields?: {
        type: string;
        text: string;
    }[];
}
export interface SlackPayload {
    text: string;
    blocks?: SlackBlock[];
}
export type { ApiExtensionContext };
export type { PrimaryKey };
