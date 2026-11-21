import { DEFAULT_LOCALE, LOCALE_IDS, LOCALES } from "./config";

export function publicPathname(pathname: string) {
	return (
		pathname.replace(new RegExp(`^/(?:${LOCALE_IDS.join("|")})(?=/|$)`), "") ||
		"/"
	);
}

export function localeRewrites() {
	// Files and API handlers resolve before page routing. One rewrite per request.
	const source =
		"/:path((?!api(?:/|$)|_next(?:/|$)|admin(?:/|$)|\\.well-known(?:/|$)|(?:en|it|nl|tr|de|fr|pl)(?:/|$)).*)";
	return {
		afterFiles: [
			...LOCALE_IDS.filter((locale) => locale !== DEFAULT_LOCALE).map(
				(locale) => ({
					source,
					has: [
						{
							type: "host" as const,
							value: `(?:${LOCALES[locale].domain.replaceAll(".", "\\.")}|${locale}\\.localhost(?:\\.[^:]+)?)(?::\\d+)?`,
						},
					],
					destination: `/${locale}/:path`,
				}),
			),
			{ source, destination: `/${DEFAULT_LOCALE}/:path` },
		],
	};
}

export function localePrefixRedirects() {
	return [
		{
			source: `/:locale(${LOCALE_IDS.join("|")})/:path*`,
			has: [
				{
					type: "host" as const,
					value: "(?:www\\.|it\\.|nl\\.|tr\\.|de\\.|fr\\.|pl\\.)?averlo\\.co",
				},
			],
			destination: "/:path*",
			permanent: false,
		},
	];
}
