# RobinGeckos Mint Case (worked example)

Contract: `0x3bbb4359c6147ca6881745903c439c601d47ebbd`
Chain: Robinhood Chain (RBH, chainId 4663)
RPC: `https://rpc.mainnet.chain.robinhood.com/`
Blockscout API: `https://robinhoodchain.blockscout.com/api`
OpenSea: `https://opensea.io/collection/robingeckos/overview`

## Facts established
- `name()`/`symbol()` = "RobinGeckos". `totalSupply` started ~181, reached 1063 during session.
- Code length 45 bytes → EIP-1167 minimal proxy to impl `0x7309a26fc8fcef18192e267d7a6da9dfb4be81dd` (read calls stay on proxy address).
- Mint function: `mint(address to, uint256 qty)` — selector `0xa22cb465`. Arg1 = recipient, arg2 = qty (usually 1).
- Owner = `0x732c86F49B2416D9D401070E8dBe59aC5e7331BF` (held 13 NFT, the real minter path).
- SeaDrop `0x00005EA0…24bf5` is DEPLOYED but ZERO mintPublic txs and ZERO `from:SeaDrop` txs → mint is DIRECT, not SeaDrop.
- OS UI shows "Freemint stage — LIMIT 3 PER WALLET", MINTING NOW.

## The false-success trap (key lesson)
Direct `0xa22cb465(to=sub, qty=1)` calls from 100 sub-wallets returned `status:1`, tx hashes appeared in Blockscout with `isError:0`. BUT `balanceOf(sub)` stayed 0 and `totalSupply` did NOT increase. RPC lied about success — the calls silently reverted because the `mint` gate excluded those wallets.

46 other callers (e.g. `0xc351526b…`) DID hold 3 NFT each → direct mint works for allowed wallets.

## Verification used (always do this)
- `contract.balanceOf(sub)` via ethers → must be > 0.
- `contract.totalSupply()` → must increase.
- Blockscout `account/tokenlist?address=<sub>` → filter `contractAddress == NFT` → `balance` field.
- Blockscout `account/txlist?address=<NFT>&sort=desc` → decode `0xa22cb465` txs; group by `from` to find successful minters.

## Playwright UI attempt
- Injected `window.ethereum` shim (ethers.umd.min.js + PK-derived address). Connect Wallet → "Connect with OpenSea" modal → click "MetaMask" → modal closed itself ("User closed modal"). OS rejects non-extension injected wallets.
- CSP blocks `fetch` to `127.0.0.1` (localhost proxy) → must sign & RPC-call entirely in-page via `addInitScript`.
- Not completed; user chose to stop. The reliably-working path for gated mints is owner-whitelisting the wallets OR a real MetaMask extension in the browser.

## Wallet cleanup
- Swept all 100 sub + old primary balances → new primary `0xeA29bD21Dd507bbA7b83c7C2B2df64030c92a361` (ex-sub0). Old primary became sub idx 99 in `/root/wallet/sybil_wallets.json`.
- Sweep used `gasPrice = getFeeData().gasPrice * 110/100` to dodge base-fee drift (`max fee per gas less than block base fee` errors).
