import {
  ApiOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  CloudSyncOutlined,
  DatabaseOutlined,
  DeploymentUnitOutlined,
  KeyOutlined,
  SafetyCertificateOutlined,
  FileTextOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Col,
  ConfigProvider,
  Descriptions,
  Flex,
  Layout,
  Menu,
  Alert,
  Progress,
  Row,
  Space,
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

type AdminUserRow = {
  key: string
  email: string
  role: 'super_admin' | 'ops_admin' | 'viewer'
  status: 'enabled' | 'locked'
  lastSeen: string
}

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
  }>
  activityLog: unknown[]
}

const adminUsers: AdminUserRow[] = [
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

const adminUserColumns: ColumnsType<AdminUserRow> = [
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

export default function App() {
  const [backendState, setBackendState] = useState<BackendState | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  async function loadBackendState() {
    setLoading(true)
    setLoadError('')
    try {
      const response = await fetch(`${apiBaseUrl}/api/state`)
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      setBackendState(await response.json() as BackendState)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadBackendState()
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
    })),
  [backendState])

  const failedCount = apiRequests.filter((request) => request.status === 'failed').length

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
            selectedKeys={['overview']}
            items={[
              { key: 'overview', icon: <AppstoreOutlined />, label: '总览' },
              { key: 'users', icon: <TeamOutlined />, label: '用户 / 租户' },
              { key: 'permissions', icon: <SafetyCertificateOutlined />, label: '权限与密钥' },
              { key: 'platform', icon: <ApiOutlined />, label: '平台 API' },
              { key: 'resumes', icon: <FileTextOutlined />, label: '简历数据' },
              { key: 'applications', icon: <BarChartOutlined />, label: '投递数据' },
              { key: 'deploy', icon: <DeploymentUnitOutlined />, label: '部署状态' },
              { key: 'data', icon: <DatabaseOutlined />, label: '数据与配置' },
            ]}
          />
        </Sider>

        <Layout>
          <Header className="admin-header">
            <div>
              <Title level={3}>超管控制台</Title>
              <Text type="secondary">全局用户、权限、平台调用、配置同步和部署数据入口</Text>
            </div>
            <Space>
              <Tag color="red">SUPER ADMIN</Tag>
              <Tag color="blue">API: {apiBaseUrl.replace(/^https?:\/\//, '')}</Tag>
              <Button icon={<CloudSyncOutlined />} loading={loading} onClick={loadBackendState}>刷新真实数据</Button>
            </Space>
          </Header>

          <Content className="admin-content">
            <Row gutter={[16, 16]}>
              <Col xs={24}>
                <Alert
                  type={loadError ? 'error' : 'info'}
                  showIcon
                  message={loadError ? '后端数据连接失败' : '超管入口已接入运行态数据'}
                  description={loadError || '简历、投递、平台调用和活动统计来自后端 /api/state；用户、权限和危险操作仍需后续接入认证、二次确认与审计。'}
                />
              </Col>

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
                <Card title="超管账号与权限" extra={<Button icon={<KeyOutlined />}>管理密钥</Button>}>
                  <Table columns={adminUserColumns} dataSource={adminUsers} pagination={false} size="middle" />
                </Card>
              </Col>

              <Col xs={24} xl={10}>
                <Card title="系统控制面板">
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="C 端地址">{runtimeConfig.frontend.consumerUrl}</Descriptions.Item>
                    <Descriptions.Item label="管理端地址">{runtimeConfig.frontend.adminUrl}</Descriptions.Item>
                    <Descriptions.Item label="后端接口">{apiBaseUrl}</Descriptions.Item>
                    <Descriptions.Item label="SQL 文件">code/backend/sql/001_initial_schema.sql</Descriptions.Item>
                    <Descriptions.Item label="部署文件">code/backend/deploy</Descriptions.Item>
                    <Descriptions.Item label="配置同步">scripts/sync-config.mjs</Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>

              <Col xs={24} xl={14}>
                <Card title="简历数据巡检" extra={<Button type="link">查看全部</Button>}>
                  <Table columns={resumeColumns} dataSource={resumes} pagination={false} size="middle" loading={loading} />
                </Card>
              </Col>

              <Col xs={24} xl={10}>
                <Card title="共享配置状态">
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="C 端">code/front/config</Descriptions.Item>
                    <Descriptions.Item label="管理端">code/admin/config</Descriptions.Item>
                    <Descriptions.Item label="后端接口">code/backend/config</Descriptions.Item>
                    <Descriptions.Item label="同步脚本">scripts/sync-config.mjs</Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>

              <Col xs={24} xl={12}>
                <Card title="投递数据巡检">
                  <Table columns={applicationColumns} dataSource={applications} pagination={false} size="middle" loading={loading} />
                </Card>
              </Col>

              <Col xs={24} xl={12}>
                <Card title="平台 API 调用审计">
                  <Table columns={apiColumns} dataSource={apiRequests} pagination={false} size="middle" loading={loading} />
                </Card>
              </Col>

              <Col xs={24}>
                <Card>
                  <Flex justify="space-between" align="center">
                    <div>
                      <Title level={5}>下一步</Title>
                      <Text type="secondary">优先接入超管登录、API Key 管理、危险操作二次确认、调用审计和部署健康检查。</Text>
                    </div>
                    <Button type="primary">打开审计日志</Button>
                  </Flex>
                </Card>
              </Col>
            </Row>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  )
}
