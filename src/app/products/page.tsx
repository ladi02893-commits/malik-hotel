'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { formatMoney } from '@/lib/money';
import { Product } from '@/types';
import { usePOS } from '@/context/POSContext';
import {
  UtensilsCrossed,
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';

export default function ProductsPage() {
  const { categories, showToast, refreshPOSData } = usePOS();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Edit / Add Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Delete State
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sku, setSku] = useState('');
  const [availability, setAvailability] = useState<'available' | 'sold_out' | 'hidden' | 'inactive'>('available');
  const [sortOrder, setSortOrder] = useState('0');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.set('category_id', selectedCategory);
      if (search.trim()) params.set('search', search.trim());
      params.set('include_inactive', 'true');

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
      }
    } catch (e) {
      console.error('Failed to load products:', e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setName('');
    setShortName('');
    setCategoryId(categories[0]?.id || '');
    setSellingPrice('');
    setCostPrice('');
    setSku('');
    setAvailability('available');
    setSortOrder('0');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setShortName(p.short_name || '');
    setCategoryId(p.category_id);
    setSellingPrice(String(p.selling_price));
    setCostPrice(p.cost_price ? String(p.cost_price) : '');
    setSku(p.sku || '');
    setAvailability(p.availability);
    setSortOrder(String(p.sort_order || 0));
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Product name is required.');
      return;
    }
    if (!categoryId) {
      setFormError('Please select a category.');
      return;
    }
    const priceNum = parseFloat(sellingPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setFormError('Selling price must be 0 or greater.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        name: name.trim(),
        short_name: shortName.trim() || undefined,
        category_id: categoryId,
        selling_price: priceNum,
        cost_price: costPrice ? parseFloat(costPrice) : undefined,
        sku: sku.trim() || undefined,
        availability,
        sort_order: parseInt(sortOrder, 10) || 0,
      };

      const isEdit = Boolean(editingProduct);
      if (isEdit) payload.id = editingProduct!.id;

      const res = await fetch('/api/products', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        showToast(isEdit ? `Updated ${name}` : `Created ${name}`, 'success');
        setIsModalOpen(false);
        fetchProducts();
        refreshPOSData();
      } else {
        setFormError(data.error || 'Failed to save product.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Network error.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/products?id=${product.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast(`Product "${product.name}" deleted successfully`, 'info');
        setProductToDelete(null);
        fetchProducts();
        refreshPOSData();
      } else {
        showToast(data.error || 'Failed to delete product', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Network error', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearAllProducts = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch('/api/products?clear_all=true', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'All menu products cleared successfully', 'success');
        setIsClearAllModalOpen(false);
        fetchProducts();
        refreshPOSData();
      } else {
        showToast(data.error || 'Failed to clear products', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Network error', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleSoldOut = async (p: Product) => {
    const nextAvailability = p.availability === 'sold_out' ? 'available' : 'sold_out';
    try {
      const res = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, availability: nextAvailability }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${p.name} marked as ${nextAvailability.replace('_', ' ')}`, 'info');
        fetchProducts();
      }
    } catch (e) {
      console.error('Failed to toggle availability:', e);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden select-none space-y-4 max-w-6xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-emerald-800" />
            <span>Menu & Product Management</span>
          </h1>
          <p className="text-xs text-slate-500">Configure menu items, selling prices, categories and availability</p>
        </div>

        <div className="flex items-center gap-2">
          {products.length > 0 && (
            <button
              onClick={() => setIsClearAllModalOpen(true)}
              className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Delete all products from menu"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Products</span>
            </button>
          )}

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Menu Item</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product name, short name, code..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-700"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-slate-500 font-mono">
          {products.length} product{products.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Products Table */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3">Product Name</th>
                <th className="py-2.5 px-3">Short Name</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-right">Selling Price</th>
                <th className="py-2.5 px-3 text-right">Cost Price</th>
                <th className="py-2.5 px-3 text-center">Availability</th>
                <th className="py-2.5 px-3 text-center">Order</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    Loading products...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    No products found in menu. Click &ldquo;Add Menu Item&rdquo; to add items.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isSoldOut = p.availability === 'sold_out';
                  const isHidden = p.availability === 'hidden';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {p.name}
                      </td>
                      <td className="py-2 px-3 text-slate-600 font-mono">
                        {p.short_name || '-'}
                      </td>
                      <td className="py-2 px-3 text-slate-700">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px]">
                          {p.category_name}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-900">
                        {formatMoney(p.selling_price)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-400">
                        {p.cost_price ? formatMoney(p.cost_price) : '-'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSoldOut(p)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border transition-colors ${
                            isSoldOut
                              ? 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100'
                              : isHidden
                              ? 'bg-slate-100 text-slate-500 border-slate-300'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {p.availability.replace('_', ' ')}
                        </button>
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-slate-500">
                        {p.sort_order}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
                            title="Edit product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setProductToDelete(p)}
                            className="p-1 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                            title="Delete product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 no-print select-none">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingProduct ? `Edit Product: ${editingProduct.name}` : 'Add New Menu Item'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 overflow-y-auto space-y-3.5 text-xs">
              {formError && (
                <div className="p-2.5 rounded bg-red-50 border border-red-200 text-red-900 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product Full Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Special Anda Paratha"
                  autoFocus
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Short / Button Name
                  </label>
                  <input
                    type="text"
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value)}
                    placeholder="e.g. Anda Paratha"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Selling Price (Rs.) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    placeholder="e.g. 180"
                    className="w-full px-3 py-1.5 font-mono font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Cost Price (Rs. Optional)
                  </label>
                  <input
                    type="number"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="e.g. 95"
                    className="w-full px-3 py-1.5 font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Availability
                  </label>
                  <select
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700 capitalize"
                  >
                    <option value="available">Available</option>
                    <option value="sold_out">Sold Out</option>
                    <option value="hidden">Hidden from POS</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-1.5 font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between gap-2 border-t border-slate-100">
                {editingProduct ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setProductToDelete(editingProduct);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 rounded flex items-center gap-1 border border-red-200 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Product</span>
                  </button>
                ) : <span />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSaving}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-1.5 text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg transition-colors shadow-xs"
                  >
                    {isSaving ? 'Saving...' : 'Save Product'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SINGLE PRODUCT DELETE CONFIRMATION MODAL */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 select-none">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 border border-red-200 flex items-center justify-center text-red-600 flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Delete Product</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to delete &ldquo;<span className="font-semibold text-slate-800">{productToDelete.name}</span>&rdquo;?
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Past sales and receipts referencing this item will remain safe.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                disabled={isDeleting}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteProduct(productToDelete)}
                disabled={isDeleting}
                className="px-4 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-xs"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLEAR ALL PRODUCTS CONFIRMATION MODAL */}
      {isClearAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 select-none">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 border border-red-200 flex items-center justify-center text-red-700 flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-red-950 text-sm">Clear All Products?</h3>
                <p className="text-xs text-slate-600 mt-1">
                  This will permanently delete <span className="font-bold">{products.length} product(s)</span> from the menu.
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Historical orders, sales reports, and register records will remain safe.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsClearAllModalOpen(false)}
                disabled={isDeleting}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllProducts}
                disabled={isDeleting}
                className="px-4 py-1.5 text-xs font-bold bg-red-700 hover:bg-red-800 text-white rounded-lg transition-colors shadow-xs"
              >
                {isDeleting ? 'Clearing...' : 'Yes, Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
