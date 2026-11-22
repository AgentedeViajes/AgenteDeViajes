'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migration = fs.readFileSync(path.join(__dirname, '../supabase/program-published-read-rls-migration.sql'), 'utf8');
const schema = fs.readFileSync(path.join(__dirname, '../supabase/schema.sql'), 'utf8');

test('schema.sql y la migración usan lecturas públicas limitadas a programas publicados', () => {
  assert.doesNotMatch(schema, /status='published' or public\.is_modo_rumbo_admin\(\)/i);
  assert.match(schema, /create policy "Admins read all programs" on public\.programs for select to authenticated using \(public\.is_modo_rumbo_admin\(\)\)/i);
  assert.match(schema, /create policy "Public reads published programs" on public\.programs for select to anon, authenticated using \(status='published'\)/i);
  assert.match(schema, /public\.departures for select to anon, authenticated using \(exists\(select 1 from public\.programs p where p\.id=program_id and p\.status='published'\)\)/i);
  assert.match(schema, /public\.itinerary_days for select to anon, authenticated using \(exists\(select 1 from public\.programs p where p\.id=program_id and p\.status='published'\)\)/i);
  for (const policy of [
    'Public reads published programs',
    'Public reads departures of published programs',
    'Public reads itineraries of published programs'
  ]) assert.match(migration, new RegExp(`drop policy if exists "${policy}"`, 'i'));
  assert.match(migration, /create policy "Public reads published programs"[\s\S]*?to anon, authenticated[\s\S]*?using \(status = 'published'\)/i);
  assert.match(migration, /create policy "Public reads departures of published programs"[\s\S]*?to anon, authenticated[\s\S]*?p\.status = 'published'/i);
  assert.match(migration, /create policy "Public reads itineraries of published programs"[\s\S]*?to anon, authenticated[\s\S]*?p\.status = 'published'/i);
  assert.doesNotMatch(migration, /status\s*=\s*'published'\s+or\s+public\.is_modo_rumbo_admin/i);
});

test('la lectura de borradores queda restringida a authenticated administradores', () => {
  assert.match(migration, /create policy "Admins read all programs"[\s\S]*?to authenticated[\s\S]*?using \(public\.is_modo_rumbo_admin\(\)\)/i);
  assert.match(migration, /Admins manage departures\/itineraries \(FOR ALL\)/);
  assert.match(schema, /create policy "Admins manage departures" on public\.departures for all to authenticated using \(public\.is_modo_rumbo_admin\(\)\) with check \(public\.is_modo_rumbo_admin\(\)\)/i);
  assert.match(schema, /create policy "Admins manage itineraries" on public\.itinerary_days for all to authenticated using \(public\.is_modo_rumbo_admin\(\)\) with check \(public\.is_modo_rumbo_admin\(\)\)/i);
});

test('preserva las políticas administrativas de escritura de programs y permite repetir la migración', () => {
  assert.doesNotMatch(migration, /drop policy[^;]*Admins (insert|update|delete) programs/i);
  assert.doesNotMatch(migration, /drop policy[^;]*Admins manage (departures|itineraries)/i);
  assert.match(migration, /drop policy if exists/);
  assert.match(migration, /begin;[\s\S]*commit;/i);
  assert.match(migration, /Hay una política permisiva de lectura pública adicional/);
  assert.match(migration, /has_function_privilege\('authenticated', admin_proc, 'EXECUTE'\)/i);
});

test('no requiere is_modo_rumbo_admin desde la política pública ni altera permisos de la función', () => {
  assert.doesNotMatch(migration, /revoke\s+all\s+on\s+function\s+public\.is_modo_rumbo_admin/i);
  assert.doesNotMatch(migration, /grant\s+execute\s+on\s+function\s+public\.is_modo_rumbo_admin\s+to\s+anon/i);
  assert.match(migration, /public reads published programs[\s\S]*?using \(status = 'published'\)/i);
  assert.match(migration, /public\.is_modo_rumbo_admin\(\)/i);
});
