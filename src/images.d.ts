// enhanced-img only types a bare `?enhanced` suffix; this covers imports that
// pass imagetools directives first, e.g. `photo.jpg?w=384;224&enhanced`.
declare module '*&enhanced' {
	import type { Picture } from '@sveltejs/enhanced-img';
	const value: Picture;
	export default value;
}
