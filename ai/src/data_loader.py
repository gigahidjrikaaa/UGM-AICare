import os

class DataLoader:
  def __init__(self, documents_path: str):
    self.documents_path = documents_path

  def read_txt(self) -> list[str]:
    document = []
    for filename in os.listdir(self.documents_path):
      if (filename.endswith(".txt")):
        with open(os.path.join(self.documents_path, filename), mode="+r") as file:
          document.append(file.read())
    return document
