'use client';

import { useState } from 'react';

/**
 * Block Market Page
 * 
 * Features:
 * - Spend $CARE tokens on real-world rewards
 * - Vouchers (cafe, bookstore, etc.)
 * - UGM merchandise
 * - Purchase history
 */

interface MarketItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'voucher' | 'merch';
  imageUrl?: string;
  stock: number;
}

export default function BlockMarketPage() {
  const [activeCategory, setActiveCategory] = useState<'all' | 'voucher' | 'merch'>('all');

  // TODO: Fetch from backend
  const mockItems: MarketItem[] = [
    {
      id: '1',
      name: 'Cafe Voucher - Rp 25.000',
      description: 'Redeem at selected cafes around UGM campus',
      price: 50,
      category: 'voucher',
      stock: 100,
    },
    {
      id: '2',
      name: 'Bookstore Voucher - Rp 50.000',
      description: 'Use at UGM bookstore for textbooks and supplies',
      price: 100,
      category: 'voucher',
      stock: 50,
    },
    {
      id: '3',
      name: 'UGM T-Shirt',
      description: 'Official UGM-AICare branded t-shirt (Size: M, L, XL)',
      price: 200,
      category: 'merch',
      stock: 25,
    },
    {
      id: '4',
      name: 'UGM Tote Bag',
      description: 'Eco-friendly canvas tote bag with UGM logo',
      price: 150,
      category: 'merch',
      stock: 30,
    },
  ];

  const filteredItems = mockItems.filter(
    (item) => activeCategory === 'all' || item.category === activeCategory
  );

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Block Market</h1>
        <p className="text-gray-600">
          Spend your <span className="font-semibold text-green-600">$CARE</span> tokens on
          real-world vouchers and UGM merchandise
        </p>
      </div>

      {/* Wallet balance */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-6 mb-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm opacity-90 mb-1">Your $CARE Balance</div>
            <div className="text-4xl font-bold">1,250 $CARE</div>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-90 mb-1">Total Spent</div>
            <div className="text-2xl font-semibold">500 $CARE</div>
          </div>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
            activeCategory === 'all'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All Items
        </button>
        <button
          onClick={() => setActiveCategory('voucher')}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
            activeCategory === 'voucher'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Vouchers
        </button>
        <button
          onClick={() => setActiveCategory('merch')}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
            activeCategory === 'merch'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Merchandise
        </button>
      </div>

      {/* Items grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
          >
            {/* Image placeholder */}
            <div className="h-48 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
              <div className="text-6xl">
                {item.category === 'voucher' ? '🎟️' : '🎽'}
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                  {item.category}
                </span>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">{item.description}</p>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {item.price} $CARE
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.stock} in stock
                  </div>
                </div>
                <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold">
                  Purchase
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Coming soon notice */}
      <div className="mt-12 bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <div className="text-yellow-800 font-semibold mb-2">
          🚧 Block Market Coming Soon
        </div>
        <p className="text-sm text-yellow-700">
          The marketplace is currently in development. Purchase functionality will be available in
          the next update.
        </p>
      </div>
    </div>
  );
}
