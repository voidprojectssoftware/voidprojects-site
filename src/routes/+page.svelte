<script>
	import github from '$lib/assets/github.svg';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
</script>

<div class="flex h-screen items-center justify-center">
	<div class="flex flex-col gap-2">
		<span class="text-center text-5xl font-semibold">Void Projects</span>
		<span class="text-center">Software projects for the next decade.</span>
		<Separator class="my-2" />
		<div class="flex flex-row justify-center">
			<Button
				variant="outline"
				onclick={() => window.open('https://github.com/voidprojectssoftware')}
				>Github<img src={github} height={32} width={32} alt="GitHub Logo" /></Button
			>
		</div>
	</div>
</div>
