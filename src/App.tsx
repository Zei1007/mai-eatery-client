/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BarChart3,
  Plus,
  Minus,
  Trash2,
  AlertTriangle,
  ChevronRight,
  History,
  Search,
  Download,
  Upload,
  LogOut,
  User,
  Lock,
  ChevronLeft,
  FileDown,
  ShieldCheck,
  Edit,
  X,
  Image as ImageIcon,
  Settings2,
  RefreshCw,
  Calendar,
  Menu as MenuIcon,
  PackagePlus,
  ScrollText,
  DatabaseZap,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  format,
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  parseISO
} from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Product, ProductIngredient, IngredientUnit, InventoryItem, Order, OrderItem } from './types';
import { INVENTORY_UNITS, COMPATIBLE_INGREDIENT_UNITS } from './constants';
import { useAuth } from './hooks/useAuth';
import { useProducts } from './hooks/useProducts';
import { useInventory } from './hooks/useInventory';
import { useOrders } from './hooks/useOrders';
import { useStockLogs } from './hooks/useStockLogs';
import { useAuditLogs } from './hooks/useAuditLogs';
import { useReports } from './hooks/useReports';
import { exportsApi } from './api/exports';
import apiClient from './api/client';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type View = 'dashboard' | 'pos' | 'orders' | 'menu' | 'inventory' | 'reports' | 'logs' | 'audit';

const VIEW_LABELS: Record<View, string> = {
  dashboard: 'Dashboard',
  pos: 'Ordering',
  orders: 'Transactions',
  menu: 'Menu',
  inventory: 'Inventory',
  logs: 'Stock Logs',
  audit: 'Audit Logs',
  reports: 'Reports',
};

export default function App() {
  const { isLoggedIn, login, logout } = useAuth();

  // Local UI state
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [view, setView] = useState<View>('dashboard');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const itemsPerPage = 8;

  // Mobile nav + cart drawer
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderSortDesc, setOrderSortDesc] = useState(true);

  // Modal states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<Partial<Product>>({
    name: '',
    price: 0,
    category: 'Others',
    image: '',
    ingredients: []
  });
  const [ingredientForm, setIngredientForm] = useState<{ inventoryItemId: string; quantity: number; unit: IngredientUnit }>({ inventoryItemId: '', quantity: 1, unit: 'pcs' });

  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState<InventoryItem | null>(null);
  const [stockAdjustmentForm, setStockAdjustmentForm] = useState({
    amount: 0,
    type: 'add' as 'add' | 'reduce',
    reason: ''
  });

  const [isAddInventoryModalOpen, setIsAddInventoryModalOpen] = useState(false);
  const [addInventoryForm, setAddInventoryForm] = useState({
    name: '',
    quantity: 0,
    unit: 'kg' as InventoryItem['unit'],
    minThreshold: 0,
  });

  const [isRemoveInventoryModalOpen, setIsRemoveInventoryModalOpen] = useState(false);
  const [removingInventoryItem, setRemovingInventoryItem] = useState<InventoryItem | null>(null);
  const [removeInventoryReason, setRemoveInventoryReason] = useState('');

  // Data hooks
  const { products, createProduct, updateProduct, deleteProduct: removeProduct, refetch: refetchProducts } = useProducts(isLoggedIn);
  const { inventory, adjustStock, importCSV, createItem, deleteItem, refetch: refetchInventory } = useInventory(isLoggedIn);
  const { orders, checkout: checkoutOrder, refetch: refetchOrders } = useOrders(isLoggedIn, dateFilter);
  const { stockLogs, refetch: refetchStockLogs } = useStockLogs(isLoggedIn);
  const { auditLogs, refetch: refetchAuditLogs } = useAuditLogs(isLoggedIn);
  const { rankings, lowStock, refetch: refetchReports } = useReports(isLoggedIn);

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter]);

  // Close mobile nav when view changes
  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [view]);

  const stats = useMemo(() => {
    const mostBought = rankings.slice(0, 5);
    const leastBought = [...rankings].reverse().slice(0, 5);
    return { mostBought, leastBought, lowStockItems: lowStock, sortedSales: rankings };
  }, [rankings, lowStock]);

  const filteredStats = useMemo(() => {
    const totalSales = orders.reduce((acc, o) => acc + o.total, 0);
    const orderCount = orders.length;
    const productSales: Record<string, number> = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
      });
    });
    const sortedSales = Object.entries(productSales)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty);
    return { totalSales, orderCount, sortedSales };
  }, [orders]);

  const filteredOrders = orders;
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const cartTotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // POS Actions
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: 1, ingredients: product.ingredients ?? [] }];
    });
  };

  const removeFromCart = (productId: string) => setCart(prev => prev.filter(i => i.productId !== productId));

  const updateCartQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(item =>
      item.productId === productId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
    ));
  };

  const applyDatePreset = (preset: 'today' | 'yesterday' | '7days' | '30days' | 'thisMonth' | 'clear') => {
    const now = new Date();
    let start = '', end = '';
    switch (preset) {
      case 'today':
        start = format(startOfDay(now), 'yyyy-MM-dd');
        end = format(endOfDay(now), 'yyyy-MM-dd');
        break;
      case 'yesterday': {
        const y = subDays(now, 1);
        start = format(startOfDay(y), 'yyyy-MM-dd');
        end = format(endOfDay(y), 'yyyy-MM-dd');
        break;
      }
      case '7days':
        start = format(subDays(now, 7), 'yyyy-MM-dd');
        end = format(now, 'yyyy-MM-dd');
        break;
      case '30days':
        start = format(subDays(now, 30), 'yyyy-MM-dd');
        end = format(now, 'yyyy-MM-dd');
        break;
      case 'thisMonth':
        start = format(startOfMonth(now), 'yyyy-MM-dd');
        end = format(endOfMonth(now), 'yyyy-MM-dd');
        break;
      case 'clear':
        break;
    }
    setDateFilter({ start, end });
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await login(loginForm.username, loginForm.password);
      } catch {
        alert('Invalid credentials (try admin/admin)');
      }
    };

    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-[2rem] border border-border-custom shadow-2xl p-8 sm:p-10">
          <div className="text-center mb-8 sm:mb-10">
            <h1 className="text-3xl font-black text-ink tracking-tighter">
              BENTE<span className="text-accent">EXPRESS</span>
            </h1>
            <p className="text-[10px] text-ink/60 mt-2 uppercase tracking-[0.3em] font-black">Staff Portal</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-ink/60 ml-1">Username</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/40" size={18} />
                <input
                  type="text"
                  value={loginForm.username}
                  onChange={e => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full bg-bg border border-border-custom rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-accent transition-colors"
                  placeholder="admin"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-ink/60 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/40" size={18} />
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={e => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full bg-bg border border-border-custom rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-accent transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-accent text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-accent/90 transition-all shadow-xl shadow-accent/20"
            >
              Sign In
            </button>
          </form>
          <p className="text-center text-[10px] text-ink/20 mt-8 font-bold uppercase tracking-widest">
            Default: admin / admin
          </p>
        </div>
      </div>
    );
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleLogout = async () => { await logout(); };

  const handleWipeDb = async () => {
    if (!window.confirm('⚠️ This will permanently delete ALL data (products, inventory, orders, logs). Are you sure?')) return;
    try {
      await apiClient.post('/admin/reset-db');
      alert('Database wiped. Refreshing...');
      window.location.reload();
    } catch {
      alert('Failed to wipe database.');
    }
  };

  // Convert g→kg and ml→liters so the backend always receives base inventory units
  const toBaseUnit = (qty: number, unit: string): { quantity: number; unit: string } => {
    if (unit === 'g') return { quantity: qty / 1000, unit: 'kg' };
    if (unit === 'ml') return { quantity: qty / 1000, unit: 'liters' };
    return { quantity: qty, unit };
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    try {
      await checkoutOrder(cart.map(i => ({
        productId: i.productId,
        quantity: i.quantity,
        ingredients: (i.ingredients ?? []).map(ing => {
          const converted = toBaseUnit(ing.quantity, ing.unit);
          return { ...ing, quantity: converted.quantity, unit: converted.unit };
        }),
      })));
      setCart([]);
      setIsMobileCartOpen(false);
      await Promise.all([refetchInventory(), refetchStockLogs(), refetchAuditLogs(), refetchReports(), refetchOrders()]);
      alert('Order processed successfully!');
    } catch {
      alert('Failed to process order. Please try again.');
    }
  };

  const addProduct = () => {
    setEditingProduct(null);
    setProductForm({ name: '', price: 0, category: 'Others', image: '', ingredients: [] });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.price) return;
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, productForm);
      } else {
        await createProduct({
          ...(productForm as Omit<Product, 'id'>),
          image: productForm.image || `https://picsum.photos/seed/${productForm.name}/400/400`
        });
      }
      await refetchAuditLogs();
      setIsProductModalOpen(false);
      setIngredientForm({ inventoryItemId: '', quantity: 1, unit: 'pcs' });
    } catch {
      alert('Failed to save product.');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    const product = products.find(p => p.id === id);
    if (confirm(`Are you sure you want to delete ${product?.name}?`)) {
      try {
        await removeProduct(id);
        await refetchAuditLogs();
      } catch {
        alert('Failed to delete product.');
      }
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockItem || stockAdjustmentForm.amount <= 0) return;
    try {
      await adjustStock(selectedStockItem.id, {
        amount: stockAdjustmentForm.amount,
        type: stockAdjustmentForm.type === 'add' ? 'addition' : 'reduction',
        reason: stockAdjustmentForm.reason,
      });
      await Promise.all([refetchStockLogs(), refetchAuditLogs(), refetchReports()]);
      setIsStockModalOpen(false);
      setSelectedStockItem(null);
      setStockAdjustmentForm({ amount: 0, type: 'add', reason: '' });
    } catch {
      alert('Failed to adjust stock.');
    }
  };

  const handleAddInventoryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createItem(addInventoryForm);
      await refetchAuditLogs();
      setIsAddInventoryModalOpen(false);
      setAddInventoryForm({ name: '', quantity: 0, unit: 'kg', minThreshold: 0 });
    } catch {
      alert('Failed to add inventory item.');
    }
  };

  const closeRemoveInventoryModal = () => {
    setIsRemoveInventoryModalOpen(false);
    setRemovingInventoryItem(null);
    setRemoveInventoryReason('');
  };

  const handleRemoveInventoryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!removingInventoryItem) return;
    try {
      // Log the full stock reduction before deleting so it appears in stock logs
      if (removingInventoryItem.quantity > 0) {
        await adjustStock(removingInventoryItem.id, {
          amount: removingInventoryItem.quantity,
          type: 'reduction',
          reason: `Item deleted — ${removeInventoryReason}`,
        });
      }
      await deleteItem(removingInventoryItem.id, removeInventoryReason);
      await Promise.all([refetchAuditLogs(), refetchStockLogs()]);
      closeRemoveInventoryModal();
    } catch {
      alert('Failed to remove inventory item.');
    }
  };

  const handleImportInventoryCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importCSV(file);
      await refetchAuditLogs();
      alert('Inventory imported successfully!');
    } catch {
      alert('Import failed. Please check the CSV format.');
    }
  };

  // ── Sidebar content (shared between desktop aside + mobile drawer) ────────
  const SidebarContent = () => (
    <>
      <div className="p-6 lg:p-8 border-b border-white/5">
        <h1 className="text-2xl font-black text-[#E8E1D9] flex items-center gap-2 tracking-tighter">
          BENTE<span className="text-accent">EXPRESS</span>
        </h1>
        <p className="text-[10px] text-[#E8E1D9]/60 mt-1 uppercase tracking-[0.3em] font-black">Inventory System</p>
      </div>

      <nav className="flex-1 px-4 py-6 lg:py-8 space-y-1 lg:space-y-2 overflow-y-auto">
        <NavItem active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<LayoutDashboard size={18} />} label="DASHBOARD" />
        <NavItem active={view === 'pos'} onClick={() => setView('pos')} icon={<ShoppingCart size={18} />} label="ORDERING" />
        <NavItem active={view === 'orders'} onClick={() => setView('orders')} icon={<ScrollText size={18} />} label="TRANSACTIONS" />
        <NavItem active={view === 'menu'} onClick={() => setView('menu')} icon={<Edit size={18} />} label="MENU" />
        <NavItem active={view === 'inventory'} onClick={() => setView('inventory')} icon={<Package size={18} />} label="INVENTORY" />
        <NavItem active={view === 'logs'} onClick={() => setView('logs')} icon={<History size={18} />} label="STOCK LOGS" />
        <NavItem active={view === 'audit'} onClick={() => setView('audit')} icon={<ShieldCheck size={18} />} label="AUDIT LOGS" />
        <NavItem active={view === 'reports'} onClick={() => setView('reports')} icon={<BarChart3 size={18} />} label="REPORTS" />
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[10px] font-black tracking-[0.2em] text-danger-custom hover:bg-danger-custom/10 transition-all mt-6 lg:mt-10"
        >
          <LogOut size={18} /> LOGOUT
        </button>
        <button
          onClick={handleWipeDb}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[10px] font-black tracking-[0.2em] text-orange-400 hover:bg-orange-400/10 transition-all mt-2"
        >
          <DatabaseZap size={18} /> WIPE DATABASE
        </button>
      </nav>

      <div className="p-4 lg:p-6">
        <div className="bg-white/5 p-4 lg:p-5 rounded-2xl border border-white/10 backdrop-blur-sm">
          <p className="text-[9px] font-black text-accent uppercase mb-3 tracking-[0.2em]">System Status</p>
          <div className="flex items-center gap-3 text-[11px] font-bold text-[#E8E1D9]">
            <div className="w-2 h-2 rounded-full bg-success-custom animate-pulse shadow-[0_0_10px_rgba(22,163,74,0.5)]" />
            OPERATIONAL
          </div>
        </div>
      </div>
    </>
  );

  // ── Cart panel content (shared between desktop + mobile sheet) ────────────
  const CartPanel = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={cn(
      "bg-white border border-border-custom shadow-sm flex flex-col overflow-hidden",
      mobile ? "h-full" : "rounded-2xl h-full"
    )}>
      <div className="p-4 lg:p-6 border-b border-border-custom flex items-center justify-between shrink-0">
        <h3 className="font-bold flex items-center gap-2 uppercase tracking-widest text-sm text-gray-400">
          <ShoppingCart size={18} /> Current Order
        </h3>
        {mobile && (
          <button onClick={() => setIsMobileCartOpen(false)} className="p-1 text-ink/30 hover:text-ink">
            <X size={20} />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-auto p-4 lg:p-6 space-y-4">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-200 space-y-2 py-12">
            <ShoppingCart size={48} strokeWidth={1.5} />
            <p className="text-[10px] font-bold uppercase tracking-widest">Your cart is empty</p>
          </div>
        ) : (
          cart.map(item => (
            <div key={item.productId} className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h5 className="text-sm font-bold uppercase tracking-tight text-gray-600 truncate">{item.name}</h5>
                <p className="text-[10px] font-semibold text-gray-300">₱{item.price} each</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center bg-bg border border-gray-100 rounded-lg p-1">
                  <button onClick={() => updateCartQty(item.productId, -1)} className="p-1 hover:bg-white rounded transition-colors text-gray-400">
                    <Minus size={12} />
                  </button>
                  <span className="w-7 text-center text-xs font-bold text-gray-600">{item.quantity}</span>
                  <button onClick={() => updateCartQty(item.productId, 1)} className="p-1 hover:bg-white rounded transition-colors text-gray-400">
                    <Plus size={12} />
                  </button>
                </div>
                <button onClick={() => removeFromCart(item.productId)} className="text-gray-200 hover:text-danger-custom transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="p-4 lg:p-6 border-t border-border-custom bg-bg shrink-0">
        <div className="flex justify-between mb-4">
          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Total Amount</span>
          <span className="text-2xl font-bold text-accent tracking-tight">₱{cartTotal.toLocaleString()}</span>
        </div>
        <button
          disabled={cart.length === 0}
          onClick={handleCheckout}
          className="w-full bg-ink text-white py-4 rounded-xl font-bold text-xs uppercase tracking-[0.2em] hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          Process Order
        </button>
      </div>
    </div>
  );

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-bg text-ink font-sans overflow-hidden">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex w-64 bg-sidebar flex-col z-20 shadow-2xl shrink-0">
        <SidebarContent />
      </aside>

      {/* ── Mobile nav drawer ── */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileNavOpen(false)}
          />
          {/* Drawer */}
          <aside className="relative w-72 max-w-[85vw] bg-sidebar flex flex-col shadow-2xl animate-in slide-in-from-left duration-300">
            <button
              onClick={() => setIsMobileNavOpen(false)}
              className="absolute top-4 right-4 p-2 text-white/40 hover:text-white"
            >
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header */}
        <header className="h-14 lg:h-[80px] bg-white/50 backdrop-blur-md border-b border-ink/5 px-4 lg:px-10 flex items-center justify-between shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setIsMobileNavOpen(true)}
              className="lg:hidden p-2 -ml-1 text-ink/40 hover:text-ink transition-colors shrink-0"
            >
              <MenuIcon size={22} />
            </button>
            <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-ink/30 truncate">
              {VIEW_LABELS[view]}
            </h2>
          </div>

          <div className="flex items-center gap-3 lg:gap-8 shrink-0">
            {stats.lowStockItems.length > 0 && (
              <div className="flex items-center gap-1.5 bg-danger-custom/10 text-danger-custom px-3 py-1.5 lg:px-4 lg:py-2 rounded-full text-[10px] font-black uppercase border border-danger-custom/10">
                <AlertTriangle size={12} />
                <span className="hidden sm:inline">{stats.lowStockItems.length} CRITICAL</span>
                <span className="sm:hidden">{stats.lowStockItems.length}</span>
              </div>
            )}
            <div className="hidden sm:block text-[11px] font-black text-ink/20 uppercase tracking-widest whitespace-nowrap">
              {format(new Date(), 'MMM do')}
            </div>
          </div>
        </header>

        {/* View container */}
        <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto lg:overflow-hidden">

          {/* ── DASHBOARD ── */}
          {view === 'dashboard' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 lg:h-full lg:grid-rows-2">

              {/* Top Performing */}
              <div className="sm:col-span-2 lg:col-span-2 lg:row-span-1 bg-white border border-border-custom rounded-3xl p-5 lg:p-8 shadow-xl shadow-ink/5 flex flex-col">
                <div className="flex items-center justify-between mb-5 lg:mb-8">
                  <h3 className="text-[11px] font-black text-ink/60 uppercase tracking-[0.3em]">Top Performing Items</h3>
                  <span className="px-3 py-1 bg-accent-soft text-accent text-[10px] font-black uppercase rounded-full">Live Stats</span>
                </div>
                <div className="grid grid-cols-2 gap-6 lg:gap-10 flex-1">
                  {[
                    { label: 'Most Bought', items: stats.mostBought, rankFn: (_: any, i: number) => i + 1, cls: 'text-accent' },
                    { label: 'Least Bought', items: stats.leastBought, rankFn: (_: any, i: number) => stats.sortedSales.length - i, cls: 'text-ink/40' },
                  ].map(({ label, items, rankFn, cls }) => (
                    <div key={label}>
                      <p className="text-[10px] font-black text-ink/50 uppercase mb-3 lg:mb-4 tracking-widest">{label}</p>
                      <div className="space-y-1">
                        {items.slice(0, 3).map((item, i) => (
                          <div key={item.name} className="flex items-center py-2 lg:py-3 border-b border-ink/5 last:border-0">
                            <span className={cn("w-7 font-black text-sm shrink-0", cls)}>{rankFn(item, i)}</span>
                            <span className="flex-1 text-sm font-bold truncate text-ink/80 pr-1">{item.name}</span>
                            <span className="font-black text-sm tabular-nums text-ink/60 shrink-0">{item.qty}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Order */}
              <div className="sm:col-span-2 lg:col-span-2 lg:row-span-2 bg-white border border-border-custom rounded-3xl p-5 lg:p-8 shadow-xl shadow-ink/5 flex flex-col">
                <div className="flex items-center justify-between mb-5 lg:mb-8">
                  <h3 className="text-[11px] font-black text-ink/60 uppercase tracking-[0.3em]">Quick Order</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" size={13} />
                    <input
                      type="text"
                      placeholder="Search menu..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="bg-bg border border-border-custom rounded-full py-2 pl-8 pr-3 text-[10px] font-bold focus:outline-none focus:border-accent w-36 sm:w-48"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 lg:gap-4 mb-5 overflow-auto pr-1">
                  {filteredProducts.slice(0, 8).map(product => {
                    const cartItem = cart.find(c => c.productId === product.id);
                    return (
                      <div key={product.id} className="border border-ink/10 p-3 rounded-2xl bg-bg hover:border-accent/30 transition-all flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-ink/5 shrink-0">
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <strong className="block text-[11px] font-black text-ink truncate uppercase tracking-tight">{product.name}</strong>
                          <small className="text-[10px] font-black text-accent">₱{product.price.toFixed(2)}</small>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {cartItem && (
                            <span className="bg-accent text-white text-[9px] font-black px-1.5 py-0.5 rounded-md">
                              {cartItem.quantity}
                            </span>
                          )}
                          <button onClick={() => addToCart(product)} className="p-1.5 bg-white border border-ink/10 rounded-xl hover:bg-accent hover:text-white transition-all shadow-sm">
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-auto pt-5 border-t border-dashed border-ink/10">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-black text-ink/60 uppercase tracking-widest">Subtotal</span>
                    <strong className="text-2xl font-black text-accent tracking-tighter">₱{cartTotal.toLocaleString()}</strong>
                  </div>
                  <button
                    onClick={() => setView('pos')}
                    className="w-full bg-ink text-white py-4 lg:py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-accent transition-all shadow-xl shadow-ink/10"
                  >
                    Open Full POS
                  </button>
                </div>
              </div>

              {/* Stock Pulse */}
              <div className="bg-white border border-border-custom rounded-3xl p-5 lg:p-8 shadow-xl shadow-ink/5 flex flex-col">
                <h3 className="text-[11px] font-black text-ink/60 uppercase tracking-[0.3em] mb-5 lg:mb-8">Stock Pulse</h3>
                <div className="space-y-5 flex-1 overflow-auto">
                  {inventory.slice(0, 3).map(item => (
                    <div key={item.id}>
                      <div className="flex justify-between text-[11px] font-black mb-2 uppercase tracking-widest">
                        <span className="truncate pr-2 text-ink/80">{item.name}</span>
                        <span className={cn("shrink-0", item.quantity <= item.minThreshold ? "text-danger-custom" : "text-ink")}>
                          {item.quantity.toFixed(0)}{item.unit}
                        </span>
                      </div>
                      <div className="h-2 bg-bg rounded-full overflow-hidden border border-ink/5">
                        <div
                          className={cn("h-full transition-all duration-700 ease-out", item.quantity <= item.minThreshold ? "bg-danger-custom" : "bg-accent")}
                          style={{ width: `${Math.min(100, (item.quantity / (item.minThreshold * 3)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white border border-border-custom rounded-3xl p-5 lg:p-8 shadow-xl shadow-ink/5 flex flex-col">
                <h3 className="text-[11px] font-black text-ink/60 uppercase tracking-[0.3em] mb-5 lg:mb-6">Quick Actions</h3>
                <div className="flex-1 flex flex-col gap-3">
                  <button onClick={addProduct} className="w-full bg-accent text-white py-3.5 lg:py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2">
                    <Plus size={16} /> Add Menu Item
                  </button>
                  <label className="w-full bg-white border border-border-custom text-ink/80 py-3.5 lg:py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-bg transition-all flex items-center justify-center gap-2 cursor-pointer">
                    <Upload size={16} /> Import CSV
                    <input type="file" accept=".csv" onChange={handleImportInventoryCSV} className="hidden" />
                  </label>
                  <button
                    onClick={() => exportsApi.inventory().catch(() => alert('Export failed'))}
                    className="w-full bg-white border border-border-custom text-ink/80 py-3.5 lg:py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-bg transition-all flex items-center justify-center gap-2"
                  >
                    <Download size={16} /> Export CSV
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ── POS ── */}
          {view === 'pos' && (
            <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-8 lg:h-full lg:overflow-hidden">

              {/* Menu grid */}
              <div className="lg:col-span-2 flex flex-col lg:overflow-hidden">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 lg:mb-8">
                  <div className="relative w-full sm:flex-1 sm:max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/40" size={18} />
                    <input
                      type="text"
                      placeholder="Search for food, drinks, sides..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-white border border-border-custom rounded-2xl py-3 lg:py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-accent shadow-sm"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {['All', 'Meals', 'Drinks', 'Sides'].map(cat => (
                      <button key={cat} className="px-3 py-1.5 lg:px-4 lg:py-2 bg-white border border-border-custom rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-accent hover:text-white transition-all text-ink/60">
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 lg:gap-6 overflow-auto pb-4 lg:pb-8 pr-1 lg:pr-2">
                  {filteredProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="bg-white p-4 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] border border-border-custom shadow-xl shadow-ink/5 text-left hover:border-accent hover:-translate-y-1 transition-all group"
                    >
                      <div className="w-full aspect-square bg-bg rounded-xl lg:rounded-2xl mb-3 lg:mb-5 flex items-center justify-center overflow-hidden">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                        ) : (
                          <Package size={40} className="text-ink/10" />
                        )}
                      </div>
                      <h4 className="font-black text-xs lg:text-sm uppercase tracking-tight text-ink leading-tight">{product.name}</h4>
                      <p className="text-accent font-black text-lg lg:text-xl mt-1 tracking-tighter">₱{product.price}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Desktop cart */}
              <div className="hidden lg:flex flex-col h-full">
                <CartPanel />
              </div>

              {/* Mobile floating cart button */}
              {cart.length > 0 && (
                <button
                  onClick={() => setIsMobileCartOpen(true)}
                  className="lg:hidden fixed bottom-6 right-4 z-40 bg-accent text-white px-5 py-3.5 rounded-2xl shadow-2xl shadow-accent/30 font-black text-[11px] uppercase tracking-widest flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300"
                >
                  <ShoppingCart size={18} />
                  {cartCount} item{cartCount !== 1 ? 's' : ''} · ₱{cartTotal.toLocaleString()}
                </button>
              )}
            </div>
          )}

          {/* ── TRANSACTIONS ── */}
          {view === 'orders' && (() => {
            const q = orderSearch.trim().toLowerCase();
            const filtered = orders
              .filter(o =>
                !q ||
                o.items.some(i => i.name.toLowerCase().includes(q)) ||
                o.total.toFixed(2).includes(q)
              )
              .slice()
              .sort((a, b) => orderSortDesc ? b.timestamp - a.timestamp : a.timestamp - b.timestamp);
            return (
              <div className="bg-white rounded-3xl border border-ink/5 shadow-xl shadow-ink/5 overflow-hidden flex flex-col lg:h-full">
                <div className="p-4 lg:p-8 border-b border-ink/5 shrink-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black uppercase tracking-[0.2em] text-xs text-ink/40">Transaction History</h3>
                    <button
                      onClick={() => setOrderSortDesc(d => !d)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-bg border border-ink/5 rounded-xl hover:border-accent/30 hover:text-accent transition-all shadow-sm text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
                    >
                      <Calendar size={13} />
                      {orderSortDesc ? 'Newest First' : 'Oldest First'}
                    </button>
                  </div>
                  <div className="relative">
                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/25 pointer-events-none" />
                    <input
                      type="text"
                      value={orderSearch}
                      onChange={e => setOrderSearch(e.target.value)}
                      placeholder="Search by item name or total amount..."
                      className="w-full bg-bg border border-border-custom rounded-2xl py-3 pl-10 pr-4 text-sm font-bold focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                </div>
                <div className="overflow-auto flex-1">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-white border-b border-ink/5 z-10">
                      <tr className="text-[10px] font-black uppercase tracking-[0.15em] text-ink/30">
                        <th className="px-4 lg:px-8 py-4 lg:py-5">Date & Time</th>
                        <th className="px-4 lg:px-8 py-4 lg:py-5">Order ID</th>
                        <th className="px-4 lg:px-8 py-4 lg:py-5">Items</th>
                        <th className="px-4 lg:px-8 py-4 lg:py-5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/5">
                      {filtered.map(order => (
                        <tr key={order.id} className="hover:bg-bg/50 transition-colors align-top">
                          <td className="px-4 lg:px-8 py-4 lg:py-5 text-[11px] font-bold text-ink/40 whitespace-nowrap">
                            {format(order.timestamp, 'MMM d, yyyy')}<br />
                            <span className="text-ink/25">{format(order.timestamp, 'HH:mm')}</span>
                          </td>
                          <td className="px-4 lg:px-8 py-4 lg:py-5 text-[11px] font-mono text-ink/30">{order.id}</td>
                          <td className="px-4 lg:px-8 py-4 lg:py-5">
                            <ul className="space-y-0.5">
                              {order.items.map((item, idx) => (
                                <li key={idx} className="text-xs font-bold text-ink/70">
                                  {item.quantity}× {item.name}
                                  <span className="text-ink/30 font-medium ml-1">₱{item.price.toFixed(2)}</span>
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td className="px-4 lg:px-8 py-4 lg:py-5 font-black text-base text-accent tracking-tighter text-right whitespace-nowrap">
                            ₱{order.total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      {filtered.length === 0 && (
                        <tr><td colSpan={4} className="px-8 py-20 text-center text-ink/20 font-black uppercase tracking-[0.3em] text-[10px]">
                          {orders.length === 0 ? 'No transactions yet.' : 'No results match your search.'}
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* ── MENU ── */}
          {view === 'menu' && (
            <div className="bg-white rounded-3xl border border-ink/5 shadow-xl shadow-ink/5 overflow-hidden flex flex-col lg:h-full">
              <div className="p-4 lg:p-8 border-b border-ink/5 flex items-center justify-between shrink-0">
                <h3 className="font-black uppercase tracking-[0.2em] text-xs text-ink/40">Menu Management</h3>
                <button onClick={addProduct} className="px-3 py-2 lg:px-4 bg-accent text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-accent/90 transition-all flex items-center gap-2">
                  <Plus size={14} /> <span className="hidden sm:inline">New Menu Item</span><span className="sm:hidden">Add</span>
                </button>
              </div>
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-bg text-[10px] font-black text-ink/30 uppercase tracking-[0.2em] border-b border-ink/5">
                      <th className="px-4 lg:px-8 py-4 lg:py-5">Item</th>
                      <th className="px-4 lg:px-8 py-4 lg:py-5">Category</th>
                      <th className="px-4 lg:px-8 py-4 lg:py-5">Price</th>
                      <th className="px-4 lg:px-8 py-4 lg:py-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/5">
                    {products.map(product => (
                      <tr key={product.id} className="hover:bg-bg/50 transition-colors">
                        <td className="px-4 lg:px-8 py-4 lg:py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg overflow-hidden bg-bg border border-ink/5 shrink-0">
                              <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                            <span className="font-bold text-sm uppercase tracking-tight text-ink/80">{product.name}</span>
                          </div>
                        </td>
                        <td className="px-4 lg:px-8 py-4 lg:py-5">
                          <span className="px-2 py-1 bg-bg border border-ink/10 text-[9px] font-black uppercase rounded-full tracking-wider text-ink/40">{product.category}</span>
                        </td>
                        <td className="px-4 lg:px-8 py-4 lg:py-5 font-black text-lg text-accent tracking-tighter">₱{product.price.toFixed(2)}</td>
                        <td className="px-4 lg:px-8 py-4 lg:py-5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => { setEditingProduct(product); setProductForm({ ...product, ingredients: product.ingredients ?? [] }); setIsProductModalOpen(true); }} className="p-2 text-ink/40 hover:text-accent transition-colors">
                              <Edit size={16} />
                            </button>
                            <button onClick={() => handleDeleteProduct(product.id)} className="p-2 text-ink/40 hover:text-danger-custom transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── INVENTORY ── */}
          {view === 'inventory' && (
            <div className="bg-white rounded-3xl border border-ink/5 shadow-xl shadow-ink/5 overflow-hidden flex flex-col lg:h-full">
              <div className="p-4 lg:p-8 border-b border-ink/5 shrink-0 flex items-center justify-between">
                <h3 className="font-black uppercase tracking-[0.2em] text-xs text-ink/40">Stock Monitoring</h3>
                <button
                  onClick={() => setIsAddInventoryModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-accent/90 transition-all shadow-lg shadow-accent/20"
                >
                  <PackagePlus size={14} /> <span className="hidden sm:inline">Add Item</span>
                </button>
              </div>
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-bg text-[10px] font-black text-ink/30 uppercase tracking-[0.2em] border-b border-ink/5">
                      <th className="px-4 lg:px-8 py-4 lg:py-5">Item Name</th>
                      <th className="px-4 lg:px-8 py-4 lg:py-5">Stock</th>
                      <th className="px-4 lg:px-8 py-4 lg:py-5">Unit</th>
                      <th className="px-4 lg:px-8 py-4 lg:py-5 hidden sm:table-cell">Status</th>
                      <th className="px-4 lg:px-8 py-4 lg:py-5">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/5">
                    {inventory.map(item => (
                      <tr key={item.id} className="hover:bg-bg/50 transition-colors">
                        <td className="px-4 lg:px-8 py-4 lg:py-5 font-bold text-sm uppercase tracking-tight text-ink/80">{item.name}</td>
                        <td className="px-4 lg:px-8 py-4 lg:py-5">
                          <span className={cn("font-black text-xl tracking-tighter", item.quantity <= item.minThreshold ? "text-danger-custom" : "text-ink")}>
                            {item.quantity.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 lg:px-8 py-4 lg:py-5 text-[10px] font-black text-ink/30 uppercase tracking-widest">{item.unit}</td>
                        <td className="px-4 lg:px-8 py-4 lg:py-5 hidden sm:table-cell">
                          {item.quantity <= item.minThreshold
                            ? <span className="px-3 py-1 bg-danger-custom/10 text-danger-custom text-[9px] font-black uppercase rounded-full tracking-wider">Critical</span>
                            : <span className="px-3 py-1 bg-success-custom/10 text-success-custom text-[9px] font-black uppercase rounded-full tracking-wider">Healthy</span>
                          }
                        </td>
                        <td className="px-4 lg:px-8 py-4 lg:py-5">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { setSelectedStockItem(item); setIsStockModalOpen(true); }}
                              className="flex items-center gap-1.5 px-3 py-2 bg-bg border border-ink/5 rounded-xl hover:border-accent/30 hover:text-accent transition-all shadow-sm text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
                            >
                              <Settings2 size={13} /> <span className="hidden sm:inline">Adjust </span>Stock
                            </button>
                            <button
                              onClick={() => { setRemovingInventoryItem(item); setIsRemoveInventoryModalOpen(true); }}
                              className="flex items-center gap-1.5 px-3 py-2 bg-bg border border-ink/5 rounded-xl hover:border-danger-custom/30 hover:text-danger-custom transition-all shadow-sm text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── STOCK LOGS ── */}
          {view === 'logs' && (
            <div className="bg-white rounded-3xl border border-ink/5 shadow-xl shadow-ink/5 overflow-hidden lg:h-full flex flex-col">
              <div className="p-4 lg:p-8 border-b border-ink/5 shrink-0">
                <h3 className="font-black uppercase tracking-[0.2em] text-xs text-ink/40">Inventory Movement Logs</h3>
              </div>
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse min-w-[550px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-bg text-[10px] font-black text-ink/30 uppercase tracking-[0.2em] border-b border-ink/5">
                      <th className="px-4 lg:px-8 py-4 lg:py-5">Timestamp</th>
                      <th className="px-4 lg:px-8 py-4 lg:py-5">Item</th>
                      <th className="px-4 lg:px-8 py-4 lg:py-5">Change</th>
                      <th className="px-4 lg:px-8 py-4 lg:py-5">Type</th>
                      <th className="px-4 lg:px-8 py-4 lg:py-5 hidden md:table-cell">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/5">
                    {stockLogs.map(log => {
                      const invItem = inventory.find(i => String(i.id) === String(log.itemId));
                      const displayName = log.itemName || invItem?.name || `Item #${log.itemId}`;
                      const displayUnit = log.itemUnit || invItem?.unit || '';
                      return (
                        <tr key={log.id} className="hover:bg-bg/50 transition-colors">
                          <td className="px-4 lg:px-8 py-4 lg:py-5 text-[11px] font-bold text-ink/40 whitespace-nowrap">{format(log.timestamp, 'MMM d, HH:mm')}</td>
                          <td className="px-4 lg:px-8 py-4 lg:py-5 font-bold text-sm text-ink/80">{displayName}</td>
                          <td className="px-4 lg:px-8 py-4 lg:py-5">
                            <div className={cn("flex items-center gap-1 font-black text-sm", log.change > 0 ? "text-success-custom" : "text-danger-custom")}>
                              {log.change > 0 ? <Plus size={12} /> : <Minus size={12} />}
                              {Math.abs(log.change).toFixed(2)} {displayUnit}
                            </div>
                          </td>
                          <td className="px-4 lg:px-8 py-4 lg:py-5">
                            <span className={cn("px-2 py-1 text-[9px] font-black uppercase rounded-md tracking-wider",
                              log.type === 'addition' ? "bg-success-custom/10 text-success-custom" :
                                log.type === 'sale' ? "bg-accent/10 text-accent" : "bg-danger-custom/10 text-danger-custom"
                            )}>
                              {log.type}
                            </span>
                          </td>
                          <td className="px-4 lg:px-8 py-4 lg:py-5 text-xs font-medium text-ink/50 italic hidden md:table-cell">{log.reason || '—'}</td>
                        </tr>
                      );
                    })}
                    {stockLogs.length === 0 && (
                      <tr><td colSpan={5} className="px-8 py-20 text-center text-ink/20 font-black uppercase tracking-[0.3em] text-[10px]">No stock movements recorded.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── REPORTS ── */}
          {view === 'reports' && (
            <div className="space-y-5 lg:space-y-8 pb-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h3 className="text-xl font-black text-ink tracking-tight uppercase">Performance Analytics</h3>
                <button
                  onClick={() => {
                    const s = dateFilter.start ? new Date(dateFilter.start).getTime() : undefined;
                    const e = dateFilter.end ? new Date(dateFilter.end).getTime() : undefined;
                    exportsApi.orders(s, e).catch(() => alert('Export failed'));
                  }}
                  className="flex items-center gap-2 bg-ink text-white px-4 py-2.5 lg:px-6 lg:py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-accent transition-all shadow-lg shadow-ink/10 whitespace-nowrap"
                >
                  <FileDown size={15} /> Export {filteredOrders.length} Transactions
                </button>
              </div>

              {/* Date filter */}
              <div className="bg-white p-4 lg:p-6 rounded-[2rem] border border-ink/5 shadow-xl shadow-ink/5 space-y-4 lg:space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-black text-ink/30 uppercase tracking-[0.2em] mr-1 w-full sm:w-auto">Quick Presets:</p>
                  {[
                    { id: 'today', label: 'Today' },
                    { id: 'yesterday', label: 'Yesterday' },
                    { id: '7days', label: '7 Days' },
                    { id: '30days', label: '30 Days' },
                    { id: 'thisMonth', label: 'This Month' },
                    { id: 'clear', label: 'Reset' },
                  ].map(p => (
                    <button
                      key={p.id}
                      onClick={() => applyDatePreset(p.id as any)}
                      className="px-3 py-1.5 lg:px-4 lg:py-2 bg-bg border border-ink/5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:border-accent hover:text-accent transition-all text-ink/60"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-3 lg:pt-4 border-t border-ink/5">
                  <div className="relative w-full sm:w-auto">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" size={13} />
                    <input type="date" value={dateFilter.start} onChange={e => setDateFilter(p => ({ ...p, start: e.target.value }))}
                      className="w-full bg-bg border border-border-custom rounded-xl py-2 pl-9 pr-3 text-[10px] font-black uppercase focus:outline-none focus:border-accent text-ink/80" />
                  </div>
                  <span className="text-ink/20 font-black text-xs hidden sm:block">TO</span>
                  <div className="relative w-full sm:w-auto">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" size={13} />
                    <input type="date" value={dateFilter.end} onChange={e => setDateFilter(p => ({ ...p, end: e.target.value }))}
                      className="w-full bg-bg border border-border-custom rounded-xl py-2 pl-9 pr-3 text-[10px] font-black uppercase focus:outline-none focus:border-accent text-ink/80" />
                  </div>
                </div>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-8">
                {[
                  { label: 'Total Revenue', value: `₱${filteredStats.totalSales.toLocaleString()}`, cls: 'text-accent' },
                  { label: 'Avg Order Value', value: `₱${filteredStats.orderCount > 0 ? (filteredStats.totalSales / filteredStats.orderCount).toFixed(2) : '0'}`, cls: 'text-ink' },
                  { label: 'Total Orders', value: String(filteredStats.orderCount), cls: 'text-ink/60' },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="bg-white p-6 lg:p-10 rounded-[2rem] border border-ink/5 shadow-2xl shadow-ink/5">
                    <h4 className="text-[10px] font-black text-ink/50 uppercase tracking-[0.2em] mb-3 lg:mb-4">{label}</h4>
                    <p className={cn("text-4xl lg:text-5xl font-black tracking-tighter", cls)}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Bar chart */}
              <div className="bg-white p-6 lg:p-10 rounded-[2rem] border border-ink/5 shadow-2xl shadow-ink/5">
                <h3 className="font-black uppercase tracking-[0.3em] text-xs text-ink/60 mb-6 lg:mb-10">Sales Performance</h3>
                <div className="h-[260px] lg:h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredStats.sortedSales}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#1C1917', fontSize: 10, fontWeight: 800, opacity: 0.8 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#1C1917', fontSize: 10, fontWeight: 800, opacity: 0.8 }} />
                      <Tooltip cursor={{ fill: '#FFF7ED' }} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', padding: '16px' }} />
                      <Bar dataKey="qty" fill="#EA580C" radius={[8, 8, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Transactions table */}
              <div className="bg-white rounded-[2rem] border border-ink/5 shadow-2xl shadow-ink/5 overflow-hidden">
                <div className="p-5 lg:p-10 border-b border-ink/5 flex items-center justify-between">
                  <h3 className="font-black uppercase tracking-[0.3em] text-xs text-ink/60">Recent Transactions</h3>
                  <div className="flex items-center gap-3">
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-1.5 lg:p-2 bg-bg rounded-lg disabled:opacity-30 text-ink/60">
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-[10px] font-black text-ink/60 uppercase tracking-widest">Pg {currentPage}</span>
                    <button disabled={currentPage * itemsPerPage >= filteredOrders.length} onClick={() => setCurrentPage(p => p + 1)} className="p-1.5 lg:p-2 bg-bg rounded-lg disabled:opacity-30 text-ink/60">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[500px]">
                    <thead>
                      <tr className="bg-bg text-[10px] font-black text-ink/60 uppercase tracking-[0.3em] border-b border-ink/5">
                        <th className="px-5 lg:px-10 py-4 lg:py-6">Order ID</th>
                        <th className="px-5 lg:px-10 py-4 lg:py-6">Time</th>
                        <th className="px-5 lg:px-10 py-4 lg:py-6 hidden md:table-cell">Items</th>
                        <th className="px-5 lg:px-10 py-4 lg:py-6 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/5">
                      {paginatedOrders.map(order => (
                        <tr key={order.id} className="hover:bg-bg/50 transition-colors">
                          <td className="px-5 lg:px-10 py-4 lg:py-6 font-mono text-[10px] text-ink/50 uppercase truncate max-w-[120px]">{order.id}</td>
                          <td className="px-5 lg:px-10 py-4 lg:py-6 text-[11px] font-black text-ink/80 whitespace-nowrap">{format(order.timestamp, 'MMM d, HH:mm')}</td>
                          <td className="px-5 lg:px-10 py-4 lg:py-6 hidden md:table-cell">
                            <div className="flex flex-wrap gap-1.5">
                              {order.items.map((item, i) => (
                                <span key={i} className="px-2 py-0.5 bg-bg border border-ink/10 text-[9px] font-black uppercase rounded-full tracking-wider text-ink/70">
                                  {item.quantity}x {item.name}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-5 lg:px-10 py-4 lg:py-6 text-right font-black text-accent text-lg tracking-tighter whitespace-nowrap">
                            ₱{order.total.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {paginatedOrders.length === 0 && (
                        <tr><td colSpan={4} className="px-10 py-16 text-center text-ink/40 italic font-black uppercase tracking-[0.4em] text-[10px]">No transactions found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── AUDIT LOGS ── */}
          {view === 'audit' && (
            <div className="bg-white rounded-[2rem] border border-ink/5 shadow-2xl shadow-ink/5 overflow-hidden flex flex-col lg:h-full">
              <div className="p-5 lg:p-10 border-b border-ink/5 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="font-black uppercase tracking-[0.3em] text-xs text-ink/60">System Audit Logs</h3>
                  <p className="text-[10px] text-ink/40 font-bold mt-1 uppercase tracking-widest hidden sm:block">Tracking all employee actions and system events</p>
                </div>
                <button
                  onClick={() => exportsApi.auditLogs().catch(() => alert('Export failed'))}
                  className="px-4 py-2.5 lg:px-6 lg:py-3 bg-ink text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-accent transition-all shadow-lg shadow-ink/10 whitespace-nowrap"
                >
                  Export Logs
                </button>
              </div>
              <div className="overflow-auto flex-1">
                <table className="w-full text-left min-w-[550px]">
                  <thead>
                    <tr className="bg-bg text-[10px] font-black text-ink/60 uppercase tracking-[0.3em] border-b border-ink/5 sticky top-0 z-10">
                      <th className="px-5 lg:px-10 py-4 lg:py-6">Timestamp</th>
                      <th className="px-5 lg:px-10 py-4 lg:py-6">User</th>
                      <th className="px-5 lg:px-10 py-4 lg:py-6">Action</th>
                      <th className="px-5 lg:px-10 py-4 lg:py-6">Type</th>
                      <th className="px-5 lg:px-10 py-4 lg:py-6 hidden lg:table-cell">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/5">
                    {auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-bg/50 transition-colors">
                        <td className="px-5 lg:px-10 py-4 lg:py-6 text-[11px] font-black text-ink/40 whitespace-nowrap">{format(log.timestamp, 'MMM d, HH:mm')}</td>
                        <td className="px-5 lg:px-10 py-4 lg:py-6">
                          <span className="px-2 py-1 bg-bg border border-ink/10 text-[9px] font-black uppercase rounded-full tracking-wider text-ink/80">{log.user}</span>
                        </td>
                        <td className="px-5 lg:px-10 py-4 lg:py-6 text-[11px] font-black text-ink uppercase tracking-tight">{log.action}</td>
                        <td className="px-5 lg:px-10 py-4 lg:py-6">
                          <span className={cn("px-2 py-1 text-[9px] font-black uppercase rounded-full tracking-wider",
                            log.type === 'auth' ? "bg-blue-50 text-blue-600" :
                              log.type === 'inventory' ? "bg-orange-50 text-orange-600" :
                                log.type === 'order' ? "bg-green-50 text-green-600" :
                                  log.type === 'menu' ? "bg-purple-50 text-purple-600" : "bg-gray-50 text-gray-600"
                          )}>
                            {log.type}
                          </span>
                        </td>
                        <td className="px-5 lg:px-10 py-4 lg:py-6 text-[11px] font-bold text-ink/60 hidden lg:table-cell">{log.details}</td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr><td colSpan={5} className="px-10 py-24 text-center text-ink/40 italic font-black uppercase tracking-[0.4em] text-[10px]">No audit logs recorded yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ── Mobile cart sheet ── */}
      {isMobileCartOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMobileCartOpen(false)} />
          <div className="relative bg-white rounded-t-[2rem] shadow-2xl h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">
            <CartPanel mobile />
          </div>
        </div>
      )}

      {/* ── Product Modal ── */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-ink/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full sm:max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500 max-h-[95vh] overflow-y-auto">
            <div className="p-6 lg:p-10 border-b border-ink/5 flex items-center justify-between bg-bg sticky top-0 z-10">
              <div>
                <h2 className="text-xl lg:text-2xl font-black text-ink tracking-tighter uppercase">{editingProduct ? 'Edit Menu Item' : 'New Menu Item'}</h2>
                <p className="text-[10px] text-ink/40 font-bold mt-1 uppercase tracking-widest">Configure your stall offerings</p>
              </div>
              <button onClick={() => setIsProductModalOpen(false)} className="p-3 hover:bg-white rounded-2xl text-ink/20 hover:text-ink transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSaveProduct} className="p-6 lg:p-10 space-y-6 lg:space-y-8">
              <div className="grid grid-cols-2 gap-5 lg:gap-8">
                <div className="space-y-3 col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-ink/40 ml-1">Product Name</label>
                  <input required type="text" value={productForm.name}
                    onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full bg-bg border border-border-custom rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:border-accent transition-colors"
                    placeholder="e.g. Special Tapsilog" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-ink/40 ml-1">Price (₱)</label>
                  <input required type="number" value={productForm.price}
                    onChange={e => setProductForm(p => ({ ...p, price: Number(e.target.value) }))}
                    className="w-full bg-bg border border-border-custom rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:border-accent transition-colors"
                    placeholder="0.00" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-ink/40 ml-1">Category</label>
                  <select value={productForm.category} onChange={e => setProductForm(p => ({ ...p, category: e.target.value as any }))}
                    className="w-full bg-bg border border-border-custom rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:border-accent transition-colors appearance-none">
                    <option>Meals</option><option>Drinks</option><option>Sides</option><option>Others</option>
                  </select>
                </div>
                <div className="space-y-3 col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-ink/40 ml-1">Image URL</label>
                  <div className="flex gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-bg border border-border-custom flex items-center justify-center shrink-0 overflow-hidden">
                      {productForm.image ? <img src={productForm.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <ImageIcon className="text-ink/10" size={22} />}
                    </div>
                    <input type="text" value={productForm.image}
                      onChange={e => setProductForm(p => ({ ...p, image: e.target.value }))}
                      className="flex-1 bg-bg border border-border-custom rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:border-accent transition-colors"
                      placeholder="https://..." />
                  </div>
                </div>
                {/* Ingredients */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-ink/40 ml-1">Ingredients (Stock Deductions per Order)</label>

                  {/* Existing ingredient rows */}
                  {(productForm.ingredients ?? []).length > 0 && (
                    <div className="space-y-2">
                      {(productForm.ingredients ?? []).map((ing, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-bg border border-border-custom rounded-2xl px-4 py-3">
                          <span className="flex-1 text-sm font-bold text-ink">{ing.inventoryItemName}</span>
                          <span className="text-xs text-ink/50 font-bold">{ing.quantity} {ing.unit}</span>
                          <button type="button"
                            onClick={() => setProductForm(p => ({ ...p, ingredients: (p.ingredients ?? []).filter((_, i) => i !== idx) }))}
                            className="text-danger-custom hover:text-danger-custom/70 transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add ingredient row */}
                  <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                    <select
                      value={ingredientForm.inventoryItemId}
                      onChange={e => {
                        const item = inventory.find(i => i.id === e.target.value);
                        const firstUnit = (item ? COMPATIBLE_INGREDIENT_UNITS[item.unit]?.[0] : 'pcs') as IngredientUnit;
                        setIngredientForm(f => ({ ...f, inventoryItemId: e.target.value, unit: firstUnit ?? 'pcs' }));
                      }}
                      className="flex-1 bg-bg border border-border-custom rounded-2xl py-3 px-4 text-sm font-bold text-ink focus:outline-none focus:border-accent transition-colors">
                      <option value="">Select ingredient...</option>
                      {inventory.map(item => (
                        <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={ingredientForm.quantity}
                      onChange={e => setIngredientForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                      className="w-20 bg-bg border border-border-custom rounded-2xl py-3 px-3 text-sm font-bold focus:outline-none focus:border-accent transition-colors"
                      min="0.01" step="0.01" placeholder="Qty" />
                    <select
                      value={ingredientForm.unit}
                      onChange={e => setIngredientForm(f => ({ ...f, unit: e.target.value as IngredientUnit }))}
                      className="w-24 bg-bg border border-border-custom rounded-2xl py-3 px-3 text-sm font-bold focus:outline-none focus:border-accent transition-colors appearance-none">
                      {(COMPATIBLE_INGREDIENT_UNITS[inventory.find(i => i.id === ingredientForm.inventoryItemId)?.unit ?? ''] ?? ['pcs']).map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                    <button type="button"
                      onClick={() => {
                        const item = inventory.find(i => i.id === ingredientForm.inventoryItemId);
                        if (!item || !ingredientForm.quantity) return;
                        setProductForm(p => ({
                          ...p,
                          ingredients: [...(p.ingredients ?? []), {
                            inventoryItemId: item.id,
                            inventoryItemName: item.name,
                            quantity: ingredientForm.quantity,
                            unit: ingredientForm.unit
                          } as ProductIngredient]
                        }));
                        setIngredientForm({ inventoryItemId: '', quantity: 1, unit: 'pcs' });
                      }}
                      className="flex items-center gap-1 px-4 py-3 bg-accent text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-accent/90 transition-all shrink-0">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setIsProductModalOpen(false)} className="flex-1 bg-bg border border-border-custom text-ink/60 py-4 lg:py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-white transition-all">Cancel</button>
                <button type="submit" className="flex-1 bg-accent text-white py-4 lg:py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-accent/90 transition-all shadow-xl shadow-accent/20">
                  {editingProduct ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Inventory Item Modal ── */}
      {isAddInventoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-ink/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full sm:max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500 max-h-[95vh] overflow-y-auto">
            <div className="p-6 lg:p-10 border-b border-ink/5 flex items-center justify-between bg-bg sticky top-0 z-10">
              <div>
                <h2 className="text-xl lg:text-2xl font-black text-ink tracking-tighter uppercase">Add Inventory Item</h2>
                <p className="text-[10px] text-ink/40 font-bold mt-1 uppercase tracking-widest">New material or ingredient</p>
              </div>
              <button onClick={() => setIsAddInventoryModalOpen(false)} className="p-3 hover:bg-white rounded-2xl text-ink/20 hover:text-ink transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddInventoryItem} className="p-6 lg:p-10 space-y-6 lg:space-y-8">
              <div className="grid grid-cols-2 gap-5 lg:gap-8">
                <div className="space-y-3 col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-ink/40 ml-1">Item Name</label>
                  <input
                    required
                    type="text"
                    value={addInventoryForm.name}
                    onChange={e => setAddInventoryForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full bg-bg border border-border-custom rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:border-accent transition-colors"
                    placeholder="e.g. Rice, Cooking Oil, Eggs"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-ink/40 ml-1">Initial Quantity</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={addInventoryForm.quantity}
                    onChange={e => setAddInventoryForm(p => ({ ...p, quantity: Number(e.target.value) }))}
                    className="w-full bg-bg border border-border-custom rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:border-accent transition-colors"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-ink/40 ml-1">Unit</label>
                  <select
                    value={addInventoryForm.unit}
                    onChange={e => setAddInventoryForm(p => ({ ...p, unit: e.target.value as InventoryItem['unit'] }))}
                    className="w-full bg-bg border border-border-custom rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:border-accent transition-colors appearance-none"
                  >
                    {INVENTORY_UNITS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3 col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-ink/40 ml-1">Critical Threshold</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={addInventoryForm.minThreshold}
                    onChange={e => setAddInventoryForm(p => ({ ...p, minThreshold: Number(e.target.value) }))}
                    className="w-full bg-bg border border-border-custom rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:border-accent transition-colors"
                    placeholder="Alert when stock falls below this"
                  />
                  <p className="text-[10px] text-ink/30 font-bold ml-1 uppercase tracking-wider">Stock below this value will show as Critical</p>
                </div>
              </div>

              <div className="flex gap-4">
                <button type="button" onClick={() => setIsAddInventoryModalOpen(false)} className="flex-1 bg-bg border border-border-custom text-ink/60 py-4 lg:py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-white transition-all">Cancel</button>
                <button type="submit" className="flex-1 bg-accent text-white py-4 lg:py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-accent/20 hover:bg-accent/90 transition-all">
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Remove Inventory Item Modal ── */}
      {isRemoveInventoryModalOpen && removingInventoryItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-ink/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full sm:max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500 max-h-[95vh] overflow-y-auto">
            <div className="p-6 lg:p-10 border-b border-ink/5 flex items-center justify-between bg-bg sticky top-0 z-10">
              <div>
                <h2 className="text-xl lg:text-2xl font-black text-ink tracking-tighter uppercase">Remove Inventory Item</h2>
                <p className="text-[10px] text-ink/40 font-bold mt-1 uppercase tracking-widest">
                  Removing: <span className="text-danger-custom">{removingInventoryItem.name}</span>
                </p>
              </div>
              <button onClick={closeRemoveInventoryModal} className="p-3 hover:bg-white rounded-2xl text-ink/20 hover:text-ink transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleRemoveInventoryItem} className="p-6 lg:p-10 space-y-6 lg:space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-ink/40 ml-1">Reason for Removal</label>
                <input
                  required
                  type="text"
                  value={removeInventoryReason}
                  onChange={e => setRemoveInventoryReason(e.target.value)}
                  className="w-full bg-bg border border-border-custom rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:border-danger-custom transition-colors"
                  placeholder="Mistyped entry, Duplicate item..."
                />
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={closeRemoveInventoryModal} className="flex-1 bg-bg border border-border-custom text-ink/60 py-4 lg:py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-white transition-all">Cancel</button>
                <button type="submit" className="flex-1 bg-danger-custom text-white py-4 lg:py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-danger-custom/20 hover:bg-danger-custom/90 transition-all">
                  Remove Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Stock Adjustment Modal ── */}
      {isStockModalOpen && selectedStockItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-ink/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full sm:max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500 max-h-[95vh] overflow-y-auto">
            <div className="p-6 lg:p-10 border-b border-ink/5 flex items-center justify-between bg-bg sticky top-0 z-10">
              <div>
                <h2 className="text-xl lg:text-2xl font-black text-ink tracking-tighter uppercase">Adjust Stock</h2>
                <p className="text-[10px] text-ink/40 font-bold mt-1 uppercase tracking-widest">
                  Updating: <span className="text-accent">{selectedStockItem.name}</span>
                </p>
              </div>
              <button onClick={() => setIsStockModalOpen(false)} className="p-3 hover:bg-white rounded-2xl text-ink/20 hover:text-ink transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAdjustStock} className="p-6 lg:p-10 space-y-6 lg:space-y-8">
              <div className="bg-bg/50 p-5 rounded-2xl border border-ink/5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-ink/40 uppercase tracking-widest mb-1">Current Balance</p>
                  <p className="text-2xl font-black text-ink tracking-tighter">{selectedStockItem.quantity.toFixed(2)} {selectedStockItem.unit}</p>
                </div>
                <RefreshCw className="text-ink/10" size={28} />
              </div>

              <div className="grid grid-cols-2 gap-5 lg:gap-8">
                <div className="space-y-3 col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-ink/40 ml-1">Adjustment Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['add', 'reduce'] as const).map(t => (
                      <button key={t} type="button" onClick={() => setStockAdjustmentForm(p => ({ ...p, type: t }))}
                        className={cn("py-3.5 lg:py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all",
                          stockAdjustmentForm.type === t
                            ? t === 'add' ? "bg-success-custom/10 border-success-custom text-success-custom" : "bg-danger-custom/10 border-danger-custom text-danger-custom"
                            : "bg-bg border-border-custom text-ink/40"
                        )}>
                        {t === 'add' ? <><Plus className="inline-block mr-1" size={13} /> Add Stock</> : <><Minus className="inline-block mr-1" size={13} /> Remove</>}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-ink/40 ml-1">Qty ({selectedStockItem.unit})</label>
                  <input required type="number" step="0.01" min="0" value={stockAdjustmentForm.amount}
                    onChange={e => setStockAdjustmentForm(p => ({ ...p, amount: Number(e.target.value) }))}
                    className="w-full bg-bg border border-border-custom rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:border-accent transition-colors" />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-ink/40 ml-1">New Estimate</label>
                  <div className="w-full bg-bg/30 border border-dashed border-border-custom rounded-2xl py-4 px-6 text-sm font-black text-ink/40">
                    {(selectedStockItem.quantity + (stockAdjustmentForm.type === 'add' ? stockAdjustmentForm.amount : -stockAdjustmentForm.amount)).toFixed(2)} {selectedStockItem.unit}
                  </div>
                </div>

                <div className="space-y-3 col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-ink/40 ml-1">Reason / Note</label>
                  <input type="text" value={stockAdjustmentForm.reason}
                    onChange={e => setStockAdjustmentForm(p => ({ ...p, reason: e.target.value }))}
                    className="w-full bg-bg border border-border-custom rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:border-accent transition-colors"
                    placeholder="e.g. Delivery received, Spillage, etc." />
                </div>
              </div>

              <div className="flex gap-4">
                <button type="button" onClick={() => setIsStockModalOpen(false)} className="flex-1 bg-bg border border-border-custom text-ink/60 py-4 lg:py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-white transition-all">Cancel</button>
                <button type="submit" className={cn("flex-1 text-white py-4 lg:py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all",
                  stockAdjustmentForm.type === 'add' ? "bg-success-custom shadow-success-custom/20" : "bg-danger-custom shadow-danger-custom/20"
                )}>
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-5 py-3.5 lg:py-4 rounded-2xl text-[10px] font-black tracking-[0.2em] transition-all group",
        active
          ? "bg-accent text-[#FAF7F2] shadow-[0_10px_20px_rgba(234,88,12,0.2)]"
          : "text-[#E8E1D9]/60 hover:text-[#E8E1D9] hover:bg-white/5"
      )}
    >
      <span className={cn("transition-transform duration-300 group-hover:scale-110", active ? "text-[#FAF7F2]" : "text-[#E8E1D9]/40 group-hover:text-accent")}>
        {icon}
      </span>
      {label}
    </button>
  );
}
