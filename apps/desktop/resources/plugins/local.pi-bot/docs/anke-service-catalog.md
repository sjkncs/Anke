# Anke service catalog

The service launcher includes Wealth Management (`wealth`) and Career Planning
(`career`) alongside the existing thirteen services. Each opens its persistent
service bot chat. Wealth Management joins the living service room; Career
Planning joins the campus and work room.

Roster version 2 adds these members to version 1 profiles once, preserving
existing chats, custom instructions and deleted older service members.

The matching artwork uses the existing seeded sketch drawing script:
`python scripts/draw-service-icons.py`, then
`node scripts/embed-service-artwork.mjs`. The embedded image module is required
because the renderer module protocol does not serve separate PNG requests.

Verify migration with `node --test tests/anke-services.cjs` and launcher behavior
with `node --test tests/service-launcher-ui.cjs`.

## Visual workspaces

The launcher includes the supplied Niulai shared dashboard inside a closable
Anke view. WorldMonitor's homepage forbids third-party frames, so its entry uses
Anke's existing managed browser login window instead. Switching workspace or
mode removes the embedded dashboard. Neither entry imports remote instructions
or automatically links financial accounts.
