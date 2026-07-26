// verify_mint.js — prove a mint actually landed on RBH.
// Usage: node verify_mint.js <NFT_CONTRACT> <WALLET1> [WALLET2 ...]
// Prints totalSupply, per-wallet balanceOf, and decodes recent mint txs.
const { ethers } = require("ethers");

const RPC = "https://rpc.mainnet.chain.robinhood.com/";
const BS = "https://robinhoodchain.blockscout.com/api";
const abi = ["function totalSupply() view returns (uint256)",
             "function balanceOf(address) view returns (uint256)"];

(async () => {
  const C = process.argv[2];
  const wallets = process.argv.slice(3);
  if (!C) { console.log("usage: node verify_mint.js <contract> <wallet...>"); process.exit(1); }
  const prov = new ethers.JsonRpcProvider(RPC);
  const c = new ethers.Contract(C, abi, prov);

  const ts = await c.totalSupply();
  console.log("totalSupply:", ts.toString());

  for (const w of wallets) {
    const bal = await c.balanceOf(w);
    // cross-check Blockscout
    const url = `${BS}?module=account&action=tokenlist&address=${w}`;
    let bsBal = "?";
    try {
      const j = await fetch(url).then(r => r.json());
      const t = (j.result || []).find(x => x.contractAddress?.toLowerCase() === C.toLowerCase());
      bsBal = t ? t.balance : "0";
    } catch (e) {}
    console.log(`  ${w.slice(0,12)} | RPC bal=${bal} | Blockscout bal=${bsBal} ${bal>0n?"✅":"❌"}`);
  }

  // decode recent mint txs from this contract
  const txUrl = `${BS}?module=account&action=txlist&address=${C}&page=1&offset=20&sort=desc`;
  const txs = (await fetch(txUrl).then(r => r.json())).result || [];
  const mintSel = "0xa22cb465";
  const mintTxs = txs.filter(t => t.input?.toLowerCase().startsWith(mintSel));
  console.log(`\nmint-tx (${mintSel}) found: ${mintTxs.length}`);
  mintTxs.slice(0, 5).forEach(t => {
    const rest = t.input.slice(10);
    const to = "0x" + rest.slice(24, 64);
    const qty = ethers.toBigInt("0x" + rest.slice(64, 128));
    console.log(`  ${t.hash.slice(0,12)} from=${t.from.slice(0,10)} to=${to.slice(0,10)} qty=${qty}`);
  });
  console.log("\nIf RPC bal=0 but you sent a tx: it reverted silently. RBH RPC lies about success.");
})();
