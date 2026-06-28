// S2 acceptance ORACLE — a REQUEST-CONTRACT (deliberately NOT 429).
//
// Why this file matters to the harness: it adopts the reusable request-contract oracle and
// supplies S2's own cases. The eval-rubric runner + the validator stay 100% scenario-agnostic;
// the fact that a 400-JSON contract runs through the exact same machinery that S1's 429 used
// IS the proof that Loop-2's generalization worked.

import { makeRequestContractRubric } from '../../ci/scripts/rubrics/request-contract.mjs';

// MAX_URL_LEN is exported to the app process by the runner (from meta.env below) so the good
// variant and this oracle agree on the threshold. Default 2048 keeps them consistent even
// before the env is set (module-load time).
const MAX_URL_LEN = Number(process.env.MAX_URL_LEN ?? 2048);
const overlongUrl = 'https://example.com/' + 'a'.repeat(MAX_URL_LEN + 64);

export const { meta, evaluate } = makeRequestContractRubric({
  kind: 'input-validation-contract',
  defaults: { route: '/shorten', method: 'POST' },
  env: { MAX_URL_LEN: String(MAX_URL_LEN) },
  cases: [
    {
      name: 'valid-url',
      body: { url: 'https://example.com/a-normal-link' },
      asserts: [
        // Control: a legitimate url must still be accepted (201 + a short code). A variant
        // that breaks this is a FALSE-BLOCK, which the harness must also reject.
        { check: 'accepts_valid_url', status: 201, jsonKey: 'code', signal: 'valid-url-not-accepted' },
      ],
    },
    {
      name: 'overlong-url',
      body: { url: overlongUrl },
      asserts: [
        // The discriminator: the app ALONE accepts an over-long url (201). Only a correct
        // guard rejects it with 400.
        { check: 'rejects_overlong_url', status: 400, signal: 'overlong-url-not-rejected' },
        // The contract-quality assertion: the 400 must carry a JSON { error } body, not plain text.
        { check: 'overlong_error_is_json', status: 400, jsonKey: 'error', signal: 'overlong-error-not-json' },
      ],
    },
  ],
});
