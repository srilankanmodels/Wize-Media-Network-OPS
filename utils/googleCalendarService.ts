export interface CalendarAttendee {
  email: string;
  displayName?: string;
  responseStatus?: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  hangoutLink?: string;
  htmlLink?: string;
  attendees?: CalendarAttendee[];
  status?: string;
  colorId?: string;
  transparency?: 'opaque' | 'transparent';
}

export interface GoogleCalendarListEntry {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  backgroundColor?: string;
  foregroundColor?: string;
  accessRole?: string;
  selected?: boolean;
}

export interface FreeBusySlot {
  start: string;
  end: string;
}

export interface FreeBusyResponse {
  timeMin: string;
  timeMax: string;
  calendars: Record<string, { busy: FreeBusySlot[]; errors?: any[] }>;
}

/**
 * 1. CalendarList: List all calendars accessible to the user
 * GET https://www.googleapis.com/calendar/v3/users/me/calendarList
 */
export const fetchUserCalendarList = async (
  accessToken: string
): Promise<GoogleCalendarListEntry[]> => {
  try {
    const url = 'https://www.googleapis.com/calendar/v3/users/me/calendarList';
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      if (res.status === 401) throw new Error('TOKEN_EXPIRED');
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to fetch CalendarList (${res.status})`);
    }

    const data = await res.json();
    return (data.items || []) as GoogleCalendarListEntry[];
  } catch (error) {
    console.error('Error fetching calendar list:', error);
    throw error;
  }
};

/**
 * 2. Events.list: Retrieve events on a specified calendar
 * GET https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events
 */
export const fetchCalendarEvents = async (
  accessToken: string,
  timeMin?: Date,
  timeMax?: Date,
  maxResults = 50,
  calendarId = 'primary'
): Promise<GoogleCalendarEvent[]> => {
  try {
    const minStr = timeMin ? timeMin.toISOString() : new Date(Date.now() - 30 * 86400000).toISOString();
    const maxStr = timeMax ? timeMax.toISOString() : new Date(Date.now() + 90 * 86400000).toISOString();

    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
    url.searchParams.set('timeMin', minStr);
    url.searchParams.set('timeMax', maxStr);
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('maxResults', maxResults.toString());

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('TOKEN_EXPIRED');
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Google Calendar fetch failed (${res.status})`);
    }

    const data = await res.json();
    return (data.items || []) as GoogleCalendarEvent[];
  } catch (error) {
    console.error('Error fetching Google Calendar events:', error);
    throw error;
  }
};

export interface CreateEventParams {
  summary: string;
  description?: string;
  location?: string;
  startDate: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endDate?: string; // YYYY-MM-DD
  endTime?: string; // HH:mm
  isAllDay?: boolean;
  attendees?: { email: string; displayName?: string }[];
  createMeetCall?: boolean;
  colorId?: string;
}

/**
 * 3. Events.insert: Creates an event with optional Google Meet link
 * POST https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events
 */
export const createCalendarEvent = async (
  accessToken: string,
  params: CreateEventParams,
  calendarId = 'primary'
): Promise<GoogleCalendarEvent> => {
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
  url.searchParams.set('sendUpdates', 'all'); // Send email notifications to tagged attendees
  if (params.createMeetCall) {
    url.searchParams.set('conferenceDataVersion', '1');
  }

  let startBody: any;
  let endBody: any;

  if (params.isAllDay) {
    startBody = { date: params.startDate };
    // Google Calendar all-day end date is exclusive, so use endDate or next day
    const nextDay = new Date(params.endDate || params.startDate);
    nextDay.setDate(nextDay.getDate() + 1);
    endBody = { date: nextDay.toISOString().split('T')[0] };
  } else {
    const sTime = params.startTime || '09:00';
    const eTime = params.endTime || '10:00';
    const startIso = new Date(`${params.startDate}T${sTime}:00`).toISOString();
    const endIso = new Date(`${params.endDate || params.startDate}T${eTime}:00`).toISOString();
    startBody = { dateTime: startIso };
    endBody = { dateTime: endIso };
  }

  const body: any = {
    summary: params.summary,
    description: params.description || '',
    location: params.location || '',
    start: startBody,
    end: endBody,
    attendees: (params.attendees || []).map(a => ({
      email: a.email,
      displayName: a.displayName || a.email
    }))
  };

  if (params.colorId) {
    body.colorId = params.colorId;
  }

  if (params.createMeetCall) {
    body.conferenceData = {
      createRequest: {
        requestId: `meet-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' }
      }
    };
  }

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('TOKEN_EXPIRED');
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to create calendar event (${res.status})`);
  }

  return await res.json();
};

/**
 * 4. Events.patch: Partial update for an existing event
 * PATCH https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}
 */
export const patchCalendarEvent = async (
  accessToken: string,
  eventId: string,
  patchData: Partial<CreateEventParams>,
  calendarId = 'primary'
): Promise<GoogleCalendarEvent> => {
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`);
  url.searchParams.set('sendUpdates', 'all');

  const body: any = {};
  if (patchData.summary !== undefined) body.summary = patchData.summary;
  if (patchData.description !== undefined) body.description = patchData.description;
  if (patchData.location !== undefined) body.location = patchData.location;
  if (patchData.colorId !== undefined) body.colorId = patchData.colorId;

  if (patchData.startDate) {
    if (patchData.isAllDay) {
      body.start = { date: patchData.startDate };
      const nextDay = new Date(patchData.endDate || patchData.startDate);
      nextDay.setDate(nextDay.getDate() + 1);
      body.end = { date: nextDay.toISOString().split('T')[0] };
    } else {
      const sTime = patchData.startTime || '09:00';
      const eTime = patchData.endTime || '10:00';
      body.start = { dateTime: new Date(`${patchData.startDate}T${sTime}:00`).toISOString() };
      body.end = { dateTime: new Date(`${patchData.endDate || patchData.startDate}T${eTime}:00`).toISOString() };
    }
  }

  if (patchData.attendees) {
    body.attendees = patchData.attendees.map(a => ({
      email: a.email,
      displayName: a.displayName || a.email
    }));
  }

  const res = await fetch(url.toString(), {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('TOKEN_EXPIRED');
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to patch calendar event (${res.status})`);
  }

  return await res.json();
};

/**
 * 5. Events.quickAdd: Quickly creates an event based on a simple text string
 * POST https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/quickAdd?text=...
 */
export const quickAddCalendarEvent = async (
  accessToken: string,
  text: string,
  calendarId = 'primary'
): Promise<GoogleCalendarEvent> => {
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/quickAdd`);
  url.searchParams.set('text', text);
  url.searchParams.set('sendUpdates', 'all');

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('TOKEN_EXPIRED');
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `QuickAdd failed (${res.status})`);
  }

  return await res.json();
};

/**
 * 6. Events.delete: Deletes an event
 * DELETE https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}
 */
export const deleteCalendarEvent = async (
  accessToken: string,
  eventId: string,
  calendarId = 'primary'
): Promise<boolean> => {
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!res.ok && res.status !== 204 && res.status !== 404) {
    if (res.status === 401) throw new Error('TOKEN_EXPIRED');
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to delete calendar event (${res.status})`);
  }

  return true;
};

/**
 * 7. Freebusy.query: Check availability across team calendars
 * POST https://www.googleapis.com/calendar/v3/freeBusy
 */
export const queryFreeBusy = async (
  accessToken: string,
  timeMin: Date,
  timeMax: Date,
  calendarIds: string[] = ['primary']
): Promise<FreeBusyResponse> => {
  const url = 'https://www.googleapis.com/calendar/v3/freeBusy';
  const body = {
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    items: calendarIds.map(id => ({ id }))
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('TOKEN_EXPIRED');
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Freebusy query failed (${res.status})`);
  }

  return await res.json();
};

/**
 * 8. Colors.get: Fetch event and calendar color definitions
 * GET https://www.googleapis.com/calendar/v3/colors
 */
export const fetchCalendarColors = async (
  accessToken: string
): Promise<{ event: Record<string, { background: string; foreground: string }>; calendar: Record<string, { background: string; foreground: string }> }> => {
  const url = 'https://www.googleapis.com/calendar/v3/colors';
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('TOKEN_EXPIRED');
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Fetch colors failed (${res.status})`);
  }

  return await res.json();
};

