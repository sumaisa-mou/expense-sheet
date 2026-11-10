export const metadata = { title: "Privacy Policy – Expense Sheet" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-10 text-sm leading-relaxed">
      <h1 className="text-2xl font-semibold">Privacy Policy</h1>
      <p>Last updated: November 2026</p>
      <p>
        Expense Sheet is a personal tool that lets you add and view rows in a
        Google Sheet that you choose.
      </p>
      <h2 className="pt-2 text-lg font-semibold">What we access</h2>
      <p>
        When you sign in with Google, the app requests your email address,
        basic profile, and permission to read and edit your Google Sheets
        spreadsheets. This access is used only to show your sheet&apos;s
        columns and recent transactions, and to append new rows you submit.
      </p>
      <h2 className="pt-2 text-lg font-semibold">What we store</h2>
      <p>
        The app does not have a database and does not store your spreadsheet
        data. Your sign-in session, including the tokens needed to talk to
        Google on your behalf, is kept in an encrypted cookie in your browser.
      </p>
      <h2 className="pt-2 text-lg font-semibold">Sharing</h2>
      <p>
        We do not sell, share, or transfer your data to any third party. Data
        is only exchanged between your browser, this app&apos;s server, and
        Google&apos;s APIs.
      </p>
      <h2 className="pt-2 text-lg font-semibold">Revoking access</h2>
      <p>
        You can sign out at any time, and revoke the app&apos;s access at{" "}
        <a
          className="underline"
          href="https://myaccount.google.com/permissions"
        >
          myaccount.google.com/permissions
        </a>
        .
      </p>
      <p>
        This app&apos;s use of information received from Google APIs adheres to
        the Google API Services User Data Policy, including the Limited Use
        requirements.
      </p>
    </main>
  );
}
