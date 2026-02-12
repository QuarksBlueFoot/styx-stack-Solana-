/**
 * Umbra API — Comprehensive Test Suite
 * 
 * Starts the SPS Indexer server and exercises every Umbra API endpoint.
 * Validates responses match expected shapes.
 */

const BASE = 'http://localhost:3100';
const V1 = `${BASE}/v1`;

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

let passed = 0;
let failed = 0;
let skipped = 0;

async function rpc(method: string, params: any = {}) {
  const res = await fetch(V1, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  return res.json();
}

async function rest(path: string, body: any = {}) {
  const res = await fetch(`${V1}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function get(path: string) {
  const res = await fetch(`${V1}/${path}`);
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('json')) return res.json();
  return res.text();
}

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.error(`  ❌ ${name}${detail ? ': ' + detail : ''}`);
    failed++;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WAIT FOR SERVER
// ═══════════════════════════════════════════════════════════════════════════════

async function waitForServer(maxWait = 30000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITES
// ═══════════════════════════════════════════════════════════════════════════════

async function testHealth() {
  console.log('\n[1] Health & Info Endpoints');

  // Root health
  const rootHealth = await (await fetch(`${BASE}/health`)).json();
  assert('GET /health returns ok', rootHealth.status === 'ok');
  assert('Health has program ID', !!rootHealth.program);

  // Umbra health
  const umbraHealth = await get('health');
  assert('GET /v1/health returns ok', umbraHealth.status === 'ok');
  assert('Umbra health has api=Umbra', umbraHealth.api === 'Umbra');

  // Methods listing
  const methods = await get('methods');
  assert('GET /v1/methods returns method lists', !!methods.zkCompression);
  assert('Methods has das array', Array.isArray(methods.das));
  assert('Methods has styx extensions', Array.isArray(methods.styx));

  // llms.txt
  const llmsTxt = await get('llms.txt');
  assert('GET /v1/llms.txt returns text', typeof llmsTxt === 'string' && llmsTxt.includes('Umbra'));
  assert('llms.txt has all sections', llmsTxt.includes('Account Queries') && llmsTxt.includes('Styx Privacy Extensions'));
}

async function testAccountQueries() {
  console.log('\n[2] ZK Compression — Account Queries');

  // getCompressedAccount
  const r1 = await rpc('getCompressedAccount', { hash: 'nonexistent123' });
  assert('getCompressedAccount returns result', r1.result !== undefined);
  assert('getCompressedAccount has context.slot', r1.result?.context?.slot !== undefined);
  assert('getCompressedAccount value is null for missing', r1.result?.value === null);

  // getCompressedAccountProof
  const r2 = await rpc('getCompressedAccountProof', { hash: 'abc123' });
  assert('getCompressedAccountProof returns result', r2.result !== undefined);
  assert('Proof has hash field', r2.result?.value?.hash === 'abc123');

  // getCompressedAccountsByOwner
  const r3 = await rpc('getCompressedAccountsByOwner', { owner: '11111111111111111111111111111111' });
  assert('getCompressedAccountsByOwner returns list', r3.result?.value?.items !== undefined);
  assert('Items is an array', Array.isArray(r3.result?.value?.items));

  // getMultipleCompressedAccounts
  const r4 = await rpc('getMultipleCompressedAccounts', { hashes: ['aaa', 'bbb'] });
  assert('getMultipleCompressedAccounts returns items', Array.isArray(r4.result?.value?.items));
  assert('Items length matches input', r4.result?.value?.items?.length === 2);
}

async function testBalanceQueries() {
  console.log('\n[3] ZK Compression — Balance Queries');

  const r1 = await rpc('getCompressedBalance', { hash: 'deadbeef' });
  assert('getCompressedBalance returns result', r1.result !== undefined);
  assert('Balance has value string', typeof r1.result?.value?.value === 'string');

  const r2 = await rpc('getCompressedBalanceByOwner', { owner: '11111111111111111111111111111111' });
  assert('getCompressedBalanceByOwner returns result', r2.result !== undefined);
  assert('Owner balance has value', r2.result?.value?.value !== undefined);
}

async function testTokenAccountQueries() {
  console.log('\n[4] ZK Compression — Token Account Queries');

  const r1 = await rpc('getCompressedTokenAccountsByOwner', { owner: '11111111111111111111111111111111' });
  assert('getCompressedTokenAccountsByOwner returns list', Array.isArray(r1.result?.value?.items));

  const r2 = await rpc('getCompressedTokenAccountsByDelegate', { delegate: '11111111111111111111111111111111' });
  assert('getCompressedTokenAccountsByDelegate returns list', Array.isArray(r2.result?.value?.items));

  const r3 = await rpc('getCompressedTokenAccountBalance', { hash: 'deadbeef' });
  assert('getCompressedTokenAccountBalance returns amount', typeof r3.result?.value?.amount === 'string');

  const r4 = await rpc('getCompressedTokenBalancesByOwner', { owner: '11111111111111111111111111111111' });
  assert('getCompressedTokenBalancesByOwner returns balances', Array.isArray(r4.result?.value?.tokenBalances));

  const r5 = await rpc('getCompressedTokenBalancesByOwnerV2', { owner: '11111111111111111111111111111111' });
  assert('V2 returns balances array', Array.isArray(r5.result?.value?.tokenBalances));

  const r6 = await rpc('getCompressedMintTokenHolders', { mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' });
  assert('getCompressedMintTokenHolders returns list', Array.isArray(r6.result?.value?.items));
}

async function testProofQueries() {
  console.log('\n[5] ZK Compression — Proof Queries');

  const r1 = await rpc('getMultipleCompressedAccountProofs', { hashes: ['a', 'b', 'c'] });
  assert('getMultipleCompressedAccountProofs returns array', Array.isArray(r1.result?.value));
  assert('Proof count matches input', r1.result?.value?.length === 3);

  const r2 = await rpc('getMultipleNewAddressProofs', { addresses: ['x', 'y'] });
  assert('getMultipleNewAddressProofs returns array', Array.isArray(r2.result?.value));

  const r3 = await rpc('getMultipleNewAddressProofsV2', { addresses: ['x'] });
  assert('V2 address proofs returns array', Array.isArray(r3.result?.value));

  const r4 = await rpc('getValidityProof', { hashes: ['abc'] });
  assert('getValidityProof returns compressedProof', r4.result?.value?.compressedProof !== undefined);
}

async function testSignatureQueries() {
  console.log('\n[6] ZK Compression — Signature Queries');

  const r1 = await rpc('getCompressionSignaturesForAccount', { hash: 'abc' });
  assert('getCompressionSignaturesForAccount returns list', Array.isArray(r1.result?.value?.items));

  const r2 = await rpc('getCompressionSignaturesForAddress', { address: '11111111111111111111111111111111' });
  assert('getCompressionSignaturesForAddress returns list', Array.isArray(r2.result?.value?.items));

  const r3 = await rpc('getCompressionSignaturesForOwner', { owner: '11111111111111111111111111111111' });
  assert('getCompressionSignaturesForOwner returns list', Array.isArray(r3.result?.value?.items));

  const r4 = await rpc('getCompressionSignaturesForTokenOwner', { owner: '11111111111111111111111111111111' });
  assert('getCompressionSignaturesForTokenOwner returns list', Array.isArray(r4.result?.value?.items));

  const r5 = await rpc('getLatestCompressionSignatures', { limit: 5 });
  assert('getLatestCompressionSignatures returns list', Array.isArray(r5.result?.value?.items));

  const r6 = await rpc('getLatestNonVotingSignatures', { limit: 5 });
  assert('getLatestNonVotingSignatures returns list', Array.isArray(r6.result?.value?.items));
}

async function testTransactionQueries() {
  console.log('\n[7] ZK Compression — Transaction Queries');

  const r1 = await rpc('getTransactionWithCompressionInfo', { signature: '5KWKXjUSK9z2DiTASctHCKiW9atzyt5BfxUXTX3uYyerNveaVnFtHw3ixjTz6bKrZpuqTbcGZ4ot7TdT91UMD5wv' });
  assert('getTransactionWithCompressionInfo returns result', r1.result !== undefined);
  assert('Has compressionInfo', r1.result?.value?.compressionInfo !== undefined);
  assert('Has explorerUrl', typeof r1.result?.value?.explorerUrl === 'string');
}

async function testIndexerStatus() {
  console.log('\n[8] Indexer Status');

  const r1 = await rpc('getIndexerHealth');
  assert('getIndexerHealth returns ok', r1.result === 'ok');

  const r2 = await rpc('getIndexerSlot');
  assert('getIndexerSlot returns number', typeof r2.result === 'number');
}

async function testDasApi() {
  console.log('\n[9] DAS API');

  // getAsset — missing ID should error
  const r1 = await rpc('getAsset', { id: 'nonexistent_nft_000' });
  assert('getAsset returns error for missing', r1.error !== undefined || r1.result?.error !== undefined);

  // getAssetProof
  const r2 = await rpc('getAssetProof', { id: 'test' });
  assert('getAssetProof returns stub', r2.result !== undefined);

  // getAssetsByOwner
  const r3 = await rpc('getAssetsByOwner', { ownerAddress: '11111111111111111111111111111111' });
  assert('getAssetsByOwner returns items', Array.isArray(r3.result?.items));
}

async function testNftEndpoints() {
  console.log('\n[10] NFT REST Endpoints');

  const r1 = await rest('getCompressedNftsByOwner', { owner: '11111111111111111111111111111111' });
  assert('getCompressedNftsByOwner returns list', Array.isArray(r1?.value?.items));

  const r2 = await rest('getCompressedNft', { id: 'nonexistent_nft' });
  assert('getCompressedNft returns null for missing', r2?.value === null);

  const r3 = await rest('getCompressedNftsByCollection', { collection: 'test_collection' });
  assert('getCompressedNftsByCollection returns list', Array.isArray(r3?.value?.items));
}

async function testStyxExtensions() {
  console.log('\n[11] Styx Privacy Extensions');

  const r1 = await rpc('getShieldedNotesByOwner', { owner: '72yk7xuPFqEfVCWmfGZdJKXGSD9v9eEoZZTZVhpkJN3D' });
  assert('getShieldedNotesByOwner returns list', Array.isArray(r1.result?.value?.items));

  const r2 = await rpc('getNullifierStatus', { nullifier: 'deadbeefdeadbeef' });
  assert('getNullifierStatus returns spent field', r2.result?.value?.spent !== undefined);
  assert('Nullifier not spent', r2.result?.value?.spent === false);

  // Batch nullifiers
  const r3 = await rpc('getNullifierStatus', { nullifiers: ['aaa', 'bbb'] });
  assert('Batch nullifier returns array', Array.isArray(r3.result?.value));

  const r4 = await rpc('getPrivacyPoolStats', {});
  assert('getPrivacyPoolStats returns stats', r4.result?.value?.totalPools !== undefined);
  assert('Stats has totalEvents', typeof r4.result?.value?.totalEvents === 'number');
}

async function testUnknownMethod() {
  console.log('\n[12] Error Handling');

  const r1 = await rpc('nonExistentMethod', {});
  assert('Unknown method returns error', r1.error !== undefined);
  assert('Error code is -32601', r1.error?.code === -32601);
}

async function testRestParity() {
  console.log('\n[13] REST Endpoint Parity');

  // Every JSON-RPC method should also work as a REST POST
  const r1 = await rest('getCompressedAccount', { hash: 'test123' });
  assert('REST getCompressedAccount works', r1?.context?.slot !== undefined || r1?.value !== undefined);

  const r2 = await rest('getLatestCompressionSignatures', { limit: 3 });
  assert('REST getLatestCompressionSignatures works', r2?.value?.items !== undefined);

  const r3 = await rest('getNullifierStatus', { nullifier: 'test' });
  assert('REST getNullifierStatus works', r3?.value?.spent !== undefined);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('  UMBRA API — COMPREHENSIVE TEST SUITE');
  console.log('════════════════════════════════════════════════════════════════');

  console.log('\nWaiting for server on port 3100...');
  const ready = await waitForServer(25000);
  if (!ready) {
    console.error('❌ Server did not start. Run `npx tsx src/server.ts` in services/sps-indexer first.');
    process.exit(1);
  }
  console.log('✅ Server is up.');

  await testHealth();
  await testAccountQueries();
  await testBalanceQueries();
  await testTokenAccountQueries();
  await testProofQueries();
  await testSignatureQueries();
  await testTransactionQueries();
  await testIndexerStatus();
  await testDasApi();
  await testNftEndpoints();
  await testStyxExtensions();
  await testUnknownMethod();
  await testRestParity();

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  console.log('════════════════════════════════════════════════════════════════');

  if (failed > 0) process.exit(1);
}

main().catch(console.error);
