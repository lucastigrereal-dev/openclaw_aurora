"""
Dashboard Web Server.

Servidor HTTP simples para visualização de métricas e status do sistema.
Usa apenas bibliotecas padrão do Python.
"""

import json
import threading
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Any, Dict, Optional
from urllib.parse import urlparse, parse_qs

from aurora_monitor.core.config import DashboardConfig


class DashboardHandler(BaseHTTPRequestHandler):
    """Handler HTTP para o dashboard."""

    def log_message(self, format, *args):
        """Suprime logs padrão do servidor HTTP."""
        pass

    def _send_response(self, status: int, content_type: str, body: bytes) -> None:
        """Envia resposta HTTP."""
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', len(body))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def _send_json(self, data: Any, status: int = 200) -> None:
        """Envia resposta JSON."""
        body = json.dumps(data, default=str).encode('utf-8')
        self._send_response(status, 'application/json', body)

    def _send_html(self, html: str, status: int = 200) -> None:
        """Envia resposta HTML."""
        self._send_response(status, 'text/html', html.encode('utf-8'))

    def _check_auth(self) -> bool:
        """Verifica autenticação."""
        if not self.server.config.auth_enabled:
            return True

        auth_header = self.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
            return token == self.server.config.auth_token

        # Verifica query param
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        if 'token' in params:
            return params['token'][0] == self.server.config.auth_token

        return False

    def do_GET(self) -> None:
        """Trata requisições GET."""
        if not self._check_auth():
            self._send_json({"error": "Unauthorized"}, 401)
            return

        parsed = urlparse(self.path)
        path = parsed.path

        if path == '/' or path == '/index.html':
            self._serve_dashboard()
        elif path == '/api/status':
            self._api_status()
        elif path == '/api/metrics':
            self._api_metrics()
        elif path == '/api/alerts':
            self._api_alerts()
        elif path == '/api/health':
            self._api_health()
        elif path == '/api/circuit-breakers':
            self._api_circuit_breakers()
        else:
            self._send_json({"error": "Not Found"}, 404)

    def _serve_dashboard(self) -> None:
        """Serve página HTML do dashboard."""
        html = self._get_dashboard_html()
        self._send_html(html)

    def _api_status(self) -> None:
        """API: Status geral."""
        monitor = self.server.monitor
        if monitor:
            self._send_json(monitor.get_status())
        else:
            self._send_json({"error": "Monitor not available"}, 503)

    def _api_metrics(self) -> None:
        """API: Métricas atuais."""
        monitor = self.server.monitor
        if monitor:
            self._send_json(monitor.get_metrics())
        else:
            self._send_json({"error": "Monitor not available"}, 503)

    def _api_alerts(self) -> None:
        """API: Alertas recentes."""
        monitor = self.server.monitor
        if monitor and monitor._alert_manager:
            alerts = monitor._alert_manager.get_history(limit=50)
            self._send_json([a.to_dict() for a in alerts])
        else:
            self._send_json([])

    def _api_health(self) -> None:
        """API: Health checks."""
        monitor = self.server.monitor
        if monitor:
            results = monitor.run_health_checks()
            self._send_json({
                "healthy": all(results.values()) if results else True,
                "checks": results,
            })
        else:
            self._send_json({"healthy": True, "checks": {}})

    def _api_circuit_breakers(self) -> None:
        """API: Estado dos circuit breakers."""
        monitor = self.server.monitor
        if monitor:
            cbs = {
                name: cb.get_stats()
                for name, cb in monitor._circuit_breakers.items()
            }
            self._send_json(cbs)
        else:
            self._send_json({})

    def _get_dashboard_html(self) -> str:
        """Retorna HTML do dashboard."""
        return '''<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aurora Monitor Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            min-height: 100vh;
        }
        .header {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            padding: 20px;
            border-bottom: 1px solid #334155;
        }
        .header h1 {
            font-size: 24px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .header h1::before {
            content: "◉";
            color: #22c55e;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .card {
            background: #1e293b;
            border-radius: 12px;
            padding: 20px;
            border: 1px solid #334155;
        }
        .card-title {
            font-size: 14px;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 15px;
        }
        .metric {
            font-size: 36px;
            font-weight: 700;
            margin-bottom: 5px;
        }
        .metric.good { color: #22c55e; }
        .metric.warning { color: #f59e0b; }
        .metric.critical { color: #ef4444; }
        .metric-label {
            font-size: 14px;
            color: #64748b;
        }
        .progress-bar {
            height: 8px;
            background: #334155;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 10px;
        }
        .progress-fill {
            height: 100%;
            border-radius: 4px;
            transition: width 0.3s ease;
        }
        .progress-fill.good { background: #22c55e; }
        .progress-fill.warning { background: #f59e0b; }
        .progress-fill.critical { background: #ef4444; }
        .alerts-list {
            max-height: 400px;
            overflow-y: auto;
        }
        .alert-item {
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 10px;
            border-left: 4px solid;
        }
        .alert-item.info { background: #1e3a5f; border-color: #3b82f6; }
        .alert-item.warning { background: #422006; border-color: #f59e0b; }
        .alert-item.error { background: #450a0a; border-color: #ef4444; }
        .alert-item.critical { background: #4a044e; border-color: #d946ef; }
        .alert-time {
            font-size: 12px;
            color: #64748b;
        }
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        .status-badge.healthy { background: #166534; color: #22c55e; }
        .status-badge.degraded { background: #713f12; color: #f59e0b; }
        .status-badge.critical { background: #7f1d1d; color: #ef4444; }
        .cb-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 10px;
        }
        .cb-item {
            background: #0f172a;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }
        .cb-state {
            font-size: 24px;
            margin-bottom: 5px;
        }
        .cb-state.CLOSED { color: #22c55e; }
        .cb-state.OPEN { color: #ef4444; }
        .cb-state.HALF_OPEN { color: #f59e0b; }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #334155;
        }
        th {
            color: #94a3b8;
            font-weight: 500;
        }
        .refresh-info {
            text-align: right;
            color: #64748b;
            font-size: 12px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Aurora Monitor</h1>
    </div>

    <div class="container">
        <div class="grid">
            <div class="card">
                <div class="card-title">CPU Usage</div>
                <div class="metric" id="cpu-value">--%</div>
                <div class="progress-bar">
                    <div class="progress-fill good" id="cpu-bar" style="width: 0%"></div>
                </div>
            </div>

            <div class="card">
                <div class="card-title">Memory Usage</div>
                <div class="metric" id="memory-value">--%</div>
                <div class="progress-bar">
                    <div class="progress-fill good" id="memory-bar" style="width: 0%"></div>
                </div>
            </div>

            <div class="card">
                <div class="card-title">Disk Usage</div>
                <div class="metric" id="disk-value">--%</div>
                <div class="progress-bar">
                    <div class="progress-fill good" id="disk-bar" style="width: 0%"></div>
                </div>
            </div>

            <div class="card">
                <div class="card-title">System Status</div>
                <div id="status-badge" class="status-badge healthy">Healthy</div>
                <div class="metric-label" id="uptime">Uptime: --</div>
            </div>
        </div>

        <div class="grid">
            <div class="card">
                <div class="card-title">Circuit Breakers</div>
                <div class="cb-grid" id="circuit-breakers">
                    <p class="metric-label">No circuit breakers registered</p>
                </div>
            </div>

            <div class="card">
                <div class="card-title">Recent Alerts</div>
                <div class="alerts-list" id="alerts-list">
                    <p class="metric-label">No recent alerts</p>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-title">Health Checks</div>
            <table id="health-table">
                <thead>
                    <tr>
                        <th>Check</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody id="health-body">
                    <tr><td colspan="2" class="metric-label">Loading...</td></tr>
                </tbody>
            </table>
        </div>

        <div class="refresh-info">
            Last updated: <span id="last-update">--</span>
        </div>
    </div>

    <script>
        function getColor(value, thresholds = [70, 85]) {
            if (value >= thresholds[1]) return 'critical';
            if (value >= thresholds[0]) return 'warning';
            return 'good';
        }

        function updateMetric(id, value, barId) {
            const el = document.getElementById(id);
            const bar = document.getElementById(barId);
            const color = getColor(value);

            el.textContent = value.toFixed(1) + '%';
            el.className = 'metric ' + color;

            bar.style.width = value + '%';
            bar.className = 'progress-fill ' + color;
        }

        function formatUptime(seconds) {
            const days = Math.floor(seconds / 86400);
            const hours = Math.floor((seconds % 86400) / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            if (days > 0) return days + 'd ' + hours + 'h ' + mins + 'm';
            if (hours > 0) return hours + 'h ' + mins + 'm';
            return mins + 'm';
        }

        function formatTime(isoString) {
            const date = new Date(isoString);
            return date.toLocaleTimeString();
        }

        async function fetchData() {
            try {
                const [metrics, status, alerts, health, cbs] = await Promise.all([
                    fetch('/api/metrics').then(r => r.json()),
                    fetch('/api/status').then(r => r.json()),
                    fetch('/api/alerts').then(r => r.json()),
                    fetch('/api/health').then(r => r.json()),
                    fetch('/api/circuit-breakers').then(r => r.json())
                ]);

                // Update metrics
                if (metrics.system) {
                    updateMetric('cpu-value', metrics.system.cpu_percent, 'cpu-bar');
                    updateMetric('memory-value', metrics.system.memory_percent, 'memory-bar');
                    updateMetric('disk-value', metrics.system.disk_percent, 'disk-bar');
                }

                // Update status
                if (status.running) {
                    document.getElementById('status-badge').className = 'status-badge healthy';
                    document.getElementById('status-badge').textContent = 'Running';
                }
                if (metrics.uptime_seconds) {
                    document.getElementById('uptime').textContent = 'Uptime: ' + formatUptime(metrics.uptime_seconds);
                }

                // Update circuit breakers
                const cbContainer = document.getElementById('circuit-breakers');
                if (Object.keys(cbs).length > 0) {
                    cbContainer.innerHTML = Object.entries(cbs).map(([name, cb]) => `
                        <div class="cb-item">
                            <div class="cb-state ${cb.state}">${cb.state}</div>
                            <div class="metric-label">${name}</div>
                        </div>
                    `).join('');
                }

                // Update alerts
                const alertsContainer = document.getElementById('alerts-list');
                if (alerts.length > 0) {
                    alertsContainer.innerHTML = alerts.slice(0, 10).map(a => `
                        <div class="alert-item ${a.level}">
                            <strong>${a.title}</strong>
                            <p>${a.message}</p>
                            <span class="alert-time">${formatTime(a.timestamp)}</span>
                        </div>
                    `).join('');
                }

                // Update health
                const healthBody = document.getElementById('health-body');
                if (Object.keys(health.checks).length > 0) {
                    healthBody.innerHTML = Object.entries(health.checks).map(([name, passed]) => `
                        <tr>
                            <td>${name}</td>
                            <td>${passed ? '✅ Passed' : '❌ Failed'}</td>
                        </tr>
                    `).join('');
                } else {
                    healthBody.innerHTML = '<tr><td colspan="2" class="metric-label">No health checks registered</td></tr>';
                }

                document.getElementById('last-update').textContent = new Date().toLocaleTimeString();

            } catch (err) {
                console.error('Failed to fetch data:', err);
            }
        }

        fetchData();
        setInterval(fetchData, 5000);
    </script>
</body>
</html>'''


class DashboardServer:
    """
    Servidor do dashboard de monitoramento.

    Fornece uma interface web para visualização de métricas,
    alertas e status do sistema em tempo real.

    Exemplo de uso:
        from aurora_monitor import AuroraMonitor
        from aurora_monitor.dashboard import DashboardServer

        monitor = AuroraMonitor()
        monitor.start()

        dashboard = DashboardServer(monitor)
        dashboard.start()  # Inicia em background

        # Acesse http://localhost:8080
    """

    def __init__(
        self,
        monitor: Optional[Any] = None,
        config: Optional[DashboardConfig] = None,
    ):
        """
        Inicializa o servidor do dashboard.

        Args:
            monitor: Instância do AuroraMonitor.
            config: Configuração do dashboard.
        """
        self.monitor = monitor
        self.config = config or DashboardConfig()
        self._server: Optional[HTTPServer] = None
        self._thread: Optional[threading.Thread] = None
        self._running = False

    def start(self, blocking: bool = False) -> None:
        """
        Inicia o servidor do dashboard.

        Args:
            blocking: Se True, bloqueia a execução.
        """
        if self._running:
            return

        # Cria servidor
        server_address = (self.config.host, self.config.port)
        self._server = HTTPServer(server_address, DashboardHandler)
        self._server.config = self.config
        self._server.monitor = self.monitor
        self._running = True

        if blocking:
            print(f"Dashboard running at http://{self.config.host}:{self.config.port}")
            self._server.serve_forever()
        else:
            self._thread = threading.Thread(
                target=self._server.serve_forever,
                name="aurora-dashboard",
                daemon=True
            )
            self._thread.start()
            print(f"Dashboard started at http://{self.config.host}:{self.config.port}")

    def stop(self) -> None:
        """Para o servidor do dashboard."""
        if not self._running:
            return

        self._running = False
        if self._server:
            self._server.shutdown()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=5.0)

    def get_url(self) -> str:
        """Retorna URL do dashboard."""
        return f"http://{self.config.host}:{self.config.port}"
