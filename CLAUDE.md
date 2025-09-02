# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Setup
- `npm run setup` - Install dependencies, generate Prisma client, and run database migrations
- `npm install` - Install dependencies only
- `npx prisma generate` - Generate Prisma client after schema changes
- `npx prisma migrate dev` - Create and apply database migrations

### Development
- `npm run dev` - Start development server with Turbopack (http://localhost:3000)
- `npm run dev:daemon` - Start dev server in background, logs to logs.txt
- `npm run build` - Build for production
- `npm start` - Start production server

### Testing and Quality
- `npm test` - Run Vitest tests
- `npm run lint` - Run ESLint
- `npx prisma migrate reset --force` - Reset database completely

## Architecture Overview

UIGen is an AI-powered React component generator built with Next.js 15 and React 19. The application allows users to describe components in natural language and generates them using Claude AI with live preview capabilities.

### Core Architecture

**Virtual File System**: Components are generated in a virtual file system (`src/lib/file-system.ts`) that doesn't write to disk. This provides isolation and allows real-time preview without filesystem operations.

**AI Integration**: Uses Anthropic's Claude via Vercel AI SDK with custom tools:
- `str_replace_editor` - Edit file contents with find/replace operations
- `file_manager` - Create, delete, and manage files in the virtual filesystem

**Database Layer**: SQLite with Prisma ORM. Projects store serialized chat messages and virtual filesystem state. Anonymous users can create projects that are saved temporarily.

### Key Components

**Chat System** (`src/lib/contexts/chat-context.tsx`): Manages conversation state with AI, sends virtual filesystem state with each request.

**Code Editor** (`src/components/editor/`): Monaco Editor integration with file tree navigation and syntax highlighting.

**Preview System** (`src/components/preview/PreviewFrame.tsx`): Real-time preview of generated components using iframe sandboxing.

**Authentication** (`src/lib/auth.ts`): JWT-based auth with bcrypt password hashing. Supports anonymous users with session tracking.

### File Organization

- `src/actions/` - Server actions for project CRUD operations
- `src/app/api/chat/route.ts` - Main AI chat endpoint with tool integration
- `src/lib/tools/` - AI tool implementations for file operations
- `src/lib/transform/` - JSX transformation utilities for component generation
- `src/components/` - UI components organized by feature (auth, chat, editor, preview)

### Environment Configuration

The app works with or without `ANTHROPIC_API_KEY`. Without the API key, it returns static code instead of AI-generated components.

### Database Schema

- `User`: Basic auth with email/password
- `Project`: Stores chat history as JSON and virtual filesystem state
- Projects can be anonymous (userId null) or linked to authenticated users

### Testing

Uses Vitest with jsdom environment. Tests are co-located with components in `__tests__/` directories.
- The database schema is defined in the @prisma/schema.prisma file. Reference it anytime you need to understand the structure of data stored in the database.