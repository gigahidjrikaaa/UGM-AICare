import pymupdf
from docx import Document
import re
from html.parser import HTMLParser
from html import unescape
import io
import logging
from typing_extensions import Literal



logger = logging.getLogger(__name__)

class DataIngestion:
  def __init__(self):
    pass

  def extract_text_from_files(self, file_bytes: bytes, type: Literal["pdf", "docx", "html"]) -> list[str]:
    if type == "pdf":
      return self.__extract_text_from_pdf(file_bytes=file_bytes)
    if type == "docx":
      return self.__extract_text_from_docx(file_bytes=file_bytes)
  
  def extract_text_from_html(self, html_content) -> list[str]:
    """
    Extract clean text from HTML content, removing all tags and styling.
    
    Args:
        html_content (str): HTML string to extract text from
        
    Returns:
        str: Clean text content with proper spacing and line breaks
    """
    
    class HTMLTextExtractor(HTMLParser):
        def __init__(self):
            super().__init__()
            self.text_parts = []
            self.block_elements = {
                'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 
                'article', 'section', 'header', 'footer', 'main',
                'blockquote', 'pre', 'ul', 'ol', 'li', 'dl', 'dt', 'dd'
            }
            self.ignore_tags = {
                'style', 'script', 'meta', 'link', 'noscript', 'head', 'title'
            }
            self.current_tag = None
            self.ignore_content = False
            self.in_table = False
            self.in_cell = False
            self.current_row = []
            self.current_table = []
            self.current_cell_content = []  # Add this to collect cell content
            
        def handle_starttag(self, tag, attrs):
            self.current_tag = tag.lower()
            
            # Check if we should ignore content inside this tag
            if self.current_tag in self.ignore_tags:
                self.ignore_content = True
                return
                
            if tag.lower() == 'h1':
                self.text_parts.append('H1')

            if self.current_tag == 'table':
                self.in_table = True
                self.current_table = []

            if self.current_tag == 'tr':
                if self.in_table:  # Only start a new row if we're in a table
                    self.current_row = []

            if self.current_tag in {'td', 'th'}:
                if self.in_table:  # Only handle cells if we're in a table
                    self.in_cell = True
                    self.current_cell_content = []  # Reset cell content

            # Add line break before block elements
            if tag.lower() in self.block_elements:
                if self.text_parts and not self.text_parts[-1].endswith('\n'):
                    self.text_parts.append('\n')
                    
        def handle_endtag(self, tag):
            tag_lower = tag.lower()
            
            if tag_lower == 'td' or tag_lower == 'th':
                if self.in_cell and self.in_table:
                    self.in_cell = False
                    # Join all content collected for this cell
                    cell_text = ' '.join(self.current_cell_content).strip()
                    self.current_row.append(cell_text)
                    self.current_cell_content = []

            if tag_lower == 'tr':
                if self.in_table and self.current_row:  # Only add non-empty rows
                    self.current_table.append(self.current_row)
                    self.current_row = []

            if tag_lower == 'table':
                self.in_table = False
                if self.current_table:
                    # Convert the table to markdown format
                    self.text_parts.append('\n')  # Add spacing before table
                    
                    # Calculate maximum width for each column for better formatting
                    if self.current_table:
                        max_cols = max(len(row) for row in self.current_table)
                        col_widths = [0] * max_cols
                        
                        # Calculate maximum width for each column
                        for row in self.current_table:
                            for i, cell in enumerate(row):
                                if i < len(col_widths):
                                    col_widths[i] = max(col_widths[i], len(str(cell)))
                        
                        # Format table rows in markdown style
                        for i, row in enumerate(self.current_table):
                            if row:  # Only process non-empty rows
                                # Pad cells to make columns align
                                formatted_cells = []
                                for j, cell in enumerate(row):
                                    if j < len(col_widths):
                                        formatted_cells.append(str(cell).ljust(col_widths[j]))
                                    else:
                                        formatted_cells.append(str(cell))
                                
                                line = '| ' + ' | '.join(formatted_cells) + ' |'
                                self.text_parts.append(f"{line}\n")
                                
                                # Add markdown header separator after first row
                                if i == 0:
                                    separator_cells = []
                                    for width in col_widths:
                                        separator_cells.append('-' * max(3, width))  # Minimum 3 dashes
                                    separator = '| ' + ' | '.join(separator_cells) + ' |'
                                    self.text_parts.append(f"{separator}\n")
                    
                    self.text_parts.append('\n')  # Add spacing after the table
                # Reset table state
                self.current_table = []
                self.current_row = []
                
            # Stop ignoring content when we close an ignored tag
            if tag_lower in self.ignore_tags:
                self.ignore_content = False
                self.current_tag = None
                return
                
            # Add line break after block elements
            if tag_lower in self.block_elements:
                if self.text_parts and not self.text_parts[-1].endswith('\n'):
                    self.text_parts.append('\n')
            self.current_tag = None
            
        def handle_data(self, data):
            # Skip data if we're inside an ignored tag
            if self.ignore_content:
                return
            
            # Decode HTML entities and clean the data
            cleaned_data = unescape(data)
            
            # Remove problematic characters like non-breaking spaces
            cleaned_data = cleaned_data.replace('\xa0', ' ')  # Non-breaking space
            cleaned_data = cleaned_data.replace('\u00a0', ' ')  # Another non-breaking space
            cleaned_data = cleaned_data.replace('\u200b', '')  # Zero-width space
            cleaned_data = cleaned_data.replace('\ufeff', '')  # Byte order mark
            cleaned_data = cleaned_data.replace('�', '')
            cleaned_data = cleaned_data.replace('Â', '')        # Malformed UTF-8
            cleaned_data = cleaned_data.replace('â€™', "'")     # Malformed apostrophe
            cleaned_data = cleaned_data.replace('â€œ', '"')     # Malformed opening quote
            cleaned_data = cleaned_data.replace('â€\x9d', '"')  # Malformed closing quote
            
            # Clean whitespace but preserve meaningful spaces
            cleaned_data = re.sub(r'\s+', ' ', cleaned_data).strip()
            
            if not cleaned_data:
                return

            if self.in_table and self.in_cell:
                # Collect cell content instead of directly appending to row
                self.current_cell_content.append(cleaned_data)
            else:
                self.text_parts.append(cleaned_data)
                
        def get_text(self):
            # Join all text parts with single spaces
            text = ' '.join(part for part in self.text_parts if part.strip())
            
            # Clean up the text more thoroughly
            text = re.sub(r'\s+', ' ', text)  # Replace multiple spaces with single space
            text = text.strip()
            
            # Add line breaks for better readability where appropriate
            # This is a simple approach - you might want to customize this
            sentences = text.split('. ')
            if len(sentences) > 1:
                text = '.\n'.join(sentences[:-1]) + '.' + sentences[-1] if sentences[-1] else '.\n'.join(sentences)
            
            return text
        
        def get_section(self):
            section = []
            temp_list = []
            
            for e in self.text_parts:
                if e == "H1":
                    section.append(temp_list)
                    temp_list = []
                    continue
                temp_list.append(e)
            
            # Don't forget to add the last section
            if temp_list:
                section.append(temp_list)
                
            res = []
            for item in section:
                text = ' '.join(part for part in item if part.strip())
            
                # Clean up the text more thoroughly
                text = re.sub(r'\s+', ' ', text)  # Replace multiple spaces with single space
                text = text.strip()
                
                # Add line breaks for better readability where appropriate
                # This is a simple approach - you might want to customize this
                sentences = text.split('. ')
                if len(sentences) > 1:
                    text = '.\n'.join(sentences[:-1]) + '.' + sentences[-1] if sentences[-1] else '.\n'.join(sentences)
                res.append(text)
            
            return res

        def get_text2(self):
            lines = []
            for tag, text in self.text_parts:
                if tag == 'h1':
                    lines.append(f"# {text}")
                else:
                    lines.append(text)

            # Combine and clean
            full_text = ' '.join(lines)
            full_text = re.sub(r'\s+', ' ', full_text).strip()

            # Optional: split sentences with newlines
            sentences = full_text.split('. ')
            if len(sentences) > 1:
                full_text = '.\n'.join(sentences[:-1]) + '.' + sentences[-1] if sentences[-1] else '.\n'.join(sentences)

            return full_text
    
    if not html_content or not html_content.strip():
        return "", []
    
    try:
        # Decode HTML entities first
        html_content = unescape(html_content)
        
        # Create parser and extract text
        parser = HTMLTextExtractor()
        parser.feed(html_content)
        section = parser.get_section()
        
        return section
        
    except Exception as e:
        logger.error(f"Fail to extract text from html doc: {e}")
        return []
  
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