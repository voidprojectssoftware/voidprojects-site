import type { Attachment } from 'svelte/attachments';

const ALLOW =
	'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';

// Upgrades every server-rendered `YoutubeEmbed` under the node: its link becomes a
// play button that swaps in the youtube-nocookie player, so nothing is requested
// from YouTube until the visitor asks for the video.
export const upgradeYoutubeEmbeds: Attachment<HTMLElement> = (node) => {
	const cleanups: (() => void)[] = [];

	for (const box of node.querySelectorAll<HTMLElement>('[data-youtube-id]')) {
		const link = box.querySelector('a');
		const id = box.dataset.youtubeId;
		if (!link || !id) continue;

		const button = document.createElement('button');
		button.type = 'button';
		button.className = link.className;
		button.setAttribute('aria-label', link.getAttribute('aria-label') ?? '');
		button.replaceChildren(...link.childNodes);
		link.replaceWith(button);

		const play = () => {
			const iframe = document.createElement('iframe');
			iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1`;
			iframe.title = box.dataset.youtubeTitle ?? '';
			iframe.allow = ALLOW;
			iframe.referrerPolicy = 'strict-origin-when-cross-origin';
			iframe.allowFullscreen = true;
			iframe.className = 'absolute inset-0 h-full w-full';
			button.replaceWith(iframe);
			iframe.focus();
		};
		button.addEventListener('click', play, { once: true });
		cleanups.push(() => button.removeEventListener('click', play));
	}

	return () => cleanups.forEach((cleanup) => cleanup());
};
