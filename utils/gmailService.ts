export interface GmailMessagePreview {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  fromName: string;
  fromEmail: string;
  snippet: string;
  date: string;
  isUnread: boolean;
}

export const fetchRecentEmails = async (
  accessToken: string,
  maxResults = 10
): Promise<GmailMessagePreview[]> => {
  try {
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=in:inbox`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    if (!listRes.ok) {
      if (listRes.status === 401) {
        throw new Error('TOKEN_EXPIRED');
      }
      throw new Error(`Gmail API request failed (${listRes.status})`);
    }

    const listData = await listRes.json();
    if (!listData.messages || !Array.isArray(listData.messages)) {
      return [];
    }

    // Fetch header details for each message in parallel
    const detailPromises = listData.messages.map(async (msgItem: { id: string; threadId: string }) => {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgItem.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      if (!msgRes.ok) return null;
      const data = await msgRes.json();

      const headers = data.payload?.headers || [];
      const getHeader = (name: string) => {
        const h = headers.find((item: any) => item.name?.toLowerCase() === name.toLowerCase());
        return h ? h.value : '';
      };

      const fromRaw = getHeader('From') || 'Unknown Sender';
      const subject = getHeader('Subject') || '(No Subject)';
      const dateRaw = getHeader('Date') || new Date(parseInt(data.internalDate || Date.now().toString())).toLocaleDateString();

      // Parse From field into name and email
      let fromName = fromRaw;
      let fromEmail = fromRaw;
      const match = fromRaw.match(/(.*)<(.*)>/);
      if (match) {
        fromName = match[1].replace(/["']/g, '').trim() || match[2];
        fromEmail = match[2].trim();
      }

      const isUnread = (data.labelIds || []).includes('UNREAD');

      return {
        id: data.id,
        threadId: data.threadId,
        subject,
        from: fromRaw,
        fromName,
        fromEmail,
        snippet: data.snippet ? decodeHtmlEntities(data.snippet) : '',
        date: dateRaw,
        isUnread
      } as GmailMessagePreview;
    });

    const results = await Promise.all(detailPromises);
    return results.filter(Boolean) as GmailMessagePreview[];
  } catch (error) {
    console.error('Error fetching Gmail messages:', error);
    throw error;
  }
};

export const sendGmailMessage = async (
  accessToken: string,
  to: string,
  subject: string,
  body: string
): Promise<{ id: string }> => {
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const messageParts = [
    `To: ${to}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${utf8Subject}`,
    '',
    body
  ];
  const message = messageParts.join('\r\n');

  // Base64url encode
  const encodedMessage = btoa(unescape(encodeURIComponent(message)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: encodedMessage })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to send email (${res.status})`);
  }

  return await res.json();
};

function decodeHtmlEntities(str: string): string {
  const txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value;
}
