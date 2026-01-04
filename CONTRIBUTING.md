# Contributing to Mirror Mate

Thank you for your interest in contributing to Mirror Mate! This document provides guidelines for contributing.

## Code of Conduct

Please be respectful and constructive in all interactions.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue using the **Bug Report** template. Include:

- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (OS, browser, Node.js version)

### Feature Requests

Have an idea? Create an issue using the **Feature Request** template. Describe:

- The problem you're trying to solve
- Your proposed solution
- Any alternatives you've considered

### Questions

For questions about usage or development, create an issue using the **Question** template.

## Development Setup

### Prerequisites

- Node.js 22+
- npm
- Docker (optional, for VOICEVOX)

### Local Development

```bash
# Clone the repository
git clone https://github.com/orangekame3/mirrormate.git
cd mirrormate

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

### Docker Development

```bash
# Start with Docker Compose
docker compose up -d
```

## Coding Guidelines

### Code Style

- Use TypeScript for all new code
- Follow existing code patterns
- Use meaningful variable and function names

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: fix a bug
docs: update documentation
style: formatting changes
refactor: code refactoring
test: add or update tests
chore: maintenance tasks
```

### Testing

Run tests before submitting changes:

```bash
# Run tests once
npm run test

# Run tests in watch mode during development
npm run test:watch
```

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Make your changes
4. Run lint check (`npm run lint`)
5. Run tests (`npm run test`)
6. Run build (`npm run build`)
7. Commit your changes
8. Push to your fork
9. Open a Pull Request

## Project Structure

```
mirrormate/
├── config/           # YAML configuration files
├── docs/             # Documentation
├── messages/         # i18n translation files
├── plugins/          # Local plugins
├── public/           # Static assets
└── src/
    ├── app/          # Next.js pages and API routes
    ├── components/   # React components
    ├── hooks/        # Custom React hooks
    ├── i18n/         # Internationalization setup
    └── lib/          # Core libraries
        ├── app/      # App configuration
        ├── character/# Character/AI personality
        ├── features/ # Backend features (weather, calendar)
        ├── plugins/  # Plugin system
        ├── providers/# LLM and TTS providers
        └── rules/    # Rule engine
```

## Creating Plugins

See [Plugin Documentation](docs/plugins.md) for details on creating custom plugins.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
