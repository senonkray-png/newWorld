'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { UserActions } from '@/components/auth/user-actions';
import { LanguageSwitcher } from '@/components/language-switcher';
import type { Locale } from '@/i18n/config';

export function SiteHeader({ locale }: { locale: Locale }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const text = useMemo(() => {
    if (locale === 'en') {
      return {
        menu: 'Menu',
        home: 'Home',
        users: 'Users',
        messages: 'Messages',
        products: 'Products',
        services: 'Services',
        partners: 'Partners',
        register: 'Become a partner',
      };
    }

    if (locale === 'uk') {
      return {
        menu: 'Меню',
        home: 'Головна',
        users: 'Користувачі',
        messages: 'Повідомлення',
        products: 'Товари',
        services: 'Послуги',
        partners: 'Партнери',
        register: 'Стати партнером',
      };
    }

    return {
      menu: 'Меню',
      home: 'Главная',
      users: 'Пользователи',
      messages: 'Сообщения',
      products: 'Товары',
      services: 'Услуги',
      partners: 'Партнеры',
      register: 'Стать партнером',
    };
  }, [locale]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <header className="nm-site-header-wrap">
      <div className="nm-site-header">
        <Link href={`/${locale}`} className="nm-site-brand" aria-label="СпівДія">
          <Image src="/design/spivdiya-logo.png" alt="СпівДія logo" width={34} height={34} className="nm-site-logo" priority />
          <span className="nm-site-title">СпівДія</span>
        </Link>

        <div className="nm-site-controls">
          <LanguageSwitcher currentLocale={locale} />
          <UserActions locale={locale} />
          <div className="nm-burger-wrap" ref={menuRef}>
            <button
              type="button"
              className="nm-burger-btn"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label={text.menu}
            >
              <span />
              <span />
              <span />
            </button>

            {menuOpen ? (
              <nav className="nm-dropdown-menu nm-dropdown-menu--right" role="menu">
                <Link href={`/${locale}`} role="menuitem" className="nm-dropdown-item" onClick={() => setMenuOpen(false)}>
                  {text.home}
                </Link>
                <Link href={`/${locale}/users`} role="menuitem" className="nm-dropdown-item" onClick={() => setMenuOpen(false)}>
                  {text.users}
                </Link>
                <Link href={`/${locale}/messages`} role="menuitem" className="nm-dropdown-item" onClick={() => setMenuOpen(false)}>
                  {text.messages}
                </Link>
                <Link href={`/${locale}/products`} role="menuitem" className="nm-dropdown-item" onClick={() => setMenuOpen(false)}>
                  {text.products}
                </Link>
                <Link href={`/${locale}/services`} role="menuitem" className="nm-dropdown-item" onClick={() => setMenuOpen(false)}>
                  {text.services}
                </Link>
                <Link href={`/${locale}/partners`} role="menuitem" className="nm-dropdown-item" onClick={() => setMenuOpen(false)}>
                  {text.partners}
                </Link>
                <Link href={`/${locale}/login`} role="menuitem" className="nm-dropdown-item nm-dropdown-item--accent" onClick={() => setMenuOpen(false)}>
                  {text.register}
                </Link>
              </nav>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
