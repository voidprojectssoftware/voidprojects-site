import type { Picture } from '@sveltejs/enhanced-img';

// Responsive pictures of the showcase captures in static/websites/, keyed by the
// public path that websites.ts stores (e.g. `/websites/rally4hallie-desktop.jpg`).
// The originals stay in static/ so their public URLs keep working; this lives
// apart from websites.ts because the API bundle imports that file. quality=70
// keeps small text in the captures as crisp as the JPEG originals.
const pictures = import.meta.glob<Picture>('/static/websites/*.jpg', {
	eager: true,
	import: 'default',
	query: '?w=1280;960;640&quality=70&enhanced'
});

export function showcasePicture(path: string): Picture | undefined {
	return pictures[`/static${path}`];
}
