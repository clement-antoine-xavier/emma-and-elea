import {render, screen} from '@testing-library/react';
import {NextIntlClientProvider, useTranslations} from 'next-intl';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';

function Status() {
  const t = useTranslations('Auth.status');
  return <p>{t('checking')}</p>;
}

describe('next-intl setup', () => {
  it('renders messages for the active locale', () => {
    const {unmount} = render(
      <NextIntlClientProvider locale="en" messages={en}>
        <Status />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText('Checking session…')).toBeInTheDocument();
    unmount();

    render(
      <NextIntlClientProvider locale="fr" messages={fr}>
        <Status />
      </NextIntlClientProvider>,
    );

    expect(
      screen.getByText('Vérification de la session…'),
    ).toBeInTheDocument();
  });
});
