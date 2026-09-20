from abc import ABC, abstractmethod
from app.models import NormalizedOcrResult

class BaseOcrProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @property
    @abstractmethod
    def version(self) -> str:
        pass

    @abstractmethod
    async def extract(self, document_id: str, file_bytes: bytes, mime_type: str) -> NormalizedOcrResult:
        pass
