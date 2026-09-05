import { useTranslations } from 'next-intl';
import type { PartOfSpeech } from '@/lib/domain';

type LearnTranslations = ReturnType<typeof useTranslations<'learn'>>;

/** Localized label for a part of speech, shared by study UIs. */
export function posLabel(t: LearnTranslations, pos: PartOfSpeech): string {
  switch (pos) {
    case 'noun':
      return t('pos.noun');
    case 'verb':
      return t('pos.verb');
    case 'adverb':
      return t('pos.adverb');
    case 'adjective':
      return t('pos.adjective');
    case 'conjunction':
      return t('pos.conjunction');
    case 'demonstrative':
      return t('pos.demonstrative');
  }
}