import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

export default function RadarChart({ difficulty, accuracy, speed, delay = 0 }) {
  const chartRef = useRef(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!chartRef.current || initialized.current) return;
    initialized.current = true;
    const timer = setTimeout(() => {
      try {
        const chart = echarts.init(chartRef.current);
        chart.setOption({
          radar: {
            indicator: [
              { name: '难度', max: 5 },
              { name: '准确', max: 5 },
              { name: '速度', max: 5 },
            ],
            shape: 'circle',
            splitArea: { areaStyle: { color: ['rgba(22,119,255,0.02)', 'rgba(22,119,255,0.05)'] } },
            axisLine: { lineStyle: { color: 'rgba(0,0,0,0.1)' } },
            splitLine: { lineStyle: { color: 'rgba(0,0,0,0.1)' } },
          },
          series: [{
            type: 'radar',
            data: [{ value: [difficulty, accuracy, speed] }],
            symbol: 'none',
            lineStyle: { width: 2, color: '#1677ff' },
            areaStyle: { color: 'rgba(22,119,255,0.15)' },
            animationDuration: 1000,
          }],
        });
        const handleResize = () => chart.resize();
        window.addEventListener('resize', handleResize);
        initialized.current = { chart, handleResize };
      } catch (e) {
        /* echarts init 失败，静默处理 */
      }
    }, delay);
    return () => {
      clearTimeout(timer);
      if (initialized.current && initialized.current.handleResize) {
        window.removeEventListener('resize', initialized.current.handleResize);
      }
    };
  }, [difficulty, accuracy, speed, delay]);

  return <div ref={chartRef} style={{ width: '100%', height: 240 }} />;
}
