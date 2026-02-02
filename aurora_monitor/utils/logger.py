"""
Sistema de Logging Estruturado.

Fornece logging avançado com:
- Formato estruturado (JSON)
- Contexto de requisição
- Rotação de arquivos
- Métricas de logging
- Filtragem por nível
"""

import json
import logging
import os
import sys
import threading
import traceback
from datetime import datetime
from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler
from typing import Any, Dict, Optional, List
import contextvars

# Context var para dados de contexto por requisição
_request_context: contextvars.ContextVar[Dict[str, Any]] = contextvars.ContextVar(
    'request_context', default={}
)


class StructuredFormatter(logging.Formatter):
    """Formatter que produz logs em formato JSON estruturado."""

    def __init__(self, include_extras: bool = True):
        super().__init__()
        self.include_extras = include_extras

    def format(self, record: logging.LogRecord) -> str:
        """Formata o registro de log como JSON."""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Adiciona contexto da requisição
        ctx = _request_context.get()
        if ctx:
            log_entry["context"] = ctx

        # Adiciona exceção se houver
        if record.exc_info:
            log_entry["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
                "traceback": traceback.format_exception(*record.exc_info) if all(record.exc_info) else None,
            }

        # Adiciona campos extras
        if self.include_extras:
            extras = {
                k: v for k, v in record.__dict__.items()
                if k not in {
                    'name', 'msg', 'args', 'created', 'filename', 'funcName',
                    'levelname', 'levelno', 'lineno', 'module', 'msecs',
                    'pathname', 'process', 'processName', 'relativeCreated',
                    'stack_info', 'exc_info', 'exc_text', 'thread', 'threadName',
                    'message', 'taskName'
                }
            }
            if extras:
                log_entry["extra"] = extras

        return json.dumps(log_entry, default=str)


class ConsoleFormatter(logging.Formatter):
    """Formatter colorido para console."""

    COLORS = {
        'DEBUG': '\033[36m',     # Cyan
        'INFO': '\033[32m',      # Green
        'WARNING': '\033[33m',   # Yellow
        'ERROR': '\033[31m',     # Red
        'CRITICAL': '\033[35m',  # Magenta
    }
    RESET = '\033[0m'

    def __init__(self, use_colors: bool = True):
        super().__init__()
        self.use_colors = use_colors and sys.stdout.isatty()

    def format(self, record: logging.LogRecord) -> str:
        """Formata o registro para console."""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        level = record.levelname

        if self.use_colors:
            color = self.COLORS.get(level, '')
            level_str = f"{color}{level:8}{self.RESET}"
        else:
            level_str = f"{level:8}"

        message = record.getMessage()

        # Adiciona contexto se disponível
        ctx = _request_context.get()
        ctx_str = ""
        if ctx:
            ctx_parts = [f"{k}={v}" for k, v in ctx.items()]
            ctx_str = f" [{', '.join(ctx_parts)}]"

        log_line = f"{timestamp} | {level_str} | {record.name}{ctx_str} | {message}"

        # Adiciona exceção
        if record.exc_info:
            log_line += "\n" + "".join(traceback.format_exception(*record.exc_info))

        return log_line


class AuroraLogger:
    """
    Logger estruturado do Aurora Monitor.

    Fornece:
    - Logging para console e arquivo
    - Formato estruturado (JSON) para arquivos
    - Formato colorido para console
    - Contexto por requisição
    - Rotação automática de arquivos
    - Métricas de logging

    Exemplo de uso:
        logger = AuroraLogger("minha-app")

        logger.info("Aplicação iniciada")
        logger.warning("Uso de memória alto", extra={"memory_percent": 85})

        # Com contexto
        with logger.context(request_id="abc123", user_id="user1"):
            logger.info("Processando requisição")
    """

    _instances: Dict[str, "AuroraLogger"] = {}
    _lock = threading.Lock()

    def __new__(cls, name: str = "aurora", **kwargs):
        """Retorna instância existente ou cria nova."""
        with cls._lock:
            if name not in cls._instances:
                instance = super().__new__(cls)
                cls._instances[name] = instance
                instance._initialized = False
            return cls._instances[name]

    def __init__(
        self,
        name: str = "aurora",
        level: str = "INFO",
        log_file: Optional[str] = None,
        max_bytes: int = 10 * 1024 * 1024,  # 10 MB
        backup_count: int = 5,
        json_format: bool = True,
        console_output: bool = True,
    ):
        """
        Inicializa o logger.

        Args:
            name: Nome do logger.
            level: Nível de log (DEBUG, INFO, WARNING, ERROR, CRITICAL).
            log_file: Caminho para arquivo de log.
            max_bytes: Tamanho máximo do arquivo antes de rotacionar.
            backup_count: Número de arquivos de backup a manter.
            json_format: Se True, usa formato JSON para arquivo.
            console_output: Se True, também loga no console.
        """
        if self._initialized:
            return

        self.name = name
        self._logger = logging.getLogger(name)
        self._logger.setLevel(getattr(logging, level.upper()))
        self._logger.handlers = []  # Remove handlers existentes

        # Métricas
        self._log_counts: Dict[str, int] = {
            "DEBUG": 0, "INFO": 0, "WARNING": 0, "ERROR": 0, "CRITICAL": 0
        }
        self._count_lock = threading.Lock()

        # Handler de console
        if console_output:
            console_handler = logging.StreamHandler(sys.stdout)
            console_handler.setFormatter(ConsoleFormatter())
            self._logger.addHandler(console_handler)

        # Handler de arquivo
        if log_file:
            os.makedirs(os.path.dirname(log_file), exist_ok=True) if os.path.dirname(log_file) else None
            file_handler = RotatingFileHandler(
                log_file,
                maxBytes=max_bytes,
                backupCount=backup_count,
            )
            if json_format:
                file_handler.setFormatter(StructuredFormatter())
            else:
                file_handler.setFormatter(logging.Formatter(
                    '%(asctime)s | %(levelname)-8s | %(name)s | %(message)s'
                ))
            self._logger.addHandler(file_handler)

        self._initialized = True

    def _count(self, level: str) -> None:
        """Incrementa contador de logs."""
        with self._count_lock:
            if level in self._log_counts:
                self._log_counts[level] += 1

    def debug(self, message: str, **kwargs) -> None:
        """Log de nível DEBUG."""
        self._count("DEBUG")
        self._logger.debug(message, extra=kwargs)

    def info(self, message: str, **kwargs) -> None:
        """Log de nível INFO."""
        self._count("INFO")
        self._logger.info(message, extra=kwargs)

    def warning(self, message: str, **kwargs) -> None:
        """Log de nível WARNING."""
        self._count("WARNING")
        self._logger.warning(message, extra=kwargs)

    def error(self, message: str, exc_info: bool = False, **kwargs) -> None:
        """Log de nível ERROR."""
        self._count("ERROR")
        self._logger.error(message, exc_info=exc_info, extra=kwargs)

    def critical(self, message: str, exc_info: bool = False, **kwargs) -> None:
        """Log de nível CRITICAL."""
        self._count("CRITICAL")
        self._logger.critical(message, exc_info=exc_info, extra=kwargs)

    def exception(self, message: str, **kwargs) -> None:
        """Log de exceção (ERROR com traceback)."""
        self._count("ERROR")
        self._logger.exception(message, extra=kwargs)

    def log(self, level: str, message: str, **kwargs) -> None:
        """Log com nível especificado."""
        self._count(level.upper())
        self._logger.log(getattr(logging, level.upper()), message, extra=kwargs)

    class _ContextManager:
        """Context manager para adicionar contexto ao log."""

        def __init__(self, **kwargs):
            self.kwargs = kwargs
            self.token = None

        def __enter__(self):
            current = _request_context.get()
            new_context = {**current, **self.kwargs}
            self.token = _request_context.set(new_context)
            return self

        def __exit__(self, *args):
            _request_context.reset(self.token)

    def context(self, **kwargs) -> _ContextManager:
        """
        Context manager para adicionar contexto temporário.

        Exemplo:
            with logger.context(request_id="123"):
                logger.info("Processando")  # Inclui request_id no log
        """
        return self._ContextManager(**kwargs)

    @staticmethod
    def set_context(**kwargs) -> None:
        """Define contexto global para a thread/task atual."""
        current = _request_context.get()
        _request_context.set({**current, **kwargs})

    @staticmethod
    def clear_context() -> None:
        """Limpa contexto global."""
        _request_context.set({})

    @staticmethod
    def get_context() -> Dict[str, Any]:
        """Retorna contexto atual."""
        return _request_context.get()

    def get_stats(self) -> Dict[str, Any]:
        """Retorna estatísticas de logging."""
        with self._count_lock:
            total = sum(self._log_counts.values())
            return {
                "name": self.name,
                "level": logging.getLevelName(self._logger.level),
                "handlers": len(self._logger.handlers),
                "total_logs": total,
                "by_level": dict(self._log_counts),
            }

    def set_level(self, level: str) -> None:
        """Altera nível de log dinamicamente."""
        self._logger.setLevel(getattr(logging, level.upper()))

    def add_handler(self, handler: logging.Handler) -> None:
        """Adiciona handler customizado."""
        self._logger.addHandler(handler)


class RequestLogger:
    """
    Middleware de logging para requisições HTTP.

    Automaticamente loga início e fim de requisições com métricas.
    """

    def __init__(self, logger: Optional[AuroraLogger] = None):
        self.logger = logger or AuroraLogger("request")
        self._request_count = 0
        self._error_count = 0
        self._lock = threading.Lock()

    def log_request_start(
        self,
        method: str,
        path: str,
        request_id: Optional[str] = None,
        **extra
    ) -> str:
        """
        Loga início de requisição.

        Args:
            method: Método HTTP.
            path: Caminho da requisição.
            request_id: ID da requisição (gerado se não fornecido).

        Returns:
            ID da requisição.
        """
        if not request_id:
            import uuid
            request_id = str(uuid.uuid4())[:8]

        with self._lock:
            self._request_count += 1

        AuroraLogger.set_context(request_id=request_id)
        self.logger.info(
            f"Request started: {method} {path}",
            method=method,
            path=path,
            **extra
        )

        return request_id

    def log_request_end(
        self,
        method: str,
        path: str,
        status_code: int,
        duration_ms: float,
        **extra
    ) -> None:
        """
        Loga fim de requisição.

        Args:
            method: Método HTTP.
            path: Caminho da requisição.
            status_code: Código de status HTTP.
            duration_ms: Duração em milissegundos.
        """
        if status_code >= 500:
            with self._lock:
                self._error_count += 1
            self.logger.error(
                f"Request failed: {method} {path} - {status_code}",
                method=method,
                path=path,
                status_code=status_code,
                duration_ms=duration_ms,
                **extra
            )
        elif status_code >= 400:
            self.logger.warning(
                f"Request error: {method} {path} - {status_code}",
                method=method,
                path=path,
                status_code=status_code,
                duration_ms=duration_ms,
                **extra
            )
        else:
            self.logger.info(
                f"Request completed: {method} {path} - {status_code}",
                method=method,
                path=path,
                status_code=status_code,
                duration_ms=duration_ms,
                **extra
            )

        AuroraLogger.clear_context()

    def get_stats(self) -> Dict[str, Any]:
        """Retorna estatísticas de requisições."""
        with self._lock:
            return {
                "total_requests": self._request_count,
                "error_count": self._error_count,
                "error_rate": self._error_count / max(self._request_count, 1),
            }
