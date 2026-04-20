# PDF - Processamento de Arquivos PDF

> Skill baseada em https://github.com/anthropics/skills/tree/main/skills/pdf
> Útil para extração, criação, merge de PDFs

## Quando Usar

Use esta skill quando o usuário quiser:
- Ler ou extrair texto/tabelas de PDFs
- Combinar ou mesclar múltiplos PDFs
- Dividir PDFs
- Rotacionar páginas
- Adicionar watermarks
- Criar novos PDFs
- Preencher formulários PDF
- Criptografar/decryptar PDFs
- OCR em PDFs scaneados

---

## Bibliotecas Python

### pypdf - Operações Básicas

#### Ler PDF
```python
from pypdf import PdfReader

reader = PdfReader("document.pdf")
print(f"Páginas: {len(reader.pages)}")

# Extrair texto
text = ""
for page in reader.pages:
    text += page.extract_text()
```

#### Merge PDFs
```python
from pypdf import PdfWriter, PdfReader

writer = PdfWriter()
for pdf_file in ["doc1.pdf", "doc2.pdf"]:
    reader = PdfReader(pdf_file)
    for page in reader.pages:
        writer.add_page(page)

with open("merged.pdf", "wb") as output:
    writer.write(output)
```

#### Split PDF
```python
reader = PdfReader("input.pdf")
for i, page in enumerate(reader.pages):
    writer = PdfWriter()
    writer.add_page(page)
    with open(f"page_{i+1}.pdf", "wb") as output:
        writer.write(output)
```

#### Rotacionar Páginas
```python
page.rotate(90)  # 90 graus clockwise
```

### pdfplumber - Texto e Tabelas

#### Extrair Texto
```python
import pdfplumber

with pdfplumber.open("document.pdf") as pdf:
    for page in pdf.pages:
        text = page.extract_text()
```

#### Extrair Tabelas
```python
with pdfplumber.open("document.pdf") as pdf:
    for page in pdf.pages:
        tables = page.extract_tables()
        for table in tables:
            print(table)
```

#### Tabelas para Excel
```python
import pandas as pd

all_tables = []
with pdfplumber.open("document.pdf") as pdf:
    for page in pdf.pages:
        tables = page.extract_tables()
        for table in tables:
            if table:
                df = pd.DataFrame(table[1:], columns=table[0])
                all_tables.append(df)

if all_tables:
    combined_df = pd.concat(all_tables, ignore_index=True)
    combined_df.to_excel("extracted.xlsx", index=False)
```

### reportlab - Criar PDFs

#### PDF Simples
```python
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

c = canvas.Canvas("hello.pdf", pagesize=letter)
width, height = letter

c.drawString(100, height - 100, "Hello World!")
c.save()
```

#### PDF Multi-páginas
```python
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet

doc = SimpleDocTemplate("report.pdf", pagesize=letter)
styles = getSampleStyleSheet()
story = []

story.append(Paragraph("Title", styles['Title']))
story.append(Spacer(1, 12))
story.append(Paragraph("Body text", styles['Normal']))
story.append(PageBreak())
story.append(Paragraph("Page 2", styles['Heading1']))

doc.build(story)
```

#### Subscripts/Superscripts (NUNCA use Unicode)
```python
# ✅ CORRETO
chemical = Paragraph("H<sub>2</sub>O", styles['Normal'])
squared = Paragraph("x<super>2</super>", styles['Normal'])

# ❌ ERRADO - não use ₂ ou ²
```

---

## Ferramentas de Comando

### pdftotext
```bash
# Extrair texto
pdftotext input.pdf output.txt

# Preservar layout
pdftotext -layout input.pdf output.txt

# Páginas específicas
pdftotext -f 1 -l 5 input.pdf output.txt
```

### qpdf
```bash
# Merge
qpdf --empty --pages file1.pdf file2.pdf -- merged.pdf

# Split
qpdf input.pdf --pages . 1-5 -- output.pdf

# Rotacionar
qpdf input.pdf output.pdf --rotate=+90:1
```

---

## Tarefas Comuns

### OCR em PDF Scaneado
```python
# Requer: pip install pytesseract pdf2image
from pdf2image import convert_from_path
import pytesseract

images = convert_from_path('scanned.pdf')
text = ""
for image in images:
    text += pytesseract.image_to_string(image)
```

### Adicionar Watermark
```python
from pypdf import PdfReader, PdfWriter

watermark = PdfReader("watermark.pdf").pages[0]
reader = PdfReader("document.pdf")
writer = PdfWriter()

for page in reader.pages:
    page.merge_page(watermark)
    writer.add_page(page)

with open("output.pdf", "wb") as f:
    writer.write(f)
```

### Proteger com Senha
```python
writer.encrypt("senhausuario", "senhadono")

with open("encrypted.pdf", "wb") as f:
    writer.write(f)
```

---

## Referência Rápida

| Tarefa | Ferramenta |
|--------|-----------|
| Merge | pypdf |
| Split | pypdf |
| Texto | pdfplumber |
| Tabelas | pdfplumber |
| Criar | reportlab |
| OCR | pytesseract |
| Forms | pypdf (see FORMS.md) |

---

## Referência
- [GitHub anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/pdf)