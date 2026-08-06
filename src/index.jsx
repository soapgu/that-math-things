import React from 'react';
import ReactDOM from 'react-dom/client';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import MobileBlocker from './components/MobileBlocker';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
const router = createHashRouter([
  { path: '*', element: <App /> },
], {
  future: { v7_startTransition: true, v7_relativeSplatPath: true },
});

root.render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN}>
      <MobileBlocker>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </MobileBlocker>
    </ConfigProvider>
  </React.StrictMode>
);
