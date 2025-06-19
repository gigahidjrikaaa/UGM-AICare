import pymupdf
from docx import Document
import io
import logging
from typing_extensions import Literal



logger = logging.getLogger(__name__)

class DataIngestion:
  def __init__(self):
    pass

  def extract_text_from_files(self, file_bytes: bytes, type: Literal["pdf", "docx"]) -> list[str]:
    if type == "pdf":
      return self.__extract_text_from_pdf(file_bytes=file_bytes)
    if type == "docx":
      return self.__extract_text_from_docx(file_bytes=file_bytes)

  @staticmethod
  def __extract_text_from_pdf(file_bytes: bytes) -> list[str] :
    """Extract raw text from  PDF file"""

    try:
      text = []
      with pymupdf.open(stream=file_bytes, filetype="pdf") as doc:
        for page in doc:
          text.append(page.get_text())
      return text
    except Exception as e:
      logger.error(f"Failed to extract PDF: {e}")
      raise

  @staticmethod
  def __extract_text_from_docx(file_bytes: bytes) -> list[str]:
    """Extract raw text from  PDF file"""

    try:
      text = []
      doc = Document(io.BytesIO(file_bytes))
      
      text_chunks = [para.text.strip() for para in doc.paragraphs if para.text.strip()]
      logger.info(f"Extracted {len(text_chunks)} paragraphs from DOCX.")
      return text_chunks
    except Exception as e:
      logger.error(f"Failed to extract DOCX: {e}")
      raise
