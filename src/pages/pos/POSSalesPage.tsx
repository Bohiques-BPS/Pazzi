```tsx
import React, { useState } from 'react';
import { Search, ShoppingCart, Plus, Minus, Trash2, CreditCard } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Product } from '../../types';

const POSSalesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<Array<{ product: Product; quantity: number }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [cashReceived, setCashReceived] = useState<string>('');

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
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Cart operations
  const addToCart = (product: Product) => {
    setCart(currentCart => {
      const existingItem = currentCart.find(item => item.product.id === product.id);
      if (existingItem) {
        return currentCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...currentCart, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(currentCart => currentCart.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setCart(currentCart =>
      currentCart.map(item =>
        item.product.id === productId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const calculateSubtotal = () => {
    return cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.07; // 7% tax rate
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const calculateChange = () => {
    const total = calculateTotal();
    const received = parseFloat(cashReceived) || 0;
    return received - total;
  };

  const handlePayment = () => {
    // Handle payment processing
    console.log('Processing payment:', {
      items: cart,
      subtotal: calculateSubtotal(),
      tax: calculateTax(),
      total: calculateTotal(),
      method: paymentMethod,
      cashReceived: cashReceived,
      change: calculateChange(),
    });
  };

  return (
    <div className="h-[calc(100vh-72px)] flex">
      {/* Products Section */}
      <div className="flex-1 p-6 overflow-auto">
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
          
          <select
            className="block rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'Todas las categorías' : category}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map(product => (
            <Card
              key={product.id}
              hoverable
              className="cursor-pointer"
              onClick={() => addToCart(product)}
            >
              <CardBody>
                <h3 className="font-medium">{product.name}</h3>
                <p className="text-sm text-gray-500 mb-2">{product.sku}</p>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">${product.price}</span>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus size={16} />}
                  >
                    Agregar
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center">
            <ShoppingCart size={20} className="mr-2" />
            <h2 className="text-lg font-semibold">Carrito</h2>
          </div>
        </CardHeader>

        <div className="flex-1 overflow-auto p-4">
          {cart.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              El carrito está vacío
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map(({ product, quantity }) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{product.name}</h4>
                    <p className="text-sm text-gray-500">${product.price}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      className="p-1 hover:bg-gray-100 rounded"
                      onClick={() => updateQuantity(product.id, quantity - 1)}
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-8 text-center">{quantity}</span>
                    <button
                      className="p-1 hover:bg-gray-100 rounded"
                      onClick={() => updateQuantity(product.id, quantity + 1)}
                    >
                      <Plus size={16} />
                    </button>
                    <button
                      className="p-1 hover:bg-gray-100 rounded text-red-500"
                      onClick={() => removeFromCart(product.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t p-4">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>${calculateSubtotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Impuesto (7%):</span>
              <span>${calculateTax().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>${calculateTotal().toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Método de Pago
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={`p-2 text-center rounded-md border ${
                    paymentMethod === 'cash'
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => setPaymentMethod('cash')}
                >
                  Efectivo
                </button>
                <button
                  className={\`p-2 text-center rounded-md border ${
                    paymentMethod === 'card'
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => setPaymentMethod('card')}
                >
                  Tarjeta
                </button>
              </div>
            </div>

            {paymentMethod === 'cash' && (
              <div>
                <Input
                  label="Efectivo Recibido"
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  fullWidth
                />
                {parseFloat(cashReceived) > 0 && (
                  <div className="mt-2 text-right">
                    <span className="text-sm text-gray-500">Cambio: </span>
                    <span className="font-medium">${calculateChange().toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            <Button
              variant="primary"
              fullWidth
              disabled={cart.length === 0}
              leftIcon={<CreditCard size={16} />}
              onClick={handlePayment}
            >
              Procesar Pago
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POSSalesPage;
```