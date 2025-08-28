'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AdminSidebar from '@/components/AdminSidebar'
import { Users, CheckCircle, XCircle, Clock, Mail, Phone, User, BookOpen } from 'lucide-react'

interface SchoolEnrollment {
  id: string
  customer_id: string
  class_type: string
  class_name: string
  student_name: string
  student_age: number
  student_grade: string
  monthly_fee: number
  registration_fee: number
  total_amount: number
  notes: string
  status: string
  payment_status: string
  enrollment_date: string
  start_date: string
  customer: {
    id: string
    name: string
    email: string
    phone: string
    address: string
  }
}

export default function SchoolAdminPage() {
  const [enrollments, setEnrollments] = useState<SchoolEnrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedClass, setSelectedClass] = useState<string>('all')

  useEffect(() => {
    fetchEnrollments()
  }, [])

  async function fetchEnrollments() {
    try {
      const { data, error } = await supabase
        .from('school_enrollments')
        .select(`
          *,
          customer:customers(*)
        `)
        .order('enrollment_date', { ascending: false })

      if (error) throw error
      setEnrollments(data || [])
    } catch (error) {
      console.error('Error fetching enrollments:', error)
    } finally {
      setLoading(false)
    }
  }

  async function updateEnrollmentStatus(enrollmentId: string, status: string) {
    try {
      const { error } = await supabase
        .from('school_enrollments')
        .update({ status })
        .eq('id', enrollmentId)

      if (error) throw error
      
      // リストを更新
      fetchEnrollments()
    } catch (error) {
      console.error('Error updating enrollment status:', error)
      alert('ステータスの更新中にエラーが発生しました')
    }
  }

  const filteredEnrollments = enrollments.filter(enrollment => {
    if (selectedStatus !== 'all' && enrollment.status !== selectedStatus) return false
    if (selectedClass !== 'all' && enrollment.class_type !== selectedClass) return false
    return true
  })

  const stats = {
    total: enrollments.length,
    active: enrollments.filter(e => e.status === 'active').length,
    pending: enrollments.filter(e => e.status === 'pending').length,
    basic: enrollments.filter(e => e.class_type === 'basic').length,
    free: enrollments.filter(e => e.class_type === 'free').length
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />
      case 'paused':
        return <Clock className="w-4 h-4 text-gray-600" />
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return null
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '受講中'
      case 'pending': return '承認待ち'
      case 'paused': return '一時停止'
      case 'cancelled': return 'キャンセル'
      default: return status
    }
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">支払済</span>
      case 'pending':
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">支払待ち</span>
      case 'failed':
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">支払失敗</span>
      default:
        return null
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">スクール生管理</h1>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">総申込数</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Users className="w-8 h-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">受講中</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">承認待ち</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">基本実践</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.basic}</p>
                </div>
                <BookOpen className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">自由創作</p>
                  <p className="text-2xl font-bold text-pink-600">{stats.free}</p>
                </div>
                <BookOpen className="w-8 h-8 text-pink-600" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ステータス</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">すべて</option>
                  <option value="active">受講中</option>
                  <option value="pending">承認待ち</option>
                  <option value="paused">一時停止</option>
                  <option value="cancelled">キャンセル</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">クラス</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">すべて</option>
                  <option value="basic">基本実践クラス</option>
                  <option value="free">自由創作クラス</option>
                </select>
              </div>
            </div>
          </div>

          {/* Enrollments List */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              </div>
            ) : filteredEnrollments.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                申込データがありません
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        申込日
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        生徒情報
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        保護者情報
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        クラス
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        料金
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        支払状況
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ステータス
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredEnrollments.map((enrollment) => (
                      <tr key={enrollment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(enrollment.enrollment_date).toLocaleDateString('ja-JP')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{enrollment.student_name}</p>
                            <p className="text-sm text-gray-500">
                              {enrollment.student_age}歳 {enrollment.student_grade && `/ ${enrollment.student_grade}`}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="flex items-center mb-1">
                              <User className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="text-gray-900">{enrollment.customer?.name}</span>
                            </div>
                            <div className="flex items-center mb-1">
                              <Mail className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="text-gray-600">{enrollment.customer?.email}</span>
                            </div>
                            {enrollment.customer?.phone && (
                              <div className="flex items-center">
                                <Phone className="w-4 h-4 text-gray-400 mr-2" />
                                <span className="text-gray-600">{enrollment.customer?.phone}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${
                              enrollment.class_type === 'basic' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-pink-100 text-pink-800'
                            }`}>
                              {enrollment.class_type === 'basic' ? '基本実践' : '自由創作'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <p>月謝: ¥{enrollment.monthly_fee.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">入会金: ¥{enrollment.registration_fee.toLocaleString()}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getPaymentStatusBadge(enrollment.payment_status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(enrollment.status)}
                            <span className="text-sm text-gray-900">{getStatusLabel(enrollment.status)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={enrollment.status}
                            onChange={(e) => updateEnrollmentStatus(enrollment.id, e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="pending">承認待ち</option>
                            <option value="active">受講中</option>
                            <option value="paused">一時停止</option>
                            <option value="cancelled">キャンセル</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}