import { Component } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { BankProvider } from './context/BankContext';
import { STORAGE_KEY } from './data/catalog';
import './index.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto max-w-lg px-6 py-24">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-800">Oakwood Finance</p>
        <h1 className="mt-2 font-serif text-3xl text-pine">This view could not be rendered.</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">The specimen ledger stored in this browser may be out of date. Restoring it clears local instructions and reloads the opening balances.</p>
        <button
          type="button"
          className="mt-6 h-9 rounded-md bg-pine px-3 text-sm text-white"
          onClick={() => {
            localStorage.removeItem(STORAGE_KEY);
            window.location.href = '/';
          }}
        >
          Restore specimen
        </button>
      </div>
    );
  }
}

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <BankProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </BankProvider>
  </ErrorBoundary>,
);
