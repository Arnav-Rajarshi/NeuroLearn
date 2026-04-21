import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Shield, 
  Users, 
  Crown, 
  CreditCard, 
  TrendingUp, 
  Calendar,
  LogOut,
  RefreshCw,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { 
  getAdminDashboard, 
  getAllUsers, 
  getAllPayments,
  toggleUserPremium 
} from '../utils/api.js'

function AdminDashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [refreshing, setRefreshing] = useState(false)

  const loadData = async () => {
    try {
      const [dashboardData, usersData, paymentsData] = await Promise.all([
        getAdminDashboard(),
        getAllUsers(),
        getAllPayments()
      ])
      setStats(dashboardData)
      setUsers(usersData)
      setPayments(paymentsData)
    } catch (error) {
      console.error('Failed to load admin data:', error)
    }
  }

  useEffect(() => {
    async function init() {
      setLoading(true)
      await loadData()
      setLoading(false)
    }
    init()
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const handleTogglePremium = async (userId) => {
    try {
      await toggleUserPremium(userId)
      await loadData()
    } catch (error) {
      console.error('Failed to toggle premium:', error)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--color-warning)]/30 border-t-[var(--color-warning)] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--color-muted)] text-sm">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-warning)] to-[var(--color-danger)] flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-heading text-xl font-bold text-[var(--color-foreground)]">
                  Admin Dashboard
                </h1>
                <p className="text-xs text-[var(--color-muted)]">Welcome, {user?.username}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-raised)] transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-raised)] transition-all"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <div className="dashboard-card !p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-[var(--color-primary)]" />
              <span className="text-xs text-[var(--color-muted)]">Total Users</span>
            </div>
            <p className="text-2xl font-bold text-[var(--color-foreground)]">{stats?.total_users || 0}</p>
          </div>

          <div className="dashboard-card !p-4">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-4 h-4 text-[var(--color-warning)]" />
              <span className="text-xs text-[var(--color-muted)]">Premium Users</span>
            </div>
            <p className="text-2xl font-bold text-[var(--color-foreground)]">{stats?.premium_users || 0}</p>
          </div>

          <div className="dashboard-card !p-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-[var(--color-success)]" />
              <span className="text-xs text-[var(--color-muted)]">Total Payments</span>
            </div>
            <p className="text-2xl font-bold text-[var(--color-foreground)]">{stats?.total_payments || 0}</p>
          </div>

          <div className="dashboard-card !p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-[var(--color-accent)]" />
              <span className="text-xs text-[var(--color-muted)]">Total Revenue</span>
            </div>
            <p className="text-2xl font-bold text-[var(--color-foreground)]">₹{stats?.total_revenue || 0}</p>
          </div>

          <div className="dashboard-card !p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
              <span className="text-xs text-[var(--color-muted)]">DAU</span>
            </div>
            <p className="text-2xl font-bold text-[var(--color-foreground)]">{stats?.daily_active_users || 0}</p>
          </div>

          <div className="dashboard-card !p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-[var(--color-accent)]" />
              <span className="text-xs text-[var(--color-muted)]">MAU</span>
            </div>
            <p className="text-2xl font-bold text-[var(--color-foreground)]">{stats?.monthly_active_users || 0}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'users'
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-surface-raised)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]'
            }`}
          >
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'payments'
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-surface-raised)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]'
            }`}
          >
            Payments ({payments.length})
          </button>
        </div>

        {/* Users Table */}
        {activeTab === 'users' && (
          <div className="dashboard-card !p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">ID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Username</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Premium</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Last Login</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-[var(--color-surface-raised)]/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-[var(--color-muted)]">#{u.id}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-[var(--color-foreground)]">{u.username}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-[var(--color-muted)]">{u.email}</span>
                      </td>
                      <td className="px-4 py-3">
                        {u.premium ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)] text-xs font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            Premium
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--color-muted)]/10 text-[var(--color-muted)] text-xs font-medium">
                            <XCircle className="w-3 h-3" />
                            Free
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-[var(--color-muted)]">{formatDate(u.last_login)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleTogglePremium(u.id)}
                          className={`text-xs px-3 py-1 rounded-lg font-medium transition-all ${
                            u.premium
                              ? 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/20'
                              : 'bg-[var(--color-success)]/10 text-[var(--color-success)] hover:bg-[var(--color-success)]/20'
                          }`}
                        >
                          {u.premium ? 'Revoke Premium' : 'Grant Premium'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-[var(--color-muted)] mx-auto mb-3" />
                  <p className="text-[var(--color-muted)]">No users found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payments Table */}
        {activeTab === 'payments' && (
          <div className="dashboard-card !p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">ID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">User</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-[var(--color-surface-raised)]/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-[var(--color-muted)]">#{p.id}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-[var(--color-foreground)]">{p.username}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-[var(--color-foreground)]">₹{p.amount}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          p.status === 'paid'
                            ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]'
                            : p.status === 'created'
                            ? 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
                            : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'
                        }`}>
                          {p.status === 'paid' && <CheckCircle2 className="w-3 h-3" />}
                          {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-[var(--color-muted)]">{formatDate(p.created_at)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {payments.length === 0 && (
                <div className="text-center py-12">
                  <CreditCard className="w-12 h-12 text-[var(--color-muted)] mx-auto mb-3" />
                  <p className="text-[var(--color-muted)]">No payments found</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default AdminDashboard
