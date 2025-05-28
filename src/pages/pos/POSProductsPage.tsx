```tsx
import React, { useState } from 'react';
import { Plus, Search, Filter, Package } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Product } from '../../types';

const POSProductsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    sku: '',
    stock: '',
    unit: 'piece'
  });

  // Mock products data
  const products: Product[] = [
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

  // Get unique categories
  const categories = ['all', ...new Set(products.map(product => product.category))];

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle product creation
    console.log('New product:', newProduct);
    setShowAddProduct(false);
    setNewProduct({
      name: '',
      description: '',
      price: '',
      category: '',
      sku: '',
      stock: '',
      unit: 'piece'
    });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Productos</h1>
        <Button
          variant="primary"
          leftIcon={<Plus size={16} />}
          onClick={() => setShowAddProduct(true)}
        >
          Agregar Producto
        </Button>
      </div>

      {showAddProduct ? (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-lg font-semibold">Agregar Nuevo Producto</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nombre del Producto"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  required
                  fullWidth
                />
                <Input
                  label="SKU"
                  value={newProduct.sku}
                  onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                  required
                  fullWidth
                />
                <Input
                  label="Precio"
                  type="number"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  required
                  fullWidth
                />
                <Input
                  label="Stock"
                  type="number"
                  value={newProduct.stock}
                  onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                  required
                  fullWidth
                />
                <div className="md:col-span-2">
                  <Input
                    label="Descripción"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    fullWidth
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAddProduct(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                >
                  Guardar Producto
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar productos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
                fullWidth
              />
            </div>
            
            <div className="relative">
              <select
                className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm appearance-none border bg-white"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'Todas las categorías' : category}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <Filter size={16} />
              </div>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <Package size={48} className="mx-auto text-gray-400 mb-4" />
              <div className="text-gray-500 mb-2">No se encontraron productos</div>
              <p className="text-gray-400 text-sm">Intenta ajustar tus criterios de búsqueda</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <Card key={product.id} hoverable>
                  <CardBody>
                    <h3 className="font-medium text-lg mb-2">{product.name}</h3>
                    <p className="text-sm text-gray-500 mb-4">{product.description}</p>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Precio:</span>
                        <span className="ml-2 font-medium">${product.price}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Stock:</span>
                        <span className="ml-2 font-medium">{product.stock} {product.unit}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">SKU:</span>
                        <span className="ml-2 font-medium">{product.sku}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Categoría:</span>
                        <span className="ml-2 font-medium">{product.category}</span>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default POSProductsPage;
```