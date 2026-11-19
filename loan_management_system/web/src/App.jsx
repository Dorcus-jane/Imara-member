import { useEffect, useMemo, useState } from 'react'
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { auth, db } from './firebase'
import './App.css'

const money = (amount = 0) =>
  new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0)

const asDate = (value) => {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const formatDate = (value, options = { dateStyle: 'medium' }) => {
  const date = asDate(value)
  return date ? new Intl.DateTimeFormat('en-UG', options).format(date) : '—'
}

const today = () => new Date().toISOString().slice(0, 10)

function Icon({ name, size = 18 }) {
  const paths = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></>,
    deposits: <><path d="M12 2v20" /><path d="M17 7.5a4 4 0 0 0-4-3.5h-2a4 4 0 0 0 0 8h2a4 4 0 0 1 0 8h-2a4 4 0 0 1-4-3.5" /></>,
    loans: <><path d="M3 10h18" /><path d="M5 10V6l7-3 7 3v4" /><path d="M5 10v10h14V10" /><path d="M9 14h6" /></>,
    reports: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    down: <path d="m7 10 5 5 5-5" />,
    check: <path d="m5 12 4 4L19 6" />,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    calendar: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
    phone: <><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.5 2.8a2 2 0 0 1-.6 1.8L7.7 9.6a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 1.8-.6l2.8.5a2 2 0 0 1 1.7 2.7Z" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
    print: <><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v8H6z" /></>,
  }
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name] || paths.overview}
    </svg>
  )
}

function Brand({ compact = false }) {
  return (
    <div className={`brand ${compact ? 'brand-compact' : ''}`}>
      <div className="brand-mark"><span /><span /><span /></div>
      {!compact && <div><strong>Imara</strong><small>SACCO MANAGEMENT</small></div>}
    </div>
  )
}

function SignIn({ onSetup }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const resetPassword = async () => {
    if (!email.trim()) {
      setError('Enter your email address first.')
      return
    }
    setError('')
    setNotice('')
    try {
      await sendPasswordResetEmail(auth, email.trim())
      setNotice('Password reset email sent. Check your inbox.')
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-decoration decoration-one" />
      <div className="auth-decoration decoration-two" />
      <section className="auth-card">
        <Brand />
        <div className="auth-heading">
          <span className="eyebrow">WELCOME BACK</span>
          <h1>Your SACCO,<br /><em>in good hands.</em></h1>
          <p>Sign in to manage members, deposits and loans.</p>
        </div>
        <form onSubmit={submit} className="form-stack">
          <label>Email address<input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@your-sacco.org" required /></label>
          <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required /></label>
          {error && <div className="alert alert-error">{error}</div>}
          {notice && <div className="alert alert-success">{notice}</div>}
          <button className="button button-primary button-wide" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <Icon name="chevron" /></button>
          <button type="button" className="text-button forgot-button" onClick={resetPassword}>Forgot password?</button>
        </form>
        <div className="auth-footnote"><span className="secure-dot" /> Secure access for authorised SACCO administrators</div>
      </section>
      <p className="auth-caption">Built for better financial futures. <span>•</span> Powered by Firebase</p>
      <button className="setup-link" onClick={onSetup}>First time? Setup instructions</button>
    </main>
  )
}

function SetupDialog({ onClose }) {
  return (
    <Modal title="Set up your first administrator" onClose={onClose} wide>
      <div className="setup-steps">
        <p>Admin access is deliberately not self-service. Provision an authorised administrator in Firebase before signing in:</p>
        <ol>
          <li>In Firebase Console, open <strong>Authentication → Sign-in method</strong> and enable Email/Password.</li>
          <li>Under <strong>Authentication → Users</strong>, add the administrator account and copy its UID.</li>
          <li>Open <strong>Firestore Database → Data</strong>. Create an <code>admins</code> collection and a document whose ID is that UID. Add a string field <code>name</code> with the administrator’s name.</li>
          <li>Deploy the included <code>firestore.rules</code> rules. Only a signed-in user with a matching <code>admins/{'{uid}'}</code> document can use the portal.</li>
        </ol>
        <div className="alert alert-info">Firebase project: <strong>wallet-application-1bd18</strong>. Data is stored in Cloud Firestore; no Cloud SQL or Cloud Functions are required by this portal.</div>
      </div>
      <div className="modal-actions"><button className="button button-primary" onClick={onClose}>Got it</button></div>
    </Modal>
  )
}

function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const handleKey = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head"><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button></div>
        {children}
      </section>
    </div>
  )
}

function Field({ label, children, className = '' }) {
  return <label className={`field ${className}`}><span>{label}</span>{children}</label>
}

function MemberDialog({ onClose, onSave, busy }) {
  const [form, setForm] = useState({ name: '', memberNo: '', phone: '', email: '', loanLimit: '0', kycStatus: 'pending' })
  const change = (key) => (e) => setForm((old) => ({ ...old, [key]: e.target.value }))
  const submit = (e) => {
    e.preventDefault()
    onSave({ ...form, name: form.name.trim(), memberNo: form.memberNo.trim(), phone: form.phone.trim(), email: form.email.trim().toLowerCase(), loanLimit: Number(form.loanLimit) })
  }
  return (
    <Modal title="Register a member" onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        <Field label="Full name"><input value={form.name} onChange={change('name')} required maxLength={100} placeholder="e.g. Amina Nansubuga" /></Field>
        <Field label="Member number"><input value={form.memberNo} onChange={change('memberNo')} required maxLength={32} placeholder="e.g. IM-00124" /></Field>
        <Field label="Mobile number"><input type="tel" value={form.phone} onChange={change('phone')} required maxLength={24} placeholder="+256 7XX XXX XXX" /></Field>
        <Field label="Member email (used for mobile activation)"><input type="email" value={form.email} onChange={change('email')} required maxLength={150} placeholder="member@example.com" /></Field>
        <Field label="Available loan limit (UGX)"><input type="number" min="0" step="1" value={form.loanLimit} onChange={change('loanLimit')} required /></Field>
        <Field label="KYC status"><select value={form.kycStatus} onChange={change('kycStatus')}><option value="pending">Pending verification</option><option value="verified">Verified</option></select></Field>
        <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : 'Add member'}</button></div>
      </form>
    </Modal>
  )
}

function DepositDialog({ members, onClose, onSave, busy }) {
  const [form, setForm] = useState({ memberId: '', amount: '', method: 'Mobile Money', reference: '', date: today(), note: '' })
  const change = (key) => (e) => setForm((old) => ({ ...old, [key]: e.target.value }))
  const submit = (e) => {
    e.preventDefault()
    const member = members.find((item) => item.id === form.memberId)
    onSave({ ...form, amount: Number(form.amount), memberName: member?.name || '', memberNo: member?.memberNo || '' })
  }
  return (
    <Modal title="Record a deposit" onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        <Field label="Member"><select value={form.memberId} onChange={change('memberId')} required><option value="">Select a member</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name} · {m.memberNo}</option>)}</select></Field>
        <Field label="Amount (UGX)"><input type="number" min="1" step="1" value={form.amount} onChange={change('amount')} required placeholder="0" /></Field>
        <Field label="Payment channel"><select value={form.method} onChange={change('method')}><option>Mobile Money</option><option>Till</option><option>Bank transfer</option><option>Cash</option></select></Field>
        <Field label="Transaction reference"><input value={form.reference} onChange={change('reference')} maxLength={80} placeholder="Optional receipt / transaction ID" /></Field>
        <Field label="Deposit date"><input type="date" value={form.date} onChange={change('date')} max={today()} required /></Field>
        <Field label="Note (optional)"><input value={form.note} onChange={change('note')} maxLength={180} placeholder="Additional details" /></Field>
        <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy || !members.length}>{busy ? 'Saving…' : 'Save deposit'}</button></div>
      </form>
      {!members.length && <p className="form-hint">Register a member before recording a deposit.</p>}
    </Modal>
  )
}

function LoanDialog({ members, onClose, onSave, busy }) {
  const [form, setForm] = useState({ memberId: '', amount: '', annualRate: '12', termMonths: '12', purpose: '' })
  const change = (key) => (e) => setForm((old) => ({ ...old, [key]: e.target.value }))
  const submit = (e) => {
    e.preventDefault()
    const member = members.find((item) => item.id === form.memberId)
    onSave({ ...form, amount: Number(form.amount), annualRate: Number(form.annualRate), termMonths: Number(form.termMonths), memberName: member?.name || '', memberNo: member?.memberNo || '' })
  }
  return (
    <Modal title="New loan application" onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        <Field label="Member"><select value={form.memberId} onChange={change('memberId')} required><option value="">Select a member</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name} · {m.memberNo}</option>)}</select></Field>
        <Field label="Loan amount (UGX)"><input type="number" min="1" step="1" value={form.amount} onChange={change('amount')} required placeholder="0" /></Field>
        <div className="field-row">
          <Field label="Annual interest (%)"><input type="number" min="0" max="100" step="0.1" value={form.annualRate} onChange={change('annualRate')} required /></Field>
          <Field label="Term (months)"><input type="number" min="1" max="60" step="1" value={form.termMonths} onChange={change('termMonths')} required /></Field>
        </div>
        <Field label="Purpose"><textarea value={form.purpose} onChange={change('purpose')} required maxLength={250} rows="3" placeholder="Briefly describe the purpose of this loan" /></Field>
        <p className="form-hint">Interest schedule is calculated on a reducing balance and created when the application is approved.</p>
        <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy || !members.length}>{busy ? 'Submitting…' : 'Submit application'}</button></div>
      </form>
      {!members.length && <p className="form-hint">Register a member before applying for a loan.</p>}
    </Modal>
  )
}

function RepaymentDialog({ loan, onClose, onSave, busy }) {
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const submit = (e) => {
    e.preventDefault()
    onSave({ loan, amount: Number(amount), reference: reference.trim() })
  }
  return (
    <Modal title="Record loan repayment" onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        <div className="repayment-summary"><span>Member</span><strong>{loan.memberName}</strong><span>Outstanding balance</span><strong>{money(loan.outstandingBalance)}</strong></div>
        <Field label="Repayment amount (UGX)"><input type="number" min="1" max={loan.outstandingBalance} step="1" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="0" /></Field>
        <Field label="Receipt / reference"><input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={80} placeholder="Optional transaction ID" /></Field>
        <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : 'Record repayment'}</button></div>
      </form>
    </Modal>
  )
}

function LoanDetails({ loan, repayments, onClose }) {
  const loanPayments = repayments.filter((item) => item.loanId === loan.id)
  return (
    <Modal title={`${loan.memberName} · Loan schedule`} onClose={onClose} wide>
      <div className="loan-detail-summary">
        <div><span>Principal</span><strong>{money(loan.amount)}</strong></div>
        <div><span>Total payable</span><strong>{money(loan.totalPayable || loan.amount)}</strong></div>
        <div><span>Outstanding</span><strong>{money(loan.outstandingBalance ?? loan.amount)}</strong></div>
      </div>
      {loan.schedule?.length ? (
        <div className="table-wrap schedule-table">
          <table><thead><tr><th>Due date</th><th>#</th><th>Principal</th><th>Interest</th><th>Payment</th><th>Balance</th></tr></thead>
            <tbody>{loan.schedule.map((item) => <tr key={item.number}><td>{formatDate(item.dueDate)}</td><td>{item.number}</td><td>{money(item.principal)}</td><td>{money(item.interest)}</td><td>{money(item.payment)}</td><td>{money(item.balance)}</td></tr>)}</tbody>
          </table>
        </div>
      ) : <div className="empty-small">A schedule will be available after approval.</div>}
      <h3 className="subsection-title">Repayments</h3>
      {loanPayments.length ? <div className="repayment-list">{loanPayments.map((item) => <div key={item.id}><span>{formatDate(item.createdAt)} {item.reference && `· ${item.reference}`}</span><strong>{money(item.amount)}</strong></div>)}</div> : <div className="empty-small">No repayments recorded yet.</div>}
      <div className="modal-actions"><button className="button button-quiet" onClick={onClose}>Close</button></div>
    </Modal>
  )
}

const navItems = [
  { id: 'overview', label: 'Overview', icon: 'overview' },
  { id: 'deposits', label: 'Deposits', icon: 'deposits' },
  { id: 'loans', label: 'Loan management', icon: 'loans' },
  { id: 'users', label: 'User accounts', icon: 'users' },
  { id: 'reports', label: 'Member reports', icon: 'reports' },
]

function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [admin, setAdmin] = useState(undefined)
  const [activePage, setActivePage] = useState('overview')
  const [members, setMembers] = useState([])
  const [memberUsers, setMemberUsers] = useState([])
  const [deposits, setDeposits] = useState([])
  const [loans, setLoans] = useState([])
  const [repayments, setRepayments] = useState([])
  const [dataError, setDataError] = useState('')
  const [actionError, setActionError] = useState('')
  const [toast, setToast] = useState('')
  const [busy, setBusy] = useState(false)
  const [modal, setModal] = useState('')
  const [selectedLoan, setSelectedLoan] = useState(null)
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [search, setSearch] = useState('')
  const [depositFilter, setDepositFilter] = useState('All channels')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [mobileNav, setMobileNav] = useState(false)

  useEffect(() => onAuthStateChanged(auth, (nextUser) => {
    setUser(nextUser)
    setAdmin(undefined)
    setAuthLoading(false)
    setDataError('')
  }), [])

  useEffect(() => {
    if (!user) return undefined
    return onSnapshot(doc(db, 'admins', user.uid), (snapshot) => {
      setAdmin(snapshot.exists() ? snapshot.data() : null)
    }, (error) => {
      setDataError(`Could not verify administrator access: ${error.message}`)
      setAdmin(null)
    })
  }, [user])

  useEffect(() => {
    if (!user || !admin) return undefined
    const unsubscribe = []
    const sources = [
      ['members', setMembers],
      ['users', setMemberUsers],
      ['deposits', setDeposits],
      ['loans', setLoans],
      ['repayments', setRepayments],
    ]
    sources.forEach(([name, setter]) => {
      unsubscribe.push(onSnapshot(query(collection(db, name), orderBy('createdAt', 'desc')), (snapshot) => {
        setter(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))
        setDataError('')
      }, (error) => setDataError(`Could not load ${name}: ${error.message}`)))
    })
    return () => unsubscribe.forEach((stop) => stop())
  }, [user, admin])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(''), 3500)
    return () => window.clearTimeout(timer)
  }, [toast])

  const savingTotal = useMemo(() => deposits.filter((item) => item.status !== 'pending' && item.status !== 'rejected').reduce((sum, item) => sum + Number(item.amount || 0), 0), [deposits])
  const activeLoans = useMemo(() => loans.filter((loan) => loan.status === 'active'), [loans])
  const outstandingTotal = useMemo(() => activeLoans.reduce((sum, loan) => sum + Number(loan.outstandingBalance ?? loan.amount ?? 0), 0), [activeLoans])
  const pendingLoans = useMemo(() => loans.filter((loan) => loan.status === 'pending'), [loans])
  const memberById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members])

  const showError = (error) => {
    setActionError(error?.message || 'Something went wrong. Please try again.')
    setBusy(false)
  }
  const finishAction = (message) => {
    setBusy(false)
    setModal('')
    setActionError('')
    setToast(message)
  }

  const saveMember = async (form) => {
    setBusy(true)
    setActionError('')
    try {
      if (members.some((item) => item.memberNo.toLowerCase() === form.memberNo.toLowerCase())) {
        throw new Error('That member number is already in use.')
      }
      if (members.some((item) => item.email?.toLowerCase() === form.email.toLowerCase())) {
        throw new Error('That email address is already linked to a member.')
      }
      await addDoc(collection(db, 'members'), { ...form, createdAt: serverTimestamp(), createdBy: user.uid })
      finishAction('Member registered. They can now activate their mobile account with this email and member number.')
    } catch (error) { showError(error) }
  }

  const saveDeposit = async (form) => {
    setBusy(true)
    setActionError('')
    try {
      await addDoc(collection(db, 'deposits'), {
        userId: memberUsers.find((item) => item.memberId === form.memberId)?.id || null,
        memberId: form.memberId,
        memberName: form.memberName,
        memberNo: form.memberNo,
        amount: form.amount,
        method: form.method,
        reference: form.reference,
        note: form.note,
        receivedAt: new Date(`${form.date}T12:00:00`),
        status: 'confirmed',
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      })
      finishAction('Deposit saved to the member ledger.')
    } catch (error) { showError(error) }
  }

  const saveLoan = async (form) => {
    setBusy(true)
    setActionError('')
    try {
      await addDoc(collection(db, 'loans'), {
        ...form,
        userId: memberUsers.find((item) => item.memberId === form.memberId)?.id || null,
        status: 'pending',
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      })
      finishAction('Loan application submitted.')
    } catch (error) { showError(error) }
  }

  const decideLoan = async (loan, decision) => {
    const verb = decision === 'active' ? 'approve' : 'reject'
    if (!window.confirm(`Are you sure you want to ${verb} this loan application for ${loan.memberName}?`)) return
    setActionError('')
    try {
      const loanRef = doc(db, 'loans', loan.id)
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(loanRef)
        if (!snapshot.exists() || snapshot.data().status !== 'pending') throw new Error('This loan application is no longer pending.')
        const data = snapshot.data()
        if (decision === 'rejected') {
          transaction.update(loanRef, { status: 'rejected', reviewedAt: serverTimestamp(), reviewedBy: user.uid })
          return
        }
        const principal = Number(data.amount)
        const count = Number(data.termMonths)
        const monthlyRate = Number(data.annualRate) / 1200
        if (!(principal > 0) || !(count > 0) || count > 60 || monthlyRate < 0) throw new Error('Loan terms are invalid.')
        const regularPayment = monthlyRate === 0
          ? principal / count
          : principal * monthlyRate / (1 - (1 + monthlyRate) ** -count)
        let balance = principal
        const schedule = Array.from({ length: count }, (_, index) => {
          const dueDate = new Date()
          dueDate.setDate(1)
          dueDate.setMonth(dueDate.getMonth() + index + 1)
          const interest = Math.round(balance * monthlyRate)
          const principalDue = index === count - 1
            ? balance
            : Math.min(balance, Math.max(0, Math.round(regularPayment) - interest))
          const payment = principalDue + interest
          balance = Math.max(0, balance - principalDue)
          return {
            number: index + 1,
            dueDate: dueDate.toISOString().slice(0, 10),
            principal: principalDue,
            interest,
            payment,
            balance,
            paid: 0,
          }
        })
        const totalPayable = schedule.reduce((sum, item) => sum + item.payment, 0)
        transaction.update(loanRef, {
          status: 'active',
          schedule,
          totalPayable,
          outstandingBalance: totalPayable,
          approvedAt: serverTimestamp(),
          reviewedBy: user.uid,
        })
      })
      setToast(decision === 'active' ? 'Loan approved and repayment schedule created.' : 'Loan application rejected.')
    } catch (error) { showError(error) }
  }

  const saveRepayment = async ({ loan, amount, reference }) => {
    setBusy(true)
    setActionError('')
    try {
      const loanRef = doc(db, 'loans', loan.id)
      const repaymentRef = doc(collection(db, 'repayments'))
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(loanRef)
        if (!snapshot.exists()) throw new Error('Loan could not be found.')
        const data = snapshot.data()
        const outstanding = Number(data.outstandingBalance ?? data.totalPayable ?? data.amount)
        if (data.status !== 'active') throw new Error('This loan is not active.')
        if (!(amount > 0) || amount > outstanding) throw new Error('Repayment must be greater than zero and no more than the outstanding balance.')
        let unapplied = amount
        const schedule = (data.schedule || []).map((item) => {
          const remaining = Math.max(0, item.payment - (item.paid || 0))
          const applied = Math.min(remaining, unapplied)
          unapplied -= applied
          return { ...item, paid: (item.paid || 0) + applied }
        })
        const nextOutstanding = Math.max(0, outstanding - amount)
        transaction.update(loanRef, {
          schedule,
          outstandingBalance: nextOutstanding,
          status: nextOutstanding === 0 ? 'repaid' : 'active',
          lastRepaymentAt: serverTimestamp(),
        })
        transaction.set(repaymentRef, {
          loanId: loan.id,
          userId: data.userId || null,
          memberId: data.memberId,
          memberName: data.memberName,
          memberNo: data.memberNo,
          amount,
          reference,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
        })
      })
      finishAction('Repayment recorded and loan balance updated.')
    } catch (error) { showError(error) }
  }

  const filteredDeposits = deposits.filter((item) => {
    const text = `${item.memberName} ${item.memberNo} ${item.reference}`.toLowerCase()
    return (depositFilter === 'All channels' || item.method === depositFilter) && (!search || text.includes(search.toLowerCase()))
  })

  const filteredLoans = loans.filter((loan) => {
    const text = `${loan.memberName} ${loan.memberNo} ${loan.purpose}`.toLowerCase()
    return (statusFilter === 'All statuses' || loan.status === statusFilter.toLowerCase()) && (!search || text.includes(search.toLowerCase()))
  })

  const filteredUsers = memberUsers.filter((account) => {
    const member = memberById.get(account.memberId)
    const text = [
      account.name,
      account.memberNo,
      account.memberId,
      account.id,
      account.email,
      account.phone,
      member?.name,
      member?.memberNo,
      member?.email,
      member?.phone,
    ].join(' ').toLowerCase()
    return !search || text.includes(search.toLowerCase())
  })

  const statement = useMemo(() => {
    if (!selectedMemberId) return null
    const member = memberById.get(selectedMemberId)
    if (!member) return null
    const memberDeposits = deposits.filter((item) => item.memberId === member.id)
    const memberLoans = loans.filter((item) => item.memberId === member.id)
    const memberRepayments = repayments.filter((item) => item.memberId === member.id)
    const rows = [
      ...memberDeposits.map((item) => ({ id: item.id, date: item.receivedAt || item.createdAt, type: 'Savings deposit', detail: `${item.method}${item.reference ? ` · ${item.reference}` : ''}`, amount: item.amount })),
      ...memberLoans.filter((item) => item.status === 'active' || item.status === 'repaid').map((item) => ({ id: item.id, date: item.approvedAt || item.createdAt, type: 'Loan disbursed', detail: `Loan · ${item.purpose}`, amount: -Number(item.amount) })),
      ...memberRepayments.map((item) => ({ id: item.id, date: item.createdAt, type: 'Loan repayment', detail: item.reference || 'Repayment', amount: item.amount })),
    ].sort((a, b) => (asDate(b.date)?.getTime() || 0) - (asDate(a.date)?.getTime() || 0))
    return {
      member,
      rows,
      savings: memberDeposits.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      borrowed: memberLoans.filter((item) => item.status === 'active' || item.status === 'repaid').reduce((sum, item) => sum + Number(item.amount || 0), 0),
      repaid: memberRepayments.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    }
  }, [selectedMemberId, memberById, deposits, loans, repayments])

  const shareStatement = (channel) => {
    if (!statement) return
    const { member, rows } = statement
    const lines = [
      `IMARA SACCO — Member Statement`,
      `Member: ${member.name} (${member.memberNo})`,
      `Statement date: ${formatDate(new Date())}`,
      `Savings deposits: ${money(statement.savings)}`,
      `Loans disbursed: ${money(statement.borrowed)}`,
      `Loan repayments: ${money(statement.repaid)}`,
      '',
      ...rows.slice(0, 30).map((row) => `${formatDate(row.date)} | ${row.type} | ${row.detail} | ${money(row.amount)}`),
      ...(rows.length > 30 ? [`…and ${rows.length - 30} earlier entries.`] : []),
    ]
    const text = lines.join('\n')
    if (channel === 'whatsapp') {
      window.open(`https://wa.me/${(member.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
    } else {
      window.location.href = `mailto:${encodeURIComponent(member.email || '')}?subject=${encodeURIComponent(`SACCO statement — ${member.memberNo}`)}&body=${encodeURIComponent(text)}`
    }
  }

  const openNewModal = (name) => {
    setActionError('')
    setModal(name)
  }
  const confirmDeposit = async (deposit) => {
    if (!window.confirm(`Confirm the ${money(deposit.amount)} ${deposit.method} deposit for ${deposit.memberName}?`)) return
    try {
      const depositRef = doc(db, 'deposits', deposit.id)
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(depositRef)
        if (!snapshot.exists() || snapshot.data().status !== 'pending') throw new Error('This deposit is no longer pending.')
        transaction.update(depositRef, { status: 'confirmed', verifiedAt: serverTimestamp(), verifiedBy: user.uid })
      })
      setToast('Deposit confirmed and added to savings.')
    } catch (error) { showError(error) }
  }
  const pageTitle = navItems.find((item) => item.id === activePage)?.label || 'Overview'

  if (authLoading) return <div className="loading-screen"><Brand /><span className="spinner" />Connecting securely…</div>
  if (!user) return <><SignIn onSetup={() => setModal('setup')} />{modal === 'setup' && <SetupDialog onClose={() => setModal('')} />}</>
  if (admin === undefined) return <div className="loading-screen"><Brand /><span className="spinner" />Verifying administrator access…</div>
  if (!admin) return (
    <main className="access-page">
      <section className="access-card">
        <div className="access-icon"><Icon name="users" size={24} /></div>
        <span className="eyebrow">ADMIN ACCESS REQUIRED</span>
        <h1>This account isn’t authorised yet.</h1>
        <p>Signed in as <strong>{user.email}</strong>. Ask your Firebase project administrator to add your UID to the <code>admins</code> collection.</p>
        <div className="uid-box"><span>Your Firebase UID</span><code>{user.uid}</code><button className="text-button" onClick={() => navigator.clipboard.writeText(user.uid)}>Copy UID</button></div>
        {dataError && <div className="alert alert-error">{dataError}</div>}
        <button className="button button-quiet button-wide" onClick={() => signOut(auth)}>Sign out</button>
      </section>
    </main>
  )

  return (
    <div className="app-shell">
      {mobileNav && <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand"><Brand /></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <button key={item.id} className={`nav-item ${activePage === item.id ? 'nav-active' : ''}`} onClick={() => { setActivePage(item.id); setMobileNav(false); setSearch('') }}>
              <Icon name={item.icon} /><span>{item.label}</span>{item.id === 'loans' && pendingLoans.length > 0 && <b className="nav-count">{pendingLoans.length}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="plan-chip"><span className="live-dot" /> Firestore connected</div>
          <div className="admin-profile">
            <div className="avatar">{(admin.name || user.email || 'A').slice(0, 1).toUpperCase()}</div>
            <div className="admin-meta"><strong>{admin.name || 'Administrator'}</strong><span>Administrator</span></div>
            <button className="icon-button signout-button" title="Sign out" onClick={() => signOut(auth)}><Icon name="logout" /></button>
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Icon name="menu" /></button>
          <div><div className="breadcrumb">IMARA SACCO <Icon name="chevron" size={14} /> <span>{pageTitle}</span></div><p className="topbar-caption">Your community’s finances, in one place.</p></div>
          <div className="topbar-right"><span className="today-label"><Icon name="calendar" size={15} /> {formatDate(new Date(), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span><div className="topbar-avatar">{(admin.name || user.email || 'A').slice(0, 1).toUpperCase()}</div></div>
        </header>

        <div className="page-content">
          {dataError && <div className="alert alert-error page-alert"><span>{dataError}</span><button className="icon-button" onClick={() => setDataError('')} aria-label="Dismiss error"><Icon name="close" /></button></div>}
          {actionError && <div className="alert alert-error page-alert"><span>{actionError}</span><button className="icon-button" onClick={() => setActionError('')} aria-label="Dismiss error"><Icon name="close" /></button></div>}

          {activePage === 'overview' && (
            <>
              <div className="page-heading"><div><span className="eyebrow">SACCO OVERVIEW</span><h1>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {admin.name?.split(' ')[0] || 'there'} <span className="wave">✳</span></h1><p>Here’s what’s happening with your SACCO today.</p></div><button className="button button-primary" onClick={() => openNewModal('deposit')}><Icon name="plus" /> Record a deposit</button></div>
              <div className="stat-grid">
                <StatCard label="Total savings" value={money(savingTotal)} note={`${deposits.length} recorded deposits`} icon="deposits" tone="green" />
                <StatCard label="Active loans" value={String(activeLoans.length).padStart(2, '0')} note={`${money(outstandingTotal)} outstanding`} icon="loans" tone="blue" />
                <StatCard label="Pending applications" value={String(pendingLoans.length).padStart(2, '0')} note={pendingLoans.length ? 'Awaiting your review' : 'All caught up'} icon="clock" tone="orange" />
                <StatCard label="Total members" value={String(members.length).padStart(2, '0')} note="Registered members" icon="users" tone="purple" />
              </div>
              <div className="overview-grid">
                <section className="panel recent-panel">
                  <div className="panel-heading"><div><h2>Recent deposits</h2><p>The latest money coming in</p></div><button className="text-button with-arrow" onClick={() => setActivePage('deposits')}>View all <Icon name="chevron" size={16} /></button></div>
                  <DepositTable items={deposits.slice(0, 6)} compact />
                </section>
                <section className="panel pending-panel">
                  <div className="panel-heading"><div><h2>Needs your attention</h2><p>Loan applications to review</p></div><span className="pending-count">{pendingLoans.length}</span></div>
                  {pendingLoans.length ? <div className="pending-list">{pendingLoans.slice(0, 4).map((loan) => <div className="pending-item" key={loan.id}><div className="avatar avatar-small">{loan.memberName?.slice(0, 1) || 'M'}</div><div className="pending-person"><strong>{loan.memberName}</strong><span>{loan.memberNo} · {Number(loan.termMonths)} months</span></div><strong className="pending-amount">{money(loan.amount)}</strong><button className="mini-action" onClick={() => decideLoan(loan, 'active')} title="Approve loan"><Icon name="check" size={15} /></button></div>)}</div> : <EmptyState icon="check" title="All caught up" text="New loan applications will appear here." />}
                  {pendingLoans.length > 0 && <button className="button button-quiet button-wide panel-footer-button" onClick={() => setActivePage('loans')}>Review all applications <Icon name="chevron" size={16} /></button>}
                </section>
              </div>
              <div className="insight-strip"><div className="insight-icon"><Icon name="users" /></div><div><strong>Growing together</strong><span>{members.length ? `${members.length} members are building their financial future with you.` : 'Register your first member to get started.'}</span></div><button className="button button-quiet" onClick={() => openNewModal('member')}>Add a member <Icon name="plus" size={16} /></button></div>
            </>
          )}

          {activePage === 'deposits' && (
            <>
              <PageHeading eyebrow="MONEY IN" title="Deposits" description="Mobile money, till and other member contributions." action={<button className="button button-primary" onClick={() => openNewModal('deposit')}><Icon name="plus" /> Record deposit</button>} />
              <div className="stat-grid stat-grid-small"><StatCard label="Total savings" value={money(savingTotal)} note="All recorded deposits" icon="deposits" tone="green" /><StatCard label="Deposits recorded" value={String(deposits.length)} note="Across all channels" icon="calendar" tone="blue" /><StatCard label="Mobile money" value={money(deposits.filter((d) => d.method === 'Mobile Money').reduce((sum, d) => sum + Number(d.amount || 0), 0))} note="Total mobile deposits" icon="phone" tone="purple" /></div>
              <section className="panel table-panel"><div className="panel-heading panel-heading-wrap"><div><h2>Deposit log</h2><p>Live ledger · updates as transactions are recorded</p></div><div className="table-controls"><div className="search-box"><Icon name="search" size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search member or reference" aria-label="Search deposits" /></div><select className="filter-select" value={depositFilter} onChange={(e) => setDepositFilter(e.target.value)} aria-label="Filter by payment channel"><option>All channels</option><option>Mobile Money</option><option>Till</option><option>Bank transfer</option><option>Cash</option></select></div></div><DepositTable items={filteredDeposits} onConfirm={confirmDeposit} /></section>
            </>
          )}

          {activePage === 'loans' && (
            <>
              <PageHeading eyebrow="LENDING" title="Loan management" description="Review applications, manage repayments and keep schedules on track." action={<button className="button button-primary" onClick={() => openNewModal('loan')}><Icon name="plus" /> New application</button>} />
              <div className="stat-grid stat-grid-small"><StatCard label="Awaiting review" value={String(pendingLoans.length)} note="Applications to decide" icon="clock" tone="orange" /><StatCard label="Active portfolio" value={money(outstandingTotal)} note={`${activeLoans.length} loans in repayment`} icon="loans" tone="blue" /><StatCard label="Repaid in full" value={String(loans.filter((loan) => loan.status === 'repaid').length)} note="Completed loans" icon="check" tone="green" /></div>
              <section className="panel table-panel"><div className="panel-heading panel-heading-wrap"><div><h2>Loan applications & portfolio</h2><p>Approve requests, inspect schedules and record repayments</p></div><div className="table-controls"><div className="search-box"><Icon name="search" size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search member or purpose" aria-label="Search loans" /></div><select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter loan status"><option>All statuses</option><option>Pending</option><option>Active</option><option>Repaid</option><option>Rejected</option></select></div></div><LoanTable loans={filteredLoans} onDecision={decideLoan} onInspect={setSelectedLoan} onRepay={(loan) => { setSelectedLoan(loan); setModal('repayment') }} /></section>
            </>
          )}

          {activePage === 'users' && (
            <>
              <PageHeading eyebrow="MEMBER ACCOUNTS" title="User accounts" description="Review the profile details linked to activated mobile accounts." />
              <div className="stat-grid stat-grid-small">
                <StatCard label="User accounts" value={String(memberUsers.length)} note="Activated mobile accounts" icon="users" tone="purple" />
                <StatCard label="Linked profiles" value={String(memberUsers.filter((account) => memberById.has(account.memberId)).length)} note="Connected to a member record" icon="check" tone="green" />
                <StatCard label="Not linked" value={String(memberUsers.filter((account) => !memberById.has(account.memberId)).length)} note="Review account records" icon="clock" tone="orange" />
              </div>
              <section className="panel table-panel">
                <div className="panel-heading panel-heading-wrap">
                  <div><h2>Member user list</h2><p>Account profile fields · PIN hashes and security fields are not displayed</p></div>
                  <div className="table-controls">
                    <div className="search-box"><Icon name="search" size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, phone or ID" aria-label="Search user accounts" /></div>
                  </div>
                </div>
                <div className="table-wrap">
                  <table className="user-accounts-table">
                    <thead><tr><th>Member</th><th>Email</th><th>Phone</th><th>Member ID</th><th>Account UID</th><th>Loan limit</th><th>Created</th></tr></thead>
                    <tbody>
                      {filteredUsers.map((account) => {
                        const member = memberById.get(account.memberId)
                        return (
                          <tr key={account.id}>
                            <td><div className="table-member"><div className="avatar avatar-tiny">{(account.name || member?.name || 'M').slice(0, 1)}</div><div><strong>{account.name || member?.name || 'Member'}</strong><span>{account.memberNo || member?.memberNo || 'No member number'}</span></div></div></td>
                            <td>{account.email || member?.email || '—'}</td>
                            <td>{account.phone || member?.phone || '—'}</td>
                            <td>{account.memberId || '—'}</td>
                            <td><span className="account-uid" title={account.id}>{account.id}</span></td>
                            <td>{account.loanLimit === undefined ? '—' : money(account.loanLimit)}</td>
                            <td>{formatDate(account.createdAt)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {!filteredUsers.length && <EmptyState icon="users" title={memberUsers.length ? 'No matching accounts' : 'No user accounts yet'} text={memberUsers.length ? 'Try another name, email, phone number or ID.' : 'Member accounts appear here after they activate access in the mobile app.'} />}
                </div>
              </section>
            </>
          )}

          {activePage === 'reports' && (
            <>
              <PageHeading eyebrow="MEMBER SERVICES" title="Member reports" description="Account activity and statements, ready to share." action={<button className="button button-primary" onClick={() => openNewModal('member')}><Icon name="plus" /> Register member</button>} />
              <div className="report-layout">
                <section className="panel member-picker"><div className="panel-heading"><div><h2>Choose a member</h2><p>Select an account to generate a statement.</p></div></div><div className="search-box member-search"><Icon name="search" size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find by name or number" aria-label="Search members" /></div><div className="member-list">{members.filter((m) => `${m.name} ${m.memberNo}`.toLowerCase().includes(search.toLowerCase())).map((member) => <button key={member.id} className={`member-option ${selectedMemberId === member.id ? 'member-selected' : ''}`} onClick={() => setSelectedMemberId(member.id)}><div className="avatar avatar-small">{member.name.slice(0, 1).toUpperCase()}</div><div className="pending-person"><strong>{member.name}</strong><span>{member.memberNo}</span></div><Icon name="chevron" size={16} /></button>)}{!members.length && <EmptyState icon="users" title="No members yet" text="Register a member to create their first statement." />}</div></section>
                <section className="panel statement-panel">
                  {statement ? <><div className="statement-header"><div><span className="eyebrow">ACCOUNT STATEMENT</span><h2>{statement.member.name}</h2><p>{statement.member.memberNo} <span>·</span> {statement.member.phone}</p></div><div className="statement-actions"><button className="button button-quiet" onClick={() => shareStatement('whatsapp')}><Icon name="phone" size={16} /> WhatsApp</button><button className="button button-quiet" onClick={() => shareStatement('email')}><Icon name="mail" size={16} /> Email</button><button className="button button-icon-only" title="Print statement" onClick={() => window.print()}><Icon name="print" size={16} /></button></div></div><div className="statement-date">Generated {formatDate(new Date(), { dateStyle: 'long' })}</div><div className="statement-stats"><div><span>Savings deposits</span><strong>{money(statement.savings)}</strong></div><div><span>Loans disbursed</span><strong>{money(statement.borrowed)}</strong></div><div><span>Loan repayments</span><strong>{money(statement.repaid)}</strong></div></div><h3 className="subsection-title">Account activity</h3><div className="table-wrap statement-rows"><table><thead><tr><th>Date</th><th>Activity</th><th>Details</th><th className="align-right">Amount</th></tr></thead><tbody>{statement.rows.map((row) => <tr key={`${row.type}-${row.id}`}><td>{formatDate(row.date)}</td><td>{row.type}</td><td>{row.detail}</td><td className={`align-right ${row.amount < 0 ? 'negative-amount' : 'positive-amount'}`}>{money(row.amount)}</td></tr>)}</tbody></table>{!statement.rows.length && <EmptyState icon="reports" title="No account activity" text="Deposits and loan activity will appear here." />}</div></> : <div className="statement-empty"><div className="empty-illustration"><Icon name="reports" size={28} /></div><h2>Your member statements</h2><p>Choose a member to view savings, loan activity and repayment history.</p>{!members.length && <button className="button button-primary" onClick={() => openNewModal('member')}><Icon name="plus" /> Register first member</button>}</div>}
                </section>
              </div>
            </>
          )}
        </div>
        <footer className="app-footer"><span>IMARA SACCO <span className="footer-dot">•</span> Financial wellbeing, together.</span><span>All amounts in <strong>UGX</strong></span></footer>
      </main>

      {modal === 'member' && <MemberDialog onClose={() => setModal('')} onSave={saveMember} busy={busy} />}
      {modal === 'deposit' && <DepositDialog members={members} onClose={() => setModal('')} onSave={saveDeposit} busy={busy} />}
      {modal === 'loan' && <LoanDialog members={members} onClose={() => setModal('')} onSave={saveLoan} busy={busy} />}
      {modal === 'repayment' && selectedLoan && <RepaymentDialog loan={selectedLoan} onClose={() => setModal('')} onSave={saveRepayment} busy={busy} />}
      {selectedLoan && modal !== 'repayment' && <LoanDetails loan={loans.find((item) => item.id === selectedLoan.id) || selectedLoan} repayments={repayments} onClose={() => setSelectedLoan(null)} />}
      {toast && <div className="toast"><span className="toast-check"><Icon name="check" size={15} /></span>{toast}</div>}
    </div>
  )
}

function PageHeading({ eyebrow, title, description, action }) {
  return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>
}

function StatCard({ label, value, note, icon, tone }) {
  return <section className="stat-card"><div className={`stat-icon stat-${tone}`}><Icon name={icon} size={19} /></div><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><span className="stat-note">{note}</span><span className={`stat-spark spark-${tone}`}><i /><i /><i /><i /><i /><i /><i /></span></section>
}

function DepositTable({ items, compact = false, onConfirm }) {
  return (
    <div className="table-wrap">
      <table><thead><tr><th>Member</th><th>Date</th><th>Channel</th>{onConfirm && <th>Status</th>}<th className="align-right">Amount</th>{onConfirm && <th className="align-right">Action</th>}</tr></thead>
        <tbody>{items.map((item) => <tr key={item.id}><td><div className="table-member"><div className="avatar avatar-tiny">{item.memberName?.slice(0, 1) || 'M'}</div><div><strong>{item.memberName || 'Member'}</strong><span>{item.memberNo || '—'}</span></div></div></td><td>{formatDate(item.receivedAt || item.createdAt, compact ? { day: 'numeric', month: 'short' } : { dateStyle: 'medium' })}</td><td><span className={`channel-pill ${item.method === 'Mobile Money' ? 'channel-mobile' : item.method === 'Till' ? 'channel-till' : ''}`}>{item.method || 'Other'}</span></td>{onConfirm && <td><span className={`status-pill status-${item.status === 'pending' ? 'pending' : 'active'}`}>{item.status === 'pending' ? 'Pending' : 'Confirmed'}</span></td>}<td className="align-right amount-cell">{money(item.amount)}</td>{onConfirm && <td className="align-right">{item.status === 'pending' ? <button className="button button-approve" onClick={() => onConfirm(item)}>Confirm</button> : '—'}</td>}</tr>)}</tbody>
      </table>
      {!items.length && <EmptyState icon="deposits" title="No deposits yet" text="Recorded member deposits will appear here." />}
    </div>
  )
}

function LoanTable({ loans, onDecision, onInspect, onRepay }) {
  return (
    <div className="table-wrap">
      <table><thead><tr><th>Member</th><th>Requested</th><th>Terms</th><th>Status</th><th>Outstanding</th><th className="align-right">Actions</th></tr></thead>
        <tbody>{loans.map((loan) => <tr key={loan.id}><td><div className="table-member"><div className="avatar avatar-tiny">{loan.memberName?.slice(0, 1) || 'M'}</div><div><strong>{loan.memberName}</strong><span>{loan.memberNo}</span></div></div></td><td>{money(loan.amount)}</td><td>{loan.annualRate}% · {loan.termMonths} mo</td><td><StatusPill status={loan.status} /></td><td>{loan.status === 'pending' || loan.status === 'rejected' ? '—' : money(loan.outstandingBalance ?? loan.totalPayable ?? loan.amount)}</td><td className="align-right action-cell">{loan.status === 'pending' ? <><button className="button button-approve" onClick={() => onDecision(loan, 'active')}>Approve</button><button className="button button-reject" onClick={() => onDecision(loan, 'rejected')}>Reject</button></> : <><button className="button button-table" onClick={() => onInspect(loan)}>Schedule</button>{loan.status === 'active' && <button className="button button-table" onClick={() => onRepay(loan)}>Repayment</button>}</>}</td></tr>)}</tbody>
      </table>
      {!loans.length && <EmptyState icon="loans" title="No loan applications" text="New applications will appear here for review." />}
    </div>
  )
}

function StatusPill({ status }) {
  const labels = { pending: 'Pending', active: 'Active', repaid: 'Repaid', rejected: 'Rejected' }
  return <span className={`status-pill status-${status}`}>{labels[status] || status}</span>
}

function EmptyState({ icon, title, text }) {
  return <div className="empty-state"><div className="empty-icon"><Icon name={icon} size={19} /></div><strong>{title}</strong><span>{text}</span></div>
}

export default App
