<!--
	Bare capture page: nothing but the root layout's night-sky SpaceBackground.
	Used to record clean visuals of the star field for a blog video.
	The fullscreen button hides itself while fullscreen is active so it stays
	out of the recording; press Esc to exit.
-->
<script lang="ts">
	let isFullscreen = $state(false);

	function enterFullscreen() {
		document.documentElement.requestFullscreen?.();
	}

	function syncState() {
		isFullscreen = document.fullscreenElement !== null;
	}
</script>

<svelte:head>
	<title>Void Projects — Sky</title>
</svelte:head>

<svelte:document onfullscreenchange={syncState} />

{#if !isFullscreen}
	<button class="fs-btn" onclick={enterFullscreen}>Go fullscreen</button>
{/if}

<style>
	.fs-btn {
		position: fixed;
		bottom: 1.5rem;
		right: 1.5rem;
		z-index: 50;
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

	.fs-btn:hover {
		background: rgba(0, 0, 0, 0.6);
		border-color: rgba(255, 255, 255, 0.4);
	}
</style>
