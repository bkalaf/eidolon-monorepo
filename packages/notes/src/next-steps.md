//chats/next-steps.md
Hook this pipeline into the GameMachine night flow: create jobs for Spy/Widow, render the developer artifact, wait for socket ACKs/timeouts, and persist the artifact/phase mapping in Mongo.
Expand the realtime layer: expose screenshot:show/ack, storyteller misinfo requests, and dev/replay artifact APIs along with the client modal/pop-out/replay views.
Finish the wiki parsing script updates (summary merging, reminder scaffolding, night-logic tokens) so downstream data consumers can rely on the richer schema.

Hook this pipeline into the GameMachine night flow: create jobs for Spy/Widow, render the developer artifact, wait for socket ACKs/timeouts, and persist the artifact/phase mapping in Mongo.
Expand the realtime layer: expose screenshot:show/ack, storyteller misinfo requests, and dev/replay artifact APIs along with the client modal/pop-out/replay views.
Finish the wiki parsing script updates (summary merging, reminder scaffolding, night-logic tokens) so downstream data consumers can rely on the richer schema.
Tests not run (not requested).

-------------------------

Add a tailored compilerConfig.json when you want to tune thresholds or force overrides for edge-case roles.
Wire this script into package automation (e.g., an npm script) so catalog generation can be rerun as needed.
Spot-check generated specs/reports and adjust the phrase lists if roles need finer-grained heuristics.

------------------------

Set XSTATE_LOG_DIR, SOCKET_LOG_DIR, and SCREENSHOT_LOG_DIR so each service writes to the desired directory.


----------------------

write a shell script to do the following task and it should prepend the following to each message so that the tails can be distinguished in a single terminal:

Task: 
Tail a log file for each service after starting the app to confirm permissions, truncation behavior, and that timestamps/durations appear as expected.

for the xstate log "XSTATE    : "
for the screenshot log "PUPPETER  : "
for the socketio log "SOCKETIO  : "

------------------------

Hook your host-facing “start game” control to useStartGame and read the new useIsCreatingGame selector so the UI actually sends the WS RPC and disables the button while it waits for START_GAME_RESULT.
Consider a small data migration or on-read normalization that upgrades any stored 'in_match' room docs to 'in_game' so all clients eventually see the new status, and sweep any remaining occurrences of “match” language that still need renaming.

-------------------------

Run syncAvatarsFromDisk (and/or schedule it) so Mongo has the current static catalog before the UI queries it.
Rebuild/proxy the production server to validate that the static middleware and profile route work under the real runtime.
(Optional) Run existing test suites or add targeted integration checks for the new server functions if you need automated coverage.
Tests were not run (not requested).