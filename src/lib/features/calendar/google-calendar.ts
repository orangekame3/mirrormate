import { google, calendar_v3 } from "googleapis";

export interface CalendarEvent {
  summary: string;
  start: Date;
  end: Date;
}

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !privateKey) {
    throw new Error("Google Calendar credentials not configured");
  }

  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  });
}

function parseEventDate(
  eventDateTime: calendar_v3.Schema$EventDateTime | undefined
): Date {
  if (!eventDateTime) {
    return new Date();
  }
  if (eventDateTime.dateTime) {
    return new Date(eventDateTime.dateTime);
  }
  if (eventDateTime.date) {
    return new Date(eventDateTime.date);
  }
  return new Date();
}

export async function fetchTodayEvents(
  calendarId: string,
  maxResults: number
): Promise<CalendarEvent[]> {
  const auth = getAuth();
  const calendar = google.calendar({ version: "v3", auth });

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const response = await calendar.events.list({
    calendarId,
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: "startTime",
  });

  return (response.data.items || []).map((event) => ({
    summary: event.summary || "無題の予定",
    start: parseEventDate(event.start),
    end: parseEventDate(event.end),
  }));
}

export async function fetchUpcomingEvents(
  calendarId: string,
  maxResults: number
): Promise<CalendarEvent[]> {
  const auth = getAuth();
  const calendar = google.calendar({ version: "v3", auth });

  const now = new Date();

  const response = await calendar.events.list({
    calendarId,
    timeMin: now.toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: "startTime",
  });

  return (response.data.items || []).map((event) => ({
    summary: event.summary || "無題の予定",
    start: parseEventDate(event.start),
    end: parseEventDate(event.end),
  }));
}
