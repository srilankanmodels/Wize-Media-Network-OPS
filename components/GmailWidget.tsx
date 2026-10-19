import React, { useState, useEffect, useCallback } from 'react';
import { StaffMember } from '../types';
import { 
  googleSignIn, 
  getAccessToken, 
  logoutGoogle, 
  initAuth 
} from '../firebase';
import { 
  fetchRecentEmails, 
  sendGmailMessage, 
  GmailMessagePreview 
} from '../utils/gmailService';
import { 
  Mail, RefreshCw, Send, CheckCircle2, AlertCircle, ExternalLink, 
  Search, X, Plus, LogOut, ShieldCheck, Clock, Inbox, User, Sparkles
} from 'lucide-react';

interface GmailWidgetProps {
  currentUser: StaffMember;
}

const GmailWidget: React.FC<GmailWidgetProps> = ({ currentUser }) => {
  const [token, setToken] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<any | null>(null);
  const [emails, setEmails] = useState<GmailMessagePreview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<GmailMessagePreview | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // Compose form state
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showSendConfirmation, setShowSendConfirmation] = useState(false);

  // Initialize Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, cachedToken) => {
        setGoogleUser(user);
        setToken(cachedToken);
        loadEmails(cachedToken);
      },
      () => {
        setGoogleUser(null);
        setToken(null);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const loadEmails = async (accessToken: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const messages = await fetchRecentEmails(accessToken, 8);
      setEmails(messages);
    } catch (err: any) {
      if (err.message === 'TOKEN_EXPIRED') {
        setToken(null);
        setError('Google Workspace session expired. Please sign in again.');
      } else {
        setError('Failed to fetch inbox messages. Verify permissions.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectGmail = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setGoogleUser(result.user);
        await loadEmails(result.accessToken);
      }
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      setError(err.message || 'Google authorization was cancelled or failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await logoutGoogle();
    setToken(null);
    setGoogleUser(null);
    setEmails([]);
  };

  const handleInitiateSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo.trim() || !composeSubject.trim()) return;
    // Show mandatory explicit confirmation dialog
    setShowSendConfirmation(true);
  };

  const handleConfirmSend = async () => {
    if (!token) return;
    setIsSending(true);
    setShowSendConfirmation(false);
    try {
      await sendGmailMessage(token, composeTo.trim(), composeSubject.trim(), composeBody.trim());
      setIsComposeOpen(false);
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      // Reload inbox after transmission
      await loadEmails(token);
    } catch (err: any) {
      setError(`Failed to send email: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const filteredEmails = emails.filter(em => 
    em.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    em.fromName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    em.fromEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    em.snippet.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-[#0a0b0e] border border-neutral-800 rounded-sm p-6 space-y-6">
      {/* Widget Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/80 pb-4">
        <div>
          <div className="font-mono text-[9px] text-neutral-400 uppercase tracking-[0.25em] flex items-center gap-2">
            <span>GOOGLE WORKSPACE // GMAIL INTEGRATION</span>
            {token && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse" />
            )}
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight font-heading mt-0.5 flex items-center gap-2.5">
            <Mail className="text-rose-500" size={20} />
            <span>Personnel Inbox & Comms</span>
          </h2>
          <p className="text-neutral-400 text-xs font-mono mt-1">
            Connected for <strong className="text-neutral-200">{currentUser.name}</strong> ({currentUser.email})
          </p>
        </div>

        <div className="flex items-center gap-2">
          {token ? (
            <>
              <button
                type="button"
                onClick={() => loadEmails(token)}
                disabled={isLoading}
                className="p-2 bg-[#12141a] border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 rounded-sm transition-all cursor-pointer"
                title="Refresh Inbox"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              </button>

              <button
                type="button"
                onClick={() => setIsComposeOpen(true)}
                className="px-3.5 py-2 bg-white text-black font-black font-mono text-xs uppercase tracking-wider rounded-sm hover:bg-neutral-200 transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
              >
                <Plus size={14} strokeWidth={3} /> Compose
              </button>

              <button
                type="button"
                onClick={handleDisconnect}
                className="p-2 bg-[#12141a] border border-neutral-800 text-neutral-400 hover:text-rose-400 hover:border-rose-900 rounded-sm transition-all cursor-pointer"
                title="Disconnect Google Account"
              >
                <LogOut size={14} />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleConnectGmail}
              disabled={isLoading}
              className="gsi-material-button flex items-center gap-2.5 px-4 py-2 bg-white hover:bg-neutral-100 text-neutral-900 rounded-sm font-semibold text-xs transition-all shadow-md active:scale-95 cursor-pointer border border-neutral-300"
            >
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 shrink-0">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>{isLoading ? 'Connecting...' : 'Connect Gmail'}</span>
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

      {/* Connected State vs Not Connected Banner */}
      {token ? (
        <div className="space-y-4">
          {/* Active Account Identity Pill */}
          <div className="flex items-center justify-between bg-[#12141a] px-3.5 py-2 rounded-sm border border-neutral-800 text-[11px] font-mono">
            <div className="flex items-center gap-2 text-neutral-300 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-neutral-400">Authenticated:</span>
              <strong className="text-white truncate">{googleUser?.email || currentUser.email}</strong>
            </div>
            <div className="text-[10px] text-neutral-500 uppercase tracking-widest shrink-0">
              {emails.length} INBOX ARTIFACTS
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="FILTER MESSAGES BY SENDER, SUBJECT, OR KEYWORD..."
              className="w-full pl-9 pr-4 py-2 bg-[#12141a] border border-neutral-800 focus:border-white font-mono text-xs uppercase tracking-wider text-white outline-none rounded-sm transition-colors placeholder:text-neutral-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Messages List */}
          {isLoading ? (
            <div className="py-12 text-center text-neutral-500 font-mono text-xs flex flex-col items-center gap-2">
              <RefreshCw size={24} className="animate-spin text-rose-400" />
              <span>SYNCHRONIZING SECURE GMAIL STREAM...</span>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 font-mono text-xs uppercase tracking-widest border border-dashed border-neutral-800/80 rounded-sm">
              <Inbox size={32} className="mx-auto mb-2 opacity-30" />
              <span>No matching Gmail messages found</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
              {filteredEmails.map(email => (
                <div
                  key={email.id}
                  onClick={() => setSelectedEmail(email)}
                  className={`p-3.5 rounded-sm border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    email.isUnread
                      ? 'bg-[#14161f] border-neutral-700 hover:border-neutral-500'
                      : 'bg-[#101217] border-neutral-800/80 hover:border-neutral-700'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {email.isUnread && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      )}
                      <span className={`font-mono text-xs truncate ${email.isUnread ? 'text-white font-bold' : 'text-neutral-300'}`}>
                        {email.fromName}
                      </span>
                      <span className="text-[10px] text-neutral-500 font-mono truncate hidden md:inline">
                        &lt;{email.fromEmail}&gt;
                      </span>
                    </div>
                    <div className={`text-xs mt-1 truncate ${email.isUnread ? 'text-white font-semibold' : 'text-neutral-200'}`}>
                      {email.subject}
                    </div>
                    <div className="text-[11px] text-neutral-400 truncate mt-0.5 font-sans">
                      {email.snippet}
                    </div>
                  </div>

                  <div className="text-right font-mono text-[10px] text-neutral-400 shrink-0 self-end sm:self-center">
                    {email.date}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Not Connected State */
        <div className="bg-[#101217] border border-neutral-800 rounded-sm p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <Mail size={24} />
          </div>
          <div>
            <h3 className="font-heading font-black text-white text-base uppercase tracking-tight">
              Connect Google Workspace for {currentUser.name}
            </h3>
            <p className="text-xs text-neutral-400 max-w-md mx-auto mt-1 font-mono">
              Authorize Gmail with permission to sync real-time client directives, stakeholder inquiries, and dispatch communications directly from your workspace dashboard.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleConnectGmail}
              disabled={isLoading}
              className="inline-flex items-center gap-2.5 px-6 py-3 bg-white hover:bg-neutral-200 text-black rounded-sm font-black font-mono text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 shrink-0">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>Connect with Google</span>
            </button>
          </div>

          <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest pt-2">
            Secure token stored in-memory only. Permission revocable anytime.
          </p>
        </div>
      )}

      {/* EMAIL PREVIEW MODAL */}
      {selectedEmail && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-[#0b0c0f] border border-neutral-800 rounded-sm w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-[#0e0f14] border-b border-neutral-800 flex justify-between items-start text-white">
              <div className="min-w-0 pr-4">
                <div className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest">GMAIL MESSAGE INSPECTOR</div>
                <h3 className="text-base font-black text-white uppercase font-heading mt-0.5 truncate">
                  {selectedEmail.subject}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedEmail(null)} 
                className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 font-mono text-xs">
              <div className="p-3 bg-[#12141a] border border-neutral-800 rounded-sm space-y-1.5 text-neutral-300">
                <div><span className="text-neutral-500 uppercase">From:</span> <strong className="text-white">{selectedEmail.from}</strong></div>
                <div><span className="text-neutral-500 uppercase">Date:</span> <span>{selectedEmail.date}</span></div>
                <div><span className="text-neutral-500 uppercase">Thread ID:</span> <span className="text-neutral-400 text-[10px]">{selectedEmail.threadId}</span></div>
              </div>

              <div className="p-4 bg-[#101217] border border-neutral-800/80 rounded-sm text-neutral-200 font-sans text-xs leading-relaxed max-h-[300px] overflow-y-auto custom-scrollbar">
                {selectedEmail.snippet || '(No message body available)'}
              </div>
            </div>

            <div className="p-4 bg-[#0e0f14] border-t border-neutral-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setComposeTo(selectedEmail.fromEmail);
                  setComposeSubject(`Re: ${selectedEmail.subject}`);
                  setSelectedEmail(null);
                  setIsComposeOpen(true);
                }}
                className="px-4 py-2 bg-[#14151c] border border-neutral-700 text-neutral-200 hover:text-white rounded-sm font-mono text-xs uppercase flex items-center gap-1.5 cursor-pointer"
              >
                <Send size={12} /> Reply Directly
              </button>
              <button
                type="button"
                onClick={() => setSelectedEmail(null)}
                className="px-4 py-2 text-xs font-mono text-neutral-400 hover:text-white uppercase cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPOSE EMAIL MODAL */}
      {isComposeOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-[#0b0c0f] border border-neutral-800 rounded-sm w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-[#0e0f14] border-b border-neutral-800 flex justify-between items-center text-white">
              <div>
                <div className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest">OUTBOUND DISPATCH</div>
                <h3 className="text-base font-black uppercase text-white font-heading">Compose Email via Gmail</h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsComposeOpen(false)} 
                className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleInitiateSend} className="p-6 space-y-4">
              <div>
                <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">To (Recipient Email) *</label>
                <input
                  required
                  type="email"
                  placeholder="recipient@domain.com"
                  className="w-full px-4 py-2.5 bg-[#12141a] border border-neutral-800 font-mono text-xs text-white outline-none focus:border-white rounded-sm"
                  value={composeTo}
                  onChange={e => setComposeTo(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Subject *</label>
                <input
                  required
                  type="text"
                  placeholder="Operational directive / update..."
                  className="w-full px-4 py-2.5 bg-[#12141a] border border-neutral-800 font-mono text-xs text-white outline-none focus:border-white rounded-sm"
                  value={composeSubject}
                  onChange={e => setComposeSubject(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Message Body *</label>
                <textarea
                  required
                  rows={5}
                  placeholder="Write your email body text here..."
                  className="w-full px-4 py-2.5 bg-[#12141a] border border-neutral-800 font-mono text-xs text-white outline-none focus:border-white rounded-sm resize-none"
                  value={composeBody}
                  onChange={e => setComposeBody(e.target.value)}
                />
              </div>

              <div className="pt-3 border-t border-neutral-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  className="px-4 py-2 font-mono text-xs text-neutral-400 hover:text-white cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-6 py-2.5 bg-white text-black font-black font-mono text-xs uppercase tracking-wider hover:bg-neutral-200 rounded-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Send size={14} /> Proceed to Send
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANDATORY USER CONFIRMATION MODAL FOR SENDING EMAIL (PER WORKSPACE INTEGRATION SKILL) */}
      {showSendConfirmation && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[210] flex items-center justify-center p-4">
          <div className="bg-[#0b0c0f] border border-neutral-800 rounded-sm w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-[#0e0f14] border-b border-neutral-800 flex justify-between items-center text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-sm bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <Send size={16} />
                </div>
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-neutral-400">TRANSMISSION CONFIRMATION</div>
                  <h3 className="text-base font-black uppercase text-white font-heading">Authorize Outbound Email</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSendConfirmation(false)}
                className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-3 font-mono text-xs">
              <p className="text-neutral-300 leading-relaxed font-sans">
                Are you sure you want to send this email via your connected Gmail account (<strong className="text-white">{googleUser?.email || currentUser.email}</strong>)?
              </p>

              <div className="p-3 bg-[#12141a] border border-neutral-800 rounded-sm space-y-1 text-neutral-400 text-[11px]">
                <div><span className="text-neutral-500 uppercase">To:</span> <span className="text-white font-bold">{composeTo}</span></div>
                <div><span className="text-neutral-500 uppercase">Subject:</span> <span className="text-white">{composeSubject}</span></div>
              </div>
            </div>

            <div className="p-4 bg-[#0e0f14] border-t border-neutral-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSendConfirmation(false)}
                className="px-4 py-2 font-mono text-xs text-neutral-400 hover:text-white uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSend}
                disabled={isSending}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-sm shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                {isSending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                Confirm & Dispatch Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GmailWidget;
