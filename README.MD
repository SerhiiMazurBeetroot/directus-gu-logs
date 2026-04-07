# 📦 Custom Directus Logs Utility

A lightweight utility class for logging errors, creating activity logs, and sending notifications in Directus extensions.

## 📋 Requirements:

### 1. Logs Collection (logs)

You need to create a collection named `logs` with the following fields:

| Field Name      | Type     | Description              |
| --------------- | -------- | ------------------------ |
| `collection`    | string   | Name of the collection   |
| `date_created`  | datetime | Timestamp of the log     |
| `extension`     | string   | Extension identifier     |
| `function_name` | string   | Name of the function     |
| `error`         | code     | Error message/code block |

### 2. Global Collection (global)

Add the following field to the `global` collection:

| Field Name                   | Type                            | Description                               |
| ---------------------------- | ------------------------------- | ----------------------------------------- |
| `notice_recipient`           | m2m → directus_users (junction) | Primary recipients for error notifications |
| `developer_notice_recipient` | m2m → directus_users (junction) | Additional developer recipients            |

All linked users from these fields will receive internal notifications when errors occur.

## 🚀 Features

-   Save error logs to the logs collection

-   Create Directus activity records

-   Send internal Directus notifications

## 📦 Installation

```bash
npm i @serhii.mazur/directus-gu-logs
```

## 🧩 Usage

```ts
import { Logs } from "@serhii.mazur/directus-gu-logs";

const logs = new Logs(context, "my-extension", "logs");

await logs.printLogs("myFunction", "message");
await logs.createActivity("create", "collection", "id");
await logs.createNotification("An error occurred");
await logs.createNotification("An error occurred", "Custom subject", "recipient_id");
```
