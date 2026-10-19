import React, { useState, useEffect } from 'react';
import { StaffMember } from '../types';
import { supabase, isSupabaseEnabled, connectGoogleViaSupabase, disconnectGoogleWorkspaceToken, GOOGLE_WORKSPACE_SCOPES } from '../supabase';
import { 
  fetchDriveFiles, 
  createDriveFolder, 
  uploadDriveFile, 
  deleteDriveFile, 
  GoogleDriveFile 
} from '../utils/googleDriveService';
import { 
  HardDrive, Folder, File, FileText, Image, Video, Music, 
  Search, Plus, Upload, Trash2, ExternalLink, RefreshCw, 
  AlertCircle, ChevronRight, X, LogOut, CheckCircle2, 
  ShieldCheck, ArrowUpRight, FolderPlus, Download
} from 'lucide-react';

interface GoogleDriveWidgetProps {
  currentUser: StaffMember;
  onAttachFileToProject?: (file: GoogleDriveFile) => void;
}

const GoogleDriveWidget: React.FC<GoogleDriveWidgetProps> = ({ currentUser, onAttachFileToProject }) => {
  const [token, setToken] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<any | null>(null);
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Navigation / Folder path stack
  const [currentFolder, setCurrentFolder] = useState<{ id: string; name: string }>({ id: 'root', name: 'My Drive' });
  const [folderStack, setFolderStack] = useState<{ id: string; name: string }[]>([{ id: 'root', name: 'My Drive' }]);

  // Modals state
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<GoogleDriveFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Initialize Auth from sessionStorage or Supabase
  useEffect(() => {
    const cached = sessionStorage.getItem('mw_google_drive_token') || sessionStorage.getItem('mw_google_provider_token') || sessionStorage.getItem('mw_google_calendar_token');
    const cachedEmail = sessionStorage.getItem('mw_google_calendar_email');
    if (cached) {
      setToken(cached);
      if (cachedEmail) setGoogleUser({ email: cachedEmail });
      loadFiles(cached, currentFolder.id);
    }

    if (isSupabaseEnabled && supabase) {
      const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.provider_token) {
          const tok = session.provider_token;
          const email = session.user?.email || 'Office Account';
          setToken(tok);
          setGoogleUser({ email, displayName: session.user?.user_metadata?.full_name });
          sessionStorage.setItem('mw_google_drive_token', tok);
          loadFiles(tok, currentFolder.id);
        }
      });
      return () => {
        authSub?.subscription.unsubscribe();
      };
    }
  }, [currentFolder.id]);

  const loadFiles = async (accessToken: string, folderId: string, search?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const driveFiles = await fetchDriveFiles(accessToken, folderId, search);
      setFiles(driveFiles);
    } catch (err: any) {
      if (err.message === 'TOKEN_EXPIRED') {
        setToken(null);
        setError('Google Workspace session expired. Please reconnect.');
      } else {
        setError(err.message || 'Failed to fetch Google Drive files.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await connectGoogleViaSupabase(GOOGLE_WORKSPACE_SCOPES.DRIVE);
      if (error) setError(error.message);
    } catch (err: any) {
      setError(err.message || 'Supabase Google Drive authorization failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    disconnectGoogleWorkspaceToken();
    setToken(null);
    setGoogleUser(null);
    setFiles([]);
  };

  const handleOpenFolder = (folder: GoogleDriveFile) => {
    if (!token) return;
    const nextFolder = { id: folder.id, name: folder.name };
    setFolderStack(prev => [...prev, nextFolder]);
    setCurrentFolder(nextFolder);
    loadFiles(token, folder.id);
  };

  const handleNavigateBreadcrumb = (index: number) => {
    if (!token) return;
    const target = folderStack[index];
    const newStack = folderStack.slice(0, index + 1);
    setFolderStack(newStack);
    setCurrentFolder(target);
    loadFiles(token, target.id);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    loadFiles(token, currentFolder.id, searchQuery);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newFolderName.trim()) return;
    setIsLoading(true);
    try {
      await createDriveFolder(token, newFolderName.trim(), currentFolder.id);
      setIsNewFolderOpen(false);
      setNewFolderName('');
      await loadFiles(token, currentFolder.id);
    } catch (err: any) {
      setError(err.message || 'Failed to create folder');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setIsUploading(true);
    setError(null);
    try {
      await uploadDriveFile(token, file, currentFolder.id);
      await loadFiles(token, currentFolder.id);
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleConfirmDelete = async () => {
    if (!token || !fileToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDriveFile(token, fileToDelete.id);
      setFileToDelete(null);
      await loadFiles(token, currentFolder.id);
    } catch (err: any) {
      setError(err.message || 'Failed to delete item from Google Drive');
    } finally {
      setIsDeleting(false);
    }
  };

  const getFileIcon = (file: GoogleDriveFile) => {
    if (file.isFolder) return <Folder className="text-amber-400" size={18} />;
    const m = file.mimeType || '';
    if (m.includes('image')) return <Image className="text-emerald-400" size={18} />;
    if (m.includes('video')) return <Video className="text-rose-400" size={18} />;
    if (m.includes('audio')) return <Music className="text-purple-400" size={18} />;
    if (m.includes('pdf') || m.includes('document') || m.includes('text')) return <FileText className="text-sky-400" size={18} />;
    return <File className="text-neutral-400" size={18} />;
  };

  const formatFileSize = (bytes?: string) => {
    if (!bytes) return '--';
    const num = parseInt(bytes, 10);
    if (isNaN(num)) return '--';
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-[#0a0b0e] border border-neutral-800 rounded-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/80 pb-4">
        <div>
          <div className="font-mono text-[9px] text-neutral-400 uppercase tracking-[0.25em] flex items-center gap-2">
            <span>GOOGLE WORKSPACE // DRIVE REPOSITORY</span>
            {token && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse" />
            )}
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight font-heading mt-0.5 flex items-center gap-2.5">
            <HardDrive className="text-sky-400" size={20} />
            <span>Personnel Cloud Storage</span>
          </h2>
          <p className="text-neutral-400 text-xs font-mono mt-1">
            Connected for <strong className="text-neutral-200">{currentUser.name}</strong> ({currentUser.email}) — Private Workspace Vault
          </p>
        </div>

        <div className="flex items-center gap-2">
          {token ? (
            <>
              <button
                type="button"
                onClick={() => loadFiles(token, currentFolder.id)}
                disabled={isLoading}
                className="p-2 bg-[#12141a] border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 rounded-sm transition-all cursor-pointer"
                title="Refresh Files"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              </button>

              <button
                type="button"
                onClick={() => setIsNewFolderOpen(true)}
                className="px-3 py-2 bg-[#14151c] border border-neutral-700 hover:border-white text-white font-mono text-xs uppercase rounded-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <FolderPlus size={14} /> New Folder
              </button>

              <label className="px-3.5 py-2 bg-white text-black font-black font-mono text-xs uppercase tracking-wider rounded-sm hover:bg-neutral-200 transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer">
                <Upload size={14} strokeWidth={3} />
                <span>{isUploading ? 'Uploading...' : 'Upload File'}</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </label>

              <button
                type="button"
                onClick={handleDisconnect}
                className="p-2 bg-[#12141a] border border-neutral-800 text-neutral-400 hover:text-rose-400 hover:border-rose-900 rounded-sm transition-all cursor-pointer"
                title="Disconnect Google Drive"
              >
                <LogOut size={14} />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              disabled={isLoading}
              className="gsi-material-button flex items-center gap-2.5 px-4 py-2 bg-white hover:bg-neutral-100 text-neutral-900 rounded-sm font-semibold text-xs transition-all shadow-md active:scale-95 cursor-pointer border border-neutral-300"
            >
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 shrink-0">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>{isLoading ? 'Connecting...' : 'Connect Google Drive'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-sm text-xs font-mono text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-neutral-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {token ? (
        <div className="space-y-4">
          {/* Breadcrumbs Navigation & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#12141a] p-3 rounded-sm border border-neutral-800">
            {/* Breadcrumb Trail */}
            <div className="flex items-center gap-1.5 flex-wrap font-mono text-xs text-neutral-400">
              <HardDrive size={14} className="text-sky-400 mr-1" />
              {folderStack.map((f, idx) => (
                <React.Fragment key={f.id}>
                  {idx > 0 && <ChevronRight size={12} className="text-neutral-600" />}
                  <button
                    type="button"
                    onClick={() => handleNavigateBreadcrumb(idx)}
                    className={`hover:text-white transition-colors cursor-pointer ${
                      idx === folderStack.length - 1 ? 'text-white font-bold' : 'text-neutral-400'
                    }`}
                  >
                    {f.name}
                  </button>
                </React.Fragment>
              ))}
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  placeholder="SEARCH MY DRIVE..."
                  className="pl-8 pr-3 py-1.5 bg-[#0b0c0f] border border-neutral-800 focus:border-white font-mono text-xs uppercase tracking-wider text-white outline-none rounded-sm placeholder:text-neutral-600 w-48 sm:w-60"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    if (token) loadFiles(token, currentFolder.id);
                  }}
                  className="p-1.5 text-neutral-400 hover:text-white"
                  title="Clear Search"
                >
                  <X size={14} />
                </button>
              )}
            </form>
          </div>

          {/* Files Grid / List */}
          {isLoading ? (
            <div className="py-16 text-center text-neutral-500 font-mono text-xs flex flex-col items-center gap-2">
              <RefreshCw size={24} className="animate-spin text-sky-400" />
              <span>SYNCING GOOGLE DRIVE ASSETS...</span>
            </div>
          ) : files.length === 0 ? (
            <div className="py-16 text-center text-neutral-500 font-mono text-xs uppercase tracking-widest border border-dashed border-neutral-800/80 rounded-sm">
              <HardDrive size={32} className="mx-auto mb-2 opacity-30" />
              <span>Folder is empty</span>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
              {files.map(file => (
                <div
                  key={file.id}
                  className="p-3 bg-[#101217] border border-neutral-800 hover:border-neutral-700 rounded-sm transition-all flex items-center justify-between gap-3 group"
                >
                  <div 
                    className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                    onClick={() => {
                      if (file.isFolder) {
                        handleOpenFolder(file);
                      } else if (file.webViewLink) {
                        window.open(file.webViewLink, '_blank', 'noopener,noreferrer');
                      }
                    }}
                  >
                    <div className="w-8 h-8 rounded-sm bg-[#161822] border border-neutral-800 flex items-center justify-center shrink-0">
                      {getFileIcon(file)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-xs text-white truncate font-medium group-hover:text-sky-300 transition-colors flex items-center gap-2">
                        <span className="truncate">{file.name}</span>
                        {file.isFolder && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-amber-950/70 text-amber-300 border border-amber-500/30 rounded-xs uppercase">
                            Folder
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[10px] text-neutral-500 mt-0.5 flex items-center gap-3">
                        <span>{formatFileSize(file.size)}</span>
                        <span>•</span>
                        <span>{file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : 'Recent'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {onAttachFileToProject && !file.isFolder && (
                      <button
                        type="button"
                        onClick={() => onAttachFileToProject(file)}
                        className="px-2.5 py-1 bg-[#161822] border border-neutral-700 hover:border-white text-sky-300 hover:text-white font-mono text-[10px] uppercase rounded-xs transition-colors"
                        title="Attach to Active Project"
                      >
                        Attach
                      </button>
                    )}

                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xs transition-colors"
                        title="Open in Google Drive"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}

                    {file.webContentLink && !file.isFolder && (
                      <a
                        href={file.webContentLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xs transition-colors"
                        title="Direct Download"
                      >
                        <Download size={14} />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => setFileToDelete(file)}
                      className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-xs transition-colors cursor-pointer"
                      title="Delete from Google Drive"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Not Connected State */
        <div className="bg-[#101217] border border-neutral-800 rounded-sm p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mx-auto">
            <HardDrive size={24} />
          </div>
          <div>
            <h3 className="font-heading font-black text-white text-base uppercase tracking-tight">
              Connect Google Drive Repository
            </h3>
            <p className="text-xs text-neutral-400 max-w-md mx-auto mt-1 font-mono">
              Link your authorized Google Drive with permission to access, upload, organize client creative assets, and synchronize project documents directly in your personal workspace vault.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleConnect}
              disabled={isLoading}
              className="inline-flex items-center gap-2.5 px-6 py-3 bg-white hover:bg-neutral-200 text-black rounded-sm font-black font-mono text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 shrink-0">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>Connect Google Drive</span>
            </button>
          </div>

          <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest pt-2">
            Secure token stored in-memory only. Permission revocable anytime.
          </p>
        </div>
      )}

      {/* CREATE FOLDER MODAL */}
      {isNewFolderOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-[#0b0c0f] border border-neutral-800 rounded-sm w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-[#0e0f14] border-b border-neutral-800 flex justify-between items-center text-white">
              <div>
                <div className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest">DRIVE DIRECTORY PROTOCOL</div>
                <h3 className="text-base font-black uppercase text-white font-heading">Create New Folder</h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsNewFolderOpen(false)} 
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="p-6 space-y-4">
              <div>
                <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Folder Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Campaign Drafts, Brand Guidelines..."
                  className="w-full px-4 py-2.5 bg-[#12141a] border border-neutral-800 font-mono text-xs text-white outline-none focus:border-white rounded-sm"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="pt-3 border-t border-neutral-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewFolderOpen(false)}
                  className="px-4 py-2 font-mono text-xs text-neutral-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 bg-white text-black font-black font-mono text-xs uppercase tracking-wider hover:bg-neutral-200 rounded-sm shadow-md transition-all cursor-pointer"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANDATORY USER CONFIRMATION MODAL FOR DELETING DRIVE FILES (PER WORKSPACE INTEGRATION SKILL) */}
      {fileToDelete && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[210] flex items-center justify-center p-4">
          <div className="bg-[#0b0c0f] border border-neutral-800 rounded-sm w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-[#0e0f14] border-b border-neutral-800 flex justify-between items-center text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-sm bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <Trash2 size={16} />
                </div>
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-neutral-400">DESTRUCTION CONFIRMATION</div>
                  <h3 className="text-base font-black uppercase text-white font-heading">
                    Delete {fileToDelete.isFolder ? 'Folder' : 'File'} from Drive?
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-3 font-mono text-xs">
              <p className="text-neutral-300 leading-relaxed font-sans">
                Are you sure you want to permanently delete this item from your Google Drive? This action will remove it from the cloud repository.
              </p>

              <div className="p-3 bg-[#12141a] border border-neutral-800 rounded-sm space-y-1 text-neutral-400 text-[11px]">
                <div><span className="text-neutral-500 uppercase">Item:</span> <span className="text-white font-bold">{fileToDelete.name}</span></div>
                <div><span className="text-neutral-500 uppercase">Type:</span> <span className="text-neutral-300">{fileToDelete.mimeType}</span></div>
              </div>
            </div>

            <div className="p-4 bg-[#0e0f14] border-t border-neutral-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                className="px-4 py-2 font-mono text-xs text-neutral-400 hover:text-white uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-sm shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleDriveWidget;
