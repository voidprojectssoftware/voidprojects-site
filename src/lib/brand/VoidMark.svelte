<script lang="ts">
	// The Void Projects logo: a monochromatic "VP" lettermark (Inter, bold), no
	// frame. `color` recolors it; defaults to brand violet.
	let {
		size = 200,
		color = 'var(--color-primary)',
		text = 'VP',
		class: className = ''
	}: { size?: number; color?: string; text?: string; class?: string } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 100 100"
	class={className}
	role="img"
	aria-label="Void Projects"
>
	<text
		x="50"
		y="51"
		text-anchor="middle"
		dominant-baseline="central"
		font-family="'Inter Variable', sans-serif"
		font-weight="800"
		font-size="46"
		letter-spacing="-1.5"
		fill={color}>{text}</text
	>
</svg>
