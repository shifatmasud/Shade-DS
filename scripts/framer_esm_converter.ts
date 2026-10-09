#!/usr/bin/env npx tsx
import fs from 'fs';
import path from 'path';

/**
 * Framer ESM Converter & Dependency Auditing Tool
 * 
 * Rules:
 * 1. ONLY runs on Framer components (framer/ directory).
 * 2. Strict Immunity: 'react', 'react-dom', 'react/jsx-runtime', 'framer', 'framer-motion'
 *    MUST ALWAYS remain bare specifiers.
 * 3. All other npm dependencies are transformed to pinned 'https://esm.sh/...' URLs.
 * 4. React-dependent libraries append '?external=react,react-dom'.
 */

// Host singletons provided directly by Framer's runtime canvas
const IMMUNE_SPECIFIERS = new Set([
  'react',
  'react-dom',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'framer',
  'framer-motion',
]);

// Libraries that consume React hooks/JSX and must externalize React to prevent duplicate runtime errors
const REACT_PEER_PACKAGES = new Set([
  '@gsap/react',
  'lucide-react',
  '@react-three/fiber',
  '@react-three/drei',
  'zustand',
]);

interface ImportMatch {
  raw: string;
  specifier: string;
  isImmune: boolean;
  isLocal: boolean;
  isCdn: boolean;
  isBareNpm: boolean;
  suggestedUrl?: string;
  start: number;
  end: number;
}

// Load package.json versions for pinning
function getInstalledVersions(): Record<string, string> {
  try {
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      const cleaned: Record<string, string> = {};
      for (const [k, v] of Object.entries(deps)) {
        cleaned[k] = String(v).replace(/^[\^~>=<]/, '');
      }
      return cleaned;
    }
  } catch (err) {
    console.warn('[Warning] Could not load package.json for version pinning.');
  }
  return {};
}

const packageVersions = getInstalledVersions();

function parseSpecifier(specifier: string): {
  pkgName: string;
  subpath: string;
} {
  if (specifier.startsWith('@')) {
    const parts = specifier.split('/');
    const pkgName = `${parts[0]}/${parts[1]}`;
    const subpath = parts.slice(2).join('/');
    return { pkgName, subpath };
  } else {
    const parts = specifier.split('/');
    const pkgName = parts[0];
    const subpath = parts.slice(1).join('/');
    return { pkgName, subpath };
  }
}

export function buildEsmUrl(specifier: string): string {
  const { pkgName, subpath } = parseSpecifier(specifier);
  const version = packageVersions[pkgName];
  
  let base = 'https://esm.sh/' + pkgName;
  if (version) {
    base += `@${version}`;
  }
  if (subpath) {
    base += `/${subpath}`;
  }

  // React peer dependency check
  if (REACT_PEER_PACKAGES.has(pkgName)) {
    if (pkgName === '@gsap/react') {
      base += '?external=react';
    } else {
      base += '?external=react,react-dom';
    }
  }

  return base;
}

export function analyzeImports(content: string): ImportMatch[] {
  const matches: ImportMatch[] = [];
  
  // Regex to match static imports and exports
  // 1. import ... from "..."
  // 2. import "..."
  // 3. export ... from "..."
  // 4. import("...")
  const staticImportRegex = /(?:import\s+(?:[\w*\s{},$]+\s+from\s+)?|export\s+(?:[\w*\s{},$]+\s+from\s+))['"]([^'"]+)['"]/g;
  const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

  let match: RegExpExecArray | null;

  while ((match = staticImportRegex.exec(content)) !== null) {
    const raw = match[0];
    const specifier = match[1];
    const isImmune = IMMUNE_SPECIFIERS.has(specifier);
    const isLocal = specifier.startsWith('.') || specifier.startsWith('/');
    const isCdn = specifier.startsWith('https://') || specifier.startsWith('http://');
    const isBareNpm = !isImmune && !isLocal && !isCdn;

    matches.push({
      raw,
      specifier,
      isImmune,
      isLocal,
      isCdn,
      isBareNpm,
      suggestedUrl: isBareNpm ? buildEsmUrl(specifier) : undefined,
      start: match.index,
      end: match.index + raw.length,
    });
  }

  while ((match = dynamicImportRegex.exec(content)) !== null) {
    const raw = match[0];
    const specifier = match[1];
    const isImmune = IMMUNE_SPECIFIERS.has(specifier);
    const isLocal = specifier.startsWith('.') || specifier.startsWith('/');
    const isCdn = specifier.startsWith('https://') || specifier.startsWith('http://');
    const isBareNpm = !isImmune && !isLocal && !isCdn;

    matches.push({
      raw,
      specifier,
      isImmune,
      isLocal,
      isCdn,
      isBareNpm,
      suggestedUrl: isBareNpm ? buildEsmUrl(specifier) : undefined,
      start: match.index,
      end: match.index + raw.length,
    });
  }

  return matches;
}

export function transformContent(content: string): { newContent: string; changedCount: number } {
  const lines = content.split('\n');
  let changedCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for static import/export
    const staticMatch = line.match(/(import\s+(?:[\w*\s{},$]+\s+from\s+)?|export\s+(?:[\w*\s{},$]+\s+from\s+))['"]([^'"]+)['"]/);
    if (staticMatch) {
      const prefix = staticMatch[1];
      const specifier = staticMatch[2];

      if (!IMMUNE_SPECIFIERS.has(specifier) && !specifier.startsWith('.') && !specifier.startsWith('/') && !specifier.startsWith('http')) {
        const esmUrl = buildEsmUrl(specifier);
        const newLine = line.replace(`"${specifier}"`, `"${esmUrl}"`).replace(`'${specifier}'`, `"${esmUrl}"`);
        
        // Ensure @ts-ignore is present above the remote import if not already there
        const prevLine = i > 0 ? lines[i - 1].trim() : '';
        if (!prevLine.includes('@ts-ignore') && !prevLine.includes('@ts-expect-error')) {
          lines.splice(i, 1, '// @ts-ignore', newLine);
          i++; // Skip the newly inserted line
        } else {
          lines[i] = newLine;
        }
        changedCount++;
        continue;
      }
    }

    // Check for dynamic import
    const dynMatch = line.match(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    if (dynMatch) {
      const specifier = dynMatch[1];
      if (!IMMUNE_SPECIFIERS.has(specifier) && !specifier.startsWith('.') && !specifier.startsWith('/') && !specifier.startsWith('http')) {
        const esmUrl = buildEsmUrl(specifier);
        lines[i] = line.replace(`"${specifier}"`, `"${esmUrl}"`).replace(`'${specifier}'`, `"${esmUrl}"`);
        changedCount++;
      }
    }
  }

  return { newContent: lines.join('\n'), changedCount };
}

function getAllFramerFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllFramerFiles(fullPath));
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

// CLI Execution
async function main() {
  const args = process.argv.slice(2);
  const framerDir = path.resolve(process.cwd(), 'framer');

  if (args.includes('--help') || args.length === 0) {
    console.log(`
Framer ESM Converter CLI
Usage:
  npx tsx scripts/framer_esm_converter.ts [options]

Options:
  --scan                    Scan all Framer components and audit dependencies
  --file <path>             Audit or convert a single Framer component
  --dry-run                 Preview modifications without writing to disk
  --convert-all             Convert all bare npm dependencies across framer/
  --help                    Show this help message
`);
    return;
  }

  const isDryRun = args.includes('--dry-run');
  const fileArgIndex = args.indexOf('--file');
  const targetFile = fileArgIndex !== -1 ? args[fileArgIndex + 1] : null;

  if (args.includes('--scan')) {
    console.log('========================================================================');
    console.log('🔍 Scanning Framer Code Components for NPM & CDN Dependencies...');
    console.log('========================================================================');
    
    const files = getAllFramerFiles(framerDir);
    let totalBareNpm = 0;

    for (const f of files) {
      const relPath = path.relative(process.cwd(), f);
      const content = fs.readFileSync(f, 'utf8');
      const analysis = analyzeImports(content);
      const bareImports = analysis.filter(a => a.isBareNpm);

      if (bareImports.length > 0) {
        console.log(`\n📄 ${relPath}`);
        for (const item of bareImports) {
          console.log(`   ❌ [Bare NPM] ${item.specifier} -> ${item.suggestedUrl}`);
          totalBareNpm++;
        }
      }
    }

    console.log('\n------------------------------------------------------------------------');
    if (totalBareNpm === 0) {
      console.log('✅ Clean audit: All Framer components use either Immune host imports or esm.sh URLs!');
    } else {
      console.log(`⚠️  Found ${totalBareNpm} bare npm imports requiring conversion to esm.sh.`);
    }
    console.log('========================================================================');
    return;
  }

  if (targetFile) {
    const resolvedPath = path.resolve(process.cwd(), targetFile);
    if (!fs.existsSync(resolvedPath)) {
      console.error(`Error: File not found at ${resolvedPath}`);
      process.exit(1);
    }

    const content = fs.readFileSync(resolvedPath, 'utf8');
    const { newContent, changedCount } = transformContent(content);

    if (changedCount === 0) {
      console.log(`No bare npm dependencies found to transform in ${targetFile}`);
      return;
    }

    console.log(`Transformed ${changedCount} bare npm imports in ${targetFile}`);
    if (isDryRun) {
      console.log('\n[Dry Run Preview]:');
      console.log(newContent.slice(0, 800) + '...');
    } else {
      fs.writeFileSync(resolvedPath, newContent, 'utf8');
      console.log(`✅ File updated successfully.`);
    }
    return;
  }

  if (args.includes('--convert-all')) {
    const files = getAllFramerFiles(framerDir);
    let convertedFiles = 0;

    for (const f of files) {
      const relPath = path.relative(process.cwd(), f);
      const content = fs.readFileSync(f, 'utf8');
      const { newContent, changedCount } = transformContent(content);

      if (changedCount > 0) {
        console.log(`Converting ${changedCount} imports in ${relPath}...`);
        if (!isDryRun) {
          fs.writeFileSync(f, newContent, 'utf8');
        }
        convertedFiles++;
      }
    }

    console.log(`\nDone. Converted ${convertedFiles} files.`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
