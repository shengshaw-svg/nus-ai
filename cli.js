#!/usr/bin/env node
'use strict';

const { execFile } = require('node:child_process');

const usage = `Usage:
  snip add <url>    Create a short link
  snip ls           List links and visit counts
  snip open <code>  Open the original URL in your browser
  snip help         Show this help`;

function getBaseUrl() {
  const configured = process.env.SNIP_API || 'http://localhost:3000';
  let parsed;

  try {
    parsed = new URL(configured);
  } catch {
    throw new Error('SNIP_API must be a valid HTTP or HTTPS base URL.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('SNIP_API must be a valid HTTP or HTTPS base URL.');
  }

  return parsed.origin;
}

function validateUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('Provide a valid HTTP or HTTPS URL.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only HTTP and HTTPS URLs can be shortened.');
  }

  return parsed.href;
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message = typeof body?.error === 'string'
      ? body.error
      : `Request failed (${response.status} ${response.statusText}).`;
    throw new Error(message);
  }

  return body;
}

function printLinks(links) {
  if (!Array.isArray(links)) throw new Error('The API returned an invalid links list.');
  if (links.length === 0) {
    console.log('No links yet.');
    return;
  }

  const codeWidth = Math.max(4, ...links.map((link) => String(link.code).length));
  const hitsWidth = Math.max(4, ...links.map((link) => String(link.hits).length));
  console.log(`${'CODE'.padEnd(codeWidth)}  ${'HITS'.padStart(hitsWidth)}  URL`);
  console.log(`${'-'.repeat(codeWidth)}  ${'-'.repeat(hitsWidth)}  ---`);
  for (const link of links) {
    console.log(`${String(link.code).padEnd(codeWidth)}  ${String(link.hits).padStart(hitsWidth)}  ${link.url}`);
  }
}

function openInBrowser(url) {
  let command;
  let args;

  if (process.platform === 'win32') {
    command = 'rundll32.exe';
    args = ['url.dll,FileProtocolHandler', url];
  } else if (process.platform === 'darwin') {
    command = 'open';
    args = [url];
  } else {
    command = 'xdg-open';
    args = [url];
  }

  return new Promise((resolve, reject) => {
    execFile(command, args, { windowsHide: true }, (error) => {
      if (error) reject(new Error(`Could not open the browser: ${error.message}`));
      else resolve();
    });
  });
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log(usage);
    return;
  }

  const baseUrl = getBaseUrl();

  if (command === 'add') {
    if (args.length !== 1) throw new Error('Usage: snip add <url>');
    const url = validateUrl(args[0]);
    const link = await requestJson(`${baseUrl}/api/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (typeof link?.shortUrl !== 'string') throw new Error('The API returned an invalid link.');
    console.log(link.shortUrl);
    return;
  }

  if (command === 'ls') {
    if (args.length !== 0) throw new Error('Usage: snip ls');
    printLinks(await requestJson(`${baseUrl}/api/links`));
    return;
  }

  if (command === 'open') {
    if (args.length !== 1 || !/^[A-Za-z0-9]{6}$/.test(args[0])) {
      throw new Error('Usage: snip open <6-character-code>');
    }

    const response = await fetch(`${baseUrl}/${encodeURIComponent(args[0])}`, {
      redirect: 'manual',
    });
    if (response.status === 404) throw new Error(`Unknown code: ${args[0]}`);
    if (response.status < 300 || response.status >= 400) {
      throw new Error(`Request failed (${response.status} ${response.statusText}).`);
    }

    const location = response.headers.get('Location');
    if (!location) throw new Error('The API response did not include a redirect target.');
    const destination = new URL(location, baseUrl);
    if (destination.protocol !== 'http:' && destination.protocol !== 'https:') {
      throw new Error('The API returned an unsupported redirect target.');
    }

    await openInBrowser(destination.href);
    console.log(`Opened ${destination.href}`);
    return;
  }

  throw new Error(`Unknown command: ${command}\n${usage}`);
}

main().catch((error) => {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});