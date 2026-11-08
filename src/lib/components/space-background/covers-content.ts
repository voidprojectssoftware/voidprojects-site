const MEDIA = new Set(['IMG', 'VIDEO', 'INPUT', 'TEXTAREA', 'SELECT']);

function intersects(a: DOMRect, b: DOMRect): boolean {
	return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function textUnder(el: Element, box: DOMRect): boolean {
	const range = document.createRange();
	for (const node of el.childNodes) {
		if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) continue;
		range.selectNodeContents(node);
		for (const rect of range.getClientRects()) if (intersects(rect, box)) return true;
	}
	return false;
}

/**
 * Whether page text or media sits under `el`, a fixed overlay. Hit-tests a few points
 * across its box, so content with `pointer-events: none` is not seen.
 */
export function coversContent(el: HTMLElement): boolean {
	const box = el.getBoundingClientRect();
	if (!box.width || !box.height) return false;
	const xs = [box.left + 2, box.left + box.width / 2, box.right - 2];
	const ys = [box.top + 1, box.top + box.height / 2, box.bottom - 1];
	for (const x of xs) {
		for (const y of ys) {
			for (const hit of document.elementsFromPoint(x, y)) {
				if (el.contains(hit)) continue;
				if (MEDIA.has(hit.tagName) || textUnder(hit, box)) return true;
			}
		}
	}
	return false;
}
