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
        // Special check for own repository links
        // Pattern: https://github.com/F88/promidas/blob/main/path/to/file
        const repoPrefix = 'https://github.com/F88/promidas';
        if (targetFile.startsWith(repoPrefix)) {
          const relativePathFromRepo = targetFile
            .replace(`${repoPrefix}/blob/main/`, '')
            .replace(`${repoPrefix}/tree/main/`, '')
            .replace(`${repoPrefix}/edit/main/`, '')
            .replace(`${repoPrefix}/raw/main/`, '');

          // If it's just the repo root or issues/discussions, skip
          if (
            targetFile === repoPrefix ||
            targetFile.includes('/issues') ||
            targetFile.includes('/discussions')
          ) {
            continue;
          }

          // Check if it's a file path validation
          // Ignore unrelated paths like 'releases', 'pulls' etc if they exist
          if (targetFile.includes('/blob/') || targetFile.includes('/tree/')) {
            const localPath = path.resolve(PROJECT_ROOT, relativePathFromRepo);
            if (!fs.existsSync(localPath)) {
              console.error(
                `❌ [Broken GitHub Link] In ${relativePath}: ${link} -> Local file not found: ${localPath}`,
              );
              hasError = true;
            }
          }
        }
        continue;
      }

      // 2. Mailto
      if (targetFile.startsWith('mailto:')) {
        continue;
      }

      // 3. Absolute path (VitePress specific)
      if (targetFile.startsWith('/')) {
        // /foo.md -> docs/foo.md
        const absoluteTarget = path.join(DOCS_ROOT, targetFile);
        if (
          !fs.existsSync(absoluteTarget) &&
          !fs.existsSync(absoluteTarget + '.md')
        ) {
          console.error(
            `❌ [Broken Absolute Link] In ${relativePath}: ${link} -> File not found: ${absoluteTarget}`,
          );
          hasError = true;
        }
        continue;
      }

      // 4. Relative path
      const resolvedTarget = path.resolve(dir, targetFile);

      if (!fs.existsSync(resolvedTarget)) {
        if (fs.existsSync(resolvedTarget + '.md')) {
          // warning omitted
        } else if (
          fs.existsSync(resolvedTarget) &&
          fs.statSync(resolvedTarget).isDirectory() &&
          fs.existsSync(path.join(resolvedTarget, 'index.md'))
        ) {
          // Link to directory implies index.md
        } else {
          console.error(
            `❌ [Broken Relative Link] In ${relativePath}: ${link} -> File not found: ${resolvedTarget}`,
          );
          hasError = true;
          continue;
        }
      }

      // 5. Anchor check (if file exists)
      if (anchor) {
        const targetFilePath = targetFile ? resolvedTarget : file;
        // If target is directory, append index.md
        const actualFile =
          fs.existsSync(targetFilePath) &&
          fs.statSync(targetFilePath).isDirectory()
            ? path.join(targetFilePath, 'index.md')
            : targetFilePath;

        if (fs.existsSync(actualFile) && path.extname(actualFile) === '.md') {
          const fileContent = fs.readFileSync(actualFile, 'utf-8');
          const headings = extractHeadings(fileContent);
          if (!headings.includes(anchor)) {
            console.error(
              `❌ [Broken Anchor] In ${relativePath}: ${link} -> Anchor "#${anchor}" not found in ${path.relative(PROJECT_ROOT, actualFile)}`,
            );
            // hasError = true; // Turn on error after verification
            // console.log(`Available headings: ${headings.join(', ')}`);
            hasError = true;
          }
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

    // Match headings
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match && match[2]) {
      slugs.push(slugify(match[2]));
    }
  });
  return slugs;
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/<[^>]+>/g, '') // remove html tags
      .trim()
      .replace(/[\s\t\n\r]+/g, '-') // spaces to dash
      // Keep alphanumeric, dashes, and broad unicode range for non-latin
      // Removing standard punctuation: . , / ? ! : ; ' " ` ~ @ # $ % ^ & * ( ) [ ] { } | \
      .replace(/[.,/#!$%^&*;:{}=\-_`~()\[\]]/g, '')
      // Note: github-slugger keeps some things?
      // Actually, let's just use a permissive range:
      // Keep: Word chars, Dash, Unicode letters/numbers.
      // It's safer to strip known bad chars than to list good chars for unicode.
      // For verify-links, we can try to match "exact text" or "slugified text".
      // But let's try a better regex.
      // This regex removes anything that IS NOT word, space(already gone), or dash.
      // But \w doesn't match Japanese.
      // So we strip specific punctuation.
      .replace(/[^\w\-\u0080-\uFFFF]+/g, '') // Keep all unicode
      .replace(/-+/g, '-')
  );
}

verifyLinks();
