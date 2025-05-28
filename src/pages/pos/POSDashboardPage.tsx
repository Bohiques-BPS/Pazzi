import React from 'react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { BarChart4, ShoppingCart, Package, Users, ArrowUp, ArrowDown } from 'lucide-react';

const POSDashboardPage: React.FC = () => {
  // Mock data for dashboard statistics
  const stats = [
    {
      title: 'Ventas del Día',
      value: '$2,547.89',
      trend: { value: 12.5, positive: true },
      icon: <ShoppingCart size={24} />,
    },
    {
      title: 'Productos Vendidos',
      value: '157',
      trend: { value: 8.2, positive: true },
      icon: <Package size={24} />,
    },
    {
      title: 'Clientes Nuevos',
      value: '24',
      trend: { value: 5.1, positive: true },
      icon: <Users size={24} />,
    },
    {
      title: 'Ticket Promedio',
      value: '$45.32',
      trend: { value: 2.3, negative: true },
      icon: <BarChart4 size={24} />,
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard POS</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardBody className="flex items-center">
              <div className="mr-4 bg-teal-100 text-teal-600 p-3 rounded-lg">
                {stat.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
                {'trend' in stat && (
                  <div className="flex items-center mt-1">
                    <span className={`flex items-center text-sm ${
                      stat.trend.positive ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.trend.positive ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                      {stat.trend.value}%
                    </span>
                    <span className="text-xs text-gray-500 ml-1">vs ayer</span>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Ventas por Hora</h2>
          </CardHeader>
          <CardBody>
            {/* Chart component would go here */}
            <div className="h-64 flex items-center justify-center text-gray-500">
              Gráfico de Ventas por Hora
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Productos Más Vendidos</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center mr-3">
                      <Package size={16} />
                    </div>
                    <div>
                      <p className="font-medium">Producto {item}</p>
                      <p className="text-sm text-gray-500">234 unidades</p>
                    </div>
                  </div>
                  <span className="font-medium">$1,234.56</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default POSDashboardPage;