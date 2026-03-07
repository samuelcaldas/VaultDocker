import path from 'path';

export function normalizeRemotePath(remotePath: string): string {
  const normalized = path.posix.normalize(remotePath.replace(/\\/g, '/'));
  const withoutLeading = normalized.replace(/^\/+/, '');
  const withoutTraversal = withoutLeading.replace(/\.\.(\/|$)/g, '');

  if (!withoutTraversal) {
    return '';
  }

  return withoutTraversal;
}

export function joinRemotePath(prefix: string | undefined, remotePath: string): string {
  const cleanPrefix = normalizeRemotePath(prefix ?? '').replace(/\/$/, '');
  const cleanRemote = normalizeRemotePath(remotePath);

  if (!cleanPrefix) {
    return cleanRemote;
  }

  if (!cleanRemote) {
    return cleanPrefix;
  }

  return `${cleanPrefix}/${cleanRemote}`;
}

export function applyRemotePrefix(prefix: string | undefined, remotePath: string): string {
  const cleanPrefix = normalizeRemotePath(prefix ?? '').replace(/\/$/, '');
  const cleanRemote = normalizeRemotePath(remotePath);

  if (!cleanPrefix) {
    return cleanRemote;
  }

  if (!cleanRemote) {
    return cleanPrefix;
  }

  if (cleanRemote === cleanPrefix || cleanRemote.startsWith(`${cleanPrefix}/`)) {
    return cleanRemote;
  }

  return `${cleanPrefix}/${cleanRemote}`;
}

export function ensureDirectoryPath(remotePath: string): string {
  const normalized = normalizeRemotePath(remotePath);

  if (!normalized) {
    return '';
  }

  const parts = normalized.split('/');
  parts.pop();

  return parts.join('/');
}
