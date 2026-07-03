import React from 'react';
import { Typography, Row, Col } from 'antd';
import ProblemCard from '../../components/ProblemCard';
import { getAllProblems } from '../../problems/registry';

const storyLines = [
  { emoji: '👦', role: '儿子', text: '又是数学…😭😱📝' },
  { emoji: '👨‍🏫', role: '爸爸', text: '爸爸来教你' },
  { emoji: '👦', role: '儿子', text: '🤔' },
  { emoji: '👨‍🏫', role: '爸爸', text: '怎么还不懂！' },
  { emoji: '👦', role: '儿子', text: '😵😰' },
  { emoji: '👨‍🏫', role: '爸爸', text: '教不会啊教不会' },
  { emoji: '👨‍🏫', role: '爸爸', text: '🤔' },
  { emoji: '👨‍🏫', role: '爸爸', text: '💡' },
  { emoji: '👦', role: '儿子', text: '终于对了！😊' },
  { emoji: '👨‍🏫', role: '爸爸', text: '欣慰😌' },
];

export default function Home() {
  const problems = getAllProblems();

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 32 }}>
        <div style={{ flex: '0 0 180px', minWidth: 0 }}>
          {storyLines.slice(0, 5).map((line, i) => (
            <div key={i} style={{ fontSize: 12, lineHeight: 1.8, color: '#888' }}>
              {line.emoji} {line.text}
            </div>
          ))}
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 28, letterSpacing: 8, marginBottom: 4 }}>
            <span>🕰️📅</span>
            <span style={{ margin: '0 36px' }}>➕➖📐</span>
            <span>📚✏️🏫</span>
          </div>
          <Typography.Title level={2} style={{ marginTop: 0 }}>
            那年那数那些事
          </Typography.Title>
          <Typography.Paragraph
            style={{ fontSize: 16, color: '#666', marginBottom: 0 }}
          >
            一年级数学易错题，边看动画边学会
          </Typography.Paragraph>
        </div>
        <div style={{ flex: '0 0 180px', minWidth: 0 }}>
          {storyLines.slice(5).map((line, i) => (
            <div key={i} style={{ fontSize: 12, lineHeight: 1.8, color: '#888' }}>
              {line.emoji} {line.text}
            </div>
          ))}
        </div>
      </div>

      <Row gutter={[16, 16]}>
        {problems.map((problem) => (
          <Col xs={24} sm={12} key={problem.id}>
            <ProblemCard problem={problem} />
          </Col>
        ))}
      </Row>
    </div>
  );
}
