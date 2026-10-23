import { Component, type ReactNode } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { loadLocale, type Locale } from "../services/i18n";
import { recoveryCopy } from "../services/recoveryCopy";
import { recoverModuleLoad } from "../services/screenRecovery";

export function AppRecoveryScreen({ locale = loadLocale(), onRetry = () => window.location.reload() }: { locale?: Locale; onRetry?: () => void }) {
  const text = recoveryCopy(locale);
  return <main className="app-recovery" role="alert"><section><TriangleAlert size={30} aria-hidden="true" /><h1>{text.title}</h1><p>{text.body}</p><button className="primary-action" type="button" onClick={onRetry}><RefreshCw size={18} />{text.retry}</button></section></main>;
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { recoverModuleLoad(error); }
  render() { return this.state.failed ? <AppRecoveryScreen /> : this.props.children; }
}
