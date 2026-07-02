import React from 'react';
import { Typography, Row, Col } from 'antd';
import ProblemCard from '../../components/ProblemCard';
import { getAllProblems } from '../../problems/registry';

export default function Home() {
  const problems = getAllProblems();

  return (
    <div>
      <Typography.Title level={2} style={{ textAlign: 'center' }}>
        那年那数那些事
      </Typography.Title>
      <Typography.Paragraph
        style={{ textAlign: 'center', fontSize: 16, color: '#666', marginBottom: 32 }}
      >
        一年级数学易错题，边看动画边学会
      </Typography.Paragraph>

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
