import { GlobeIcon, ListIcon, PlusIcon, SchoolIcon } from './components/icons'
import { StudentBar } from './components/StudentBar'
import { paths, useHashRoute, type Route } from './hooks'
import { I18nProvider, useI18n } from './i18n'
import { AdminPage } from './pages/AdminPage'
import { ApplicationPage } from './pages/ApplicationPage'
import { ClassDetailPage, ClassesPage } from './pages/classes'
import { MyApplicationsPage } from './pages/MyApplicationsPage'
import { StudentProvider } from './student'
import { ToastProvider } from './toast'

function Page({ route }: { route: Route }) {
  switch (route.page) {
    case 'class':
      return <ClassDetailPage key={route.id} classId={route.id} />
    case 'application':
      return <ApplicationPage key={route.id} holdId={route.id} />
    case 'my':
      return <MyApplicationsPage />
    case 'admin':
      return <AdminPage />
    default:
      return <ClassesPage />
  }
}

function Shell() {
  const { t, lang, setLang } = useI18n()
  const route = useHashRoute()
  const section = route.page === 'class' ? 'classes' : route.page === 'application' ? 'my' : route.page

  const tabs = [
    { id: 'classes', href: paths.classes, icon: <SchoolIcon size={26} />, label: t('nav.classes') },
    { id: 'my', href: paths.myApplications, icon: <ListIcon size={26} />, label: t('nav.my') },
    { id: 'admin', href: paths.admin, icon: <PlusIcon size={26} />, label: t('nav.admin'), hint: t('nav.adminHint') },
  ]

  return (
    <div className="app">
      <header className="topbar">
        <div className="container topbar-inner">
          <a className="brand" href={paths.classes}>
            <img src="/favicon.svg" alt="" width="40" height="40" />
            <span>
              <strong>{t('appTitle')}</strong>
              <small>{t('appSubtitle')}</small>
            </span>
          </a>
          <button
            className="lang-toggle"
            onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}
            aria-label={t('lang.switchLabel')}
          >
            <GlobeIcon size={18} /> {t('lang.switch')}
          </button>
        </div>
      </header>

      <div className="container">
        <StudentBar />
        <nav className="tabs" aria-label={t('nav.label')}>
          {tabs.map((tab) => (
            <a
              key={tab.id}
              href={tab.href}
              className={`tab ${section === tab.id ? 'tab-active' : ''}`}
              aria-current={section === tab.id ? 'page' : undefined}
            >
              <span className="tab-icon" aria-hidden="true">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
              {tab.hint && <span className="tab-hint">{tab.hint}</span>}
            </a>
          ))}
        </nav>
        <main>
          <Page route={route} />
        </main>
      </div>

      <footer className="footer">
        <div className="container">{t('footer.text')}</div>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <ToastProvider>
        <StudentProvider>
          <Shell />
        </StudentProvider>
      </ToastProvider>
    </I18nProvider>
  )
}
