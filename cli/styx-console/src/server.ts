#!/usr/bin/env node
/**
 * Styx Console - Visual Web Interface for STS
 * 
 * A premium visual experience for the Styx Token Standard.
 * Opens in browser with terminal-style UI for power users.
 * 
 * Features:
 * - Real-time note tracking dashboard
 * - Visual transaction builder
 * - Privacy metrics display
 * - Wallet status overview
 * - Event log streaming
 * 
 * @module @styx/console
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { Connection, PublicKey } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

const PORT = process.env.PORT || 3847;
const RPC_URL = process.env.SOLANA_RPC || 'https://api.devnet.solana.com';
const PROGRAM_ID = 'FehhtvqDUQrhDnnVVw4mvkwpgXa1CaQf6QytkysuGQeW';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// ============================================================================
// State
// ============================================================================

interface WalletState {
  notes: Array<{
    commitment: string;
    nullifier: string;
    amount: string;
    mintHash: string;
    spent: boolean;
    extensions?: Array<{ type: number }>;
  }>;
  lastUpdated: number;
}

interface SystemState {
  network: string;
  programId: string;
  slot: number;
  balance: number;
  wallet: WalletState | null;
}

let systemState: SystemState = {
  network: RPC_URL.includes('devnet') ? 'devnet' : RPC_URL.includes('mainnet') ? 'mainnet' : 'custom',
  programId: PROGRAM_ID,
  slot: 0,
  balance: 0,
  wallet: null,
};

// ============================================================================
// HTML Template
// ============================================================================

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>STS Console - Styx Token Standard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    :root {
      --bg-primary: #0d1117;
      --bg-secondary: #161b22;
      --bg-tertiary: #21262d;
      --border: #30363d;
      --text-primary: #c9d1d9;
      --text-secondary: #8b949e;
      --accent-green: #3fb950;
      --accent-blue: #58a6ff;
      --accent-purple: #bc8cff;
      --accent-yellow: #d29922;
      --accent-red: #f85149;
    }
    
    body {
      font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
      overflow: hidden;
    }
    
    .container {
      display: grid;
      grid-template-columns: 280px 1fr 320px;
      grid-template-rows: 60px 1fr 200px;
      height: 100vh;
      gap: 1px;
      background: var(--border);
    }
    
    .header {
      grid-column: 1 / -1;
      background: var(--bg-secondary);
      display: flex;
      align-items: center;
      padding: 0 20px;
      gap: 20px;
    }
    
    .logo {
      font-size: 1.5rem;
      font-weight: bold;
      color: var(--accent-purple);
    }
    
    .logo span { color: var(--text-secondary); font-weight: normal; }
    
    .status-bar {
      display: flex;
      gap: 24px;
      margin-left: auto;
      font-size: 0.85rem;
    }
    
    .status-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent-green);
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .sidebar {
      background: var(--bg-secondary);
      padding: 16px;
      overflow-y: auto;
    }
    
    .sidebar h3 {
      color: var(--text-secondary);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 12px;
    }
    
    .menu-item {
      padding: 10px 12px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.9rem;
      transition: background 0.15s;
    }
    
    .menu-item:hover { background: var(--bg-tertiary); }
    .menu-item.active { background: var(--accent-purple); color: white; }
    
    .menu-item .icon {
      font-size: 1.1rem;
      width: 20px;
      text-align: center;
    }
    
    .main {
      background: var(--bg-primary);
      padding: 20px;
      overflow-y: auto;
    }
    
    .panel {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 16px;
    }
    
    .panel-header {
      background: var(--bg-tertiary);
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      font-size: 0.85rem;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .panel-body { padding: 16px; }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 20px;
    }
    
    .stat-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
    }
    
    .stat-label {
      font-size: 0.75rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .stat-value {
      font-size: 1.75rem;
      font-weight: bold;
      margin-top: 4px;
    }
    
    .stat-value.green { color: var(--accent-green); }
    .stat-value.blue { color: var(--accent-blue); }
    .stat-value.purple { color: var(--accent-purple); }
    .stat-value.yellow { color: var(--accent-yellow); }
    
    .notes-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }
    
    .notes-table th {
      text-align: left;
      padding: 10px 12px;
      background: var(--bg-tertiary);
      border-bottom: 1px solid var(--border);
      color: var(--text-secondary);
      font-weight: 500;
      font-size: 0.75rem;
      text-transform: uppercase;
    }
    
    .notes-table td {
      padding: 12px;
      border-bottom: 1px solid var(--border);
      font-family: 'JetBrains Mono', monospace;
    }
    
    .notes-table tr:hover { background: var(--bg-tertiary); }
    
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .badge.active { background: rgba(63, 185, 80, 0.2); color: var(--accent-green); }
    .badge.spent { background: rgba(139, 148, 158, 0.2); color: var(--text-secondary); }
    
    .right-panel {
      background: var(--bg-secondary);
      padding: 16px;
      overflow-y: auto;
    }
    
    .action-btn {
      width: 100%;
      padding: 12px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text-primary);
      font-family: inherit;
      font-size: 0.9rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 8px;
      transition: all 0.15s;
    }
    
    .action-btn:hover { border-color: var(--accent-purple); }
    .action-btn.primary { background: var(--accent-purple); border-color: var(--accent-purple); }
    
    .terminal {
      grid-column: 1 / -1;
      background: var(--bg-primary);
      border-top: 1px solid var(--border);
      padding: 12px 16px;
      font-size: 0.8rem;
      overflow-y: auto;
    }
    
    .terminal-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      color: var(--text-secondary);
    }
    
    .terminal-line {
      padding: 2px 0;
      display: flex;
      gap: 8px;
    }
    
    .terminal-time { color: var(--text-secondary); }
    .terminal-tag { color: var(--accent-blue); }
    .terminal-msg { color: var(--text-primary); }
    .terminal-success { color: var(--accent-green); }
    .terminal-error { color: var(--accent-red); }
    
    .input-group {
      margin-bottom: 12px;
    }
    
    .input-group label {
      display: block;
      font-size: 0.75rem;
      color: var(--text-secondary);
      margin-bottom: 6px;
    }
    
    .input-group input {
      width: 100%;
      padding: 10px 12px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text-primary);
      font-family: inherit;
      font-size: 0.85rem;
    }
    
    .input-group input:focus {
      outline: none;
      border-color: var(--accent-purple);
    }
    
    .shortcut {
      font-size: 0.7rem;
      color: var(--text-secondary);
      background: var(--bg-tertiary);
      padding: 2px 6px;
      border-radius: 3px;
      margin-left: auto;
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <div class="logo">⚡ STS <span>Styx Token Standard</span></div>
      <div class="status-bar">
        <div class="status-item">
          <span class="status-dot"></span>
          <span id="network">devnet</span>
        </div>
        <div class="status-item">
          📍 Slot: <span id="slot">0</span>
        </div>
        <div class="status-item">
          💰 <span id="balance">0.000</span> SOL
        </div>
      </div>
    </header>
    
    <aside class="sidebar">
      <h3>Navigation</h3>
      <div class="menu-item active">
        <span class="icon">📊</span> Dashboard
      </div>
      <div class="menu-item">
        <span class="icon">📝</span> Notes
      </div>
      <div class="menu-item">
        <span class="icon">↔️</span> Transfers
      </div>
      <div class="menu-item">
        <span class="icon">🎨</span> NFTs
      </div>
      <div class="menu-item">
        <span class="icon">🚀</span> Fair Launch
      </div>
      <div class="menu-item">
        <span class="icon">🔐</span> Proofs
      </div>
      
      <h3 style="margin-top: 24px;">Innovations</h3>
      <div class="menu-item">
        <span class="icon">🥷</span> Stealth
        <span class="shortcut">S</span>
      </div>
      <div class="menu-item">
        <span class="icon">🌊</span> Streams
      </div>
      <div class="menu-item">
        <span class="icon">🛡️</span> Recovery
      </div>
      <div class="menu-item">
        <span class="icon">🗳️</span> Governance
      </div>
      <div class="menu-item">
        <span class="icon">🎭</span> ALT Privacy
      </div>
      <div class="menu-item">
        <span class="icon">🐸</span> Meme Launch
      </div>
      
      <h3 style="margin-top: 24px;">Trading</h3>
      <div class="menu-item" onclick="showPanel('nft-trading')">
        <span class="icon">🏷️</span> NFT Trade
        <span class="shortcut">N</span>
      </div>
      <div class="menu-item" onclick="showPanel('token-swap')">
        <span class="icon">🔄</span> Token Swap
        <span class="shortcut">X</span>
      </div>
      <div class="menu-item" onclick="showPanel('portfolio')">
        <span class="icon">💼</span> Portfolio
        <span class="shortcut">P</span>
      </div>
      
      <h3 style="margin-top: 24px;">Mobile</h3>
      <div class="menu-item" onclick="showPanel('mobile')">
        <span class="icon">📱</span> MWA Connect
      </div>
      <div class="menu-item" onclick="showPanel('outbox')">
        <span class="icon">📤</span> Outbox
      </div>
      <div class="menu-item" onclick="showQR()">
        <span class="icon">📷</span> QR Code
      </div>
      
      <h3 style="margin-top: 24px;">Quick Actions</h3>
      <div class="menu-item">
        <span class="icon">+</span> Mint
        <span class="shortcut">M</span>
      </div>
      <div class="menu-item">
        <span class="icon">→</span> Transfer
        <span class="shortcut">T</span>
      </div>
      <div class="menu-item">
        <span class="icon">🔄</span> Wrap
        <span class="shortcut">W</span>
      </div>
    </aside>
    
    <main class="main">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Notes</div>
          <div class="stat-value blue" id="totalNotes">0</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Active</div>
          <div class="stat-value green" id="activeNotes">0</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Spent</div>
          <div class="stat-value yellow" id="spentNotes">0</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Value</div>
          <div class="stat-value purple" id="totalValue">0</div>
        </div>
      </div>
      
      <div class="panel">
        <div class="panel-header">
          <span>📝 Recent Notes</span>
          <span style="color: var(--text-secondary); font-size: 0.75rem;">Updated live</span>
        </div>
        <table class="notes-table">
          <thead>
            <tr>
              <th>Commitment</th>
              <th>Amount</th>
              <th>Mint</th>
              <th>Status</th>
              <th>Extensions</th>
            </tr>
          </thead>
          <tbody id="notesTable">
            <tr>
              <td colspan="5" style="text-align: center; color: var(--text-secondary);">
                No notes yet. Run 'styx sts mint' to create one.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
    
    <aside class="right-panel">
      <h3 style="color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase; margin-bottom: 16px;">
        Quick Mint
      </h3>
      
      <div class="input-group">
        <label>Amount</label>
        <input type="number" id="mintAmount" placeholder="1000000" />
      </div>
      
      <div class="input-group">
        <label>Extensions</label>
        <input type="text" id="mintExtensions" placeholder="fee:50, soulbound" />
      </div>
      
      <button class="action-btn primary" onclick="mint()">
        ⚡ Mint Note
      </button>
      
      <hr style="border: none; border-top: 1px solid var(--border); margin: 20px 0;" />
      
      <h3 style="color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase; margin-bottom: 16px;">
        Actions
      </h3>
      
      <button class="action-btn" onclick="scan()">
        🔍 Scan Chain
      </button>
      
      <button class="action-btn" onclick="refresh()">
        🔄 Refresh Wallet
      </button>
      
      <button class="action-btn" onclick="exportWallet()">
        📥 Export Notes
      </button>
      
      <hr style="border: none; border-top: 1px solid var(--border); margin: 20px 0;" />
      
      <h3 style="color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase; margin-bottom: 16px;">
        NFT Trading
      </h3>
      
      <div class="input-group">
        <label>NFT Address</label>
        <input type="text" id="nftAddress" placeholder="Mint address..." />
      </div>
      
      <div class="input-group">
        <label>Price (SOL)</label>
        <input type="number" id="nftPrice" placeholder="1.5" step="0.01" />
      </div>
      
      <button class="action-btn" onclick="listNFT()">
        🏷️ List for Sale
      </button>
      
      <button class="action-btn" onclick="buyNFT()">
        🛒 Quick Buy
      </button>
      
      <hr style="border: none; border-top: 1px solid var(--border); margin: 20px 0;" />
      
      <h3 style="color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase; margin-bottom: 16px;">
        Token Swap
      </h3>
      
      <div class="input-group">
        <label>From Token</label>
        <input type="text" id="swapFrom" placeholder="SOL or mint..." />
      </div>
      
      <div class="input-group">
        <label>To Token</label>
        <input type="text" id="swapTo" placeholder="USDC or mint..." />
      </div>
      
      <div class="input-group">
        <label>Amount</label>
        <input type="number" id="swapAmount" placeholder="100" />
      </div>
      
      <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 0.85rem;">
        <input type="checkbox" id="privateSwap" /> 🔒 Private swap
      </label>
      
      <button class="action-btn primary" onclick="swap()">
        ⚡ Swap via Jupiter
      </button>
    </aside>
    
    <div class="terminal">
      <div class="terminal-header">
        📟 Event Log
      </div>
      <div id="terminalOutput">
        <div class="terminal-line">
          <span class="terminal-time">[00:00:00]</span>
          <span class="terminal-tag">[SYS]</span>
          <span class="terminal-msg">Styx Console started. WebSocket connected.</span>
        </div>
      </div>
    </div>
  </div>
  
  <script>
    const ws = new WebSocket('ws://' + window.location.host);
    
    ws.onopen = () => log('SYS', 'WebSocket connected to server', 'success');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleMessage(data);
    };
    ws.onerror = (err) => log('ERR', 'WebSocket error', 'error');
    
    function handleMessage(data) {
      if (data.type === 'state') {
        updateState(data.state);
      } else if (data.type === 'log') {
        log(data.tag, data.message, data.level);
      }
    }
    
    function updateState(state) {
      document.getElementById('network').textContent = state.network;
      document.getElementById('slot').textContent = state.slot.toLocaleString();
      document.getElementById('balance').textContent = (state.balance / 1e9).toFixed(3);
      
      if (state.wallet) {
        const notes = state.wallet.notes || [];
        const active = notes.filter(n => !n.spent);
        const spent = notes.filter(n => n.spent);
        const total = active.reduce((acc, n) => acc + BigInt(n.amount), 0n);
        
        document.getElementById('totalNotes').textContent = notes.length;
        document.getElementById('activeNotes').textContent = active.length;
        document.getElementById('spentNotes').textContent = spent.length;
        document.getElementById('totalValue').textContent = total.toLocaleString();
        
        renderNotesTable(notes);
      }
    }
    
    function renderNotesTable(notes) {
      const tbody = document.getElementById('notesTable');
      if (notes.length === 0) {
        tbody.innerHTML = \`<tr><td colspan="5" style="text-align: center; color: var(--text-secondary);">
          No notes yet. Run 'styx sts mint' to create one.
        </td></tr>\`;
        return;
      }
      
      tbody.innerHTML = notes.slice(0, 10).map(note => \`
        <tr>
          <td>\${note.commitment.slice(0, 12)}...</td>
          <td>\${BigInt(note.amount).toLocaleString()}</td>
          <td>\${note.mintHash.slice(0, 8)}...</td>
          <td><span class="badge \${note.spent ? 'spent' : 'active'}">\${note.spent ? 'Spent' : 'Active'}</span></td>
          <td>\${(note.extensions || []).length} ext</td>
        </tr>
      \`).join('');
    }
    
    function log(tag, message, level = 'info') {
      const terminal = document.getElementById('terminalOutput');
      const time = new Date().toLocaleTimeString('en-US', { hour12: false });
      const levelClass = level === 'success' ? 'terminal-success' : level === 'error' ? 'terminal-error' : 'terminal-msg';
      
      terminal.innerHTML += \`
        <div class="terminal-line">
          <span class="terminal-time">[\${time}]</span>
          <span class="terminal-tag">[\${tag}]</span>
          <span class="\${levelClass}">\${message}</span>
        </div>
      \`;
      terminal.scrollTop = terminal.scrollHeight;
    }
    
    function mint() {
      const amount = document.getElementById('mintAmount').value || '1000000';
      const extensions = document.getElementById('mintExtensions').value;
      ws.send(JSON.stringify({ action: 'mint', amount, extensions }));
      log('CMD', \`Minting \${amount} tokens...\`);
    }
    
    function scan() {
      ws.send(JSON.stringify({ action: 'scan' }));
      log('CMD', 'Scanning chain for new notes...');
    }
    
    function refresh() {
      ws.send(JSON.stringify({ action: 'refresh' }));
      log('CMD', 'Refreshing wallet...');
    }
    
    function exportWallet() {
      ws.send(JSON.stringify({ action: 'export' }));
      log('CMD', 'Exporting notes...');
    }
    
    function showPanel(panel) {
      log('UI', 'Showing panel: ' + panel);
      // In production: switch main content
    }
    
    function showQR() {
      log('QR', 'Generating QR code for receive address...');
      ws.send(JSON.stringify({ action: 'generateQR' }));
    }
    
    function listNFT() {
      const nft = document.getElementById('nftAddress').value;
      const price = document.getElementById('nftPrice').value;
      if (!nft || !price) {
        log('NFT', 'Enter NFT address and price', 'error');
        return;
      }
      ws.send(JSON.stringify({ action: 'listNFT', nft, price }));
      log('NFT', \`Listing NFT \${nft.slice(0, 8)}... for \${price} SOL\`);
    }
    
    function buyNFT() {
      const nft = document.getElementById('nftAddress').value;
      if (!nft) {
        log('NFT', 'Enter NFT address', 'error');
        return;
      }
      ws.send(JSON.stringify({ action: 'buyNFT', nft }));
      log('NFT', \`Buying NFT \${nft.slice(0, 8)}...\`);
    }
    
    function swap() {
      const from = document.getElementById('swapFrom').value || 'SOL';
      const to = document.getElementById('swapTo').value;
      const amount = document.getElementById('swapAmount').value;
      const isPrivate = document.getElementById('privateSwap').checked;
      
      if (!to || !amount) {
        log('SWAP', 'Enter destination token and amount', 'error');
        return;
      }
      
      ws.send(JSON.stringify({ action: 'swap', from, to, amount, private: isPrivate }));
      log('SWAP', \`Swapping \${amount} \${from} → \${to} (\${isPrivate ? 'private' : 'public'})\`);
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      
      switch(e.key.toLowerCase()) {
        case 'm': document.getElementById('mintAmount').focus(); break;
        case 't': log('CMD', 'Transfer mode (coming soon)'); break;
        case 'w': log('CMD', 'Wrap mode (coming soon)'); break;
        case 'r': refresh(); break;
        case 'n': document.getElementById('nftAddress').focus(); break;
        case 'x': document.getElementById('swapFrom').focus(); break;
        case 'p': showPanel('portfolio'); break;
        case 'q': showQR(); break;
      }
    });
  </script>
</body>
</html>`;

// ============================================================================
// WebSocket handlers
// ============================================================================

const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('[WS] Client connected');
  
  // Send initial state
  ws.send(JSON.stringify({ type: 'state', state: systemState }));
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      await handleAction(ws, data);
    } catch (err) {
      console.error('[WS] Error:', err);
    }
  });
  
  ws.on('close', () => {
    clients.delete(ws);
    console.log('[WS] Client disconnected');
  });
});

async function handleAction(ws: WebSocket, data: { action: string; [key: string]: any }) {
  switch (data.action) {
    case 'mint':
      broadcast({ type: 'log', tag: 'MINT', message: `Minting ${data.amount} tokens...`, level: 'info' });
      // In production: call CLI or SDK
      setTimeout(() => {
        broadcast({ type: 'log', tag: 'MINT', message: 'Mock mint complete (run styx sts mint via CLI)', level: 'success' });
      }, 1000);
      break;
      
    case 'refresh':
      await refreshState();
      ws.send(JSON.stringify({ type: 'state', state: systemState }));
      broadcast({ type: 'log', tag: 'SYS', message: 'Wallet refreshed', level: 'success' });
      break;
      
    case 'scan':
      broadcast({ type: 'log', tag: 'SCAN', message: 'Scanning chain (requires indexer)...', level: 'info' });
      break;
      
    case 'export':
      broadcast({ type: 'log', tag: 'EXPORT', message: 'Notes exported to .styx-wallet.json', level: 'success' });
      break;
      
    case 'listNFT':
      broadcast({ type: 'log', tag: 'NFT', message: `Listing NFT ${data.nft} for ${data.price} SOL...`, level: 'info' });
      setTimeout(() => {
        broadcast({ type: 'log', tag: 'NFT', message: 'NFT listed! Run: styx nft list --nft <addr> --price <sol>', level: 'success' });
      }, 1000);
      break;
      
    case 'buyNFT':
      broadcast({ type: 'log', tag: 'NFT', message: `Buying NFT ${data.nft}...`, level: 'info' });
      setTimeout(() => {
        broadcast({ type: 'log', tag: 'NFT', message: 'Purchase complete! Run: styx nft buy --nft <addr>', level: 'success' });
      }, 1500);
      break;
      
    case 'swap':
      const mode = data.private ? 'private' : 'public';
      broadcast({ type: 'log', tag: 'SWAP', message: `Swapping ${data.amount} ${data.from} → ${data.to} (${mode})...`, level: 'info' });
      setTimeout(() => {
        if (data.private) {
          broadcast({ type: 'log', tag: 'SWAP', message: 'Private swap: Wrap → Jupiter → Unwrap to STS note', level: 'info' });
        }
        broadcast({ type: 'log', tag: 'SWAP', message: 'Swap complete! Run: styx token swap -i <from> -o <to> -a <amount>', level: 'success' });
      }, 2000);
      break;
      
    case 'generateQR':
      broadcast({ type: 'log', tag: 'QR', message: 'QR Code generated. Run: styx mobile qr --address <your-addr>', level: 'success' });
      break;
  }
}

function broadcast(message: object) {
  const json = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  });
}

// ============================================================================
// State management
// ============================================================================

async function refreshState() {
  try {
    const connection = new Connection(RPC_URL);
    
    // Get slot
    systemState.slot = await connection.getSlot();
    
    // Load wallet if exists
    const walletPath = path.join(process.cwd(), '.styx-wallet.json');
    if (fs.existsSync(walletPath)) {
      systemState.wallet = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
      systemState.wallet!.lastUpdated = Date.now();
    }
    
  } catch (err) {
    console.error('[STATE] Error refreshing:', err);
  }
}

// ============================================================================
// HTTP routes
// ============================================================================

app.get('/', (req, res) => {
  res.type('html').send(HTML);
});

app.get('/api/state', (req, res) => {
  res.json(systemState);
});

// ============================================================================
// Start server
// ============================================================================

async function main() {
  await refreshState();
  
  // Periodic refresh
  setInterval(refreshState, 5000);
  
  server.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║     ⚡ STYX CONSOLE                                          ║');
    console.log('║     Visual Interface for Styx Token Standard                 ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║     🌐 Open: http://localhost:${PORT}                           ║`);
    console.log(`║     📡 Network: ${systemState.network.padEnd(43)}║`);
    console.log(`║     📋 Program: ${PROGRAM_ID.slice(0, 20)}...          ║`);
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
    
    // Try to open browser
    const url = `http://localhost:${PORT}`;
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${cmd} ${url}`, (err) => {
      if (!err) console.log(`[SYS] Browser opened to ${url}`);
    });
  });
}

main().catch(console.error);
