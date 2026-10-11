import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Shell } from './components/Shell';
import { useBank } from './context/BankContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Accounts } from './pages/Accounts';
import { AccountDetail } from './pages/AccountDetail';
import { Transfer } from './pages/Transfer';
import { MultipleTransfer } from './pages/Multiple';
import { Bulk } from './pages/Bulk';
import { Bills } from './pages/Bills';
import { Beneficiaries } from './pages/Beneficiaries';
import { History } from './pages/History';
import { Statements } from './pages/Statements';
import { Loans } from './pages/Loans';
import { Security } from './pages/Security';
import { Button } from './components/ui';
import { Link } from 'react-router-dom';

function RequireAuth() {
  const { session, profile } = useBank();
  if (!session || !profile) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-16">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-800/60">404</p>
      <h1 className="mt-2 font-serif text-3xl text-pine">This page is not on the platform.</h1>
      <Link to="/" className="mt-6 inline-flex"><Button>Return to dashboard</Button></Link>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route element={<Shell />}>
          <Route index element={<Dashboard />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="accounts/:accountId" element={<AccountDetail />} />
          <Route path="transfers" element={<Transfer />} />
          <Route path="multiple" element={<MultipleTransfer />} />
          <Route path="bulk" element={<Bulk />} />
          <Route path="bills" element={<Bills />} />
          <Route path="beneficiaries" element={<Beneficiaries />} />
          <Route path="history" element={<History />} />
          <Route path="statements" element={<Statements />} />
          <Route path="credit" element={<Loans />} />
          <Route path="security" element={<Security />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
