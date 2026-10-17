import { lazy, Suspense } from 'react';
import { Toaster } from 'sonner';
import { Route, Router, Switch } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { AppLayout } from '@/app/AppLayout';
import { useTheme } from '@/app/useTheme';
import HomePage from '@/pages/HomePage';
import { ComingSoon } from '@/pages/ComingSoonPage';
import { AccountSheet } from '@/features/accounts/AccountSheet';
import { useSettings } from '@/features/settings/settingsStore';

// ホーム以外のページは必要になってから読み込む
const LearnPage = lazy(() => import('@/pages/LearnPage'));
const LessonPage = lazy(() => import('@/pages/LessonPage'));
const AccountsPage = lazy(() => import('@/pages/AccountsPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const HelpPage = lazy(() => import('@/pages/HelpPage'));

export default function App() {
  useTheme();
  const theme = useSettings((s) => s.theme);
  return (
    // GitHub Pages ではサーバー側のルーティングができないためハッシュルーティングを使う
    <Router hook={useHashLocation}>
      <AppLayout>
        <Suspense fallback={null}>
          <Switch>
            <Route path="/learn" component={LearnPage} />
            <Route path="/learn/:id" component={LessonPage} />
            <Route path="/accounts" component={AccountsPage} />
            <Route path="/drill/*?">
              <ComingSoon title="練習" phase="フェーズ 2" />
            </Route>
            <Route path="/ledger/*?">
              <ComingSoon title="帳簿" phase="フェーズ 2" />
            </Route>
            <Route path="/chat">
              <ComingSoon title="AI" phase="フェーズ 3" />
            </Route>
            <Route path="/models">
              <ComingSoon title="AI モデル" phase="フェーズ 3" />
            </Route>
            <Route path="/settings" component={SettingsPage} />
            <Route path="/help" component={HelpPage} />
            <Route component={HomePage} />
          </Switch>
        </Suspense>
      </AppLayout>
      <AccountSheet />
      <Toaster
        theme={theme}
        position="top-center"
        richColors
        closeButton
        duration={3000}
        toastOptions={{ className: 'text-sm' }}
      />
    </Router>
  );
}
