<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Telegram notifications: bot subscribers live in `public.bot_subscribers`, added by the `/api/public/telegram/webhook` route when a user sends `/start` to the bot; the daily collector (and the admin "collect now" button) sends the fresh-tenders summary to all subscribers via the connector gateway. Why: chat IDs can only be learned from the bot conversation, never hardcoded.
- Telegram webhook auth: `X-Telegram-Bot-Api-Secret-Token` must equal base64url SHA-256 of `telegram-webhook:$TELEGRAM_API_KEY`. Why: the registered secret must be re-derivable server-side without storing a second secret.
- Admin payment recording uses an authenticated, admin-checked atomic database function with a retry-safe payment ID and extends from the later of now or existing expiry. Why: payment history and access must never diverge or double-charge on retry.
- Admin phone edits update both the Auth login identity and profile through a protected server function. Why: changing a display phone alone would break the expected login number.
- Admin forms share client-safe validation rules with protected server functions. Why: browser and server must enforce the same payment and identity inputs.
- Source creation and edits use shared public-HTTPS validation and authenticated admin-checked server functions; original publisher attribution remains separate from collection branding. Why: source management must not obscure provenance or accept local-network URLs.

