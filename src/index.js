import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import MobileBlocker from './components/MobileBlocker';
import './index.css';

/* __VERSION__ 1.0.1 */

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN}>
      <MobileBlocker>
        <HashRouter>
          <App />
        </HashRouter>
      </MobileBlocker>
    </ConfigProvider>
  </React.StrictMode>
);
