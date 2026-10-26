import React, { useState, useEffect } from 'react';
import { X, Key, Globe, ExternalLink, ShieldCheck, LogOut, AlertCircle, HelpCircle, Palette, FileText } from 'lucide-react';
import { useTheme, Theme } from './ThemeContext';

interface SettingsModalProps {
  onClose: () => void;
  onSaveToken: (token: string) => void;
  onSaveClientId: (clientId: string) => void;
  currentToken: string | null;
  onLogout: () => void;
}

const THEMES: { id: Theme; label: string; description: string; preview: React.ReactNode }[] = [
  {
    id: 'purple',
    label: 'Фиолетовая',
    description: 'Тёмная с фиолетовым акцентом',
    preview: (
      <div className="flex gap-1.5 items-center">
        <span className="w-4 h-4 rounded-full bg-[#181424] border border-white/20" />
        <span className="w-4 h-4 rounded-full bg-[#2c2243]" />
        <span className="w-4 h-4 rounded-full bg-[#7b52ff]" />
      </div>
    ),
  },
  {
    id: 'mono',
    label: 'Чёрно-белая',
    description: 'Минималистичная монохромная',
    preview: (
      <div className="flex gap-1.5 items-center">
        <span className="w-4 h-4 rounded-full bg-[#0a0a0a] border border-white/20" />
        <span className="w-4 h-4 rounded-full bg-[#1e1e1e] border border-white/10" />
        <span className="w-4 h-4 rounded-full bg-white" />
      </div>
    ),
  },
];

export default function SettingsModal({
  onClose,
  onSaveToken,
  onSaveClientId,
  currentToken,
  onLogout
}: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'auth' | 'theme'>('auth');
  const [authTab, setAuthTab] = useState<'token' | 'oauth'>('token');
  const [tokenInput, setTokenInput] = useState('');
  const [clientIdInput, setClientIdInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('yandex_access_token');
    const savedClientId = localStorage.getItem('yandex_client_id');
    if (savedToken) setTokenInput(savedToken);
    if (savedClientId) setClientIdInput(savedClientId);
  }, []);

  const openUrl = (url: string) => {
    if (window.api?.openExternal) {
      window.api.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleOpenReadme = async () => {
    if (window.api?.openReadme) {
      const res = await window.api.openReadme();
      if (!res.success) {
        openUrl('readme.txt');
      }
    } else {
      openUrl('readme.txt');
    }
  };

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = tokenInput.trim();
    if (!cleanToken) { setErrorMsg('Пожалуйста, введите токен'); return; }
    setErrorMsg(null);
    onSaveToken(cleanToken);
  };

  const handleOAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = clientIdInput.trim();
    if (!cleanId) { setErrorMsg('Пожалуйста, введите Client ID'); return; }
    if (cleanId.startsWith('y0_') || cleanId.length > 40) {
      setErrorMsg(null);
      onSaveToken(cleanId);
      return;
    }
    setErrorMsg(null);
    onSaveClientId(cleanId);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm z-50 p-4">
      <div className="bg-yandex-sidebar p-6 rounded-2xl w-full max-w-lg border border-white/10 shadow-2xl relative text-white max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-yandex-accent" size={24} />
            <h3 className="text-xl font-bold">Настройки</h3>
          </div>
          <button 
            onClick={onClose} 
            className="hover:bg-yandex-card p-1.5 rounded-lg text-yandex-subtext hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Top-level Tabs: Auth / Theme */}
        <div className="flex bg-yandex-bg p-1 rounded-xl mb-5 border border-white/5">
          <button
            type="button"
            onClick={() => setActiveTab('auth')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition ${
              activeTab === 'auth' ? 'bg-yandex-accent text-white shadow' : 'text-yandex-subtext hover:text-white'
            }`}
          >
            <ShieldCheck size={15} /> Авторизация
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('theme')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition ${
              activeTab === 'theme' ? 'bg-yandex-accent text-white shadow' : 'text-yandex-subtext hover:text-white'
            }`}
          >
            <Palette size={15} /> Тема
          </button>
        </div>

        {/* === AUTH TAB === */}
        {activeTab === 'auth' && (
          <div>
            {/* Status */}
            {currentToken ? (
              <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-sm font-medium text-emerald-300">Токен сохранён и активен</span>
                </div>
                <button
                  onClick={onLogout}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2.5 py-1.5 rounded-lg transition"
                >
                  <LogOut size={14} /> Выйти
                </button>
              </div>
            ) : (
              <div className="mb-5 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2.5">
                <AlertCircle className="text-amber-400 shrink-0" size={18} />
                <span className="text-xs text-amber-200">
                  Авторизуйтесь, чтобы загрузить ваши устройства, комнаты и сценарии.
                </span>
              </div>
            )}

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-200 text-sm flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Auth method tabs */}
            <div className="flex bg-yandex-bg p-1 rounded-xl mb-5 border border-white/5">
              <button type="button" onClick={() => { setAuthTab('token'); setErrorMsg(null); }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition ${authTab === 'token' ? 'bg-yandex-accent text-white shadow' : 'text-yandex-subtext hover:text-white'}`}>
                <Key size={15} /> OAuth Токен
              </button>
              <button type="button" onClick={() => { setAuthTab('oauth'); setErrorMsg(null); }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition ${authTab === 'oauth' ? 'bg-yandex-accent text-white shadow' : 'text-yandex-subtext hover:text-white'}`}>
                <Globe size={15} /> Client ID
              </button>
            </div>

            {authTab === 'token' && (
              <form onSubmit={handleTokenSubmit} className="space-y-4">
                <div>
                  <label className="block text-yandex-subtext text-xs uppercase tracking-wider mb-2 font-semibold">OAuth токен Яндекса</label>
                  <input type="password" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="Вставьте токен (y0_AgAAAA...)"
                    className="w-full bg-yandex-bg p-3 rounded-xl border border-white/10 text-white placeholder-yandex-subtext/50 focus:outline-none focus:border-yandex-accent text-sm" />
                </div>
                <div className="p-3.5 bg-yandex-card/60 rounded-xl text-xs text-yandex-subtext border border-white/5 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-white font-medium">
                    <FileText size={15} className="text-yandex-accent" /> Инструкция по получению токена:
                  </div>
                  <p className="text-zinc-300 leading-relaxed">
                    Инструкция, как получить OAuth токен через создание собственного приложения, находится в файле{' '}
                    <button
                      type="button"
                      onClick={handleOpenReadme}
                      className="text-yandex-accent hover:text-white underline font-semibold inline-flex items-center gap-1 transition"
                    >
                      readme.txt <ExternalLink size={11} />
                    </button>
                    .
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenReadme}
                    className="w-full py-2 px-3 rounded-lg bg-yandex-bg hover:bg-white/10 text-white font-medium flex items-center justify-center gap-2 border border-white/10 hover:border-yandex-accent/40 transition text-xs"
                  >
                    <FileText size={14} className="text-yandex-accent" />
                    <span>Открыть инструкцию (readme.txt)</span>
                  </button>
                </div>
                <button type="submit" className="w-full bg-yandex-accent hover:bg-yandex-accentHover py-3 rounded-xl font-bold transition">
                  Сохранить и загрузить дом
                </button>
              </form>
            )}

            {authTab === 'oauth' && (
              <form onSubmit={handleOAuthSubmit} className="space-y-4">
                <div>
                  <label className="block text-yandex-subtext text-xs uppercase tracking-wider mb-2 font-semibold">Yandex Client ID</label>
                  <input type="text" value={clientIdInput} onChange={(e) => setClientIdInput(e.target.value)}
                    placeholder="Например: 1a2b3c4d5e6f..."
                    className="w-full bg-yandex-bg p-3 rounded-xl border border-white/10 text-white placeholder-yandex-subtext/50 focus:outline-none focus:border-yandex-accent text-sm" />
                </div>
                <div className="p-3 bg-yandex-card/60 rounded-xl text-xs text-yandex-subtext space-y-1.5 border border-white/5">
                  <div className="flex items-center gap-1.5 text-white font-medium">
                    <HelpCircle size={14} className="text-yandex-accent" /> Настройки приложения в Яндекс OAuth:
                  </div>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Callback: <code className="text-white bg-black/30 px-1 py-0.5 rounded">https://oauth.yandex.ru/verification_code</code></li>
                    <li>Доступы: <code className="text-white bg-black/30 px-1 py-0.5 rounded">iot:view</code> и <code className="text-white bg-black/30 px-1 py-0.5 rounded">iot:control</code></li>
                  </ul>
                  <button type="button" onClick={() => openUrl('https://oauth.yandex.ru/client/new')}
                    className="text-yandex-accentHover hover:underline flex items-center gap-1.5 font-medium pt-1">
                    Создать приложение <ExternalLink size={12} />
                  </button>
                </div>
                <button type="submit" className="w-full bg-yandex-accent hover:bg-yandex-accentHover py-3 rounded-xl font-bold transition">
                  Открыть окно авторизации
                </button>
              </form>
            )}
          </div>
        )}

        {/* === THEME TAB === */}
        {activeTab === 'theme' && (
          <div className="space-y-3">
            <p className="text-xs text-yandex-subtext mb-4">
              Выберите тему оформления. Она сохраняется и применяется при следующем запуске.
            </p>
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                className={`w-full p-4 rounded-2xl border flex items-center justify-between transition ${
                  theme === t.id
                    ? 'bg-yandex-card border-yandex-accent/60 shadow-lg shadow-purple-950/20'
                    : 'bg-yandex-bg border-white/5 hover:border-white/20 hover:bg-yandex-card/50'
                }`}
              >
                <div className="text-left">
                  <div className="font-bold text-sm">{t.label}</div>
                  <div className="text-xs text-yandex-subtext mt-0.5">{t.description}</div>
                </div>
                <div className="flex items-center gap-3">
                  {t.preview}
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                    theme === t.id ? 'border-yandex-accent' : 'border-white/20'
                  }`}>
                    {theme === t.id && <div className="w-2.5 h-2.5 rounded-full bg-yandex-accent" />}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Footer Credit */}
        <div className="mt-6 pt-4 border-t border-white/5 text-center">
          <p className="text-[11px] text-yandex-subtext/50 font-mono tracking-wider">
            created by smokelnk
          </p>
        </div>

      </div>
    </div>
  );
}
