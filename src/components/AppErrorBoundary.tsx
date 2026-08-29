import { Component, type ErrorInfo, type ReactNode } from 'react';
import { CircleAlert, RotateCcw } from 'lucide-react';

export class AppErrorBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Workbench renderer crashed', error, info.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    return <main className="fatal-screen"><section><CircleAlert size={34} /><span className="eyebrow">界面发生错误</span><h1>写作数据没有被覆盖</h1><p>当前页面渲染失败，但正文和 Git 仓库仍保留在磁盘。重新加载工作台后再继续；如果问题复现，请保留下面的错误信息。</p><pre>{this.state.error.message}</pre><button onClick={() => window.location.reload()}><RotateCcw size={16} />重新加载工作台</button></section></main>;
  }
}

export function BridgeMissing() {
  return <main className="fatal-screen"><section><CircleAlert size={34} /><span className="eyebrow">桌面桥接未加载</span><h1>工作台没有进入文件系统</h1><p>Electron 预加载脚本没有成功连接。请从终端执行 <code>npm run dev</code>，不要直接刷新 Electron 内部页面。</p><button onClick={() => window.location.reload()}><RotateCcw size={16} />重新检查</button></section></main>;
}
