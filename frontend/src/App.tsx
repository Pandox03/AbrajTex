import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import RoleRoute from './components/layout/RoleRoute'
import ClientDetailPage from './pages/ClientDetailPage'
import ClientsPage from './pages/ClientsPage'
import ContainerDetailPage from './pages/ContainerDetailPage'
import ContainersPage from './pages/ContainersPage'
import FabricTypesPage from './pages/FabricTypesPage'
import GenerateInvoicePage from './pages/GenerateInvoicePage'
import HomePage from './pages/HomePage'
import InvoicesPage from './pages/InvoicesPage'
import LoginPage from './pages/LoginPage'
import LogsPage from './pages/LogsPage'
import NewSalePage from './pages/NewSalePage'
import PaymentsPage from './pages/PaymentsPage'
import SalesPage from './pages/SalesPage'
import StockPage from './pages/StockPage'
import UsersPage from './pages/UsersPage'
import ProfilePage from './pages/ProfilePage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/secretaire" element={<Navigate to="/login" replace />} />

      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/profile" element={<ProfilePage />} />

        <Route element={<RoleRoute roles={['admin', 'secretaire', 'comptable']} />}>
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/clients/:id" element={<ClientDetailPage />} />
        </Route>

        <Route element={<RoleRoute roles={['admin', 'comptable']} />}>
          <Route path="/payments" element={<PaymentsPage />} />
        </Route>

        <Route element={<RoleRoute roles={['admin', 'secretaire']} />}>
          <Route path="/containers" element={<ContainersPage />} />
          <Route path="/containers/:id" element={<ContainerDetailPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/invoices/generer" element={<GenerateInvoicePage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/sales/new" element={<NewSalePage />} />
          <Route path="/stock" element={<StockPage />} />
          <Route path="/fabric-types" element={<FabricTypesPage />} />
        </Route>

        <Route element={<RoleRoute roles={['admin']} />}>
          <Route path="/users" element={<UsersPage />} />
          <Route path="/logs" element={<LogsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
