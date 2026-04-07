# 📦 Custom Directus Logs Utility

A lightweight utility class for logging errors, creating activity logs, and sending notifications in Directus extensions.

## 📋 Requirements:

### 1. Logs Collection (logs)

You need to create a collection named `logs` with the following fields:

| Field Name      | Type      | Description                  |
| --------------- | --------- | ---------------------------- |
| `collection`    | string    | Name of the collection       |
| `date_created`  | datetime  | Timestamp of the log         |
| `extension`     | string    | Extension identifier         |
| `function_name` | string    | Name of the function         |
| `error`         | text/code | Error message or stack trace |

### 2. Global Collection (global)

Add the following field to the `global` collection:

| Field Name               | Type                            | Description                        |
| ------------------------ | ------------------------------- | ---------------------------------- |
| `error_notice_recipient` | m2m → directus_users (junction) | Recipients for error notifications |

All linked users from this field will receive internal notifications when errors occur.

## 🚀 Features

- Save structured error logs to a collection
- Create Directus activity records
- Send internal Directus notifications
- Automatic recipient resolution from global settings
- Support for manual recipient override
- Includes project metadata in notifications (environment, URL, timestamp)

## 📦 Installation

```bash
npm i @serhii.mazur/directus-gu-logs
```

## 🧩 Usage

```ts
import { Logs } from "@serhii.mazur/directus-gu-logs";

const logs = new Logs(context, "my-extension");

// Save error log
await logs.printLogs("myFunction", "Something went wrong");

// Create activity record
await logs.createActivity("create", "collection_name", "item_id");

// Send notification (auto recipients from global settings)
await logs.createNotification("An error occurred");

// Send notification with custom subject
await logs.createNotification("An error occurred", "Custom Subject");

// Send notification to specific recipient
await logs.createNotification("An error occurred", "Custom Subject", "user_id");

// Send notification with related collection + item
await logs.createNotification("An error occurred", "Custom Subject", null, "collection_name", "item_id");
```

---

## ⚙️ Constructor

```ts
constructor(
  context: ApiExtensionContext,
  extension: string,
  collectionName: string = "logs"
)
```

| Param            | Type                | Description                          |
| ---------------- | ------------------- | ------------------------------------ |
| `context`        | ApiExtensionContext | Directus extension context           |
| `extension`      | string              | Name of your extension               |
| `collectionName` | string (optional)   | Logs collection name (default: logs) |

## 🧠 How It Works

### Logging

- Saves structured logs into the logs collection
- Automatically attaches timestamp and extension name
- Fallback to console if DB write fails

---

### Activity Tracking

- Uses Directus ActivityService
- Automatically includes:
    - user
    - IP address
    - user agent
    - origin

---

### Notifications

- Resolves recipients in this order:
    1. Explicit recipientOverride
    2. global.notice_recipient
    3. global.developer_notice_recipient
- Automatically:
    - Deduplicates recipients
    - Includes project metadata:
        - Project name
        - Backend URL
        - Environment (branch)
        - UTC timestamp
- Sends one notification per recipient
