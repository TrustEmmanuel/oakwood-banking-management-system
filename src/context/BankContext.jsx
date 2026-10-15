import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { buildSeed, loadState, saveState } from '../data/seed';
import {
  applyBill,
  applyCardRequest,
  applyBulk,
  applyForCredit,
  applyTransfer,
  authenticate,
  changePassword,
  changePin,
  currentProfile,
  drawFacility,
  recordAudit,
  removeBeneficiary,
  repayFacility,
  restoreDemo,
  saveBeneficiary,
  setMfa,
  signOut,
} from '../lib/ledger';
import { netWorthUsd } from '../lib/money';

const BankContext = createContext(null);

function init() {
  return loadState() || buildSeed(null);
}

export function BankProvider({ children }) {
  const [state, dispatch] = useState(init);
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    try {
      saveState(state);
    } catch {
      /* The specimen still works for this tab if storage is full. */
    }
  }, [state]);

  function notify(message) {
    setToast(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2800);
  }

  function commit(result, successMessage) {
    if (result?.state && result.state !== state) dispatch(result.state);
    if (result?.ok && successMessage) notify(successMessage);
    return result;
  }

  const profile = currentProfile(state);
  const value = {
    snapshot: state,
    session: state.session,
    profile,
    profiles: state.profiles,
    accounts: state.accounts,
    transactions: state.transactions,
    beneficiaries: state.beneficiaries,
    cards: state.cards || [],
    facilities: state.facilities,
    applications: state.applications,
    audit: state.audit,
    navUsd: netWorthUsd(state.accounts),
    toast,
    notify,
    login: (input) => commit(authenticate(state, input)),
    logout: () => dispatch(signOut(state)),
    resetDemo: () => commit({ ok: true, state: restoreDemo(state) }, 'Specimen data restored.'),
    transfer: (input) => commit(applyTransfer(state, input)),
    bulk: (input) => commit(applyBulk(state, input)),
    payBill: (input) => commit(applyBill(state, input)),
    requestCard: (input) => commit(applyCardRequest(state, input)),
    saveBeneficiary: (input) => commit(saveBeneficiary(state, input), 'Beneficiary saved.'),
    removeBeneficiary: (input) => commit(removeBeneficiary(state, input), 'Beneficiary removed.'),
    updatePassword: (input) => commit(changePassword(state, input), 'Password updated.'),
    updatePin: (input) => commit(changePin(state, input), 'Transaction PIN updated.'),
    updateMfa: (patch) => commit(setMfa(state, patch), 'Sign-in preferences saved.'),
    drawFacility: (input) => commit(drawFacility(state, input)),
    repayFacility: (input) => commit(repayFacility(state, input)),
    applyCredit: (input) => commit(applyForCredit(state, input), 'Credit request submitted.'),
    record: (action, detail) => dispatch(recordAudit(state, action, detail)),
  };

  return <BankContext.Provider value={value}>{children}</BankContext.Provider>;
}

export function useBank() {
  const context = useContext(BankContext);
  if (!context) throw new Error('useBank must be used within BankProvider');
  return context;
}
