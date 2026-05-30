/**
 * MediGenius — 老年人医疗问诊 Agent
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import './index.css';

function formatTimeAgo(timestamp) {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return past.toLocaleDateString();
}

function buildDownloadText(chatHistory) {
  let content = 'MediGenius Chat Export\n';
  content += '='.repeat(50) + '\n\n';
  chatHistory.forEach((msg) => {
    content += `[${msg.timestamp}] ${msg.type === 'user' ? 'You' : 'MediGenius'}:\n`;
    content += msg.content + '\n';
    if (msg.source) content += `Source: ${msg.source}\n`;
    content += '\n';
  });
  return content;
}

function Sidebar({ sidebarOpen, sessions, currentSessionId, onNewChat, onLoadSession, onDeleteSession, onToggleTheme, theme }) {
  return (
    <aside className={`sidebar glass-effect${sidebarOpen ? '' : ' collapsed'}`}>
      <div className="sidebar-content">
        <div className="sidebar-header">
          <div className="logo-wrapper">
            <div className="logo-animated">
              <div className="logo-pulse" />
              <i className="fas fa-heartbeat" />
            </div>
            <div className="logo-text">
              <h1>健康助手</h1>
              <span className="version">老年人医疗问诊 v1.0</span>
            </div>
          </div>
          <button className="new-chat-btn" onClick={onNewChat}>
            <i className="fas fa-plus" />
            <span>新对话</span>
          </button>
        </div>
        <div className="chat-history-section">
          <div className="section-header">
            <span>历史对话</span>
            <div className="section-line" />
          </div>
          <div className="chat-list">
            {sessions === null ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                <div className="loading-spinner" style={{ margin: '0 auto 10px' }} />加载中...
              </div>
            ) : sessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-tertiary)', fontSize: '13px' }}>暂无历史对话</div>
            ) : (
              sessions.map((session) => (
                <div key={session.session_id} className={`chat-item${currentSessionId === session.session_id ? ' active' : ''}`} onClick={() => onLoadSession(session.session_id)}>
                  <i className="fas fa-message" />
                  <div className="chat-item-content">
                    <div className="chat-item-title">{session.preview || '新对话'}</div>
                    <div className="chat-item-time">{formatTimeAgo(session.last_active)}</div>
                  </div>
                  <button className="chat-item-delete" onClick={(e) => { e.stopPropagation(); onDeleteSession(session.session_id); }}>
                    <i className="fas fa-trash" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="sidebar-footer">
          <div className="developer-card glass-effect">
            <div className="dev-header"><i className="fas fa-shield-alt" /><span>健康提示</span></div>
            <div className="dev-info"><p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>AI建议仅供参考，如有不适请及时就医</p></div>
          </div>
          <button className="theme-btn glass-effect" onClick={onToggleTheme}>
            <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`} />
          </button>
        </div>
      </div>
    </aside>
  );
}

const QUICK_QUESTIONS = [
  { icon: 'fa-comment-medical', label: '健康咨询', q: null, tab: null },
  { icon: 'fa-heart-pulse',     label: '血压管理', q: null, tab: 'blood_pressure' },
  { icon: 'fa-syringe',         label: '血糖管理', q: null, tab: 'blood_sugar' },
  { icon: 'fa-heartbeat',       label: '心脏健康', q: null, tab: 'heart_rate' },
  { icon: 'fa-weight-scale',    label: '体重管理', q: null, tab: 'weight' },
  { icon: 'fa-pills',           label: '用药记录', q: null, tab: 'medication' },
];

function ChatArea({ messages, isTyping, showWelcome, onQuickQuestion, chatAreaRef }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* 返回按钮：在 chat-area 外面，不受 overflow 影响 */}
      {!showWelcome && (
        <div style={{ padding: '10px 20px', flexShrink: 0 }}>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('backToWelcome'))}
            style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', background: 'var(--glass-bg)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <i className="fas fa-arrow-left" /> 返回主界面
          </button>
        </div>
      )}

      <div className="chat-area" ref={chatAreaRef}>
        <div className={`welcome-screen${showWelcome ? '' : ' hidden'}`}>
          <div className="welcome-content">
            <div className="logo-3d"><i className="fas fa-stethoscope" /></div>
            <h1 className="welcome-title">欢迎使用老年人健康助手</h1>
            <p className="welcome-subtitle">专为老年人设计的AI医疗问诊助手，随时为您服务</p>
            <div className="quick-actions">
              <h3>常用功能</h3>
              <div className="quick-buttons">
                {QUICK_QUESTIONS.map(({ icon, label, q, tab }) => (
                  <button key={label} className="quick-btn glass-effect"
                    onClick={() => {
                      if (tab !== null) {
                        window.dispatchEvent(new CustomEvent('openChronic', { detail: tab }));
                      } else {
                        onQuickQuestion(q);
                      }
                    }}
                  >
                    <i className={`fas ${icon}`} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="features">
              {[
                { icon: 'fa-brain', label: 'AI智能问诊' },
                { icon: 'fa-database', label: '中文医疗知识库' },
                { icon: 'fa-shield-alt', label: '安全可靠' },
              ].map(({ icon, label }) => (
                <div key={label} className="feature-card glass-effect">
                  <i className={`fas ${icon}`} /><span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="messages-container">
          {messages.map((msg, idx) => (<MessageBubble key={idx} msg={msg} />))}
        </div>

        <div className={`typing-indicator${isTyping ? ' active' : ''}`}>
          <div className="typing-bubble glass-effect">
            <div className="typing-content">
              <span className="typing-text">健康助手正在思考</span>
              <div className="typing-dots">
                <span className="dot" /><span className="dot" /><span className="dot" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }) {
  const copyText = useCallback(() => { navigator.clipboard.writeText(msg.content).catch(() => {}); }, [msg.content]);
  if (msg.type === 'user') {
    return (
      <div className="message user-message">
        <div className="message-wrapper">
          <div className="message-avatar"><i className="fas fa-user" /></div>
          <div className="message-content">
            <div className="message-text">{msg.content}<span className="message-time">{msg.timestamp}</span></div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="message bot-message">
      <div className="message-wrapper">
        <div className="message-avatar"><i className="fas fa-robot" /></div>
        <div className="message-content">
          <div className="message-text"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
          <span className="message-time">{msg.timestamp}</span>
          <div className="message-footer">
            {msg.source && <span className="message-source"><i className="fas fa-database" />{msg.source}</span>}
            <div className="message-actions">
              <button className="message-action" title="复制" onClick={copyText}><i className="fas fa-copy" /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InputArea({ inputValue, setInputValue, onSend, isTyping, inputRef }) {
  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } };
  const handleInput = (e) => {
    setInputValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };
  return (
    <div className="input-area">
      <div className="input-wrapper">
        <div className="input-container glass-effect">
          <button className="input-btn" title="附件"><i className="fas fa-paperclip" /></button>
          <textarea ref={inputRef} className="message-input" placeholder="请输入您的健康问题..." rows={1} value={inputValue} onChange={handleInput} onKeyDown={handleKeyDown} />
          <button className="input-btn" title="语音输入"><i className="fas fa-microphone" /></button>
          <button className="send-btn" title="发送" aria-label="发送" onClick={onSend} disabled={!inputValue.trim() || isTyping}>
            <i className="fas fa-paper-plane" />
          </button>
        </div>
        <div className="input-info">
          <i className="fas fa-info-circle" />
          <span>AI建议仅供参考，如有不适请及时就医或拨打120。</span>
        </div>
      </div>
    </div>
  );
}

const API_BASE = '/api/v1';

const CHART_CONFIG = {
  blood_pressure: {
    show: true,
    lines: [
      { key: 'value1', color: '#6366f1', name: '收缩压' },
      { key: 'value2', color: '#f43f5e', name: '舒张压' },
    ],
    refs: [
      { y: 140, color: '#f43f5e', label: '收缩压警戒' },
      { y: 90,  color: '#f97316', label: '舒张压警戒' },
    ],
  },
  blood_sugar: {
    show: true,
    lines: [{ key: 'value1', color: '#10b981', name: '血糖' }],
    refs: [{ y: 7.0, color: '#f43f5e', label: '正常上限' }],
  },
  heart_rate: {
    show: true,
    lines: [{ key: 'value1', color: '#3b82f6', name: '心率' }],
    refs: [
      { y: 100, color: '#f43f5e', label: '偏快' },
      { y: 60,  color: '#f97316', label: '偏慢' },
    ],
  },
  weight:     { show: false },
  medication: { show: false },
};

function ChronicManager({ initialTab = 'blood_pressure' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState({ value1: '', value2: '', note: '' });
  const [msg, setMsg] = useState('');

  const tabConfig = {
    blood_pressure: { label: '血压', unit: 'mmHg',   fields: ['收缩压', '舒张压'] },
    blood_sugar:    { label: '血糖', unit: 'mmol/L', fields: ['血糖值'] },
    heart_rate:     { label: '心率', unit: 'bpm',    fields: ['心率'] },
    weight:         { label: '体重', unit: 'kg',     fields: ['体重'] },
    medication:     { label: '用药', unit: '',       fields: ['用药名称'] },
  };

  useEffect(() => { setActiveTab(initialTab); }, [initialTab]);

  const loadRecords = useCallback(async (type) => {
    try {
      const res = await fetch(`${API_BASE}/chronic/records/${type}`);
      const data = await res.json();
      setRecords(data);
    } catch { setRecords([]); }
  }, []);

  useEffect(() => {
    setForm({ value1: '', value2: '', note: '' });
    loadRecords(activeTab);
  }, [activeTab, loadRecords]);

  const handleSubmit = async () => {
    if (!form.value1) { setMsg('请填写数值'); return; }
    const payload = {
      record_type: activeTab,
      value1: activeTab === 'medication' ? 0 : parseFloat(form.value1),
      value2: form.value2 ? parseFloat(form.value2) : null,
      unit: tabConfig[activeTab].unit,
      note: activeTab === 'medication' ? form.value1 : (form.note || null),
    };
    try {
      await fetch(`${API_BASE}/chronic/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setMsg('✅ 记录成功');
      setForm({ value1: '', value2: '', note: '' });
      loadRecords(activeTab);
      setTimeout(() => setMsg(''), 2000);
    } catch { setMsg('❌ 记录失败'); }
  };

  const cfg = tabConfig[activeTab];
  const chartCfg = CHART_CONFIG[activeTab];

  const chartData = [...records].reverse().map((r) => ({
    time: new Date(r.recorded_at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
    value1: r.value1,
    value2: r.value2,
  }));

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('backToChat'))}
          style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', background: 'var(--glass-bg)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <i className="fas fa-arrow-left" /> 返回主界面
        </button>
        <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>{tabConfig[activeTab].label}管理</h2>
      </div>

      {/* Tab 切换 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {Object.entries(tabConfig).map(([key, val]) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{
            padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer',
            background: activeTab === key ? 'var(--accent-primary)' : 'var(--glass-bg)',
            color: activeTab === key ? '#c81818ff' : 'var(--text-primary)',
            fontWeight: activeTab === key ? 'bold' : 'normal',
          }}>{val.label}</button>
        ))}
      </div>

      {/* 输入表单 */}
      <div style={{ background: 'var(--glass-bg)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px' }}>记录{cfg.label}</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{cfg.fields[0]} {cfg.unit && `(${cfg.unit})`}</label>
            <input type={activeTab === 'medication' ? 'text' : 'number'} value={form.value1}
              onChange={e => setForm(f => ({ ...f, value1: e.target.value }))}
              style={{ display: 'block', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', marginTop: '4px', minWidth: '140px' }}
              placeholder={cfg.fields[0]} />
          </div>
          {activeTab === 'blood_pressure' && (
            <div>
              <label style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>舒张压 (mmHg)</label>
              <input type="number" value={form.value2}
                onChange={e => setForm(f => ({ ...f, value2: e.target.value }))}
                style={{ display: 'block', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', marginTop: '4px', minWidth: '140px' }}
                placeholder="舒张压" />
            </div>
          )}
          {activeTab !== 'medication' && (
            <div>
              <label style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>备注</label>
              <input type="text" value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                style={{ display: 'block', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', marginTop: '4px', minWidth: '140px' }}
                placeholder="可选备注" />
            </div>
          )}
          <button onClick={handleSubmit} style={{
            padding: '9px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            background: 'var(--accent-primary)', color: '#fffff', fontWeight: 'bold', marginTop: '4px',
          }}>记录</button>
        </div>
        {msg && <p style={{ marginTop: '10px', color: msg.includes('✅') ? '#10b981' : '#ef4444' }}>{msg}</p>}
      </div>

      {/* 趋势图 */}
      {chartCfg?.show && records.length >= 2 && (
        <div style={{ background: 'var(--glass-bg)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>📈 {cfg.label}趋势图</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
              <Tooltip contentStyle={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }} labelStyle={{ color: 'var(--text-primary)' }} />
              {chartCfg.refs?.map((ref, i) => (
                <ReferenceLine key={i} y={ref.y} stroke={ref.color} strokeDasharray="4 4"
                  label={{ value: ref.label, fontSize: 10, fill: ref.color }} />
              ))}
              {chartCfg.lines.map(line => (
                <Line key={line.key} type="monotone" dataKey={line.key} stroke={line.color} strokeWidth={2} dot={{ r: 3 }} name={line.name} />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '8px', textAlign: 'center' }}>虚线为参考警戒值，仅供参考</p>
        </div>
      )}

      {/* 历史记录 */}
      <div style={{ background: 'var(--glass-bg)', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px' }}>历史记录（最近30条）</h3>
        {records.length === 0 ? (
          <p style={{ color: 'var(--text-tertiary)' }}>暂无记录，请添加第一条数据</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)' }}>时间</th>
                <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)' }}>数值</th>
                <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)' }}>备注</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '8px', color: 'var(--text-primary)' }}>{new Date(r.recorded_at).toLocaleString('zh-CN')}</td>
                  <td style={{ padding: '8px', color: 'var(--text-primary)', fontWeight: 'bold' }}>
                    {activeTab === 'blood_pressure' ? `${r.value1}/${r.value2} ${cfg.unit}` : activeTab === 'medication' ? r.note : `${r.value1} ${cfg.unit}`}
                  </td>
                  <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{activeTab === 'medication' ? '-' : (r.note || '-')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [breakpoint]);
  return isMobile;
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (window.innerWidth <= 768) return false;
    return localStorage.getItem('sidebarOpen') !== 'false';
  });
  const [sessions, setSessions] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [showWelcome, setShowWelcome] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [currentPage, setCurrentPage] = useState('chat');
  const [chronicTab, setChronicTab] = useState('blood_pressure');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const chatAreaRef = useRef(null);
  const inputRef = useRef(null);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  const toggleSidebar = () => {
    setSidebarOpen(prev => {
      if (!isMobile) localStorage.setItem('sidebarOpen', !prev);
      return !prev;
    });
  };

  const closeSidebar = () => setSidebarOpen(false);

  const showToast = useCallback((message, type = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ show: true, message, type });
    toastTimerRef.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTo({ top: chatAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isTyping, scrollToBottom]);

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/sessions`);
      const data = await res.json();
      if (data.success && data.sessions) setSessions(data.sessions);
    } catch { setSessions([]); }
  }, []);

  useEffect(() => {
    loadSessions();
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/history`);
        const data = await res.json();
        if (data.success && data.messages && data.messages.length > 0) {
          const msgs = data.messages.map(m => ({
            type: m.role === 'user' ? 'user' : 'assistant',
            content: m.content,
            timestamp: m.timestamp || '',
            source: m.source || null,
          }));
          setMessages(msgs);
          setChatHistory(msgs.map(m => ({ ...m })));
          setShowWelcome(false);
        }
      } catch { /* silent */ }
    })();
  }, [loadSessions]);

  useEffect(() => {
    const handler = () => setCurrentPage('chat');
    window.addEventListener('backToChat', handler);
    return () => window.removeEventListener('backToChat', handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      setChronicTab(e.detail || 'blood_pressure');
      setCurrentPage('chronic');
    };
    window.addEventListener('openChronic', handler);
    return () => window.removeEventListener('openChronic', handler);
  }, []);

  useEffect(() => {
    const handler = () => {
      setShowWelcome(true);
      setMessages([]);
      setChatHistory([]);
    };
    window.addEventListener('backToWelcome', handler);
    return () => window.removeEventListener('backToWelcome', handler);
  }, []);

  const loadSession = useCallback(async (sessionId) => {
    try {
      const res = await fetch(`${API_BASE}/session/${sessionId}`);
      const data = await res.json();
      if (data.success) {
        setCurrentSessionId(sessionId);
        const msgs = data.messages.map(m => ({
          type: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
          timestamp: m.timestamp || '',
          source: m.source || null,
        }));
        setMessages(msgs);
        setChatHistory(msgs.map(m => ({ ...m })));
        setShowWelcome(false);
        setCurrentPage('chat');
        showToast('对话加载成功', 'success');
      }
    } catch { showToast('加载失败', 'error'); }
  }, [showToast]);

  const deleteSession = useCallback(async (sessionId) => {
    if (!window.confirm('确认删除这条对话记录吗？')) return;
    try {
      const res = await fetch(`${API_BASE}/session/${sessionId}`, { method: 'DELETE' });
      if (res.ok) {
        await loadSessions();
        if (currentSessionId === sessionId) createNewChat();
        showToast('删除成功', 'success');
      }
    } catch { showToast('删除失败', 'error'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionId, loadSessions, showToast]);

  const createNewChat = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/new-chat`, { method: 'POST' });
      if (res.ok) {
        setMessages([]);
        setChatHistory([]);
        setCurrentSessionId(null);
        setShowWelcome(true);
        setCurrentPage('chat');
        await loadSessions();
        showToast('新对话已创建', 'success');
      }
    } catch { showToast('创建失败', 'error'); }
  }, [loadSessions, showToast]);

  const clearChat = useCallback(async () => {
    if (!window.confirm('确认清空当前对话吗？')) return;
    try {
      const res = await fetch(`${API_BASE}/clear`, { method: 'POST' });
      if (res.ok) {
        setMessages([]);
        setChatHistory([]);
        setShowWelcome(true);
        showToast('对话已清空', 'success');
      }
    } catch { showToast('清空失败', 'error'); }
  }, [showToast]);

  const downloadChat = useCallback(() => {
    if (chatHistory.length === 0) { showToast('暂无消息可下载', 'error'); return; }
    const content = buildDownloadText(chatHistory);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `健康问诊记录-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('下载成功', 'success');
  }, [chatHistory, showToast]);

  const sendMessage = useCallback(async (overrideText) => {
    const message = (overrideText ?? inputValue).trim();
    if (!message || isTyping) return;
    setShowWelcome(false);
    setCurrentPage('chat');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { type: 'user', content: message, timestamp: time, source: null };
    setMessages(prev => [...prev, userMsg]);
    setChatHistory(prev => [...prev, userMsg]);
    setInputValue('');
    if (inputRef.current) { inputRef.current.style.height = 'auto'; }
    setIsTyping(true);
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (data.success) {
        const botMsg = { type: 'assistant', content: data.response, timestamp: data.timestamp || time, source: data.source || null };
        setMessages(prev => [...prev, botMsg]);
        setChatHistory(prev => [...prev, botMsg]);
        showToast('回复已收到', 'success');
        await loadSessions();
      } else {
        setMessages(prev => [...prev, { type: 'assistant', content: '抱歉，出现了一些问题，请稍后再试。', timestamp: time, source: null }]);
        showToast('出现错误', 'error');
      }
    } catch {
      setMessages(prev => [...prev, { type: 'assistant', content: '网络连接失败，请检查网络后重试。', timestamp: time, source: null }]);
      showToast('网络错误', 'error');
    } finally {
      setIsTyping(false);
    }
  }, [inputValue, isTyping, loadSessions, showToast]);

  const handleQuickQuestion = useCallback((q) => { setTimeout(() => sendMessage(q), 200); }, [sendMessage]);

  const toastColors = {
    success: 'linear-gradient(135deg, #10b981, #059669)',
    error:   'linear-gradient(135deg, #ef4444, #dc2626)',
    info:    'linear-gradient(135deg, #3b82f6, #2563eb)',
  };
  const toastIcons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };

  return (
    <>
      <div className="animated-background">
        <div className="gradient-overlay" />
        <div className="floating-circles">
          <div className="circle circle-1" /><div className="circle circle-2" /><div className="circle circle-3" />
        </div>
      </div>
      <div className="app-container">
        <button className="sidebar-toggle-btn" onClick={toggleSidebar}><i className="fas fa-bars" /></button>
        {isMobile && sidebarOpen && <div className="sidebar-backdrop" onClick={closeSidebar} />}
        <Sidebar sidebarOpen={sidebarOpen} sessions={sessions} currentSessionId={currentSessionId}
          onNewChat={createNewChat} onLoadSession={loadSession} onDeleteSession={deleteSession}
          onToggleTheme={toggleTheme} theme={theme} />
        <main className={`main-content${sidebarOpen ? ' sidebar-open' : ''}`}>
          <header className="app-header glass-header">
            <div className="header-content">
              <h2 className="gradient-text">老年人健康助手</h2>
              <div className="status-indicator">
                <div className="status-ring"><span className="ring-pulse" /></div>
                <span>AI Ready</span>
              </div>
            </div>
            <div className="header-actions">
              <button className="action-btn" title="慢病管理"
                onClick={() => setCurrentPage(p => p === 'chat' ? 'chronic' : 'chat')}
                style={{ color: currentPage === 'chronic' ? 'var(--accent-primary)' : '' }}>
                <i className="fas fa-chart-line" />
              </button>
              <button className="action-btn" title="清空对话" onClick={clearChat}><i className="fas fa-trash" /></button>
              <button className="action-btn" title="下载记录" onClick={downloadChat}><i className="fas fa-download" /></button>
              <button className="action-btn" title="设置"><i className="fas fa-cog" /></button>
            </div>
          </header>

          {currentPage === 'chat' ? (
            <ChatArea messages={messages} isTyping={isTyping} showWelcome={showWelcome}
              onQuickQuestion={handleQuickQuestion} chatAreaRef={chatAreaRef} />
          ) : (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <ChronicManager initialTab={chronicTab} />
            </div>
          )}

          <InputArea inputValue={inputValue} setInputValue={setInputValue}
            onSend={() => sendMessage()} isTyping={isTyping} inputRef={inputRef} />
        </main>
      </div>
      <div className={`toast${toast.show ? ' show' : ''}`} style={{ background: toastColors[toast.type] }}>
        <i className={`fas ${toastIcons[toast.type]}`} /><span>{toast.message}</span>
      </div>
    </>
  );
}
