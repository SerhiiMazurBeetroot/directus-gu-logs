# 📦 Custom Directus Logs Utility

A modular utility for logging errors, tracking activity, and sending notifications (Directus in-app + Slack) from Directus extensions.

## 📋 Requirements

### 1. Logs Collection (`logs`)

Create a collection named `logs` with the following fields:

| Field Name      | Type      | Description                  |
| --------------- | --------- | ---------------------------- |
| `collection`    | string    | Name of the collection       |
| `date_created`  | datetime  | Timestamp of the log         |
| `extension`     | string    | Extension identifier         |
| `function_name` | string    | Name of the function         |
| `error`         | text/code | Error message or stack trace |

### 2. Global Collection (`global`)

Add the following field to the `global` singleton collection:

| Field Name               | Type                            | Description                                  |
| ------------------------ | ------------------------------- | -------------------------------------------- |
| `error_notice_recipient` | m2m → directus_users (junction) | Recipients for error notifications           |
| `slack_webhook_url`      | input                           | Incoming webhook URL for Slack notifications |

All linked users will receive internal Directus notifications when errors occur (unless a recipient override is passed).

### 3. Environment Variables

| Variable      | Required | Description                                                   |
| ------------- | -------- | ------------------------------------------------------------- |
| `BACKEND_URL` | Optional | Shown in notifications; falls back to `PUBLIC_URL`            |
| `BRANCH`      | Optional | Environment label (e.g. `main`, `staging`); defaults to `dev` |

---

## 🚀 Features

- Persist structured error logs to a Directus collection
- Send Slack Block Kit notifications via incoming webhook
- Send Directus in-app notifications with automatic recipient resolution
- Create Directus activity records
- Shared project metadata (name, URL, environment) injected into all notifications
- Recipient deduplication
- Graceful fallbacks — all methods catch and log their own errors

---

## 📦 Installation

```bash
npm i @serhii.mazur/directus-gu-logs
```

---

## 🗂 Architecture

The package is split into three focused classes:

```
Logs                  ← main entry point; orchestrates everything
├── SlackNotifier     ← formats and sends Slack Block Kit payloads
└── DirectusNotifier  ← resolves recipients, sends in-app notifications
```

All three are exported and can be used independently if needed.

---

## 🧩 Usage

### Basic (via `Logs`)

```ts
import { Logs } from "@serhii.mazur/directus-gu-logs";

const logs = new Logs(context, "my-extension");

// Persist error log to DB + notify Slack
await logs.printLogs("myFunction", "Something went wrong");

// Persist error log without Slack notification
await logs.printLogs("myFunction", "Something went wrong", false);

// Create a Directus activity record
await logs.createActivity("create", "collection_name", "item_id");

// Send Directus in-app notification (recipients from global settings)
await logs.createNotification("An error occurred");

// With custom subject
await logs.createNotification("An error occurred", "Custom Subject");

// Override recipient
await logs.createNotification("An error occurred", "Custom Subject", "user_id");

// With linked collection + item
await logs.createNotification("An error occurred", "Custom Subject", null, "collection_name", "item_id");

// Send Slack notification directly
await logs.createSlackNotification("Deploy failed on main", "CI Alert");
```

### Advanced (direct class usage)

```ts
import { SlackNotifier, DirectusNotifier } from "@serhii.mazur/directus-gu-logs";

// Use SlackNotifier standalone
const slack = new SlackNotifier(context, "my-extension");
await slack.notify("Custom message", "Alert Title", projectMeta);

// Send a raw Slack payload
await slack.send({ text: "plain fallback", blocks: [...] });

// Use DirectusNotifier standalone
const directus = new DirectusNotifier(context, "my-extension");
await directus.notify("Message", projectMeta, {
  subject: "Custom Subject",
  recipientOverride: "user-uuid",
  collection: "pages",
  item: "42",
});
```

---

## ⚙️ Constructor

### `Logs`

```ts
constructor(
  context: ApiExtensionContext,
  extension: string,
  collectionName: string = "logs"
)
```

| Param            | Type                | Default | Description                      |
| ---------------- | ------------------- | ------- | -------------------------------- |
| `context`        | ApiExtensionContext | —       | Directus extension context       |
| `extension`      | string              | —       | Name of your extension           |
| `collectionName` | string              | `logs`  | Target collection for error logs |

---

## 🧠 How It Works

### `printLogs(functionName, error, notifySlack?)`

1. Writes a structured entry to the logs collection
2. If `notifySlack` is `true` (default), sends a Slack Block Kit message with extension name, function, and error
3. Always writes to `context.logger.error` as well
4. Catches its own failure — a broken DB write won't throw

### `createActivity(action, collection, id)`

Creates a Directus activity record via `ActivityService`. User, IP, and user agent are set to `null` in extension hook context where no accountability is available.

### `createNotification(message, subject?, recipientOverride?, collection?, item?)`

Resolves recipients in this order:

1. `recipientOverride` (if provided)
2. `global.error_notice_recipient` linked users

Then sends one in-app notification per recipient. Each notification includes:

- Custom or default subject with the project name appended
- The message body
- Environment label, backend URL, and UTC timestamp

### `createSlackNotification(message, subject?)`

Sends a formatted Slack Block Kit message via `slack_webhook_url`. Silently skips if the var is not set. The payload includes project name, environment, extension name, backend URL, and the message body.

---
