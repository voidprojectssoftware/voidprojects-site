// Vite's image module types are lowercase-only; some camera exports are .JPEG.
declare module '*.JPEG' {
	const src: string;
	export default src;
}
