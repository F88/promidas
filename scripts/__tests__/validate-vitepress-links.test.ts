import fs from 'node:fs';
import path from 'node:path';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  slugify,
  extractHeadings,
  validateAnchor,
  validateExternalLink,
  validateAbsoluteLink,
  validateRelativeLink,
  isPathSafe,
} from '../validate-vitepress-links.js';

// Upgrade: Mocking fs and path if we want deep integration tests,
// but for now testing logic functions is high value.

describe('validate-vitepress-links', () => {
  describe('slugify', () => {
    it('should slugify basic text', () => {
      expect(slugify('Hello World')).toBe('hello-world');
      expect(slugify('Foo  Bar')).toBe('foo-bar');
    });

    it('should handle Japanese characters', () => {
      expect(slugify('データ構造を見てみよう')).toBe('データ構造を見てみよう');
    });

    it('should keep emojis', () => {
      expect(slugify('🔧 Tool')).toBe('🔧-tool');
    });

    it('should handle Unicode normalization (NFC)', () => {
      // "モジュール" in NFC
      const nfc = 'モジュール';
      // "モジュール" in NFD (if possible to construct manually for test)
      // Just verifying it doesn't break known chars
      expect(slugify(nfc)).toBe(nfc);
    });

    it('should remove punctuation', () => {
      expect(slugify('Hello, World!')).toBe('hello-world');
      expect(slugify('Foo.Bar?')).toBe('foobar'); // dot removed? check impl
    });
  });

  describe('extractHeadings', () => {
    it('should extract regular headings', () => {
      const content = `
# Title
## Subtitle
Some text
### Section
`;
      const slugs = extractHeadings(content);
      expect(slugs).toEqual(['title', 'subtitle', 'section']);
    });

    it('should extract custom IDs from VitePress headings', () => {
      const content = `
### My Heading {#custom-id}
## Another One {#foo-bar}
# Normal
`;
      const slugs = extractHeadings(content);
      expect(slugs).toEqual(['custom-id', 'foo-bar', 'normal']);
    });

    it('should ignore code blocks', () => {
      const content = `
# Real Heading
\`\`\`
# Fake Heading in Code
\`\`\`
## Another Real
`;
      const slugs = extractHeadings(content);
      expect(slugs).toEqual(['real-heading', 'another-real']);
    });
  });

  describe('validateAnchor', () => {
    // We need to mock fs for validateAnchor as it reads files
    // mocking extractHeadings result via fs read or specialized mock could work
    // Ideally we refactor validateAnchor to take content/headings directly, but let's mock fs.

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('should detect normalization mismatch', () => {
      // Setup
      const resolvedTarget = '/docs/foo.md';
      const targetFile = 'foo.md';
      const currentFile = '/docs/index.md';
      const relativePath = 'index.md';
      const link = '[Link](#foo)';

      // Mock fs
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'statSync').mockReturnValue({
        isDirectory: () => false,
      } as any);
      vi.spyOn(path, 'extname').mockReturnValue('.md');

      // Allow us to simulate NFD in file content vs NFC in anchor
      const nfdAnchor = 'ト\u3099'; // NFD "ド"
      const nfcAnchor = 'ド'; // NFC "ド"

      // anchor passed to function is NFC (from markdown link usually)
      const anchor = nfcAnchor;

      // File content has NFD heading
      vi.spyOn(fs, 'readFileSync').mockReturnValue(`# ${nfdAnchor}`);

      // Mock console.error to verify warning
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = validateAnchor(
        resolvedTarget,
        targetFile,
        currentFile,
        anchor,
        relativePath,
        link,
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Normalization Mismatch'),
      );
      expect(result).toBe(true); // invalid because strict match failed (it returns error=true)
    });
  });

  describe('validateExternalLink', () => {
    it('should ignore non-repository links', () => {
      const result = validateExternalLink(
        'https://google.com',
        'foo.md',
        '[Link](https://google.com)',
      );
      expect(result).toBe(false);
    });

    it('should ignore repository root/issues/discussions', () => {
      const repo = 'https://github.com/F88/promidas';
      expect(validateExternalLink(repo, 'foo.md', `[Repo](${repo})`)).toBe(
        false,
      );
      expect(
        validateExternalLink(
          `${repo}/issues`,
          'foo.md',
          `[Issues](${repo}/issues)`,
        ),
      ).toBe(false);
    });

    it('should validate repository file links (success)', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      const repo = 'https://github.com/F88/promidas';
      const result = validateExternalLink(
        `${repo}/blob/main/README.md`,
        'docs/intro.md',
        '[Readme]',
      );
      expect(result).toBe(false); // false means no error
    });

    it('should validate repository file links (fail)', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const repo = 'https://github.com/F88/promidas';

      const result = validateExternalLink(
        `${repo}/blob/main/MISSING.md`,
        'docs/intro.md',
        '[Missing]',
      );

      expect(result).toBe(true); // true means error found
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Broken GitHub Link'),
      );
    });

    it('should NOT ignore repository files with "issues" in the name', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false); // File missing
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const repo = 'https://github.com/F88/promidas';

      // matches /issues so currently skipped (false), but should be validated -> missing -> true
      const result = validateExternalLink(
        `${repo}/blob/main/docs/issues.md`,
        'docs/intro.md',
        '[Issues Guide]',
      );

      expect(result).toBe(true); // Should be error (true) because file missing
    });
  });

  describe('validateAbsoluteLink', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('should validate existing absolute file', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'statSync').mockReturnValue({
        isDirectory: () => false,
      } as any);
      // Now returns the path, not false (error)
      const result = validateAbsoluteLink(
        '/guide.md',
        'docs/intro.md',
        '[Guide](/guide.md)',
      );
      expect(result).toContain('/guide.md'); // Should return resolved path
    });

    it('should validate existing absolute file without extension', () => {
      // First check (exact) fails, second check (+.md) succeeds
      vi.spyOn(fs, 'existsSync')
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      const result = validateAbsoluteLink(
        '/guide',
        'docs/intro.md',
        '[Guide](/guide)',
      );
      expect(result).toContain('/guide.md');
    });

    it('should report missing absolute file', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = validateAbsoluteLink(
        '/missing',
        'docs/intro.md',
        '[Missing](/missing)',
      );

      expect(result).toBeNull(); // null means error
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Broken Absolute Link'),
      );
    });

    it('should validate absolute directory with index.md', () => {
      // Exists? Yes. Is Dir? Yes. index.md exists? Yes.
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'statSync').mockReturnValue({
        isDirectory: () => true,
      } as any);

      const result = validateAbsoluteLink(
        '/guide',
        'docs/intro.md',
        '[Guide](/guide)',
      );
      expect(result).toContain('/guide');
    });
  });

  describe('validateRelativeLink', () => {
    const validDir = path.join(process.cwd(), 'docs');

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('should validate existing relative file', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'statSync').mockReturnValue({
        isDirectory: () => false,
      } as any);

      const result = validateRelativeLink(
        validDir,
        './other.md',
        'docs/intro.md',
        '[Other](./other.md)',
      );

      expect(result).not.toBeNull();
    });

    it('should validate existing relative directory with index.md', () => {
      // First check: directory exists
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'statSync').mockReturnValue({
        isDirectory: () => true,
      } as any);
      // Second check: index.md exists
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);

      const result = validateRelativeLink(
        validDir,
        './subdir',
        'docs/intro.md',
        '[Subdir](./subdir)',
      );
      expect(result).not.toBeNull();
    });

    it('should fail if directory has no index.md', () => {
      // Directory exists
      vi.spyOn(fs, 'existsSync').mockReturnValueOnce(true);
      vi.spyOn(fs, 'statSync').mockReturnValue({
        isDirectory: () => true,
      } as any);
      // index.md missing
      vi.spyOn(fs, 'existsSync').mockReturnValueOnce(false);

      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = validateRelativeLink(
        validDir,
        './empty-dir',
        'docs/intro.md',
        '[Empty](./empty-dir)',
      );

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Broken Directory Link'),
      );
    });

    it('should support extension-less links if .md exists', () => {
      // Direct exists? No
      vi.spyOn(fs, 'existsSync').mockReturnValueOnce(false);
      // + .md exists? Yes
      vi.spyOn(fs, 'existsSync').mockReturnValueOnce(true);

      const result = validateRelativeLink(
        validDir,
        './foo',
        'docs/intro.md',
        '[Foo](./foo)',
      );

      expect(result).toContain('.md');
    });

    it('should fail for totally missing target', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = validateRelativeLink(
        validDir,
        './missing',
        'docs/intro.md',
        '[Missing](./missing)',
      );

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Broken Relative Link'),
      );
    });
  });

  describe('Security Checks', () => {
    const validDir = path.join(process.cwd(), 'docs');

    it('should block directory traversal', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = validateRelativeLink(
        validDir,
        '../../../../etc/passwd',
        'docs/intro.md',
        '[Unsafe](../../../../etc/passwd)',
      );

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Link target escapes project root'),
      );
    });
  });

  describe('isPathSafe', () => {
    const root = process.cwd();

    it('should return true for paths inside project', () => {
      expect(isPathSafe(path.join(root, 'docs/index.md'))).toBe(true);
      expect(isPathSafe(path.join(root, 'README.md'))).toBe(true);
    });

    it('should return false for paths outside project', () => {
      expect(isPathSafe(path.join(root, '../outside.txt'))).toBe(false);
      expect(isPathSafe('/etc/passwd')).toBe(false);
    });

    it('should handle traversal attempts in logic', () => {
      // isPathSafe takes resolved paths, but if we pass something that resolves outside
      expect(isPathSafe(path.resolve(root, '../../etc/passwd'))).toBe(false);
    });
  });
});
