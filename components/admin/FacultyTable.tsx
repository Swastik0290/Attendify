'use client'

import { useState, useTransition } from 'react'
import { Check, X, Ban, UserPlus, RefreshCw, AlertCircle, Mail, KeyRound, Trash2 } from 'lucide-react'
import { StatusBadge, StatusType } from '@/components/admin/StatusBadge'
import { FacultyProfile, FacultyStatus } from '@/lib/types'
import { updateFacultyStatus, createFacultyByAdmin, deleteFaculty, adminChangeFacultyPassword } from '@/lib/actions'

interface FacultyTableProps {
  initialFaculty?: FacultyProfile[]
}

const TABS: { id: FacultyStatus | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'PENDING', label: 'Pending Approval' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'SUSPENDED', label: 'Suspended / Rejected' },
]

export function FacultyTable({ initialFaculty = [] }: FacultyTableProps) {
  const [facultyList, setFacultyList] = useState<FacultyProfile[]>(initialFaculty)
  const [activeTab, setActiveTab] = useState<FacultyStatus | 'ALL'>('ALL')
  const [isPending, startTransition] = useTransition()
  const [showAddModal, setShowAddModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  const [resetPasswordFacultyId, setResetPasswordFacultyId] = useState<string | null>(null)
  const [resetPassword, setResetPassword] = useState('')

  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleStatusChange = (facultyId: string, nextStatus: FacultyStatus) => {
    startTransition(async () => {
      try {
        setErrorMsg(null)
        await updateFacultyStatus(facultyId, nextStatus)
        setFacultyList((prev) =>
          prev.map((f) => (f.id === facultyId ? { ...f, status: nextStatus } : f))
        )
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to update status')
      }
    })
  }

  const handleDeleteFaculty = (facultyId: string) => {
    if (!confirm('Are you sure you want to completely delete this faculty account? This cannot be undone.')) return
    startTransition(async () => {
      try {
        setErrorMsg(null)
        await deleteFaculty(facultyId)
        setFacultyList((prev) => prev.filter((f) => f.id !== facultyId))
        setSuccessMsg('Faculty account deleted.')
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to delete faculty')
      }
    })
  }

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetPasswordFacultyId || resetPassword.length < 8) return

    startTransition(async () => {
      try {
        setErrorMsg(null)
        await adminChangeFacultyPassword(resetPasswordFacultyId, resetPassword)
        setSuccessMsg('Password updated successfully. Share the new password with the faculty.')
        setResetPasswordFacultyId(null)
        setResetPassword('')
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to change password')
      }
    })
  }

  const handleCreateFaculty = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) return

    startTransition(async () => {
      try {
        setErrorMsg(null)
        setSuccessMsg(null)
        const res = await createFacultyByAdmin(newName.trim(), newEmail.trim(), newPassword)
        if (res.success) {
          setFacultyList((prev) => [
            {
              id: res.facultyId,
              name: newName.trim(),
              email: newEmail.trim().toLowerCase(),
              status: 'PENDING',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            ...prev,
          ])
          setSuccessMsg(`Faculty account created! They can login at /faculty using:\nEmail: ${newEmail.trim()}\nPassword: ${newPassword}\n\nAccount is PENDING — approve it below once they appear.`)
          setNewName('')
          setNewEmail('')
          setNewPassword('')
          setShowAddModal(false)
        }
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to create faculty')
      }
    })
  }

  const filteredFaculty = facultyList.filter((f) => {
    if (activeTab === 'ALL') return true
    if (activeTab === 'SUSPENDED') return f.status === 'SUSPENDED' || f.status === 'REJECTED'
    return f.status === activeTab
  })

  const pendingCount = facultyList.filter((f) => f.status === 'PENDING').length

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {errorMsg && (
        <div className="bg-red-50 border-b border-red-200 p-3 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-auto text-red-400 hover:text-red-700">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-50 border-b border-emerald-200 p-3 text-xs text-emerald-700 flex items-start gap-2">
          <Check className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="ml-auto text-emerald-400 hover:text-emerald-700">✕</button>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Registered Faculty Members
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {facultyList.length} total • {pendingCount} pending approval
          </p>
        </div>

        <button
          onClick={() => { setShowAddModal(true); setErrorMsg(null); setSuccessMsg(null) }}
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition-colors"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Add Faculty by Email
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50/75 px-5 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`border-b-2 px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            {tab.id === 'PENDING' && pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-100 text-amber-800 px-1.5 py-0.5 text-[10px] font-bold">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[580px] text-left text-sm" aria-label="Faculty list">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th scope="col" className="px-5 py-3">Faculty Name</th>
              <th scope="col" className="px-4 py-3">Email</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Registered</th>
              <th scope="col" className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredFaculty.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-xs text-slate-400">
                  {activeTab === 'ALL'
                    ? 'No faculty registered yet. Use "Add Faculty by Email" to invite the first faculty member.'
                    : 'No faculty found matching the selected filter.'}
                </td>
              </tr>
            ) : (
              filteredFaculty.map((faculty) => (
                <tr key={faculty.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-slate-900">{faculty.name}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    {faculty.email ? (
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Mail className="h-3 w-3" />
                        {faculty.email}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300 italic">not set</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={faculty.status.toLowerCase() as StatusType} />
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500">
                    {new Date(faculty.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {faculty.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(faculty.id, 'APPROVED')}
                            disabled={isPending}
                            aria-label={`Approve ${faculty.name}`}
                            className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-50"
                          >
                            <Check className="h-3 w-3" /> Approve
                          </button>
                          <button
                            onClick={() => handleStatusChange(faculty.id, 'REJECTED')}
                            disabled={isPending}
                            aria-label={`Reject ${faculty.name}`}
                            className="inline-flex items-center gap-1 rounded bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50"
                          >
                            <X className="h-3 w-3" /> Reject
                          </button>
                        </>
                      )}

                      {faculty.status === 'APPROVED' && (
                        <button
                          onClick={() => handleStatusChange(faculty.id, 'SUSPENDED')}
                          disabled={isPending}
                          aria-label={`Suspend ${faculty.name}`}
                          className="inline-flex items-center gap-1 rounded bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-red-700 border border-slate-200 hover:border-red-200 transition-colors disabled:opacity-50"
                        >
                          <Ban className="h-3 w-3" /> Suspend
                        </button>
                      )}

                      {(faculty.status === 'SUSPENDED' || faculty.status === 'REJECTED') && (
                        <button
                          onClick={() => handleStatusChange(faculty.id, 'APPROVED')}
                          disabled={isPending}
                          aria-label={`Reactivate ${faculty.name}`}
                          className="inline-flex items-center gap-1 rounded bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 hover:bg-sky-100 border border-sky-200 transition-colors disabled:opacity-50"
                        >
                          <RefreshCw className="h-3 w-3" /> Reactivate
                        </button>
                      )}

                      <button
                        onClick={() => setResetPasswordFacultyId(faculty.id)}
                        disabled={isPending}
                        title="Change Password"
                        className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 border border-slate-200 transition-colors disabled:opacity-50"
                      >
                        <KeyRound className="h-3 w-3" />
                      </button>

                      <button
                        onClick={() => handleDeleteFaculty(faculty.id)}
                        disabled={isPending}
                        title="Delete Faculty"
                        className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100 hover:text-red-700 border border-red-200 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Faculty Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-sky-400" /> Create Faculty Account
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Set up credentials for a faculty member. They can login at <code className="bg-slate-800 px-1 rounded text-sky-300">/faculty</code> using these or their Google account.
              </p>
            </div>

            <form onSubmit={handleCreateFaculty} className="p-6 space-y-4">
              <div>
                <label htmlFor="modal-faculty-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full Name *
                </label>
                <input
                  id="modal-faculty-name"
                  type="text"
                  required
                  placeholder="e.g. Prof. Arvind Kumar"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label htmlFor="modal-faculty-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address *
                </label>
                <input
                  id="modal-faculty-email"
                  type="email"
                  required
                  placeholder="e.g. arvind@institution.ac.in"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label htmlFor="modal-faculty-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Login Password * <span className="font-normal text-slate-400">(min 8 characters — share this with the faculty)</span>
                </label>
                <div className="relative">
                  <input
                    id="modal-faculty-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="Min 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-16 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {newPassword && newPassword.length < 8 && (
                  <p className="mt-1 text-xs text-red-500">Password must be at least 8 characters</p>
                )}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                <strong>Important:</strong> The account will be in <strong>PENDING</strong> state. You must approve it in the Faculty table before they can use the system. Share these credentials with the faculty member directly.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setNewName(''); setNewEmail(''); setNewPassword('') }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !newName.trim() || !newEmail.trim() || newPassword.length < 8}
                  className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  {isPending ? 'Creating...' : 'Create Faculty Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {resetPasswordFacultyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-sky-400" /> Change Password
              </h3>
            </div>
            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  New Password * <span className="font-normal text-slate-400">(min 8 characters)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-16 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setResetPasswordFacultyId(null); setResetPassword('') }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || resetPassword.length < 8}
                  className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  {isPending ? 'Saving...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
