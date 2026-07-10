<!--
	Bare capture page: the root layout's night-sky SpaceBackground, plus the
	voiceover subtitles drifting in it. Used to record clean visuals for a blog
	video. Both buttons hide themselves while fullscreen is active so they stay out
	of the recording; press Esc to exit.

	Playback needs a click: autoplay is blocked without a user gesture.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { PhysicsStage } from '$lib/physics/index.js';
	import { SubtitleField, loadCues } from '$lib/subtitles/index.js';

	let isFullscreen = $state(false);
	let playing = $state(false);
	let ready = $state(false);
	let error = $state<string | null>(null);

	let field: SubtitleField | null = null;

	function enterFullscreen() {
		document.documentElement.requestFullscreen?.();
	}

	function syncState() {
		isFullscreen = document.fullscreenElement !== null;
	}

	function toggle() {
		if (!field) return;
		if (playing) field.stop();
		else field.play().catch((e) => (error = `playback blocked: ${e.message}`));
	}

	onMount(() => {
		const stage = new PhysicsStage();
		let disposed = false;

		// Console-driven, mirroring the homepage: `voDebug()` overlays the physics
		// wireframe, `voState()` returns a snapshot of the real subtitle state (audio
		// clock, cue cursor, live phrases) so it can be asserted on without scraping
		// the DOM. `voPlay()` drives playback from a script.
		const w = window as typeof window & {
			voDebug?: (on?: boolean) => void;
			voState?: () => unknown;
			voPlay?: () => Promise<void> | undefined;
		};
		w.voDebug = (on = true) => (on ? stage.enableDebug() : stage.disableDebug());
		w.voState = () => field?.snapshot() ?? { ready: false };
		w.voPlay = () => field?.play();

		loadCues('/vo/hero.cues.json')
			.then((cues) => {
				if (disposed) return;
				field = new SubtitleField(cues);
				field.onPlayingChange = (p) => (playing = p);
				stage.add(field);
				ready = true;
			})
			.catch((e) => (error = e.message));

		return () => {
			disposed = true;
			delete w.voDebug;
			delete w.voState;
			delete w.voPlay;
			stage.destroy();
			field = null;
		};
	});
</script>

<svelte:head>
	<title>Void Projects — Sky</title>
</svelte:head>

<svelte:document onfullscreenchange={syncState} />

{#if !isFullscreen}
	<div class="controls">
		{#if error}
			<span class="err">{error}</span>
		{/if}
		<button class="btn" onclick={toggle} disabled={!ready}>
			{playing ? 'Stop voiceover' : 'Play voiceover'}
		</button>
		<button class="btn" onclick={enterFullscreen}>Go fullscreen</button>
	</div>
{/if}

<style>
	.controls {
		position: fixed;
		right: 1.5rem;
		bottom: 1.5rem;
		z-index: 50;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.err {
		font-size: 0.8125rem;
		color: rgba(255, 180, 180, 0.9);
	}

	.btn {
		padding: 0.5rem 1rem;
		border: 1px solid rgba(255, 255, 255, 0.25);
		border-radius: 0.5rem;
		background: rgba(0, 0, 0, 0.4);
		color: rgba(255, 255, 255, 0.85);
		font: inherit;
		font-size: 0.875rem;
		cursor: pointer;
		backdrop-filter: blur(4px);
	}

	.btn:hover:not(:disabled) {
		background: rgba(0, 0, 0, 0.6);
		border-color: rgba(255, 255, 255, 0.4);
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: default;
	}
</style>
