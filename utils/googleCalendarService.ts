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
}

export const fetchCalendarEvents = async (
  accessToken: string,
  timeMin?: Date,
  timeMax?: Date,
  maxResults = 50
): Promise<GoogleCalendarEvent[]> => {
  try {
    const minStr = timeMin ? timeMin.toISOString() : new Date(Date.now() - 30 * 86400000).toISOString();
    const maxStr = timeMax ? timeMax.toISOString() : new Date(Date.now() + 90 * 86400000).toISOString();

    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
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
}

export const createCalendarEvent = async (
  accessToken: string,
  params: CreateEventParams
): Promise<GoogleCalendarEvent> => {
  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
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

export const deleteCalendarEvent = async (
  accessToken: string,
  eventId: string
): Promise<boolean> => {
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=all`;
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
