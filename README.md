# Expense Sheet

A small web app that appends rows to a Google Sheet. You sign in with Google,
paste a spreadsheet link, and the app builds a form from that sheet's header
row. Submitting adds one row to the bottom of the chosen tab.

It is **write-only**: it never reads your existing rows back. The only reads it
makes are structural — the list of tabs, and row 1 for the column names.

## How it works

```
Browser ──▶ Next.js API route ──▶ Google Sheets API
             (access token stays      (acts as you, via OAuth)
              server-side, in an
              encrypted JWT cookie)
```

The Google access token is never exposed to the browser. It lives in the
encrypted session cookie and is read only inside API routes
(`lib/token.ts`), which is also where an expired token is refreshed.

## Setup

### 1. Google Cloud Console

1. Create a project at <https://console.cloud.google.com>.
2. **APIs & Services → Library →** enable **Google Sheets API**.
3. **APIs & Services → OAuth consent screen →** choose **External**, fill in the
   required fields, and add your own Google account under **Test users**.
   Newer consoles show this as **Google Auth Platform**, split into
   **Branding**, **Audience** and **Clients** tabs — test users live under
   **Audience**.

   Then **publish the app** (Audience tab → **Publish app**). This matters:
   while publishing status is **Testing**, Google expires refresh tokens after
   7 days, so you would be signed out roughly weekly. Publishing stops that.
   You will see an "unverified app" warning at sign-in — click **Advanced → Go
   to app**. Going through Google's verification review is only needed to
   remove that warning or to support more than 100 users.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID →
   Web application.** Add these authorized redirect URIs:

   - `http://localhost:3000/api/auth/callback/google`
   - `https://<your-app>.vercel.app/api/auth/callback/google`

   Copy the client ID and client secret.

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill it in:

| Variable | What it is |
| --- | --- |
| `AUTH_GOOGLE_ID` | OAuth client ID from step 1 |
| `AUTH_GOOGLE_SECRET` | OAuth client secret from step 1 |
| `AUTH_SECRET` | Cookie encryption key — `openssl rand -base64 32` |
| `AUTH_URL` | `http://localhost:3000` locally, your real URL in production |
| `ALLOWED_EMAILS` | Comma-separated allowlist of Google accounts that may sign in |

`AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` come from step 1. The rest you set
yourself — generate a **different** `AUTH_SECRET` for production than the one
you use locally.

`ALLOWED_EMAILS` matters, and it matters more once you publish the app: at
that point Google's test-user list no longer gates anything, so *any* Google
account could reach your deployed URL. Anyone not on the allowlist is refused
straight after Google sign-in. Set it.

### 3. Run it

```bash
npm install
npm run dev
```

## Deploying to Vercel

1. Import this repository at <https://vercel.com/new>. Next.js is detected
   automatically; no build settings to change.
2. Add all five environment variables in **Project → Settings → Environment
   Variables**, with `AUTH_URL` set to your `https://<your-app>.vercel.app` URL.
3. Deploy.
4. Go back to the Google credential from step 1 and make sure the
   `https://<your-app>.vercel.app/api/auth/callback/google` redirect URI is
   listed. Missing this is what produces a `redirect_uri_mismatch` error, and
   it is the step most people forget.

## Using it

1. Sign in with Google.
2. Paste a Google Sheets link. The app remembers it on that device, so you only
   do this once.
3. Pick a tab. The form is generated from that tab's header row.
4. Untick any column you want to leave blank, fill in the rest, and submit.
   The app confirms with the row number it wrote to.

Values are sent with Google's `USER_ENTERED` mode, so dates, numbers and
formulas are interpreted exactly as if you had typed them into the sheet.

## Field types

Columns are still read from row 1, but recognised column names get a better
control than a plain text box. Matching is case-insensitive and ignores
punctuation, so `Paid By`, `paid_by` and `PAID BY` all behave the same.

| Column name contains | Control | Notes |
| --- | --- | --- |
| `date`, `day`, `when` | Date picker | Prefilled with today |
| `person`, `paid by`, `who`, `member`, `spender`, `payer` | Dropdown | Options: **Mou**, **Sunny** |
| `category`, `kind` | Text | |
| `description`, `details`, `note`, `item`, `purpose` | Multi-line text | |
| `amount`, `price`, `cost`, `total`, `spend`, `taka`, `bdt` | Number | Accepts decimals |
| anything else | Text | |

All of this lives in [`lib/field-types.ts`](lib/field-types.ts). To change the
dropdown names, edit the `PEOPLE` array. To turn Category into a dropdown too,
change its rule to `{ type: "select", options: ["Food", "Transport", ...] }`.

Columns that match nothing still get a text input, so a sheet with completely
different headers keeps working.

## Project layout

```
app/
  page.tsx                         sign-in gate and app shell
  api/auth/[...nextauth]/route.ts  Auth.js handlers
  api/sheet/meta/route.ts          spreadsheet title + tab names
  api/sheet/headers/route.ts       row 1 of a tab
  api/sheet/append/route.ts        append one row
components/
  SheetApp.tsx                     state: chosen sheet, tab, headers
  SheetPicker.tsx                  link input and tab dropdown
  EntryForm.tsx                    generated form
lib/
  field-types.ts                   column name -> input type mapping
  auth.ts                          Auth.js config, refresh, email allowlist
  token.ts                         server-side access-token read + refresh
  sheets.ts                        Sheets client, A1 quoting, error messages
  sheet-url.ts                     Sheets URL → spreadsheet ID
```

## Scopes

Only `https://www.googleapis.com/auth/spreadsheets` (plus `openid`, `email`,
`profile`). No Drive scope is requested, so the app cannot browse your Drive —
it can only touch spreadsheets you paste a link to. Google offers no
append-only Sheets scope, so read/write is the narrowest option available.
