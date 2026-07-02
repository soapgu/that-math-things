import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Tag } from 'antd';

export default function ProblemCard({ problem }) {
  const navigate = useNavigate();

  return (
    <Card
      hoverable
      title={problem.title}
      onClick={() => navigate(`/problems/${problem.id}`)}
      style={{ marginBottom: 16 }}
    >
      <div>
        {problem.tags?.map((tag) => (
          <Tag key={tag} color="blue">
            {tag}
          </Tag>
        ))}
      </div>
    </Card>
  );
}
