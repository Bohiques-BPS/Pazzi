```tsx
import React, { useState } from 'react';
import { Search, Package, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Product } from '../../types';

const POSInventoryPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  // Mock inventory data
  const inventory: Product[] = [
    {
      id: '1',
      name: 'Ceramic Floor Tile',
      description: 'High-quality ceramic floor tile, 12x12 inches',
      price: 24.99,
      category: 'Flooring',
      sku: 'FLR-CT-001',
      stock: 500,
      unit: 'piece',
      createdAt: '2025-05-15T10:00:00Z',
      updatedAt: '2025-05-15T10:00:00Z',
    },
    // Add more products...
  ];

  // Filter inventory based on search
  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    // Handle inventory adjustment
    console.log('Inventory adjustment:', {
      product: selectedProduct,
      quantity: parseInt(adjustmentQuantity),
      type: adjustmentType,
      reason: adjustmentReason
    });

    // Reset form
    setShowAdjustment(false);
    setSelectedProduct(null);
    setAdjustmentQuantity('');
    setAdjustmentType('add');
    setAdjustmentReason('');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Inventario</h1>
      </div>

      {showAdjustment ? (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-lg font-semibold">Ajuste de Inventario</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleAdjustment} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Producto
                  </label>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p className="font-medium">{selectedProduct?.name}</p>
                    <p className="text-sm text-gray-500">SKU: {selectedProduct?.sku}</p>
                    <p className="text-sm text-gray-500">Stock actual: {selectedProduct?.stock}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Ajuste
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className={`p-2 text-center rounded-md border ${
                          adjustmentType === 'add'
                            ? 'border-teal-500 bg-teal-50 text-teal-700'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => setAdjustmentType('add')}
                      >
                        <ArrowUp size={16} className="mx-auto mb-1" />
                        Agregar
                      </button>
                      <button
                        type="button"
                        className={`p-2 text-center rounded-md border ${
                          adjustmentType === 'remove'
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => setAdjustmentType('remove')}
                      >
                        <ArrowDown size={16} className="mx-auto mb-1" />
                        Remover
                      </button>
                    </div>
                  </div>

                  <Input
                    label="Cantidad"
                    type="number"
                    value={adjustmentQuantity}
                    onChange={(e) => setAdjustmentQuantity(e.target.value)}
                    required
                    fullWidth
                  />

                  <Input
                    label="Razón del Ajuste"
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    required
                    fullWidth
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAdjustment(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                >
                  Guardar Ajuste
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="mb-6">
            <Input
              placeholder="Buscar en inventario..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search size={16} />}
              fullWidth
            />
          </div>

          <div className="space-y-4">
            {filteredInventory.map((item) => (
              <Card key={item.id}>
                <CardBody className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="mr-4 bg-gray-100 p-3 rounded-lg">
                      <Package size={24} className="text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">{item.name}</h3>
                      <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-8">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Stock Actual</p>
                      <p className="font-medium">{item.stock} {item.unit}</p>
                    </div>

                    {item.stock < 100 && (
                      <div className="flex items-center text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full">
                        <AlertTriangle size={16} className="mr-1" />
                        <span className="text-sm">Stock Bajo</span>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedProduct(item);
                        setShowAdjustment(true);
                      }}
                    >
                      Ajustar Stock
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default POSInventoryPage;
```