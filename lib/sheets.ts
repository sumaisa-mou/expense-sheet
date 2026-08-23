import { google, type sheets_v4 } from "googleapis";

export function sheetsClient(accessToken: string): sheets_v4.Sheets {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.sheets({ version: "v4", auth });
}

/**
 * A1 notation treats several characters as syntax, and a quote inside a tab
 * name has to be doubled. Without this, a tab called "Q1 ' 24" breaks the range.
 */
export function quoteTabName(tab: string): string {
  return `'${tab.replace(/'/g, "''")}'`;
}

type GoogleError = { code?: number; status?: number; message?: string };

/** Turn Google's API errors into something worth showing a user. */
export function describeGoogleError(error: unknown): {
  status: number;
  message: string;
} {
  const err = error as GoogleError;
  const code = err?.code ?? err?.status;

  if (code === 401) {
    return {
      status: 401,
      message: "Google rejected the session. Please sign out and sign in again.",
    };
  }
  if (code === 403) {
    return {
      status: 403,
      message:
        "Your Google account does not have access to this spreadsheet, or the Sheets API is not enabled for the project.",
    };
  }
  if (code === 404) {
    return {
      status: 404,
      message: "No spreadsheet found with that ID. Check the link and try again.",
    };
  }
  if (code === 429) {
    return {
      status: 429,
      message: "Google rate-limited the request. Wait a moment and try again.",
    };
  }

  return {
    status: 500,
    message: err?.message ?? "Something went wrong talking to Google Sheets.",
  };
}
