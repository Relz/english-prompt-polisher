type ParseJsonResult = { ok: true; value: unknown } | { ok: false };

function parseJson(value: string): ParseJsonResult {
	try {
		return { ok: true, value: JSON.parse(value) };
	} catch {
		return { ok: false };
	}
}

function isSupportedFenceInfo(value: string): boolean {
	const normalized: string = value.trim().toLowerCase();
	return normalized === '' || normalized === 'json';
}

function previousNonWhitespace(value: string, index: number): string | undefined {
	for (let currentIndex: number = index - 1; currentIndex >= 0; currentIndex -= 1) {
		const current: string = value[currentIndex];
		if (current.trim()) {
			return current;
		}
	}
}

function nextNonWhitespace(value: string, index: number): string | undefined {
	for (let currentIndex: number = index + 1; currentIndex < value.length; currentIndex += 1) {
		const current: string = value[currentIndex];
		if (current.trim()) {
			return current;
		}
	}
}

function hasUnclosedArrayBefore(value: string, index: number): boolean {
	let depth: number = 0;
	for (let currentIndex: number = 0; currentIndex < index; currentIndex += 1) {
		const current: string = value[currentIndex];
		if (current === '[') {
			depth += 1;
		}
		if (current === ']' && depth > 0) {
			depth -= 1;
		}
	}
	return depth > 0;
}

function isEmbeddedArrayElement(value: string, start: number, end: number): boolean {
	return (
		previousNonWhitespace(value, start) === '[' ||
		nextNonWhitespace(value, end) === ']' ||
		(hasUnclosedArrayBefore(value, start) && value.includes(']', end + 1))
	);
}

export function jsonFromText(text: string): unknown {
	const trimmed: string = text.trim();
	if (!trimmed) {
		return;
	}

	const parsed: ParseJsonResult = parseJson(trimmed);
	if (parsed.ok) {
		return parsed.value;
	}

	const fencedPattern: RegExp = /```([^\r\n]*)\r?\n?([\s\S]*?)```/g;
	for (const fenced of trimmed.matchAll(fencedPattern)) {
		if (!isSupportedFenceInfo(fenced[1])) {
			continue;
		}
		if (!fenced[2].trim()) {
			continue;
		}
		const fencedParsed: ParseJsonResult = parseJson(fenced[2]);
		if (fencedParsed.ok) {
			return fencedParsed.value;
		}
	}

	const embeddedSource: string = trimmed.replace(fencedPattern, (raw: string, info: string): string => {
		return isSupportedFenceInfo(info) ? raw : '';
	});
	const start: number = embeddedSource.indexOf('{');
	const end: number = embeddedSource.lastIndexOf('}');
	if (start >= 0 && end > start) {
		if (isEmbeddedArrayElement(embeddedSource, start, end)) {
			return;
		}
		const embeddedParsed: ParseJsonResult = parseJson(embeddedSource.slice(start, end + 1));
		if (embeddedParsed.ok) {
			return embeddedParsed.value;
		}
	}
}
