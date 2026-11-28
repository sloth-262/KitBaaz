# KitBaaz order sheet (Google Apps Script)

`Code.gs` turns the **KitBaaz Orders** Google Sheet into the order system:

- receives orders from the website and adds a row with an order ID like `KB-261126-001`
- writes a Bangla customer message draft and a "WhatsApp-এ পাঠান" link for every order
- refreshes the draft when the Status changes (and fills Advance paid / Delivery date)
- emails a new-order alert (plus Telegram and the agent webhook, if set up)
- records the TrxID a customer enters on the thank-you page, and alerts you to check it
- keeps a Summary tab: orders per status, advance collected, kits to order

Do every step while signed in to the **KitBaaz Google account**, so the sheet,
script and alert emails all belong to KitBaaz.

## 1. Add the script

1. Open the **KitBaaz Orders** sheet.
2. **Extensions > Apps Script**.
3. Name the project **KitBaaz Orders** (top left).
4. Delete everything in `Code.gs`, paste the contents of [`Code.gs`](Code.gs), and press **Save** (Ctrl+S).
5. **Project Settings** (gear icon) > tick **Show "appsscript.json" manifest file in editor**.
   Back in the editor, open `appsscript.json`, replace it with [`appsscript.json`](appsscript.json), and save.

## 2. Set up the sheet

1. Go back to the sheet and **reload the page**. A **KitBaaz** menu appears after a few seconds.
2. **KitBaaz > Set up sheet**.
3. Google asks for permission. Choose the KitBaaz account, then
   **Advanced > Go to KitBaaz Orders (unsafe) > Allow**. "Unsafe" only means Google has not
   reviewed this private script; it is your own code.
4. Run **KitBaaz > Set up sheet** again if it stopped at the permission step.
5. A popup shows `ORDER_WEBHOOK_SECRET = ...`. Copy it somewhere safe (the password manager).
   You can show it again any time with **KitBaaz > Show website secret**.

You now have three tabs: **Orders**, **Summary**, **Settings**.

## 3. Fill in Settings

In the **Settings** tab, fill in the **Value** column:

| Setting | Example |
|---|---|
| Alert email | already set to the KitBaaz email; add more with commas |
| bKash number | `01XXXXXXXXX` |
| Nagad number | `01XXXXXXXXX` |
| Rocket number | `01XXXXXXXXXX` (12 digits: the mobile number plus one digit) |
| Bank name | `Dutch-Bangla Bank (DBBL)` |
| Bank account name | name on the account |
| Bank account number | |
| Bank branch | |
| Bank routing number | needed for transfers from other banks |
| Bank card number | optional |
| Facebook page | `https://facebook.com/...` |

Until a payment number is filled in, message drafts show `[নম্বর লিখুন]` ("write the number") so it is obvious.

This is the only place payment details are kept. The message drafts use them, and the website's
thank-you page reads them from here (it keeps a copy for up to 5 minutes, so a change shows on
the site within 5 minutes). An empty setting makes the page say "we will call you with the number".
A bank is shown on the site once **Bank name** and an account or card number are filled in.

## 4. Try it inside the sheet

**KitBaaz > Send a test order**. A `TEST` row appears in Orders, and an alert email arrives.
Change its **Status** to `Advance received` and watch the draft message change.
Delete the test row afterwards.

## 5. Publish it as a web app

1. In the Apps Script editor: **Deploy > New deployment**.
2. Gear icon > **Web app**.
3. Description: `KitBaaz orders`. **Execute as: Me**. **Who has access: Anyone**.
4. **Deploy**, then copy the **Web app URL** (it ends in `/exec`).

"Anyone" is needed so the website can reach it. It only accepts orders that carry the secret.

## 6. Connect the website

**On your computer** (for `npm run dev`): copy `.dev.vars.example` to `.dev.vars` and set

```
ORDER_WEBHOOK_URL=https://script.google.com/macros/s/.../exec
ORDER_WEBHOOK_SECRET=<the secret from step 2>
```

Restart `npm run dev`, open http://localhost:4321/order and place an order.
It should appear in the sheet within a few seconds, with an alert email.
(Kits without a price use a Tk 4,500 test price, locally and on the live site while `testPrices` is on in `src/data/site.ts`. Those orders show `website-test` in Source.)

**On Cloudflare** (the live site):

```
npx wrangler secret put ORDER_WEBHOOK_URL
npx wrangler secret put ORDER_WEBHOOK_SECRET
```

## Changing the script later

1. Paste the new `Code.gs` and save.
2. **Deploy > Manage deployments > pencil icon > Version: New version > Deploy**.
   The URL stays the same. Without this step the website keeps using the old version.
3. In the sheet: **KitBaaz > Set up sheet**. This adds any new columns at the end and
   refreshes formats and the Summary tab. Existing orders are not touched.

## Confirming advance payments

The website never confirms a payment by itself. You do, in the bKash / Nagad / Rocket app or
your bank statement.

1. After paying, the customer can enter their **TrxID** and the number they paid from on the
   thank-you page. For a **bank transfer** a bank's message has no phone number, so the page asks
   instead for the bank's **reference number** (saved in the TrxID column) and **the sender's
   name and bank** (saved in Paid from). Match those and the amount in your bank app or statement. It lands in the **TrxID**, **Paid from** and **Payment claimed at** columns,
   which turn **bright yellow** while the status is still `Pre-order`, and you get a
   "পেমেন্ট দাবি" email. The Summary tab counts these under "Payments to check".
2. Open the bKash / Nagad / Rocket app (or bank statement) and find that TrxID. Check the **amount** matches **Advance due**.
3. If it matches: set **Status** to `Advance received` (fix **Advance paid** if the amount differs),
   then send the updated draft with **WhatsApp-এ পাঠান**. The yellow goes away.
4. If it does not match, or there is no such TrxID: leave the status, and call the customer.

Customers who do not use the box can send the TrxID on WhatsApp; type it into the **TrxID** column yourself.

## Optional: Telegram alerts

1. In Telegram, message **@BotFather**, send `/newbot`, and follow the steps. Copy the **token**.
2. Send any message to your new bot.
3. Open `https://api.telegram.org/bot<TOKEN>/getUpdates` in a browser and find `"chat":{"id": ...}`.
4. Apps Script editor > **Project Settings > Script properties > Add**:
   `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.

## Script properties

| Property | Set by | Purpose |
|---|---|---|
| `WEBHOOK_SECRET` | Set up sheet | Shared secret with the website |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | you (optional) | Telegram alerts |
| `AGENT_WEBHOOK_URL`, `AGENT_WEBHOOK_SECRET` | you (Day 5) | `order.created` and `payment.claimed` events for the agent |
| `seq_YYMMDD` | the script | Order number counter per day. Do not edit. |

## Rules for the Orders tab

- Do not rename the column headers. Columns can be moved, and new columns can be added at the end.
- Change **Status** with the dropdown. Setting `Advance received` fills **Advance paid** with the
  advance due (edit it if the customer paid a different amount). Setting `Delivered` fills **Delivery date**.
- **Balance** is a formula (Price - Advance paid). Do not type over it.
- Messages are drafts. Read them before tapping **WhatsApp-এ পাঠান**.

## Tests

`npm run test:apps-script` runs `Code.gs` against an in-memory imitation of Google Sheets.
