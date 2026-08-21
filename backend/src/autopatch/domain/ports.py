"""Domain Ports (Interfaces) for Hexagonal Architecture."""

from abc import ABC, abstractmethod
from typing import AsyncGenerator, List, Optional

from autopatch.domain.models import (
    CIFailureEvent,
    DiagnosticTraceStep,
    GeneratedPatch,
    LogAnalysisResult,
    PullRequestInfo,
    VerificationResult,
)


class LogParserPort(ABC):
    """Port for retrieving and parsing raw CI build logs."""

    @abstractmethod
    async def fetch_and_parse_logs(self, event: CIFailureEvent) -> LogAnalysisResult:
        """Fetch raw build logs for run_id and parse out key error snippets."""
        pass


class LLMPatcherPort(ABC):
    """Port for Gemini LLM patch and regression test generation."""

    @abstractmethod
    async def generate_patch_and_test(
        self,
        analysis: LogAnalysisResult,
        code_context: str,
        attempt: int = 1,
        previous_feedback: Optional[str] = None,
    ) -> GeneratedPatch:
        """Generate code fixes and a new unit test case to prevent regression."""
        pass


class VerificationPort(ABC):
    """Port for executing test suites inside isolated sandboxes."""

    @abstractmethod
    async def verify_patch(
        self,
        event: CIFailureEvent,
        patch: GeneratedPatch,
    ) -> VerificationResult:
        """Apply patch in sandbox and run automated tests."""
        pass


class GitProviderPort(ABC):
    """Port for interacting with GitHub REST API and repository management."""

    @abstractmethod
    async def get_file_content(self, repo: str, file_path: str, ref: str) -> str:
        """Retrieve contents of a specific file from GitHub."""
        pass

    @abstractmethod
    async def create_pull_request(
        self,
        event: CIFailureEvent,
        patch: GeneratedPatch,
        verification: VerificationResult,
    ) -> PullRequestInfo:
        """Create a new branch, commit patched files, and open a Pull Request."""
        pass


class TraceStorePort(ABC):
    """Port for saving agent reasoning traces for observability dashboard."""

    @abstractmethod
    async def save_trace(self, run_id: str, step: DiagnosticTraceStep) -> None:
        """Save trace step to persistent storage / memory buffer."""
        pass

    @abstractmethod
    async def get_traces(self, run_id: str) -> List[DiagnosticTraceStep]:
        """Retrieve all trace steps recorded for a workflow run."""
        pass

    @abstractmethod
    def stream_traces(self, run_id: str) -> AsyncGenerator[DiagnosticTraceStep, None]:
        """Stream trace steps asynchronously as they occur."""
        pass

