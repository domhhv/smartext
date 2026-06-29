# Contributing to Smartext

Thank you for your interest in contributing to Smartext! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## Getting Started

### Prerequisites

- Node.js 24.18.0 or higher
- npm 11.16.0 or higher

### Development Setup

1. Fork and clone the repository

   ```bash
   git clone https://github.com/domhhv/smartext.git
   cd smartext
   ```

2. Install dependencies

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

5. Start the development server

   ```bash
   npm run dev
   ```

## Development Workflow

### Branch Naming

Use descriptive branch names with prefixes:

- `feat/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions or updates
- `chore/` - Build process or tooling changes

Example: `feat/add-table-support` or `fix/editor-cursor-position`.

Full list of conventional commit types can be found [here](https://www.conventionalcommits.org/).

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/). Commits are automatically linted via Husky.

Format: `<type>(<scope>): <subject>`

Types:

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Code style/formatting
- `refactor` - Code refactoring
- `test` - Tests
- `chore` - Build/tooling

Examples:

```text
feat(editor): add table insertion command
fix(chat): resolve streaming message duplication
docs(readme): update installation instructions
```

Scope and type should always be lowercase, while the subject may contain pascal and camel case for proper nouns (e.g., variables, function names).

### Code Quality

All code must pass quality checks before merging:

```bash
npm run typecheck      # TypeScript type checking
npm run eslint:check   # Linting
npm run prettier:check # Code formatting
```

Pre-commit hooks will automatically run these checks via Husky and lint-staged.

Auto-fix issues:

```bash
npm run eslint:fix     # Fix linting issues
npm run prettier:write # Format code
```

## Code Style Guidelines

### General Principles

- Use TypeScript for all code
- Prefer function declarations over arrow functions for components
- Prefer inferred types over explicit annotations
- Prefer default exports for React components, hooks, and whenever a module exports a single entity
- Use `@/*` path aliases for imports
- Use lowercase with hyphens for file/directory names

### Component Guidelines

```typescript
// Good - function declaration and default export
export default function MyComponent() {
  return <div>Content</div>;
}

// Avoid - arrow function and named export
export const MyComponent = () => {
  return <div>Content</div>;
};
```

### Import Organization

Imports are automatically sorted by ESLint:

1. Built-in Node modules
2. External packages
3. Internal modules
4. Parent directory imports
5. Sibling/index imports

### Component Location

- shadcn/ui primitives → `src/components/ui/`
- Custom components → `src/components/ui/custom/`
- Feature-specific components → `src/components/[feature]/`

### Type Inference

Prefer inferred types over explicit annotations:

```typescript
// Good
const count = 5;
const items = ['a', 'b', 'c'];

// Avoid unless necessary
const count: number = 5;
const items: string[] = ['a', 'b', 'c'];
```

## Making Changes

### Adding Features

1. Create a new branch from `main`
2. Implement the feature with tests if applicable
3. Update documentation (README, CLAUDE.md if architecture changes)
4. Ensure all quality checks pass
5. Submit a pull request

### Fixing Bugs

1. Create an issue describing the bug if one doesn't exist
2. Reference the issue in your branch name: `fix/123-description`
3. Include test cases that verify the fix
4. Submit a pull request referencing the issue

### Pull Request Process

1. Update README.md if you're adding user-facing features
2. Update CLAUDE.md if you're changing architecture or adding significant technical patterns
3. Ensure CI checks pass (code health, commit lint)
4. Request review from maintainers
5. Address review feedback
6. Once approved, maintainers will merge your PR

## Project Architecture

### Key Directories

```text
src/
├── app/           # Next.js App Router
├── components/    # React components
│   ├── chat/      # Chat interface
│   ├── editor/    # Lexical editor
|   ├── providers/ # Context providers
│   └── ui/        # UI primitives
│   └── custom/    # Custom UI components
└── lib/
    ├── constants/ # Configuration constants
    ├── hooks/     # Custom React hooks
    ├── models/    # TypeScript models
    └── utils/     # Utility functions
    └── styles/    # SCSS files
```

### Adding AI Commands

AI commands are defined in `src/lib/models/editor-commands.ts`:

1. Define the command schema using Zod
2. Add the tool to the tools array
3. Implement execution logic in `src/lib/utils/editor-commands.ts`
4. Add UI triggers if needed in toolbar/chat

### Adding Editor Features

1. Create Lexical plugin in `src/components/editor/plugins/`
2. Register plugin in `src/components/editor/editor.tsx`
3. Add toolbar controls if needed
4. Update command execution if AI should interact with feature

## Testing

Currently, the project focuses on manual testing. When adding features:

1. Test in both light and dark themes
2. Test with various document sizes
3. Test AI command execution
4. Verify responsive behavior

Future: We plan to add automated testing (Vitest, Cypress).

## Documentation

### Code Documentation

- Update CLAUDE.md for architectural changes

### User Documentation

- Update README.md for user-facing features
- Include examples where helpful
- Keep installation/setup instructions current

## Getting Help

- Open an issue for bugs or feature requests
- Check existing issues before creating new ones
- Tag issues appropriately (bug, enhancement, documentation, etc.)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing to Smartext!
