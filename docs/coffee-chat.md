# Coffee & conversation

Visit `/#coffee` or choose **Coffee** in the menu. The page uses the portfolio's shared menu, theme controls, spray-paint heading, Rubik body text, and monochrome palette. One compact form asks for a place, time, name, and email. Choose a café from the dropdown or map, or choose **Online · Google Meet** in the same dropdown. The map is an original illustration with approximate locations; the selected café links to Google Maps for navigation. Café addresses and hours were checked against official location pages on November 4, 2026:

- [Saint Frank](https://www.saintfrankcoffee.com/pages/our-locations): Russian Hill and Menlo Park.
- [Timeless Coffee](https://timelesscoffee.com/pages/locations): Piedmont Avenue, Oakland.
- [Chromatic Coffee](https://www.chromaticcoffee.com/pages/visit): Lincoln Avenue, San Jose. Its official page lists conflicting suite numbers, so the invitation uses the street address.

## Connect Google Calendar

The website uses its own server-side Google authorization. A Google Calendar connection in ChatGPT does not grant the deployed website credentials.

1. In [Google Cloud Console](https://console.cloud.google.com/), enable Google Calendar API and configure an OAuth consent screen and a Web application OAuth client. Only the host authorizes this client; guests do not need to sign in.
2. Obtain a refresh token for the host account using Google's [OAuth Playground](https://developers.google.com/oauthplayground/). In the settings, select **Use your own OAuth credentials**, enter your client ID and secret, and add `https://developers.google.com/oauthplayground` as an authorized redirect URI for that client. Request `https://www.googleapis.com/auth/calendar.events` and `https://www.googleapis.com/auth/calendar.freebusy`. Authorize, exchange the code, and store the refresh token privately. See Google's [offline authorization guidance](https://developers.google.com/identity/protocols/oauth2/web-server). Google testing-mode refresh tokens may expire after seven days; configure an appropriate production consent status before launch.
3. Copy the variables from `.env.coffee.example` into `.env.local` for development and into your host's environment settings for production. Never commit credentials. Use the host's primary calendar for Google Meet support; check that Meet is enabled for that account. Add other busy calendars to `GOOGLE_BUSY_CALENDAR_IDS` if needed.
4. Review the proposed schedule: Monday–Friday, starts from 10am through 2pm Pacific, 30-minute chats, 30-minute buffers, 24-hour notice, and a rolling 14-day horizon. Hours remain a draft until the host confirms them. Set `COFFEE_BOOKING_ENABLED=true` only after that review and authorization. Restart the dev server after changing variables.
5. Deploy the frontend **and** `api/coffee.ts` using Vercel's Vite preset (or an equivalent Node server adapter). Static-only hosting cannot run bookings. Preview with `npm run dev -- --port 3001`; the Vite plugin serves the same handler locally. `vite preview` serves static assets only.
6. Before public launch, configure a persistent rate limit on `POST /api/coffee` in your hosting firewall. The form includes a honeypot, but that alone does not prevent targeted invitation spam. Make one authorized real booking for each format, verify the invitation, time, address/Meet link, and conflict handling, then cancel those tests from Calendar.

With booking disabled or missing credentials, sample slots are explicitly marked as previews and submission is disabled. Upstream errors never become confirmed bookings. No calendar event titles or busy-event details are sent to the browser.

## Booking behavior

`GET /api/coffee` checks free/busy and returns available slots only. `POST /api/coffee` validates the guest, café, mode, and offered start time, checks free/busy again, and inserts an event with `sendUpdates=all`. Virtual events request a unique Google Meet conference. Meet creation can be asynchronous; the guest receives it in the invitation. Dates use the IANA Pacific time zone, including daylight-saving changes.

A stable event ID derived from the slot causes concurrent insertions for that same slot to conflict at Google. Google free/busy plus event insertion is not an atomic transaction with unrelated calendar writers; an event created outside this site during that interval can still race. Deleted event IDs may remain reserved by Google, so a canceled slot can continue returning a conflict. A request timeout after insertion has an uncertain outcome: check Calendar before retrying; the UI never claims success without a successful insert response. Production-grade public abuse protection belongs in the hosting firewall as described above.

The guest's name and email are stored in the calendar event, not in browser storage. Guests can reply to the invitation or email the host to change plans. There is no separate cancellation database or self-service cancellation endpoint. Booking a chat does not reserve seating at a café.

## Verification

`npx tsc --noEmit`, `npm run build`, and `node --test tests/coffee-calendar.test.mjs` (Node 22+) cover the feature. The tests transpile only the small server modules using the repository's TypeScript dependency and use mocked Google responses; they do not create real events. Browser review should cover desktop/mobile, both themes, map pins and the place dropdown, virtual mode, date/time selection, form validation, preview messaging, keyboard access, and error states.
