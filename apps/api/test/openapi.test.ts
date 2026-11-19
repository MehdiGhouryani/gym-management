/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildOpenApi } from '../src/openapi/openapi.ts';
import type { BodySchemas } from '../src/openapi/openapi.ts';
import { toGymDto } from '../src/gym/gym.mapper.ts';
import { toMemberDto } from '../src/members/members.mapper.ts';
import { toPlanDto } from '../src/plans/plan.mapper.ts';
import { toSubscriptionDto } from '../src/subscriptions/subscription.mapper.ts';

const stub = (n: string) => ({ type: 'object', title: n });
const bodies: BodySchemas = {
  otpRequest: stub('a'), otpVerify: stub('b'), refresh: stub('c'), memberFields: stub('d'), updateMember: stub('e'),
  createPlan: stub('f'), updatePlan: stub('g'), renew: stub('h'), payDebt: stub('i'),
  gymUpdate: stub('j'), createStaff: stub('k'), freeze: stub('l'), refund: stub('m'),
  createLead: stub('n'), updateLead: stub('o'),
};
const doc: any = buildOpenApi(bodies);
const METHODS = ['get', 'post', 'patch', 'put', 'delete'];
const ops: [string, string, any][] = Object.entries<any>(doc.paths).flatMap(([p, v]) =>
  Object.entries<any>(v).filter(([m]) => METHODS.includes(m)).map(([m, o]) => [m.toUpperCase(), p, o] as [string, string, any]));

describe('ساختار سند', () => {
  it('نسخه و JSON-پذیر', () => {
    expect(doc.openapi).toBe('3.1.0');
    expect(JSON.parse(JSON.stringify(doc)).openapi).toBe('3.1.0');
  });
  it('هر عملیات خلاصه، برچسب، پاسخ موفق و تعریف امنیت دارد', () => {
    for (const [m, p, o] of ops) {
      const label = `${m} ${p}`;
      expect(`${label}:${typeof o.summary}`).toBe(`${label}:string`);
      expect(`${label}:${o.tags.length}`).toBe(`${label}:1`);
      expect(`${label}:${Object.keys(o.responses).some((c) => c.startsWith('2'))}`).toBe(`${label}:true`);
      expect(`${label}:${Array.isArray(o.security)}`).toBe(`${label}:true`);
    }
  });
  it('پارامترهای مسیر همه تعریف شده‌اند', () => {
    for (const [m, p, o] of ops) {
      for (const mm of p.matchAll(/\{(\w+)\}/g)) {
        expect(`${m} ${p}:${(o.parameters ?? []).some((x: any) => x.name === mm[1] && x.in === 'path')}`).toBe(`${m} ${p}:true`);
      }
    }
  });
  it('همه‌ی $refها به components اشاره می‌کنند', () => {
    const missing: string[] = [];
    const walk = (x: unknown) => {
      if (Array.isArray(x)) x.forEach(walk);
      else if (x && typeof x === 'object') {
        for (const [k, v] of Object.entries(x)) {
          if (k === '$ref' && typeof v === 'string') {
            if (!(v.replace('#/components/schemas/', '') in doc.components.schemas)) missing.push(v);
          } else walk(v);
        }
      }
    };
    walk(doc.paths);
    walk(doc.components);
    expect(missing.join()).toBe('');
  });
  it('عملیات بدون نیاز به ورود فقط سلامت و ورود هستند', () => {
    const open = ops.filter(([, , o]) => o.security.length === 0).map(([m, p]) => `${m} ${p}`).sort();
    expect(open).toEqual(['GET /health', 'POST /auth/logout', 'POST /auth/otp/request', 'POST /auth/otp/verify', 'POST /auth/refresh']);
  });
});

describe('هم‌خوانی با کنترلرها', () => {
  const dir = fileURLToPath(new URL('../src/', import.meta.url));
  const files = (readdirSync(dir, { recursive: true }) as string[]).filter((f) => f.endsWith('.controller.ts'));
  const found = new Set<string>();
  for (const f of files) {
    const parts = readFileSync(dir + f, 'utf8').split('@Controller(').slice(1);
    for (const part of parts) {
      const prefix = /^'([^']*)'/.exec(part)?.[1] ?? '';
      for (const m of part.matchAll(/@(Get|Post|Patch|Put|Delete)\((?:'([^']*)')?\)/g)) {
        const path = '/' + [prefix, m[2] ?? ''].filter(Boolean).join('/');
        found.add(`${(m[1] ?? '').toUpperCase()} ${path.replace(/:(\w+)/g, '{$1}')}`);
      }
    }
  }
  it('کنترلرها پیدا شدند', () => {
    expect(found.size > 15).toBe(true);
  });
  it('هر مسیر کنترلر در سند هست', () => {
    const inDoc = new Set(ops.map(([m, p]) => `${m} ${p}`));
    expect([...found].filter((r) => !inDoc.has(r)).join()).toBe('');
  });
  it('هر مسیر سند در کنترلرها هست', () => {
    expect(ops.map(([m, p]) => `${m} ${p}`).filter((r) => !found.has(r)).join()).toBe('');
  });
});

describe('کلیدهای DTO با طرح‌های سند یکی است', () => {
  const keys = (name: string) => Object.keys(doc.components.schemas[name].properties).sort();
  it('Member', () => {
    const dto = toMemberDto({ id: 'a', name: 'n', phone: '0', birthDate: null, note: null, currentEndsOn: null, balance: 0, archivedAt: null, createdAt: new Date() }, '2026-10-18', {});
    expect(Object.keys(dto).sort()).toEqual(keys('Member'));
  });
  it('Gym', () => {
    const dto = toGymDto({ id: 'a', slug: 's', name: 'n', city: 'c', address: null, phone: null, status: 'ACTIVE', expiringDays: 7, graceDays: 14 });
    expect(Object.keys(dto).sort()).toEqual(keys('Gym'));
  });
  it('Plan', () => {
    expect(Object.keys(toPlanDto({ id: 'a', name: 'n', days: 30, price: 1, active: true })).sort()).toEqual(keys('Plan'));
  });
  it('Subscription و Payment', () => {
    const p = { id: 'y', amount: 1, method: 'CASH', paidAt: new Date() };
    const dto = toSubscriptionDto({ id: 's', planId: 'p', startsOn: new Date(), endsOn: new Date(), price: 2, createdAt: new Date(), plan: { name: 'x' }, payments: [p] });
    expect(Object.keys(dto).sort()).toEqual(keys('Subscription'));
    expect(Object.keys(dto.payments[0] ?? {}).sort()).toEqual(keys('Payment'));
  });
});
