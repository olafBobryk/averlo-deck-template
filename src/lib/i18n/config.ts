export const LOCALE_IDS = ["en", "it", "nl", "tr", "de", "fr", "pl"] as const;

export type LocaleId = (typeof LOCALE_IDS)[number];

export type LocaleDefinition = {
	baseUrl: string;
	countryCode: string | null;
	domain: string;
	flag: string;
	htmlLang: string;
	id: LocaleId;
	intlLocale: string;
	label: string;
	metadataLocale: string;
	localePrompt?: {
		cancelLabel: string;
		confirmLabel: string;
		description: string;
		title: string;
	};
	shortLabel: string;
};

export const DEFAULT_LOCALE: LocaleId = "en";

export const LOCALES = {
	en: {
		baseUrl: "https://www.averlo.co",
		countryCode: null,
		domain: "www.averlo.co",
		flag: "🇺🇸",
		htmlLang: "en-US",
		id: "en",
		intlLocale: "en-US",
		label: "English",
		metadataLocale: "en_US",
		shortLabel: "EN",
	},
	it: {
		baseUrl: "https://it.averlo.co",
		countryCode: "IT",
		domain: "it.averlo.co",
		flag: "🇮🇹",
		htmlLang: "it-IT",
		id: "it",
		intlLocale: "it-IT",
		label: "Italiano",
		localePrompt: {
			title: "Preferisci l’italiano?",
			description:
				"Sembra che tu sia in Italia. Visita il sito in italiano oppure continua in inglese.",
			confirmLabel: "Vai al sito italiano",
			cancelLabel: "Continua in inglese",
		},
		metadataLocale: "it_IT",
		shortLabel: "IT",
	},
	nl: {
		baseUrl: "https://nl.averlo.co",
		countryCode: "NL",
		domain: "nl.averlo.co",
		flag: "🇳🇱",
		htmlLang: "nl-NL",
		id: "nl",
		intlLocale: "nl-NL",
		label: "Nederlands",
		localePrompt: {
			title: "Liever Nederlands?",
			description:
				"Het lijkt erop dat je in Nederland bent. Bezoek de site in het Nederlands of ga verder in het Engels.",
			confirmLabel: "Naar de Nederlandse site",
			cancelLabel: "Verder in het Engels",
		},
		metadataLocale: "nl_NL",
		shortLabel: "NL",
	},
	tr: {
		baseUrl: "https://tr.averlo.co",
		countryCode: "TR",
		domain: "tr.averlo.co",
		flag: "🇹🇷",
		htmlLang: "tr-TR",
		id: "tr",
		intlLocale: "tr-TR",
		label: "Türkçe",
		localePrompt: {
			title: "Türkçeyi tercih eder misiniz?",
			description:
				"Türkiye’de olduğunuz görünüyor. Siteyi Türkçe görüntüleyebilir veya İngilizce devam edebilirsiniz.",
			confirmLabel: "Türkçe siteye git",
			cancelLabel: "İngilizce devam et",
		},
		metadataLocale: "tr_TR",
		shortLabel: "TR",
	},
	de: {
		baseUrl: "https://de.averlo.co",
		countryCode: "DE",
		domain: "de.averlo.co",
		flag: "🇩🇪",
		htmlLang: "de-DE",
		id: "de",
		intlLocale: "de-DE",
		label: "Deutsch",
		localePrompt: {
			title: "Deutsch bevorzugen?",
			description:
				"Es sieht so aus, als wären Sie in Deutschland. Besuchen Sie die Website auf Deutsch oder fahren Sie auf Englisch fort.",
			confirmLabel: "Zur deutschen Website",
			cancelLabel: "Auf Englisch fortfahren",
		},
		metadataLocale: "de_DE",
		shortLabel: "DE",
	},
	fr: {
		baseUrl: "https://fr.averlo.co",
		countryCode: "FR",
		domain: "fr.averlo.co",
		flag: "🇫🇷",
		htmlLang: "fr-FR",
		id: "fr",
		intlLocale: "fr-FR",
		label: "Français",
		localePrompt: {
			title: "Préférez-vous le français ?",
			description:
				"Vous semblez être en France. Consultez le site en français ou continuez en anglais.",
			confirmLabel: "Voir le site en français",
			cancelLabel: "Continuer en anglais",
		},
		metadataLocale: "fr_FR",
		shortLabel: "FR",
	},
	pl: {
		baseUrl: "https://pl.averlo.co",
		countryCode: "PL",
		domain: "pl.averlo.co",
		flag: "🇵🇱",
		htmlLang: "pl-PL",
		id: "pl",
		intlLocale: "pl-PL",
		label: "Polski",
		localePrompt: {
			title: "Wolisz język polski?",
			description:
				"Wygląda na to, że jesteś w Polsce. Zobacz stronę po polsku lub kontynuuj po angielsku.",
			confirmLabel: "Przejdź na polską stronę",
			cancelLabel: "Kontynuuj po angielsku",
		},
		metadataLocale: "pl_PL",
		shortLabel: "PL",
	},
} as const satisfies Record<LocaleId, LocaleDefinition>;

export const LOCALE_OPTIONS = LOCALE_IDS.map((locale) => LOCALES[locale]);

export function getLocaleDefinition(locale: LocaleId): LocaleDefinition {
	return LOCALES[locale];
}

export function isLocaleId(value: string): value is LocaleId {
	return LOCALE_IDS.includes(value as LocaleId);
}

export function normalizeRequestHost(host: string | null | undefined) {
	return (
		(host ?? "").split(",")[0]?.trim().toLowerCase().replace(/:\d+$/, "") ?? ""
	);
}

export function resolveLocaleFromHost(
	host: string | null | undefined,
): LocaleId {
	const normalizedHost = normalizeRequestHost(host);

	const matchingLocale = LOCALE_OPTIONS.find(
		(locale) =>
			normalizedHost === locale.domain ||
			normalizedHost === `${locale.id}.localhost` ||
			normalizedHost.startsWith(`${locale.id}.localhost.`),
	);
	if (matchingLocale) return matchingLocale.id;

	return DEFAULT_LOCALE;
}

export function isPublicLocalizedPath(pathname: string) {
	return !(
		pathname.startsWith("/api") ||
		pathname.startsWith("/internal") ||
		pathname.startsWith("/_next")
	);
}

export function getLocaleUrl(
	locale: LocaleId,
	path: string,
	options?: { localPort?: string; local?: boolean },
) {
	const definition = getLocaleDefinition(locale);
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;

	if (options?.local) {
		const host =
			locale === DEFAULT_LOCALE ? "www.localhost" : `${locale}.localhost`;
		const port = options.localPort ? `:${options.localPort}` : "";
		return `http://${host}${port}${normalizedPath}`;
	}

	return `${definition.baseUrl}${normalizedPath}`;
}

export function getAlternateLanguageUrls(pathname: string) {
	return {
		...Object.fromEntries(
			LOCALE_OPTIONS.map((locale) => [
				locale.htmlLang,
				getLocaleUrl(locale.id, pathname),
			]),
		),
		"x-default": getLocaleUrl(DEFAULT_LOCALE, pathname),
	};
}

export function getOpenGraphAlternateLocales(locale: LocaleId) {
	return LOCALE_OPTIONS.filter((option) => option.id !== locale).map(
		(option) => option.metadataLocale,
	);
}

export function getSuggestedLocale(country: string | null) {
	if (!country) return null;
	return (
		LOCALE_OPTIONS.find((locale) => locale.countryCode === country)?.id ?? null
	);
}
