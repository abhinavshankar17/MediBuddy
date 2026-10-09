import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { Globe, Check, ChevronDown } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ta', label: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' }
];

export default function LanguageSwitcher({ className = '', variant = 'dropdown' }) {
  const { i18n } = useTranslation();
  const { currentLanguage, changeLanguage } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const activeCode = currentLanguage || i18n.language || 'en';
  const currentLang = LANGUAGES.find((l) => l.code === activeCode) || LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code) => {
    changeLanguage(code);
    setIsOpen(false);
  };

  if (variant === 'segmented') {
    return (
      <div className={`inline-flex items-center p-1 rounded-xl bg-[#F4F0E8] border border-[#E8E2D7] shadow-2xs ${className}`}>
        {LANGUAGES.map((lang) => {
          const isActive = lang.code === activeCode;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleSelect(lang.code)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#CC785C] text-white shadow-xs'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              {lang.nativeName}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 bg-[#FAF8F5] hover:bg-[#F4F0E8] border border-[#E8E2D7] hover:border-[#CC785C]/40 rounded-xl text-xs font-bold text-[#1C1917] shadow-2xs transition-all cursor-pointer"
        title="Change Language / भाषा बदलें / மொழியை மாற்றுக"
        aria-label="Language selector"
      >
        <Globe className="w-3.5 h-3.5 text-[#CC785C] flex-shrink-0" />
        <span className="font-semibold">{currentLang.nativeName}</span>
        <ChevronDown className={`w-3 h-3 text-[#78716C] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-44 rounded-2xl bg-white border border-[#E8E2D7] shadow-xl py-1.5 z-50 animate-fade-in divide-y divide-[#E8E2D7]/40">
          <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-[#A8A29E]">
            Select Language
          </div>
          <div className="py-1">
            {LANGUAGES.map((lang) => {
              const isSelected = lang.code === activeCode;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang.code)}
                  className={`w-full text-left px-3.5 py-2 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#CC785C]/10 text-[#CC785C] font-bold'
                      : 'text-[#1C1917] hover:bg-[#FAF8F5] font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{lang.flag}</span>
                    <span>{lang.nativeName}</span>
                    <span className="text-[10px] text-[#A8A29E] font-normal">({lang.label})</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#CC785C]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
