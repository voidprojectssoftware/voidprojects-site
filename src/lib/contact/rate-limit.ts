// In-memory sliding-window limits for /api/contact. State lives in one process, so
// each Functions instance counts on its own and a cold start forgets; that bounds a
// flood per instance rather than exactly, which is the job here.

export interface RateRule {
	limit: number;
	windowMs: number;
}

const MAX_KEYS = 10_000; // past this, expired keys are swept so rotating IPs cannot grow memory

export class RateLimiter {
	readonly #rule: RateRule;
	readonly #hits = new Map<string, number[]>();

	constructor(rule: RateRule) {
		this.#rule = rule;
	}

	// Records a hit and returns 0, or returns the seconds until the key may try again
	// without recording anything.
	take(key: string, now: number): number {
		const since = now - this.#rule.windowMs;
		const recent = (this.#hits.get(key) ?? []).filter((t) => t > since);
		if (recent.length >= this.#rule.limit) {
			this.#hits.set(key, recent);
			return Math.max(1, Math.ceil((recent[0] + this.#rule.windowMs - now) / 1000));
		}
		recent.push(now);
		this.#hits.set(key, recent);
		if (this.#hits.size > MAX_KEYS) this.#sweep(since);
		return 0;
	}

	#sweep(since: number) {
		for (const [key, times] of this.#hits) {
			if (times[times.length - 1] <= since) this.#hits.delete(key);
		}
	}
}

// IPv6 hands out a /64 per subscriber, so the whole /64 counts as one visitor.
export function rateKeyForIp(ip: string): string {
	const v4WithPort = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(ip);
	if (v4WithPort) return v4WithPort[1];
	const bracketed = /^\[([0-9a-f:]+)\](?::\d+)?$/i.exec(ip);
	const addr = (bracketed ? bracketed[1] : ip).toLowerCase();
	if (!addr.includes(':')) return addr || 'unknown';
	const [head, tail = ''] = addr.split('::');
	const left = head ? head.split(':') : [];
	const right = tail ? tail.split(':') : [];
	const groups = addr.includes('::')
		? [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill('0'), ...right]
		: left;
	return `${groups
		.slice(0, 4)
		.map((g) => g.replace(/^0+(?=.)/, ''))
		.join(':')}::/64`;
}
