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
  TrendingUp,
  TrendingDown,
  PhilippinePeso,
  History,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Download,
  Upload,
  LogOut,
  User,
  Lock,
  Filter,
  ChevronLeft,
  FileDown,
  ShieldCheck,
  Edit,
  X,
  Image as ImageIcon,
  Settings2,
  RefreshCw,
  Calendar
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
  isWithinInterval,
  parseISO
} from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Product, InventoryItem, Order, OrderItem, StockLog, AuditLog } from './types';
import { INITIAL_PRODUCTS, INITIAL_INVENTORY } from './constants';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type View = 'dashboard' | 'pos' | 'menu' | 'inventory' | 'reports' | 'logs' | 'audit';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('tapsi_logged_in') === 'true');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [view, setView] = useState<View>('dashboard');
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('tapsi_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });
  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('tapsi_inventory');
    return saved ? JSON.parse(saved) : INITIAL_INVENTORY;
  });
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('tapsi_orders');
    return saved ? JSON.parse(saved) : [];
  });
  const [stockLogs, setStockLogs] = useState<StockLog[]>(() => {
    const saved = localStorage.getItem('tapsi_stock_logs');
    return saved ? JSON.parse(saved) : [];
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('tapsi_audit_logs');
    return saved ? JSON.parse(saved) : [];
  });
  const [cart, setCart] = useState<OrderItem[]>([]);

  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const itemsPerPage = 8;

  // Modal States
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<Partial<Product>>({
    name: '',
    price: 0,
    category: 'Others',
    image: ''
  });

  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState<InventoryItem | null>(null);
  const [stockAdjustmentForm, setStockAdjustmentForm] = useState({
    amount: 0,
    type: 'add' as 'add' | 'reduce',
    reason: ''
  });

  // Persistence
  useEffect(() => {
    localStorage.setItem('tapsi_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('tapsi_logged_in', String(isLoggedIn));
  }, [isLoggedIn]);

  useEffect(() => {
    localStorage.setItem('tapsi_stock_logs', JSON.stringify(stockLogs));
  }, [stockLogs]);

  useEffect(() => {
    localStorage.setItem('tapsi_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  // Analytics Calculations
  const stats = useMemo(() => {
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

    const mostBought = sortedSales.slice(0, 5);
    const leastBought = sortedSales.slice(-5).reverse();

    const lowStockItems = inventory.filter(item => item.quantity <= item.minThreshold);

    return { totalSales, orderCount, mostBought, leastBought, lowStockItems, sortedSales };
  }, [orders, inventory]);

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter]);

  // POS Actions
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const addStockLog = (itemId: string, change: number, type: StockLog['type'], reason?: string) => {
    const newLog: StockLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      itemId,
      change,
      type,
      timestamp: Date.now(),
      reason
    };
    setStockLogs(prev => [newLog, ...prev]);
  };

  const addAuditLog = (action: string, details: string, type: AuditLog['type']) => {
    const newLog: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      action,
      details,
      user: loginForm.username || 'admin',
      timestamp: Date.now(),
      type
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.username === 'admin' && loginForm.password === 'admin') {
      setIsLoggedIn(true);
      addAuditLog('Login', 'User logged into the system', 'auth');
    } else {
      addAuditLog('Login Failed', `Attempted login with username: ${loginForm.username}`, 'auth');
      alert('Invalid credentials (try admin/admin)');
    }
  };

  const handleLogout = () => {
    addAuditLog('Logout', 'User logged out of the system', 'auth');
    setIsLoggedIn(false);
    localStorage.removeItem('tapsi_logged_in');
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    addAuditLog('Export CSV', `Exported ${filename} with ${data.length} records`, 'system');
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).join(',')).join('\n');
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importInventoryCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const newInventory: InventoryItem[] = lines.slice(1).filter(l => l.trim()).map(line => {
        const [id, name, quantity, unit, minThreshold] = line.split(',');
        return { id, name, quantity: Number(quantity), unit: unit as any, minThreshold: Number(minThreshold) };
      });
      setInventory(newInventory);
      addAuditLog('Import CSV', `Imported inventory with ${newInventory.length} items`, 'inventory');
      alert('Inventory imported successfully!');
    };
    reader.readAsText(file);
  };

  const addProduct = () => {
    setEditingProduct(null);
    setProductForm({ name: '', price: 0, category: 'Others', image: '' });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.price) return;

    if (editingProduct) {
      const updated: Product = { ...editingProduct, ...productForm as Product };
      setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
      addAuditLog('Update Menu Item', `Updated product: ${updated.name}`, 'menu');
    } else {
      const newProduct: Product = {
        id: `p-${Date.now()}`,
        ...productForm as Product,
        image: productForm.image || `https://picsum.photos/seed/${productForm.name}/400/400`
      };
      setProducts(prev => [...prev, newProduct]);
      addAuditLog('Add Menu Item', `Added new product: ${newProduct.name} (₱${newProduct.price})`, 'menu');
    }
    setIsProductModalOpen(false);
  };

  const deleteProduct = (id: string) => {
    const product = products.find(p => p.id === id);
    if (confirm(`Are you sure you want to delete ${product?.name}?`)) {
      setProducts(prev => prev.filter(p => p.id !== id));
      addAuditLog('Delete Menu Item', `Deleted product: ${product?.name}`, 'menu');
    }
  };

  // Filtered Data
  const applyDatePreset = (preset: 'today' | 'yesterday' | '7days' | '30days' | 'thisMonth' | 'clear') => {
    const now = new Date();
    let start = '';
    let end = '';

    switch (preset) {
      case 'today':
        start = format(startOfDay(now), 'yyyy-MM-dd');
        end = format(endOfDay(now), 'yyyy-MM-dd');
        break;
      case 'yesterday':
        const yesterday = subDays(now, 1);
        start = format(startOfDay(yesterday), 'yyyy-MM-dd');
        end = format(endOfDay(yesterday), 'yyyy-MM-dd');
        break;
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
        start = '';
        end = '';
        break;
    }
    setDateFilter({ start, end });
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (!dateFilter.start && !dateFilter.end) return true;
      const orderDate = new Date(order.timestamp);
      const start = dateFilter.start ? startOfDay(parseISO(dateFilter.start)) : null;
      const end = dateFilter.end ? endOfDay(parseISO(dateFilter.end)) : null;

      if (start && end) return isWithinInterval(orderDate, { start, end });
      if (start) return orderDate >= start;
      if (end) return orderDate <= end;
      return true;
    });
  }, [orders, dateFilter]);

  const filteredStats = useMemo(() => {
    const totalSales = filteredOrders.reduce((acc, o) => acc + o.total, 0);
    const orderCount = filteredOrders.length;

    const productSales: Record<string, number> = {};
    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
      });
    });

    const sortedSales = Object.entries(productSales)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty);

    return { totalSales, orderCount, sortedSales };
  }, [filteredOrders]);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (!isLoggedIn) {
    return (
      <div className="h-screen bg-bg flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-[2rem] border border-border-custom shadow-2xl p-10">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-black text-ink tracking-tighter">
              MAI<span className="text-accent">EATERY</span>
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

  const checkout = () => {
    if (cart.length === 0) return;

    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      items: [...cart],
      total,
      timestamp: Date.now()
    };

    setOrders(prev => [newOrder, ...prev]);
    addAuditLog('Order Placed', `Order ${newOrder.id} placed for ₱${total}`, 'order');

    // Deduct from inventory and log
    setInventory(prev => prev.map(item => {
      const soldItem = cart.find(c => c.name.includes(item.name.split(' ')[0]));
      if (soldItem) {
        addStockLog(item.id, -soldItem.quantity, 'sale', `Sold in order ${newOrder.id}`);
        return { ...item, quantity: Math.max(0, item.quantity - soldItem.quantity) };
      }
      if (item.name === 'Rice') {
        const mealCount = cart.reduce((a, b) => a + b.quantity, 0);
        const deduction = mealCount * 0.01;
        addStockLog(item.id, -deduction, 'sale', `Rice used for ${mealCount} meals`);
        return { ...item, quantity: Math.max(0, item.quantity - deduction) };
      }
      if (item.name === 'Eggs') {
        const eggCount = cart.filter(c => c.name.includes('silog') || c.name === 'Extra Egg').reduce((a, b) => a + b.quantity, 0);
        if (eggCount > 0) {
          addStockLog(item.id, -eggCount, 'sale', `Eggs used for ${eggCount} items`);
          return { ...item, quantity: Math.max(0, item.quantity - eggCount) };
        }
      }
      return item;
    }));

    setCart([]);
    alert('Order processed successfully!');
  };

  const updateStock = (id: string, amount: number, reason?: string) => {
    setInventory(prev => prev.map(item => {
      if (item.id === id) {
        const type = amount > 0 ? 'addition' : 'reduction';
        addStockLog(id, amount, type, reason || (amount > 0 ? 'Manual Restock' : 'Manual Reduction'));
        addAuditLog('Stock Adjustment', `${amount > 0 ? 'Added' : 'Reduced'} ${Math.abs(amount)} ${item.unit} of ${item.name}. Reason: ${reason || 'Manual'}`, 'inventory');
        return { ...item, quantity: Math.max(0, item.quantity + amount) };
      }
      return item;
    }));
  };

  const handleAdjustStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockItem || stockAdjustmentForm.amount <= 0) return;

    const amount = stockAdjustmentForm.type === 'add' ? stockAdjustmentForm.amount : -stockAdjustmentForm.amount;
    updateStock(selectedStockItem.id, amount, stockAdjustmentForm.reason);

    setIsStockModalOpen(false);
    setSelectedStockItem(null);
    setStockAdjustmentForm({ amount: 0, type: 'add', reason: '' });
  };

  return (
    <div className="flex h-screen bg-bg text-ink font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar flex flex-col z-20 shadow-2xl">
        <div className="p-8 border-b border-white/5">
          <h1 className="text-2xl font-black text-[#E8E1D9] flex items-center gap-2 tracking-tighter">
            MAI<span className="text-accent">EATERY</span>
          </h1>
          <p className="text-[10px] text-[#E8E1D9]/60 mt-1 uppercase tracking-[0.3em] font-black">Inventory System</p>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2">
          <NavItem
            active={view === 'dashboard'}
            onClick={() => setView('dashboard')}
            icon={<LayoutDashboard size={18} />}
            label="DASHBOARD"
          />
          <NavItem
            active={view === 'pos'}
            onClick={() => setView('pos')}
            icon={<ShoppingCart size={18} />}
            label="ORDERING"
          />
          <NavItem
            active={view === 'menu'}
            onClick={() => setView('menu')}
            icon={<Edit size={18} />}
            label="MENU"
          />
          <NavItem
            active={view === 'inventory'}
            onClick={() => setView('inventory')}
            icon={<Package size={18} />}
            label="INVENTORY"
          />
          <NavItem
            active={view === 'logs'}
            onClick={() => setView('logs')}
            icon={<History size={18} />}
            label="STOCK LOGS"
          />
          <NavItem
            active={view === 'audit'}
            onClick={() => setView('audit')}
            icon={<ShieldCheck size={18} />}
            label="AUDIT LOGS"
          />
          <NavItem
            active={view === 'reports'}
            onClick={() => setView('reports')}
            icon={<BarChart3 size={18} />}
            label="REPORTS"
          />
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[10px] font-black tracking-[0.2em] text-danger-custom hover:bg-danger-custom/10 transition-all mt-10"
          >
            <LogOut size={18} />
            LOGOUT
          </button>
        </nav>

        <div className="p-6">
          <div className="bg-white/5 p-5 rounded-2xl border border-white/10 backdrop-blur-sm">
            <p className="text-[9px] font-black text-accent uppercase mb-3 tracking-[0.2em]">System Status</p>
            <div className="flex items-center gap-3 text-[11px] font-bold text-[#E8E1D9]">
              <div className="w-2 h-2 rounded-full bg-success-custom animate-pulse shadow-[0_0_10px_rgba(22,163,74,0.5)]" />
              OPERATIONAL
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-[80px] bg-white/50 backdrop-blur-md border-b border-ink/5 px-10 flex items-center justify-between shrink-0">
          <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-ink/30">{view}</h2>
          <div className="flex items-center gap-8">
            {stats.lowStockItems.length > 0 && (
              <div className="flex items-center gap-2 bg-danger-custom/10 text-danger-custom px-4 py-2 rounded-full text-[10px] font-black uppercase border border-danger-custom/10">
                <AlertTriangle size={14} />
                {stats.lowStockItems.length} CRITICAL ITEMS
              </div>
            )}
            <div className="text-[11px] font-black text-ink/20 uppercase tracking-widest">
              {format(new Date(), 'EEEE, MMM do')}
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-hidden">
          {view === 'dashboard' && (
            <div className="grid grid-cols-4 grid-rows-2 gap-5 h-full">
              {/* Top Performing Items (Bento: col-span-2, row-span-1) */}
              <div className="col-span-2 row-span-1 bg-white border border-border-custom rounded-3xl p-8 shadow-xl shadow-ink/5 flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-[11px] font-black text-ink/60 uppercase tracking-[0.3em]">Top Performing Items</h3>
                  <span className="px-3 py-1 bg-accent-soft text-accent text-[10px] font-black uppercase rounded-full">Live Stats</span>
                </div>
                <div className="grid grid-cols-2 gap-10 flex-1">
                  <div>
                    <p className="text-[10px] font-black text-ink/50 uppercase mb-4 tracking-widest">Most Bought</p>
                    <div className="space-y-1">
                      {stats.mostBought.slice(0, 3).map((item, i) => (
                        <div key={item.name} className="flex items-center py-3 border-b border-ink/5 last:border-0">
                          <span className="w-8 font-black text-accent text-sm">{i + 1}</span>
                          <span className="flex-1 text-sm font-bold truncate text-ink">{item.name}</span>
                          <span className="font-black text-sm tabular-nums text-ink/60">{item.qty}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-ink/50 uppercase mb-4 tracking-widest">Least Bought</p>
                    <div className="space-y-1">
                      {stats.leastBought.slice(0, 3).map((item, i) => (
                        <div key={item.name} className="flex items-center py-3 border-b border-ink/5 last:border-0">
                          <span className="w-8 font-black text-ink/40 text-sm">{stats.sortedSales.length - i}</span>
                          <span className="flex-1 text-sm font-bold truncate text-ink/60">{item.name}</span>
                          <span className="font-black text-sm tabular-nums text-ink/40">{item.qty}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Ordering POS (Bento: col-span-2, row-span-2) */}
              <div className="col-span-2 row-span-2 bg-white border border-border-custom rounded-3xl p-8 shadow-xl shadow-ink/5 flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-[11px] font-black text-ink/60 uppercase tracking-[0.3em]">Quick Order</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" size={14} />
                    <input
                      type="text"
                      placeholder="Search menu..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="bg-bg border border-border-custom rounded-full py-2 pl-9 pr-4 text-[10px] font-bold focus:outline-none focus:border-accent w-48"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-8 overflow-auto pr-2">
                  {filteredProducts.slice(0, 8).map(product => {
                    const cartItem = cart.find(c => c.productId === product.id);
                    return (
                      <div
                        key={product.id}
                        className="border border-ink/10 p-3 rounded-2xl bg-bg hover:border-accent/30 transition-all flex items-center gap-4 group relative"
                      >
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-ink/5 shrink-0">
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <strong className="block text-[11px] font-black text-ink truncate uppercase tracking-tight">{product.name}</strong>
                          <small className="text-[10px] font-black text-accent">₱{product.price.toFixed(2)}</small>
                        </div>
                        <div className="flex items-center gap-2">
                          {cartItem && (
                            <span className="bg-accent text-white text-[9px] font-black px-2 py-1 rounded-md animate-in zoom-in">
                              {cartItem.quantity}
                            </span>
                          )}
                          <button
                            onClick={() => addToCart(product)}
                            className="p-2 bg-white border border-ink/10 rounded-xl hover:bg-accent hover:text-white transition-all shadow-sm"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-auto pt-8 border-t border-dashed border-ink/10">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-black text-ink/60 uppercase tracking-widest">Subtotal</span>
                    <strong className="text-2xl font-black text-accent tracking-tighter">₱{cart.reduce((acc, item) => acc + (item.price * item.quantity), 0).toLocaleString()}</strong>
                  </div>
                  <button
                    onClick={() => setView('pos')}
                    className="w-full bg-ink text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-accent transition-all shadow-xl shadow-ink/10"
                  >
                    Open Full POS
                  </button>
                </div>
              </div>

              {/* Inventory Pulse (Bento: col-span-1, row-span-1) */}
              <div className="col-span-1 row-span-1 bg-white border border-border-custom rounded-3xl p-8 shadow-xl shadow-ink/5 flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-[11px] font-black text-ink/60 uppercase tracking-[0.3em]">Stock Pulse</h3>
                </div>
                <div className="space-y-6 flex-1 overflow-auto">
                  {inventory.slice(0, 3).map(item => (
                    <div key={item.id}>
                      <div className="flex justify-between text-[11px] font-black mb-3 uppercase tracking-widest">
                        <span className="truncate pr-2 text-ink/80">{item.name}</span>
                        <span className={cn(item.quantity <= item.minThreshold ? "text-danger-custom" : "text-ink")}>
                          {item.quantity.toFixed(0)}{item.unit}
                        </span>
                      </div>
                      <div className="h-2 bg-bg rounded-full overflow-hidden border border-ink/5">
                        <div
                          className={cn(
                            "h-full transition-all duration-700 ease-out",
                            item.quantity <= item.minThreshold ? "bg-danger-custom" : "bg-accent"
                          )}
                          style={{ width: `${Math.min(100, (item.quantity / (item.minThreshold * 3)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions (Bento: col-span-1, row-span-1) */}
              <div className="col-span-1 row-span-1 bg-white border border-border-custom rounded-3xl p-8 shadow-xl shadow-ink/5 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[11px] font-black text-ink/60 uppercase tracking-[0.3em]">Quick Actions</h3>
                </div>
                <div className="flex-1 flex flex-col gap-3">
                  <button
                    onClick={addProduct}
                    className="w-full bg-accent text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={16} /> Add Menu Item
                  </button>
                  <label className="w-full bg-white border border-border-custom text-ink/80 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-bg transition-all flex items-center justify-center gap-2 cursor-pointer">
                    <Upload size={16} /> Import CSV
                    <input type="file" accept=".csv" onChange={importInventoryCSV} className="hidden" />
                  </label>
                  <button
                    onClick={() => exportToCSV(inventory, 'inventory_report')}
                    className="w-full bg-white border border-border-custom text-ink/80 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-bg transition-all flex items-center justify-center gap-2"
                  >
                    <Download size={16} /> Export CSV
                  </button>
                </div>
              </div>
            </div>
          )}

          {view === 'pos' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full overflow-hidden">
              {/* Menu Grid */}
              <div className="lg:col-span-2 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/40" size={18} />
                    <input
                      type="text"
                      placeholder="Search for food, drinks, sides..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-white border border-border-custom rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-accent shadow-sm"
                    />
                  </div>
                  <div className="flex gap-2 ml-4">
                    {['All', 'Meals', 'Drinks', 'Sides'].map(cat => (
                      <button key={cat} className="px-4 py-2 bg-white border border-border-custom rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-accent hover:text-white transition-all text-ink/60">
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 overflow-auto pb-8 pr-2">
                  {filteredProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="bg-white p-6 rounded-[2rem] border border-border-custom shadow-xl shadow-ink/5 text-left hover:border-accent hover:-translate-y-1 transition-all group"
                    >
                      <div className="w-full aspect-square bg-bg rounded-2xl mb-5 flex items-center justify-center text-ink/10 group-hover:text-accent/10 transition-colors overflow-hidden">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Package size={48} />
                        )}
                      </div>
                      <h4 className="font-black text-sm uppercase tracking-tight text-ink">{product.name}</h4>
                      <p className="text-accent font-black text-xl mt-1 tracking-tighter">₱{product.price}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cart */}
              <div className="bg-white rounded-2xl border border-border-custom shadow-sm flex flex-col h-full overflow-hidden">
                <div className="p-6 border-b border-border-custom">
                  <h3 className="font-bold flex items-center gap-2 uppercase tracking-widest text-sm text-gray-400">
                    <ShoppingCart size={18} /> Current Order
                  </h3>
                </div>
                <div className="flex-1 overflow-auto p-6 space-y-4">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-200 space-y-2">
                      <ShoppingCart size={48} strokeWidth={1.5} />
                      <p className="text-[10px] font-bold uppercase tracking-widest">Your cart is empty</p>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.productId} className="flex items-center justify-between group">
                        <div className="flex-1">
                          <h5 className="text-sm font-bold uppercase tracking-tight text-gray-600">{item.name}</h5>
                          <p className="text-[10px] font-semibold text-gray-300">₱{item.price} each</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center bg-bg border border-gray-100 rounded-lg p-1">
                            <button
                              onClick={() => updateCartQty(item.productId, -1)}
                              className="p-1 hover:bg-white rounded transition-colors text-gray-400"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="w-8 text-center text-xs font-bold text-gray-600">{item.quantity}</span>
                            <button
                              onClick={() => updateCartQty(item.productId, 1)}
                              className="p-1 hover:bg-white rounded transition-colors text-gray-400"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.productId)}
                            className="text-gray-200 hover:text-danger-custom transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-6 border-t border-border-custom bg-bg rounded-b-2xl">
                  <div className="flex justify-between mb-4">
                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Total Amount</span>
                    <span className="text-2xl font-bold text-accent tracking-tight">
                      ₱{cart.reduce((acc, item) => acc + (item.price * item.quantity), 0).toLocaleString()}
                    </span>
                  </div>
                  <button
                    disabled={cart.length === 0}
                    onClick={checkout}
                    className="w-full bg-ink text-white py-4 rounded-xl font-bold text-xs uppercase tracking-[0.2em] hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    Process Order
                  </button>
                </div>
              </div>
            </div>
          )}

          {view === 'menu' && (
            <div className="bg-white rounded-3xl border border-ink/5 shadow-xl shadow-ink/5 overflow-hidden flex flex-col h-full">
              <div className="p-8 border-b border-ink/5 flex items-center justify-between shrink-0">
                <h3 className="font-black uppercase tracking-[0.2em] text-xs text-ink/40">Menu Management</h3>
                <button
                  onClick={addProduct}
                  className="px-4 py-2 bg-accent text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-accent/90 transition-all flex items-center gap-2"
                >
                  <Plus size={14} /> New Menu Item
                </button>
              </div>
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-bg text-[10px] font-black text-ink/30 uppercase tracking-[0.2em] border-b border-ink/5">
                      <th className="px-8 py-5">Item</th>
                      <th className="px-8 py-5">Category</th>
                      <th className="px-8 py-5">Price</th>
                      <th className="px-8 py-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/5">
                    {products.map(product => (
                      <tr key={product.id} className="hover:bg-bg/50 transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-bg border border-ink/5 shrink-0">
                              <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                            <span className="font-bold text-sm uppercase tracking-tight text-ink/80">{product.name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="px-3 py-1 bg-bg border border-ink/10 text-[9px] font-black uppercase rounded-full tracking-wider text-ink/40">
                            {product.category}
                          </span>
                        </td>
                        <td className="px-8 py-5 font-black text-lg text-accent tracking-tighter">₱{product.price.toFixed(2)}</td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingProduct(product);
                                setProductForm(product);
                                setIsProductModalOpen(true);
                              }}
                              className="p-2 text-ink/40 hover:text-accent transition-colors"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => deleteProduct(product.id)}
                              className="p-2 text-ink/40 hover:text-danger-custom transition-colors"
                            >
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

          {view === 'inventory' && (
            <div className="bg-white rounded-3xl border border-ink/5 shadow-xl shadow-ink/5 overflow-hidden flex flex-col h-full">
              <div className="p-8 border-b border-ink/5 flex items-center justify-between shrink-0">
                <h3 className="font-black uppercase tracking-[0.2em] text-xs text-ink/40">Stock Monitoring</h3>
              </div>
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-bg text-[10px] font-black text-ink/30 uppercase tracking-[0.2em] border-b border-ink/5">
                      <th className="px-8 py-5">Item Name</th>
                      <th className="px-8 py-5">Current Stock</th>
                      <th className="px-8 py-5">Unit</th>
                      <th className="px-8 py-5">Status</th>
                      <th className="px-8 py-5">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/5">
                    {inventory.map(item => (
                      <tr key={item.id} className="hover:bg-bg/50 transition-colors">
                        <td className="px-8 py-5 font-bold text-sm uppercase tracking-tight text-ink/80">{item.name}</td>
                        <td className="px-8 py-5">
                          <span className={cn(
                            "font-black text-xl tracking-tighter",
                            item.quantity <= item.minThreshold ? "text-danger-custom" : "text-ink"
                          )}>
                            {item.quantity.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-[10px] font-black text-ink/30 uppercase tracking-widest">{item.unit}</td>
                        <td className="px-8 py-5">
                          {item.quantity <= item.minThreshold ? (
                            <span className="px-3 py-1 bg-danger-custom/10 text-danger-custom text-[9px] font-black uppercase rounded-full tracking-wider">Critical</span>
                          ) : (
                            <span className="px-3 py-1 bg-success-custom/10 text-success-custom text-[9px] font-black uppercase rounded-full tracking-wider">Healthy</span>
                          )}
                        </td>
                        <td className="px-8 py-5">
                          <button
                            onClick={() => {
                              setSelectedStockItem(item);
                              setIsStockModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-bg border border-ink/5 rounded-xl hover:border-accent/30 hover:text-accent transition-all shadow-sm text-[10px] font-black uppercase tracking-widest"
                          >
                            <Settings2 size={14} /> Adjust Stock
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'logs' && (
            <div className="bg-white rounded-3xl border border-ink/5 shadow-xl shadow-ink/5 overflow-hidden h-full flex flex-col">
              <div className="p-8 border-b border-ink/5 flex items-center justify-between shrink-0">
                <h3 className="font-black uppercase tracking-[0.2em] text-xs text-ink/40">Inventory Movement Logs</h3>
              </div>
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-bg text-[10px] font-black text-ink/30 uppercase tracking-[0.2em] border-b border-ink/5">
                      <th className="px-8 py-5">Timestamp</th>
                      <th className="px-8 py-5">Item</th>
                      <th className="px-8 py-5">Change</th>
                      <th className="px-8 py-5">Type</th>
                      <th className="px-8 py-5">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/5">
                    {stockLogs.map(log => {
                      const item = inventory.find(i => i.id === log.itemId);
                      return (
                        <tr key={log.id} className="hover:bg-bg/50 transition-colors">
                          <td className="px-8 py-5 text-[11px] font-bold text-ink/40">
                            {format(log.timestamp, 'MMM d, HH:mm:ss')}
                          </td>
                          <td className="px-8 py-5 font-bold text-sm text-ink/80">{item?.name || 'Unknown Item'}</td>
                          <td className="px-8 py-5">
                            <div className={cn(
                              "flex items-center gap-1 font-black text-sm",
                              log.change > 0 ? "text-success-custom" : "text-danger-custom"
                            )}>
                              {log.change > 0 ? <Plus size={12} /> : <Minus size={12} />}
                              {Math.abs(log.change).toFixed(2)} {item?.unit}
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className={cn(
                              "px-2 py-1 text-[9px] font-black uppercase rounded-md tracking-wider",
                              log.type === 'addition' ? "bg-success-custom/10 text-success-custom" :
                                log.type === 'sale' ? "bg-accent/10 text-accent" : "bg-danger-custom/10 text-danger-custom"
                            )}>
                              {log.type}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-xs font-medium text-ink/50 italic">
                            {log.reason || '-'}
                          </td>
                        </tr>
                      );
                    })}
                    {stockLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-8 py-20 text-center text-ink/20 font-black uppercase tracking-[0.3em] text-[10px]">
                          No stock movements recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'reports' && (
            <div className="space-y-8 h-full overflow-auto pr-2 pb-10">
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-ink tracking-tight uppercase">Performance Analytics</h3>
                  <button
                    onClick={() => exportToCSV(filteredOrders, 'sales_report')}
                    className="flex items-center gap-2 bg-ink text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-accent transition-all shadow-lg shadow-ink/10"
                  >
                    <FileDown size={16} /> Export {filteredOrders.length} Transactions
                  </button>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-ink/5 shadow-xl shadow-ink/5 space-y-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[10px] font-black text-ink/30 uppercase tracking-[0.2em] mr-2">Quick Presets:</p>
                    {[
                      { id: 'today', label: 'Today' },
                      { id: 'yesterday', label: 'Yesterday' },
                      { id: '7days', label: 'Last 7 Days' },
                      { id: '30days', label: 'Last 30 Days' },
                      { id: 'thisMonth', label: 'This Month' },
                      { id: 'clear', label: 'Reset' }
                    ].map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => applyDatePreset(preset.id as any)}
                        className="px-4 py-2 bg-bg border border-ink/5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:border-accent hover:text-accent transition-all text-ink/60"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 pt-4 border-t border-ink/5">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" size={14} />
                        <input
                          type="date"
                          value={dateFilter.start}
                          onChange={e => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                          className="bg-bg border border-border-custom rounded-xl py-2 pl-9 pr-4 text-[10px] font-black uppercase focus:outline-none focus:border-accent text-ink/80 min-w-[160px]"
                        />
                      </div>
                      <span className="text-ink/20 font-black text-xs">TO</span>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" size={14} />
                        <input
                          type="date"
                          value={dateFilter.end}
                          onChange={e => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                          className="bg-bg border border-border-custom rounded-xl py-2 pl-9 pr-4 text-[10px] font-black uppercase focus:outline-none focus:border-accent text-ink/80 min-w-[160px]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white p-10 rounded-[2rem] border border-ink/5 shadow-2xl shadow-ink/5">
                  <h4 className="text-[10px] font-black text-ink/50 uppercase tracking-[0.2em] mb-4">Total Revenue</h4>
                  <p className="text-5xl font-black text-accent tracking-tighter">₱{filteredStats.totalSales.toLocaleString()}</p>
                </div>
                <div className="bg-white p-10 rounded-[2rem] border border-ink/5 shadow-2xl shadow-ink/5">
                  <h4 className="text-[10px] font-black text-ink/50 uppercase tracking-[0.2em] mb-4">Avg Order Value</h4>
                  <p className="text-5xl font-black text-ink tracking-tighter">
                    ₱{filteredStats.orderCount > 0 ? (filteredStats.totalSales / filteredStats.orderCount).toFixed(2) : '0'}
                  </p>
                </div>
                <div className="bg-white p-10 rounded-[2rem] border border-ink/5 shadow-2xl shadow-ink/5">
                  <h4 className="text-[10px] font-black text-ink/50 uppercase tracking-[0.2em] mb-4">Total Orders</h4>
                  <p className="text-5xl font-black text-ink/60 tracking-tighter">{filteredStats.orderCount}</p>
                </div>
              </div>

              <div className="bg-white p-10 rounded-[2rem] border border-ink/5 shadow-2xl shadow-ink/5">
                <h3 className="font-black uppercase tracking-[0.3em] text-xs text-ink/60 mb-10">Sales Performance</h3>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredStats.sortedSales}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#1C1917', fontSize: 10, fontWeight: 800, opacity: 0.8 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#1C1917', fontSize: 10, fontWeight: 800, opacity: 0.8 }}
                      />
                      <Tooltip
                        cursor={{ fill: '#FFF7ED' }}
                        contentStyle={{
                          borderRadius: '24px',
                          border: 'none',
                          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                          fontSize: '11px',
                          fontWeight: '900',
                          textTransform: 'uppercase',
                          padding: '16px'
                        }}
                      />
                      <Bar dataKey="qty" fill="#EA580C" radius={[8, 8, 0, 0]} barSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-[2rem] border border-ink/5 shadow-2xl shadow-ink/5 overflow-hidden flex flex-col">
                <div className="p-10 border-b border-ink/5 flex items-center justify-between">
                  <h3 className="font-black uppercase tracking-[0.3em] text-xs text-ink/60">Recent Transactions</h3>
                  <div className="flex items-center gap-4">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => prev - 1)}
                      className="p-2 bg-bg rounded-lg disabled:opacity-30 text-ink/60"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-[10px] font-black text-ink/60 uppercase tracking-widest">Page {currentPage}</span>
                    <button
                      disabled={currentPage * itemsPerPage >= filteredOrders.length}
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      className="p-2 bg-bg rounded-lg disabled:opacity-30 text-ink/60"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
                <div className="overflow-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-bg text-[10px] font-black text-ink/60 uppercase tracking-[0.3em] border-b border-ink/5">
                        <th className="px-10 py-6">Order ID</th>
                        <th className="px-10 py-6">Time</th>
                        <th className="px-10 py-6">Items</th>
                        <th className="px-10 py-6 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/5">
                      {paginatedOrders.map(order => (
                        <tr key={order.id} className="hover:bg-bg/50 transition-colors">
                          <td className="px-10 py-6 font-mono text-[10px] text-ink/50 uppercase">{order.id}</td>
                          <td className="px-10 py-6 text-[11px] font-black text-ink/80">
                            {format(order.timestamp, 'MMM d, HH:mm')}
                          </td>
                          <td className="px-10 py-6">
                            <div className="flex flex-wrap gap-2">
                              {order.items.map((item, i) => (
                                <span key={i} className="px-3 py-1 bg-bg border border-ink/10 text-[9px] font-black uppercase rounded-full tracking-wider text-ink/70">
                                  {item.quantity}x {item.name}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-10 py-6 text-right font-black text-accent text-lg tracking-tighter">
                            ₱{order.total.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {paginatedOrders.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-10 py-24 text-center text-ink/40 italic font-black uppercase tracking-[0.4em] text-[10px]">
                            No transactions found for these filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {view === 'audit' && (
            <div className="bg-white rounded-[2rem] border border-ink/5 shadow-2xl shadow-ink/5 overflow-hidden flex flex-col h-full">
              <div className="p-10 border-b border-ink/5 flex items-center justify-between">
                <div>
                  <h3 className="font-black uppercase tracking-[0.3em] text-xs text-ink/60">System Audit Logs</h3>
                  <p className="text-[10px] text-ink/40 font-bold mt-1 uppercase tracking-widest">Tracking all employee actions and system events</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => exportToCSV(auditLogs, 'audit_logs')}
                    className="px-6 py-3 bg-ink text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-accent transition-all shadow-lg shadow-ink/10"
                  >
                    Export Logs
                  </button>
                </div>
              </div>
              <div className="overflow-auto flex-1">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-bg text-[10px] font-black text-ink/60 uppercase tracking-[0.3em] border-b border-ink/5 sticky top-0 z-10">
                      <th className="px-10 py-6">Timestamp</th>
                      <th className="px-10 py-6">User</th>
                      <th className="px-10 py-6">Action</th>
                      <th className="px-10 py-6">Type</th>
                      <th className="px-10 py-6">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/5">
                    {auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-bg/50 transition-colors">
                        <td className="px-10 py-6 text-[11px] font-black text-ink/40 whitespace-nowrap">
                          {format(log.timestamp, 'MMM d, HH:mm:ss')}
                        </td>
                        <td className="px-10 py-6">
                          <span className="px-3 py-1 bg-bg border border-ink/10 text-[9px] font-black uppercase rounded-full tracking-wider text-ink/80">
                            {log.user}
                          </span>
                        </td>
                        <td className="px-10 py-6 text-[11px] font-black text-ink uppercase tracking-tight">
                          {log.action}
                        </td>
                        <td className="px-10 py-6">
                          <span className={cn(
                            "px-3 py-1 text-[9px] font-black uppercase rounded-full tracking-wider",
                            log.type === 'auth' ? "bg-blue-50 text-blue-600" :
                              log.type === 'inventory' ? "bg-orange-50 text-orange-600" :
                                log.type === 'order' ? "bg-green-50 text-green-600" :
                                  log.type === 'menu' ? "bg-purple-50 text-purple-600" :
                                    "bg-gray-50 text-gray-600"
                          )}>
                            {log.type}
                          </span>
                        </td>
                        <td className="px-10 py-6 text-[11px] font-bold text-ink/60">
                          {log.details}
                        </td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-10 py-24 text-center text-ink/40 italic font-black uppercase tracking-[0.4em] text-[10px]">
                          No audit logs recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-ink/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
            <div className="p-10 border-b border-ink/5 flex items-center justify-between bg-bg">
              <div>
                <h2 className="text-2xl font-black text-ink tracking-tighter uppercase">
                  {editingProduct ? 'Edit Menu Item' : 'New Menu Item'}
                </h2>
                <p className="text-[10px] text-ink/40 font-bold mt-1 uppercase tracking-widest">Configure your stall offerings</p>
              </div>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-3 hover:bg-white rounded-2xl text-ink/20 hover:text-ink transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSaveProduct} className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3 col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-ink/40 ml-1">Product Name</label>
                  <input
                    required
                    type="text"
                    value={productForm.name}
                    onChange={e => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-bg border border-border-custom rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:border-accent transition-colors"
                    placeholder="e.g. Special Tapsilog"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-ink/40 ml-1">Price (₱)</label>
                  <input
                    required
                    type="number"
                    value={productForm.price}
                    onChange={e => setProductForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                    className="w-full bg-bg border border-border-custom rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:border-accent transition-colors"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-ink/40 ml-1">Category</label>
                  <select
                    value={productForm.category}
                    onChange={e => setProductForm(prev => ({ ...prev, category: e.target.value as any }))}
                    className="w-full bg-bg border border-border-custom rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:border-accent transition-colors appearance-none"
                  >
                    <option value="Meals">Meals</option>
                    <option value="Drinks">Drinks</option>
                    <option value="Sides">Sides</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
                <div className="space-y-3 col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-ink/40 ml-1">Image URL</label>
                  <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-bg border border-border-custom flex items-center justify-center shrink-0 overflow-hidden">
                      {productForm.image ? (
                        <img src={productForm.image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <ImageIcon className="text-ink/10" size={24} />
                      )}
                    </div>
                    <input
                      type="text"
                      value={productForm.image}
                      onChange={e => setProductForm(prev => ({ ...prev, image: e.target.value }))}
                      className="flex-1 bg-bg border border-border-custom rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:border-accent transition-colors"
                      placeholder="https://images.unsplash.com/..."
                    />
                  </div>
                </div>
              </div>
              <div className="pt-6 flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="flex-1 bg-bg border border-border-custom text-ink/60 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-accent text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-accent/90 transition-all shadow-xl shadow-accent/20"
                >
                  {editingProduct ? 'Update Item' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {isStockModalOpen && selectedStockItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-ink/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
            <div className="p-10 border-b border-ink/5 flex items-center justify-between bg-bg">
              <div>
                <h2 className="text-2xl font-black text-ink tracking-tighter uppercase">
                  Adjust Stock
                </h2>
                <p className="text-[10px] text-ink/40 font-bold mt-1 uppercase tracking-widest">
                  Updating: <span className="text-accent">{selectedStockItem.name}</span>
                </p>
              </div>
              <button
                onClick={() => setIsStockModalOpen(false)}
                className="p-3 hover:bg-white rounded-2xl text-ink/20 hover:text-ink transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAdjustStock} className="p-10 space-y-8">
              <div className="bg-bg/50 p-6 rounded-2xl border border-ink/5 flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-black text-ink/40 uppercase tracking-widest mb-1">Current Balance</p>
                  <p className="text-2xl font-black text-ink tracking-tighter">{selectedStockItem.quantity.toFixed(2)} {selectedStockItem.unit}</p>
                </div>
                <RefreshCw className="text-ink/10" size={32} />
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3 col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-ink/40 ml-1">Adjustment Type</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setStockAdjustmentForm(prev => ({ ...prev, type: 'add' }))}
                      className={cn(
                        "py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all",
                        stockAdjustmentForm.type === 'add'
                          ? "bg-success-custom/10 border-success-custom text-success-custom"
                          : "bg-bg border-border-custom text-ink/40"
                      )}
                    >
                      <Plus className="inline-block mr-2" size={14} /> Add Stock
                    </button>
                    <button
                      type="button"
                      onClick={() => setStockAdjustmentForm(prev => ({ ...prev, type: 'reduce' }))}
                      className={cn(
                        "py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all",
                        stockAdjustmentForm.type === 'reduce'
                          ? "bg-danger-custom/10 border-danger-custom text-danger-custom"
                          : "bg-bg border-border-custom text-ink/40"
                      )}
                    >
                      <Minus className="inline-block mr-2" size={14} /> Remove Stock
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-ink/40 ml-1">Quantity ({selectedStockItem.unit})</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={stockAdjustmentForm.amount}
                    onChange={e => setStockAdjustmentForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                    className="w-full bg-bg border border-border-custom rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:border-accent transition-colors"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-ink/40 ml-1">New Estimate</label>
                  <div className="w-full bg-bg/30 border border-dashed border-border-custom rounded-2xl py-4 px-6 text-sm font-black text-ink/40">
                    {(selectedStockItem.quantity + (stockAdjustmentForm.type === 'add' ? stockAdjustmentForm.amount : -stockAdjustmentForm.amount)).toFixed(2)} {selectedStockItem.unit}
                  </div>
                </div>

                <div className="space-y-3 col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-ink/40 ml-1">Reason / Note</label>
                  <input
                    type="text"
                    value={stockAdjustmentForm.reason}
                    onChange={e => setStockAdjustmentForm(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full bg-bg border border-border-custom rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:border-accent transition-colors"
                    placeholder="e.g. Delivery received, Spillage, etc."
                  />
                </div>
              </div>

              <div className="pt-6 flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsStockModalOpen(false)}
                  className="flex-1 bg-bg border border-border-custom text-ink/60 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={cn(
                    "flex-1 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all",
                    stockAdjustmentForm.type === 'add' ? "bg-success-custom shadow-success-custom/20" : "bg-danger-custom shadow-danger-custom/20"
                  )}
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[10px] font-black tracking-[0.2em] transition-all group",
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
