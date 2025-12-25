---
lang: en
title: Contributing Guide
title-en: Contributing Guide
title-ja: コントリビューティングガイド
related:
    - ./README.md "Project Overview"
    - ./DEVELOPMENT.md "Development Guide"
    - ./DOCUMENTATION.md "Documentation Standards"
    - ./RELEASE.md "Release Guide"
instructions-for-ais:
    - This document should be written in English for AI readability.
    - Content within code fences may be written in languages other than English.
    - Prohibit updating this front-matter.
    - Prohibit updating title line (1st line) in this document.
---

# Contributing Guide

This document provides contribution guidelines for this project.

**Package Distribution:** This package is published to [GitHub Packages](https://github.com/F88/promidas/packages) (`@f88/promidas`).

For development environment setup and daily development workflow, see [DEVELOPMENT.md](./DEVELOPMENT.md).

For documentation standards and guidelines, see [DOCUMENTATION.md](./DOCUMENTATION.md).

For release procedures (maintainers only), see [RELEASE.md](./RELEASE.md).

## How to Contribute

We welcome contributions! Here's how to get started:

### Finding Contribution Opportunities

- **Good First Issues**: Look for `good-first-issue` label on GitHub Issues
- **Documentation**: Improvements to README, guides, or examples
- **Bug Fixes**: Check `bug` labeled issues
- **Feature Requests**: See `enhancement` labeled issues
- **Test Coverage**: Add tests for existing functionality

### Before You Start

1. **Check existing issues** - Avoid duplicate work by searching existing issues and pull requests
2. **Discuss major changes** - Open an issue first for significant features or architectural changes
3. **Read documentation** - See [DEVELOPMENT.md](./DEVELOPMENT.md) for environment setup and workflow

### Getting Help

- **GitHub Issues**: For bug reports, feature requests, and technical questions
- **Pull Request Discussions**: For questions about specific code changes
- **Language**: English or Japanese are both welcome

## Git Workflow

### 1. Fork the Repository

Click "Fork" on GitHub or use GitHub CLI:

```bash
gh repo fork F88/promidas --clone
```

### 2. Create a Branch

```bash
git checkout -b feature/my-feature
# or
git checkout -b fix/my-bugfix
```

**Branch Naming Conventions:**

- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates
- `refactor/*` - Code refactoring
- `test/*` - Test additions or improvements
- `perf/*` - Performance improvements

### 3. Make Your Changes

- Follow existing code style (ESLint and Prettier will help)
- Add tests for new functionality
- Update documentation as needed
- Keep commits focused and atomic (one logical change per commit)

### 4. Commit Your Changes

Use Conventional Commits format (see below for details):

```bash
git add .
git commit -m "feat(store): add caching strategy"
```

### 5. Push and Create Pull Request

```bash
git push origin feature/my-feature
```

Then create a Pull Request on GitHub.

### Keeping Your Fork Updated

To sync your fork with the upstream repository:

```bash
# Add upstream remote (first time only)
git remote add upstream https://github.com/F88/promidas.git

# Fetch and rebase
git fetch upstream
git rebase upstream/main
```

## Pull Request Guidelines

### Commit Messages

Follow the Conventional Commits format:

```text
<type>(<scope>): <subject>

<body>

<footer>
```

**Type:**

- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (formatting, etc.)
- `refactor`: Code changes that neither fix a bug nor add a feature
- `perf`: Performance improvements
- `test`: Adding or correcting tests
- `build`: Changes to the build system or external dependencies
- `ci`: Changes to CI configuration files and scripts
- `chore`: Other changes (releases, etc.)

**Breaking Change:**

For breaking changes, add `!` after the type or include `BREAKING CHANGE:` in the footer:

```text
feat(api)!: remove deprecated endpoints

BREAKING CHANGE: All v1 API endpoints have been removed.
```

### Pre-PR Checklist

```text
- [ ] All tests pass (`npm test`)
- [ ] Exports tests pass (`npm run test:exports`)
- [ ] Performance tests pass (`npm run test:perf`)
- [ ] Linter passes (`npm run lint`)
- [ ] Formatting passes (`npm run format:check`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Commit messages follow Conventional Commits format
```

## Pull Request Process

### PR Title

Follow Conventional Commits format:

```text
feat(store): add new caching strategy
fix(fetcher): handle network timeout correctly
docs: update installation guide
```

### PR Description Template

Provide a clear description of your changes:

```markdown
## Description

Brief description of what this PR does and why.

## Type of Change

- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to change)
- [ ] Documentation update

## Related Issues

Fixes #123
Related to #456

## Testing

- [ ] Added new tests
- [ ] All existing tests pass
- [ ] Manual testing performed

## Documentation

- [ ] Updated relevant documentation
- [ ] Added JSDoc comments for new code
```

### Review Process

1. **Automated Checks**: All CI checks must pass
2. **Maintainer Review**: Typically responds within 2-3 business days
3. **Address Feedback**: Update your PR based on review comments
4. **Approval**: Once approved, maintainers will merge your PR

### Handling CI Failures

If CI checks fail:

1. Review the error messages in the CI logs
2. Run the same checks locally (see Pre-PR Checklist)
3. Fix the issues and push new commits
4. CI will automatically re-run on the updated PR

### After Your PR is Merged

Your contribution will be included in the next release and credited in the CHANGELOG.md.

## Code Review Guidelines

### For Contributors

- **Be responsive**: Address feedback promptly and professionally
- **Be receptive**: Accept constructive criticism gracefully
- **Ask questions**: If feedback is unclear, ask for clarification
- **Keep discussions focused**: Stay on topic and relevant to the PR

### For Reviewers

- **Be respectful**: Assume good intentions and be kind
- **Be specific**: Explain why, not just what needs to change
- **Be helpful**: Suggest alternatives or improvements
- **Be timely**: Provide feedback in a reasonable timeframe

### Review Criteria

- Code follows project conventions and style guide
- Tests adequately cover new functionality
- Documentation is clear and up-to-date
- No unnecessary breaking changes
- Performance impact is acceptable
- Security considerations are addressed

## Reporting Issues

### Bug Reports

When reporting a bug, include:

- **Clear description**: What happened vs. what you expected
- **Reproduction steps**: Minimal code to reproduce the issue
- **Environment**: Node.js version, OS, package version
- **Error logs**: Complete error messages and stack traces
- **Additional context**: Screenshots, related issues, etc.

### Feature Requests

When requesting a feature, include:

- **Use case**: Why is this feature needed? What problem does it solve?
- **Proposed solution**: How would you like it to work?
- **Alternatives**: Other solutions you've considered
- **Additional context**: Examples from other libraries, mockups, etc.

### Security Issues

**DO NOT** open public issues for security vulnerabilities.

For security concerns:

1. Review [docs/security.md](docs/security.md) for security guidelines
2. Report vulnerabilities privately through GitHub Security Advisories
3. Include detailed reproduction steps and impact assessment
4. Allow reasonable time for the maintainers to address the issue before public disclosure

## References

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
