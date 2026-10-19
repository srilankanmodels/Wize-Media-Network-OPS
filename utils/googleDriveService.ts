export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  size?: string;
  modifiedTime?: string;
  owners?: { displayName: string; emailAddress: string }[];
  isFolder?: boolean;
}

export const fetchDriveFiles = async (
  accessToken: string,
  folderId = 'root',
  searchQuery?: string
): Promise<GoogleDriveFile[]> => {
  try {
    let q = `'${folderId}' in parents and trashed = false`;
    if (searchQuery && searchQuery.trim()) {
      const sanitized = searchQuery.trim().replace(/'/g, "\\'");
      q = `trashed = false and name contains '${sanitized}'`;
    }

    const fields = 'files(id, name, mimeType, webViewLink, webContentLink, iconLink, thumbnailLink, size, modifiedTime, owners)';
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', q);
    url.searchParams.set('fields', fields);
    url.searchParams.set('orderBy', 'folder,modifiedTime desc');
    url.searchParams.set('pageSize', '60');

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!res.ok) {
      if (res.status === 401) throw new Error('TOKEN_EXPIRED');
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Google Drive request failed (${res.status})`);
    }

    const data = await res.json();
    return (data.files || []).map((file: any) => ({
      ...file,
      isFolder: file.mimeType === 'application/vnd.google-apps.folder'
    })) as GoogleDriveFile[];
  } catch (error) {
    console.error('Error fetching Google Drive files:', error);
    throw error;
  }
};

export const createDriveFolder = async (
  accessToken: string,
  folderName: string,
  parentFolderId = 'root'
): Promise<GoogleDriveFile> => {
  const metadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentFolderId]
  };

  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('TOKEN_EXPIRED');
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to create folder (${res.status})`);
  }

  const created = await res.json();
  return {
    ...created,
    isFolder: true
  };
};

export const uploadDriveFile = async (
  accessToken: string,
  file: File,
  parentFolderId = 'root'
): Promise<GoogleDriveFile> => {
  const metadata = {
    name: file.name,
    parents: [parentFolderId]
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const reader = new FileReader();

  const fileData = await new Promise<ArrayBuffer>((resolve, reject) => {
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });

  const metadataPart = delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata);

  const mediaHeader = delimiter +
    `Content-Type: ${file.type || 'application/octet-stream'}\r\n` +
    'Content-Transfer-Encoding: binary\r\n\r\n';

  // Construct binary payload
  const enc = new TextEncoder();
  const metaBuf = enc.encode(metadataPart);
  const mediaHeadBuf = enc.encode(mediaHeader);
  const closeBuf = enc.encode(closeDelimiter);

  const totalLength = metaBuf.byteLength + mediaHeadBuf.byteLength + fileData.byteLength + closeBuf.byteLength;
  const combined = new Uint8Array(totalLength);
  let offset = 0;

  combined.set(metaBuf, offset);
  offset += metaBuf.byteLength;
  combined.set(mediaHeadBuf, offset);
  offset += mediaHeadBuf.byteLength;
  combined.set(new Uint8Array(fileData), offset);
  offset += fileData.byteLength;
  combined.set(closeBuf, offset);

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,webContentLink,size', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: combined
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('TOKEN_EXPIRED');
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to upload file to Google Drive (${res.status})`);
  }

  return await res.json();
};

export const deleteDriveFile = async (
  accessToken: string,
  fileId: string
): Promise<boolean> => {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!res.ok && res.status !== 204 && res.status !== 404) {
    if (res.status === 401) throw new Error('TOKEN_EXPIRED');
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to delete file from Google Drive (${res.status})`);
  }

  return true;
};
