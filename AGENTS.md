<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

- Read and update `roadmap.md` on every change: it is the single source of truth for game progress.
- Keep canvas drawing cheap: draw food from pre-baked small sprites (never the full-size art), avoid `shadowBlur` in the render loop (use stacked translucent strokes instead), and cull the arena rim when it is off-screen. Full-size blits and per-frame blur cost more than the whole game loop.
- Keep arena food lifecycle rules in `src/lib/food.ts`, with bounded expiring death loot and no boost spawning, so all worms share tested clutter limits.
- Render worms with world-distance sampled cached segment sprites, shared by matches and wardrobe previews, to keep shading consistent and cheap.
- Run match simulation at a fixed 60 Hz and cap canvas pixel density independently of device resolution, so refresh rates do not alter game speed or overwhelm mobile rendering.
- Gate game mounting on decoded shared artwork through the asset loader, so both rotation and lobby appear only when assets are ready.
- Keep temporary power durations and bounded pickup lifecycle in `src/lib/powers.ts`; share icon paths between HUD vectors and pre-baked arena sprites to avoid per-frame icon rasterization.
- Keep guest gold wallets behind hashed secret capabilities and atomic service-only database actions; clients never set balances, prices or rewards, and no anonymous Auth signup is needed.
- Keep weather and kill-chain rules in pure tested modules; warn strikes before applying nonlethal damage equally to bots, and render fog/reactions from small baked sprites.
