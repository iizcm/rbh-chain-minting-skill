---
name: rbh-chain-minting
description: Mint / snipe / verify NFTs & tokens on Robinhood Chain (RBH, chainId 4663). Covers contract probing, the RBH-RPC "false success" gotcha (verify on-chain — never trust status:1), SeaDrop-vs-direct mint detection, minting via the OpenSea UI with an in-page injected wallet (Playwright), and sweeping many sub-wallets into one primary. Use whenever a user gives an RBH contract and wants to mint, snipe, or confirm a mint actually landed.
---

# RBH Chain Minting

## When to use
- User provides an RBH contract address and wants to mint / snipe.
- User says "mint succeeded" but supply or their balance didn't move.
- Minting through the OpenSea UI on RBH.
- Consolidating many sub-wallet balances into one primary.

## CRITICAL RULE — never trust RPC success status
The RBH public RPC (`https://rpc.mainnet.chain.robinhood.com/`) routinely returns `status:1` / no error for transactions that **silently revert**. A `sendTransaction` that "succeeds" may never land on-chain. ALWAYS verify after any mint attempt:
- `balanceOf(minter)` on the NFT contract (ERC721/1155) — must increase.
- `totalSupply()` — must increase by the minted qty.
- Cross-check via Blockscout API (`https://robinhoodchain.blockscout.com/api`): `account/tokenlist?address=...` and `account/txlist?address=...`. The RPC can lie; Blockscout reflects reality.
If `balanceOf` stays 0 but the RPC said ok → the tx reverted (gate / silent revert). Do NOT report success. (User explicitly caught a false-success report this way — "jujur ngga ada yang ke mint".)

## Step 1 — Probe the contract
- Read `totalSupply()`, `balanceOf(owner)`, `name()`, `symbol()` via an ethers `Contract`.
- If `getCode` length ≈ 45 bytes → it's an EIP-1167 minimal proxy. Find the impl at the standard proxy slot `0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc`; read calls still hit the proxy address.
- Find the mint selector: pull `account/txlist` to the contract from Blockscout, group by `input.slice(0,10)`, pick the dominant non-standard selector. Example seen: `0xa22cb465` = `mint(address to, uint256 qty)`.
- Decode a successful minter's tx: `arg1` = recipient (`0x`+rest[24:64]), `arg2` = qty (`0x`+rest[64:128]).

## Step 2 — SeaDrop or direct?
- SeaDrop address on RBH: `0x00005EA00Ac477B1030CE78506496e8C2dE24bf5`. Check its `getCode` length (deployed?). Then check `account/txlist` TO SeaDrop for `mintPublic` (selector `0x8c221977`) targeting your NFT, and `account/txlist` on the NFT for any tx `from:SeaDrop`. If both are 0 → mint is DIRECT (`token.mint`), not SeaDrop. Don't build SeaDrop calldata.
- If OpenSea shows "MINTING NOW / Freemint stage / LIMIT N PER WALLET" but direct raw `mint()` calls revert silently → the contract likely gates `mint` (allowlist / active-stage flag / signature). Un-gated wallets fail. Fix: owner whitelists the wallets, OR mint through the OS UI with a real/recognized wallet.

## Step 3 — Minting via OpenSea UI (Playwright)
OpenSea rejects a fake/injected `window.ethereum`: the "Connect with OpenSea" modal closes itself → "User closed modal". Two paths:
1. **Real MetaMask extension** loaded into the browser context (most reliable; needs the extension binary + per-wallet import).
2. **In-page injected wallet** (works if OS detection is loose): inject `ethers.umd.min.js` + a provider shim that derives the address LOCALLY from the private key. NEVER call `eth_accounts` on the RPC to populate the address — RBH RPC returns `[]` and OS aborts the connect. Sign txs in-page with `new ethers.Wallet(pk).signTransaction(tx)`, broadcast via `eth_sendRawTransaction` to the RPC.
   - **CSP pitfall**: a localhost HTTP server (`127.0.0.1:PORT`) is blocked by OpenSea's Content-Security-Policy (`Refused to connect`). Do NOT proxy through a local server — sign and RPC-call entirely inside `page.addInitScript` / `evaluate`.
   - Set `isMetaMask:true`, implement `isConnected()`, handle `eth_requestAccounts` by returning the locally-derived address, and dispatch `eip6963:announceProvider`.
- If "User closed modal" persists even with injection, fall back to option 1 or contract whitelisting.

## Step 4 — Wallet sweep (consolidate sub balances)
To move all sub-wallet ETH to one address:
- For each wallet: `bal = getBalance(addr)`; `gp = getFeeData().gasPrice * 110n / 100n` (pad 10% — RBH base fee drifts and `max fee < base fee` errors are common); `gas = gp * 21000n`; if `bal <= gas` skip; else send `bal - gas` with `gasLimit: 21000`.
- RPC glitches ("could not coalesce error") are transient — retry with backoff.
- Sweeping does NOT move NFTs; if wallets hold NFTs, transfer them separately or they stay on the source wallet.

## Pitfalls
- RBH RPC lies about tx success → verify with `balanceOf` / `totalSupply` / Blockscout.
- `eth_accounts` on RBH RPC returns `[]` → never use it to set the injected wallet's address; derive from PK.
- Localhost fetch from an OS page is CSP-blocked.
- Base fee can rise between `getFeeData` and broadcast → pad gasPrice 10%.
- Don't assume SeaDrop just because OS shows a mint — verify which path is live.
- When swapping primary/sub in `sybil_wallets.json`: pull the target sub out, append the old primary as a new sub with `idx = subs.length`, re-sort by idx.

## References
- `references/robingeckos-case.md` — full worked case: contract `0x3bbb…d47ebbd`, selector `0xa22cb465`, false-success diagnosis, Blockscout queries, Playwright injection flow.
- `scripts/verify_mint.js` — drop-in verifier: given contract + wallet addresses, prints `totalSupply`, per-wallet `balanceOf`, and decodes recent mint txs. Run before/after any mint to prove it landed.
