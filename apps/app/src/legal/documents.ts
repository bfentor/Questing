import type { Language } from '@/i18n';

export type LegalDocument = 'terms' | 'privacy';

/**
 * The terms of service and privacy policy shown in the app.
 *
 * PLACEHOLDERS: replace with the real documents before launch (see TODO.md,
 * "Required before launch"), and bump TERMS_VERSION in the API's settings
 * whenever they change so everyone accepts the new version.
 */
export const LEGAL_DOCUMENTS: Record<LegalDocument, Record<Language, string>> = {
  terms: {
    en: 'The terms of service are being written. This placeholder will be replaced before Questing launches.',
    fi: 'Käyttöehtoja kirjoitetaan. Tämä väliaikainen teksti korvataan ennen Questingin julkaisua.',
    sv: 'Användarvillkoren håller på att skrivas. Den här tillfälliga texten ersätts innan Questing lanseras.',
  },
  privacy: {
    en: 'The privacy policy is being written. This placeholder will be replaced before Questing launches.',
    fi: 'Tietosuojaselostetta kirjoitetaan. Tämä väliaikainen teksti korvataan ennen Questingin julkaisua.',
    sv: 'Integritetspolicyn håller på att skrivas. Den här tillfälliga texten ersätts innan Questing lanseras.',
  },
};
