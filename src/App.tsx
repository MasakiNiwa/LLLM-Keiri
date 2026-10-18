import { lazy, Suspense } from 'react';
import { Toaster } from 'sonner';
import { Route, Router, Switch } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { AppLayout } from '@/app/AppLayout';
import { useStartup } from '@/app/useStartup';
import { useTheme } from '@/app/useTheme';
import HomePage from '@/pages/HomePage';
import { AccountSheet } from '@/features/accounts/AccountSheet';
import { AiFab, AiPanel } from '@/features/ai/AiPanel';
import { useSettings } from '@/features/settings/settingsStore';

// ホーム以外のページは必要になってから読み込む
const LearnPage = lazy(() => import('@/pages/LearnPage'));
const LessonPage = lazy(() => import('@/pages/LessonPage'));
const AccountsPage = lazy(() => import('@/pages/AccountsPage'));
const DrillListPage = lazy(() => import('@/pages/DrillListPage'));
const DrillPage = lazy(() => import('@/pages/DrillPage'));
const ExercisePage = lazy(() => import('@/pages/ExercisePage'));
const LedgerPage = lazy(() => import('@/pages/LedgerPage'));
const ChatPage = lazy(() => import('@/pages/ChatPage'));
const ModelsPage = lazy(() => import('@/pages/ModelsPage'));
const StudioPage = lazy(() => import('@/pages/StudioPage'));
const ConsolidationListPage = lazy(() => import('@/pages/ConsolidationListPage'));
const ConsolidationPage = lazy(() => import('@/pages/ConsolidationPage'));
const ReviewPage = lazy(() => import('@/pages/ReviewPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const HelpPage = lazy(() => import('@/pages/HelpPage'));

export default function App() {
  useTheme();
  useStartup();
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
            <Route path="/drill" component={DrillListPage} />
            <Route path="/drill/:id" component={DrillPage} />
            <Route path="/exercise/:id/:tab?" component={ExercisePage} />
            <Route path="/review" component={ReviewPage} />
            <Route path="/ledger/:tab?" component={LedgerPage} />
            <Route path="/chat" component={ChatPage} />
            <Route path="/models" component={ModelsPage} />
            <Route path="/consolidation" component={ConsolidationListPage} />
            <Route path="/consolidation/:id/:tab?" component={ConsolidationPage} />
            <Route path="/studio/:tab?" component={StudioPage} />
            <Route path="/settings" component={SettingsPage} />
            <Route path="/help" component={HelpPage} />
            <Route component={HomePage} />
          </Switch>
        </Suspense>
      </AppLayout>
      <AccountSheet />
      <AiFab />
      <AiPanel />
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
