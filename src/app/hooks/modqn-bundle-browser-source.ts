import {
  loadModqnReplayBundle,
  ModqnBundleSchemaError,
  type ModqnBundleFileReader,
  type ModqnReplayBundle,
} from '@/adapters/modqn-bundle';

const OPTIONAL_FIGURE_PATHS = {
  trainingObjectivesFigureUrl: 'figures/training-objectives.png',
  trainingScalarRewardFigureUrl: 'figures/training-scalar-reward.png',
} as const;

type BrowserDirectoryFile = File & {
  webkitRelativePath?: string;
};

export interface ModqnExternalDirectoryBundleSource {
  bundle: ModqnReplayBundle;
  sourceKind: 'external-directory';
  sourceLabel: string;
  dispose: () => void;
}

interface BrowserDirectorySelection {
  sourceLabel: string;
  fileByRelativePath: Map<string, File>;
  reader: ModqnBundleFileReader;
}

function getBrowserRelativePath(file: BrowserDirectoryFile): string {
  const rawPath = typeof file.webkitRelativePath === 'string'
    ? file.webkitRelativePath.trim()
    : '';
  if (!rawPath) {
    throw new Error(
      'Browser directory selection did not include relative paths. Select a bundle directory instead of individual files.',
    );
  }
  return rawPath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

function buildBrowserDirectorySelection(
  selectedFiles: FileList | File[],
): BrowserDirectorySelection {
  const files = Array.from(selectedFiles);
  if (files.length === 0) {
    throw new Error('No bundle directory files were selected.');
  }

  const fileByRelativePath = new Map<string, File>();
  const directoryMarkers = new Set<string>();
  let sourceLabel: string | null = null;

  for (const file of files) {
    const normalizedPath = getBrowserRelativePath(file);
    const segments = normalizedPath.split('/').filter((segment) => segment.length > 0);
    if (segments.length < 2) {
      throw new Error(
        `Selected file "${normalizedPath}" does not expose a bundle-relative path.`,
      );
    }

    const rootDirectory = segments[0];
    const bundleRelativePath = segments.slice(1).join('/');
    if (!sourceLabel) {
      sourceLabel = rootDirectory;
    } else if (sourceLabel !== rootDirectory) {
      throw new Error(
        `Selected files span multiple roots (${sourceLabel}, ${rootDirectory}). Select exactly one bundle directory.`,
      );
    }

    if (fileByRelativePath.has(bundleRelativePath)) {
      throw new Error(`Bundle directory contains duplicate file path: ${bundleRelativePath}`);
    }
    fileByRelativePath.set(bundleRelativePath, file);

    const relativeSegments = bundleRelativePath.split('/');
    for (let index = 1; index < relativeSegments.length; index += 1) {
      directoryMarkers.add(relativeSegments.slice(0, index).join('/'));
    }
  }

  if (!sourceLabel) {
    throw new Error('Unable to determine the selected bundle directory name.');
  }

  const textCache = new Map<string, Promise<string>>();

  return {
    sourceLabel,
    fileByRelativePath,
    reader: {
      async readText(relativePath: string) {
        const file = fileByRelativePath.get(relativePath);
        if (!file) {
          throw new Error(`Bundle browser reader: missing ${relativePath}`);
        }
        let promise = textCache.get(relativePath);
        if (!promise) {
          promise = file.text();
          textCache.set(relativePath, promise);
        }
        return promise;
      },
      async exists(relativePath: string) {
        return fileByRelativePath.has(relativePath);
      },
      async existsDirectory(relativePath: string) {
        const normalized = relativePath.replace(/\/$/, '');
        return directoryMarkers.has(normalized);
      },
    },
  };
}

function createOptionalFigureArtifactUrls(
  fileByRelativePath: Map<string, File>,
): Pick<ModqnReplayBundle, 'artifactUrls'> & { dispose: () => void } {
  const createdUrls: string[] = [];
  let disposed = false;

  const artifactUrls = Object.fromEntries(
    Object.entries(OPTIONAL_FIGURE_PATHS).map(([key, relativePath]) => {
      const file = fileByRelativePath.get(relativePath);
      if (!file) {
        return [key, null];
      }
      const objectUrl = URL.createObjectURL(file);
      createdUrls.push(objectUrl);
      return [key, objectUrl];
    }),
  ) as NonNullable<ModqnReplayBundle['artifactUrls']>;

  return {
    artifactUrls,
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const objectUrl of createdUrls) {
        URL.revokeObjectURL(objectUrl);
      }
    },
  };
}

export function createBrowserDirectoryFileReader(
  selectedFiles: FileList | File[],
): BrowserDirectorySelection {
  return buildBrowserDirectorySelection(selectedFiles);
}

export async function loadExternalModqnReplayBundleFromDirectory(
  selectedFiles: FileList | File[],
): Promise<ModqnExternalDirectoryBundleSource> {
  const selection = buildBrowserDirectorySelection(selectedFiles);
  let bundle: ModqnReplayBundle;
  try {
    bundle = await loadModqnReplayBundle(selection.reader);
  } catch (error) {
    if (
      error instanceof ModqnBundleSchemaError
      && error.code === 'BUNDLE_INCOMPLETE'
      && Array.isArray(error.detail.missing)
      && error.detail.missing.some((entry) => typeof entry === 'string' && entry.endsWith('/'))
    ) {
      throw new ModqnBundleSchemaError(
        error.code,
        `${error.message} Browser directory uploads can only prove directories that contain at least one selected file. If a required directory is empty, keep a sentinel file such as .gitkeep inside it before selecting the bundle directory.`,
        error.detail,
      );
    }
    throw error;
  }
  const artifacts = createOptionalFigureArtifactUrls(selection.fileByRelativePath);

  return {
    bundle: {
      ...bundle,
      artifactUrls: {
        ...bundle.artifactUrls,
        ...artifacts.artifactUrls,
      },
    },
    sourceKind: 'external-directory',
    sourceLabel: selection.sourceLabel,
    dispose: artifacts.dispose,
  };
}
