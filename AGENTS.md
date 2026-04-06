# Repository Guidelines

## Project Structure & Module Organization
This is a hybrid repository containing a multi-language static website (Arabic and English) and a Node.js-based backend API.
- **Root**: Contains the primary entrance (`index.html`) and global configuration (`vercel.json`).
- **ar/ & en/**: Localized static content for Arabic and English versions.
- **backend/**: Express.js API server located in a subdirectory. It manages account requests, contact messages, and site settings using a local SQLite database (`backend/data/musharaka.db`).
- **admin/**: A static administration panel that communicates with the backend API.
- **open-account/**: A specialized frontend module for the account opening process, including advanced KYC and face verification logic (`face-verification.js`, `kyc-advanced.js`).
- **wp-content/ & wp-json/**: Assets and API data exported from a WordPress source.

## Build, Test, and Development Commands
Commands are primarily defined within the `backend/` directory:
- **Start Backend**: `cd backend && npm start`
- **Development Mode**: `cd backend && npm run dev` (uses `nodemon`)

The project is configured for deployment on **Vercel**, with root rewrites pointing to the Arabic version (`/ar/index.html`) by default.

## Coding Style & Naming Conventions
- **JavaScript**: Uses `'use strict';` and standard Node.js/Express patterns. Backend follows a service/database abstraction layer using a custom wrapper for `sqlite3` to provide a Promise-based API.
- **Naming**: Directory and file names for localized content often use Arabic characters (e.g., `الاسئلة-الشائعة/`). Use absolute paths when navigating through the `backend/` module.
- **Frontend**: Predominantly static HTML with embedded or linked JavaScript.

## Testing Guidelines
There is no automated test suite currently configured. Manual testing should be performed by verifying the API health endpoint:
- **Health Check**: `GET /api/health`

## Commit & Pull Request Guidelines
Commit messages should follow a concise, action-oriented format (e.g., "Update account opening links", "Reorganize files"). Recent history shows a pattern of reorganization and direct fixes to layout and routing.
