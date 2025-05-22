import React from 'react';
import { Card, CardBody } from '../ui/Card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    positive: boolean;
  };
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  className = '',
}) => {
  return (
    <Card className={`${className}`}>
      <CardBody className="flex items-center">
        <div className="mr-4 bg-teal-100 text-teal-600 p-3 rounded-lg">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          
          {trend && (
            <div className="flex items-center mt-1">
              <span
                className={`text-xs font-medium ${
                  trend.positive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {trend.positive ? '+' : ''}
                {trend.value}%
              </span>
              <span className="text-xs text-gray-500 ml-1">Fecha</span>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
};

export default StatCard;