# Smartext

![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/domhhv/smartext?utm_source=oss&utm_medium=github&utm_campaign=domhhv%2Fsmartext&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)

**An AI-powered rich text editor that transforms how you write and edit content.**

Smartext merges a high-quality rich text editor with OpenAI's GPT and Anthropic's Claude models to offer intelligent writing help. Unlike standard AI writing tools that produce full documents, this app emphasizes clear, contextual editing within your current content.

**[Try it live at smartext.app](https://smartext.app)**

## Features

### Intelligent Content Editing

- **Contextual AI Commands**: Ask the AI to edit specific paragraphs, add content at exact positions, or format selections.
- **Real-time Collaboration**: Chat with AI while maintaining full control over your document.
- **Tool-based Precision**: AI uses structured commands to make specific changes instead of redoing everything.

### Professional Writing Experience

- **Rich Text Editor**: Full-featured editor with markdown support, tables, lists, and formatting.
- **Split-pane Interface**: Work with your document and the AI assistant side-by-side.
- **Dark/Light Themes**: Comfortable writing in any setting.
- **Distraction-free**: Clean, modern interface that keeps you focused on your content.

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

- **Multi-model Support**: Integration with Claude, Gemini, and other leading AI models.
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

## Quick Start

### Prerequisites

- Node.js 24.18.0 or higher
- npm 11.16.0 or higher
- Supabase CLI
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
   # Fill in required environment variables in .env.local
   ```

4. **Boot local Supabase instance**

   [Install Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started?queryGroups=platform&platform=macos), open Docker Desktop, and run:

   ```bash
   supabase start
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

6. **Open the application**

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
- **Commit Messages**: Follow conventional commit format (enforced by commitlint).
- **Testing**: Ensure changes work in both light and dark themes.
- **Documentation**: Update relevant documentation for new features.

## License

MIT License - see [LICENSE](https://github.com/domhhv/smartext/blob/main/LICENSE.md) file for details.

## Issues

Found a bug or have a feature request? Please [open an issue](https://github.com/domhhv/smartext/issues).

---

**Smartext represents the future of AI-powered writing tools: intelligent, precise, and designed to enhance rather than replace human creativity.**

Visit [smartext.app](https://smartext.app) to experience it yourself.
