# XLSX - Planilhas e Dados Tabulares

> Skill baseada em https://github.com/anthropics/skills/tree/main/skills/xlsx
> Útil para Export/Import de dados, relatórios NPS, suporte

## Quando Usar

Use esta skill quando o usuário quiser:
- Abrir, ler, editar ou criar arquivos .xlsx, .xlsm, .csv, .tsv
- Adicionar colunas, fórmulas, formatação, limpeza de dados
- Converter entre formatos tabulares
- Exportar relatórios (NPS, Suporte, Dashboard)

**NÃO use** quando o deliverable for:
- Documentos Word
- Relatórios HTML
- Scripts Python
- Integração com banco de dados

---

## Regras Obrigatórias

### Fonte Profissional
- Use字体 profissional consistente (Arial, Times New Roman)

### Zero Erros de Fórmula
- Todo arquivo Excel DEVE ter ZERO erros de fórmula:
  - #REF!, #DIV/0!, #VALUE!, #N/A, #NAME?

### Preservar Templates Existentes
- Estude e preserve o formato existente
- Não imponha formatação padronizada em arquivos com padrões

---

## StandardsFinanceiros (se aplicável)

### Cores Padrão
| Cor | Uso |
|-----|-----|
| **Blue (0,0,255)** | Inputs hardcoded, números para scenarios |
| **Black (0,0,0)** | Fórmulas e cálculos |
| **Green (0,128,0)** | Links para outras planilhas |
| **Red (255,0,0)** | Links externos |
| **Yellow bg** | Key assumptions |

### Formatação de Números
- **Anos**: Texto ("2024" não "2,024")
- **Currency**: $#,##0 - sempre com unidades no header
- **Zeros**: Usar "-" (ex: "$#,##0;($#,##0);-")
- **Porcentagens**: 0.0% (uma casa decimal)
- **Negativos**: Parênteses (123) não -123

---

## Workflows

### Análise de Dados (pandas)
```python
import pandas as pd

# Ler Excel
df = pd.read_excel('file.xlsx')
all_sheets = pd.read_excel('file.xlsx', sheet_name=None)

# Analisar
df.head()
df.info()
df.describe()

# Escrever
df.to_excel('output.xlsx', index=False)
```

### Criar novo Excel (openpyxl)
```python
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

wb = Workbook()
sheet = wb.active

# Dados
sheet['A1'] = 'Header'
sheet.append(['row', 'data'])

# Fórmula
sheet['B2'] = '=SUM(A1:A10)'

# Formatação
sheet['A1'].font = Font(bold=True, color='FF0000')
sheet['A1'].fill = PatternFill('solid', start_color='FFFF00')

wb.save('output.xlsx')
```

### Editar existente
```python
from openpyxl import load_workbook

wb = load_workbook('existing.xlsx')
sheet = wb.active

# Modificar
sheet['A1'] = 'Novo Valor'
sheet.insert_rows(2)
sheet.delete_cols(3)

wb.save('modified.xlsx')
```

---

## CRITICAL: Use Fórmulas, Não Valores Hardcoded

### ❌ ERRADO
```python
total = df['Sales'].sum()
sheet['B10'] = total  # Hardcodes valor
```

### ✅ CORRETO
```python
sheet['B10'] = '=SUM(B2:B9)'  # Fórmula
sheet['C5'] = '=(C4-C2)/C2'  # Crescimento
sheet['D20'] = '=AVERAGE(D2:D19)'  # Média
```

**SEMPRE use Excel formulas** - a planilha recalcula quando dados mudam.

---

## Recalcular Fórmulas (OBRIGATÓRIO)

Após criar/modificar com fórmulas:
```bash
python scripts/recalc.py output.xlsx
```

O script:
- Recalcula todas as fórmulas
- Detecta erros (#REF!, #DIV/0!, etc)
- Retorna JSON com localização dos erros

---

## Checklist de Verificação

### Verificações Essenciais
- [ ] Testar 2-3 referências de células
- [ ] Confirmar mapeamento de colunas
- [ ] Rows são 1-indexadas no Excel

### Armadilhas Comuns
- [ ] Verificar NaN/null com `pd.notna()`
- [ ] Colunas extremas (>50)
- [ ] División by zero
- [ ] Referências erradas (#REF!)

### Teste de Fórmulas
- [ ] Começar com 2-3 células
- [ ] Verificar dependências
- [ ] Testar edge cases

---

## Casos de Uso CS-Continuum

### Exportar NPS
```python
# Planilha de respostas NPS
df.to_excel('nps-export.xlsx', index=False)
```

### Dashboard Suporte
```python
# Métricas de suporte
sheet['A1'] = '=COUNTIF(B:B,"open")'
sheet['B1'] = '=COUNTIF(B:B,"resolved")'
```

### Relatório Financeiro
```python
# MRR por cliente
sheet['B5'] = '=SUMIF(A:A,"Active",C:C)'
```

---

## Referência
- [GitHub anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/xlsx)