import React from 'react';
import { Typography, Row, Col } from 'antd';
import ProblemCard from '../../components/ProblemCard';
import { getAllProblems } from '../../problems/registry';

export default function Problems() {
  const problems = getAllProblems();

  return (
    <div>
      <Typography.Title level={3}>错题列表</Typography.Title>
      <Row gutter={[16, 16]}>
        {problems.map((problem) => (
          <Col xs={24} sm={12} md={8} key={problem.id}>
            <ProblemCard problem={problem} />
          </Col>
        ))}
      </Row>
    </div>
  );
}
