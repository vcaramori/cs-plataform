# Firecrawl - Web Scraping & Data Collection

> Skill baseada em https://docs.firecrawl.dev/sdks/cli

## O que é

Firecrawl é uma ferramenta para buscas, scraping e interação com a web diretamente via CLI. Útil para:
- Pesquisar informações atualizadas na web
- coletar dados de sites para RAG
- Mapear URLs de websites
- Automação de navegador (browser automation)

## Instalação

```bash
# Install globally
npm install -g firecrawl-cli

# Ou via npx
npx -y firecrawl-cli@latest init --all --browser
```

## Autenticação

```bash
# Login com API key
firecrawl login --api-key fc-YOUR-API-KEY

# Via ambiente
export FIRECRAWL_API_KEY=fc-YOUR-API-KEY
```

## Comandos Principais

### Scrape (Extrair conteúdo)
```bash
# Basic scrape (markdown)
firecrawl https://example.com

# Com main content only
firecrawl https://example.com --only-main-content

# HTML output
firecrawl https://example.com --html

# Multiple formats (JSON)
firecrawl https://example.com --format markdown,links

# Save to file
firecrawl https://example.com -o output.md

# Screenshots
firecrawl https://example.com --screenshot
```

### Search (Pesquisar web)
```bash
# Basic search
firecrawl search "web scraping tutorials"

# Limit results
firecrawl search "AI news" --limit 10

# Search and scrape
firecrawl search "documentation" --scrape --scrape-formats markdown

# Time filter
firecrawl search "tech news" --tbs qdr:w   # Last week
firecrawl search "tech news" --tbs qdr:m   # Last month
```

### Map (Descobrir URLs)
```bash
# Discover all URLs
firecrawl map https://example.com

# Filter by search
firecrawl map https://example.com --search "blog"

# Limit
firecrawl map https://example.com --limit 500
```

### Crawl (Rastrear site completo)
```bash
# Start crawl
firecrawl crawl https://example.com

# Wait for completion
firecrawl crawl https://example.com --wait

# With limits
firecrawl crawl https://example.com --limit 100 --max-depth 3 --wait
```

### Browser (Automação)
```bash
# Launch session
firecrawl browser launch-session

# Open page
firecrawl browser execute "open https://example.com"

# Get snapshot
firecrawl browser execute "snapshot"

# Click element
firecrawl browser execute "click @e5"

# Scrape current page
firecrawl browser execute "scrape"

# Close
firecrawl browser close
```

### Agent (IA para coleta)
```bash
# Natural language task
firecrawl agent "Find the top 5 AI startups and their funding" --wait

# With URLs
firecrawl agent "Compare pricing" --urls https://slack.com/pricing,https://teams.microsoft.com/pricing --wait

# Structured output (schema)
firecrawl agent "Get company info" --schema '{"name": "string", "founded": "number"}' --wait
```

## Opções Úteis

| Option | Description |
|--------|------------|
| `--only-main-content` | Extrai apenas conteúdo principal |
| `--wait-for <ms>` | Espera JavaScript renderizar |
| `--json` | Força output JSON |
| `--pretty` | Formata JSON bonitinho |
| `-o <path>` | Salva em arquivo |
| `--timeout <ms>` | Timeout da requisição |

## Casos de Uso no CS-Continuum

### Pesquisar benchmarks
```bash
# NPS benchmarks
firecrawl search "SaaS NPS benchmark 2024" --tbs qdr:y

# CS metrics
firecrawl search "customer success metrics B2B SaaS" --scrape
```

### Coletar dados para RAG
```bash
# Documentation
firecrawl map https://docs.example.com --search "api" -o urls.json

# Crawl and process
firecrawl crawl https://docs.example.com --limit 50 --wait -o docs.json
```

### Pesquisar competências
```bash
# Websearch via firecrawl
firecrawl search "Next.js 16 best practices" --limit 5 --scrape --scrape-formats markdown
```

## Output Handling

```bash
# Pipe to another command
firecrawl https://example.com | head -50

# Redirect
firecrawl https://example.com > output.md

# JSON with jq
firecrawl https://example.com --format links | jq '.links[].url'
```

## Configuração

```bash
# View config
firecrawl view-config

# Self-hosted
firecrawl config --api-url http://localhost:3002

# Status
firecrawl --status
```

## Credits

Verificar saldo:
```bash
firecrawl credit-usage
```

## Referência
- [Docs oficial](https://docs.firecrawl.dev/sdks/cli)
- [GitHub](https://github.com/firecrawl/cli)