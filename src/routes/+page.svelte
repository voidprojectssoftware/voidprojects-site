<script lang="ts">
    import { onMount } from 'svelte';
    import Matter from 'matter-js';
    import { Button } from '$lib/components/shadcn/ui/button/index.js';
    import { Section } from '$lib/components/section/index.js';
    import { Switch } from '$lib/components/shadcn/ui/switch/index.js';
    import { Sun, Moon } from '@lucide/svelte';
    import { Feature } from '$lib/components/feature/index.js';

    const { Engine, Bodies, Body, Composite } = Matter;

    let heroRef = $state<HTMLElement | null>(null);
    let secondRef = $state<HTMLElement | null>(null);

    let dark = $state(false);

    function toggleDark(checked: boolean) {
        dark = checked;
        document.documentElement.classList.toggle('dark', dark);
    }

    const heroTitle = 'Void Projects';
    const titleChars = [...heroTitle];

    const heroSubtitle = 'Software for accelerating the use of agentic systems.';
    const subtitleChars = [...heroSubtitle];

    // ---- Drift + physics ----------------------------------------------
    type Drifter = {
        el: HTMLElement;
        body: Matter.Body | null;
        hx: number; hy: number;   // home center, viewport coords (captured at drift start)
        w: number; h: number;     // body size
        sx: number; sy: number; sr: number; // offset/angle snapshot when return begins
    };

    const drifters: Drifter[] = [];
    let engine: Matter.Engine | null = null;
    let worldBuilt = false;

    let mode: 'idle' | 'drifting' | 'returning' = 'idle';
    let returnStart = 0;
    let rafId = 0;

    const RETURN_MS = 1400;   // duration of the eased return
    const RESTITUTION = 0.1; // bounciness; 1 = perpetual, lower = settles
    const GRAVITY = 0;        // 0 = floats in space; set ~1 to make them fall and pile up

    const reduceMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ease-in: barely moves at first, then rushes home
    const easeInExpo = (t: number) => (t <= 0 ? 0 : Math.pow(2, 10 * (t - 1)));

    function setTransform(el: HTMLElement, dx: number, dy: number, deg: number) {
        el.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${deg}deg)`;
    }

    // Svelte action — tag any element that should become a rigid body
    function drift(el: HTMLElement) {
        const d: Drifter = { el, body: null, hx: 0, hy: 0, w: 0, h: 0, sx: 0, sy: 0, sr: 0 };
        el.style.willChange = 'transform';
        drifters.push(d);
        return {
            destroy() {
                const i = drifters.indexOf(d);
                if (i >= 0) drifters.splice(i, 1);
            }
        };
    }

    function seedVelocities() {
        drifters.forEach((d, i) => {
            if (!d.body) return;
            const angle = (i * 137.5 * Math.PI) / 180; // golden-angle spread = distinct directions
            const speed = 0.3 + (i % 5) * 0.08;                  // px/step, slightly different per body
            Body.setVelocity(d.body, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed });
            Body.setAngularVelocity(d.body, (i % 2 ? -1 : 1) * 0.0205);
        });
    }

    function buildWorld() {
        engine = Engine.create();
        engine.gravity.x = 0;
        engine.gravity.y = GRAVITY;

        const W = window.innerWidth;
        const H = window.innerHeight;
        const t = 200; // wall thickness (kept off-screen)
        Composite.add(engine.world, [
            Bodies.rectangle(W / 2, -t / 2, W + 2 * t, t, { isStatic: true }),    // top
            Bodies.rectangle(W / 2, H + t / 2, W + 2 * t, t, { isStatic: true }), // bottom
            Bodies.rectangle(-t / 2, H / 2, t, H + 2 * t, { isStatic: true }),    // left
            Bodies.rectangle(W + t / 2, H / 2, t, H + 2 * t, { isStatic: true })  // right
        ]);

        for (const d of drifters) {
            const rect = d.el.getBoundingClientRect(); // read once, at home (no active transform)
            d.hx = rect.left + rect.width / 2;
            d.hy = rect.top + rect.height / 2;
            d.w = Math.max(2, rect.width - 1);   // tiny shrink avoids spawn overlap jitter
            d.h = Math.max(2, rect.height - 1);
            const body = Bodies.rectangle(d.hx, d.hy, d.w, d.h, {
                restitution: RESTITUTION,
                friction: 0,
                frictionAir: 0,
                frictionStatic: 0
            });
            d.body = body;
            Composite.add(engine.world, body);
        }

        seedVelocities();
        worldBuilt = true;
    }

    function destroyWorld() {
        if (engine) {
            Composite.clear(engine.world, false);
            Engine.clear(engine);
        }
        engine = null;
        worldBuilt = false;
        for (const d of drifters) d.body = null;
    }

    function ensureLoop() {
        if (rafId || reduceMotion) return;
        rafId = requestAnimationFrame(frame);
    }

    function frame(now: number) {
        if (mode === 'drifting') {
            if (engine) Engine.update(engine, 1000 / 60); // fixed step = stable solver
            for (const d of drifters) {
                if (!d.body) continue;
                const dx = d.body.position.x - d.hx;
                const dy = d.body.position.y - d.hy;
                const deg = (d.body.angle * 180) / Math.PI;
                setTransform(d.el, dx, dy, deg);
            }
        } else if (mode === 'returning') {
            const t = Math.min(1, (now - returnStart) / RETURN_MS);
            const k = 1 - easeInExpo(t); // 1 -> 0, slow then fast
            for (const d of drifters) {
                const dx = d.sx * k;
                const dy = d.sy * k;
                const deg = d.sr * k;
                setTransform(d.el, dx, dy, deg);
                if (d.body) {
                    // keep the body glued to the tween so physics can resume cleanly
                    Body.setPosition(d.body, { x: d.hx + dx, y: d.hy + dy });
                    Body.setAngle(d.body, (deg * Math.PI) / 180);
                    Body.setVelocity(d.body, { x: 0, y: 0 });
                    Body.setAngularVelocity(d.body, 0);
                }
            }
            if (t >= 1) {
                for (const d of drifters) setTransform(d.el, 0, 0, 0);
                destroyWorld();
                mode = 'idle';
            }
        }

        if (mode === 'idle') { rafId = 0; return; } // park loop until next scroll
        rafId = requestAnimationFrame(frame);
    }

    function startDrift() {
        if (reduceMotion || mode === 'drifting') return;
        if (!worldBuilt) buildWorld();  // fresh start from rest
        else seedVelocities();          // resuming mid-return: re-impulse in place
        mode = 'drifting';
        ensureLoop();
    }

    function startReturn() {
        if (reduceMotion || mode !== 'drifting') return;
        for (const d of drifters) {
            if (d.body) {
                d.sx = d.body.position.x - d.hx;
                d.sy = d.body.position.y - d.hy;
                d.sr = (d.body.angle * 180) / Math.PI;
            } else {
                d.sx = d.sy = d.sr = 0;
            }
        }
        returnStart = performance.now();
        mode = 'returning';
        ensureLoop();
    }

    onMount(() => {
        const onScroll = () => {
            if (!heroRef || !secondRef) return;
            const progress = Math.max(
                0,
                Math.min(
                    1,
                    (window.innerHeight - secondRef.getBoundingClientRect().top) / window.innerHeight
                )
            );
            // heroRef.style.filter = `blur(${progress * 8}px)`;

            if (progress > 0.02) startDrift();
            else startReturn();
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', onScroll);
            if (rafId) cancelAnimationFrame(rafId);
            destroyWorld();
        };
    });
</script>

<header class="sticky top-0 z-2 h-16 bg-background pt-4 px-35">
    <div class="flex flex-row items-center justify-between">
        <div class="flex flex-row items-center justify-center gap-6">
            <span class="text-xl font-bold">Void Projects</span>
            <a href="/blog" class="text-lg hover:opacity-60">Blog</a>
            <a href="/team" class="text-lg hover:opacity-60">Meet The Team</a>
        </div>
        <div class="flex flex-row items-center justify-center gap-2">
            <Moon size={16} />
            <Switch checked={dark} onCheckedChange={toggleDark} />
            <Sun size={16} />
        </div>
    </div>
</header>
<main class="flex flex-col">
    <Section bind:ref={heroRef} class="sticky top-16 items-center overflow-clip justify-center gap-3 h-[calc(100dvh-4rem)]">
        <div class="flex flex-col items-center gap-4">
            <h1 class="text-8xl font-bold" aria-label={heroTitle}>{#each titleChars as ch}<span use:drift aria-hidden="true" style="display:inline-block;white-space:pre">{ch === ' ' ? '\u00A0' : ch}</span>{/each}</h1>
            <p class="text-2xl" aria-label={heroSubtitle}>{#each subtitleChars as ch}<span use:drift aria-hidden="true" style="display:inline-block;white-space:pre">{ch === ' ' ? '\u00A0' : ch}</span>{/each}</p>
            <div use:drift class="inline-block">
                <Button
                    class="text-2xl"
                    onclick={() => window.open('https://github.com/voidprojectssoftware')}
                    >Visit Our Github</Button
                >
            </div>
        </div>
    </Section>
    <div bind:this={secondRef} class="h-100"></div>
</main>