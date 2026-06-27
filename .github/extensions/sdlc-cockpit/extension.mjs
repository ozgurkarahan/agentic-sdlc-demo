// Extension: sdlc-cockpit
// Agentic SDLC Cockpit — live presenter dashboard for the 7-stage agentic lifecycle demo
//
// This single-file skeleton is a starting point. For more complex canvases
// (multiple actions with non-trivial logic, shared state, a custom renderer,
// etc.) prefer splitting things out: move each action handler into its own
// function, extract `open`/`onClose` into helpers, and pull large units
// (renderer assets, schema definitions, shared utilities) into sibling files
// imported from this entry point. Keep extension.mjs focused on wiring.

import { joinSession, createCanvas } from "@github/copilot-sdk/extension";
import { createCockpit } from "./cockpit-core.mjs";

// One Cockpit (local server + state + live runner) per open canvas instance.
const cockpits = new Map();
function get(instanceId) {
    let c = cockpits.get(instanceId);
    if (!c) { c = createCockpit(instanceId); cockpits.set(instanceId, c); }
    return c;
}

const session = await joinSession({
    canvases: [
        createCanvas({
            id: "sdlc-cockpit",
            displayName: "Agentic SDLC Cockpit",
            description:
                "Live presenter dashboard for the agentic SDLC demo: the frozen story + unit waves, the " +
                "7-stage pipeline (intake→plan→implement→test→review→PR→deploy), and every gate's pass/caught " +
                "result with its real enforcement label — wired to `node demos/validate/run.mjs`.",
            inputSchema: {
                type: "object",
                properties: {
                    mode: {
                        type: "string",
                        enum: ["idle", "replay", "live"],
                        description: "Initial state. 'replay' (default) preloads the golden 19/19 snapshot; 'live' runs the real matrix on open; 'idle' shows the empty pipeline.",
                    },
                },
            },
            actions: [
                {
                    name: "cockpit_run",
                    description: "Run the demo gates LIVE via `demos/validate/run.mjs --json` and stream results into the cockpit. Optionally pass a single agent to run just that stage's gate.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            agent: {
                                type: "string",
                                enum: ["planning", "rubber-duck", "orchestrator", "dev-fleet", "quality-test", "security-compliance", "code-review", "deployment"],
                                description: "Optional: run only this agent's gate. Omit to run the full 19-fixture matrix.",
                            },
                        },
                    },
                    handler: async (ctx) => {
                        const s = await get(ctx.instanceId).run(ctx.input?.agent);
                        return { ok: !s.error, mode: s.mode, status: s.status, summary: s.summary, error: s.error || undefined };
                    },
                },
                {
                    name: "cockpit_replay",
                    description: "Load the pre-baked golden snapshot (19/19 fixtures, 10/10 negatives caught) — the presenter fallback. No shell-out.",
                    handler: async (ctx) => {
                        const s = get(ctx.instanceId).replay();
                        return { ok: true, mode: s.mode, summary: s.summary };
                    },
                },
                {
                    name: "cockpit_reset",
                    description: "Reset the cockpit to the empty pipeline (idle).",
                    handler: async (ctx) => {
                        get(ctx.instanceId).reset();
                        return { ok: true };
                    },
                },
                {
                    name: "cockpit_focus",
                    description: "Highlight one stage in the pipeline to narrate it. Pass a stage id (intake/plan/implement/test/review/pr/deploy), or omit to clear.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            stage: {
                                type: "string",
                                enum: ["intake", "plan", "implement", "test", "review", "pr", "deploy"],
                                description: "Stage to highlight; omit to clear the highlight.",
                            },
                        },
                    },
                    handler: async (ctx) => {
                        const s = get(ctx.instanceId).setFocus(ctx.input?.stage);
                        return { ok: true, focus: s.focus };
                    },
                },
            ],
            open: async (ctx) => {
                const c = get(ctx.instanceId);
                const url = await c.start();
                const mode = ctx.input?.mode || "replay";
                if (mode === "live") c.run();
                else if (mode === "idle") c.reset();
                else c.replay();
                try { await session.log(`SDLC Cockpit ready (${mode})`, { ephemeral: true }); } catch { /* noop */ }
                return { title: "Agentic SDLC Cockpit", url, status: `mode: ${mode}` };
            },
            onClose: async (ctx) => {
                const c = cockpits.get(ctx.instanceId);
                if (c) { cockpits.delete(ctx.instanceId); await c.stop(); }
            },
        }),
    ],
});
