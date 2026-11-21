import { englishCopy } from './wording-defaults.js';

export { englishCopy };
const rankCopyKeys = ['invalidRank', 'requiredRank', 'rankHandle', 'rankInstructions', 'rankPicked', 'rankMoved'] as const;
const listCopyKeys = ['invalidList', 'requiredList', 'listAdd', 'listRemove', 'listRow', 'listRemoved', 'listCellRequired', 'listEmail', 'listUrl'] as const;
const uploadCopyKeys = ['uploadAdd', 'uploadHint', 'uploadFiles', 'uploadProgress', 'uploadQueued', 'uploadRemove', 'uploadCancel', 'uploadRetry', 'uploadAgain', 'uploadStale', 'uploadAdded', 'uploadRemoved', 'uploadTooMany', 'uploadInvalid', 'uploadError', 'uploadBusy', 'requiredUpload', 'invalidUpload'] as const;
/**
 * The file input's chip, preview and confirmation lines, and its failed-files line. A form that predates them keeps passing the parser without them:
 * a locale that omits one shows the English line, so adopting the release needs no new translation. `uploadResolve` is no longer shown
 * (the failed-files count replaced it, 11 November 2026) and stays accepted so older wording keeps parsing.
 */
export const uploadPreviewCopyKeys = ['uploadFailedOne', 'uploadFailedMany', 'uploadResolve', 'uploadChipUploaded', 'uploadChipWaiting', 'uploadChipUploading', 'uploadChipFailed', 'uploadChipExpired', 'uploadOpen', 'uploadFileLabel', 'uploadPdfLabel', 'uploadRemoveTitle', 'uploadRemoveDescription', 'uploadRemoveWarning', 'uploadRemoveConfirm', 'uploadDismiss', 'uploadClose', 'uploadCloseModal', 'uploadOpenInTab', 'uploadPdfPreview', 'uploadFilePreview', 'uploadImagePreview', 'uploadPreviewUnavailable', 'uploadPreviewOpenable', 'uploadPreviewNotKept'] as const;
/**
 * The lines of the select, combobox, tags, number, slider, scale, selection limit, calendar date, date range, phone, toggle and colour inputs,
 * a text field's own length limit, the link format and the reset to what research found (`resetToFound`). A form that predates them keeps passing the parser
 * without them: a locale that omits one shows the English line, so adopting the release needs no new translation.
 */
export const inputCopyKeys = ['invalidNumber', 'numberMin', 'numberMax', 'numberStep', 'selectPlaceholder', 'searchPlaceholder', 'noResults', 'allSelected', 'toggleOptions', 'removeOption', 'sliderLabel', 'invalidScale', 'selectionLimit', 'resetToFound',
  'chooseDate', 'chooseDateRange', 'datePlaceholder', 'dateStart', 'dateEnd', 'previousMonth', 'nextMonth', 'chooseMonth', 'chooseYear', 'dateToday', 'dateClear', 'dateMin', 'dateMax', 'dateRangeBoth', 'dateRangeOrder',
  'invalidPhone', 'phoneCountry', 'phonePlaceholder', 'toggleYes', 'toggleNo', 'requiredToggle', 'invalidColor', 'colorPlaceholder', 'colorChoose', 'colorPicker', 'colorCustom', 'colorAdd', 'colorRemove', 'colorChange', 'colorSwatches', 'colorChosen', 'textMax', 'invalidUrl'] as const;
/** The reference chips and their preview. Optional: a locale that omits one shows the English line, so adopting the release needs no new translation. */
export const referenceCopyKeys = ['referencePdf', 'referenceImage', 'referencePages', 'referencePage', 'referenceClose', 'referenceCloseModal', 'referenceOpenInTab', 'referenceZoomIn', 'referenceZoomOut', 'referencePdfOpen', 'referenceUnavailable', 'referenceNewTab'] as const;
export const accessKeyCopyKeys = ['accessKeyMissing', 'accessKeyHelp', 'accessKeyLabel', 'accessKeyContinue', 'accessKeyUse', 'accessKeyInvalid', 'accessKeyRetry', 'accessKeySaved', 'accessKeyChecking', 'accessKeyRefused', 'accessKeyClosed'] as const;
/** The website-language checklist's search. The page cannot tell from the definition whether the app uses it, so the picker asks for these in a non-English form when it mounts. */
export const languageSearchCopyKeys = ['searchLanguage', 'searchLanguageLabel', 'noLanguageMatches', 'languageMatch', 'languageMatches', 'languageLimit'] as const;
type ListCopyKey = typeof listCopyKeys[number];
type UploadCopyKey = typeof uploadCopyKeys[number] | typeof uploadPreviewCopyKeys[number];
type InputCopyKey = typeof inputCopyKeys[number];
type AccessKeyCopyKey = typeof accessKeyCopyKeys[number];
type LanguageSearchCopyKey = typeof languageSearchCopyKeys[number];
type RankCopyKey = typeof rankCopyKeys[number];
type ReferenceCopyKey = typeof referenceCopyKeys[number];
type OptionalCopyKey = RankCopyKey | ReferenceCopyKey | ListCopyKey | UploadCopyKey | InputCopyKey | AccessKeyCopyKey | LanguageSearchCopyKey | 'clearLanguageSearch' | 'invalidDate' | 'questionnaireLanguage' | 'clearCountrySearch' | 'goSlide' | 'slideNumber' | 'invalidEmail';
export type InterfaceCopy = Record<Exclude<keyof typeof englishCopy, OptionalCopyKey>, string> & Partial<Record<OptionalCopyKey, string>>;
export type InterfaceWording = { defaultLocale: string; locales: Record<string, Partial<InterfaceCopy>>; languageSwitcher?: true };

function entries(input: unknown): [string, unknown][] {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      ![null, Object.prototype].includes(Object.getPrototypeOf(input))) {
    throw new TypeError('Expected a wording object.');
  }
  return Object.entries(input);
}
function localeOf(input: unknown): string {
  if (typeof input !== 'string') throw new TypeError('Expected a locale tag.');
  return Intl.getCanonicalLocales(input)[0]!;
}
const tokens = (input: string) => [...input.matchAll(/\{([a-z]+)\}/g)].map(match => match[1]).sort().join('|');

export function parseWording(input: unknown, hasSections = false, hasRank = false, hasList = false, hasDate = false, hasEmail = false, hasUpload = false): InterfaceWording {
  const config = Object.fromEntries(entries(input));
  if (Object.keys(config).some(key => key !== 'defaultLocale' && key !== 'locales' && key !== 'languageSwitcher')) throw new TypeError('Unknown interface wording setting.');
  const defaultLocale = localeOf(config.defaultLocale);
  if (config.languageSwitcher !== undefined && typeof config.languageSwitcher !== 'boolean') throw new TypeError('Expected a boolean languageSwitcher.');
  const configuredLocales = entries(config.locales);
  const languageSwitcher = config.languageSwitcher === true && configuredLocales.length > 1;
  const locales: InterfaceWording['locales'] = {};
  for (const [tag, raw] of configuredLocales) {
    const locale = localeOf(tag);
    if (Object.hasOwn(locales, locale)) throw new TypeError(`Duplicate locale: ${locale}`);
    const copy: Partial<InterfaceCopy> = {};
    for (const [key, value] of entries(raw)) {
      if (!Object.hasOwn(englishCopy, key)) throw new TypeError(`Unknown wording key: ${key}`);
      const name = key as keyof InterfaceCopy;
      if (typeof value !== 'string' || !value.trim() || tokens(value) !== tokens(englishCopy[name])) {
        throw new TypeError(`Invalid wording or placeholders: ${locale}.${key}`);
      }
      copy[name] = value;
    }
    for (const key of Object.keys(englishCopy) as (keyof InterfaceCopy)[]) {
      if ((!hasDate && key === 'invalidDate') || (!hasEmail && key === 'invalidEmail') || (!hasList && listCopyKeys.includes(key as ListCopyKey)) || (!hasUpload && uploadCopyKeys.includes(key as typeof uploadCopyKeys[number])) || (uploadPreviewCopyKeys as readonly string[]).includes(key) || (inputCopyKeys as readonly string[]).includes(key) || (referenceCopyKeys as readonly string[]).includes(key) || (!hasRank && rankCopyKeys.includes(key as RankCopyKey)) || (!hasSections && (key === 'goSlide' || key === 'slideNumber')) || key === 'clearCountrySearch' || key === 'clearLanguageSearch' || languageSearchCopyKeys.includes(key as LanguageSearchCopyKey) || accessKeyCopyKeys.includes(key as AccessKeyCopyKey) || (key === 'questionnaireLanguage' && !languageSwitcher)) continue;
      if (locale.split('-')[0] !== 'en' && !Object.hasOwn(copy, key)) throw new TypeError(`Unresolved wording: ${locale}.${key}`);
    }
    locales[locale] = copy;
  }
  if (!Object.hasOwn(locales, defaultLocale)) throw new TypeError('The default locale must be offered.');
  return { defaultLocale, locales, ...(languageSwitcher ? { languageSwitcher: true } : {}) };
}

/**
 * The lines a sharedService form still needs, per offered language other than English. The definition cannot say whether
 * the form uses sharedService (a prop of the page), so the parser never asks for these; the page checks this when it mounts.
 */
export function missingAccessKeyWording(wording?: InterfaceWording): { locale: string; missing: string[] }[] {
  if (!wording) return [];
  return Object.entries(wording.locales)
    .filter(([locale]) => locale.split('-')[0] !== 'en')
    .map(([locale, copy]) => ({ locale, missing: accessKeyCopyKeys.filter(key => !copy[key]) as string[] }))
    .filter(({ missing }) => missing.length > 0);
}

export function resolveLocale(wording?: InterfaceWording, saved?: string, preferred: readonly string[] = []): string {
  if (!wording) return 'en';
  if (saved && Object.hasOwn(wording.locales, saved)) return saved;
  for (const raw of preferred) {
    let tag: string;
    try { tag = localeOf(raw); } catch { continue; }
    if (Object.hasOwn(wording.locales, tag)) return tag;
    const base = tag.split('-')[0]!;
    if (Object.hasOwn(wording.locales, base)) return base;
  }
  return wording.defaultLocale;
}

export function resolveCopy(wording?: InterfaceWording, locale = wording?.defaultLocale ?? 'en'): InterfaceCopy {
  if (!wording) return englishCopy;
  if (!Object.hasOwn(wording.locales, locale)) throw new TypeError(`Locale is not offered: ${locale}`);
  const overrides = wording.locales[locale];
  const language = locale.split('-')[0];
  if (language === 'en') return { ...englishCopy, ...overrides };
  const clearCountrySearch = language === 'fr' ? 'Effacer la recherche de pays' :
    language === 'pt' ? 'Limpar a pesquisa de países' : undefined;
  const clearLanguageSearch = language === 'fr' ? 'Effacer la recherche de langue' :
    language === 'pt' ? 'Limpar a pesquisa de idiomas' : undefined;
  return { clearCountrySearch, clearLanguageSearch, ...overrides } as InterfaceCopy;
}

export function message(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{([a-z]+)\}/g, (match, key: string) => Object.hasOwn(values, key) ? String(values[key]) : match);
}
