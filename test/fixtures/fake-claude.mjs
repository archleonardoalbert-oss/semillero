#!/usr/bin/env node
// Binario falso de claude para los tests: reproduce un stream-json realista.
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const escenario = process.env.FAKE_ESCENARIO ?? 'ok';
const mensaje = args[args.indexOf('-p') + 1] ?? '';
const destino = mensaje.match(/Escribe tu dictamen en (\S+?)\.?$/m)?.[1];
const sesion = args[args.indexOf('--session-id') + 1] ?? args[args.indexOf('--resume') + 1];
if (process.env.FAKE_ARGS) fs.writeFileSync(process.env.FAKE_ARGS, JSON.stringify(args));

const emitir = (o) => process.stdout.write(JSON.stringify({ ...o, session_id: sesion }) + '\n');
const delta = (index, d) => emitir({ type: 'stream_event', event: { type: 'content_block_delta', index, delta: d } });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

process.on('SIGINT', () => process.exit(130));

emitir({ type: 'system', subtype: 'init', model: 'claude-opus-5-5', tools: ['WebSearch'] });
emitir({ type: 'stream_event', event: { type: 'message_start' } });
emitir({ type: 'stream_event', event: { type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '' } } });
delta(0, { type: 'thinking_delta', thinking: 'Evaluando si la idea ' });
delta(0, { type: 'thinking_delta', thinking: 'ya existe.' });
emitir({ type: 'stream_event', event: { type: 'content_block_stop', index: 0 } });
emitir({
  type: 'stream_event',
  event: { type: 'content_block_start', index: 1, content_block: { type: 'tool_use', id: 'tu1', name: 'WebSearch', input: {} } },
});
delta(1, { type: 'input_json_delta', partial_json: '{"query": "fast weights ' });
delta(1, { type: 'input_json_delta', partial_json: 'plasticity 2026"}' });
emitir({ type: 'stream_event', event: { type: 'content_block_stop', index: 1 } });
emitir({
  type: 'assistant',
  message: { content: [{ type: 'tool_use', id: 'tu1', name: 'WebSearch', input: { query: 'fast weights plasticity 2026' } }] },
});
emitir({
  type: 'user',
  message: { content: [{ type: 'tool_result', tool_use_id: 'tu1', content: 'Resultados: Ba et al. 2016…' }] },
});
const uso = escenario === 'cuota' ? 0.95 : 0.5;
emitir({
  type: 'rate_limit_event',
  rate_limit_info: {
    status: 'allowed',
    unifiedWindows: { five_hour: { utilization: uso, resetsAt: 4102444800 }, seven_day: { utilization: 0.3, resetsAt: 4102444800 } },
  },
});

if (escenario === 'lento' || escenario === 'cuota') await espera(30_000);

if (escenario === 'ok' && destino) {
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, '---\nveredicto: aceptada\netapa: 2\nresumen: Vale la pena con matices\n---\n\n# Dictamen\n\n$$E=mc^2$$\n');
}
emitir({ type: 'stream_event', event: { type: 'content_block_start', index: 2, content_block: { type: 'text', text: '' } } });
delta(2, { type: 'text_delta', text: 'Dictamen escrito.' });
emitir({ type: 'result', subtype: 'success', is_error: false, duration_ms: 1234, result: 'Dictamen escrito.' });
