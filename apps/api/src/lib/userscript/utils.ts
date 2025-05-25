import {
  countryNames,
  plonkitCreditFooter,
} from '@api/lib/userscript/constants';

export function getPlonkitCountrySlug(countryName: string) {
  switch (countryName) {
    case 'Israel':
      return 'israel-west-bank';
    default:
      return countryName.toLowerCase().replace(/ /g, '-');
  }
}

const countries = new Map(
  countryNames.map((name) => {
    const slug = getPlonkitCountrySlug(name);
    return [
      name.toLocaleLowerCase().trim(),
      {
        name: name,
        footer: `Check out  <a href="https://www.plonkit.net/${slug}" rel="nofollow" target="_blank">www.plonkit.net/${slug}</a>. for more clues.`,
      },
    ];
  }),
);

export function generateFooter(
  creditPlonkit: boolean,
  countryName: string,
  metaFooter: string,
  mapFooter: string,
) {
  if (!creditPlonkit) {
    return plonkitCreditFooter;
  }

  const trimmedMetaFooter = metaFooter.trim();
  if (trimmedMetaFooter) {
    return trimmedMetaFooter;
  }

  const trimmedMapFooter = mapFooter.trim();
  if (trimmedMapFooter) {
    return trimmedMapFooter;
  }

  const countryFooter = countries.get(countryName.toLocaleLowerCase().trim());
  if (countryFooter) {
    return countryFooter.footer;
  }

  return '';
}
