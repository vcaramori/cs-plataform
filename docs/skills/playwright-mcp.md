# Playwright MCP - Automação de Browser

> Skill baseada em https://github.com/microsoft/playwright-mcp
> Útil para testes E2E, automação web, scraping dinâmico

## O que é

Playwright MCP é um servidor que fornece automação de browser usando Playwright. Permite LLMs interagirem com páginas web através de accessibility snapshots estruturados - sem precisar de screenshots ou modelos de visão.

## Diferença: MCP vs CLI

| Aspecto | MCP | CLI + SKILLS |
|--------|-----|-------------|
| Melhor para | Estado persistente, introspecção rica | Alto throughput, token-efficient |
| Casos de uso | automação exploratória, self-healing tests | testes rápidos, scraping |
| Token cost | Alto ( carrega accessibility tree) | Baixo (comandos concisos) |

**Para este projeto: Use a skill diretamente ou instale o MCP.**

---

## Instalação (para qualquer agente)

### opencode
```json
{
  "mcp": {
    "playwright": {
      "type": "local",
      "command": ["npx", "@playwright/mcp@latest"],
      "enabled": true
    }
  }
}
```

### Claude Code
```bash
claude mcp add playwright npx @playwright/mcp@latest
```

### VS Code
```bash
code --add-mcp '{"name":"playwright","command":"npx","args":["@playwright/mcp@latest"]}'
```

---

## Ferramentas Disponíveis

### Core Automation
| Ferramenta | Descrição |
|-----------|----------|
| `browser_navigate` | Navegar para URL |
| `browser_click` | Clicar em elemento |
| `browser_type` | Digitar em campo |
| `browser_snapshot` | Capturar accessibility tree (melhor que screenshot) |
| `browser_take_screenshot` |截图 |
| `browser_hover` | Passar mouse |
| `browser_press_key` | Pressionar tecla |
| `browser_select_option` | Selecionar em dropdown |
| `browser_fill_form` | Preencher formulário |
| `browser_evaluate` | Executar JavaScript |
| `browser_navigate_back` | Voltar página |
| `browser_close` | Fechar página |

### Network
| Ferramenta | Descrição |
|-----------|----------|
| `browser_network_requests` | Listar requests |
| `browser_console_messages` | Ver logs do console |

### Tab Management
| Ferramenta | Descrição |
|-----------|----------|
| `browser_tabs` | Listar/criar/fechar tabs |

---

## Configuração

### Options
```bash
# Headless (padrão headed)
--headless

# Browser específico
--browser chromium  # chrome, firefox, webkit, msedge

# Viewport
--viewport-size 1280x720

# Device emulation
--device "iPhone 15"

# Permissões
--grant-permissions geolocation,clipboard-read

# Arquivo de saída
--output-dir ./output
```

---

## Casos de Uso CS-Continuum

### Testar componente React
```javascript
// Via browser_evaluate
async (page) => {
  await page.goto('http://localhost:3000/dashboard');
  const title = await page.title();
  return title;
}
```

### Verificar elemento renderizado
```javascript
async (page) => {
  const exists = await page.locator('.kpi-card').count();
  return exists > 0;
}
```

### Scraping dinâmico
```javascript
// Navegar e esperar dados carregarem
await page.goto('https://app.example.com/reports');
await page.waitForSelector('.data-loaded');
const content = await page.content();
```

### Teste E2E
```javascript
await page.goto('/dashboard');
await page.click('[data-testid="account-1"]');
await page.waitForURL('**/accounts/*');
await page.screenshot({ path: 'dashboard.png' });
```

---

## Referência
- [GitHub microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp)
- [Playwright Docs](https://playwright.dev)