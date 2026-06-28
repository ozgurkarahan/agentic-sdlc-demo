// Scenario S1 acceptance oracle. Each scenario OWNS its rubric; S1's is the shared
// burst-threshold rate-limit rubric (429 at the threshold + numeric Retry-After).
// A different scenario (e.g. S2 input-validation) ships its own rubric.mjs instead —
// the runner and validator stay scenario-agnostic.
export { evaluate, meta } from '../../ci/scripts/rubrics/rate-limit.mjs';
