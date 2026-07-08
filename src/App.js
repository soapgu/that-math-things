import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import Home from './pages/Home';
import Problems from './pages/Problems';
import ProblemDetail from './pages/ProblemDetail';
import PracticeSettings from './pages/Practice/Settings';
import PracticeSession from './pages/Practice/Session';
import PracticeResult from './pages/Practice/Result';
import PracticeStats from './pages/Practice/Stats';

function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/problems" element={<Problems />} />
        <Route path="/problems/:id" element={<ProblemDetail />} />
        <Route path="/practice" element={<PracticeSettings />} />
        <Route path="/practice/session" element={<PracticeSession />} />
        <Route path="/practice/result" element={<PracticeResult />} />
        <Route path="/practice/stats" element={<PracticeStats />} />
      </Routes>
    </AppLayout>
  );
}

export default App;
