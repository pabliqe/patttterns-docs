import { existsSync, statSync } from 'node:fs';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsRoot = path.resolve(
  process.env.DOCS_SOURCE_DIR || path.join(siteRoot, '../patttterns-next/docs'),
);
const sourceRepoRoot = path.dirname(docsRoot);
const contentRoot = path.join(siteRoot, 'src/content/docs');
const imageExtensions = new Set(['.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp']);

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === '.archive') continue;

    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolutePath)));
    } else if (entry.isFile()) {
      files.push(absolutePath);
    }
  }

  return files;
}

function getTitle(markdown, filePath) {
  const heading = markdown.match(/^#\s+(.+?)\s*#*\s*$/m)?.[1];
  if (heading) return heading.trim();

  return path
    .basename(filePath, '.md')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ensureTitle(markdown, filePath) {
  const frontmatter = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  const existingFrontmatter = frontmatter?.[1] ?? '';
  const additions = [];
  if (!/^title\s*:/m.test(existingFrontmatter)) {
    additions.push(
      `title: ${JSON.stringify(getTitle(frontmatter ? markdown.slice(frontmatter[0].length) : markdown, filePath))}`,
    );
  }
  if (!/^draft\s*:/m.test(existingFrontmatter)) additions.push('draft: false');

  let content = markdown;
  if (!frontmatter) {
    content = `---\n${additions.join('\n')}\n---\n\n${markdown}`;
  } else if (additions.length > 0) {
    const updatedFrontmatter = `---\n${frontmatter[1]}\n${additions.join('\n')}\n---`;
    content = `${updatedFrontmatter}${markdown.slice(frontmatter[0].length)}`;
  }

  const contentFrontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  const bodyStart = contentFrontmatter?.[0].length ?? 0;
  const body = content.slice(bodyStart);
  const lines = body.split(/\r?\n/);
  let fence;
  let documentHeadingRemoved = false;
  for (const [index, line] of lines.entries()) {
    const fenceStart = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceStart) {
      const marker = fenceStart[1][0];
      if (!fence) fence = { marker, length: fenceStart[1].length };
      else if (marker === fence.marker && fenceStart[1].length >= fence.length) fence = undefined;
      continue;
    }

    if (fence || !/^#\s+\S/.test(line)) continue;
    if (!documentHeadingRemoved) {
      lines[index] = '';
      documentHeadingRemoved = true;
    } else {
      lines[index] = line.replace(/^#/, '##');
    }
  }

  return content.slice(0, bodyStart) + lines.join('\n');
}

function resolveMarkdownTarget(destination, sourcePath, markdownPaths) {
  const suffixIndex = destination.search(/[?#]/);
  const targetPath = suffixIndex === -1 ? destination : destination.slice(0, suffixIndex);
  const suffix = suffixIndex === -1 ? '' : destination.slice(suffixIndex);
  if (!targetPath) return null;

  const absoluteTarget = targetPath.startsWith('/')
    ? path.resolve(docsRoot, `.${targetPath}`)
    : path.resolve(path.dirname(sourcePath), targetPath);
  const relativeTarget = path.relative(docsRoot, absoluteTarget).split(path.sep).join('/');
  const markdownTarget = (
    relativeTarget.toLowerCase().endsWith('.md')
      ? relativeTarget
      : `${relativeTarget}.md`
  ).toLowerCase();
  if (markdownPaths.has(markdownTarget)) {
    const slug = markdownTarget
      .replace(/(?:^|\/)index\.md$/i, '')
      .replace(/\.md$/i, '')
      .toLowerCase();
    return `/${slug ? `${slug}/` : ''}${suffix}`;
  }

  const indexTarget = `${relativeTarget.replace(/\/$/, '')}/index.md`.toLowerCase();
  if (markdownPaths.has(indexTarget)) {
    const slug = indexTarget.replace(/(?:^|\/)index\.md$/i, '').toLowerCase();
    return `/${slug ? `${slug}/` : ''}${suffix}`;
  }

  if (
    !targetPath.startsWith('/') &&
    !imageExtensions.has(path.extname(targetPath).toLowerCase())
  ) {
    const repoTarget = path.resolve(
      targetPath.startsWith('.') ? path.dirname(sourcePath) : sourceRepoRoot,
      targetPath,
    );
    const repoRelativePath = path.relative(sourceRepoRoot, repoTarget);
    if (
      repoRelativePath &&
      !repoRelativePath.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(repoRelativePath) &&
      existsSync(repoTarget) &&
      statSync(repoTarget).isFile()
    ) {
      return `https://github.com/pabliqe/patttterns-next/blob/main/${repoRelativePath
        .split(path.sep)
        .map(encodeURIComponent)
        .join('/')}${suffix}`;
    }
  }

  return null;
}

function rewriteMarkdownLinks(markdown, sourcePath, markdownPaths) {
  const lines = markdown.split(/\r?\n/);
  let fence;

  return lines
    .map((line) => {
      const fenceStart = line.match(/^\s*(`{3,}|~{3,})/);
      if (fenceStart) {
        const marker = fenceStart[1][0];
        if (!fence) fence = { marker, length: fenceStart[1].length };
        else if (marker === fence.marker && fenceStart[1].length >= fence.length) fence = undefined;
        return line;
      }
      if (fence) return line;

      return line.replace(/\]\(([^)]*)\)/g, (link, contents) => {
        const parsed = contents.match(/^(\s*)(<[^>]+>|[^\s]+)([\s\S]*)$/);
        if (!parsed) return link;

        const [, leadingSpace, wrappedDestination, trailingContent] = parsed;
        const wrapped = wrappedDestination.startsWith('<');
        const destination = wrapped
          ? wrappedDestination.slice(1, -1)
          : wrappedDestination;
        if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(destination)) return link;

        const rewritten = resolveMarkdownTarget(destination, sourcePath, markdownPaths);
        if (!rewritten) return link;
        const formattedDestination = wrapped ? `<${rewritten}>` : rewritten;
        return `](${leadingSpace}${formattedDestination}${trailingContent})`;
      });
    })
    .join('\n');
}

await rm(contentRoot, { recursive: true, force: true });
await mkdir(contentRoot, { recursive: true });

const sourceFiles = await collectFiles(docsRoot);
const markdownFiles = sourceFiles.filter((file) => path.extname(file).toLowerCase() === '.md');
const markdownPaths = new Set(
  markdownFiles.map((file) =>
    path.relative(docsRoot, file).split(path.sep).join('/').toLowerCase(),
  ),
);

for (const sourcePath of sourceFiles) {
  const relativePath = path.relative(docsRoot, sourcePath);
  const extension = path.extname(sourcePath).toLowerCase();

  if (extension === '.md') {
    const destinationPath = path.join(contentRoot, relativePath);
    await mkdir(path.dirname(destinationPath), { recursive: true });
    const source = await readFile(sourcePath, 'utf8');
    const titled = ensureTitle(source, sourcePath);
    await writeFile(
      destinationPath,
      rewriteMarkdownLinks(titled, sourcePath, markdownPaths),
    );
  } else if (imageExtensions.has(extension)) {
    const destinationPath = path.join(contentRoot, relativePath);
    await mkdir(path.dirname(destinationPath), { recursive: true });
    await cp(sourcePath, destinationPath);
  }
}

await mkdir(path.join(siteRoot, 'src/assets'), { recursive: true });
await cp(
  path.join(docsRoot, 'assets/img/logo.png'),
  path.join(siteRoot, 'src/assets/logo.png'),
);

console.log(`Prepared ${markdownFiles.length} Markdown pages for Starlight.`);
