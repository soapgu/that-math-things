import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Spin } from 'antd';
import AppLayout from './components/AppLayout';

const Home = lazy(() => import('./pages/Home'));
const Problems = lazy(() => import('./pages/Problems'));
const ProblemDetail = lazy(() => import('./pages/ProblemDetail'));
const PracticeSettings = lazy(() => import('./pages/Practice/Settings'));
const PracticeSession = lazy(() => import('./pages/Practice/Session'));
const PracticeResult = lazy(() => import('./pages/Practice/Result'));
const PracticeStats = lazy(() => import('./pages/Practice/Stats'));
const PracticeCorrection = lazy(() => import('./pages/Practice/Correction'));

function App() {
  return (
    <AppLayout>
      <Suspense fallback={<div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/problems" element={<Problems />} />
          <Route path="/problems/:id" element={<ProblemDetail />} />
          <Route path="/practice" element={<PracticeSettings />} />
          <Route path="/practice/session" element={<PracticeSession />} />
          <Route path="/practice/result" element={<PracticeResult />} />
          <Route path="/practice/stats" element={<PracticeStats />} />
          <Route path="/practice/correction" element={<PracticeCorrection />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
}

export default App;
