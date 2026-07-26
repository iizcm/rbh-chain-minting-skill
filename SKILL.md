---
name: rbh-chain-minting
description: "Mint / snipe / verify NFTs & tokens on Robinhood Chain (RBH, chainId 4663). Covers contract probing, the RBH-RPC "false success" gotcha (verify on-chain — never trust status:1), SeaDrop-vs-direct mint detection, minting via the OpenSea UI with an in-page injected wallet (Playwright), and sweeping many sub-wallets into one primary. Use whenever a user gives an RBH contract and wants to mint, snipe, or confirm a mint actually landed."
version: 1.0.0
author: Community
license: MIT
platforms: [linux, macos, windows]
tags: [general]
---

# Rbh Chain Minting — Skill

Mint / snipe / verify NFTs & tokens on Robinhood Chain (RBH, chainId 4663). Covers contract probing, the RBH-RPC "false success" gotcha (verify on-chain — never trust status:1), SeaDrop-vs-direct mint detection, minting via the OpenSea UI with an in-page injected wallet (Playwright), and sweeping many sub-wallets into one primary. Use whenever a user gives an RBH contract and wants to mint, snipe, or confirm a mint actually landed.

## Install

```bash
cp -r <skill-name> ~/.hermes/skills/<skill-path>/
```

Or clone this repository:

```bash
git clone https://github.com/iizcm/rbh-chain-minting-skill.git ~/.hermes/skills/<skill-path>/
```

## Usage

Invoke your AI agent with a clear instruction matching this skill's purpose. The agent will route tasks to this skill when the instruction matches its description or trigger keywords.

Refer to `README.md` in this repository for:
- Detailed step-by-step installation guide
- Bilingual documentation (English + Indonesian)
- Troubleshooting table
- Security best practices
- Customization tips

## Safety rules

- Never commit private keys, seed phrases, API tokens, or personal data to version control
- Use placeholders (`<YOUR_...>`) in all examples and code snippets
- Validate all outputs before acting on them
- Keep real credentials in your runtime's secure credential store only
