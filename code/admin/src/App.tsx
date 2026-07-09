import {
  ApiOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  CloudSyncOutlined,
  CrownOutlined,
  DatabaseOutlined,
  DeploymentUnitOutlined,
  KeyOutlined,
  LockOutlined,
  LogoutOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  FileTextOutlined,
  TeamOutlined,
  UnlockOutlined,
} from '@ant-design/icons'
import { useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Col,
  ConfigProvider,
  Descriptions,
  Empty,
  Flex,
  Input,
  Layout,
  Menu,
  Alert,
  message,
  Progress,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
  theme,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import runtimeConfig from '../config/runtime.json'

const { Header, Sider, Content } = Layout
const { Title, Text } = Typography
const apiBaseUrl = runtimeConfig.apiBaseUrl

type ResumeRow = {
  key: string
  title: string
  owner: string
  locale: string
  completeness: number
  status: 'active' | 'archived'
}

type AdminRole = 'super_admin' | 'ops_admin' | 'viewer'

type ConfigAdminUserRow = {
  key: string
  email: string
  role: AdminRole
  status: 'enabled' | 'locked'
  lastSeen: string
}

type RegisteredUserRow = {
  key: string
  id: string
  email: string
  displayName?: string
  role: string
  status: 'enabled' | 'locked'
  plan: 'free' | 'pro'
  lastSeenAt?: string
  createdAt: string
  updatedAt: string
  workspace?: {
    id: string
    name: string
    plan: string
    role: string
    ownerUserId: string
    activeResumeId?: string
    createdAt: string
    updatedAt: string
  }
  resumeCount: number
  applicationCount: number
}

type RegisteredUserAction = 'lock' | 'unlock' | 'sessions' | 'plan-pro' | 'plan-free'

type ApplicationRow = {
  key: string
  company: string
  role: string
  stage: 'saved' | 'applied' | 'screen' | 'onsite' | 'offer' | 'rejected'
  match: number
}

type ApiRequestRow = {
  key: string
  requestId: string
  client: string
  route: string
  status: string
  score: number
  latencyMs: number
  documentId: string
  error: string
  replayCount: number
  createdAt: string
}

type PlatformClientRow = {
  key: string
  id: string
  scopes: string[]
  quotaPerDay: number | null
  rateLimitPerMinute: number | null
  hasKey: boolean
  requestCount: number
  failedRequestCount: number
  lastRequestAt: string | null
}

type PlatformUsageRow = {
  key: string
  clientId: string
  currency: string
  pricePerDraft: number
  totalRequests: number
  billableRequests: number
  failedRequests: number
  todayRequests: number
  quotaUtilization: number | null
  avgLatencyMs: number
  p95LatencyMs: number
  estimatedCost: number
}

type PlatformBillingSummary = {
  generatedAt: string
  currency: string
  totals: { clients: number; billableRequests: number; failedRequests: number; estimatedCost: number }
  clients: Omit<PlatformUsageRow, 'key'>[]
}

type AdminSession = {
  email: string
  role: AdminRole
  status: 'enabled' | 'locked'
  scopes: string[]
}

type ActivityRow = {
  key: string
  type: string
  tag: string
  message: string
  meta: string
  resumeId: string
  createdAt: string
}

type BackendState = {
  documents: Array<{
    id: string
    title: string
    data: {
      personal: { name?: string; title?: string; email?: string; phone?: string; summary?: string }
      experience?: unknown[]
      education?: unknown[]
      skills?: unknown[]
      projects?: unknown[]
    }
    config: { locale: string }
    archived: boolean
  }>
  applications: Array<{
    id: string
    company: string
    role: string
    stage: ApplicationRow['stage']
    match: number
  }>
  platformRequests: Array<{
    id: string
    requestId: string
    clientId?: string
    route: string
    status?: string
    persisted: boolean
    matchScore: number
    latencyMs?: number
    documentId?: string
    error?: string
    replayCount?: number
    createdAt?: string
  }>
  activityLog: Array<{
    id: string
    type: string
    tag: string
    message: string
    messageZh?: string
    meta?: string
    resumeId?: string
    createdAt: string
  }>
}

const configuredAdminUsers: ConfigAdminUserRow[] = [
  { key: 'u-root', email: 'owner@example.com', role: 'super_admin', status: 'enabled', lastSeen: 'just now' },
  { key: 'u-ops', email: 'ops@example.com', role: 'ops_admin', status: 'enabled', lastSeen: '2h ago' },
  { key: 'u-viewer', email: 'audit@example.com', role: 'viewer', status: 'locked', lastSeen: '7d ago' },
]

const resumeColumns: ColumnsType<ResumeRow> = [
  { title: '简历', dataIndex: 'title' },
  { title: '用户', dataIndex: 'owner' },
  { title: '语言', dataIndex: 'locale', render: (locale) => <Tag>{locale}</Tag> },
  { title: '完整度', dataIndex: 'completeness', render: (value) => <Progress percent={value} size="small" /> },
  { title: '状态', dataIndex: 'status', render: (status) => <Badge status={status === 'active' ? 'processing' : 'default'} text={status} /> },
]

const configuredAdminUserColumns: ColumnsType<ConfigAdminUserRow> = [
  { title: '账号', dataIndex: 'email' },
  { title: '角色', dataIndex: 'role', render: (role) => <Tag color={role === 'super_admin' ? 'red' : 'blue'}>{role}</Tag> },
  { title: '状态', dataIndex: 'status', render: (status) => <Badge status={status === 'enabled' ? 'success' : 'error'} text={status} /> },
  { title: '最近访问', dataIndex: 'lastSeen' },
]

const applicationColumns: ColumnsType<ApplicationRow> = [
  { title: '公司', dataIndex: 'company' },
  { title: '岗位', dataIndex: 'role' },
  { title: '阶段', dataIndex: 'stage', render: (stage) => <Tag color={stage === 'offer' ? 'green' : 'blue'}>{stage}</Tag> },
  { title: '匹配度', dataIndex: 'match', render: (value) => <Progress percent={value} size="small" /> },
]

const apiColumns: ColumnsType<ApiRequestRow> = [
  { title: 'Request ID', dataIndex: 'requestId' },
  { title: 'Client', dataIndex: 'client' },
  { title: 'Route', dataIndex: 'route' },
  { title: 'Status', dataIndex: 'status', render: (status) => <Tag color={status === 'persisted' ? 'green' : 'gold'}>{status}</Tag> },
  { title: 'Score', dataIndex: 'score' },
  { title: 'Latency', dataIndex: 'latencyMs', render: (value) => `${value || 0}ms` },
]

const platformClientColumns: ColumnsType<PlatformClientRow> = [
  { title: 'Client', dataIndex: 'id' },
  { title: 'Scopes', dataIndex: 'scopes', render: (scopes) => <Space wrap>{scopes.map((scope: string) => <Tag key={scope}>{scope}</Tag>)}</Space> },
  { title: 'Daily quota', dataIndex: 'quotaPerDay', render: (value) => value ?? 'unlimited' },
  { title: 'Rate / min', dataIndex: 'rateLimitPerMinute', render: (value) => value ?? 'unlimited' },
  { title: 'Key', dataIndex: 'hasKey', render: (hasKey) => <Badge status={hasKey ? 'success' : 'warning'} text={hasKey ? 'configured' : 'open'} /> },
  { title: 'Requests', dataIndex: 'requestCount' },
  { title: 'Failed', dataIndex: 'failedRequestCount', render: (value) => <Tag color={value ? 'red' : 'green'}>{value}</Tag> },
  { title: 'Last request', dataIndex: 'lastRequestAt', render: (value) => value ? new Date(value).toLocaleString() : 'none' },
]

const platformUsageColumns: ColumnsType<PlatformUsageRow> = [
  { title: 'Client', dataIndex: 'clientId' },
  { title: 'Billable', dataIndex: 'billableRequests' },
  { title: 'Failed', dataIndex: 'failedRequests', render: (value) => <Tag color={value ? 'red' : 'green'}>{value}</Tag> },
  { title: 'Today', dataIndex: 'todayRequests' },
  { title: 'Quota use', dataIndex: 'quotaUtilization', render: (value) => value == null ? 'n/a' : `${Math.round(value * 100)}%` },
  { title: 'Avg ms', dataIndex: 'avgLatencyMs' },
  { title: 'p95 ms', dataIndex: 'p95LatencyMs' },
  { title: 'Est. cost', dataIndex: 'estimatedCost', render: (value, row) => `${row.currency} ${value.toFixed(2)}` },
]

const activityColumns: ColumnsType<ActivityRow> = [
  { title: '时间', dataIndex: 'createdAt', render: (value) => new Date(value).toLocaleString() },
  { title: '类型', dataIndex: 'type', render: (type) => <Tag>{type}</Tag> },
  { title: '标签', dataIndex: 'tag' },
  { title: '事件', dataIndex: 'message' },
  { title: '对象', dataIndex: 'resumeId' },
  { title: '元数据', dataIndex: 'meta', ellipsis: true },
]

function resumeCompleteness(doc: BackendState['documents'][number]) {
  let score = 0
  const personal = doc.data.personal
  if (personal.name) score += 10
  if (personal.title) score += 10
  if (personal.email || personal.phone) score += 10
  if (personal.summary && personal.summary.length > 20) score += 15
  if (doc.data.experience?.length) score += 20
  if (doc.data.education?.length) score += 10
  if (doc.data.skills?.length) score += 15
  if (doc.data.projects?.length) score += 10
  return Math.min(100, score)
}

class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function apiErrorFromResponse(response: Response) {
  let detail = `${response.status} ${response.statusText}`
  try {
    const payload = await response.json() as { error?: unknown; message?: unknown; issues?: Array<{ path?: string; message?: string }> }
    if (typeof payload.error === 'string') {
      detail = payload.error
    } else if (typeof payload.message === 'string') {
      detail = payload.message
    } else if (Array.isArray(payload.issues) && payload.issues.length) {
      detail = payload.issues
        .map((issue) => `${issue.path ? `${issue.path}: ` : ''}${issue.message ?? 'Invalid value'}`)
        .join('; ')
    }
  } catch {
    // Keep the HTTP status fallback when the response is not JSON.
  }
  return new ApiError(response.status, detail)
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function formatDateTime(value?: string) {
  if (!value) return '未记录'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return value
  return date.toLocaleString()
}

function formatRelativeTime(value?: string) {
  if (!value) return '从未访问'
  const date = new Date(value)
  const time = date.getTime()
  if (!Number.isFinite(time)) return value

  const diffSeconds = Math.round((time - Date.now()) / 1000)
  const absoluteSeconds = Math.abs(diffSeconds)
  if (absoluteSeconds < 60) return '刚刚'

  const formatter = new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' })
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
  ]
  const [unit, secondsPerUnit] = units.find(([, secondsPerUnit]) => absoluteSeconds >= secondsPerUnit) ?? (['minute', 60] as [Intl.RelativeTimeFormatUnit, number])
  return formatter.format(Math.round(diffSeconds / secondsPerUnit), unit)
}

export default function App() {
  const [backendState, setBackendState] = useState<BackendState | null>(null)
  const [platformClients, setPlatformClients] = useState<PlatformClientRow[]>([])
  const [platformBilling, setPlatformBilling] = useState<PlatformBillingSummary | null>(null)
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUserRow[]>([])
  const [registeredUsersLoading, setRegisteredUsersLoading] = useState(false)
  const [registeredUsersError, setRegisteredUsersError] = useState('')
  const [userActionLoading, setUserActionLoading] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [adminToken, setAdminToken] = useState(() => window.sessionStorage.getItem('resume-admin-token') ?? '')
  const [loginToken, setLoginToken] = useState('')
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null)
  const [selectedMenu, setSelectedMenu] = useState('overview')
  const [clientFilter, setClientFilter] = useState('all')
  const [routeFilter, setRouteFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const isSuperAdmin = adminSession?.role === 'super_admin'

  function adminHeaders(token = adminToken) {
    return { 'x-admin-token': token }
  }

  async function loadRegisteredUsers(token = adminToken) {
    if (!token) return
    setRegisteredUsersLoading(true)
    setRegisteredUsersError('')
    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/users`, { headers: adminHeaders(token) })
      if (!response.ok) throw await apiErrorFromResponse(response)
      const users = await response.json() as Omit<RegisteredUserRow, 'key'>[]
      setRegisteredUsers(users.map((user) => ({ ...user, key: user.id })))
    } catch (error) {
      const detail = errorMessage(error)
      setRegisteredUsersError(detail)
      if (error instanceof ApiError && [401, 403].includes(error.status)) logout()
    } finally {
      setRegisteredUsersLoading(false)
    }
  }

  async function loadBackendState(token = adminToken, role = adminSession?.role) {
    if (!token) return
    setLoading(true)
    setLoadError('')
    try {
      const stateResponse = await fetch(`${apiBaseUrl}/api/admin/state`, { headers: adminHeaders(token) })
      if (!stateResponse.ok) throw await apiErrorFromResponse(stateResponse)
      setBackendState(await stateResponse.json() as BackendState)
      if (role === 'super_admin') {
        const clientsResponse = await fetch(`${apiBaseUrl}/api/admin/platform-clients`, { headers: adminHeaders(token) })
        if (!clientsResponse.ok) throw await apiErrorFromResponse(clientsResponse)
        const clientRows = await clientsResponse.json() as Omit<PlatformClientRow, 'key'>[]
        setPlatformClients(clientRows.map((client) => ({ ...client, key: client.id })))
        const usageResponse = await fetch(`${apiBaseUrl}/api/admin/platform-usage`, { headers: adminHeaders(token) })
        if (!usageResponse.ok) throw await apiErrorFromResponse(usageResponse)
        setPlatformBilling(await usageResponse.json() as PlatformBillingSummary)
      } else {
        setPlatformClients([])
        setPlatformBilling(null)
      }
    } catch (error) {
      setLoadError(errorMessage(error))
      if (error instanceof ApiError && [401, 403].includes(error.status)) logout()
    } finally {
      setLoading(false)
    }
  }

  async function refreshAdminData(token = adminToken, role = adminSession?.role) {
    await Promise.all([
      loadBackendState(token, role),
      loadRegisteredUsers(token),
    ])
  }

  async function authenticate(token = loginToken.trim()) {
    if (!token) {
      setLoadError('请输入管理端访问令牌')
      return
    }
    setLoading(true)
    setLoadError('')
    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/session`, { headers: adminHeaders(token) })
      if (!response.ok) throw await apiErrorFromResponse(response)
      const session = await response.json() as AdminSession
      window.sessionStorage.setItem('resume-admin-token', token)
      setAdminToken(token)
      setLoginToken('')
      setAdminSession(session)
      if (session.role !== 'super_admin' && ['permissions', 'platform', 'billing', 'deploy', 'data'].includes(selectedMenu)) {
        setSelectedMenu('overview')
      }
      await refreshAdminData(token, session.role)
    } catch (error) {
      setLoadError(errorMessage(error))
      setAdminSession(null)
      window.sessionStorage.removeItem('resume-admin-token')
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    window.sessionStorage.removeItem('resume-admin-token')
    setAdminToken('')
    setLoginToken('')
    setAdminSession(null)
    setBackendState(null)
    setPlatformClients([])
    setPlatformBilling(null)
    setRegisteredUsers([])
    setRegisteredUsersError('')
    setUserActionLoading('')
    setSelectedMenu('overview')
  }

  async function mutateRegisteredUser(user: RegisteredUserRow, action: RegisteredUserAction) {
    const actionKey = `${action}:${user.id}`
    setUserActionLoading(actionKey)
    try {
      const url = action === 'sessions'
        ? `${apiBaseUrl}/api/admin/users/${encodeURIComponent(user.id)}/sessions`
        : action.startsWith('plan-')
          ? `${apiBaseUrl}/api/admin/users/${encodeURIComponent(user.id)}/plan`
          : `${apiBaseUrl}/api/admin/users/${encodeURIComponent(user.id)}/${action}`
      const response = await fetch(url, {
        method: action === 'sessions' ? 'DELETE' : 'POST',
        headers: action.startsWith('plan-')
          ? { ...adminHeaders(), 'content-type': 'application/json' }
          : adminHeaders(),
        body: action.startsWith('plan-')
          ? JSON.stringify({ plan: action === 'plan-pro' ? 'pro' : 'free' })
          : undefined,
      })
      if (!response.ok) throw await apiErrorFromResponse(response)
      await loadRegisteredUsers()
      const actionLabel: Record<RegisteredUserAction, string> = {
        lock: '已锁定用户',
        unlock: '已解锁用户',
        sessions: '已强制下线用户',
        'plan-pro': '已开通 Pro',
        'plan-free': '已降级为 Free',
      }
      message.success(`${actionLabel[action]}：${user.email}`)
    } catch (error) {
      message.error(errorMessage(error))
    } finally {
      setUserActionLoading('')
    }
  }

  useEffect(() => {
    if (adminToken) void authenticate(adminToken)
  }, [])

  const resumes = useMemo<ResumeRow[]>(() =>
    (backendState?.documents ?? []).map((doc) => ({
      key: doc.id,
      title: doc.title,
      owner: doc.data.personal.email || doc.data.personal.name || 'local-workspace',
      locale: doc.config.locale,
      completeness: resumeCompleteness(doc),
      status: doc.archived ? 'archived' : 'active',
    })),
  [backendState])

  const applications = useMemo<ApplicationRow[]>(() =>
    (backendState?.applications ?? []).map((app) => ({
      key: app.id,
      company: app.company,
      role: app.role,
      stage: app.stage,
      match: app.match,
    })),
  [backendState])

  const apiRequests = useMemo<ApiRequestRow[]>(() =>
    (backendState?.platformRequests ?? []).map((request) => ({
      key: request.id,
      requestId: request.requestId || request.id,
      client: request.clientId || 'legacy',
      route: request.route,
      status: request.status || (request.persisted ? 'persisted' : 'draft'),
      score: request.matchScore,
      latencyMs: request.latencyMs ?? 0,
      documentId: request.documentId || '',
      error: request.error || '',
      replayCount: request.replayCount ?? 0,
      createdAt: request.createdAt || '',
    })),
  [backendState])

  const failedCount = apiRequests.filter((request) => request.status === 'failed').length

  const filteredApiRequests = useMemo(() =>
    apiRequests.filter((request) => {
      if (clientFilter !== 'all' && request.client !== clientFilter) return false
      if (routeFilter !== 'all' && request.route !== routeFilter) return false
      if (statusFilter !== 'all' && request.status !== statusFilter) return false
      return true
    }),
  [apiRequests, clientFilter, routeFilter, statusFilter])

  const clientOptions = useMemo(() => ['all', ...Array.from(new Set(apiRequests.map((request) => request.client)))], [apiRequests])
  const routeOptions = useMemo(() => ['all', ...Array.from(new Set(apiRequests.map((request) => request.route)))], [apiRequests])
  const statusOptions = useMemo(() => ['all', ...Array.from(new Set(apiRequests.map((request) => request.status)))], [apiRequests])

  const activityRows = useMemo<ActivityRow[]>(() =>
    (backendState?.activityLog ?? []).map((event) => ({
      key: event.id,
      type: event.type,
      tag: event.tag,
      message: event.messageZh || event.message,
      meta: event.meta || '',
      resumeId: event.resumeId || '',
      createdAt: event.createdAt,
    })),
  [backendState])

  const latestActivity = activityRows.slice(0, 8)
  const menuItems = [
    { key: 'overview', icon: <AppstoreOutlined />, label: '总览' },
    { key: 'users', icon: <TeamOutlined />, label: '用户 / 租户' },
    ...(isSuperAdmin
      ? [
          { key: 'permissions', icon: <SafetyCertificateOutlined />, label: '权限与密钥' },
          { key: 'platform', icon: <ApiOutlined />, label: '平台 API' },
          { key: 'billing', icon: <BarChartOutlined />, label: '平台计费' },
        ]
      : []),
    { key: 'resumes', icon: <FileTextOutlined />, label: '简历数据' },
    { key: 'applications', icon: <BarChartOutlined />, label: '投递数据' },
    ...(isSuperAdmin
      ? [
          { key: 'deploy', icon: <DeploymentUnitOutlined />, label: '部署状态' },
          { key: 'data', icon: <DatabaseOutlined />, label: '数据与配置' },
        ]
      : []),
    { key: 'audit', icon: <SafetyCertificateOutlined />, label: '审计日志' },
  ]

  function renderOverview() {
    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={6}>
          <Card><Statistic title="工作区 / 用户" value={backendState ? 1 : 0} suffix="个" /></Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card><Statistic title="简历文档" value={resumes.length} suffix="份" /></Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card><Statistic title="平台调用" value={apiRequests.length} suffix="次" /></Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card><Statistic title="失败 / 待处理" value={failedCount} suffix="项" valueStyle={{ color: failedCount ? '#cf1322' : '#3f8600' }} /></Card>
        </Col>

        <Col xs={24} xl={14}>
          <Card title="简历数据巡检" extra={<Button type="link" onClick={() => setSelectedMenu('resumes')}>查看全部</Button>}>
            <Table columns={resumeColumns} dataSource={resumes.slice(0, 5)} pagination={false} size="middle" loading={loading} />
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card title="平台 API 调用审计" extra={<Button type="link" onClick={() => setSelectedMenu('platform')}>查看全部</Button>}>
            <Table columns={apiColumns} dataSource={apiRequests.slice(0, 5)} pagination={false} size="middle" loading={loading} />
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="投递数据巡检">
            <Table columns={applicationColumns} dataSource={applications.slice(0, 5)} pagination={false} size="middle" loading={loading} />
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="最近审计事件" extra={<Button type="link" onClick={() => setSelectedMenu('audit')}>打开审计日志</Button>}>
            <Table columns={activityColumns} dataSource={latestActivity} pagination={false} size="small" loading={loading} />
          </Card>
        </Col>
      </Row>
    )
  }

  function renderUsers() {
    const registeredUserColumns: ColumnsType<RegisteredUserRow> = [
      {
        title: 'email / displayName',
        dataIndex: 'email',
        render: (email: string, user) => (
          <Space direction="vertical" size={0}>
            <Text strong>{email}</Text>
            <Text type="secondary">
              {user.displayName || '未设置 displayName'}
              {user.workspace ? ` · ${user.workspace.name}` : ''}
            </Text>
          </Space>
        ),
      },
      {
        title: 'plan',
        dataIndex: 'plan',
        render: (plan: RegisteredUserRow['plan']) => <Tag color={plan === 'pro' ? 'gold' : 'default'}>{plan}</Tag>,
      },
      {
        title: 'status',
        dataIndex: 'status',
        render: (status: RegisteredUserRow['status']) => (
          <Badge status={status === 'enabled' ? 'success' : 'error'} text={status} />
        ),
      },
      { title: '简历数', dataIndex: 'resumeCount', align: 'right' },
      { title: '投递数', dataIndex: 'applicationCount', align: 'right' },
      {
        title: '最近访问',
        dataIndex: 'lastSeenAt',
        render: (value?: string) => <Text title={formatDateTime(value)}>{formatRelativeTime(value)}</Text>,
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        render: (value: string) => formatDateTime(value),
      },
    ]

    if (isSuperAdmin) {
      registeredUserColumns.push({
        title: '操作',
        key: 'actions',
        fixed: 'right',
        render: (_, user) => {
          const lockAction = user.status === 'locked' ? 'unlock' : 'lock'
          const planAction = user.plan === 'pro' ? 'plan-free' : 'plan-pro'
          const isActionLoading = (action: RegisteredUserAction) => userActionLoading === `${action}:${user.id}`
          return (
            <Space wrap>
              {lockAction === 'unlock' ? (
                <Button
                  icon={<UnlockOutlined />}
                  loading={isActionLoading('unlock')}
                  onClick={() => void mutateRegisteredUser(user, 'unlock')}
                >
                  解锁
                </Button>
              ) : (
                <Popconfirm
                  title="确认锁定该用户？"
                  description="锁定后会立即吊销该用户全部 session。"
                  okText="锁定"
                  cancelText="取消"
                  onConfirm={() => void mutateRegisteredUser(user, 'lock')}
                >
                  <Button danger icon={<LockOutlined />} loading={isActionLoading('lock')}>锁定</Button>
                </Popconfirm>
              )}

              <Popconfirm
                title="确认强制下线该用户？"
                description="该用户当前全部 session 会被吊销，账号状态不变。"
                okText="强制下线"
                cancelText="取消"
                onConfirm={() => void mutateRegisteredUser(user, 'sessions')}
              >
                <Button danger icon={<LogoutOutlined />} loading={isActionLoading('sessions')}>强制下线</Button>
              </Popconfirm>

              {planAction === 'plan-pro' ? (
                <Button
                  icon={<CrownOutlined />}
                  loading={isActionLoading('plan-pro')}
                  onClick={() => void mutateRegisteredUser(user, 'plan-pro')}
                >
                  开通 Pro
                </Button>
              ) : (
                <Popconfirm
                  title="确认降级为 Free？"
                  description="降级会立即撤销该用户的 Pro 权益。"
                  okText="降级"
                  cancelText="取消"
                  onConfirm={() => void mutateRegisteredUser(user, 'plan-free')}
                >
                  <Button danger icon={<CrownOutlined />} loading={isActionLoading('plan-free')}>降级 Free</Button>
                </Popconfirm>
              )}
            </Space>
          )
        },
      })
    }

    return (
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card
            title="注册终端用户"
            extra={
              <Button
                icon={<ReloadOutlined />}
                loading={registeredUsersLoading}
                onClick={() => void loadRegisteredUsers()}
              >
                刷新用户
              </Button>
            }
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {!isSuperAdmin && (
                <Alert
                  type="info"
                  showIcon
                  message="当前管理员角色为只读"
                  description="viewer / ops_admin 可以查看注册用户，锁定、强制下线和套餐调整仅 super_admin 可操作。"
                />
              )}
              {registeredUsersError && (
                <Alert
                  type="error"
                  showIcon
                  message="注册用户加载失败"
                  description={registeredUsersError}
                />
              )}
              <Spin spinning={registeredUsersLoading}>
                <Table
                  columns={registeredUserColumns}
                  dataSource={registeredUsers}
                  size="middle"
                  scroll={{ x: 1120 }}
                  locale={{
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={registeredUsersError ? '无法展示注册用户' : '暂无注册用户'}
                      />
                    ),
                  }}
                />
              </Spin>
            </Space>
          </Card>
        </Col>

        <Col xs={24}>
          <Card
            title="配置管理员（环境变量）"
            extra={<Button icon={<KeyOutlined />} onClick={() => setSelectedMenu('permissions')}>管理密钥</Button>}
          >
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              message="这里展示的是管理端访问账号配置，不是注册终端用户。"
              description="这些账号来自 RESUME_ADMIN_USERS / RESUME_ADMIN_TOKEN，用于登录 admin 控制台。"
            />
            <Table columns={configuredAdminUserColumns} dataSource={configuredAdminUsers} pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>
    )
  }

  function renderPermissions() {
    return (
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card title="平台 API Clients" extra={<Text type="secondary">密钥不会下发到管理端</Text>}>
            <Table columns={platformClientColumns} dataSource={platformClients} pagination={false} size="middle" loading={loading} />
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="角色权限">
            <Table columns={configuredAdminUserColumns} dataSource={configuredAdminUsers} pagination={false} size="middle" />
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="API Key 运维">
            <Alert type="info" showIcon message="Client 元数据已接入后端配置" description="当前支持查看 scopes、quota、rate limit 和调用量；新增、轮换、吊销 key 仍需后续接入认证、审计和密钥哈希存储。" />
          </Card>
        </Col>
      </Row>
    )
  }

  function renderPlatform() {
    return (
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card
            title="平台 API 请求日志"
            extra={
              <Space wrap>
                <Select value={clientFilter} onChange={setClientFilter} style={{ width: 150 }} options={clientOptions.map((value) => ({ value, label: value === 'all' ? 'All clients' : value }))} />
                <Select value={routeFilter} onChange={setRouteFilter} style={{ width: 170 }} options={routeOptions.map((value) => ({ value, label: value === 'all' ? 'All routes' : value }))} />
                <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 150 }} options={statusOptions.map((value) => ({ value, label: value === 'all' ? 'All statuses' : value }))} />
              </Space>
            }
          >
            <Table
              columns={apiColumns}
              dataSource={filteredApiRequests}
              size="middle"
              loading={loading}
              expandable={{
                expandedRowRender: (record) => (
                  <Descriptions column={2} size="small">
                    <Descriptions.Item label="Request ID">{record.requestId}</Descriptions.Item>
                    <Descriptions.Item label="Client">{record.client}</Descriptions.Item>
                    <Descriptions.Item label="Document">{record.documentId || 'not persisted'}</Descriptions.Item>
                    <Descriptions.Item label="Replay count">{record.replayCount}</Descriptions.Item>
                    <Descriptions.Item label="Created at">{record.createdAt ? new Date(record.createdAt).toLocaleString() : 'unknown'}</Descriptions.Item>
                    <Descriptions.Item label="Error">{record.error || 'none'}</Descriptions.Item>
                  </Descriptions>
                ),
              }}
            />
          </Card>
        </Col>
      </Row>
    )
  }

  function renderBilling() {
    const usageRows: PlatformUsageRow[] = (platformBilling?.clients ?? []).map((client) => ({ ...client, key: client.clientId }))
    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card><Statistic title="计费客户" value={platformBilling?.totals.clients ?? 0} suffix="个" /></Card>
        </Col>
        <Col xs={24} md={8}>
          <Card><Statistic title="计费调用" value={platformBilling?.totals.billableRequests ?? 0} suffix="次" /></Card>
        </Col>
        <Col xs={24} md={8}>
          <Card><Statistic title="预估账单" value={platformBilling?.totals.estimatedCost ?? 0} prefix={platformBilling?.currency ?? 'USD'} precision={2} /></Card>
        </Col>
        <Col xs={24}>
          <Card
            title="按客户用量与计费"
            extra={<Text type="secondary">{platformBilling ? `更新于 ${new Date(platformBilling.generatedAt).toLocaleString()}` : ''}</Text>}
          >
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              message="计费基于非失败调用数 × 单次价格"
              description="单次价格、币种来自 RESUME_PLATFORM_CLIENTS 的 pricePerDraft / currency；失败调用不计费。这是 B2B 第二曲线的用量与对账基础。"
            />
            <Table columns={platformUsageColumns} dataSource={usageRows} pagination={false} size="middle" loading={loading} />
          </Card>
        </Col>
      </Row>
    )
  }

  function renderResumes() {
    return (
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card title="简历文档">
            <Table columns={resumeColumns} dataSource={resumes} size="middle" loading={loading} />
          </Card>
        </Col>
      </Row>
    )
  }

  function renderApplications() {
    return (
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card title="投递记录">
            <Table columns={applicationColumns} dataSource={applications} size="middle" loading={loading} />
          </Card>
        </Col>
      </Row>
    )
  }

  function renderDeploy() {
    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card title="部署入口">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="C 端地址">{runtimeConfig.frontend.consumerUrl}</Descriptions.Item>
              <Descriptions.Item label="管理端地址">{runtimeConfig.frontend.adminUrl}</Descriptions.Item>
              <Descriptions.Item label="后端接口">{apiBaseUrl}</Descriptions.Item>
              <Descriptions.Item label="部署文件">code/backend/deploy</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="危险操作">
            <Space>
              <Popconfirm title="确认重新拉取后端数据？" okText="确认" cancelText="取消" onConfirm={() => void refreshAdminData()}>
                <Button danger>重新同步运行态</Button>
              </Popconfirm>
              <Popconfirm title="确认导出当前审计视图？" okText="确认" cancelText="取消">
                <Button>导出审计快照</Button>
              </Popconfirm>
            </Space>
          </Card>
        </Col>
      </Row>
    )
  }

  function renderData() {
    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card title="共享配置状态">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="C 端">code/front/config</Descriptions.Item>
              <Descriptions.Item label="管理端">code/admin/config</Descriptions.Item>
              <Descriptions.Item label="后端接口">code/backend/config</Descriptions.Item>
              <Descriptions.Item label="同步脚本">scripts/sync-config.mjs</Descriptions.Item>
              <Descriptions.Item label="SQL 文件">code/backend/sql/001_initial_schema.sql</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>
    )
  }

  function renderAudit() {
    return (
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card title="审计日志">
            <Table columns={activityColumns} dataSource={activityRows} size="middle" loading={loading} />
          </Card>
        </Col>
      </Row>
    )
  }

  function renderSelectedPage() {
    if (!isSuperAdmin && ['permissions', 'platform', 'billing', 'deploy', 'data'].includes(selectedMenu)) {
      return (
        <Alert
          type="warning"
          showIcon
          message="当前角色无权访问该页面"
          description="只有 super_admin 可以查看平台密钥、API client、部署和配置等敏感页面。"
        />
      )
    }
    if (selectedMenu === 'users') return renderUsers()
    if (selectedMenu === 'permissions') return renderPermissions()
    if (selectedMenu === 'platform') return renderPlatform()
    if (selectedMenu === 'billing') return renderBilling()
    if (selectedMenu === 'resumes') return renderResumes()
    if (selectedMenu === 'applications') return renderApplications()
    if (selectedMenu === 'deploy') return renderDeploy()
    if (selectedMenu === 'data') return renderData()
    if (selectedMenu === 'audit') return renderAudit()
    return renderOverview()
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#3e7891',
          borderRadius: 6,
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
      }}
    >
      {!adminSession ? (
        <div className="admin-login">
          <Card title="超管登录" className="admin-login__card">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Text type="secondary">输入后端配置的管理端访问令牌，进入真实运营控制台。</Text>
              <Input.Password
                placeholder="Admin access token"
                value={loginToken}
                onChange={(event) => setLoginToken(event.target.value)}
                onPressEnter={() => void authenticate()}
              />
              {loadError && <Alert type="error" showIcon message="登录失败" description={loadError} />}
              <Button type="primary" block loading={loading} onClick={() => void authenticate()}>
                登录
              </Button>
            </Space>
          </Card>
        </div>
      ) : (
      <Layout className="admin-shell">
        <Sider width={236} className="admin-sider">
          <div className="admin-brand">
            <div className="admin-brand__mark">R</div>
            <div>
              <strong>Resume Studio</strong>
              <span>Super Admin</span>
            </div>
          </div>
          <Menu
            mode="inline"
            selectedKeys={[selectedMenu]}
            onClick={({ key }) => setSelectedMenu(key)}
            items={menuItems}
          />
        </Sider>

        <Layout>
          <Header className="admin-header">
            <div>
              <Title level={3}>超管控制台</Title>
              <Text type="secondary">全局用户、权限、平台调用、配置同步和部署数据入口</Text>
            </div>
            <Space>
              <Tag color={isSuperAdmin ? 'red' : 'blue'}>{adminSession.role}</Tag>
              <Tag>{adminSession.email}</Tag>
              <Tag color="blue">API: {apiBaseUrl.replace(/^https?:\/\//, '')}</Tag>
              <Button icon={<CloudSyncOutlined />} loading={loading || registeredUsersLoading} onClick={() => void refreshAdminData()}>刷新真实数据</Button>
              <Button onClick={logout}>退出</Button>
            </Space>
          </Header>

          <Content className="admin-content">
            <Row gutter={[16, 16]}>
              <Col xs={24}>
                <Alert
                  type={loadError ? 'error' : 'info'}
                  showIcon
                  message={loadError ? '后端数据连接失败' : '超管入口已接入运行态数据'}
                  description={loadError || '简历、投递、平台调用和活动统计来自后端 admin API；敏感页面仅 super_admin 可访问。'}
                />
              </Col>
              <Col xs={24}>
                {renderSelectedPage()}
              </Col>

              <Col xs={24}>
                <Card>
                  <Flex justify="space-between" align="center">
                    <div>
                      <Title level={5}>下一步</Title>
                      <Text type="secondary">优先接入超管登录、API Key 管理写接口、危险操作真实审计和部署健康检查。</Text>
                    </div>
                    <Button type="primary" onClick={() => setSelectedMenu('audit')}>打开审计日志</Button>
                  </Flex>
                </Card>
              </Col>
            </Row>
          </Content>
        </Layout>
      </Layout>
      )}
    </ConfigProvider>
  )
}
