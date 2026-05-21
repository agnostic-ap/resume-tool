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

const { Header, Sider, Content } = Layout
const { Title, Text } = Typography

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
  status: 'persisted' | 'draft'
  score: number
}

const resumes: ResumeRow[] = [
  { key: 'resume-main', title: 'Frontend Engineer', owner: 'demo-user', locale: 'zh-CN', completeness: 92, status: 'active' },
  { key: 'resume-staff', title: 'Staff Platform Draft', owner: 'demo-user', locale: 'en-US', completeness: 86, status: 'active' },
  { key: 'resume-archive', title: '2024 Product Resume', owner: 'demo-user', locale: 'zh-CN', completeness: 74, status: 'archived' },
]

const adminUsers: AdminUserRow[] = [
  { key: 'u-root', email: 'owner@example.com', role: 'super_admin', status: 'enabled', lastSeen: 'just now' },
  { key: 'u-ops', email: 'ops@example.com', role: 'ops_admin', status: 'enabled', lastSeen: '2h ago' },
  { key: 'u-viewer', email: 'audit@example.com', role: 'viewer', status: 'locked', lastSeen: '7d ago' },
]

const applications: ApplicationRow[] = [
  { key: 'app-vercel', company: 'Vercel', role: 'Senior Frontend', stage: 'onsite', match: 92 },
  { key: 'app-stripe', company: 'Stripe', role: 'Full-Stack Engineer', stage: 'screen', match: 84 },
  { key: 'app-linear', company: 'Linear', role: 'Staff Engineer', stage: 'offer', match: 96 },
]

const apiRequests: ApiRequestRow[] = [
  { key: 'req-001', requestId: 'jd-run-001', client: 'FutureHire', route: '/api/v1/resume-drafts', status: 'persisted', score: 91 },
  { key: 'req-002', requestId: 'jd-run-002', client: 'TalentGraph', route: '/api/assistant/resume-drafts', status: 'draft', score: 82 },
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
]

export default function App() {
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
              <Tag color="blue">API: 127.0.0.1:8787</Tag>
              <Button icon={<CloudSyncOutlined />}>同步主仓库配置</Button>
            </Space>
          </Header>

          <Content className="admin-content">
            <Row gutter={[16, 16]}>
              <Col xs={24}>
                <Alert
                  type="warning"
                  showIcon
                  message="超管入口"
                  description="这里面向平台所有者使用，后续必须接入登录、二次确认、审计日志和按操作分级的权限控制。"
                />
              </Col>

              <Col xs={24} md={12} xl={6}>
                <Card><Statistic title="用户 / 租户" value={18} suffix="个" /></Card>
              </Col>
              <Col xs={24} md={12} xl={6}>
                <Card><Statistic title="简历文档" value={128} suffix="份" /></Card>
              </Col>
              <Col xs={24} md={12} xl={6}>
                <Card><Statistic title="平台调用" value={319} suffix="次" /></Card>
              </Col>
              <Col xs={24} md={12} xl={6}>
                <Card><Statistic title="失败 / 待处理" value={3} suffix="项" valueStyle={{ color: '#cf1322' }} /></Card>
              </Col>

              <Col xs={24} xl={14}>
                <Card title="超管账号与权限" extra={<Button icon={<KeyOutlined />}>管理密钥</Button>}>
                  <Table columns={adminUserColumns} dataSource={adminUsers} pagination={false} size="middle" />
                </Card>
              </Col>

              <Col xs={24} xl={10}>
                <Card title="系统控制面板">
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="C 端仓库">code/front</Descriptions.Item>
                    <Descriptions.Item label="管理端仓库">code/admin</Descriptions.Item>
                    <Descriptions.Item label="后端接口仓库">code/backend</Descriptions.Item>
                    <Descriptions.Item label="SQL 文件">code/backend/sql/001_initial_schema.sql</Descriptions.Item>
                    <Descriptions.Item label="部署文件">code/backend/deploy</Descriptions.Item>
                    <Descriptions.Item label="配置同步">scripts/sync-config.mjs</Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>

              <Col xs={24} xl={14}>
                <Card title="简历数据巡检" extra={<Button type="link">查看全部</Button>}>
                  <Table columns={resumeColumns} dataSource={resumes} pagination={false} size="middle" />
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
                  <Table columns={applicationColumns} dataSource={applications} pagination={false} size="middle" />
                </Card>
              </Col>

              <Col xs={24} xl={12}>
                <Card title="平台 API 调用审计">
                  <Table columns={apiColumns} dataSource={apiRequests} pagination={false} size="middle" />
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
