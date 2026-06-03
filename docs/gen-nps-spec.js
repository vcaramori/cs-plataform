const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, HeadingLevel, BorderStyle, WidthType,
  ShadingType, TableOfContents, PageBreak, Header, Footer, PageNumber,
} = require('docx');

const NAVY = "1F3864", BLUE = "2E75B6", LIGHT = "D9E2F3", GREY = "666666";
const CONTENT_W = 9360;

const border = { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" };
const borders = { top: border, bottom: border, left: border, right: border };

function cell(text, { w, head = false, bold = false, fill } = {}) {
  return new TableCell({
    borders,
    width: { size: w, type: WidthType.DXA },
    shading: fill ? { fill, type: ShadingType.CLEAR } : (head ? { fill: NAVY, type: ShadingType.CLEAR } : undefined),
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: [new Paragraph({
      children: Array.isArray(text)
        ? text
        : [new TextRun({ text: String(text), bold: head || bold, color: head ? "FFFFFF" : "000000", size: head ? 19 : 19 })],
    })],
  });
}

function table(widths, rows) {
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map((r, ri) =>
      new TableRow({
        tableHeader: ri === 0,
        children: r.map((c, ci) =>
          typeof c === 'object' && c.__cell ? c.node : cell(c, { w: widths[ci], head: ri === 0 })
        ),
      })
    ),
  });
}

const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const P = (t, opts = {}) => new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: t, ...opts })] });
const bullet = (t) => new Paragraph({ numbering: { reference: "bul", level: 0 }, spacing: { after: 60 }, children: [new TextRun(t)] });
const code = (t) => new Paragraph({
  spacing: { after: 40 }, shading: { fill: "F2F2F2", type: ShadingType.CLEAR },
  children: [new TextRun({ text: t, font: "Consolas", size: 18 })],
});

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 30, bold: true, font: "Arial", color: NAVY },
        paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: BLUE },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [{
      reference: "bul",
      levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 540, hanging: 280 } } } }],
    }],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Especificação NPS Embed — Plannera / CS Platform   •   Página ", size: 16, color: GREY }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, color: GREY })],
      })] }),
    },
    children: [
      // ---------- CAPA ----------
      new Paragraph({ spacing: { before: 2400, after: 0 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "ESPECIFICAÇÃO TÉCNICA", bold: true, size: 56, color: NAVY })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
        children: [new TextRun({ text: "Pesquisa de NPS embutida (embed.js)", size: 36, color: BLUE })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 },
        children: [new TextRun({ text: "Guia de implementação para o time de Produto / Engenharia Plannera", italics: true, size: 24, color: GREY })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, border: { top: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 8 } }, children: [] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240 },
        children: [new TextRun({ text: "Versão 1.0", bold: true, size: 22 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Data: 03/06/2026", size: 22, color: GREY })] }),
      new Paragraph({ alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Origem: plataforma cs-plataform (Customer Success)", size: 22, color: GREY })] }),
      new Paragraph({ children: [new PageBreak()] }),

      // ---------- SUMÁRIO ----------
      H1("Sumário"),
      new TableOfContents("Sumário", { hyperlink: true, headingStyleRange: "1-2" }),
      new Paragraph({ children: [new PageBreak()] }),

      // ---------- 1. OBJETIVO ----------
      H1("1. Objetivo e escopo"),
      P("Este documento especifica como o time de Produto/Engenharia da Plannera deve integrar a pesquisa de NPS (Net Promoter Score) embutida nas ferramentas Plannera. A pesquisa é entregue por um único script JavaScript (embed.js) hospedado pela plataforma de Customer Success (cs-plataform)."),
      P("Toda a lógica de quando exibir, quais perguntas mostrar e a gravação das respostas reside no backend do CS. A aplicação Plannera é responsável apenas por carregar o script informando dois dados do usuário logado: a instância e o e-mail.", { bold: false }),

      H2("Fora de escopo"),
      bullet("Configuração das perguntas e regras da pesquisa (feita no painel do CS)."),
      bullet("Cadastro de contas/contratos e instâncias (feito pelo time de CS em Gestão Comercial)."),
      bullet("Autenticação do usuário (responsabilidade da própria ferramenta Plannera)."),

      // ---------- 2. SNIPPET ----------
      H1("2. Snippet de integração"),
      P("Inserir o bloco abaixo nas páginas em que o NPS pode aparecer — idealmente em um layout/base compartilhado, carregado após o login do usuário:"),
      code('<script src="https://cs-plataform.vercel.app/embed.js"'),
      code('  data-program-key="dda223f802399ed7e444dea6e2d797dc"'),
      code('  data-instance="INSTANCIA_DO_CLIENTE"'),
      code('  data-email="EMAIL_DO_USUARIO"'),
      code('  data-base-url="https://cs-plataform.vercel.app">'),
      code('</script>'),
      new Paragraph({ spacing: { before: 100, after: 120 }, children: [
        new TextRun({ text: "Importante: ", bold: true, color: "C00000" }),
        new TextRun("os valores INSTANCIA_DO_CLIENTE e EMAIL_DO_USUARIO devem ser substituídos dinamicamente pela aplicação, com os dados do usuário logado. Não publicar os placeholders literais."),
      ] }),

      H2("2.1. Atributos"),
      table([2300, 1100, 4060, 1900], [
        ["Atributo", "Obrig.", "O que enviar", "Exemplo"],
        ["data-program-key", "Sim", "Identificador da pesquisa. Fixo, fornecido pelo CS.", "dda223f802...797dc"],
        ["data-instance", "Sim", "A instância (URL) do cliente. Liga a resposta à conta.", "https://cliente.plannera.com.br"],
        ["data-email", "Sim", "E-mail de login do usuário na ferramenta Plannera.", "joao@cliente.com"],
        ["data-base-url", "Sim", "Endereço da API do CS. Fixo.", "https://cs-plataform.vercel.app"],
        ["data-force", "Não", "\"true\" força exibição (somente testes).", "true"],
      ]),
      new Paragraph({ spacing: { before: 120 }, children: [
        new TextRun({ text: "São apenas 2 dados dinâmicos: data-instance e data-email. ", bold: true }),
        new TextRun("Os demais são fixos por ambiente."),
      ] }),

      // ---------- 3. DADOS ----------
      H1("3. Origem dos dados"),
      H2("3.1. data-instance — a instância do cliente"),
      P("É a URL/endereço da instância do cliente — a mesma cadastrada no contrato (campo \"Instância (URL)\" em Gestão Comercial no CS). A aplicação Plannera já sabe em qual instância o usuário está; basta injetar esse valor."),
      bullet("Um mesmo cliente pode ter várias instâncias (vários endereços/contratos). Cada uma envia o seu próprio data-instance; o CS agrega os resultados por cliente."),
      bullet("O valor é normalizado de forma tolerante (protocolo, www., barra final e maiúsculas/minúsculas), mas recomenda-se enviar a URL exatamente como cadastrada no contrato."),
      H2("3.2. data-email — o usuário"),
      P("É o e-mail de login do usuário na ferramenta Plannera. Usado para controlar a recorrência (não incomodar a mesma pessoa repetidamente)."),
      new Paragraph({ spacing: { after: 120 }, children: [
        new TextRun({ text: "user_id foi descontinuado. ", bold: true, color: "C00000" }),
        new TextRun("Versões antigas usavam data-user-id; não é mais necessário. O script aceita data-user-id apenas como fallback de compatibilidade, mas o correto é usar data-instance."),
      ] }),

      // ---------- 4. COMPORTAMENTO ----------
      H1("4. Comportamento em tempo de execução"),
      new Paragraph({ numbering: { reference: "bul", level: 0 }, children: [new TextRun("O script lê os atributos. Se faltar program-key ou email, não faz nada.")] }),
      bullet("Chama GET {base-url}/api/nps/check com program_key, email e instance."),
      bullet("O CS decide se exibe, conforme regras de negócio (ver 4.1)."),
      bullet("Se deve exibir, renderiza um painel lateral com as perguntas configuradas."),
      bullet("Ao enviar, faz POST {base-url}/api/nps/response com a resposta + instance."),
      bullet("Há um atraso de ~1,5s após o carregamento da página antes de exibir, para não competir com o carregamento inicial."),

      H2("4.1. Regras de exibição (lado do CS)"),
      table([4680, 4680], [
        ["Regra", "Comportamento padrão"],
        ["Vigência da pesquisa", "Só exibe dentro do período ativo configurado."],
        ["Recorrência por usuário", "Não reexibe por 90 dias após responder."],
        ["Após descarte", "Não reexibe por 30 dias se o usuário fechar sem responder."],
        ["Limite por conta/cliente", "Máximo de 1 pesquisa por conta a cada 30 dias."],
      ]),

      H2("4.2. Resposta sem instância cadastrada (órfã)"),
      P("Se a instância enviada ainda não estiver cadastrada em nenhum contrato no CS, a resposta é gravada normalmente e aparece no NPS, apenas sem vínculo de conta. Quando o contrato com aquela instância for cadastrado, as respostas anteriores são religadas retroativamente à conta. Ou seja, a integração pode ser publicada antes de todos os contratos estarem cadastrados, sem perda de dados."),

      // ---------- 5. PRIVACIDADE ----------
      H1("5. Privacidade e segurança"),
      bullet("O script não coleta dados além dos atributos (instance e email) e das respostas digitadas pelo usuário."),
      bullet("Não há cookies de rastreamento; o controle de \"não exibir de novo\" usa localStorage na origem da ferramenta Plannera."),
      bullet("As chamadas vão para a API do CS via HTTPS, com CORS habilitado para uso cross-origin."),
      bullet("Nenhuma credencial é enviada. program-key é um identificador público da pesquisa, não um segredo de autenticação."),

      // ---------- 6. CHECKLIST ----------
      H1("6. Checklist de implementação"),
      bullet("Incluir o <script> em um ponto carregado após o login (layout base)."),
      bullet("Injetar data-instance com a URL da instância do cliente atual."),
      bullet("Injetar data-email com o e-mail do usuário logado."),
      bullet("Manter data-program-key e data-base-url com os valores fixos fornecidos pelo CS."),
      bullet("Não enviar data-user-id (descontinuado)."),
      bullet("Garantir substituição dos valores no servidor/render, sem placeholders literais."),
      bullet("(Opcional) Validar em homologação com data-force=\"true\"."),

      // ---------- 7. TESTE ----------
      H1("7. Teste de aceite"),
      new Paragraph({ numbering: { reference: "bul", level: 0 }, children: [new TextRun("Carregar uma página com o snippet preenchido (instância + e-mail de teste).")] }),
      bullet("Confirmar no DevTools → Network a chamada …/api/nps/check?…&instance=… retornando 200 com should_show: true."),
      bullet("Responder a pesquisa e confirmar POST …/api/nps/response retornando 201."),
      bullet("O time de CS confirma a resposta no dashboard de NPS."),

      // ---------- 8. PARÂMETROS ----------
      H1("8. Parâmetros por ambiente (a confirmar com o CS)"),
      table([3120, 6240], [
        ["Parâmetro", "Valor"],
        ["program-key (pesquisa)", "Fornecido pelo CS por pesquisa/ambiente."],
        ["base-url (API)", "https://cs-plataform.vercel.app (atualizar se houver domínio próprio de produção)."],
      ]),
      new Paragraph({ spacing: { before: 200 }, children: [
        new TextRun({ text: "Contato: ", bold: true }),
        new TextRun("dúvidas de integração, valores por ambiente e cadastro de instâncias nos contratos — time de Customer Success (plataforma cs-plataform)."),
      ] }),
    ],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(process.argv[2] || "Especificacao-NPS-Embed.docx", buf);
  console.log("OK");
});
