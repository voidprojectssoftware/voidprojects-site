<script lang="ts">
	import { Switch } from '$lib/components/shadcn/ui/switch/index.js';
	import { Sun, Moon } from '@lucide/svelte';

	let dark = $state(false);

	function toggleDark(checked: boolean) {
		dark = checked;
		document.documentElement.classList.toggle('dark', dark);
	}
</script>

<header class="sticky top-0 z-1 bg-background pt-4">
	<div class="flex flex-row items-center justify-between">
		<div class="flex flex-row items-center justify-center gap-4">
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
