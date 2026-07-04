# Smartext

![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/domhhv/smartext?utm_source=oss&utm_medium=github&utm_campaign=domhhv%2Fsmartext&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)

## A delightful text editor for your richest content.

**Write with confidence and style with precision, whether you're working on academic papers, technical documents, or creative writing.**

Smartext offers a rich text editor with optional AI-powered assistance to help you edit, format, and enhance your content at exact locations.

## Features

### Professional Writing Experience

- **Rich Text Editor**: Full-featured editor with Markdown support: formatting, headings, tables, lists, and more.
- **Advanced Styling Controls**: Go beyond Markdown with font sizes, font families, text and highlight colors, alignment, indentation, and more.
- **Split-pane Interface**: Work with your document and the AI assistant side-by-side.
- **Dark/Light Themes**: Comfortable writing in any setting.
- **Distraction-free**: Clean, modern interface that keeps you focused on your content.

### Intelligent Content Editing

- **Contextual AI Commands**: Ask the AI to edit specific paragraphs, add content at exact positions, or format selections.
- **Real-time Collaboration**: Chat with AI while maintaining full control over your document.
- **Tool-based Precision**: AI uses structured commands to make specific changes instead of redoing everything.

### Developer-friendly Architecture

- **Modern Stack**: Built with Next.js 16, Lexical editor, and Vercel AI SDK.
- **Tool Calling**: Advanced AI integration using structured commands.
- **Type-safe**: Fully implemented in TypeScript with thorough linting.
- **Performance-first**: Uses Turbopack for fast development.

## Why This Approach is Promising

### Beyond Simple AI Writing

Most AI writing tools either:

- Generate entire documents from scratch, losing your voice and style.
- Provide general suggestions that lack understanding of context.

Smartext takes a different approach:

- **Precision Editing**: Make specific changes to exact locations in your text.
- **Contextual Understanding**: AI sees your entire document for better suggestions.
- **Incremental Improvement**: Improve your existing content instead of replacing it.
- **Collaborative Workflow**: You remain in control while AI provides targeted help.

### Technical Innovation

- **Structured AI Commands**: Uses tool calling for precise, reliable text changes.
- **Real-time Streaming**: View AI responses and changes as they occur.
- **State Synchronization**: The editor and chat interface stay perfectly in sync.
- **Extensible Architecture**: Easy to add new AI capabilities and editor features.

## What's Coming Next

### Enhanced AI Capabilities

- **Multimodel Support**: Integration with Claude, Gemini, and other leading AI models.
- **Specialized Writing Modes**: Academic writing, technical documentation, and creative writing assistance.
- **Research Integration**: AI that can fact-check, add citations, and retrieve relevant information.
- **Style Consistency**: AI that learns and maintains your writing style across documents.

### Advanced Editor Features

- **Collaborative Editing**: Real-time editing with AI support for teams.
- **Version History**: Track changes with AI-powered change summaries.
- **Template System**: Smart templates that adjust to your content and industry.
- **Export Options**: Professional formatting for PDF, Word, and publishing platforms.

### Workflow Integration

- **API Access**: Programmatic access for integrating AI editing into other tools.
- **Plugin System**: Flexible architecture for custom AI commands and editor plugins.
- **Cloud Sync**: Document synchronization across devices, preserving AI context.
- **Automation**: Scheduled AI reviews, content optimization, and publication workflows.

### Enterprise Features

- **Team Workspaces**: Shared AI assistants trained on company style guides.
- **Projects**: Organize documents and AI interactions by project or client.
- **Role-based Access**: Set permissions and roles for collaborative teams.
- **Content Compliance**: AI that makes sure content meets industry standards and guidelines.
- **Analytics**: Insights into writing productivity and AI support effectiveness.
- **Custom Models**: Tailored AI models for specific industries or use cases.

## Getting Started

### Prerequisites

- Node.js 24.18.0 or higher
- npm 11.16.0 or higher
- Docker for running local Supabase instance
- Clerk development keys for local authentication

### Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/domhhv/smartext.git
   cd smartext
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment**

   ```bash
   cp .env.example .env.local
   # ENCRYPTION_SECRET can be used as is or generated with: openssl rand -hex 32
   ```

4. **Set up Clerk**

   - Create a Clerk account and set up a new application, then get your [API keys](https://dashboard.clerk.com/~/api-keys)
   - Get your development [API keys](https://dashboard.clerk.com/~/api-keys) and [domain](https://dashboard.clerk.com/~/domains).
   - Fill in the required Clerk environment variables in `.env.local`.

### Local Database Setup

The project uses Supabase for database operations.

The Supabase project configuration, seeds, and migrations live under the `supabase` directory.

To set up a local Supabase instance, run the following commands (Docker required).

1. **Start the local Supabase instance:**

   ```bash
   npm run db:start
   ```

   This command starts Supabase Docker containers based on `supabase/config.toml` and creates a local Postgres database and services.

   It should output the Studio URL, Database URL, and Project URL, among other info.

   Use the Studio URL to access the local Supabase dashboard in the browser, and the Database URL to connect to the local database directly if needed.

2. **Retrieve API URL and anon key:**

   Run the following command to retrieve the API URL and anon key for the local Supabase instance:

   ```bash
   npm run db:status
   ```

   Alternatively, use the following to get variables in env format:

   ```bash
   npm run db:status -- -o env
   ```

   These commands output the environment variables needed to connect to the local Supabase instance, including `API_URL` and `PUBLISHABLE_KEY`.

3. **Environment variables**

   Add the following environment variables to your `.env.local` file (using the values from the step above):

   ```env
   NEXT_PUBLIC_SUPABASE_URL=<API URL>
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<PUBLISHABLE_KEY>
   ```

4. **Apply migrations and seed the database:**

   ```bash
   npm run db:reset
   ```

   This command resets the local database to a clean state, applies migrations from `supabase/migrations`, and seeds the db with essential initial data based on `supabase/seed.sql`.

### Start the development server

1. **Finally, run the app locally:**

   ```bash
   npm run dev
   ```

2. **Open the application**

   Navigate to [http://localhost:3000](http://localhost:3000)

## Development

### Essential Commands

```bash
npm run dev             # Start development server with Turbopack
npm run build           # Build for production
npm run typecheck       # TypeScript checking
npm run eslint:check    # Code linting
npm run eslint:fix      # Auto-fix linting issues
npm run prettier:check  # Code formatting check
npm run prettier:write  # Auto-format code
npm run db:start        # Start local Supabase instance
npm run db:stop         # Stop local Supabase instance
npm run db:reset        # Reset local database
npm run db:gen-types    # Regenerate Supabase types
```

**Important**: Always run `npm run typecheck`, `npm run eslint:check`, and `npm run prettier:check` after making changes. These are part of the prebuild process and must pass for production builds.

### Architecture Overview

- **Frontend**: Next.js 16 with App Router and Turbopack.
- **Editor**: Lexical 0.35.0 (Facebook's rich text editor framework).
- **AI Integration**: Vercel AI SDK with GPT and Claude models and tool calling.
- **Styling**: Tailwind CSS v4 with OKLCH color system.
- **UI Components**: Radix UI primitives with shadcn/ui (New York style).

### Key Features

- **Tool Calling**: AI uses structured commands to manipulate text precisely.
- **Real-time Streaming**: Live updates during AI processing.
- **State Management**: Synchronized editor and chat state via React Context.
- **Theme Support**: Complete dark/light mode implementation with next-themes.

## Contributing

Contributions are welcome! This project showcases cutting-edge AI integration patterns and modern React architecture. If you're interested in AI, editor technology, or user experience, there are opportunities to contribute.

### Areas for Contribution

- **AI Commands**: New tool calling capabilities for text manipulation.
- **Editor Plugins**: Enhanced rich text editing features.
- **UI/UX**: Interface improvements and accessibility enhancements.
- **Performance**: Optimization and caching improvements.
- **Documentation**: Guides and examples for developers.

### Development Guidelines

- **Code Quality**: All PRs must pass TypeScript checking, ESLint, and Prettier.
- **Commit Messages**: Follow the conventional commit format (enforced by commitlint).
- **Testing**: Ensure changes work in both light and dark themes.
- **Documentation**: Update relevant documentation for new features.

## License

MIT License – see [LICENSE](https://github.com/domhhv/smartext/blob/main/LICENSE.md) file for details.

## Issues

Found a bug or have a feature request? Please [open an issue](https://github.com/domhhv/smartext/issues).
