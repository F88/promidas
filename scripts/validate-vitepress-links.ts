/**
 * @file validate-vitepress-links.ts
 * @description
 * Validates links in the VitePress documentation files (under `docs/` directory).
 *
 * This script checks:
 * 1. Internal relative links (e.g., `[Link](./foo.md)`) - verifies file existence.
 * 2. Internal absolute links (VitePress style, e.g., `[Link](/foo.md)`) - verifies file existence.
 * 3. Anchor links (e.g., `[Link](#anchor)`) - verifies the anchor exists in the target file.
 *    - Supports Japanese headings via a custom slugifier.
 * 4. GitHub Repository links (e.g., `https://github.com/F88/promidas/blob/main/...`)
 *    - Maps these URLs to local file paths to ensure the target file exists in the repository.
 *
 * Usage:
 * $ npx tsx scripts/validate-vitepress-links.ts
 * or
 * $ npm run docs:verify
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DOCS_ROOT = path.resolve(PROJECT_ROOT, 'docs');

function getAllMarkdownFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (file !== '.vitepress' && file !== 'node_modules') {
        getAllMarkdownFiles(filePath, fileList);
      }
    } else {
      if (path.extname(file) === '.md') {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

function verifyLinks() {
  const mdFiles = getAllMarkdownFiles(DOCS_ROOT);
  let hasError = false;

  console.log(`Found ${mdFiles.length} markdown files in ${DOCS_ROOT}`);

  mdFiles.forEach((file) => {
    const content = fs.readFileSync(file, 'utf-8');
    const relativePath = path.relative(PROJECT_ROOT, file);
    const dir = path.dirname(file);

    // Match [text](url) but ignore images ![alt](url)
    const regex = /\[.*?\]\((.*?)\)/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      // Check if it's an image
      const linkIndex = match.index;
      if (linkIndex > 0 && content[linkIndex - 1] === '!') {
        continue;
      }

      const link = match[1];
      if (!link) continue;

      // Clean link (remove title part if exists, e.g. "path/to/file.md" "Title")
      // Also handle anchors like path/to/file.md#anchor
      const linkParts = link.split(' "');
      let [targetFile, anchor] = (linkParts[0] ?? '').split('#');

      if (!targetFile) {
        // Anchor only, e.g. #section
        continue;
      }

      // 1. External links
      if (
        targetFile.startsWith('http://') ||
        targetFile.startsWith('https://')
      ) {
        if (validateExternalLink(targetFile, relativePath, link)) {
          hasError = true;
        }
        continue;
      }

      // 2. Mailto
      if (targetFile.startsWith('mailto:')) {
        continue;
      }

      // 3. Absolute path (VitePress specific)
      // If absolute, resolve logic is similar to relative but from DOCS_ROOT
      let resolvedTarget: string | null = null;

      if (targetFile.startsWith('/')) {
        resolvedTarget = validateAbsoluteLink(targetFile, relativePath, link);
        if (!resolvedTarget) {
          hasError = true;
          continue;
        }
        // Proceed to anchor check using resolvedTarget
      } else {
        // 4. Relative path
        resolvedTarget = validateRelativeLink(
          dir,
          targetFile,
          relativePath,
          link,
        );
        if (!resolvedTarget) {
          hasError = true;
          continue;
        }
      }

      // 5. Anchor check (if file exists)
      if (anchor) {
        if (
          validateAnchor(
            resolvedTarget,
            targetFile,
            file,
            anchor,
            relativePath,
            link,
          )
        ) {
          hasError = true;
        }
      }
    }
  });

  if (hasError) {
    console.error('Found broken links.');
    process.exit(1);
  } else {
    console.log('All links verified.');
  }
}

function validateExternalLink(
  targetFile: string,
  relativePath: string,
  link: string,
): boolean {
  // Special check for own repository links
  const repoPrefix = 'https://github.com/F88/promidas';
  if (targetFile.startsWith(repoPrefix)) {
    const relativePathFromRepo = targetFile
      .replace(`${repoPrefix}/blob/main/`, '')
      .replace(`${repoPrefix}/tree/main/`, '')
      .replace(`${repoPrefix}/edit/main/`, '')
      .replace(`${repoPrefix}/raw/main/`, '');

    // If it's just the repo root or issues/discussions, skip
    // Only skip top-level tabs, not files like 'docs/issues.md'
    if (
      targetFile === repoPrefix ||
      targetFile.startsWith(`${repoPrefix}/issues`) ||
      targetFile.startsWith(`${repoPrefix}/discussions`)
    ) {
      return false;
    }

    // Check if it's a file path validation
    if (targetFile.includes('/blob/') || targetFile.includes('/tree/')) {
      const localPath = path.resolve(PROJECT_ROOT, relativePathFromRepo);
      if (!fs.existsSync(localPath)) {
        console.error(
          `❌ [Broken GitHub Link] In ${relativePath}: ${link} -> Local file not found: ${localPath}`,
        );
        return true;
      }
    }
  }
  return false;
}

function isPathSafe(targetPath: string): boolean {
  const relative = path.relative(PROJECT_ROOT, targetPath);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

function validateAbsoluteLink(
  targetFile: string,
  relativePath: string,
  link: string,
): string | null {
  // /foo.md -> docs/foo.md
  const absoluteTarget = path.join(DOCS_ROOT, targetFile);

  // Security check: Traversal prevention
  if (!isPathSafe(absoluteTarget)) {
    console.error(
      `❌ [Security Error] In ${relativePath}: ${link} -> Link target escapes project root: ${absoluteTarget}`,
    );
    return null;
  }

  if (fs.existsSync(absoluteTarget)) {
    // Target exists exactly
    if (fs.statSync(absoluteTarget).isDirectory()) {
      // Absolute directory link - check index.md
      if (!fs.existsSync(path.join(absoluteTarget, 'index.md'))) {
        console.error(
          `❌ [Broken Directory Link] In ${relativePath}: ${link} -> Directory found but no 'index.md': ${absoluteTarget}`,
        );
        return null;
      }
    }
    return absoluteTarget;
  }

  if (fs.existsSync(absoluteTarget + '.md')) {
    const targetWithExt = absoluteTarget + '.md';
    // Safety check again just in case (though appending .md shouldn't break out if base didn't)
    if (!isPathSafe(targetWithExt)) return null;
    return targetWithExt;
  }

  console.error(
    `❌ [Broken Absolute Link] In ${relativePath}: ${link} -> File not found: ${absoluteTarget}`,
  );
  return null;
}

function validateRelativeLink(
  dir: string,
  targetFile: string,
  relativePath: string,
  link: string,
): string | null {
  const resolvedTarget = path.resolve(dir, targetFile);

  // Security check: Traversal prevention
  if (!isPathSafe(resolvedTarget)) {
    console.error(
      `❌ [Security Error] In ${relativePath}: ${link} -> Link target escapes project root: ${resolvedTarget}`,
    );
    return null;
  }

  if (fs.existsSync(resolvedTarget)) {
    // Target exists exactly
    if (fs.statSync(resolvedTarget).isDirectory()) {
      // If it's a directory, check for index.md
      if (!fs.existsSync(path.join(resolvedTarget, 'index.md'))) {
        console.error(
          `❌ [Broken Directory Link] In ${relativePath}: ${link} -> Directory found but no 'index.md': ${resolvedTarget}`,
        );
        return null;
      }
    }
    return resolvedTarget;
  } else if (fs.existsSync(resolvedTarget + '.md')) {
    // Target exists with .md extension
    const targetWithExt = resolvedTarget + '.md';
    // Safety check mostly redundant but safe
    if (!isPathSafe(targetWithExt)) return null;
    return targetWithExt;
  } else {
    console.error(
      `❌ [Broken Relative Link] In ${relativePath}: ${link} -> File not found: ${resolvedTarget}`,
    );
    return null;
  }
}

function validateAnchor(
  resolvedTarget: string,
  targetFile: string,
  currentFile: string,
  anchor: string,
  relativePath: string,
  link: string,
): boolean {
  const targetFilePath = targetFile ? resolvedTarget : currentFile;
  // If target is directory, append index.md
  const actualFile =
    fs.existsSync(targetFilePath) && fs.statSync(targetFilePath).isDirectory()
      ? path.join(targetFilePath, 'index.md')
      : targetFilePath;

  if (fs.existsSync(actualFile) && path.extname(actualFile) === '.md') {
    const fileContent = fs.readFileSync(actualFile, 'utf-8');
    const headings = extractHeadings(fileContent);

    if (!headings.includes(anchor)) {
      // Check for normalization mismatch (NFC vs NFD)
      const normalizedAnchor = anchor.normalize('NFC');
      const match = headings.find(
        (h) => h.normalize('NFC') === normalizedAnchor,
      );

      if (match) {
        console.error(
          `⚠️  [Normalization Mismatch] In ${relativePath}: ${link} -> Anchor "#${anchor}" doesn't strictly match heading id "#${match}".\n` +
            `    The link might not work in some browsers due to NFC/NFD differences.\n` +
            `    Recommended: Use a custom ID for the heading (e.g. # Heading {#custom-id}) or copy the exact header text.`,
        );
        return true;
      } else {
        console.error(
          `❌ [Broken Anchor] In ${relativePath}: ${link} -> Anchor "#${anchor}" not found in ${path.relative(PROJECT_ROOT, actualFile)}`,
        );
        return true;
      }
    }
  }
  return false;
}

function extractHeadings(content: string): string[] {
  const lines = content.split('\n');
  const slugs: string[] = [];
  // Basic code block skipping
  let inCodeBlock = false;

  lines.forEach((line) => {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      return;
    }
    if (inCodeBlock) return;

    // Match headings (with or without a space after the hashes)
    const match = line.match(/^(#{1,6})\s*(.+)$/);
    if (match && match[2]) {
      let headingText = match[2].trim();
      // Handle VitePress custom heading IDs: "### Title {#custom-id}"
      const customIdMatch = headingText.match(/\s*\{#([A-Za-z0-9\-_]+)\}\s*$/);
      if (customIdMatch) {
        // Use the explicit custom ID as the anchor, matching VitePress behavior
        slugs.push(customIdMatch[1]!);
      } else {
        // Fallback: slugify the heading text (without any trailing {#...})
        headingText = headingText.replace(/\s*\{#.+\}\s*$/, '').trim();
        slugs.push(slugify(headingText));
      }
    }
  });
  return slugs;
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/<[^>]+>/g, '') // remove html tags
      .replace(/[\s\t\n\r]+/g, '-') // spaces to dash
      // Remove standard punctuation but keep dash, underscore, and unicode (including emojis)
      // Removing: . , / ? ! : ; ' " ` ~ @ # $ % ^ & * ( ) [ ] { } | \
      .replace(/[.,/?!$%^&*;:'"@{}=`~()|\\\[\]]/g, '')
      // Keep word chars, dash, underscore, and all non-ascii unicode (including emojis)
      // Explicitly allow range \u{0080}-\u{10FFFF} to include emojis and Japanese
      .replace(/[^\w\-\u0080-\u{10FFFF}]+/gu, '')
      .replace(/-+/g, '-')
  );
}

// Export for testing
export {
  slugify,
  extractHeadings,
  validateExternalLink,
  validateAbsoluteLink,
  validateAnchor,
  validateRelativeLink,
  isPathSafe,
};

// Only run if main module
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  verifyLinks();
}
